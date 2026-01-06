import { useState } from 'react';
import { registerPushSubscription } from './useNotifications';
import { env } from '@/lib/env';
import { useSession } from '@/hooks/useAuth';

export function usePushSubscription() {
  const { user } = useSession();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    if (!user) {
      setError('You must be signed in to enable push notifications.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      await registerPushSubscription(user.id, env.vapidPublicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY);
      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Failed to enable push notifications.');
    }
  };

  return { subscribe, status, error };
}
