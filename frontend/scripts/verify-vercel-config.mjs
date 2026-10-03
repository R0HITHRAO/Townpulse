/**
 * Validate `vercel.json` against the schema Vercel actually enforces.
 *
 *   npm run check:vercel
 *
 * Why this exists
 * ---------------
 * `vercel.json` once failed a production deployment with:
 *
 *     The `vercel.json` schema validation failed with the following message:
 *     should NOT have additional property `//engines`
 *
 * The cause was an attempt to document the file with `"//"`-prefixed keys, the
 * JSON-comment convention this repo uses elsewhere (`package.json`, tsconfig).
 * It is **not** valid in `vercel.json`. The published schema sets:
 *
 *     "type": "object",
 *     "additionalProperties": false
 *
 * so *any* unrecognised top-level key is a hard validation error, and the same
 * applies to each entry of `headers` / `rewrites` / `redirects` / `routes`.
 *
 * Two things made this expensive to diagnose:
 *
 *  1. **Vercel reports one violation at a time.** This file had four of them:
 *     `//engines`, `engines`, `//rewrites`, and two `"//"` keys inside
 *     `headers[]`. Deleting only the reported key would have surfaced the next
 *     one on the next deploy, one production incident at a time.
 *  2. **`engines` is not a `vercel.json` key at all.** It is absent from the
 *     schema's 44 top-level properties, so `"engines": {"node": "20.x"}` was
 *     invalid in exactly the same way `"//engines"` was. The Node pin belongs
 *     in `package.json` (`engines`), which Vercel does honour — so removing it
 *     from here loses no behaviour. See `checkNodeEnginePin` below.
 *
 * Nothing else in the toolchain catches this: the file is valid JSON, the
 * frontend build never reads it, and every unit test passes. Only Vercel's
 * schema validator objects, and it runs after the commit has landed.
 *
 * How the allowed keys are sourced
 * --------------------------------
 * Copied from https://openapi.vercel.sh/vercel.json (`properties` +
 * `additionalProperties: false`). Vercel adds keys over time, so this list can
 * drift; `npm run check:vercel -- --refresh` re-fetches the schema and prints
 * the current tables. A key that is genuinely valid but missing here is
 * reported as unknown, which is a safe direction to fail in.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const vercelJsonPath = resolve(here, '../vercel.json');
const packageJsonPath = resolve(here, '../package.json');

const SCHEMA_URL = 'https://openapi.vercel.sh/vercel.json';

/** Top-level properties permitted by the schema. `additionalProperties: false`. */
const TOP_LEVEL_KEYS = [
  '$schema',
  'alias',
  'build',
  'buildCommand',
  'builds',
  'bunVersion',
  'bulkRedirectsPath',
  'cleanUrls',
  'crons',
  'daemons',
  'devCommand',
  'env',
  'experimentalAtproto',
  'experimentalBYOC',
  'experimentalEnvironmentVariables',
  'experimentalServiceGroups',
  'experimentalServices',
  'experimentalServicesV2',
  'fluid',
  'framework',
  'functionFailoverRegions',
  'functions',
  'git',
  'github',
  'headers',
  'ignoreCommand',
  'images',
  'installCommand',
  'name',
  'outputDirectory',
  'passiveRegions',
  'proxy',
  'redirects',
  'regions',
  'relatedProjects',
  'rewrites',
  'routes',
  'schedules',
  'scope',
  'services',
  'skipMiddlewareRequestBody',
  'trailingSlash',
  'version',
  'wildcard',
];

/** Allowed keys per entry of each route/header collection. */
const ITEM_KEYS = {
  headers: ['source', 'headers', 'has', 'missing'],
  rewrites: [
    'source',
    'destination',
    'transforms',
    'has',
    'missing',
    'statusCode',
    'env',
    'respectOriginCacheControl',
  ],
  redirects: ['source', 'destination', 'permanent', 'statusCode', 'has', 'missing', 'env'],
  routes: [
    'src',
    'source',
    'dest',
    'destination',
    'headers',
    'methods',
    'caseSensitive',
    'important',
    'user',
    'continue',
    'override',
    'check',
    'isInternal',
    'status',
    'statusCode',
    'locale',
    'middleware',
    'middlewarePath',
    'middlewareRawSrc',
    'has',
    'missing',
    'mitigate',
    'transforms',
    'env',
    'respectOriginCacheControl',
  ],
};

/** Keys of a single `{ key, value }` pair inside `headers[].headers`. */
const HEADER_PAIR_KEYS = ['key', 'value'];
const problems = [];

/** A `"//"`-prefixed key is the JSON-comment convention, invalid in this file. */
function isCommentKey(key) {
  return key.startsWith('//');
}

function checkUnknownKeys(object, allowed, path) {
  if (object === null || typeof object !== 'object' || Array.isArray(object)) return;
  for (const key of Object.keys(object)) {
    const where = path ? `${path}.${key}` : key;
    if (isCommentKey(key)) {
      problems.push(
        `${where}: comment-style key. vercel.json sets "additionalProperties": false, ` +
          `so any "//"-prefixed key fails validation. Document this file in ` +
          `docs/TROUBLESHOOTING.md instead.`
      );
    } else if (!allowed.includes(key)) {
      problems.push(`${where}: not a valid vercel.json key (schema rejects it).`);
    }
  }
}

/**
 * The SPA fallback must keep its negative lookahead.
 *
 * `"/(.*)"` also matches `/api/*`, so every API call was rewritten to
 * `index.html` and the browser failed with `Unexpected token '<' ... is not
 * valid JSON`. This is the documented root cause in TROUBLESHOOTING.md, and
 * the shape of the pattern is not something the schema can check.
 */
function checkSpaRewriteExcludesApi(rewrites) {
  const spa = (rewrites ?? []).find((r) => r.destination === '/index.html');
  if (!spa) {
    problems.push('rewrites: no rule sends unknown routes to /index.html (SPA fallback missing).');
    return;
  }
  if (!/^\/\(\(\?!api\/\)\.\*\)$/.test(spa.source)) {
    problems.push(
      `rewrites[${(rewrites ?? []).indexOf(spa)}].source: "${spa.source}" is not ` +
        `"/((?!api/).*)". Without the negative lookahead the rule also matches ` +
        `/api/* and every API call returns index.html instead of JSON.`
    );
  }
}

/**
 * `engines` is rejected by the vercel.json schema, so the Node floor that
 * `sharp` needs (>= 20.9.0) has to be declared in `package.json`. Assert it is
 * still there, otherwise dropping the invalid key silently unpinned the runtime.
 */
function checkNodeEnginePin() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const range = pkg.engines?.node;
  if (!range) {
    problems.push(
      'package.json: no engines.node. sharp requires Node >= 20.9.0; without a ' +
        'declared floor Vercel may build on an older runtime and the OG ' +
        'prebuild step degrades.'
    );
    return;
  }
  // Compare the major version rather than string-matching the whole range.
  const major = Number(/(\d+)\.(\d+)\.(\d+)/.exec(range)?.[1] ?? NaN);
  if (Number.isNaN(major) || major < 20) {
    problems.push(`package.json engines.node "${range}" is below sharp's floor of 20.9.0.`);
  }
}

/** Re-derive the key tables from the live published schema. */
async function refresh() {
  const res = await fetch(SCHEMA_URL);
  if (!res.ok) throw new Error(`${SCHEMA_URL} responded ${res.status}`);
  const schema = await res.json();
  const keys = Object.keys(schema.properties ?? {}).sort();
  console.log(`\n  ${keys.length} top-level keys in the current schema:\n`);
  console.log(`  ${keys.join(', ')}\n`);
  console.log(
    "  Copy the list above into TOP_LEVEL_KEYS, and each entry's `properties`\n" +
      '  into ITEM_KEYS. Refreshing by hand keeps this script free of a\n' +
      '  schema-validation dependency.\n'
  );
}

// ─── Run ─────────────────────────────────────────────────────────────────────

let config;
try {
  config = JSON.parse(readFileSync(vercelJsonPath, 'utf8'));
} catch (err) {
  console.error(`\n  vercel.json is not valid JSON: ${err.message}\n`);
  process.exit(1);
}

if (process.argv.includes('--refresh')) {
  await refresh();
  process.exit(0);
}

checkUnknownKeys(config, TOP_LEVEL_KEYS, '');

for (const [collection, allowed] of Object.entries(ITEM_KEYS)) {
  const entries = config[collection];
  if (!Array.isArray(entries)) continue;
  entries.forEach((entry, i) => {
    checkUnknownKeys(entry, allowed, `${collection}[${i}]`);
    // Nested { key, value } pairs inside a headers[] entry.
    if (collection === 'headers' && Array.isArray(entry.headers)) {
      entry.headers.forEach((pair, j) => {
        checkUnknownKeys(pair, HEADER_PAIR_KEYS, `${collection}[${i}].headers[${j}]`);
      });
    }
  });
}

checkSpaRewriteExcludesApi(config.rewrites);
checkNodeEnginePin();

if (problems.length > 0) {
  console.error(`\n  vercel.json would fail Vercel's schema validation:\n`);
  for (const p of problems) console.error(`    - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `\n  vercel.json is schema-clean: ${Object.keys(config).length} top-level keys, ` +
    `${(config.headers ?? []).length} header rules, ` +
    `${(config.rewrites ?? []).length} rewrite rule(s). SPA fallback excludes /api.\n`
);