# Data still needed — TownPulse

**Default location:** none — the operator chooses an area for each deployment
**Languages:** English (complete) · Hindi (core strings) · Kannada (pending)

This file lists what an operator must collect and verify before configuring a
location. The repository deliberately ships no town-specific directory data.

Nothing in this list may be filled in with a guess. If you do not know a phone
number, leave it empty — the UI renders an explicit "not listed — call to
check" state rather than a plausible-looking wrong number.

---

## 1. Why this file exists

The previous `backend/seed/seed_data.json` shipped **invented** businesses:

| Invented name | Invented phone | Marked |
|---|---|---|
| "Town Primary Health Centre" | `+91-80-22221111` | `verified: true` |
| "Dr. Rao Dental Clinic" | `+91-9448098765` | `verified: true` |
| "Arogya Diagnostic & Blood Test Lab" | `+91-80-22334455` | `verified: true` |
| "Kaveri Medicals & Pharmacy" | `+91-9845012345` | `verified: true` |

Fabricated phone numbers for clinics and diagnostics, presented as *verified*,
is the worst thing this project could ship: someone dials a real person's
number looking for an ambulance and reaches a stranger. The legacy file and
bundled location extracts have been removed; any future location data must be
explicitly supplied for the deployment that uses it.

---

## 2. What we have right now

The repository ships **no location-specific records**. The offline snapshot
starts with `town: null`, no categories and no listings. The backend seeder
also adds no location data unless an operator provides
`backend/seed/osm_seed.json`; that local file is ignored by Git so one
deployment's town cannot silently become another deployment's default.

Import records for the chosen area and verify them before presenting them as
current or verified. OpenStreetMap records are not automatically verified:
the badge must remain "Not yet verified" until a person checks each listing.
---

## 3. Priority 1 — emergency numbers

The Emergency page cannot ship without these. In `frontend/src/config/site.ts`,
`phone` is deliberately `""` where we have no citable source, and the page
renders a "Number not yet collected" state rather than a guess.

| Service | Code | Number | Confirmed from |
|---|---|---|---|
| Police (national) | `police` | `100` | ✅ filled |
| Fire (national) | `fire` | `101` | ✅ filled |
| Women & child helpline | `women` | `1091` | ✅ filled |
| Child helpline | `child` | `1098` | ⚠️ verify |
| Emergency toll-free | `tollfree` | `112` | ⚠️ verify |
| **Ambulance** | `ambulance` | **empty** | ❌ **needed** |
| Local traffic police | — | **empty** | ❌ **needed for chosen area** |
| Local police station | — | **empty** | ❌ **needed for chosen area** |
| District police contact | — | **empty** | ❌ **needed for chosen area** |
| Nearest fire station | — | **empty** | ❌ **needed** |
| Nearest hospital / clinic | — | **empty** | ❌ **needed** |

**Where to get them:** the relevant local and district authorities for the
operator's chosen area. Do not reuse local contacts from another deployment.

> The single highest-value thing you can add to this repository.

---

## 4. Priority 2 — the verification pass

Verification is a claim, so it needs a process. For each listing:

- [ ] Visit, or call the listed number, and confirm the place exists
- [ ] Record the phone number if OSM lacks one
- [ ] Record opening hours if OSM lacks them
- [ ] Record the street address / nearest landmark
- [ ] Set `verified: true`, `verified_by`, `last_verified_at`
- [ ] Set `status: "verified"`

The `verified_by` and `last_verified_at` columns are what make the badge
meaningful — "Verified on 12 March" is a checkable claim; a green tick is not.

---

## 5. Priority 3 — seed the directory for your area

There is no town baked into the app; visitors choose their location at runtime.
To seed the live database, run the importer with coordinates for the chosen
area from the `backend/` directory:

```
python scripts/import_osm.py --lat <lat> --lng <lng> --radius 6000
```

For the frontend's offline snapshot, provide an OpenStreetMap JSON extract to
`build_seed_from_osm.py` and write the resulting seed to
`backend/seed/osm_seed.json`:

```
python scripts/build_seed_from_osm.py <osm-extract.json> --name "<Your town>" --region "<Region>" --out seed/osm_seed.json
```

Then run `npm run sync:directory` from `frontend/`. With no operator seed, that
command writes an empty snapshot rather than falling back to another area.
Review the builder's coverage report and verify important details before
deployment.

Set `VITE_SITE_URL` (frontend) and the backend `.env` to your real domain
before deploying.

---

## 6. Priority 4 — remaining assets

| Item | Status | Notes |
|---|---|---|
| Custom domain | ❌ needed | Set `VITE_SITE_URL`; currently a placeholder |
| Logo | ❌ needed | Wordmark only; see `AUDIT.md` §3.1 |
| Kannada translation | ❌ needed | `frontend/src/i18n/kn.json` does not exist yet; falls back to English |
| Full Hindi translation | ⚠️ partial | Core strings done (~90 of 258) |
| Open Graph images | ✅ done | `npm run generate:og` creates cards from the currently configured snapshot |
| Analytics | ❌ decision | Recommend a self-hosted, cookieless counter; no third-party trackers |

---

## 7. Attribution

All listing data is © OpenStreetMap contributors, licensed under the Open
Database Licence (ODbL). ODbL share-alike requires attribution to travel with
the data, so every generated record carries:

```json
"source": "openstreetmap",
"source_url": "https://www.openstreetmap.org/node/4550586390"
```

Keep both fields populated. Dropping them breaks the licence.