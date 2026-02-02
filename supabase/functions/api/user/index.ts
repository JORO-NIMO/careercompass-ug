import { createSupabaseServiceClient } from '../../_shared/sbClient.ts';
import { handleCors, verifyAuth, unauthorizedResponse } from '../../_shared/auth.ts';
import { jsonError, jsonSuccess } from '../../_shared/responses.ts';
import {
  runVerificationChecks,
  normalizeWebsite,
  buildVerificationNotes,
} from '../_shared/companyVerification.ts';

interface RegisterPayload {
  name?: string;
  location?: string;
  website_url?: string;
  contact_email?: string;
}

function trimOrNull(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function ensureAuthenticated(req: Request) {
  const authResult = await verifyAuth(req);
  if (!authResult.user) {
    return { response: unauthorizedResponse(authResult.error ?? 'Authentication required'), user: null };
  }
  return { response: null, user: authResult.user } as const;
}

async function handleRegister(req: Request) {
  const auth = await ensureAuthenticated(req);
  if (!auth.user) return auth.response!;

  try {
    const payload = await req.json().catch(() => null) as RegisterPayload | null;
    if (!payload) {
      return jsonError('Invalid JSON payload', 400);
    }

    const name = trimOrNull(payload.name ?? '');
    const location = trimOrNull(payload.location ?? '');
    if (!name || !location) {
      return jsonError('Company name and location are required', 400);
    }

    const normalizedWebsite = normalizeWebsite(payload.website_url);
    if (!normalizedWebsite) {
      return jsonError('Valid website URL is required', 400);
    }

    const supabase = createSupabaseServiceClient();

    const { data: ownedCompanies, error: listError } = await supabase
      .from('companies')
      .select('id, name, formatted_address, location_raw, maps_verified, web_verified, approved')
      .eq('owner_id', auth.user.id);

    if (listError) {
      console.error('load owned companies error', listError);
      return jsonError('Failed to prepare company verification', 500);
    }

    const normalizeComparable = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
    const locationComparable = normalizeComparable(location);
    const existing = (ownedCompanies ?? []).find((company) => {
      if (!company) return false;
      const nameMatch = company.name?.trim().toLowerCase() === name.toLowerCase();
      if (!nameMatch) return false;
      const formattedComparable = normalizeComparable(company.formatted_address);
      const rawComparable = normalizeComparable(company.location_raw);
      return formattedComparable === locationComparable || rawComparable === locationComparable;
    });

    const verification = await runVerificationChecks({ location, website_url: normalizedWebsite });
    const mapsVerified = verification.maps.verified || Boolean(existing?.maps_verified);
    const webVerified = verification.web.verified || Boolean(existing?.web_verified);
    const autoApproved = mapsVerified && webVerified;
    const approved = autoApproved || Boolean(existing?.approved);

    const writePayload = {
      name,
      owner_id: auth.user.id,
      location_raw: location,
      maps_place_id: verification.maps.placeId ?? null,
      formatted_address: verification.maps.formattedAddress ?? null,
      website_url: normalizedWebsite,
      contact_email: trimOrNull(payload.contact_email) ?? auth.user.email ?? null,
      maps_verified: mapsVerified,
      web_verified: webVerified,
      approved,
      verification_notes: buildVerificationNotes(verification),
    };

    let data;
    let error;

    if (existing?.id) {
      const result = await supabase
        .from('companies')
        .update(writePayload)
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('companies')
        .insert({ ...writePayload, created_by: auth.user.id })
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return jsonError('A company with the same name and location already exists', 409);
      }
      console.error('register company error', error);
      return jsonError('Failed to register company', 500);
    }

    return jsonSuccess({ item: data, verification }, autoApproved ? 200 : 202);
  } catch (err) {
    console.error('handleRegister unexpected error', err);
    return jsonError('Internal server error', 500);
  }
}

async function handleList(req: Request) {
  const auth = await ensureAuthenticated(req);
  if (!auth.user) return auth.response!;

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('list companies error', error);
      return jsonError('Failed to load companies', 500);
    }

    return jsonSuccess({ items: data ?? [] });
  } catch (err) {
    console.error('handleList unexpected error', err);
    return jsonError('Internal server error', 500);
  }
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const userIdx = segments.indexOf('user');
  const subSegments = userIdx === -1 ? [] : segments.slice(userIdx + 1);

  if (req.method === 'POST' && subSegments.length === 1 && subSegments[0] === 'register-company') {
    return await handleRegister(req);
  }

  if (req.method === 'GET' && subSegments.length === 1 && subSegments[0] === 'companies') {
    return await handleList(req);
  }

  return jsonError('Not found', 404);
}
