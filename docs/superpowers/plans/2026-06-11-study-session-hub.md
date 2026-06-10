# Study Session Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Study Session Hub and navigation/practice improvements so users always know what to do next, on desktop and mobile.

**Architecture:** Extend `script.js` with curriculum-ordered problem metadata, a session card below the dashboard, mobile TOC drawer, and pattern quick-reference modal. Align phase `h1` labels in `index.html`. Add styles in `style.css`. No new dependencies.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, GitHub Pages static hosting.

**Spec:** `docs/superpowers/specs/2026-06-11-study-session-hub-design.md`

---

## File Map

| File | Changes |
|------|---------|
| `script.js` | Curriculum metadata, session hub, mobile TOC, pattern modal, SRS fix, smart expand, phase chips, intro collapse, export nudge |
| `style.css` | Session hub, mobile drawer, timer, phase chips, intro collapse, clickable due count |
| `index.html` | 6 phase `h1` id/text updates |

---

### Task 1: Curriculum Metadata & SRS Fix

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add constants after `STORAGE_KEY`**

```javascript
const LAST_PATTERN_KEY = 'dsa-last-pattern';
const LAST_SECTION_KEY = 'dsa-last-section';
const VISITED_KEY = 'dsa-visited';
const INTRO_COLLAPSED_KEY = 'dsa-intro-collapsed';
const LAST_EXPORT_KEY = 'dsa-last-export';

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

const DIFF_WEIGHT = { Easy: 1, Medium: 2, Hard: 3, Unknown: 99 };

function getPatternNumberFromH2(h2) {
    if (!h2) return 99;
    const match = h2.textContent.trim().match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 99;
}

function getSectionH2ForLi(li) {
    const section = li.closest('.dsa-section-content');
    return section ? section.previousElementSibling : null;
}
```

- [ ] **Step 2: Enrich `problemListItems.push` call (~line 311)**

Replace:
```javascript
problemListItems.push({ li, id, link });
```
With:
```javascript
const sectionH2 = getSectionH2ForLi(li);
const patternNum = getPatternNumberFromH2(sectionH2);
const patternId = sectionH2 ? sectionH2.id : '';
problemListItems.push({
    li, id, link,
    patternNum,
    patternId,
    sectionH2,
    diff: detectedDiff,
});
```

- [ ] **Step 3: Sort `problemListItems` after the injection loop (after line 359)**

```javascript
problemListItems.sort((a, b) => {
    if (a.patternNum !== b.patternNum) return a.patternNum - b.patternNum;
    return (DIFF_WEIGHT[a.diff] || 99) - (DIFF_WEIGHT[b.diff] || 99);
});
```

- [ ] **Step 4: Fix SRS "Again" in `rateProblem` (~line 88)**

Replace:
```javascript
let interval = 0, nextReview = 1;
if (rating === 'hard') interval = 2;
if (rating === 'good') interval = 4;
if (rating === 'easy') interval = 7;
if (interval > 0) nextReview = now + (interval * 86400000);
```
With:
```javascript
let interval = 0;
if (rating === 'again') interval = 1;
if (rating === 'hard') interval = 2;
if (rating === 'good') interval = 4;
if (rating === 'easy') interval = 7;
const nextReview = now + (interval * 86400000);
```

- [ ] **Step 5: Update SRS modal label for Again (~line 49)**

Change `<span class="srs-interval">< 24 Hours</span>` to `<span class="srs-interval">1 day</span>`

- [ ] **Step 6: Update toast in `rateProblem`**

Change the toast branch to always show days:
```javascript
window.showToast(`Scheduled for ${interval} day${interval === 1 ? '' : 's'}`, '📅');
```

- [ ] **Step 7: Manual verify**

Open `index.html` in browser. Mark a problem done → rate "Again" → check localStorage `dsa-tracker-progress` entry has `nextReview` ~24h from now.

---

### Task 2: Phase h1 Alignment

**Files:**
- Modify: `index.html:907,2131,3478,4448,4802`

- [ ] **Step 1: Update phase h1 headers**

```html
<!-- line ~907 -->
<h1 id="phase-2-pointer-techniques">PHASE 2: POINTER TECHNIQUES 👉</h1>

<!-- line ~2131 -->
<h1 id="phase-3-linear-structures">PHASE 3: SEARCHING, STACK &amp; LINKED LIST 🔍</h1>

<!-- line ~3478 -->
<h1 id="phase-5-graphs-exploration">PHASE 5: GRAPHS &amp; EXPLORATION 🌐</h1>

<!-- line ~4448 -->
<h1 id="phase-6-optimization-patterns">PHASE 6: OPTIMIZATION PATTERNS ⚡</h1>

<!-- line ~4802 -->
<h1 id="phase-7-dp-interview">PHASE 7: DP &amp; INTERVIEW ESSENTIALS 🎯</h1>
```

- [ ] **Step 2: Manual verify**

Search page for old ids (`phase-3-optimization-math`, etc.) — none should remain.

---

### Task 3: Timer & Session Hub CSS

**Files:**
- Modify: `style.css` (append before end of file)

- [ ] **Step 1: Add timer styles**

```css
.dsa-timer-display {
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 0.85rem;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--bg-surface, rgba(0, 0, 0, 0.05));
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    user-select: none;
    min-width: 72px;
    text-align: center;
    transition: all 0.2s;
}
.dsa-timer-display.active {
    color: var(--color-primary);
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light, rgba(16, 185, 129, 0.15));
}
```

- [ ] **Step 2: Add session hub styles**

```css
.dsa-session-hub {
    position: sticky;
    top: 72px;
    z-index: 950;
    max-width: 900px;
    margin: 0 auto 16px;
    padding: 0 20px;
}
.dsa-session-card {
    background: var(--bg-surface, #fff);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}
.dsa-session-location {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 4px;
}
.dsa-session-next {
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 14px;
    color: var(--text-main);
}
.dsa-session-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.dsa-session-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-body);
    color: var(--text-main);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
}
.dsa-session-btn-primary {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}
.dsa-session-btn-primary:hover {
    filter: brightness(1.05);
}
.dsa-session-btn:hover {
    border-color: var(--color-primary);
}
.dsa-progress-text.dsa-due-clickable {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 3px;
}
body.view-mode-list .dsa-session-hub {
    display: none;
}
```

- [ ] **Step 3: Add mobile TOC drawer styles**

```css
.dsa-mobile-nav-btn {
    display: none;
}
.dsa-mobile-drawer-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1200;
}
.dsa-mobile-drawer-backdrop.active {
    display: block;
}
.dsa-mobile-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: var(--bg-body);
    z-index: 1300;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    overflow-y: auto;
    padding: 20px 16px;
    border-right: 1px solid var(--border-subtle);
}
.dsa-mobile-drawer.active {
    transform: translateX(0);
}
.dsa-mobile-drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-weight: 700;
}
@media (max-width: 1199px) {
    .dsa-mobile-nav-btn {
        display: inline-flex;
    }
}
```

- [ ] **Step 4: Add phase chip & intro collapse styles**

```css
.dsa-phase-chip {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--color-primary-light, rgba(16, 185, 129, 0.12));
    color: var(--color-primary);
    margin-left: 10px;
    vertical-align: middle;
}
.dsa-intro-header {
    cursor: pointer;
    user-select: none;
}
.dsa-intro-header .dsa-header-icon {
    float: right;
    transition: transform 0.2s;
}
.dsa-intro-header.dsa-collapsed .dsa-header-icon {
    transform: rotate(-90deg);
}
.dsa-pattern-ref-grid {
    display: grid;
    gap: 8px;
    max-height: 60vh;
    overflow-y: auto;
}
.dsa-pattern-ref-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    text-align: left;
    background: var(--bg-body);
    color: var(--text-main);
    width: 100%;
}
.dsa-pattern-ref-row:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light, rgba(16, 185, 129, 0.08));
}
```

---

### Task 4: Shared Navigation Helpers

**Files:**
- Modify: `script.js` (add after accordion build, ~line 443)

- [ ] **Step 1: Add `expandPatternSection` and `navigateToProblem`**

```javascript
function expandPatternSection(h2) {
    if (!h2) return;
    document.querySelectorAll('.dsa-section-header').forEach(header => {
        header.classList.add('dsa-collapsed');
        const content = header.nextElementSibling;
        if (content?.classList.contains('dsa-section-content')) content.style.display = 'none';
    });
    h2.classList.remove('dsa-collapsed');
    const wrapper = h2.nextElementSibling;
    if (wrapper?.classList.contains('dsa-section-content')) wrapper.style.display = 'block';
    localStorage.setItem(LAST_PATTERN_KEY, h2.id);
}

function navigateToProblem(item, options = {}) {
    const { openLink = false, startTimer = false } = options;
    if (!item) return;
    expandPatternSection(item.sectionH2);
    localStorage.setItem(LAST_SECTION_KEY, item.id);
    setTimeout(() => {
        item.li.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.li.classList.remove('dsa-flash-highlight');
        void item.li.offsetWidth;
        item.li.classList.add('dsa-flash-highlight');
        if (openLink) {
            window.open(item.link.href, '_blank');
            if (startTimer && !isTimerRunning) toggleTimer();
            window.showToast('Come back and check off when you\'re done', '↩️');
        }
    }, 80);
}

window.navigateToProblem = navigateToProblem;
```

- [ ] **Step 2: Refactor random button to use `navigateToProblem`**

Replace the random button's expand/scroll block (~lines 702-717) with:
```javascript
navigateToProblem(randomItem);
window.showToast(`Random Pick: ${randomItem.link.textContent}`, '🎲');
```

---

### Task 5: Study Session Hub

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add `getNextProblem` helper**

```javascript
function getNextProblem() {
    const now = Date.now();
    const due = problemListItems
        .filter(item => {
            const s = getState(item.id);
            return s.done && s.nextReview && s.nextReview <= now;
        })
        .sort((a, b) => (getState(a.id).nextReview || 0) - (getState(b.id).nextReview || 0));
    if (due.length > 0) return { item: due[0], type: 'review' };

    const todo = problemListItems.find(item => !getState(item.id).done);
    if (todo) return { item: todo, type: 'next' };

    return { item: null, type: 'complete' };
}
```

- [ ] **Step 2: Inject session hub after dashboard prepend (~line 177)**

```javascript
const sessionHub = document.createElement('div');
sessionHub.className = 'dsa-session-hub';
sessionHub.innerHTML = `
    <div class="dsa-session-card">
        <div class="dsa-session-location" id="dsa-session-location">Loading...</div>
        <div class="dsa-session-next" id="dsa-session-next"></div>
        <div class="dsa-session-actions">
            <button class="dsa-session-btn dsa-session-btn-primary" id="dsa-continue-btn">▶ Continue</button>
            <button class="dsa-session-btn" id="dsa-reviews-btn" style="display:none">🕒 Reviews</button>
            <button class="dsa-session-btn" id="dsa-read-btn">📖 Read Pattern</button>
        </div>
    </div>
`;
dashboard.insertAdjacentElement('afterend', sessionHub);
```

- [ ] **Step 3: Add `updateSessionHub` function**

```javascript
function updateSessionHub() {
    const loc = document.getElementById('dsa-session-location');
    const next = document.getElementById('dsa-session-next');
    const reviewsBtn = document.getElementById('dsa-reviews-btn');
    if (!loc || !next) return;

    const now = Date.now();
    const dueCount = Object.values(state).filter(s => s.done && s.nextReview && s.nextReview <= now).length;
    const { item, type } = getNextProblem();

    if (type === 'complete') {
        loc.textContent = '🎉 All problems solved!';
        next.textContent = 'Review Blind 75 or revisit hard problems';
        reviewsBtn.style.display = dueCount > 0 ? 'inline-block' : 'none';
        reviewsBtn.textContent = dueCount > 0 ? `🕒 Reviews (${dueCount})` : '🕒 Reviews';
        return;
    }

    const patternTitle = item.sectionH2?.querySelector('.dsa-section-title')?.textContent
        || item.sectionH2?.textContent?.trim()
        || `Pattern ${item.patternNum}`;
    const sectionCheckboxes = item.sectionH2?.nextElementSibling?.querySelectorAll('.dsa-checkbox') || [];
    const sectionDone = Array.from(sectionCheckboxes).filter(cb => cb.checked).length;

    loc.textContent = type === 'review'
        ? `🕒 Review due • ${patternTitle} • ${sectionDone}/${sectionCheckboxes.length} in pattern`
        : `📍 ${patternTitle} • ${sectionDone}/${sectionCheckboxes.length} solved`;
    next.textContent = `${item.link.textContent.trim()} (${item.diff})`;

    reviewsBtn.style.display = dueCount > 0 ? 'inline-block' : 'none';
    reviewsBtn.textContent = `🕒 Reviews (${dueCount})`;
}

document.getElementById('dsa-continue-btn').addEventListener('click', () => {
    const { item } = getNextProblem();
    if (!item) {
        currentFilter = 'blind75';
        toggleView(true);
        return;
    }
    navigateToProblem(item, { openLink: true, startTimer: true });
});

document.getElementById('dsa-reviews-btn').addEventListener('click', () => {
    currentFilter = 'due';
    currentSort = 'curriculum';
    toggleView(true);
});

document.getElementById('dsa-read-btn').addEventListener('click', () => {
    const { item } = getNextProblem();
    const target = item || problemListItems[0];
    if (target?.sectionH2) {
        expandPatternSection(target.sectionH2);
        target.sectionH2.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
```

- [ ] **Step 4: Call `updateSessionHub()` from `updateDashboard`**

At end of `updateDashboard()` add: `updateSessionHub();`

Also call `updateSessionHub()` once after initial `updateDashboard()` at bottom of file.

- [ ] **Step 5: Manual verify**

Fresh page load → hub shows Pattern 1 first Easy problem. Continue opens LeetCode.

---

### Task 6: Smart Default Expand & Collapsible Intro

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Replace accordion default collapse (~lines 439-441)**

Replace unconditional collapse with:
```javascript
const isFirstVisit = !localStorage.getItem(VISITED_KEY);
const lastPatternId = localStorage.getItem(LAST_PATTERN_KEY);
const defaultExpandId = isFirstVisit ? '1-arrays-hashing' : (lastPatternId || '1-arrays-hashing');

if (h2.id === defaultExpandId) {
    h2.classList.remove('dsa-collapsed');
    wrapper.style.display = 'block';
} else {
    h2.classList.add('dsa-collapsed');
    wrapper.style.display = 'none';
}
```

After accordion loop completes, add:
```javascript
if (!localStorage.getItem(VISITED_KEY)) localStorage.setItem(VISITED_KEY, '1');
```

- [ ] **Step 2: Collapsible intro sections (after accordion build)**

```javascript
['learning-progression-philosophy', 'how-to-use-this-guide'].forEach(id => {
    const h2 = document.getElementById(id);
    if (!h2) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'dsa-intro-content';
    let next = h2.nextSibling;
    const toMove = [];
    while (next && next.tagName !== 'H2' && next.tagName !== 'H1' && next.tagName !== 'HR') {
        toMove.push(next);
        next = next.nextSibling;
    }
    if (toMove.length === 0) return;
    h2.parentNode.insertBefore(wrapper, h2.nextSibling);
    toMove.forEach(el => wrapper.appendChild(el));

    const icon = document.createElement('span');
    icon.className = 'dsa-header-icon';
    icon.textContent = '▼';
    h2.classList.add('dsa-intro-header');
    h2.appendChild(icon);

    const shouldCollapse = !!localStorage.getItem(INTRO_COLLAPSED_KEY);
    if (shouldCollapse) {
        h2.classList.add('dsa-collapsed');
        wrapper.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    }

    h2.addEventListener('click', () => {
        h2.classList.toggle('dsa-collapsed');
        wrapper.style.display = h2.classList.contains('dsa-collapsed') ? 'none' : 'block';
        icon.style.transform = h2.classList.contains('dsa-collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
        localStorage.setItem(INTRO_COLLAPSED_KEY, h2.classList.contains('dsa-collapsed') ? '1' : '');
    });
});
if (localStorage.getItem(VISITED_KEY)) localStorage.setItem(INTRO_COLLAPSED_KEY, '1');
```

- [ ] **Step 3: Manual verify**

Clear localStorage → Pattern 1 expanded, intro open. Reload with state → intro collapsed, last pattern expanded.

---

### Task 7: Mobile TOC Drawer

**Files:**
- Modify: `script.js`, `style.css` (already done in Task 3)

- [ ] **Step 1: Add hamburger button to dashboard HTML (~line 160)**

Inside `.dsa-controls`, before theme button:
```html
<button id="dsa-mobile-nav-btn" class="dsa-btn dsa-mobile-nav-btn" title="Navigation">☰</button>
```

- [ ] **Step 2: Create drawer elements after `generateTOC`**

```javascript
const drawerBackdrop = document.createElement('div');
drawerBackdrop.className = 'dsa-mobile-drawer-backdrop';
const mobileDrawer = document.createElement('div');
mobileDrawer.className = 'dsa-mobile-drawer';
mobileDrawer.innerHTML = `
    <div class="dsa-mobile-drawer-header">
        <span>Patterns</span>
        <button class="dsa-btn" id="dsa-drawer-close">✕</button>
    </div>
    <nav class="dsa-toc-nav" id="dsa-mobile-toc"></nav>
`;
document.body.append(drawerBackdrop, mobileDrawer);

function closeDrawer() {
    drawerBackdrop.classList.remove('active');
    mobileDrawer.classList.remove('active');
    document.body.style.overflow = '';
}
function openDrawer() {
    const mobileToc = document.getElementById('dsa-mobile-toc');
    mobileToc.innerHTML = tocContainer.querySelector('.dsa-toc-nav')?.innerHTML || '';
    mobileToc.querySelectorAll('.dsa-toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            const targetHeader = document.getElementById(targetId);
            if (targetHeader?.classList.contains('dsa-section-header')) {
                expandPatternSection(targetHeader);
            }
            setTimeout(() => {
                targetHeader?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
            closeDrawer();
        });
    });
    drawerBackdrop.classList.add('active');
    mobileDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

document.getElementById('dsa-mobile-nav-btn')?.addEventListener('click', openDrawer);
document.getElementById('dsa-drawer-close')?.addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
```

- [ ] **Step 3: Manual verify**

Resize browser < 1200px → hamburger visible → drawer opens and navigates.

---

### Task 8: Pattern Quick Reference Modal

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add pattern summaries map and modal HTML in modal backdrop (~line 44)**

Add third modal inside `modalBackdrop.innerHTML`:
```html
<div id="dsa-pattern-modal" class="dsa-modal" style="display:none;">
    <div class="dsa-modal-header">📖 Pattern Quick Reference</div>
    <div class="dsa-pattern-ref-grid" id="dsa-pattern-ref-list"></div>
    <button class="dsa-btn" onclick="window.closeModal()" style="margin-top:12px">Close</button>
</div>
```

- [ ] **Step 2: Add `PATTERN_SUMMARIES` constant and `openPatternRef`**

```javascript
const PATTERN_SUMMARIES = {
    1: 'Hash maps for O(1) lookup; arrays for sequential access',
    2: 'Two indices moving toward each other or at different speeds',
    3: 'Expand/shrink a window to satisfy a constraint',
    4: 'Halve search space on sorted data',
    5: 'LIFO stack; monotonic stack for next-greater/smaller',
    6: 'Pointer rewiring; fast/slow pointers for cycles',
    7: 'Local optimal choice hoping for global optimum',
    8: 'Sort intervals then merge or schedule',
    9: 'XOR, bit masks, and shift tricks',
    10: 'Math formulas, geometry, prime tricks',
    11: 'Top-K with min/max heap',
    12: 'Recursive traversals; DFS/BFS on trees',
    13: 'Prefix tree for string prefix queries',
    14: 'Explore all paths; prune invalid branches',
    15: 'BFS/DFS on adjacency list or matrix',
    16: 'Optimal substructure + overlapping subproblems',
    17: 'Split, recurse, merge (merge sort, quick sort)',
    18: 'OOP design combining multiple patterns',
};

window.openPatternRef = () => {
    const list = document.getElementById('dsa-pattern-ref-list');
    list.innerHTML = '';
    document.querySelectorAll('.dsa-section-header').forEach(h2 => {
        const num = getPatternNumberFromH2(h2);
        if (num > 18) return;
        const title = h2.querySelector('.dsa-section-title')?.textContent || h2.textContent.trim();
        const row = document.createElement('button');
        row.className = 'dsa-pattern-ref-row';
        row.innerHTML = `<span><strong>${num}.</strong> ${title.replace(/^\d+\.\s*/, '')}</span><span>→</span>`;
        row.onclick = () => {
            window.closeModal();
            setTimeout(() => {
                expandPatternSection(h2);
                h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 250);
        };
        list.appendChild(row);
    });
    document.getElementById('dsa-srs-modal').style.display = 'none';
    document.getElementById('dsa-notes-modal').style.display = 'none';
    document.getElementById('dsa-pattern-modal').style.display = 'block';
    requestAnimationFrame(() => modalBackdrop.classList.add('active'));
};
```

- [ ] **Step 3: Update `closeModal` to hide pattern modal**

Add `document.getElementById('dsa-pattern-modal').style.display = 'none';` in closeModal.

- [ ] **Step 4: Replace patterns button onclick (~line 164)**

Change:
```html
<button id="dsa-patterns-btn" class="dsa-btn" title="Pattern Reference" onclick="window.openPatternRef()">📖</button>
```

Remove `patterns.html` reference and `isPatternsPage` branch (~lines 566-571) — delete the `isPatternsPage` conditional entirely; keep only `savedMode === 'list'` check.

- [ ] **Step 5: Manual verify**

Click 📖 → modal lists 18 patterns → click row → scrolls to pattern.

---

### Task 9: Practice Loop — Clickable Due & Curriculum Sort

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Make due count clickable in `updateDashboard`**

After setting `progressText.textContent`, add:
```javascript
if (due > 0) {
    progressText.classList.add('dsa-due-clickable');
    progressText.title = 'Click to view due reviews';
    progressText.onclick = () => {
        currentFilter = 'due';
        currentSort = 'curriculum';
        toggleView(true);
    };
} else {
    progressText.classList.remove('dsa-due-clickable');
    progressText.title = '';
    progressText.onclick = null;
}
```

- [ ] **Step 2: Add curriculum sort to `renderGlobalList`**

In sort block (~line 509), add before random sort:
```javascript
if (currentSort === 'curriculum') {
    items.sort((a, b) => {
        if (a.patternNum !== b.patternNum) return a.patternNum - b.patternNum;
        return (DIFF_WEIGHT[a.diff] || 99) - (DIFF_WEIGHT[b.diff] || 99);
    });
} else if (currentSort === 'random') ...
```

Update sort label cycle to include curriculum, or set `currentSort = 'curriculum'` when opening reviews from hub (already in Task 5).

- [ ] **Step 3: Manual verify**

Mark problems due → click dashboard due text → list shows due items in curriculum order.

---

### Task 10: Phase Progress Chips

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add `injectPhaseChips` after problem injection**

```javascript
function injectPhaseChips() {
    LEARNING_PHASES.forEach(phase => {
        const phaseProblems = problemListItems.filter(p => phase.patterns.includes(p.patternNum));
        if (phaseProblems.length === 0) return;
        const solved = phaseProblems.filter(p => getState(p.id).done).length;
        const total = phaseProblems.length;

        const firstPattern = phase.patterns[0];
        const h2 = document.querySelector(`.dsa-section-header[id="${firstPattern}-"], h2[id^="${firstPattern}-"]`)
            || [...document.querySelectorAll('.dsa-section-header')].find(el => getPatternNumberFromH2(el) === firstPattern);
        const phaseH1 = h2 ? findPreviousPhaseH1(h2) : null;
        if (!phaseH1) return;

        if (phaseH1.querySelector('.dsa-phase-chip')) return;
        const chip = document.createElement('span');
        chip.className = 'dsa-phase-chip';
        chip.textContent = `${solved}/${total} solved`;
        phaseH1.appendChild(chip);
    });
}

function findPreviousPhaseH1(el) {
    let prev = el.previousElementSibling;
    while (prev) {
        if (prev.tagName === 'H1' && prev.id.startsWith('phase-')) return prev;
        prev = prev.previousElementSibling;
    }
    return null;
}

injectPhaseChips();
```

Note: `findPreviousPhaseH1` walks backward from first pattern h2 in phase to nearest `h1[id^="phase-"]`. Because HTML grouping doesn't match LEARNING_PHASES exactly, chips attach to nearest preceding phase h1 as approximation. Alternative: map phase num → h1 id directly:

```javascript
const PHASE_H1_MAP = {
    1: 'phase-1-foundation',
    2: 'phase-2-pointer-techniques',
    3: 'phase-3-linear-structures',
    4: 'phase-4-trees-recursion',
    5: 'phase-5-graphs-exploration',
    6: 'phase-6-optimization-patterns',
    7: 'phase-7-dp-interview',
    8: 'phase-7-dp-interview',
};
```

Use `PHASE_H1_MAP[phase.num]` for reliable injection.

- [ ] **Step 2: Re-run chips on checkbox change**

In checkbox change handler and `updateDashboard`, call a lightweight `updatePhaseChips()` that only updates `.dsa-phase-chip` textContent.

- [ ] **Step 3: Manual verify**

Phase h1 headers show `X/Y solved` chips that update on checkoff.

---

### Task 11: Export Nudge & Backup Status

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Track export timestamp in `handleSettings` export branch**

```javascript
localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
```

- [ ] **Step 2: Add backup status to settings dropdown**

After dashboard injection, update settings select options via JS:
```javascript
function updateBackupLabel() {
    const last = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10);
    const exportOpt = document.querySelector('select[onchange="window.handleSettings(this.value)"] option[value="export"]');
    if (!exportOpt) return;
    if (!last) {
        exportOpt.textContent = 'Export Data (never backed up)';
        return;
    }
    const days = Math.floor((Date.now() - last) / 86400000);
    exportOpt.textContent = days === 0 ? 'Export Data (backed up today)' : `Export Data (${days}d ago)`;
}
updateBackupLabel();
```

- [ ] **Step 3: Nudge after 10 solves**

In checkbox change when `checked`, after save:
```javascript
const solvedCount = Object.values(state).filter(s => s.done).length;
const lastExport = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10);
const daysSinceExport = lastExport ? (Date.now() - lastExport) / 86400000 : Infinity;
if (solvedCount === 10 && daysSinceExport > 7) {
    window.showToast('You\'ve solved 10! Export to back up progress', '💾');
}
```

- [ ] **Step 4: Manual verify**

Solve 10 problems without export → nudge toast. Export → settings shows "backed up today".

---

### Task 12: Final Integration & Manual QA

- [ ] **Step 1: Bump cache-bust query strings**

In `index.html` head, update `style.css?v=dracula2` and `script.js?v=dracula2` to `?v=session-hub1`.

- [ ] **Step 2: Full manual QA checklist**

| # | Test | Expected |
|---|------|----------|
| 1 | Fresh localStorage load | Pattern 1 expanded, hub shows first problem |
| 2 | Continue button | LeetCode opens, timer starts, toast shown |
| 3 | Check off problem | SRS modal, hub updates to next |
| 4 | SRS Again | Due in 1 day |
| 5 | Due count click | List view, due filter |
| 6 | Mobile hamburger | Drawer navigates, closes on backdrop |
| 7 | 📖 button | Pattern modal, row navigates |
| 8 | Return visit | Intro collapsed, last pattern expanded |
| 9 | Phase chips | Show correct solved/total |
| 10 | All solved | Hub shows celebration message |

- [ ] **Step 3: Fix any issues found in QA**

---

## Plan Self-Review

| Spec requirement | Task |
|------------------|------|
| F1 Session Hub | Task 5 |
| F2 Smart expand | Task 6 |
| F3 Mobile TOC | Task 7 |
| F4 Pattern modal | Task 8 |
| F5 Phase labels | Task 2 |
| F6 Practice loop | Task 9 |
| F7 Reading (intro, chips) | Task 6, 10 |
| F8 Data confidence | Task 11 |
| F9 Timer CSS | Task 3 |
| SRS fix | Task 1 |

No placeholders. All file paths specified.
