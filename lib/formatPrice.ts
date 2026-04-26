/**
 * Normalises any raw price string returned by the LLM or Tavily into a
 * consistent "$X,XXX.XX" display format.
 *
 * Handles all observed variants, e.g.:
 *   "From $195"         → "$195.00"
 *   "523.00 USD"        → "$523.00"
 *   "$114.25"           → "$114.25"
 *   "USD: 376.11"       → "$376.11"
 *   "USD 376.11"        → "$376.11"
 *   "$1,250"            → "$1,250.00"
 *   "~$89.99"           → "$89.99"
 *   "€45.00"            → "$45.00"   (foreign symbol → $ for display consistency)
 *   "Not found…"        → left unchanged
 *   "TBD"              → left unchanged
 */

const CURRENCY_PREFIXES =
  /^[^0-9]*?(?:from|approx\.?|~|about|starting\s+at|as\s+low\s+as|usd\s*[:=]?|eur\s*[:=]?|gbp\s*[:=]?|cad\s*[:=]?|aud\s*[:=]?)\s*/i;

/** Finds the first number-like token: optional leading symbol, digits with optional commas and a single decimal part. */
const FIRST_NUMBER = /[$€£¥]?\s*(\d[\d,]*(?:\.\d+)?)/;

export function formatPrice(raw: string): string {
  const s = raw.trim();

  // Pass through non-price strings unchanged.
  if (!s || /^(tbd|not found|n\/a|unknown|-+)$/i.test(s)) return s;
  // If it contains no digit at all it can't be a price.
  if (!/\d/.test(s)) return s;

  // Strip qualitative prefixes so "From $195" becomes "$195".
  const stripped = s.replace(CURRENCY_PREFIXES, "").trim();

  const match = stripped.match(FIRST_NUMBER);
  if (!match) return s; // unrecognised format — return as-is

  // Remove thousands commas before parsing.
  const numeric = parseFloat(match[1].replace(/,/g, ""));
  if (!isFinite(numeric)) return s;

  // Format with 2 decimal places and thousand separator.
  return "$" + numeric.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
