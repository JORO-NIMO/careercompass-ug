import { supabase } from '@/integrations/supabase/client';
import type { AdminPost } from '@/types/admin';
import { logAdminAction } from './adminService';

export async function fetchAdminPosts(): Promise<AdminPost[]> {
    const { data, error } = await (supabase.from('posts' as any) as any)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchAdminPosts error:', error);
        throw new Error(error.message || 'Failed to load posts');
    }

    return (data || []) as AdminPost[];
}

export async function createPost(payload: Partial<AdminPost>): Promise<AdminPost> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await (supabase.from('posts' as any) as any)
        .insert({
            ...payload,
            author_id: user?.id,
            published_at: payload.status === 'published' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();

    if (error) {
        console.error('createPost error:', error);
        throw new Error(error.message || 'Failed to create post');
    }

    await logAdminAction({
        action: 'create',
        targetTable: 'posts',
        targetId: data.id,
        changes: data,
    });

    return data as AdminPost;
}

export async function updatePost(id: string, payload: Partial<AdminPost>): Promise<AdminPost> {
    const { data, error } = await (supabase.from('posts' as any) as any)
        .update({
            ...payload,
            updated_at: new Date().toISOString(),
            published_at: payload.status === 'published' ? new Date().toISOString() : undefined,
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        console.error('updatePost error:', error);
        throw new Error(error.message || 'Failed to update post');
    }

    await logAdminAction({
        action: 'update',
        targetTable: 'posts',
        targetId: id,
        changes: payload,
    });

    return data as AdminPost;
}

export async function deletePost(id: string): Promise<void> {
    const { error } = await (supabase.from('posts' as any) as any)
        .delete()
        .eq('id', id);

    if (error) {
        console.error('deletePost error:', error);
        throw new Error(error.message || 'Failed to delete post');
    }

    await logAdminAction({
        action: 'delete',
        targetTable: 'posts',
        targetId: id,
    });
}
