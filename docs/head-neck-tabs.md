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

## UI requirements (to build)
1. **Tab bar (areas)** in the setup modal: `מוח` (existing brain content) and
   `ראש צוואר` (the new 342). Selecting a tab shows that tab's topic groups.
2. **Add a tab manually** — create a new empty area tab.
3. **Import a word list → choose which tab** it lands in (drives the matcher, adds a
   topic group to that tab).
4. **Excluded display**: each tab shows its `excluded` terms **collapsed by default**;
   clicking reveals them with a friendly note explaining they were searched but aren't
   separate, clickable structures in this model (so they can't be quizzed here).
5. The `all / pick` mode toggle and the global "נקה הכל / בחר הכל" stay, scoped to the
   active tab.

## Integration notes
- `content.js` loads the data and passes groups to `CAQ.setup.openModal`. Multi-tab:
  load brain `src/structures.json` + head-neck `src/structures-headneck.json`, build
  `tabs=[{id,label,groups,excluded}]`, and let the modal switch between them.
- `CAQ.lists` (liststore) manages built-in + custom lists / additions; per-tab scoping
  is the main integration work for "add tab" / "import to tab".
- Quiz engine and spoiler logic are model-agnostic — no changes needed (same model).
