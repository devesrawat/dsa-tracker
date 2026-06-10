/**
 * DSA Patterns Tracker script
 * Author: Devesh Rawat <devsrawt@gmail.com>
 */
document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = 'dsa-tracker-progress';
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

    const DIFF_WEIGHT = { Easy: 1, Medium: 2, Hard: 3, Unknown: 99 };

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

    let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    let totalProblems = 0;

    function getPatternNumberFromH2(h2) {
        if (!h2) return 99;
        const titleEl = h2.querySelector('.dsa-section-title');
        const text = titleEl ? titleEl.textContent.trim() : h2.textContent.trim();
        const match = text.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 99;
    }

    function getSectionH2ForLi(li) {
        const section = li.closest('.dsa-section-content');
        if (section) return section.previousElementSibling;
        let node = li.closest('ul, ol');
        if (!node) return null;
        let cursor = node;
        while (cursor) {
            let prev = cursor.previousElementSibling;
            while (prev) {
                if (prev.tagName === 'H2' && /^\d+\./.test(prev.textContent.trim())) return prev;
                prev = prev.previousElementSibling;
            }
            cursor = cursor.parentElement;
            if (!cursor || cursor.classList?.contains('crossnote')) break;
        }
        return null;
    }

    // --- 0. State Migration & Helpers ---
    Object.keys(state).forEach(key => {
        if (typeof state[key] === 'boolean') state[key] = { done: state[key] };
    });

    function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    function getState(id) { return state[id] || { done: false }; }

    // Theme Logic
    const THEME_KEY = 'dsa-theme';
    const body = document.body;
    const currentTheme = localStorage.getItem(THEME_KEY);

    if (currentTheme === 'dark') body.classList.add('dark-mode');

    // --- 1. UX Components (Toasts, Modals) ---
    const toastContainer = document.createElement('div');
    toastContainer.className = 'dsa-toast-container';
    document.body.appendChild(toastContainer);

    window.showToast = (msg, icon = '✅') => {
        const toast = document.createElement('div');
        toast.className = 'dsa-toast';
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px) scale(0.9)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'dsa-modal-backdrop';
    modalBackdrop.innerHTML = `
        <div id="dsa-srs-modal" class="dsa-modal" style="display:none;">
            <div class="dsa-modal-header">🧠 How was it?</div>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Rate the difficulty to schedule your next review.</p>
            <div class="dsa-srs-grid">
                <button class="dsa-srs-btn srs-again" onclick="window.rateProblem('again')"><span>Again</span><span class="srs-interval">1 day</span></button>
                <button class="dsa-srs-btn srs-hard" onclick="window.rateProblem('hard')"><span>Hard</span><span class="srs-interval">2 days</span></button>
                <button class="dsa-srs-btn srs-good" onclick="window.rateProblem('good')"><span>Good</span><span class="srs-interval">4 days</span></button>
                <button class="dsa-srs-btn srs-easy" onclick="window.rateProblem('easy')"><span>Easy</span><span class="srs-interval">7 days</span></button>
            </div>
        </div>
        <div id="dsa-notes-modal" class="dsa-modal" style="display:none;">
            <div class="dsa-modal-header">📝 Problem Notes</div>
            <textarea id="dsa-note-input" class="dsa-note-editor" placeholder="Write your intuition..."></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="dsa-btn" onclick="window.closeModal()">Cancel</button>
                <button class="dsa-btn" style="background: var(--accent-green); color: white;" onclick="window.saveCurrentNote()">Save Note</button>
            </div>
        </div>
        <div id="dsa-pattern-modal" class="dsa-modal dsa-pattern-atlas-modal" style="display:none;">
            <div class="dsa-modal-header">🗺️ Pattern Atlas</div>
            <p class="dsa-pattern-atlas-sub">Spot the pattern before you code — then practice.</p>
            <div class="dsa-pattern-atlas-stats" id="dsa-pattern-atlas-stats"></div>
            <div class="dsa-pattern-atlas-toolbar">
                <input type="search" id="dsa-pattern-search" class="dsa-pattern-search" placeholder="Search patterns or signal words…" autocomplete="off">
                <div class="dsa-pattern-atlas-filters" id="dsa-pattern-atlas-filters">
                    <button type="button" class="dsa-pattern-filter active" data-filter="all">All</button>
                    <button type="button" class="dsa-pattern-filter" data-filter="next">Next up</button>
                    <button type="button" class="dsa-pattern-filter" data-filter="active">In progress</button>
                    <button type="button" class="dsa-pattern-filter" data-filter="todo">Not started</button>
                    <button type="button" class="dsa-pattern-filter" data-filter="done">Complete</button>
                </div>
            </div>
            <div class="dsa-pattern-ref-grid" id="dsa-pattern-ref-list"></div>
            <button class="dsa-btn" onclick="window.closeModal()" style="margin-top:12px;width:100%">Close</button>
        </div>
    `;
    document.body.appendChild(modalBackdrop);

    let activeProblemId = null;
    window.closeModal = () => {
        modalBackdrop.classList.remove('active');
        setTimeout(() => {
            document.getElementById('dsa-srs-modal').style.display = 'none';
            document.getElementById('dsa-notes-modal').style.display = 'none';
            document.getElementById('dsa-pattern-modal').style.display = 'none';
            activeProblemId = null;
        }, 200);
    };
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) window.closeModal(); });

    window.openSRS = (id) => {
        activeProblemId = id;
        document.getElementById('dsa-notes-modal').style.display = 'none';
        document.getElementById('dsa-srs-modal').style.display = 'block';
        requestAnimationFrame(() => modalBackdrop.classList.add('active'));
    };

    window.rateProblem = (rating) => {
        if (!activeProblemId) return;
        const now = Date.now();
        const s = state[activeProblemId] || { done: true };
        let interval = 0;
        if (rating === 'again') interval = 1;
        if (rating === 'hard') interval = 2;
        if (rating === 'good') interval = 4;
        if (rating === 'easy') interval = 7;
        const nextReview = now + (interval * 86400000);

        state[activeProblemId] = { ...s, done: true, lastReview: now, nextReview, interval };
        saveState();
        window.closeModal();
        updateDashboard();
        window.showToast(`Scheduled for ${interval} day${interval === 1 ? '' : 's'}`, '📅');
    };

    window.openNotes = (id) => {
        activeProblemId = id;
        const s = getState(id);
        document.getElementById('dsa-note-input').value = s.notes || '';
        document.getElementById('dsa-srs-modal').style.display = 'none';
        document.getElementById('dsa-notes-modal').style.display = 'block';
        requestAnimationFrame(() => modalBackdrop.classList.add('active'));
    };

    window.saveCurrentNote = () => {
        if (!activeProblemId) return;
        const text = document.getElementById('dsa-note-input').value;
        state[activeProblemId] = { ...getState(activeProblemId), notes: text };
        saveState();
        window.closeModal();
        window.showToast('Note saved!', '💾');
        document.querySelectorAll(`[data-problem-id="${activeProblemId}"] .dsa-note-trigger`).forEach(el => {
            el.classList.toggle('has-notes', !!text.trim());
        });
    };

    // --- 2. Dashboard & Timer ---
    let timerInterval, seconds = 0, isTimerRunning = false;
    const formatTime = (s) => new Date(s * 1000).toISOString().substr(11, 8);
    const toggleTimer = () => {
        const display = document.getElementById('dsa-timer-display');
        if (isTimerRunning) {
            clearInterval(timerInterval); isTimerRunning = false;
            display.classList.remove('active'); window.showToast('Timer Paused', '⏸️');
        } else {
            timerInterval = setInterval(() => { display.textContent = formatTime(++seconds); }, 1000);
            isTimerRunning = true; display.classList.add('active'); window.showToast('Timer Started', '⏱️');
        }
    };
    const resetTimer = () => {
        if (isTimerRunning) {
            clearInterval(timerInterval); isTimerRunning = false;
        }
        seconds = 0;
        const display = document.getElementById('dsa-timer-display');
        display.textContent = formatTime(0);
        display.classList.remove('active');
        window.showToast('Timer Reset', '🔄');
    };

    // Inject Dashboard
    const dashboard = document.createElement('div');
    dashboard.className = 'dsa-tracker-dashboard';
    dashboard.innerHTML = `
        <div class="dsa-dashboard-content">
            <div class="dsa-brand" aria-hidden="true">
                <span class="dsa-brand-mark">◆</span>
                <span class="dsa-brand-name">DSA Tracker</span>
            </div>
            <div class="dsa-progress-container">
                <span id="dsa-progress-text">Loading...</span>
                <div class="dsa-progress-bar"><div class="dsa-progress-fill" id="dsa-progress-fill"></div></div>
            </div>
            <div class="dsa-dashboard-right">
                 <div style="display:flex; align-items:center; gap:5px;">
                    <div id="dsa-timer-display" class="dsa-timer-display" title="Click to Start/Pause">00:00:00</div>
                    <button id="dsa-timer-reset" class="dsa-btn" title="Reset Timer" style="padding: 4px 8px;">🔄</button>
                 </div>
                 <div class="dsa-controls">
                    <button id="dsa-mobile-nav-btn" class="dsa-btn dsa-mobile-nav-btn" title="Navigation">☰</button>
                    <button id="dsa-theme-btn" class="dsa-btn" title="Toggle Theme">🌓</button>
                    <button id="dsa-list-btn" class="dsa-btn" title="View List">📋</button>
                    <button id="dsa-random-btn" class="dsa-btn" title="Random Problem">🎲</button>
                    <button id="dsa-patterns-btn" class="dsa-btn" title="Pattern Atlas" onclick="window.openPatternRef()">🗺️</button>
                    <div class="dsa-select-wrapper" style="margin:0;">
                        <select class="dsa-btn" onchange="window.handleSettings(this.value)" style="width: auto;">
                            <option value="" disabled selected>⚙️</option>
                            <option value="export">Export Data</option>
                            <option value="import">Import Data</option>
                            <option value="reset">Reset All</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.prepend(dashboard);

    const sessionHub = document.createElement('div');
    sessionHub.className = 'dsa-session-hub';
    sessionHub.innerHTML = `
        <div class="dsa-session-card">
            <div class="dsa-session-glow" aria-hidden="true"></div>
            <div class="dsa-session-inner">
                <div class="dsa-session-eyebrow">Your next step</div>
                <div class="dsa-session-location" id="dsa-session-location">Loading...</div>
                <div class="dsa-session-next" id="dsa-session-next"></div>
                <div class="dsa-session-actions">
                    <button class="dsa-session-btn dsa-session-btn-primary" id="dsa-continue-btn">
                        <span class="dsa-btn-icon">▶</span> Continue
                    </button>
                    <button class="dsa-session-btn" id="dsa-reviews-btn" style="display:none">🕒 Reviews</button>
                    <button class="dsa-session-btn" id="dsa-read-btn">📚 Open Guide</button>
                </div>
            </div>
        </div>
    `;
    dashboard.insertAdjacentElement('afterend', sessionHub);

    document.getElementById('dsa-timer-display').addEventListener('click', toggleTimer);
    document.getElementById('dsa-timer-reset').addEventListener('click', resetTimer);
    document.getElementById('dsa-theme-btn').addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem(THEME_KEY, body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    window.handleSettings = (action) => {
        if (action === 'export') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
            const a = document.createElement('a');
            a.href = dataStr; a.download = "dsa_tracker.json"; a.click();
            localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
            updateBackupLabel();
            window.showToast('Data Exported!', '📥');
        } else if (action === 'import') {
            const input = document.createElement('input'); input.type = 'file';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = ev => {
                    try { state = JSON.parse(ev.target.result); saveState(); location.reload(); }
                    catch (err) { alert('Invalid JSON'); }
                };
                reader.readAsText(e.target.files[0]);
            };
            input.click();
        } else if (action === 'reset') {
            if (confirm('Reset all progress?')) { state = {}; saveState(); location.reload(); }
        }
        document.querySelector('select[onchange="window.handleSettings(this.value)"]').value = "";
    };

    const progressText = document.getElementById('dsa-progress-text');
    const progressFill = document.getElementById('dsa-progress-fill');

    // 3a. Enhanced Code Blocks (Copy, Toggle, Line Numbers)
    document.querySelectorAll('pre').forEach((pre, index) => {
        // Wrapper for header + code
        const wrapper = document.createElement('div');
        wrapper.className = 'dsa-code-wrapper';

        // Header
        const header = document.createElement('div');
        header.className = 'dsa-code-header';

        const leftGroup = document.createElement('div');
        leftGroup.style.display = 'flex';
        leftGroup.style.alignItems = 'center';
        leftGroup.style.gap = '10px';

        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'dsa-code-toggle';
        toggleBtn.textContent = '▼';
        toggleBtn.title = 'Toggle Code';

        const langLabel = document.createElement('span');
        langLabel.className = 'dsa-code-lang';
        // Try to infer language from code class
        const codeClass = pre.querySelector('code')?.className || '';
        const langMatch = codeClass.match(/language-(\w+)/);
        langLabel.textContent = langMatch ? langMatch[1].toUpperCase() + ' TEMPLATE' : 'CODE TEMPLATE';

        leftGroup.append(toggleBtn, langLabel);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'dsa-copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(pre.innerText).then(() => window.showToast('Copied!', '📋'));
        };

        header.append(leftGroup, copyBtn);

        // Insert wrapper
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);

        // Line Numbers Logic
        pre.classList.add('line-numbers');
        const lines = pre.innerText.split('\n').length;
        const lineNumbersWrapper = document.createElement('span');
        lineNumbersWrapper.className = 'line-numbers-rows';
        lineNumbersWrapper.innerHTML = new Array(lines).fill('<span></span>').join('');
        pre.appendChild(lineNumbersWrapper);

        // Toggle Logic
        // Default to collapsed
        pre.classList.add('collapsed');
        toggleBtn.style.transform = 'rotate(-90deg)';

        header.addEventListener('click', () => {
            pre.classList.toggle('collapsed');
            toggleBtn.style.transform = pre.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
        });
    });

    // Re-run Prism highlight after DOM modifications
    if (window.Prism) {
        window.Prism.highlightAll();
    }

    // 3. Identify and Inject Checkboxes
    const BLIND75_TITLES = [
        "two sum", "best time to buy and sell stock", "contains duplicate", "product of array except self", "maximum subarray", "maximum product subarray", "find minimum in rotated sorted array", "search in rotated sorted array", "3sum", "container with most water",
        "sum of two integers", "number of 1 bits", "counting bits", "missing number", "reverse bits",
        "climbing stairs", "coin change", "longest increasing subsequence", "longest common subsequence", "word break", "combination sum", "house robber", "decode ways", "unique paths", "jump game",
        "clone graph", "course schedule", "pacific atlantic water flow", "number of islands", "longest consecutive sequence", "alien dictionary", "graph valid tree", "number of connected components",
        "insert interval", "merge intervals", "non-overlapping intervals", "meeting rooms",
        "reverse linked list", "detect cycle", "merge two sorted lists", "merge k sorted lists", "remove nth node", "reorder list",
        "set matrix zeroes", "spiral matrix", "rotate image", "word search",
        "longest substring without repeating", "longest repeating character replacement", "minimum window substring", "valid anagram", "group anagrams", "valid parentheses", "valid palindrome", "palindromic substrings", "encode and decode strings",
        "maximum depth of binary tree", "same tree", "invert binary tree", "binary tree maximum path sum", "binary tree level order traversal", "serialize and deserialize binary tree", "subtree of another tree", "construct binary tree from preorder", "validate binary search tree", "kth smallest element in a bst", "lowest common ancestor", "implement trie", "design add and search words"
    ];

    const problemListItems = [];
    document.querySelectorAll('h4').forEach(h4 => {
        const difficultyText = h4.textContent.trim();
        const detectedDiff = ['Easy', 'Medium', 'Hard'].find(d => difficultyText.includes(d));

        if (detectedDiff) {
            let nextElem = h4.nextElementSibling;
            while (nextElem && nextElem.tagName !== 'UL' && nextElem.tagName !== 'OL' && nextElem.tagName !== 'H4') nextElem = nextElem.nextElementSibling;

            if (nextElem && (nextElem.tagName === 'UL' || nextElem.tagName === 'OL')) {
                nextElem.classList.add('dsa-problem-list');
                nextElem.querySelectorAll('li').forEach(li => {
                    const link = li.querySelector('a');
                    if (link) {
                        totalProblems++;
                        // Fix: Encode unicode (emojis) safely to prevent btoa crash
                        const safeText = encodeURIComponent(link.textContent.trim() + link.getAttribute('href'));
                        const id = btoa(safeText).replace(/[^a-zA-Z0-9]/g, '');
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

                        li.setAttribute('data-diff', detectedDiff);
                        li.setAttribute('data-problem-id', id);

                        const titleLower = link.textContent.trim().toLowerCase();
                        if (BLIND75_TITLES.some(t => titleLower.includes(t))) {
                            const badge = document.createElement('span');
                            badge.className = 'dsa-badge blind75';
                            badge.textContent = 'Blind 75';
                            // Append to link/li text loop
                            li.appendChild(badge);
                            li.setAttribute('data-tags', 'blind75');
                        }

                        const wrapper = document.createElement('div');
                        wrapper.style.display = 'inline-flex'; wrapper.style.alignItems = 'center'; wrapper.style.marginRight = '8px';

                        const s = getState(id);
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox'; checkbox.className = 'dsa-checkbox'; checkbox.checked = s.done;
                        if (s.done) li.classList.add('dsa-completed');

                        const noteIcon = document.createElement('span');
                        noteIcon.className = `dsa-note-trigger ${s.notes ? 'has-notes' : ''}`;
                        noteIcon.textContent = '📝'; noteIcon.title = 'Notes';
                        noteIcon.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.openNotes(id); };

                        checkbox.addEventListener('change', (e) => {
                            const checked = e.target.checked;
                            const cur = getState(id);
                            if (checked) {
                                state[id] = { ...cur, done: true };
                                li.classList.add('dsa-completed');
                                window.openSRS(id);
                            } else {
                                state[id] = { ...cur, done: false };
                                li.classList.remove('dsa-completed');
                                saveState();
                            }
                            updateDashboard();
                            updatePhaseChips();
                            if (document.getElementById('dsa-pattern-modal')?.style.display === 'block') renderPatternAtlas();
                            if (checked) {
                                const solvedCount = Object.values(state).filter(s => s.done).length;
                                const lastExport = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10);
                                const daysSinceExport = lastExport ? (Date.now() - lastExport) / 86400000 : Infinity;
                                if (solvedCount === 10 && daysSinceExport > 7) {
                                    window.showToast('You\'ve solved 10! Export to back up progress', '💾');
                                }
                            }
                        });
                        wrapper.append(checkbox, noteIcon);
                        li.prepend(wrapper);
                    }
                });
            }
        }
    });

    problemListItems.sort((a, b) => {
        if (a.patternNum !== b.patternNum) return a.patternNum - b.patternNum;
        return (DIFF_WEIGHT[a.diff] || 99) - (DIFF_WEIGHT[b.diff] || 99);
    });

    // 3. Build Accordions & Track Section Progress
    document.querySelectorAll('h2').forEach(h2 => {
        const isTopic = /^\d+\./.test(h2.textContent.trim());
        if (!isTopic) return;

        // Create content wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'dsa-section-content';

        // Collect siblings
        let next = h2.nextSibling;
        const elementsToMove = [];
        while (next && next.tagName !== 'H2' && next.tagName !== 'H1') {
            elementsToMove.push(next);
            next = next.nextSibling;
        }

        if (elementsToMove.length > 0) {
            h2.parentNode.insertBefore(wrapper, h2.nextSibling);
            elementsToMove.forEach(el => wrapper.appendChild(el));

            h2.classList.add('dsa-section-header');

            // --- Enhanced Header Rendering ---
            const originalText = h2.textContent.trim();
            h2.innerHTML = `
                <div class="dsa-header-inner">
                    <span class="dsa-section-title">${originalText}</span>
                    <div class="dsa-section-meta">
                        <span class="dsa-mini-badge">0/0</span>
                        <span class="dsa-header-icon">▼</span>
                    </div>
                </div>
                <div class="dsa-section-progress">
                    <div class="dsa-section-progress-fill" style="width: 0%"></div>
                </div>
            `;

            // Stats Logic for this section
            const checkboxes = wrapper.querySelectorAll('.dsa-checkbox');
            const sectionTotal = checkboxes.length;
            const badge = h2.querySelector('.dsa-mini-badge');
            const fill = h2.querySelector('.dsa-section-progress-fill');

            const updateSectionStats = () => {
                const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
                const pct = sectionTotal === 0 ? 0 : Math.round((checkedCount / sectionTotal) * 100);

                badge.textContent = `${checkedCount}/${sectionTotal}`;
                fill.style.width = `${pct}%`;

                // Completion Styling (green badge)
                if (checkedCount === sectionTotal && sectionTotal > 0) {
                    h2.classList.add('dsa-completed-section');
                } else {
                    h2.classList.remove('dsa-completed-section');
                }
            };

            // Initial Update
            updateSectionStats();

            // Listen for global updates or specific checkbox changes
            // Since specific validation relies on event bubbling or direct attachment:
            // We'll attach a listener to each checkbox in this wrapper
            checkboxes.forEach(cb => {
                cb.addEventListener('change', updateSectionStats);
            });

            // Toggle Logic
            // Use H2 to capture clicks anywhere on the header (except strictly interactive children if needed)
            h2.addEventListener('click', (e) => {
            // Prevent toggle if clicking specifically on the progress bar if desired,
            // but user asked for "click anywhere", so we allow it.
                h2.classList.toggle('dsa-collapsed');
                wrapper.style.display = h2.classList.contains('dsa-collapsed') ? 'none' : 'block';
            });

            const isFirstVisit = !localStorage.getItem(VISITED_KEY);
            const lastPatternId = localStorage.getItem(LAST_PATTERN_KEY);
            const validLastPattern = lastPatternId && document.getElementById(lastPatternId);
            const defaultExpandId = isFirstVisit ? '1-arrays-hashing' : (validLastPattern ? lastPatternId : '1-arrays-hashing');

            if (h2.id === defaultExpandId) {
                h2.classList.remove('dsa-collapsed');
                wrapper.style.display = 'block';
            } else {
                h2.classList.add('dsa-collapsed');
                wrapper.style.display = 'none';
            }
        }
    });

    if (!localStorage.getItem(VISITED_KEY)) localStorage.setItem(VISITED_KEY, '1');

    problemListItems.forEach(item => {
        item.sectionH2 = getSectionH2ForLi(item.li);
        item.patternNum = getPatternNumberFromH2(item.sectionH2);
        item.patternId = item.sectionH2 ? item.sectionH2.id : '';
    });
    problemListItems.sort((a, b) => {
        if (a.patternNum !== b.patternNum) return a.patternNum - b.patternNum;
        return (DIFF_WEIGHT[a.diff] || 99) - (DIFF_WEIGHT[b.diff] || 99);
    });

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

    function getPatternPhaseLabel(num) {
        const phase = LEARNING_PHASES.find(p => p.patterns.includes(num));
        return phase ? phase.label : '';
    }

    function extractPatternMeta(h2) {
        const num = getPatternNumberFromH2(h2);
        const wrapper = h2.nextElementSibling;
        const title = (h2.querySelector('.dsa-section-title')?.textContent || h2.textContent).trim();
        let coreConcept = PATTERN_SUMMARIES[num] || '';
        let signalWords = [];

        if (wrapper?.classList.contains('dsa-section-content')) {
            wrapper.querySelectorAll('h3').forEach(h3 => {
                if (/core concept/i.test(h3.textContent)) {
                    let el = h3.nextElementSibling;
                    while (el && el.tagName !== 'H3' && el.tagName !== 'H4') {
                        if (el.tagName === 'P' && el.textContent.trim()) {
                            const text = el.textContent.trim();
                            coreConcept = text.length > 140 ? `${text.slice(0, 137)}…` : text;
                            break;
                        }
                        el = el.nextElementSibling;
                    }
                }
            });
            wrapper.querySelectorAll('li').forEach(li => {
                if (/signal words/i.test(li.textContent)) {
                    const raw = li.textContent.replace(/.*signal words:?\s*/i, '').replace(/["']/g, '');
                    signalWords = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
                }
            });
        }

        const checkboxes = wrapper?.querySelectorAll('.dsa-checkbox') || [];
        const total = checkboxes.length;
        const solved = Array.from(checkboxes).filter(cb => cb.checked).length;

        return {
            num, h2, title, coreConcept, signalWords,
            solved, total,
            phase: getPatternPhaseLabel(num),
            pct: total ? Math.round((solved / total) * 100) : 0,
        };
    }

    function buildPatternCatalog() {
        const catalog = [];
        document.querySelectorAll('.dsa-section-header').forEach(h2 => {
            const num = getPatternNumberFromH2(h2);
            if (num < 1 || num > 18) return;
            catalog.push(extractPatternMeta(h2));
        });
        return catalog.sort((a, b) => a.num - b.num);
    }

    let patternAtlasFilter = 'all';
    let patternAtlasQuery = '';

    function getFirstUnsolvedInPattern(patternNum) {
        return problemListItems.find(p => p.patternNum === patternNum && !getState(p.id).done);
    }

    function getNextPatternNum() {
        const { item } = getNextProblem();
        return item?.patternNum || null;
    }

    function patternMatchesFilter(entry) {
        if (patternAtlasFilter === 'all') return true;
        if (patternAtlasFilter === 'done') return entry.total > 0 && entry.solved === entry.total;
        if (patternAtlasFilter === 'todo') return entry.solved === 0;
        if (patternAtlasFilter === 'active') return entry.solved > 0 && entry.solved < entry.total;
        if (patternAtlasFilter === 'next') return entry.num === getNextPatternNum();
        return true;
    }

    function renderPatternAtlas() {
        const list = document.getElementById('dsa-pattern-ref-list');
        const stats = document.getElementById('dsa-pattern-atlas-stats');
        if (!list || !stats) return;

        const catalog = buildPatternCatalog();
        const started = catalog.filter(p => p.solved > 0).length;
        const completed = catalog.filter(p => p.total > 0 && p.solved === p.total).length;
        stats.textContent = `${started}/18 patterns started • ${completed} mastered • ${Object.values(state).filter(s => s.done).length}/${totalProblems} problems`;

        const q = patternAtlasQuery.trim().toLowerCase();
        const filtered = catalog.filter(entry => {
            if (!patternMatchesFilter(entry)) return false;
            if (!q) return true;
            const hay = [
                entry.title, entry.coreConcept, entry.phase,
                ...entry.signalWords, String(entry.num),
            ].join(' ').toLowerCase();
            return hay.includes(q);
        });

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = '<div class="dsa-pattern-empty">No patterns match. Try another filter or search.</div>';
            return;
        }

        let lastPhase = '';
        filtered.forEach(entry => {
            if (entry.phase && entry.phase !== lastPhase) {
                lastPhase = entry.phase;
                const phaseEl = document.createElement('div');
                phaseEl.className = 'dsa-pattern-phase-label';
                phaseEl.textContent = entry.phase;
                list.appendChild(phaseEl);
            }

            const card = document.createElement('article');
            card.className = 'dsa-pattern-card';
            if (entry.solved === entry.total && entry.total > 0) card.classList.add('is-done');
            if (entry.num === getNextPatternNum()) card.classList.add('is-next');

            const tags = entry.signalWords.length
                ? entry.signalWords.map(w => `<span class="dsa-signal-tag">${w}</span>`).join('')
                : '<span class="dsa-signal-tag muted">No signal words listed</span>';

            card.innerHTML = `
                <div class="dsa-pattern-card-top">
                    <div class="dsa-pattern-card-title">
                        <span class="dsa-pattern-num">${entry.num}</span>
                        <span>${entry.title.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                    <span class="dsa-pattern-progress-pill">${entry.solved}/${entry.total}</span>
                </div>
                <div class="dsa-pattern-progress-track"><div class="dsa-pattern-progress-fill" style="width:${entry.pct}%"></div></div>
                <p class="dsa-pattern-concept">${entry.coreConcept}</p>
                <div class="dsa-pattern-spot">
                    <span class="dsa-pattern-spot-label">Spot it when you see</span>
                    <div class="dsa-pattern-tags">${tags}</div>
                </div>
                <div class="dsa-pattern-card-actions">
                    <button type="button" class="dsa-pattern-action learn">📚 Learn</button>
                    <button type="button" class="dsa-pattern-action practice">▶ Practice</button>
                </div>
            `;

            card.querySelector('.learn').onclick = (e) => {
                e.stopPropagation();
                window.closeModal();
                setTimeout(() => {
                    expandPatternSection(entry.h2);
                    entry.h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 250);
            };

            card.querySelector('.practice').onclick = (e) => {
                e.stopPropagation();
                const target = getFirstUnsolvedInPattern(entry.num);
                window.closeModal();
                setTimeout(() => {
                    if (target) {
                        navigateToProblem(target, { openLink: true, startTimer: true });
                    } else {
                        expandPatternSection(entry.h2);
                        entry.h2.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        window.showToast('Pattern complete! Review or read the guide', '🎉');
                    }
                }, 250);
            };

            list.appendChild(card);
        });
    }

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

    function updatePhaseChips() {
        const chipData = {};
        LEARNING_PHASES.forEach(phase => {
            const phaseProblems = problemListItems.filter(p => phase.patterns.includes(p.patternNum));
            if (phaseProblems.length === 0) return;
            const h1Id = PHASE_H1_MAP[phase.num];
            if (!chipData[h1Id]) chipData[h1Id] = { solved: 0, total: 0 };
            chipData[h1Id].solved += phaseProblems.filter(p => getState(p.id).done).length;
            chipData[h1Id].total += phaseProblems.length;
        });
        Object.entries(chipData).forEach(([h1Id, data]) => {
            const phaseH1 = document.getElementById(h1Id);
            if (!phaseH1) return;
            let chip = phaseH1.querySelector('.dsa-phase-chip');
            if (!chip) {
                chip = document.createElement('span');
                chip.className = 'dsa-phase-chip';
                phaseH1.appendChild(chip);
            }
            chip.textContent = `${data.solved}/${data.total} solved`;
        });
    }

    function updateSessionHub() {
        const loc = document.getElementById('dsa-session-location');
        const next = document.getElementById('dsa-session-next');
        const reviewsBtn = document.getElementById('dsa-reviews-btn');
        if (!loc || !next) return;

        const now = Date.now();
        const dueCount = Object.values(state).filter(s => s.done && s.nextReview && s.nextReview <= now).length;
        const { item, type } = getNextProblem();

        if (type === 'complete') {
            loc.textContent = 'All done! 🎉';
            next.textContent = 'Review Blind 75 or revisit hard problems';
            reviewsBtn.style.display = 'inline-block';
            reviewsBtn.textContent = dueCount > 0 ? `🕒 Reviews (${dueCount})` : '🔥 Blind 75';
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
        next.innerHTML = `${item.link.textContent.trim()} <span class="dsa-badge ${item.diff}">${item.diff}</span>`;

        reviewsBtn.style.display = dueCount > 0 ? 'inline-block' : 'none';
        reviewsBtn.textContent = `🕒 Reviews (${dueCount})`;
    }

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

    // 4. Update Dashboard (State Helpers are defined at top)
    function updateDashboard() {
        const solved = Object.values(state).filter(s => s.done).length;
        const percentage = totalProblems === 0 ? 0 : Math.round((solved / totalProblems) * 100);

        const now = Date.now();
        const due = Object.values(state).filter(s => s.done && s.nextReview && s.nextReview <= now).length;

        let text = `${solved} / ${totalProblems} Solved (${percentage}%)`;
        if (due > 0) text += ` • 🕒 ${due} Due`;

        progressText.textContent = text;
        progressFill.style.width = `${percentage}%`;
        progressText.style.color = due > 0 ? '#fbbf24' : 'var(--text-primary)';

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

        updateSessionHub();
    }

    // Global List Logic
    const globalListContainer = document.createElement('div');
    globalListContainer.id = 'dsa-global-list-view';
    document.body.appendChild(globalListContainer);

    let currentSort = 'default', currentFilter = 'all';
    window.setFilter = (val) => {
        currentFilter = val;
        if (val === 'todo' && currentSort === 'default') currentSort = 'curriculum';
        renderGlobalList();
    };
    window.setSort = (val) => { currentSort = val; renderGlobalList(); };

    function renderGlobalList() {
        globalListContainer.innerHTML = '';

        let sortLabel = currentSort === 'default' ? 'Default'
            : currentSort === 'curriculum' ? 'Curriculum'
            : currentSort === 'random' ? 'Random'
            : currentSort === 'easy_hard' ? 'Easy → Hard' : 'Hard → Easy';
        let nextSort = currentSort === 'default' ? 'curriculum'
            : currentSort === 'curriculum' ? 'easy_hard'
            : currentSort === 'easy_hard' ? 'hard_easy'
            : currentSort === 'hard_easy' ? 'random' : 'default';

        globalListContainer.innerHTML = `
            <div class="dsa-sort-controls">
                <div class="dsa-select-wrapper">
                    <select class="dsa-btn" onchange="window.setFilter(this.value)">
                        <option value="all" ${currentFilter === 'all' ? 'selected' : ''}>Filter: All</option>
                        <option value="due" ${currentFilter === 'due' ? 'selected' : ''}>🕒 Review Due</option>
                        <option value="todo" ${currentFilter === 'todo' ? 'selected' : ''}>Status: To Do</option>
                        <option value="done" ${currentFilter === 'done' ? 'selected' : ''}>Status: Done</option>
                        <option value="notes" ${currentFilter === 'notes' ? 'selected' : ''}>📝 Has Notes</option>
                        <option value="blind75" ${currentFilter === 'blind75' ? 'selected' : ''}>🔥 Blind 75</option>
                    </select>
                </div>
                <button class="dsa-sort-btn active" onclick="window.setSort('${nextSort}')"><span>Sort: <strong>${sortLabel}</strong></span> 🔄</button>
            </div>
        `;

        let items = [...problemListItems];
        const now = Date.now();

        if (currentFilter !== 'all') {
            items = items.filter(item => {
                const s = getState(item.id);
                if (currentFilter === 'due') return s.done && s.nextReview && s.nextReview <= now;
                if (currentFilter === 'todo') return !s.done;
                if (currentFilter === 'done') return s.done;
                if (currentFilter === 'notes') return !!s.notes;
                if (currentFilter === 'blind75') return item.li.getAttribute('data-tags') === 'blind75';
                return true;
            });
        }

        if (currentSort === 'curriculum') {
            items.sort((a, b) => {
                if (a.patternNum !== b.patternNum) return a.patternNum - b.patternNum;
                return (DIFF_WEIGHT[a.diff] || 99) - (DIFF_WEIGHT[b.diff] || 99);
            });
        } else if (currentSort === 'random') items.sort(() => Math.random() - 0.5);
        else if (currentSort !== 'default') {
            items.sort((a, b) => {
                const wa = DIFF_WEIGHT[a.li.getAttribute('data-diff')] || 99;
                const wb = DIFF_WEIGHT[b.li.getAttribute('data-diff')] || 99;
                return currentSort === 'easy_hard' ? wa - wb : wb - wa;
            });
        }

        if (items.length === 0) {
            globalListContainer.innerHTML += '<div class="dsa-list-item" style="justify-content:center;color:var(--text-secondary)">No problems found.</div>';
        } else {
            items.forEach((item, idx) => {
                const el = document.createElement('div');
                const s = getState(item.id);
                const isDue = s.done && s.nextReview && s.nextReview <= now;
                el.className = `dsa-list-item ${s.done ? 'completed' : ''}`;
                el.innerHTML = `
                    <div class="dsa-list-left">
                        <span class="dsa-list-no">${idx + 1}.</span>
                        <input type="checkbox" class="dsa-checkbox" ${s.done ? 'checked' : ''}>
                        ${isDue ? '<span title="Review Due!" style="margin-right:5px">🕒</span>' : ''}
                        ${s.notes ? '<span title="Has Notes" style="margin-right:5px">📝</span>' : ''}
                        <a href="${item.link.href}" target="_blank" class="dsa-problem-link">${item.link.textContent}</a>
                    </div>
                    <div>
                        ${item.li.getAttribute('data-tags') === 'blind75' ? '<span class="dsa-badge blind75">Blind 75</span>' : ''}
                        <span class="dsa-badge ${item.li.getAttribute('data-diff')}">${item.li.getAttribute('data-diff')}</span>
                    </div>
                 `;
                el.querySelector('input').addEventListener('change', (e) => {
                    const mainCb = item.li.querySelector('input.dsa-checkbox');
                    mainCb.checked = e.target.checked;
                    mainCb.dispatchEvent(new Event('change'));
                    setTimeout(renderGlobalList, 50);
                });
                globalListContainer.appendChild(el);
            });
        }
    }

    const listBtn = document.getElementById('dsa-list-btn');

    const toggleView = (show) => {
        document.body.classList.toggle('view-mode-list', show);
        globalListContainer.classList.toggle('active', show);
        listBtn.textContent = show ? '📝' : '📋';
        renderGlobalList();
        localStorage.setItem('dsa-view-mode', show ? 'list' : 'full');
    };

    listBtn.addEventListener('click', () => {
        toggleView(!document.body.classList.contains('view-mode-list'));
    });

    // Init View
    const savedMode = localStorage.getItem('dsa-view-mode') || 'full';
    if (savedMode === 'list') toggleView(true);

    document.getElementById('dsa-continue-btn').addEventListener('click', () => {
        const { item } = getNextProblem();
        if (!item) {
            currentFilter = 'blind75';
            currentSort = 'curriculum';
            toggleView(true);
            return;
        }
        if (document.body.classList.contains('view-mode-list')) window.switchView('full');
        navigateToProblem(item, { openLink: true, startTimer: true });
    });

    document.getElementById('dsa-reviews-btn').addEventListener('click', () => {
        const now = Date.now();
        const dueCount = Object.values(state).filter(s => s.done && s.nextReview && s.nextReview <= now).length;
        currentFilter = dueCount > 0 ? 'due' : 'blind75';
        currentSort = 'curriculum';
        toggleView(true);
    });

    document.getElementById('dsa-read-btn').addEventListener('click', () => {
        const { item } = getNextProblem();
        const target = item || problemListItems[0];
        if (target?.sectionH2) {
            if (document.body.classList.contains('view-mode-list')) window.switchView('full');
            expandPatternSection(target.sectionH2);
            target.sectionH2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    window.openPatternRef = () => {
        patternAtlasFilter = 'all';
        patternAtlasQuery = '';
        const search = document.getElementById('dsa-pattern-search');
        if (search) search.value = '';
        document.querySelectorAll('.dsa-pattern-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        renderPatternAtlas();
        document.getElementById('dsa-srs-modal').style.display = 'none';
        document.getElementById('dsa-notes-modal').style.display = 'none';
        document.getElementById('dsa-pattern-modal').style.display = 'block';
        requestAnimationFrame(() => modalBackdrop.classList.add('active'));
    };

    document.getElementById('dsa-pattern-atlas-filters')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.dsa-pattern-filter');
        if (!btn) return;
        patternAtlasFilter = btn.dataset.filter;
        document.querySelectorAll('.dsa-pattern-filter').forEach(b => b.classList.toggle('active', b === btn));
        renderPatternAtlas();
    });

    document.getElementById('dsa-pattern-search')?.addEventListener('input', (e) => {
        patternAtlasQuery = e.target.value;
        if (patternAtlasQuery.trim()) {
            patternAtlasFilter = 'all';
            document.querySelectorAll('.dsa-pattern-filter').forEach(b => {
                b.classList.toggle('active', b.dataset.filter === 'all');
            });
        }
        renderPatternAtlas();
    });

    // Make switching available for random button
    window.switchView = (mode) => {
        if (mode === 'full') toggleView(false);
    };

    // --- 5. Sticky Sidebar TOC & Scroll Spy ---
    const tocContainer = document.createElement('aside');
    tocContainer.className = 'dsa-sidebar-toc';
    // Only show on desktop for now, or use media queries in CSS
    document.body.appendChild(tocContainer);

    const generateTOC = () => {
        const introIds = new Set(['learning-progression-philosophy', 'how-to-use-this-guide']);
        let tocHTML = '<nav class="dsa-toc-nav"><ul class="dsa-toc-intro">';
        introIds.forEach(id => {
            const header = document.getElementById(id);
            if (!header) return;
            tocHTML += `<li><a href="#${id}" class="dsa-toc-link" data-target="${id}">${header.textContent.replace(/▼/g, '').trim()}</a></li>`;
        });
        tocHTML += '</ul><div class="dsa-toc-divider">Patterns</div><ul class="dsa-toc-patterns">';

        document.querySelectorAll('.dsa-section-header').forEach(header => {
            const num = getPatternNumberFromH2(header);
            if (num < 1 || num > 18) return;
            const id = header.id;
            const clone = header.cloneNode(true);
            clone.querySelectorAll('.dsa-mini-badge, .dsa-header-icon, .dsa-section-progress').forEach(e => e.remove());
            const text = clone.textContent.trim();
            tocHTML += `<li><a href="#${id}" class="dsa-toc-link dsa-toc-pattern-link" data-target="${id}" data-pattern="${num}">${text}</a></li>`;
        });

        tocHTML += '</ul><div class="dsa-toc-divider">Interview</div><ul class="dsa-toc-interview">';
        ['interview-frequency-table', 'interview-survival-guide'].forEach(id => {
            const header = document.getElementById(id);
            if (!header) return;
            tocHTML += `<li><a href="#${id}" class="dsa-toc-link" data-target="${id}">${header.textContent.trim()}</a></li>`;
        });
        tocHTML += '</ul></nav>';
        tocContainer.innerHTML = tocHTML;

        // Add Click Listeners for "Focus Mode" (Open Target, Close Others)
        tocContainer.querySelectorAll('.dsa-toc-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-target');
                const targetHeader = document.getElementById(targetId);

                if (targetHeader) {
                    if (targetHeader.classList.contains('dsa-section-header')) {
                        expandPatternSection(targetHeader);
                    }
                    setTimeout(() => {
                        targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        targetHeader.classList.remove('dsa-flash-highlight');
                        void targetHeader.offsetWidth;
                        targetHeader.classList.add('dsa-flash-highlight');
                    }, 50);
                }
            });
        });
    };

    // Inject CSS for Sidebar (Dynamic injection to keep logic self-contained or add to style.css)
    // MOVED TO STYLE.CSS for better maintainability

    generateTOC();

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

    // Scroll Spy
    const tocLinks = document.querySelectorAll('.dsa-toc-link');
    const sections = document.querySelectorAll('h2'); // Tracking H2s as sections

    const onScroll = () => {
        let current = '';
        const offset = 200; // Increased offset to trigger highlight slightly earlier than top of screen

        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
            // At bottom of page, highlight the last item
            if (sections.length > 0) current = sections[sections.length - 1].getAttribute('id');
        } else if (window.scrollY < 150) {
            // At top of page, highlight the first item (Learning Progression)
            if (sections.length > 0) current = sections[0].id; // Usually the first H2
        } else {
            sections.forEach(section => {
                if (section.offsetParent === null) return; // Ignore hidden sections
                const sectionTop = section.offsetTop;
                if (scrollY >= sectionTop - offset) {
                    current = section.getAttribute('id');
                }
            });
        }

        tocLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-target') === current) {
                link.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', onScroll);

    if (totalProblems === 0) {
        sessionHub.style.display = 'none';
    } else {
        updatePhaseChips();
        updateBackupLabel();
        updateDashboard();
    }

    // Random Button Logic Update (inside DOMContentLoaded)
    const randomBtn = document.getElementById('dsa-random-btn');
    if (randomBtn) { // Safety check if element exists
        // Remove old listener to avoid duplicates if any (though DOMContentLoaded runs once)
        const newRandomBtn = randomBtn.cloneNode(true);
        randomBtn.parentNode.replaceChild(newRandomBtn, randomBtn);

        newRandomBtn.addEventListener('click', () => {
            const unsolved = problemListItems.filter(item => !getState(item.id).done);
            if (unsolved.length === 0) return window.showToast('All solved!', '🎉');
            const randomItem = unsolved[Math.floor(Math.random() * unsolved.length)];

            // Always switch to full view to jump to problem
            if (document.body.classList.contains('view-mode-list')) {
                window.switchView('full');
            }

            setTimeout(() => {
                navigateToProblem(randomItem);
                window.showToast(`Random Pick: ${randomItem.link.textContent}`, '🎲');
            }, 100);
        });
    }
});
