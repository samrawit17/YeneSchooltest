const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'img',
  'div', 'span', 'sub', 'sup', 'del', 'ins', 'mark', 'small',
]);

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'class', 'style', 'id', 'title',
]);

const FORBIDDEN_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '');

  cleaned = cleaned.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    const lowerTag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return '';
    }

    const attrs = match.match(/\s+[a-zA-Z-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g) || [];
    const safeAttrs = attrs.filter((attr) => {
      const attrName = attr.trim().split('=')[0].toLowerCase();

      if (attrName.startsWith('on')) return false;

      if (!ALLOWED_ATTRS.has(attrName) && !attrName.startsWith('data-')) return false;

      const valueMatch = attr.match(/=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
      if (valueMatch) {
        const value = (valueMatch[1] || valueMatch[2] || valueMatch[3] || '').toLowerCase();
        for (const protocol of FORBIDDEN_PROTOCOLS) {
          if (value.startsWith(protocol)) return false;
        }
      }

      return true;
    });

    const open = `<${lowerTag}${safeAttrs.join('')}>`;
    return open;
  });

  cleaned = cleaned.replace(/<\/[a-zA-Z][a-zA-Z0-9]*>/g, (match) => {
    const tag = match.replace(/<\/|>/g, '').toLowerCase();
    return ALLOWED_TAGS.has(tag) ? match : '';
  });

  return cleaned;
}
