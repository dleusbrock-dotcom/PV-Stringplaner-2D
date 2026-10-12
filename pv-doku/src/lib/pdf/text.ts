// Die Standardschrift (Helvetica) im PDF kennt nur WinAnsi (CP1252).
// Nicht darstellbare Zeichen werden ersetzt, damit keine Fehlzeichen entstehen.

const MAP: Record<string, string> = {
  "\u03a9": "Ohm",
  "\u2126": "Ohm",
  "≤": "<=",
  "≥": ">=",
  "≈": "~",
  "→": "->",
  "←": "<-",
  "✓": "ok",
  "✕": "x",
  "×": "×",
  "²": "²",
  "³": "³",
};

// Zusätzliche CP1252-Zeichen außerhalb von Latin-1
const CP1252_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

export function pdfText(v: unknown): string {
  if (v == null) return "";
  let out = "";
  for (const ch of String(v)) {
    const code = ch.codePointAt(0)!;
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (code === 10 || code === 9 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) || CP1252_EXTRA.has(ch)) out += ch;
    else out += "?";
  }
  return out;
}
