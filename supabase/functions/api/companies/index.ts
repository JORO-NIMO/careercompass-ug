import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { handleCors, corsHeaders, verifyAuth, unauthorizedResponse } from '../../_shared/auth.ts';
import {
  runVerificationChecks,
  normalizeWebsite,
  buildVerificationNotes,
} from '../_shared/companyVerification.ts';

interface CompanyPayload {
  name?: string;
  location?: string;
  website_url?: string;
  contact_email?: string;
}

const COMPANY_MEDIA_BUCKET = Deno.env.get('COMPANY_MEDIA_BUCKET') ?? 'company-media';
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base) return 'file';
  return base.toLowerCase();
}

function detectMediaType(file: File): 'image' | 'pdf' | null {
  const mime = file.type?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return null;
}

function extensionFromFile(file: File, mediaType: 'image' | 'pdf'): string {
  const name = file.name ?? '';
  if (name.includes('.')) {
    const ext = name.substring(name.lastIndexOf('.') + 1).trim().toLowerCase();
    if (ext) return ext;
  }
  if (mediaType === 'image') {
    const mime = file.type ?? '';
    if (mime.includes('/')) {
      const ext = mime.substring(mime.lastIndexOf('/') + 1).trim().toLowerCase();
      if (ext) return ext;
    }
    return 'png';
  }
  return 'pdf';
}

async function ensureCompanyAccess(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  companyId: string,
) {
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, owner_id')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    console.error('company lookup error', error);
    return {
      response: new Response(
        JSON.stringify({ ok: false, error: 'Failed to verify company access' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      ),
      company: null,
    } as const;
  }

  if (!company) {
    return {
      response: new Response(
        JSON.stringify({ ok: false, error: 'Company not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      ),
      company: null,
    } as const;
  }

  if (company.owner_id === userId) {
    return { response: null, company } as const;
  }

  const { data: adminRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError) {
    console.error('admin role check error', roleError);
    return {
      response: new Response(
        JSON.stringify({ ok: false, error: 'Failed to verify permissions' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      ),
      company: null,
    } as const;
  }

  if (!adminRole) {
    return {
      response: new Response(
        JSON.stringify({ ok: false, error: 'Company ownership required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      ),
      company: null,
    } as const;
  }

  return { response: null, company } as const;
}


async function handlePost(req: Request) {
  const authResult = await verifyAuth(req);
  if (!authResult.user) {
    return unauthorizedResponse(authResult.error ?? 'Authentication required');
  }

  const body = await req.json().catch(() => null) as CompanyPayload | null;
  if (!body) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const name = body.name?.trim();
  if (!name) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Company name is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: existingCompany, error: fetchError } = await supabase
    .from('companies')
    .select('id, approved, maps_verified, web_verified')
    .eq('owner_id', authResult.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error('companies fetch error', fetchError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to load company record' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const verification = await runVerificationChecks(body);
  const normalizedWebsite = normalizeWebsite(body.website_url ?? undefined);

  const mapsVerified = verification.maps.verified || Boolean(existingCompany?.maps_verified);
  const webVerified = verification.web.verified || Boolean(existingCompany?.web_verified);
  const autoApproved = mapsVerified && webVerified;
  const approved = autoApproved || Boolean(existingCompany?.approved);

  const locationValue = body.location?.trim() ?? null;
  const updatePayload = {
    owner_id: authResult.user.id,
    name,
    location_raw: locationValue,
    maps_place_id: verification.maps.placeId ?? null,
    formatted_address: verification.maps.formattedAddress ?? null,
    website_url: normalizedWebsite,
    contact_email: body.contact_email?.trim() ?? authResult.user.email ?? null,
    maps_verified: mapsVerified,
    web_verified: webVerified,
    approved,
    verification_notes: buildVerificationNotes(verification),
  };

  let data;
  let error;

  if (existingCompany?.id) {
    const result = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', existingCompany.id)
      .select()
      .maybeSingle();
    data = result.data;
    error = result.error;
  } else {
    const insertPayload = {
      ...updatePayload,
      owner_id: authResult.user.id,
      created_by: authResult.user.id,
    };
    const result = await supabase
      .from('companies')
      .insert(insertPayload)
      .select()
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('companies upsert error', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to register company' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, item: data, verification }),
    { status: autoApproved ? 200 : 202, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}

async function handlePatch(req: Request, companyId: string) {
  const authResult = await verifyAuth(req);
  if (!authResult.user) {
    return unauthorizedResponse(authResult.error ?? 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const body = await req.json().catch(() => null) as { approved?: boolean; maps_verified?: boolean; web_verified?: boolean; notes?: string } | null;
  if (!body) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const approved = body.approved ?? true;
  const updates: Record<string, unknown> = {
    approved,
  };

  if (approved) {
    updates.maps_verified = body.maps_verified ?? true;
    updates.web_verified = body.web_verified ?? true;
  } else {
    if (body.maps_verified !== undefined) updates.maps_verified = body.maps_verified;
    if (body.web_verified !== undefined) updates.web_verified = body.web_verified;
  }

  if (body.notes !== undefined) {
    updates.verification_notes = body.notes;
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', companyId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('companies approve error', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to update company approval' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Company not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, item: data }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}

async function handleListMedia(req: Request, companyId: string) {
  const supabase = createSupabaseServiceClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) {
    console.error('company media company lookup error', companyError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to load company media' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  if (!company) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Company not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const url = new URL(req.url);
  const placementId = url.searchParams.get('placement_id');

  let query = supabase
    .from('company_media')
    .select('*')
    .eq('company_id', companyId)
    .order('uploaded_at', { ascending: false });

  if (placementId) {
    query = query.eq('placement_id', placementId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('company media list error', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to load media' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, items: data ?? [] }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}

async function handleUploadMedia(req: Request, companyId: string) {
  const authResult = await verifyAuth(req);
  if (!authResult.user) {
    return unauthorizedResponse(authResult.error ?? 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();
  const access = await ensureCompanyAccess(supabase, authResult.user.id, companyId);
  if (access.response) return access.response;

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid form payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const filePart = formData.get('file');
  if (!(filePart instanceof File)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Media file is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  if (filePart.size === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Uploaded file is empty' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  if (filePart.size > MAX_MEDIA_BYTES) {
    return new Response(
      JSON.stringify({ ok: false, error: 'File exceeds 5MB limit' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const mediaType = detectMediaType(filePart);
  if (!mediaType) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Only image or PDF files are allowed' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const placementPart = formData.get('placement_id');
  let placementId: string | null = null;
  if (typeof placementPart === 'string' && placementPart.trim().length) {
    placementId = placementPart.trim();
    const { data: placement, error: placementError } = await supabase
      .from('placements')
      .select('id, company_id')
      .eq('id', placementId)
      .maybeSingle();

    if (placementError) {
      console.error('company media placement lookup error', placementError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to verify placement' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    if (!placement || placement.company_id !== companyId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Placement does not belong to this company' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }
  }

  const extension = extensionFromFile(filePart, mediaType);
  const safeName = sanitizeFilename(filePart.name || `${mediaType}.${extension}`);
  const storagePath = `company-media/${companyId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(COMPANY_MEDIA_BUCKET).upload(storagePath, filePart, {
    cacheControl: '3600',
    upsert: false,
    contentType: filePart.type || (mediaType === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
  });

  if (uploadError) {
    console.error('company media upload error', uploadError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to upload media' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const { data: publicUrlData } = supabase.storage.from(COMPANY_MEDIA_BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicUrlData.publicUrl;

  const { data, error } = await supabase
    .from('company_media')
    .insert({
      company_id: companyId,
      placement_id: placementId,
      url: publicUrl,
      path: storagePath,
      type: mediaType,
      size: filePart.size,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('company media insert error', error);
    await supabase.storage.from(COMPANY_MEDIA_BUCKET).remove([storagePath]).catch(() => undefined);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to save media record' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, item: data }),
    { status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}

async function handleDeleteMedia(req: Request, companyId: string, mediaId: string) {
  const authResult = await verifyAuth(req);
  if (!authResult.user) {
    return unauthorizedResponse(authResult.error ?? 'Authentication required');
  }

  const supabase = createSupabaseServiceClient();
  const { data: mediaRow, error: mediaError } = await supabase
    .from('company_media')
    .select('id, company_id, path')
    .eq('id', mediaId)
    .maybeSingle();

  if (mediaError) {
    console.error('company media fetch error', mediaError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to load media record' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  if (!mediaRow || mediaRow.company_id !== companyId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Media not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const access = await ensureCompanyAccess(supabase, authResult.user.id, companyId);
  if (access.response) return access.response;

  const { error: deleteError } = await supabase
    .from('company_media')
    .delete()
    .eq('id', mediaId)
    .eq('company_id', companyId);

  if (deleteError) {
    console.error('company media delete error', deleteError);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to delete media' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  await supabase.storage.from(COMPANY_MEDIA_BUCKET).remove([mediaRow.path]).catch(() => undefined);

  return new Response(null, { status: 204, headers: { ...corsHeaders } });
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const companiesIdx = segments.indexOf('companies');
  const subSegments = companiesIdx === -1 ? [] : segments.slice(companiesIdx + 1);

  if (req.method === 'POST' && subSegments.length === 0) {
    return await handlePost(req);
  }

  if (req.method === 'GET' && subSegments.length === 2 && subSegments[1] === 'media') {
    return await handleListMedia(req, subSegments[0]);
  }

  if (req.method === 'POST' && subSegments.length === 2 && subSegments[1] === 'media') {
    return await handleUploadMedia(req, subSegments[0]);
  }

  if (req.method === 'DELETE' && subSegments.length === 3 && subSegments[1] === 'media') {
    return await handleDeleteMedia(req, subSegments[0], subSegments[2]);
  }

  if (req.method === 'PATCH' && subSegments.length === 2 && subSegments[1] === 'approve') {
    return await handlePatch(req, subSegments[0]);
  }

  return new Response(
    JSON.stringify({ ok: false, error: 'Not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}
