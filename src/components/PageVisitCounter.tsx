import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

export function PageVisitCounter() {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        // Initial fetch
        fetchCount();

        // Poll every minute (60,000 ms)
        const interval = setInterval(fetchCount, 60000);

        return () => clearInterval(interval);
    }, []);

    const fetchCount = async () => {
        try {
            // @ts-ignore - RPC created in new migration
            const { data, error } = await supabase.rpc('get_page_visit_count');
            if (!error && typeof data === 'number') {
                setCount(data);
            }
        } catch (err) {
            console.error('Failed to fetch visit count', err);
        }
    };

    if (count === null) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full animate-pulse">
            <Users className="w-3 h-3" />
            <span>{count.toLocaleString()} Live Visits</span>
        </div>
    );
}
