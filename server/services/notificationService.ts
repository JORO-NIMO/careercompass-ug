/**
 * Notification Service
 * Handles alerts when new opportunities match user criteria
 */

import { getSupabaseClient } from '../utils/supabase.js';
import { createModuleLogger } from '../utils/logger.js';
import type { Opportunity, OpportunityType } from '../types/index.js';

const logger = createModuleLogger('notifications');

// Subscription criteria type
export interface SubscriptionCriteria {
  types?: OpportunityType[];
  fields?: string[];
  countries?: string[];
  keywords?: string[];
}

// Subscription record
export interface OpportunitySubscription {
  id: string;
  user_id: string;
  criteria: SubscriptionCriteria;
  channels: ('email' | 'push' | 'in_app')[];
  is_active: boolean;
  created_at: string;
}

// Notification record
export interface OpportunityNotification {
  id?: string;
  user_id: string;
  subscription_id: string;
  opportunity_id: string;
  channel: 'email' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
}

/**
 * Check if opportunity matches subscription criteria
 */
export function matchesCriteria(
  opportunity: Opportunity,
  criteria: SubscriptionCriteria
): boolean {
  // Check type filter
  if (criteria.types && criteria.types.length > 0) {
    if (!opportunity.type || !criteria.types.includes(opportunity.type)) {
      return false;
    }
  }
  
  // Check field filter
  if (criteria.fields && criteria.fields.length > 0) {
    if (!opportunity.field) return false;
    const oppField = opportunity.field.toLowerCase();
    const matches = criteria.fields.some(f => 
      oppField.includes(f.toLowerCase())
    );
    if (!matches) return false;
  }
  
  // Check country filter
  if (criteria.countries && criteria.countries.length > 0) {
    if (!opportunity.country) return false;
    const oppCountry = opportunity.country.toLowerCase();
    const matches = criteria.countries.some(c => 
      oppCountry.includes(c.toLowerCase()) || 
      c.toLowerCase() === 'global'
    );
    if (!matches) return false;
  }
  
  // Check keyword filter
  if (criteria.keywords && criteria.keywords.length > 0) {
    const searchText = `${opportunity.title} ${opportunity.description || ''} ${opportunity.organization || ''}`.toLowerCase();
    const matches = criteria.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    if (!matches) return false;
  }
  
  return true;
}

/**
 * Get all active subscriptions
 */
export async function getActiveSubscriptions(): Promise<OpportunitySubscription[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('opportunity_subscriptions')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    logger.error('Failed to fetch subscriptions', { error: error.message });
    return [];
  }
  
  return data || [];
}

/**
 * Create opportunity subscription
 */
export async function createSubscription(
  userId: string,
  criteria: SubscriptionCriteria,
  channels: ('email' | 'push' | 'in_app')[] = ['in_app']
): Promise<OpportunitySubscription | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('opportunity_subscriptions')
    .insert({
      user_id: userId,
      criteria,
      channels,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    logger.error('Failed to create subscription', { error: error.message });
    return null;
  }
  
  logger.info('Subscription created', { userId, criteria });
  return data;
}

/**
 * Find matching subscriptions for a batch of opportunities
 */
export async function findMatchingSubscriptions(
  opportunities: Opportunity[]
): Promise<Map<string, { subscription: OpportunitySubscription; opportunities: Opportunity[] }>> {
  const subscriptions = await getActiveSubscriptions();
  const matches = new Map<string, { subscription: OpportunitySubscription; opportunities: Opportunity[] }>();
  
  for (const subscription of subscriptions) {
    const matchingOpportunities = opportunities.filter(opp => 
      matchesCriteria(opp, subscription.criteria)
    );
    
    if (matchingOpportunities.length > 0) {
      matches.set(subscription.id, {
        subscription,
        opportunities: matchingOpportunities,
      });
    }
  }
  
  return matches;
}

/**
 * Queue notifications for matched opportunities
 */
export async function queueNotifications(
  matches: Map<string, { subscription: OpportunitySubscription; opportunities: Opportunity[] }>
): Promise<number> {
  const supabase = getSupabaseClient();
  let queued = 0;
  
  for (const [subscriptionId, { subscription, opportunities }] of matches) {
    // Create notification for each channel
    for (const channel of subscription.channels) {
      // Group opportunities into a single notification
      const notification: Omit<OpportunityNotification, 'id'> = {
        user_id: subscription.user_id,
        subscription_id: subscriptionId,
        opportunity_id: opportunities[0].id!, // Primary opportunity
        channel,
        status: 'pending',
      };
      
      const { error } = await supabase
        .from('opportunity_notifications')
        .insert(notification);
      
      if (error) {
        logger.error('Failed to queue notification', { 
          subscriptionId, 
          channel, 
          error: error.message 
        });
      } else {
        queued++;
      }
    }
  }
  
  logger.info(`Queued ${queued} notifications`);
  return queued;
}

/**
 * Process pending notifications (send them)
 */
export async function processPendingNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  const supabase = getSupabaseClient();
  let sent = 0;
  let failed = 0;
  
  // Get pending notifications
  const { data: notifications, error } = await supabase
    .from('opportunity_notifications')
    .select(`
      *,
      opportunity:opportunity_id (title, url, type, organization),
      subscription:subscription_id (criteria)
    `)
    .eq('status', 'pending')
    .limit(100);
  
  if (error || !notifications) {
    logger.error('Failed to fetch pending notifications', { error: error?.message });
    return { sent, failed };
  }
  
  for (const notification of notifications) {
    try {
      // Process based on channel
      switch (notification.channel) {
        case 'in_app':
          // Create in-app notification
          await createInAppNotification(notification);
          break;
          
        case 'email':
          // Send email notification
          await sendEmailNotification(notification);
          break;
          
        case 'push':
          // Send push notification
          await sendPushNotification(notification);
          break;
      }
      
      // Mark as sent
      await supabase
        .from('opportunity_notifications')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
      
      sent++;
    } catch (err) {
      // Mark as failed
      await supabase
        .from('opportunity_notifications')
        .update({ 
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        })
        .eq('id', notification.id);
      
      failed++;
    }
  }
  
  logger.info(`Processed notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Create in-app notification
 */
async function createInAppNotification(notification: any): Promise<void> {
  const supabase = getSupabaseClient();
  const opportunity = notification.opportunity;
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.user_id,
      type: 'opportunity_match',
      title: `New ${opportunity.type || 'opportunity'} matching your criteria`,
      message: `${opportunity.title}${opportunity.organization ? ` at ${opportunity.organization}` : ''}`,
      data: {
        opportunity_id: notification.opportunity_id,
        url: opportunity.url,
      },
      is_read: false,
    });
  
  if (error) {
    throw new Error(`In-app notification failed: ${error.message}`);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(notification: any): Promise<void> {
  const supabase = getSupabaseClient();
  const opportunity = notification.opportunity;
  
  // Get user email
  const { data: user } = await supabase.auth.admin.getUserById(notification.user_id);
  
  if (!user?.user?.email) {
    throw new Error('User email not found');
  }
  
  // In production, integrate with email service (SendGrid, Resend, etc.)
  // For now, just log it
  logger.info('Email notification would be sent', {
    to: user.user.email,
    subject: `New ${opportunity.type || 'opportunity'}: ${opportunity.title}`,
    opportunityUrl: opportunity.url,
  });
  
  // TODO: Implement actual email sending
  // await sendEmail({
  //   to: user.user.email,
  //   subject: `New ${opportunity.type} matching your criteria`,
  //   template: 'opportunity-alert',
  //   data: { opportunity, criteria: notification.subscription.criteria }
  // });
}

/**
 * Send push notification
 */
async function sendPushNotification(notification: any): Promise<void> {
  const supabase = getSupabaseClient();
  const opportunity = notification.opportunity;
  
  // Get user's push subscription
  const { data: pushSub } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', notification.user_id)
    .eq('is_active', true)
    .limit(1)
    .single();
  
  if (!pushSub) {
    throw new Error('No active push subscription');
  }
  
  // In production, send via web push or FCM
  logger.info('Push notification would be sent', {
    userId: notification.user_id,
    title: `New ${opportunity.type || 'opportunity'}`,
    body: opportunity.title,
  });
  
  // TODO: Implement actual push notification
}

/**
 * Notify users about new opportunities after ingestion
 */
export async function notifyMatchingUsers(
  newOpportunities: Opportunity[]
): Promise<{ subscriptionsMatched: number; notificationsQueued: number }> {
  if (newOpportunities.length === 0) {
    return { subscriptionsMatched: 0, notificationsQueued: 0 };
  }
  
  logger.info(`Checking ${newOpportunities.length} new opportunities for matching subscriptions`);
  
  // Find matching subscriptions
  const matches = await findMatchingSubscriptions(newOpportunities);
  
  if (matches.size === 0) {
    logger.info('No matching subscriptions found');
    return { subscriptionsMatched: 0, notificationsQueued: 0 };
  }
  
  // Queue notifications
  const notificationsQueued = await queueNotifications(matches);
  
  logger.info(`Matched ${matches.size} subscriptions, queued ${notificationsQueued} notifications`);
  
  return {
    subscriptionsMatched: matches.size,
    notificationsQueued,
  };
}
