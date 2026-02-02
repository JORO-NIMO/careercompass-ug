import { env } from '@/lib/env';

export type AccessControlResult = { allowed: boolean; message?: string; terms?: string };

export async function checkAccess(): Promise<AccessControlResult> {
  const url = `${env.supabase.url}/functions/v1/access-control`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as AccessControlResult;
    if (!res.ok) return { allowed: false, message: data.message, terms: data.terms };
    return data;
  } catch {
    return { allowed: true };
  }
}
