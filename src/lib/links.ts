// Link policy (AGENTS.md §5): only http, https and mailto leave the app, after confirmation.

export type UriVerdict = { kind: 'external'; url: string } | { kind: 'blocked'; scheme: string };

const ALLOWED = new Set(['http:', 'https:', 'mailto:']);

export function classifyUri(raw: string): UriVerdict {
  // Strip control characters and whitespace that could hide a scheme ("java\tscript:").
  const cleaned = raw.replace(/[\u0000- \u007f]/g, '');
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return { kind: 'blocked', scheme: 'invalid' };
  }
  return ALLOWED.has(url.protocol) ? { kind: 'external', url: url.href } : { kind: 'blocked', scheme: url.protocol };
}
