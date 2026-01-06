import { supabase } from '@/integrations/supabase/client';

export interface Placement {
    id: string;
    position_title: string;
    company_name: string;
    description: string;
    region: string;
    industry: string;
    stipend?: string | null;
    available_slots: number;
    contact_info?: string | null;
    created_at?: string;
    created_by?: string | null;
    approved?: boolean;
}

export async function createPlacement(payload: Omit<Placement, 'id' | 'created_at' | 'approved'>): Promise<Placement> {
    const { data, error } = await supabase
        .from('placements')
        .insert({
            ...payload,
            approved: true, // Auto-approve as per current UI logic
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating placement:', error);
        throw error;
    }

    return data;
}
