
function setupControls() {
    document.getElementById('btn-restart').addEventListener('click', () => {
        resetAnimation();
    });

    const playPauseBtn = document.getElementById('btn-play-pause');
    playPauseBtn.addEventListener('click', () => {
        const paused = togglePause(p5Instance);
        playPauseBtn.textContent = paused ? '▶' : '⏸';
    });

    document.getElementById('btn-mode-problem').addEventListener('click', () => {
        if (setMode('problem')) {
            renderPhaseButtons('problem', problemPhaseCount);
            attachPhaseButtonListeners();
            setActiveButton('btn-all');
            setActiveModeButton('btn-mode-problem');
            if (typeof updateProblemText === 'function' && typeof globalPaddedId !== 'undefined') {
                updateProblemText('problem', 'all', globalPaddedId, globalBaseUrl);
            }
        }
    });

    const solutionBtn = document.getElementById('btn-mode-solution');
    if (solutionBtn && !solutionBtn.disabled) {
        solutionBtn.addEventListener('click', () => {
            if (setMode('solution')) {
                renderPhaseButtons('solution', solutionPhaseCount);
                attachPhaseButtonListeners();
                setActiveButton('btn-all');
                setActiveModeButton('btn-mode-solution');
                if (typeof updateProblemText === 'function' && typeof globalPaddedId !== 'undefined') {
                    updateProblemText('solution', 'all', globalPaddedId, globalBaseUrl);
                }
            }
        });
    }

    attachPhaseButtonListeners();
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
    document.getElementById('btn-all').classList.remove('active');
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
    document.getElementById('btn-mode-problem').classList.remove('active');
    document.getElementById('btn-mode-solution').classList.remove('active');
    document.getElementById(activeId).classList.add('active');
}
