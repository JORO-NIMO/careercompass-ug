import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type LearningResource = Tables<'learning_resources'>;

export async function fetchLearningResources(): Promise<LearningResource[]> {
    const { data, error } = await supabase
        .from('learning_resources')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchLearningResources error:', error);
        throw new Error(error.message || 'Failed to load learning resources');
    }

    return data || [];
}

export async function fetchAdminLearningResources(): Promise<LearningResource[]> {
    const { data, error } = await supabase
        .from('learning_resources')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchAdminLearningResources error:', error);
        throw new Error(error.message || 'Failed to load learning resources');
    }

    return data || [];
}

export async function createLearningResource(payload: Omit<LearningResource, 'id' | 'created_at' | 'updated_at'>): Promise<LearningResource> {
    const { data, error } = await supabase
        .from('learning_resources')
        .insert(payload)
        .select('*')
        .single();

    if (error) {
        console.error('createLearningResource error:', error);
        throw new Error(error.message || 'Failed to create learning resource');
    }

    return data;
}

export async function updateLearningResource(id: string, payload: Partial<Omit<LearningResource, 'id' | 'created_at' | 'updated_at'>>): Promise<LearningResource> {
    const { data, error } = await supabase
        .from('learning_resources')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('updateLearningResource error:', error);
        throw new Error(error.message || 'Failed to update learning resource');
    }

    return data;
}

export async function deleteLearningResource(id: string): Promise<void> {
    const { error } = await supabase
        .from('learning_resources')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('deleteLearningResource error:', error);
        throw new Error(error.message || 'Failed to delete learning resource');
    }
}
