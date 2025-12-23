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
      const amount = event.data?.object?.amount || event.data?.amount;
      const currency = event.data?.object?.currency || event.data?.currency || 'ugx';
      const metadata = event.data?.object?.metadata || event.data?.metadata || {};
      
      const userId = metadata.user_id;
      const postId = metadata.post_id;
      const boostDays = parseInt(metadata.boost_days || '7');
      
      if (!userId || !postId) {
        console.error('Missing user_id or post_id in metadata');
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing required metadata' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check if already processed (idempotency)
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('provider_charge_id', chargeId)
        .maybeSingle();
      
      if (existing) {
        return new Response(
          JSON.stringify({ ok: true, message: 'Already processed' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          amount_cents: amount,
          currency: currency,
          provider: provider,
          provider_charge_id: chargeId,
          status: 'succeeded',
          metadata: metadata,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Failed to create payment record:', paymentError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Payment record creation failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Create boost record
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + boostDays);
      
      const { error: boostError } = await supabase
        .from('boosts')
        .insert({
          post_id: postId,
          poster_id: userId,
          boost_until: boostUntil.toISOString(),
          multiplier: 2.0, // Default boost multiplier
        });

      if (boostError) {
        console.error('Failed to create boost record:', boostError);
        // Payment succeeded but boost failed - log for manual review
      }

      return new Response(
        JSON.stringify({ ok: true, payment_id: payment.id }),
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
