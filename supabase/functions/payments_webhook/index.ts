// Supabase Edge Function (Deno) - Payments webhook
// Handles payment provider webhooks (Stripe, Paystack, etc.)
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature, x-paystack-signature',
};

/**
 * Timing-safe comparison of two strings to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify Stripe webhook signature
 * Based on Stripe's webhook signature verification algorithm
 */
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  
  try {
    // Parse the signature header (format: t=timestamp,v1=signature)
    const parts: Record<string, string> = {};
    signatureHeader.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) parts[key] = value;
    });
    
    const timestamp = parts['t'];
    const signature = parts['v1'];
    
    if (!timestamp || !signature) {
      console.error('Missing timestamp or signature in header');
      return false;
    }
    
    // Verify timestamp is within tolerance (5 minutes)
    const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (timestampAge > 300) {
      console.error('Webhook timestamp is too old');
      return false;
    }
    
    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison
    return timingSafeEqual(signature, expectedSignature);
  } catch (err) {
    console.error('Stripe signature verification error:', err);
    return false;
  }
}

/**
 * Verify Paystack webhook signature (HMAC SHA-512)
 */
async function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;
  
  try {
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison
    return timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase());
  } catch (err) {
    console.error('Paystack signature verification error:', err);
    return false;
  }
}

export default async function (req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const stripeSignature = req.headers.get('stripe-signature');
    const paystackSignature = req.headers.get('x-paystack-signature');
    
    // Determine provider based on signature header
    const provider = stripeSignature ? 'stripe' : paystackSignature ? 'paystack' : null;
    
    if (!provider) {
      console.error('No valid webhook signature header found');
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const rawBody = await req.text();
    
    // Verify webhook signature (REQUIRED for security)
    const webhookSecret = Deno.env.get(
      provider === 'stripe' ? 'STRIPE_WEBHOOK_SECRET' : 'PAYSTACK_WEBHOOK_SECRET'
    );
    
    if (!webhookSecret) {
      console.error(`Missing ${provider.toUpperCase()}_WEBHOOK_SECRET environment variable`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Webhook secret not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    let isValid = false;
    if (provider === 'stripe') {
      isValid = await verifyStripeSignature(rawBody, stripeSignature!, webhookSecret);
    } else {
      isValid = await verifyPaystackSignature(rawBody, paystackSignature!, webhookSecret);
    }
    
    if (!isValid) {
      console.error(`Invalid ${provider} webhook signature`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const event = JSON.parse(rawBody);
    const supabase = createSupabaseServiceClient();

    // Handle different event types
    const eventType = event.type || event.event;
    
    if (eventType === 'charge.succeeded' || eventType === 'payment_intent.succeeded') {
      // Extract payment details
      const chargeId = event.data?.object?.id || event.data?.id;
      const amountRaw = event.data?.object?.amount || event.data?.amount;
      const amount = typeof amountRaw === 'string' ? parseInt(amountRaw, 10) : Number(amountRaw);
      const currency = event.data?.object?.currency || event.data?.currency || 'ugx';
      const metadata = event.data?.object?.metadata || event.data?.metadata || {};
      
      const userId = metadata.user_id;
      const entityId = metadata.entity_id || metadata.post_id;
      const entityTypeRaw = (metadata.entity_type || 'listing').toString().toLowerCase();
      const boostDays = parseInt(metadata.boost_days || '7', 10);

      if (!userId || !entityId) {
        console.error('Missing user_id or entity_id in metadata');
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing required metadata' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const entityType = entityTypeRaw === 'company' ? 'company' : 'listing';

      if (!Number.isFinite(boostDays) || boostDays <= 0) {
        console.error('Invalid boost duration provided');
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid boost duration' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        console.error('Invalid payment amount received');
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid payment amount' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data: paymentId, error: boostCreationError } = await supabase.rpc('create_boost_from_payment', {
        _user_id: userId,
        _amount_cents: Math.trunc(amount),
        _currency: currency,
        _provider: provider,
        _provider_charge_id: chargeId,
        _metadata: metadata,
        _entity_id: entityId,
        _entity_type: entityType,
        _boost_days: boostDays,
      });

      if (boostCreationError) {
        console.error('create_boost_from_payment error:', boostCreationError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to record boost for payment' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, payment_id: paymentId }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Handle other event types (failures, refunds, etc.)
    if (eventType === 'charge.failed' || eventType === 'payment_intent.payment_failed') {
      const chargeId = event.data?.object?.id || event.data?.id;
      const metadata = event.data?.object?.metadata || event.data?.metadata || {};
      
      await supabase
        .from('payments')
        .insert({
          user_id: metadata.user_id,
          amount_cents: event.data?.object?.amount || 0,
          currency: event.data?.object?.currency || 'ugx',
          provider: provider,
          provider_charge_id: chargeId,
          status: 'failed',
          metadata: metadata,
        });
    }

    return new Response(
      JSON.stringify({ ok: true, event_type: eventType }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('payments_webhook error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
