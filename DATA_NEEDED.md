# Data still needed — TownPulse

**Target town:** Hampi, Vijayanagara district, Karnataka, India
**Languages:** English (complete) · Hindi (core strings) · Kannada (pending)

This file lists exactly what has to be collected by a human before the
directory can honestly claim to be useful. It exists because the honest answer
to "how much of this data is real?" is: the *places* are real, the *details*
mostly are not.

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
number looking for an ambulance and reaches a stranger. That file has been
removed from the load path and replaced with real OpenStreetMap data.

---

## 2. What we have right now

`backend/seed/hampi_osm.json` — **170 real listings** within 4 km of
15.3350, 76.4600, pulled from OpenStreetMap.

| Field | Coverage | Source |
|---|---|---|
| Name + coordinates | 170 / 170 | OSM |
| Category | 170 / 170 | Derived from OSM tags |
| Phone | **11 / 170** | OSM |
| Opening hours | **4 / 170** | OSM |
| Street address | **13 / 170** | OSM |
| Verified | **0 / 170** | Nobody has checked any of them |

Category spread: civic 76, food 54, community 36, shelter 4.

### Two honest limitations

1. **No healthcare or mechanics at all.** The single most important category
   for this audience has zero entries in the current OSM extract. Hampi is a
   heritage-tourism town, so OSM coverage skews to hotels, restaurants and
   temples. If you are deploying for a different town, re-run the importer —
   see §5.
2. **Every listing is `unverified`.** The badge will say "Not yet verified" on
   all 170 until a person checks them. That is the correct state, not a bug.
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
| Hampi Traffic Police | — | **empty** | ❌ **needed** |
| Hampi Police Station | — | **empty** | ❌ **needed** |
| Kamalapura Police Station | — | **empty** | ❌ **needed** |
| Deputy SP, Hampi | — | **empty** | ❌ **needed** |
| Nearest fire station | — | **empty** | ❌ **needed** |
| Nearest hospital / clinic | — | **empty** | ❌ **needed** |

**Where to get them:** Vijayanagara district administration, Hampi police
station, or the Karnataka emergency services directory. The four police
stations above are real, mapped OSM records (`source_url` in the seed file) —
only their phone numbers are missing.

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

## 5. Priority 3 — retarget to your town

If Hampi is not the town you want:

1. Edit `frontend/src/config/site.ts` — `town.name`, `region`, `district`,
   `lat`, `lng`, `zoom`, `timezoneOffsetMinutes`.
2. Mirror it in the backend `.env`:
   ```
   TOWN_NAME=Hampi
   TOWN_REGION=Karnataka
   TOWN_DISTRICT=Vijayanagara
   TOWN_LAT=15.335
   TOWN_LNG=76.46
   TZ_OFFSET_MINUTES=330
   ```
3. Fetch fresh OpenStreetMap data:
   ```
   python scripts/import_osm.py --lat <lat> --lng <lng> --radius 6000
   python scripts/build_seed_from_osm.py seed/_osm_raw_<town>.json
   ```
   The builder prints a coverage report telling you how many listings still
   need a phone number, hours or address.
4. Set `VITE_SITE_URL` to your real domain before deploying.

For a town with better OSM coverage than Hampi (larger, or with an active
mapper community) you should see 30–60% phone coverage instead of 6%.

---

## 6. Priority 4 — remaining assets

| Item | Status | Notes |
|---|---|---|
| Custom domain | ❌ needed | Set `VITE_SITE_URL`; currently a placeholder |
| Logo | ❌ needed | Wordmark only; see `AUDIT.md` §3.1 |
| Kannada translation | ❌ needed | `frontend/src/i18n/kn.json` does not exist yet; falls back to English |
| Full Hindi translation | ⚠️ partial | Core strings done (~90 of 258) |
| Open Graph images | ❌ needed | `og:image` is still the P0 gap from `AUDIT.md` §5.1 |
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