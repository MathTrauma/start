/**
 * Shared viewer controls functions
 * Used by both ui-controls.js and viewer.js
 */

/**
 * Render phase buttons based on mode and count
 * @param {string} mode - 'problem' or 'solution'
 * @param {number} count - Number of phases
 */
function renderPhaseButtons(mode, count) {
    const container = document.getElementById('phase-buttons-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const btn = document.createElement('button');
        btn.id = `btn-phase-${i}`;
        btn.setAttribute('data-phase', i);
        btn.textContent = `${i}`;
        container.appendChild(btn);
    }
}

/**
 * Get the current number of phases based on the mode
 */
function getCurrentPhaseCount() {
    const mode = getCurrentMode();
    return mode === 'problem' ? (window.problemPhaseCount || 0) : (window.solutionPhaseCount || 0);
}

/**
 * Attach event listeners to phase buttons
 * Clones buttons first to remove any existing listeners
 */
function attachPhaseButtonListeners() {
    const allBtn = document.getElementById('btn-all');
    if (allBtn) {
        allBtn.replaceWith(allBtn.cloneNode(true));
        document.getElementById('btn-all').addEventListener('click', () => {
            setPhase('all');
            setActiveButton('btn-all');
            if (typeof updateProblemText === 'function' && typeof globalPaddedId !== 'undefined') {
                const currentMode = getCurrentMode();
                updateProblemText(currentMode, 'all', globalPaddedId, globalBaseUrl);
            }
        });
    }

    const count = getCurrentPhaseCount();
    for (let i = 1; i <= count; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) {
            btn.replaceWith(btn.cloneNode(true));
            document.getElementById(`btn-phase-${i}`).addEventListener('click', () => {
                setPhase(i);
                setActiveButton(`btn-phase-${i}`);
                if (typeof updateProblemText === 'function' && typeof globalPaddedId !== 'undefined') {
                    const currentMode = getCurrentMode();
                    updateProblemText(currentMode, i, globalPaddedId, globalBaseUrl);
                }
            });
        }
    }
}

/**
 * Set active state for phase buttons
 * @param {string} activeId - ID of button to activate
 */
function setActiveButton(activeId) {
    const allBtn = document.getElementById('btn-all');
    if (allBtn) allBtn.classList.remove('active');

    const count = getCurrentPhaseCount();
    for (let i = 1; i <= count; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) btn.classList.remove('active');
    }
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add('active');
}

/**
 * Set active state for mode buttons (Problem/Solution)
 * @param {string} activeId - ID of mode button to activate
 */
function setActiveModeButton(activeId) {
    const probBtn = document.getElementById('btn-mode-problem');
    const solBtn = document.getElementById('btn-mode-solution');
    if (probBtn) probBtn.classList.remove('active');
    if (solBtn) solBtn.classList.remove('active');
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add('active');
}
