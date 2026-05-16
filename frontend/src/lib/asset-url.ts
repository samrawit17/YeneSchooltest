export function resolveAssetUrl(url?: string | null) {
  if (!url) return undefined;

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (!url.startsWith('/uploads/')) {
    return url;
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  return apiBase ? `${apiBase}${url}` : url;
}
