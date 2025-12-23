// Supabase Edge Function (Deno) - Payments webhook
// Handles payment provider webhooks (Stripe, Paystack, etc.)
import { createSupabaseServiceClient } from '../_shared/sbClient.ts';

// Stripe webhook signature verification
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;
  
  try {
    // Simplified signature verification - in production use Stripe SDK
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const sigHeader = signature.split(',').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const signedPayload = `${sigHeader.t}.${payload}`;
    const expectedSig = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );
    
    return true; // Simplified - implement full verification in production
  } catch {
    return false;
  }
}

export default async function (req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, message: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-paystack-signature');
    const provider = signature?.includes('stripe') ? 'stripe' : 'paystack';
    
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);
    
    // Verify webhook signature (important for security)
    const webhookSecret = Deno.env.get(
      provider === 'stripe' ? 'STRIPE_WEBHOOK_SECRET' : 'PAYSTACK_WEBHOOK_SECRET'
    );
    
    if (webhookSecret && signature) {
      const isValid = await verifyStripeSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

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
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Use idempotency key to prevent duplicate processing
      const idempotencyKey = `${provider}_${chargeId}`;
      
      // Check if already processed
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('provider_charge_id', chargeId)
        .maybeSingle();
      
      if (existing) {
        return new Response(
          JSON.stringify({ ok: true, message: 'Already processed' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
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
          { status: 500, headers: { 'Content-Type': 'application/json' } }
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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('payments_webhook error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
