/**
 * Onboarding Provider
 * Wraps the app and shows onboarding modal for new users
 */

import { type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useOnboarding } from './useOnboarding';
import { OnboardingModal } from '@/components/common/OnboardingModal';

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const { showOnboarding, isChecking, completeOnboarding } = useOnboarding(user?.id ?? null);

  // Don't show anything until auth and onboarding checks are done
  if (authLoading || isChecking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {user && showOnboarding && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={completeOnboarding}
          userId={user.id}
        />
      )}
    </>
  );
}

export default OnboardingProvider;
