/**
 * useOnboarding Hook
 * Manages onboarding state and shows modal for new users
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStatus {
  onboarding_completed: boolean;
  career_level: string | null;
  preferred_opportunity_types: string[] | null;
  preferred_countries: string[] | null;
  areas_of_interest: string[] | null;
  notification_email: boolean;
  notification_push: boolean;
}

export function useOnboarding(userId: string | null) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  const checkOnboardingStatus = useCallback(async () => {
    if (!userId) {
      setIsChecking(false);
      setShowOnboarding(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_onboarding_status', {
        p_user_id: userId,
      });

      if (error) {
        console.warn('Failed to check onboarding status:', error.message);
        // If RPC doesn't exist yet, check profile directly
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', userId)
          .single();

        if (profile?.onboarding_completed === false || profile?.onboarding_completed === null) {
          setShowOnboarding(true);
        }
        setIsChecking(false);
        return;
      }

      const onboardingStatus = data as OnboardingStatus;
      setStatus(onboardingStatus);

      // Show onboarding if not completed
      if (!onboardingStatus.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    } finally {
      setIsChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setStatus((prev) => (prev ? { ...prev, onboarding_completed: true } : null));
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return {
    showOnboarding,
    isChecking,
    status,
    completeOnboarding,
    dismissOnboarding,
  };
}

export default useOnboarding;
