import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

export function PageVisitCounter() {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        // Initial fetch
        void fetchCount();

        // Log visit if not already logged this session
        const hasLogged = sessionStorage.getItem('has_logged_visit');
        if (!hasLogged) {
            void logVisit();
        }

        // Poll every 30 seconds for more responsive count updates
        const interval = setInterval(fetchCount, 30000);

        return () => clearInterval(interval);
    }, []);

    const logVisit = async () => {
        try {
            // include user id when available so authenticated visits are associated
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id ?? null;

            try {
                // try RPC with optional parameter (server function may ignore extra params)
                // @ts-ignore
                await supabase.rpc('log_page_visit', { p_path: window.location.pathname, p_user_id: userId });
            } catch (rpcErr) {
                // fallback: call RPC without user id if the first call fails
                try {
                    // @ts-ignore
                    await supabase.rpc('log_page_visit', { p_path: window.location.pathname });
                } catch (e) {
                    console.error('log_page_visit failed (fallback)', e);
                }
            }

            sessionStorage.setItem('has_logged_visit', 'true');
            // Refresh count after logging
            void fetchCount();
        } catch (err) {
            console.error('Failed to log visit', err);
        }
    };

    const fetchCount = async () => {
        try {
            // @ts-ignore - RPC created in new migration
            const { data, error } = await supabase.rpc('get_analytics_metrics');
            if (!error && data) {
                // TS cast as we don't have types yet
                const metrics = data as { active_now: number };
                setCount(metrics.active_now || 0);
            }
        } catch (err) {
            console.error('Failed to fetch visit count', err);
        }
    };

    if (count === null) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>{count.toLocaleString()} Live Visits</span>
        </div>
    );
}
