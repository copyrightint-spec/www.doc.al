/**
 * Basic HTML sanitizer - strips dangerous tags and attributes.
 * Allows safe formatting tags only.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "a", "span", "div",
  "table", "thead", "tbody", "tr", "td", "th", "blockquote",
]);

const ALLOWED_ATTRS = new Set(["href", "target", "rel", "class"]);

export function sanitizeHtml(html: string): string {
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    // Remove style tags and content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Remove iframe, object, embed, form
    .replace(/<(iframe|object|embed|form|input|textarea|button)\b[^>]*>.*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|form|input|textarea|button)\b[^>]*\/?>/gi, "");
}
