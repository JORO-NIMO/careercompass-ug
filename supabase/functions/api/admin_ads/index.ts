import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess, withRateLimitHeaders, withRequestIdHeaders, jsonErrorWithId } from '../../_shared/responses.ts';
import { getRequestId } from '../../_shared/request.ts';
import {
  checkRateLimitUnified as checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from '../../_shared/rateLimit.ts';

// Deno global is available in Supabase Edge Functions; declare for TS type checking.
declare const Deno: { env: { get(key: string): string | undefined } };

const ADS_BUCKET = Deno.env.get('ADS_BUCKET') ?? 'public';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base) return 'image';
  return base.toLowerCase();
}

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${ADS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

function getResourceSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const fnIndex = parts.indexOf('admin_ads');
  return fnIndex === -1 ? [] : parts.slice(fnIndex + 1);
}

async function ensureAdmin(userId: string, supabase: ReturnType<typeof createSupabaseServiceClient>) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function uploadImage(file: File, supabase: ReturnType<typeof createSupabaseServiceClient>) {
  if (!file.type || !file.type.startsWith('image/')) {
    return { error: 'Only image uploads are allowed' } as const;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'Image exceeds 5MB limit' } as const;
  }

  const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.') + 1) : 'jpg';
  const uniqueName = `${crypto.randomUUID()}-${sanitizeFilename(file.name || `ad.${extension}`)}`;
  const path = `ads/${uniqueName}`;

  const { error: uploadError } = await supabase.storage.from(ADS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.error('ads image upload error', uploadError);
    return { error: 'Failed to upload image' } as const;
  }

  const { data } = supabase.storage.from(ADS_BUCKET).getPublicUrl(path);

  return { url: data.publicUrl, path } as const;
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const reqId = getRequestId(req);
  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return jsonErrorWithId(error || 'Authentication required', 401, {}, {}, reqId);
  }

  const supabase = createSupabaseServiceClient();

  const isAdmin = await ensureAdmin(user.id, supabase);
  if (!isAdmin) {
    return jsonErrorWithId('Admin role required', 403, {}, {}, reqId);
  }

  // Rate limit admin operations per user/IP
  const clientId = getClientIdentifier(req, user.id);
  const limit = await checkRateLimit(clientId, RATE_LIMITS.admin);
  if (!limit.allowed) {
    return rateLimitExceededResponse(limit.resetAt, reqId);
  }
  const rateHeaders = withRequestIdHeaders(withRateLimitHeaders({}, limit.remaining, limit.resetAt), reqId);

  const url = new URL(req.url);
  const segments = getResourceSegments(url);
  const resourceId = segments[0] ?? null;
  const action = segments[1] ?? null;

  try {
    if (req.method === 'GET' && !resourceId) {
      const urlObj = new URL(req.url);
      const limitParam = Number(urlObj.searchParams.get('limit') || '0');
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : null;

      let query = supabase
        .from('ads')
        .select('id, title, description, image_url, link, is_active, created_at')
        .order('created_at', { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('ads fetch error', fetchError);
        return jsonErrorWithId('Failed to load ads', 500, {}, rateHeaders, reqId);
      }

      return jsonSuccess({ items: data ?? [] }, 200, rateHeaders);
    }

    if (req.method === 'POST' && !resourceId) {
      const formData = await req.formData();
      const titleRaw = formData.get('title');
      const descriptionRaw = formData.get('description');
      const linkRaw = formData.get('link');
      const isActiveRaw = formData.get('is_active');
      const image = formData.get('image');

      if (typeof titleRaw !== 'string' || titleRaw.trim().length === 0) {
        return jsonErrorWithId('Title is required', 400, {}, rateHeaders, reqId);
      }

      if (!(image instanceof File) || image.size === 0) {
        return jsonErrorWithId('Image upload is required', 400, {}, rateHeaders, reqId);
      }

      const uploadResult = await uploadImage(image, supabase);
      if ('error' in uploadResult) {
        return jsonErrorWithId(uploadResult.error || 'Failed to upload image', 400, {}, rateHeaders, reqId);
      }

      const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() || null : null;
      const link = typeof linkRaw === 'string' ? linkRaw.trim() || null : null;
      if (link && !/^https?:\/\//i.test(link)) {
        return jsonErrorWithId('Link must start with http(s)://', 400, {}, rateHeaders, reqId);
      }
      const isActive = typeof isActiveRaw === 'string' ? isActiveRaw === 'true' : true;

      const { data, error: insertError } = await supabase
        .from('ads')
        .insert({
          title: titleRaw.trim(),
          description,
          image_url: uploadResult.url,
          link,
          is_active: isActive,
        })
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('ads insert error', insertError);
        return jsonErrorWithId('Failed to create ad', 500, {}, rateHeaders, reqId);
      }

      return jsonSuccess({ item: data }, 201, rateHeaders);
    }

    if (req.method === 'PUT' && resourceId) {
      const { data: existing, error: fetchError } = await supabase
        .from('ads')
        .select('id, image_url')
        .eq('id', resourceId)
        .maybeSingle();

      if (fetchError || !existing) {
        return jsonErrorWithId('Ad not found', 404, {}, rateHeaders, reqId);
      }

      const formData = await req.formData();
      const updates: Record<string, unknown> = {};

      const titleRaw = formData.get('title');
      if (typeof titleRaw === 'string') {
        if (titleRaw.trim().length === 0) {
          return jsonErrorWithId('Title cannot be empty', 400, {}, rateHeaders, reqId);
        }
        updates.title = titleRaw.trim();
      }

      const descriptionRaw = formData.get('description');
      if (descriptionRaw !== null) {
        if (typeof descriptionRaw !== 'string') {
          return jsonErrorWithId('Description must be a string', 400, {}, rateHeaders, reqId);
        }
        updates.description = descriptionRaw.trim() || null;
      }

      const linkRaw = formData.get('link');
      if (linkRaw !== null) {
        if (typeof linkRaw !== 'string') {
          return jsonErrorWithId('Link must be a string', 400, {}, rateHeaders, reqId);
        }
        const linkVal = linkRaw.trim() || null;
        if (linkVal && !/^https?:\/\//i.test(linkVal)) {
          return jsonErrorWithId('Link must start with http(s)://', 400, {}, rateHeaders, reqId);
        }
        updates.link = linkVal;
      }

      const isActiveRaw = formData.get('is_active');
      if (typeof isActiveRaw === 'string' && isActiveRaw.length > 0) {
        updates.is_active = isActiveRaw === 'true';
      }

      const image = formData.get('image');
      let newImagePath: string | null = null;
      if (image instanceof File && image.size > 0) {
        const uploadResult = await uploadImage(image, supabase);
        if ('error' in uploadResult) {
          return jsonErrorWithId(uploadResult.error || 'Failed to upload image', 400, {}, rateHeaders, reqId);
        }
        updates.image_url = uploadResult.url;
        newImagePath = uploadResult.path;
      }

      if (Object.keys(updates).length === 0) {
        return jsonErrorWithId('No changes provided', 400, {}, rateHeaders, reqId);
      }

      const { data, error: updateError } = await supabase
        .from('ads')
        .update(updates)
        .eq('id', resourceId)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('ads update error', updateError);
        if (newImagePath) {
          await supabase.storage.from(ADS_BUCKET).remove([newImagePath]).catch(() => undefined);
        }
        return jsonErrorWithId('Failed to update ad', 500, {}, rateHeaders, reqId);
      }

      if (newImagePath && existing.image_url) {
        const oldPath = extractStoragePath(existing.image_url);
        if (oldPath) {
          await supabase.storage.from(ADS_BUCKET).remove([oldPath]).catch(() => undefined);
        }
      }

      return jsonSuccess({ item: data }, 200, rateHeaders);
    }

    if (req.method === 'DELETE' && resourceId) {
      const { data: existing, error: fetchError } = await supabase
        .from('ads')
        .select('id, image_url')
        .eq('id', resourceId)
        .maybeSingle();

      if (fetchError || !existing) {
        return jsonErrorWithId('Ad not found', 404, {}, rateHeaders, reqId);
      }

      const { error: deleteError } = await supabase
        .from('ads')
        .delete()
        .eq('id', resourceId);

      if (deleteError) {
        console.error('ads delete error', deleteError);
        return jsonErrorWithId('Failed to delete ad', 500, {}, rateHeaders, reqId);
      }

      if (existing.image_url) {
        const storagePath = extractStoragePath(existing.image_url);
        if (storagePath) {
          await supabase.storage.from(ADS_BUCKET).remove([storagePath]).catch(() => undefined);
        }
      }

      return jsonSuccess({}, 200, rateHeaders);
    }

    if (req.method === 'PATCH' && resourceId && action === 'toggle') {
      const payload = await req.json().catch(() => ({}));
      const isActive = payload?.is_active;
      if (typeof isActive !== 'boolean') {
        return jsonErrorWithId('is_active boolean is required', 400, {}, rateHeaders, reqId);
      }

      const { data, error: updateError } = await supabase
        .from('ads')
        .update({ is_active: isActive })
        .eq('id', resourceId)
        .select()
        .maybeSingle();

      if (updateError || !data) {
        console.error('ads toggle error', updateError);
        return jsonErrorWithId('Failed to update status', 500, {}, rateHeaders, reqId);
      }

      return jsonSuccess({ item: data }, 200, rateHeaders);
    }

    return jsonErrorWithId('Not found', 404, {}, rateHeaders, reqId);
  } catch (err) {
    console.error('admin_ads handler error', err);
    return jsonErrorWithId('Internal server error', 500, {}, rateHeaders, reqId);
  }
}
