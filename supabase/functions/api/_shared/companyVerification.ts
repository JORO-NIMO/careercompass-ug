const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_USER_AGENT = Deno.env.get('NOMINATIM_USER_AGENT') ?? 'careercompass-internal/1.0';
const NOMINATIM_CONTACT_EMAIL = Deno.env.get('NOMINATIM_CONTACT_EMAIL');
const WEB_REQUEST_TIMEOUT_MS = 6000;

export interface VerificationResult {
  maps: {
    verified: boolean;
    placeId?: string;
    formattedAddress?: string;
    rawStatus?: string;
  };
  web: {
    verified: boolean;
    resolvedUrl?: string;
    status?: number;
    rawError?: string;
  };
}

export function normalizeWebsite(url?: string): string | null {
  if (!url) return null;
  let candidate = url.trim();
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch (_err) {
    return null;
  }
}

export async function verifyMapsLocation(location?: string) {
  if (!location?.trim()) {
    return { verified: false, rawStatus: 'MISSING_LOCATION' };
  }

  const params = new URLSearchParams({
    q: location,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  });

  const headers: HeadersInit = {
    'User-Agent': NOMINATIM_USER_AGENT,
    'Accept-Language': 'en',
  };
  if (NOMINATIM_CONTACT_EMAIL) {
    headers['From'] = NOMINATIM_CONTACT_EMAIL;
  }

  try {
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      return { verified: false, rawStatus: `HTTP_${response.status}` };
    }
    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      return { verified: false, rawStatus: 'NO_RESULTS' };
    }
    const best = payload[0];
    return {
      verified: true,
      placeId: typeof best?.place_id === 'number' ? String(best.place_id) : best?.place_id,
      formattedAddress: best?.display_name,
      rawStatus: best?.type ?? 'FOUND',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'NOMINATIM_ERROR';
    return { verified: false, rawStatus: message };
  }
}

export async function verifyWebPresence(websiteUrl?: string) {
  const normalized = normalizeWebsite(websiteUrl);
  if (!normalized) {
    return { verified: false, rawError: 'INVALID_URL' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEB_REQUEST_TIMEOUT_MS);
  try {
    const headResponse = await fetch(normalized, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (headResponse.ok) {
      return { verified: true, resolvedUrl: headResponse.url, status: headResponse.status };
    }
    if (headResponse.status === 405 || headResponse.status === 403) {
      const getResponse = await fetch(normalized, { method: 'GET', redirect: 'follow' });
      if (getResponse.ok) {
        return { verified: true, resolvedUrl: getResponse.url, status: getResponse.status };
      }
      return { verified: false, resolvedUrl: getResponse.url, status: getResponse.status };
    }
    return { verified: false, resolvedUrl: headResponse.url, status: headResponse.status };
  } catch (error: unknown) {
    clearTimeout(timer);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { verified: false, rawError: 'TIMEOUT' };
    }
    const message = error instanceof Error ? error.message : 'WEB_ERROR';
    return { verified: false, rawError: message };
  }
}

export async function runVerificationChecks(payload: { location?: string; website_url?: string }): Promise<VerificationResult> {
  const [mapsResult, webResult] = await Promise.all([
    verifyMapsLocation(payload.location),
    verifyWebPresence(payload.website_url),
  ]);
  return {
    maps: mapsResult,
    web: webResult,
  };
}

export function buildVerificationNotes(result: VerificationResult): string | null {
  const notes: string[] = [];
  if (result.maps.rawStatus && !result.maps.verified) {
    notes.push(`maps:${result.maps.rawStatus}`);
  }
  if (result.web.rawError && !result.web.verified) {
    notes.push(`web:${result.web.rawError}`);
  }
  if (result.web.status && !result.web.verified) {
    notes.push(`web_status:${result.web.status}`);
  }
  return notes.length ? notes.join(';') : null;
}
