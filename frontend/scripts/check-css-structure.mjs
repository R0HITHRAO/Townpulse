/**
 * Structural guard for the design-system stylesheets.
 *
 *   npm run check:css
 *
 * Why this exists
 * ---------------
 * `src/styles/base.css` once shipped with three unclosed braces. CSS nesting
 * then reinterpreted everything after them, and the compiled bundle contained
 * selectors such as:
 *
 *     .tp-btn-secondary:hover:not(:disabled) .tp-badge { … }
 *     .tp-skeleton::after .tp-prose { … }
 *
 * `.tp-badge` therefore only matched inside a hovered secondary button, and the
 * prose / skeleton / button-variant rules were swallowed into unrelated parents.
 * **The build passed and all 43 unit tests passed.** Only reading the compiled
 * stylesheet revealed it.
 *
 * A missing brace is thus a silent defect: the tooling accepts it and the tests
 * do not touch CSS. This script makes it fail loudly instead.
 *
 * The check, and why it is shaped this way:
 *
 * A **selector-level rule** is a rule opened directly by a selector line — not
 * by an at-rule such as `@layer`, `@media` or `@keyframes`. Those at-rules are
 * containers, and how deeply they nest is legitimate and file-specific: a
 * stylesheet may legitimately put every rule inside `@layer tp-components`.
 *
 * The invariant that actually holds, and that the original corruption broke, is
 * therefore:
 *
 *     every selector-level rule sits at the same brace depth
 *
 * When a closing brace goes missing, the rules after it are silently
 * re-parented one level deeper, so their depth drifts above the majority.
 *
 * A naive brace-balance check cannot find this: removing one `}` leaves the
 * open/close totals equal (the file's final `}` simply becomes the `@layer`
 * closer), so depth-at-EOF still reads 0 and the file looks balanced. Comparing
 * per-rule depth is what exposes it.
 *
 * Implementation note: comments and string bodies are blanked *in place*,
 * preserving line structure, so reported line numbers always refer to the real
 * file. Stripping them with a regex that also removed the newlines shifted every
 * diagnostic by however many lines the preceding comments occupied.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const stylesDir = resolve(here, '../src/styles');

/** Lines that open a container rather than a selector. */
const AT_RULE = /^\s*@/;

/**
 * Blank out comments and string bodies while preserving line structure, so
 * brace counting is accurate *and* diagnostics keep true line numbers.
 */
function neutralise(css) {
  let out = '';
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];

    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      for (let k = i; k < stop; k += 1) out += css[k] === '\n' ? '\n' : ' ';
      i = stop - 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      out += ' ';
      i += 1;
      while (i < css.length && css[i] !== ch) {
        if (css[i] === '\\') i += 1;
        i += 1;
      }
      continue;
    }

    out += ch;
  }
  return out;
}

function checkFile(file) {
  const source = neutralise(readFileSync(resolve(stylesDir, file), 'utf8'));
  const lines = source.split('\n');

  const problems = [];
  const rules = [];
  let depth = 0;
  // Brace depths at which an at-rule was opened. A rule is "top level" when
  // this stack is empty.
  const containerStack = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    const isContainer = AT_RULE.test(line);

    // Record a selector rule only when no at-rule is currently open around it.
    // The depth update must come *after* this test so a rule on the same line as
    // its at-rule container is judged by the outer depth.
    if (opens > 0 && closes === 0 && !isContainer && containerStack.length === 0) {
      rules.push({ line: i + 1, depth, text: line.trim().slice(0, 44) });
    }

    depth += opens - closes;

    // Track at-rule nesting with an explicit stack keyed on the depth at which
    // each container was opened. A container stays open until the depth drops
    // back below its own, which is what correctly closes an `@media {` whose
    // `}` sits alone on a later line.
    if (isContainer) containerStack.push(depth);
    while (containerStack.length && depth < containerStack[containerStack.length - 1]) {
      containerStack.pop();
    }

    if (depth < 0) {
      problems.push(`line ${i + 1}: stray closing brace`);
      return { file, problems };
    }
  }

  if (depth !== 0) {
    problems.push(`depth ends at ${depth} (expected 0) — unclosed block`);
    return { file, problems };
  }

  // All recorded rules share one depth by construction, so the assertion is
  // that they are in fact siblings rather than nested under an unclosed rule.
  for (const r of rules) {
    if (r.depth !== rules[0].depth) {
      problems.push(
        `line ${r.line}: "${r.text}" sits at depth ${r.depth}, expected ${rules[0].depth} ` +
          `— a parent block is probably unclosed`
      );
    }
  }

  return { file, problems };
}

const files = readdirSync(stylesDir).filter((f) => f.endsWith('.css'));
let failed = 0;

console.log('');
for (const file of files) {
  const { problems } = checkFile(file);
  if (problems.length === 0) {
    console.log(`  PASS  ${file}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${file}`);
    for (const p of problems.slice(0, 5)) console.log(`        - ${p}`);
    if (problems.length > 5) {
      console.log(`        ... and ${problems.length - 5} more`);
    }
  }
}

console.log(`\n  ${files.length - failed}/${files.length} stylesheets structurally valid\n`);
process.exit(failed === 0 ? 0 : 1);