import { env } from '@/lib/env';

export type AccessControlResult = { allowed: boolean; message?: string; terms?: string };

export async function checkAccess(): Promise<AccessControlResult> {
  const url = `${env.supabase.url}/functions/v1/access-control`;
  try {
    const res = await fetch(url, { method: 'GET' });
    // If function not deployed (404) or other non-403 error, allow access
    if (res.status === 404 || res.status >= 500) {
      return { allowed: true };
    }
    const data = (await res.json()) as AccessControlResult;
    // Only block if explicitly denied (403 with allowed: false)
    if (res.status === 403 && data.allowed === false) {
      return { allowed: false, message: data.message, terms: data.terms };
    }
    return { allowed: true };
  } catch {
    // Network errors or function unavailable: allow access
    return { allowed: true };
  }
}
