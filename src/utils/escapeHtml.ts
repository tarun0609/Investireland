const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

/**
 * Escapes a value for safe interpolation into HTML text or quoted attribute
 * values. Non-string values are stringified; null/undefined become ''.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Strips CR/LF and other control characters from values used in email
 * headers (e.g. subjects) to prevent header injection.
 */
export function sanitizeHeaderValue(value: unknown, maxLength = 200): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
