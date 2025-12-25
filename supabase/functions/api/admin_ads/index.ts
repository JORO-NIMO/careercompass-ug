import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { verifyAuth, unauthorizedResponse, handleCors, corsHeaders } from '../../_shared/auth.ts';

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

  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return unauthorizedResponse(error || 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();

  const isAdmin = await ensureAdmin(user.id, supabase);
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const url = new URL(req.url);
  const segments = getResourceSegments(url);
  const resourceId = segments[0] ?? null;
  const action = segments[1] ?? null;

  try {
    if (req.method === 'GET' && !resourceId) {
      const { data, error: fetchError } = await supabase
        .from('ads')
        .select('id, title, description, image_url, link, is_active, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('ads fetch error', fetchError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to load ads' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, items: data ?? [] }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'POST' && !resourceId) {
      const formData = await req.formData();
      const titleRaw = formData.get('title');
      const descriptionRaw = formData.get('description');
      const linkRaw = formData.get('link');
      const isActiveRaw = formData.get('is_active');
      const image = formData.get('image');

      if (typeof titleRaw !== 'string' || titleRaw.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Title is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!(image instanceof File) || image.size === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Image upload is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const uploadResult = await uploadImage(image, supabase);
      if ('error' in uploadResult) {
        return new Response(
          JSON.stringify({ ok: false, error: uploadResult.error }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() || null : null;
      const link = typeof linkRaw === 'string' ? linkRaw.trim() || null : null;
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to create ad' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'PUT' && resourceId) {
      const { data: existing, error: fetchError } = await supabase
        .from('ads')
        .select('id, image_url')
        .eq('id', resourceId)
        .maybeSingle();

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Ad not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const formData = await req.formData();
      const updates: Record<string, unknown> = {};

      const titleRaw = formData.get('title');
      if (typeof titleRaw === 'string') {
        if (titleRaw.trim().length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Title cannot be empty' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        updates.title = titleRaw.trim();
      }

      const descriptionRaw = formData.get('description');
      if (descriptionRaw !== null) {
        if (typeof descriptionRaw !== 'string') {
          return new Response(
            JSON.stringify({ ok: false, error: 'Description must be a string' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        updates.description = descriptionRaw.trim() || null;
      }

      const linkRaw = formData.get('link');
      if (linkRaw !== null) {
        if (typeof linkRaw !== 'string') {
          return new Response(
            JSON.stringify({ ok: false, error: 'Link must be a string' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        updates.link = linkRaw.trim() || null;
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
          return new Response(
            JSON.stringify({ ok: false, error: uploadResult.error }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        updates.image_url = uploadResult.url;
        newImagePath = uploadResult.path;
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: 'No changes provided' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to update ad' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (newImagePath && existing.image_url) {
        const oldPath = extractStoragePath(existing.image_url);
        if (oldPath) {
          await supabase.storage.from(ADS_BUCKET).remove([oldPath]).catch(() => undefined);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'DELETE' && resourceId) {
      const { data: existing, error: fetchError } = await supabase
        .from('ads')
        .select('id, image_url')
        .eq('id', resourceId)
        .maybeSingle();

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Ad not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { error: deleteError } = await supabase
        .from('ads')
        .delete()
        .eq('id', resourceId);

      if (deleteError) {
        console.error('ads delete error', deleteError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to delete ad' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (existing.image_url) {
        const storagePath = extractStoragePath(existing.image_url);
        if (storagePath) {
          await supabase.storage.from(ADS_BUCKET).remove([storagePath]).catch(() => undefined);
        }
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'PATCH' && resourceId && action === 'toggle') {
      const payload = await req.json().catch(() => ({}));
      const isActive = payload?.is_active;
      if (typeof isActive !== 'boolean') {
        return new Response(
          JSON.stringify({ ok: false, error: 'is_active boolean is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data, error: updateError } = await supabase
        .from('ads')
        .update({ is_active: isActive })
        .eq('id', resourceId)
        .select()
        .maybeSingle();

      if (updateError || !data) {
        console.error('ads toggle error', updateError);
        return new Response(
          JSON.stringify({ ok: false, error: 'Failed to update status' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, item: data }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('admin_ads handler error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}
