/**
 * CSV field escaping with formula-injection defense.
 *
 * RFC 4180 quoting handles delimiters/quotes/newlines. Separately, spreadsheet
 * apps execute a cell whose text begins with =, +, -, @, or a control char —
 * and names in exports are attacker-controlled free text (Stripe checkout,
 * giveaway entry forms). We prefix any such value with a single quote so
 * Excel/Sheets treat it as text, not a formula.
 */
export function csvField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/** Joins rows with CRLF and a trailing CRLF, as Excel expects. */
export function csvDocument(header: string, lines: string[]): string {
  return [header, ...lines].join("\r\n") + "\r\n";
}
