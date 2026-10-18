// Page labels in the UI: the indicator and parsing of "Go to page" input (AGENTS.md §4.1).

/** "iv (4/312)" when the label differs from the number, otherwise "4 / 312". */
export function formatIndicator(labels: readonly string[] | null, pageIndex: number, total: number): string {
  const number = pageIndex + 1;
  const label = labels?.[pageIndex];
  if (!label || label === String(number)) return `${number} / ${total}`;
  return `${label} (${number}/${total})`;
}

/**
 * Resolves user input to a 0-based page index. A label wins over a number when both match
 * (a book whose page "4" is the 12th page jumps to the 12th). Returns null if nothing matches.
 */
export function parsePageInput(input: string, labels: readonly string[] | null, total: number): number | null {
  const text = input.trim();
  if (!text) return null;
  if (labels) {
    const exact = labels.indexOf(text);
    if (exact >= 0) return exact;
    const lower = text.toLowerCase();
    const loose = labels.findIndex((l) => l.toLowerCase() === lower);
    if (loose >= 0) return loose;
  }
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return number >= 1 && number <= total ? number - 1 : null;
}
