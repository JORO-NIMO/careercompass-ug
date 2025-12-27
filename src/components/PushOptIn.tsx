import React, { useState } from 'react';
import { registerPushSubscription } from '@/hooks/useNotifications';
import { env } from '@/lib/env';
import { useSession } from '@/hooks/useAuth';

const VAPID_PUBLIC_KEY = env.vapidPublicKey || import.meta.env.VITE_VAPID_PUBLIC_KEY;

const PushOptIn: React.FC = () => {
  const { user } = useSession();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleOptIn = async () => {
    if (!user) {
      setError('You must be signed in to enable push notifications.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      await registerPushSubscription(user.id, VAPID_PUBLIC_KEY);
      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Failed to enable push notifications.');
    }
  };

  return (
    <div className="my-4 p-4 border rounded bg-slate-50 dark:bg-slate-900">
      <h2 className="text-lg font-semibold mb-2">Push Notifications</h2>
      <p className="mb-2 text-sm text-muted-foreground">
        Enable push notifications to receive important updates even when you are not on the site.
      </p>
      <button
        className="px-3 py-1 rounded bg-primary text-white disabled:opacity-60"
        onClick={handleOptIn}
        disabled={status === 'loading' || status === 'success'}
      >
        {status === 'success' ? 'Push Enabled' : status === 'loading' ? 'Enabling…' : 'Enable Push Notifications'}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {status === 'success' && <div className="text-green-600 mt-2">Push notifications enabled!</div>}
    </div>
  );
};

export default PushOptIn;
