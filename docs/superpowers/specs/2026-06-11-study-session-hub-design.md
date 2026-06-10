# Study Session Hub — Design Spec

**Date:** 2026-06-11  
**Status:** Approved  
**Approach:** B — Study Session Hub (balanced UX optimization)

---

## Problem Statement

The DSA Tracker is a rich static curriculum with a capable progress journal, but users face high friction following the study plan and practicing efficiently:

- All 18 pattern sections start collapsed — curriculum is invisible on first load
- No primary "what do I do next?" action
- Mobile users have no in-page navigation (TOC hidden below 1200px)
- The 📖 Patterns button opens a missing `patterns.html` (404)
- Phase `h1` labels and `id` attributes disagree with each other and with the learning-path diagram
- SRS "Again" label says "< 24 Hours" but schedules immediate review
- Practice features (list view, due reviews) are buried in small dashboard icons

## Goal

Make the app easy to **follow**, **practice**, and **read** — without adding a backend or restructuring the 5,000-line HTML file.

## Success Criteria

1. A new user sees one clear next action within 3 seconds of landing
2. A returning user can resume where they left off (last pattern expanded)
3. Mobile users can jump to any pattern without endless scrolling
4. Phase labels are internally consistent (visible text matches `id`, chips reflect learning-path phases)
5. Practice loop: Continue → LeetCode → return → check off → SRS is obvious

## Non-Goals (v1)

- Backend, accounts, or cloud sync
- Splitting `index.html` into modules
- In-app code editor
- Automated test suite
- Reordering HTML content to match the 8-phase diagram physically

---

## Architecture

### Files Modified

| File | Responsibility |
|------|----------------|
| `script.js` | Session hub, navigation helpers, pattern modal, curriculum ordering, SRS fix, smart expand, export nudge |
| `style.css` | Session card, mobile TOC drawer, timer, phase chips, collapsible intro |
| `index.html` | Phase `h1` label/`id` alignment (~7 headers) |

### New UI Surfaces

1. **Study Session Hub** — card below dashboard (full view only)
2. **Mobile TOC drawer** — hamburger button + slide-over nav
3. **Pattern Quick Reference modal** — replaces broken `patterns.html` link
4. **Phase progress chips** — injected on phase `h1` headers via JS

### Data Model Extensions (localStorage)

| Key | Type | Purpose |
|-----|------|---------|
| `dsa-tracker-progress` | existing | Problem state (unchanged) |
| `dsa-last-pattern` | string | Last active pattern h2 id (e.g. `3-sliding-window`) |
| `dsa-last-section` | string | Last scroll target (problem id or section id) |
| `dsa-visited` | `"1"` | First-visit flag for smart expand |
| `dsa-intro-collapsed` | `"1"` | Intro sections collapsed on return visits |
| `dsa-last-export` | number | Unix ms of last export (for backup nudge) |

### Curriculum Order

Problems are ordered by **pattern number 1→18**, then **Easy → Medium → Hard** within each pattern. Pattern number is parsed from the parent `h2` text (`/^\d+/`).

This matches the learning-path intent without reordering HTML DOM.

### Learning-Path Phase Map (for chips only)

```javascript
const LEARNING_PHASES = [
  { num: 1, label: 'Foundation', patterns: [1] },
  { num: 2, label: 'Pointer Techniques', patterns: [2, 3, 6] },
  { num: 3, label: 'Searching & Stack', patterns: [4, 5] },
  { num: 4, label: 'Trees & Recursion', patterns: [11, 12, 13] },
  { num: 5, label: 'Graphs & Exploration', patterns: [14, 15] },
  { num: 6, label: 'Optimization', patterns: [7, 8, 9, 10] },
  { num: 7, label: 'Dynamic Programming', patterns: [16, 17] },
  { num: 8, label: 'Interview Essentials', patterns: [18] },
];
```

Phase chips show `X/Y solved` where Y = total trackable problems in that phase's patterns.

---

## Feature Specifications

### F1: Study Session Hub

**Location:** Injected after `.dsa-tracker-dashboard` in `script.js`.

**Content:**
- Current pattern name + section progress (`4/12 solved`)
- Next problem title + difficulty badge
- Three buttons:
  - **Continue** — navigate to next problem (priority below)
  - **Reviews (N)** — only shown if N > 0; opens list view filtered to due
  - **Read Pattern** — expands current pattern, scrolls to its `h2`

**Next-problem priority:**
1. Oldest due SRS review (`nextReview <= now`, sort by `nextReview` asc)
2. First unsolved in curriculum order (pattern 1→18, Easy→Medium→Hard)
3. If all solved: message "All done! 🎉" + Reviews button defaults to Blind 75 filter

**Continue action:**
1. Expand target pattern section
2. Scroll problem into view with flash highlight
3. Open LeetCode link in new tab
4. Start study timer if not running
5. Show toast: "Come back and check off when you're done"
6. Persist `dsa-last-pattern` and problem id to `dsa-last-section`

### F2: Smart Default Expand

- **First visit** (`!localStorage.getItem('dsa-visited')`): expand Pattern 1 (`1-arrays-hashing`) only; set `dsa-visited`
- **Returning visit:** expand `dsa-last-pattern` if set, else Pattern 1
- All other pattern sections remain collapsed

### F3: Mobile TOC Drawer

- Hamburger button (`☰`) in dashboard controls, visible only `< 1200px`
- Slide-over panel from left with same links as desktop TOC
- Reuse `generateTOC()` link-building logic; share click handler (focus mode + scroll)
- Backdrop click closes drawer
- Body scroll locked while open

### F4: Pattern Quick Reference Modal

- Replace `patterns.html` onclick on 📖 button
- Modal lists patterns 1–18: number, name, one-line "when to use" (hardcoded map in JS)
- Click row → close modal, expand pattern, scroll to section

### F5: Phase Label Alignment (`index.html`)

Update `h1` headers so visible text and `id` are consistent:

| Current id | New id | Visible text |
|------------|--------|--------------|
| `phase-1-foundation` | unchanged | `PHASE 1: FOUNDATION 🏗️` |
| `phase-2-searching-basic-data-structures` | `phase-2-pointer-techniques` | `PHASE 2: POINTER TECHNIQUES 👉` |
| `phase-3-optimization-math` | `phase-3-linear-structures` | `PHASE 3: SEARCHING, STACK & LINKED LIST 🔍` |
| `phase-4-trees-recursion` | unchanged | `PHASE 4: TREES & RECURSION 🌳` |
| `phase-5-graph-mastery` | `phase-5-graphs-exploration` | `PHASE 5: GRAPHS & EXPLORATION 🌐` |
| `phase-6-advanced-algorithms` | `phase-6-optimization-patterns` | `PHASE 6: OPTIMIZATION PATTERNS ⚡` |
| `phase-7-interview-essentials` | `phase-7-dp-interview` | `PHASE 7: DP & INTERVIEW ESSENTIALS 🎯` |

Note: Physical HTML grouping stays as-is; phase chips use `LEARNING_PHASES` map for accurate progress by learning-path phase.

### F6: Practice Loop Improvements

- Dashboard due count (`🕒 N Due`) becomes clickable → list view, filter=due
- List view default sort for filter=todo: curriculum order (new sort mode `curriculum`)
- SRS "Again": `interval = 0`, `nextReview = now + 86400000` (1 day); label updated to `1 day`

### F7: Reading Improvements

- On return visits (`dsa-intro-collapsed`): wrap intro `h2` sections (`learning-progression-philosophy`, `how-to-use-this-guide`) in collapsible headers, default collapsed
- Phase chips injected on phase `h1` elements showing solved/total for that learning-path phase

### F8: Data Confidence

- On export: save `dsa-last-export = Date.now()`
- After 10th problem marked done (and no export in 7 days): toast with export CTA
- Settings dropdown shows "Last backup: X days ago" or "Never backed up"

### F9: Timer Styling

Add `.dsa-timer-display` rules: monospace font, subtle background, active state with green pulse when running.

---

## Error Handling

- If no problems found in DOM: hub shows "Loading curriculum..." then hides if still zero
- If `dsa-last-pattern` id missing from DOM: fall back to Pattern 1
- Import/export/reset behavior unchanged

## Testing (Manual)

1. Fresh localStorage: Pattern 1 expanded, hub shows first Easy problem
2. Click Continue: LeetCode opens, timer starts, toast appears
3. Check off problem: SRS modal, dashboard updates, hub shows next problem
4. Resize to mobile: hamburger visible, drawer navigates correctly
5. Click 📖: modal opens, row click jumps to pattern
6. Mark 10 problems: backup nudge toast appears
7. Rate SRS "Again": due in 1 day, not immediately
8. Click due count in dashboard: list view with due filter
