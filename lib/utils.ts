import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Plain-text fallback for an HTML body. An empty text/plain part next to an
 * HTML one is one of the loudest "bulk mail" signals a spam filter looks for,
 * so every send gets a real alternative.
 * ponytail: regex strip, not a parser — swap in html-to-text if bodies ever
 * get complex enough that the fallback reads badly.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // &amp; last, so "&amp;lt;" survives as the literal "&lt;".
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Place a signature in a composer body. On a reply or forward it goes above
 * the quoted mail — a signature stranded under the quote reads as part of it.
 * Idempotent, so an autosaved body never collects a second copy.
 */
export function insertSignature(html: string, signature: string): string {
  if (!signature || html.includes('data-zenmail-signature')) return html;
  const sig = `<br/><div data-zenmail-signature>${signature}</div>`;
  const quote = html.indexOf('<div data-zenmail-quote');
  return quote === -1
    ? `${html}${sig}`
    : `${html.slice(0, quote)}${sig}${html.slice(quote)}`;
}
