
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
