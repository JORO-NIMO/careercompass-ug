export function getRequestId(req: Request): string {
  const fromHeader = req.headers.get('x-request-id') || req.headers.get('x-cf-ray') || req.headers.get('cf-ray');
  try {
    return fromHeader && fromHeader.trim().length ? fromHeader.trim() : crypto.randomUUID();
  } catch {
    // Fallback if crypto.randomUUID is not available
    const t = Date.now().toString(36);
    const r = Math.floor(Math.random() * 1e9).toString(36);
    return `req_${t}_${r}`;
  }
}
