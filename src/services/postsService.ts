import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api-client';
import type { AdminPost } from '@/types/admin';
import { logAdminAction } from './adminService';

const ADMIN_UPLOADS_BUCKET = 'admin_uploads';

function getFileExtension(name: string): string {
    const lastDotIndex = name.lastIndexOf('.');
    // If there is no dot, or it's the first/last character, fall back to a default extension
    if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
        return 'jpg';
    }

    const rawExt = name.slice(lastDotIndex + 1).toLowerCase();
    // Remove any characters that are not alphanumeric from the extension
    const cleanedExt = rawExt.replace(/[^a-z0-9]/g, '');

    return cleanedExt || 'jpg';
}

function sanitizeFilenameBase(name: string): string {
    const lastDotIndex = name.lastIndexOf('.');
    const base = lastDotIndex > 0 ? name.slice(0, lastDotIndex) : name;

    // Normalize unicode (remove accents) where supported
    const normalized = base.normalize
        ? base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        : base;

    // Replace any sequence of non-alphanumeric characters with a single underscore
    let safe = normalized.replace(/[^a-zA-Z0-9]+/g, '_');
    // Trim leading and trailing underscores
    safe = safe.replace(/^_+|_+$/g, '');

    return safe || 'file';
}

const MAX_POST_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

async function uploadPostImage(file: File): Promise<string> {
    if (file.size > MAX_POST_IMAGE_SIZE_BYTES) {
        throw new Error('File too large. Maximum allowed size is 5MB.');
    }
    const extension = getFileExtension(file.name);
    const safeBaseName = sanitizeFilenameBase(file.name);
    const path = `posts/${crypto.randomUUID()}-${safeBaseName}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(ADMIN_UPLOADS_BUCKET).upload(path, file);
    if (uploadError) {
        console.error('post image upload error', uploadError);
        throw new Error('Failed to upload image');
    }

    const { data } = supabase.storage.from(ADMIN_UPLOADS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

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

export async function createPost(payload: Partial<AdminPost> & { image?: File }): Promise<AdminPost> {
    const { data: { user } } = await supabase.auth.getUser();

    let image_url = payload.image_url;
    if (payload.image) {
        image_url = await uploadPostImage(payload.image);
    }

    const { image, ...dbPayload } = payload;
    const body = {
        ...dbPayload,
        image_url,
        author_id: user?.id,
    };

    const res = await apiClient.post<{ item: AdminPost }>(`/api/admin_posts`, body, { timeoutMs: 10000 });
    return res.item;
}

export async function updatePost(id: string, payload: Partial<AdminPost> & { image?: File }): Promise<AdminPost> {
    let image_url = payload.image_url;
    if (payload.image) {
        image_url = await uploadPostImage(payload.image);
    }

    const { image, ...dbPayload } = payload;
    const body = { ...dbPayload, image_url };

    const res = await apiClient.put<{ item: AdminPost }>(`/api/admin_posts/${id}`, body, { timeoutMs: 10000 });
    await logAdminAction({ action: 'update', targetTable: 'posts', targetId: id, changes: payload });
    return res.item;
}

export async function deletePost(id: string): Promise<void> {
    await apiClient.delete(`/api/admin_posts/${id}`, { timeoutMs: 10000 });
    await logAdminAction({ action: 'delete', targetTable: 'posts', targetId: id });
}
