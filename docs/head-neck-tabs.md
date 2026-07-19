# Head & Neck tabs — spec & status

## Goal
Turn the quiz from a single brain list into **areas as tabs**. Each tab is one study
area; under a tab are **topics** (dissections); each topic holds quizzable structures.
The user provides a word list (a `.doc`), we match each term to a structure in the
Complete Anatomy model, and it becomes a tab.

## Data (done — see `data/headneck/`)
- Source: `data/headneck/source.txt` (antiword of the user's Head-Neck term .doc).
- `data/headneck/items.json` — 463 parsed items `{d(issection), cat(egory), term}`.
- Matcher: `scripts/headneck-match.js` — runs in an authenticated completeanatomy.app
  tab, queries the Elsevier search API (XHR + Bearer/applicationid headers; the app
  wraps `fetch`), scores candidates by name+Latin+category (generic type-words
  optional; fuzzy prefix so scalene≈scalenus, abducent≈abducens, nerve≈nerves).
- `data/headneck/structures.json` — **final dataset**: same shape as the brain
  `src/structures.json`. **342 structures across 8 topic groups**, plus `excluded`
  (61 terms not present as discrete structures in this model, each with its closest
  candidate + score). Both brain and head-neck use the SAME model
  `964db2dd4f98052f03baa9ca5f2dbcae` (Head & Neck), so the quiz never switches models.

## UI (built — see modules below)
1. **Area tab strip** (`ui-areabar.js`) at the top of the setup modal: `מוח`,
   `ראש צוואר`, then any user areas, then a `＋ אזור` button. Selecting a tab re-opens
   the modal scoped to that area (`actions.switchArea` → `content.js` re-runs
   `openSetup`). The modal only ever renders one area at a time.
2. **Add an area manually** — `＋ אזור` prompts for a name → `CAQ.lists.addArea`. A
   user area starts empty; it can be renamed / removed (controls appear under the strip
   only for the active user area). Removing an area also drops its custom lists.
3. **Import a word list → the active area** (`ui-import.js` + `match.js`): the
   `⬆ ייבוא רשימה` footer link opens a dialog; paste terms (one per line), `match.js`
   resolves each to a cid live (same scoring as `scripts/headneck-match.js`, but using
   the content-script's clean `fetch` and the page's own localStorage token), and the
   matched ones are added to the active area as a new custom list (`actions.importList`
   → `CAQ.lists.create(label, areaId)` + `addItem`). Unmatched terms are listed so the
   user sees what was left out. Requires being logged in to CA (token in localStorage).
4. **Excluded display** (`ui-excluded.js`): each built-in area shows its `excluded`
   terms **collapsed by default** at the bottom of the body; the header toggles it open,
   revealing a friendly note that they were searched but aren't discrete clickable
   structures in this model (so they can't be quizzed here). Head-neck rows also show
   the closest candidate (`≈ …`).
5. The `all / pick` toggle, status-filter chips (`ui-filter.js`), and the global
   "נקה הכל / בחר הכל" all stay, scoped to the active area.

## Integration notes
- `content.js` loads brain `src/structures.json` + head-neck `src/structures-headneck.json`
  (both in `web_accessible_resources`), registers each as a built-in area with
  `CAQ.lists.registerArea(id, label, groups, excluded)`, tracks `activeAreaId`, and on
  `openSetup` passes that area's `{groups, hidden, excluded, areas, activeAreaId, areaLabel}`
  to `CAQ.setup.openModal`.
- `CAQ.lists` (`liststore.js`) is now **area-aware**: built-in areas + user `areas`,
  custom lists tagged with `areaId`, `targets(areaId)` / `hiddenBuiltins(areaId)` /
  `excludedOf(areaId)` scope per area, `allTargets()` spans all areas (used by the
  search-row add menu). Group ids are globally unique (`d1..`, `hn1..`, `usr_…`) so
  additions/labels/hidden stay keyed by group id.
- Quiz engine and spoiler logic are model-agnostic — unchanged (same model).
- File split (each < 150 lines, per repo convention): `ui-modal.js` shell,
  `ui-filter.js` (chips + subtitle), `ui-areabar.js`, `ui-excluded.js`, `ui-import.js`,
  `match.js`.

## Status
Code-complete and **verified live in Chrome** on the CA Head & Neck model (worktree
loaded as an unpacked extension). Confirmed working: the מוח / ראש צוואר area tabs and
switching; per-area groups + counts (brain 134/120, head-neck 342/313 unique) + the
collapsible excluded with its note; ＋אזור add / rename / remove of a custom area (empty
state + start-disabled); and import — pasted 7 ear terms, the live search API matched 5
(malleus→Malleus, incus, stapes, tympanic membrane, external acoustic meatus→Bony
External Acoustic Meatus) and correctly excluded 2 (cochlea≈Internal Ear,
endolymph≈Endolymphatic Duct); the imported Malleus then selected on the 3D model and was
quizzed with its name blurred. Also validated statically (JS syntax, JSON, a `liststore`
area-logic Node harness).

Note on testing: the released extension is loaded from the repo **root** (main); to test
this branch, load `.claude/worktrees/head-neck-tabs` as a second unpacked extension and
disable the root copy (avoids a double launcher). The import matcher needs the CA tab
authenticated (reads the OIDC token from the page's localStorage).
