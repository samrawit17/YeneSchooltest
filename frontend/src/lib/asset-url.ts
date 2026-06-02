export function resolveAssetUrl(url?: string | null) {
  if (!url) return undefined;

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (!url.startsWith('/uploads/')) {
    return url;
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (
    !configuredApiUrl ||
    configuredApiUrl.startsWith('/api/proxy') ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(configuredApiUrl)
  ) {
    return `/api/proxy${url}`;
  }

  const apiBase = configuredApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return apiBase ? `${apiBase}${url}` : url;
}
