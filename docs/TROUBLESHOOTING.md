# Troubleshooting

The errors this file is about, and what each one actually meant.

---

## `should NOT have additional property \`//engines\``

A production deployment was rejected before the build ran:

```
The `vercel.json` schema validation failed with the following message:
should NOT have additional property `//engines`
```

**Root cause:** `frontend/vercel.json` was documented with `"//"`-prefixed keys,
the JSON-comment convention used elsewhere in this repo (`package.json`). That
convention is **not** valid in `vercel.json`. The published schema
(<https://openapi.vercel.sh/vercel.json>) declares:

```json
{ "type": "object", "additionalProperties": false }
```

so *any* unrecognised key is a hard error, not a warning.

**There were four violations, and Vercel only named one of them:**

| Key | Verdict |
|---|---|
| `"//engines"` (top level) | rejected — this is the one reported |
| `"engines"` (top level) | rejected — **not a `vercel.json` key at all** |
| `"//rewrites"` (top level) | rejected |
| `"//"` inside two `headers[]` entries | rejected — `headers[]` items are `additionalProperties: false` too |

Removing only the reported key would have failed the next deploy on `engines`.

> **`engines` is not part of the `vercel.json` schema** (it is absent from all 44
> top-level properties), so `{"engines": {"node": "20.x"}}` was invalid for the
> same reason `"//engines"` was. The Node floor that `sharp` needs
> (`>= 20.9.0`) belongs in **`package.json`**, which Vercel does honour and
> where it is already declared — so dropping it from `vercel.json` loses
> nothing.

> **If you need comments in this config, migrate to `vercel.toml`.** It supports
> the same properties *and* `#` comments. Only one project configuration file is
> allowed, though — `vercel.toml`, `vercel.json` or `vercel.ts`, never two — so
> this means replacing `vercel.json`, not adding a file beside it.

### Checking it before deploying

```bash
cd frontend
npm run check:vercel
```

`scripts/verify-vercel-config.mjs` validates the file against the schema's
allowed keys, and runs in CI. It also asserts two things the schema cannot
check: that the SPA rewrite keeps its `/((?!api/).*)` negative lookahead (see
the section above — losing it breaks every API call), and that `package.json`
still pins the Node version.

The allowed-key tables are copied from the published schema, which Vercel
extends over time. To refresh them:

```bash
npm run check:vercel -- --refresh
```

---

## `Unexpected token '<', "<!doctype "... is not valid JSON`

The app asked for JSON and got an HTML page instead.

**Root cause (two separate bugs, both now fixed):**

1. `vercel.json` rewrote `/(.*)` → `/index.html`. That pattern also matches
   `/api/*`, so on Vercel **every API call returned the SPA's HTML**.
   Fixed by scoping the fallback to `/((?!api/).*)`.
2. `response.json()` was called on whatever came back. When the body was HTML,
   the browser threw this message and the real cause was discarded.
   The API client now reads the body as text, checks `content-type`, and raises
   a typed `ApiError` with `kind: 'not-json'`.

**If you still see it**, the request is being answered by something that is not
the API. Check in this order:

```bash
# 1. Is the backend up?
curl http://localhost:8000/health
# expect: {"status":"ok","database":true,...}

# 2. Is /api proxied correctly from the frontend origin?
curl http://localhost:3000/api/categories
# expect JSON, content-type application/json

# 3. What is actually being returned?
curl -i http://localhost:3000/api/listings | head -20
```

If step 3 shows `content-type: text/html`, something is serving the SPA for
`/api`. If it shows `404`, the proxy is missing.

---

## "Could not load services"

This is **not** an empty result — the server did not answer. The error panel
now branches on the real cause instead of showing one generic message:

| Message shown | Meaning | Do this |
|---|---|---|
| **You are offline** | Browser has no connection | Reconnect |
| **The server took too long** | Backend accepted the connection but didn't reply in 15 s | Check Postgres is up |
| **Wrong server response** | Something returned HTML for `/api` | See section above |
| **Could not load services** | Backend unreachable | See below |

> **These four messages only appear on `/map`.** `MapView.tsx` is the only
> component that renders the `errorKind` branch. On the home page and listing
> pages an unreachable API falls back to the bundled snapshot and shows the
> "saved directory data" banner instead — see the section below. If you expected
> these messages on the home page and did not get them, that is the fallback
> working, not a regression.

**Starting the backend:**

```bash
# From the repo root
docker compose up -d --build
# or from infra/ (this is the project the running stack uses)
cd infra && docker compose up -d --build

# Backend only, against an existing Postgres
cd backend
uvicorn app.main:app --reload --port 8000
```

Check it worked:

```bash
curl http://localhost:8000/health
```

If `database` is `false`, Postgres is the problem, not FastAPI:

```bash
docker compose ps                 # is postgres healthy?
docker compose logs backend      # look for the seeding output
```

---

## The map is empty or shows the wrong place

Fixed: `Map.tsx` defaulted to hardcoded Bengaluru coordinates. It now uses
`town.lat` / `town.lng` from `frontend/src/config/site.ts`.

If the map is blank but listings exist:

- The radius filter needs an origin. The app sends the town centre
  automatically; if you changed `town.lat`/`town.lng`, re-run
  `npm run sync:directory` so the static snapshot uses the same centre.
- Map tiles come from `openstreetmap.org` and need internet. Behind a firewall
  or on a blocked network the pins still show but the background is blank.

If the map is completely unstyled (no controls, broken tiles), Leaflet CSS
failed to load. It is bundled from `node_modules` and imported by
`src/components/Map.tsx` — it is no longer fetched from a CDN.

---

## The page works but shows "saved directory data"

That banner means the API could not be reached and the app fell back to the
static snapshot in `public/data/listings.json`. This is deliberate: showing
real (if unverified) OpenStreetMap data beats showing an error and nothing
else. Click **"Try the live server"** once the backend is up.

Regenerate the snapshot after changing the seed data:

```bash
cd frontend
npm run sync:directory
```

---

## Design-system classes missing (buttons unstyled)

Two different causes, both silent.

### 1. An unclosed brace in `base.css` (most likely)

`base.css` once shipped with three unclosed braces. CSS nesting then
reinterpreted everything after them, so the compiled bundle contained selectors
like `.tp-btn-secondary:hover .tp-badge` — meaning `.tp-badge` only matched
inside a hovered secondary button and the affected components rendered
unstyled. **The build passed and every test passed**; only reading the compiled
stylesheet revealed it.

```bash
npm run check:css   # 5/5 stylesheets structurally valid
```

This runs in CI. It reports how many rules it actually compared, so a file
showing `0 rules compared` means the depth check had nothing to inspect in that
file — for `globals.css` that is correct (it only holds `@import` and
`@tailwind` statements), but it is worth noticing if a rule-heavy file drops to
zero.

`base.css` currently compares 13 top-level rules inside `@layer
tp-components`; rules inside `@media` blocks are excluded, since they are
legitimately deeper.

### 2. Reintroducing `@layer components`

Tailwind v3 tree-shakes its own layers and deletes any class it does not find
in source. Our styles live in dedicated `tp-base` / `tp-components` layers
precisely to avoid this. Verify after any CSS change:

```bash
npm run build
# then check a class actually survived, e.g.:
node -e "const fs=require('fs');const f=fs.readdirSync('dist/assets').find(x=>/^index.*css$/.test(x));const c=fs.readFileSync('dist/assets/'+f,'utf8');console.log('.tp-btn present:',c.includes('.tp-btn'))"
```

Note that `.tp-btn` matching is necessary but not sufficient: a misnested rule
still *contains* the string `.tp-btn`. Use `npm run check:css` for the real
guarantee.

---

## Share previews are blank or the image is broken

Every WhatsApp/Facebook share needs `og:image`. A card is generated per
listing and per category at build time by `scripts/generate-og.mjs`.

### Check whether the references resolve

```bash
cd frontend
npm run build
npm run verify:og   # 181/181 og:image references resolve across 181 pages.
```

This walks the built pages rather than trusting the manifest, so it catches a
page claiming a card that was never written. It runs in CI.

### Why the build can skip rendering

`generate:og` uses `sharp`, a native module needing Node >= 20.9 and a
per-platform prebuilt binary. If it cannot load, the script **warns and exits
0** instead of failing the deployment, and reduces `public/og/manifest.json` to
just the committed `home.png`. Every page then falls back to that one card.

> **A degraded build is only safe because the manifest is reduced with it.** An
> earlier version left the previous manifest in place while skipping rendering,
> so 178 of 181 pre-rendered pages advertised a per-listing PNG that did not
> exist — a broken image on every listing and category share, while the build
> still exited 0. If you change this script, keep the manifest and the rendered
> files in agreement, and let `verify:og` prove it.

If images are missing entirely, check the build log for the
`[generate:og] sharp is unavailable` warning, and confirm Node is >= 20.9.

---

```bash
# frontend
npm run typecheck          # 0 errors expected
npm test                   # 55 tests across 17 files
npm run build              # also generates OG images, sitemap and pre-rendered pages
npm run verify:og           # assert every og:image in dist/ actually exists
npm run check:css           # guards against the brace corruption described above
npm run check:vercel         # assert vercel.json matches Vercel's schema
npm run validate:contrast  # 36/36 AA checks
npm run sync:directory     # regenerate the offline snapshot

# stack
docker compose ps
docker compose logs -f backend
docker compose down -v     # reset, including the database
```