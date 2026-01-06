import { supabase } from '@/integrations/supabase/client';

export interface AuditLogPayload {
    action: 'create' | 'update' | 'delete' | 'publish' | 'archive';
    targetTable: string;
    targetId: string;
    changes?: any;
}

export async function logAdminAction(payload: AuditLogPayload): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase.from('admin_audit_logs' as any) as any).insert({
            admin_id: user.id,
            action: payload.action,
            target_table: payload.targetTable,
            target_id: payload.targetId,
            changes: payload.changes || {},
        });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}
