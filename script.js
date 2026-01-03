document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = 'dsa-tracker-progress';
    let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    let totalProblems = 0;

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
                <button class="dsa-srs-btn srs-again" onclick="window.rateProblem('again')"><span>Again</span><span class="srs-interval">< 24 Hours</span></button>
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
    `;
    document.body.appendChild(modalBackdrop);

    let activeProblemId = null;
    window.closeModal = () => {
        modalBackdrop.classList.remove('active');
        setTimeout(() => {
            document.getElementById('dsa-srs-modal').style.display = 'none';
            document.getElementById('dsa-notes-modal').style.display = 'none';
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
        let interval = 0, nextReview = 1;
        if (rating === 'hard') interval = 2;
        if (rating === 'good') interval = 4;
        if (rating === 'easy') interval = 7;
        if (interval > 0) nextReview = now + (interval * 86400000);

        state[activeProblemId] = { ...s, done: true, lastReview: now, nextReview, interval };
        saveState();
        window.closeModal();
        updateDashboard();
        window.showToast(interval > 0 ? `Scheduled for ${interval} days` : 'Marked for review', '📅');
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
                    <button id="dsa-theme-btn" class="dsa-btn" title="Toggle Theme">🌓</button>
                    <button id="dsa-list-btn" class="dsa-btn" title="View List">📋</button>
                    <button id="dsa-random-btn" class="dsa-btn" title="Random Problem">🎲</button>
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

    // 3a. Copy Code Logic
    document.querySelectorAll('pre').forEach(pre => {
        const btn = document.createElement('button');
        btn.className = 'dsa-copy-btn';
        btn.textContent = 'Copy';
        btn.onclick = () => {
            navigator.clipboard.writeText(pre.innerText).then(() => window.showToast('Copied!', '📋'));
        };
        pre.style.position = 'relative'; pre.appendChild(btn);
    });

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
        const difficulty = h4.textContent.trim();
        if (['Easy', 'Medium', 'Hard'].some(d => difficulty.includes(d))) {
            let nextElem = h4.nextElementSibling;
            while (nextElem && nextElem.tagName !== 'UL' && nextElem.tagName !== 'H4') nextElem = nextElem.nextElementSibling;

            if (nextElem && nextElem.tagName === 'UL') {
                nextElem.classList.add('dsa-problem-list');
                nextElem.querySelectorAll('li').forEach(li => {
                    const link = li.querySelector('a');
                    if (link) {
                        totalProblems++;
                        const id = btoa(link.textContent.trim() + link.getAttribute('href')).replace(/[^a-zA-Z0-9]/g, '');
                        problemListItems.push({ li, id, link });

                        li.setAttribute('data-diff', difficulty.replace(/\s+/g, ' ').trim());
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
                        });
                        wrapper.append(checkbox, noteIcon);
                        li.prepend(wrapper);
                    }
                });
            }
        }
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
        while (next && next.tagName !== 'H2') {
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
            // Use inner container to prevent progress bar clicks from triggering
            h2.querySelector('.dsa-header-inner').addEventListener('click', (e) => {
                h2.classList.toggle('dsa-collapsed');
                wrapper.style.display = h2.classList.contains('dsa-collapsed') ? 'none' : 'block';
            });

            // Default state
            h2.classList.add('dsa-collapsed');
            wrapper.style.display = 'none';
        }
    });



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
    }

    // Global List Logic
    const globalListContainer = document.createElement('div');
    globalListContainer.id = 'dsa-global-list-view';
    document.body.appendChild(globalListContainer);



    let currentSort = 'default', currentFilter = 'all';
    window.setFilter = (val) => { currentFilter = val; renderGlobalList(); };
    window.setSort = (val) => { currentSort = val; renderGlobalList(); };

    function renderGlobalList() {
        globalListContainer.innerHTML = '';

        let sortLabel = currentSort === 'default' ? 'Default' : currentSort === 'random' ? 'Random' : currentSort === 'easy_hard' ? 'Easy → Hard' : 'Hard → Easy';
        let nextSort = currentSort === 'default' ? 'easy_hard' : currentSort === 'easy_hard' ? 'hard_easy' : currentSort === 'hard_easy' ? 'random' : 'default';

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

        if (currentSort === 'random') items.sort(() => Math.random() - 0.5);
        else if (currentSort !== 'default') {
            const weight = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Unknown': 99 };
            items.sort((a, b) => {
                const wa = weight[a.li.getAttribute('data-diff')] || 99;
                const wb = weight[b.li.getAttribute('data-diff')] || 99;
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

    // Make switching available for random button
    window.switchView = (mode) => {
        if (mode === 'full') toggleView(false);
    };

    // Random Button
    document.getElementById('dsa-random-btn').addEventListener('click', () => {
        const unsolved = problemListItems.filter(item => !getState(item.id).done);
        if (unsolved.length === 0) return window.showToast('All solved!', '🎉');
        const randomItem = unsolved[Math.floor(Math.random() * unsolved.length)];

        // Always switch to full view to jump to problem
        if (document.body.classList.contains('view-mode-list')) {
            window.switchView('full');
        }

        setTimeout(() => {
        // Ensure the section is expanded if it's collapsed
            const section = randomItem.li.closest('.dsa-section-content');
            if (section) {
                section.style.display = 'block';
                section.previousElementSibling.classList.remove('dsa-collapsed');
            }

            // Scroll after expansion ensures it's visible
            setTimeout(() => {
                randomItem.link.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight effect
                randomItem.li.style.transition = 'background 0.5s';
                randomItem.li.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                setTimeout(() => randomItem.li.style.backgroundColor = '', 1500);
            }, 50);

            window.showToast(`Random Pick: ${randomItem.link.textContent}`, '🎲');
        }, 100);
    });

    updateDashboard();
});
