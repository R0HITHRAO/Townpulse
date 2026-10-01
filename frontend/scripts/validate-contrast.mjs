/**
 * WCAG 2.2 contrast validator for src/styles/tokens.css
 *
 *   npm run validate:contrast
 *
 * Parses the light and dark token blocks straight out of the CSS, then checks
 * every foreground/background pair the UI actually renders. Exits non-zero on
 * any failure so CI catches an accidental palette regression.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, '../src/styles/tokens.css'), 'utf8');

/** Extract `--name: #hex;` pairs from a named block (`:root` or `.dark`). */
function readBlock(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`block not found: ${selector}`);
  const end = css.indexOf('\n}', start);
  const body = css.slice(start, end);
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    vars[m[1]] = m[2];
  }
  return vars;
}

const themes = { light: readBlock(':root'), dark: readBlock('.dark') };

/** WCAG relative luminance. */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** WCAG contrast ratio between two hex colours. */
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground token, background token, minimum ratio, description]
// 4.5 = AA body text, 3.0 = AA large text / UI components (WCAG 1.4.3, 1.4.11)
// Token names are given without the `tp-` prefix, e.g. `text` -> `--tp-text`.
const PAIRS = [
  ['text', 'bg', 4.5, 'body copy on page background'],
  ['text', 'surface', 4.5, 'body copy on cards'],
  ['text', 'surface-2', 4.5, 'body copy on inset panels'],
  ['text-muted', 'bg', 4.5, 'secondary copy on page background'],
  ['text-muted', 'surface', 4.5, 'secondary copy on cards'],
  ['text-subtle', 'bg', 4.5, 'tertiary copy on page background'],
  ['on-primary', 'primary', 4.5, 'primary button label'],
  ['primary-soft-text', 'primary-soft', 4.5, 'primary soft badge'],
  ['on-accent', 'accent', 4.5, 'accent button label'],
  ['accent-soft-text', 'accent-soft', 4.5, 'accent soft badge'],
  ['warn-soft-text', 'warn-soft', 4.5, 'warning badge'],
  ['urgent-soft-text', 'urgent-soft', 4.5, 'urgent badge'],
  ['primary', 'bg', 4.5, 'primary link on page background'],
  ['primary', 'surface', 4.5, 'primary link on cards'],
  ['accent', 'bg', 4.5, 'accent link on page background'],
  ['urgent', 'bg', 4.5, 'urgent link on page background'],
  ['border-strong', 'bg', 3.0, 'strong border (UI component)'],
  ['border', 'surface', 1.0, 'hairline border (decorative)'],
];

let failures = 0;
let checks = 0;

for (const [themeName, vars] of Object.entries(themes)) {
  console.log(`\n  ${themeName.toUpperCase()}`);
  for (const [fg, bg, min, label] of PAIRS) {
    const fgHex = vars[`tp-${fg}`];
    const bgHex = vars[`tp-${bg}`];
    if (!fgHex || !bgHex) {
      console.log(`  ?  --tp-${fg} / --tp-${bg} — token missing, skipped`);
      continue;
    }
    const r = ratio(fgHex, bgHex);
    checks += 1;
    const pass = r >= min;
    if (!pass) failures += 1;
    const flag = pass ? 'PASS' : 'FAIL';
    const mark = pass ? '.' : '!';
    console.log(
      `  ${mark} ${flag} ${r.toFixed(2)}:1 (min ${min})  --tp-${fg} on --tp-${bg} — ${label}`
    );
  }
}

console.log(`\n  ${checks - failures}/${checks} checks passed\n`);
process.exit(failures === 0 ? 0 : 1);