// Consolidated viewer module (viewer.js + viewer-controls.js + ui-controls.js)

lucide.createIcons();

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

initAuth((session) => {
    if (session) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
});

const urlParams = new URLSearchParams(window.location.search);
const problemId = urlParams.get('problem') || '001';

let globalPaddedId;
let globalBaseUrl;

loadProblem(problemId);

let isContestMode = false;
let canvasRevealed = false;

async function loadProblem(id) {
    const paddedId = id.padStart(3, '0');
    const baseUrl = 'https://euclide-worker.painfultrauma.workers.dev';
    const configUrl = `${baseUrl}/problems/${paddedId}/config.json`;

    globalPaddedId = paddedId;
    globalBaseUrl = baseUrl;

    const canvasWrapper = document.getElementById('canvas-wrapper');
    canvasWrapper.style.opacity = '0';
    canvasWrapper.style.visibility = 'hidden';

    try {
        const response = await fetch(configUrl);
        const config = await response.json();

        await renderProblem(config, paddedId, baseUrl);

        const script = document.createElement('script');
        script.type = 'module';
        script.src = `${baseUrl}/problems/${paddedId}/sketch.js`;

        script.onload = () => {
            renderControls(config, paddedId, baseUrl);

            function waitForP5Ready() {
                if (window.p5Instance && window.p5Instance.frameCount > 0) {
                    if (!isContestMode) {
                        canvasWrapper.style.opacity = '1';
                        canvasWrapper.style.visibility = 'visible';
                    } else {
                        window.p5Instance.noLoop();
                    }
                } else {
                    requestAnimationFrame(waitForP5Ready);
                }
            }
            waitForP5Ready();
        };

        document.body.appendChild(script);
    } catch (error) {
        console.error('Failed to load problem:', error);
        document.getElementById('problem-container').innerHTML = `
            <div class="error-message">
                <h2>문제를 불러올 수 없습니다</h2>
                <p>Problem ID: ${id}</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function renderProblem(config, paddedId, baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/problems/${paddedId}/problem.html`);
        const html = await response.text();

        isContestMode = config.contest === true;

        const problemContainer = document.getElementById('problem-container');
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L${config.level}</span>
                ${isContestMode ? '<span class="problem-tag contest">Contest</span>' : ''}
                <span id="problem-text"></span>
            </div>
            ${isContestMode ? '<button id="toggle-canvas-btn" class="toggle-canvas-btn">▼ 그림 보기</button>' : ''}
        `;

        const problemText = document.getElementById('problem-text');
        problemText.innerHTML = html;

        if (isContestMode) {
            const canvasWrapper = document.getElementById('canvas-wrapper');
            canvasWrapper.style.display = 'none';

            const toggleBtn = document.getElementById('toggle-canvas-btn');
            toggleBtn.addEventListener('click', () => {
                const isHidden = canvasWrapper.style.display === 'none';

                if (isHidden) {
                    canvasWrapper.style.display = 'block';
                    canvasWrapper.style.opacity = '1';
                    canvasWrapper.style.visibility = 'visible';
                    toggleBtn.textContent = '▲ 그림 숨기기';

                    if (!canvasRevealed) {
                        canvasRevealed = true;
                        if (typeof window.resetAnimation === 'function') {
                            window.resetAnimation();
                        }
                    }
                    if (window.p5Instance) {
                        window.p5Instance.loop();
                    }
                } else {
                    canvasWrapper.style.display = 'none';
                    toggleBtn.textContent = '▼ 그림 보기';
                    if (window.p5Instance) {
                        window.p5Instance.noLoop();
                    }
                }
            });
        }
    } catch (error) {
        console.error('Failed to load problem text:', error);
    }
}

const solutionHtmlCache = {};

async function updateProblemText(mode, phase, paddedId, baseUrl) {
    if (mode === 'problem') {
        hideSolutionPanel();
        const problemText = document.getElementById('problem-text');
        if (!problemText) return;
        try {
            const response = await fetch(`${baseUrl}/problems/${paddedId}/problem.html`);
            const html = await response.text();
            problemText.innerHTML = html;
        } catch (error) {
            console.error('Failed to load problem text:', error);
        }
    } else if (mode === 'solution') {
        const solutionText = document.getElementById('solution-text');
        if (!solutionText) return;
        showSolutionPanel();

        let html;
        if (solutionHtmlCache[paddedId]) {
            html = solutionHtmlCache[paddedId];
        } else {
            try {
                const response = await fetch(`${baseUrl}/problems/${paddedId}/solution.html`);
                if (!response.ok) {
                    console.warn('solution.html not found');
                    return;
                }
                html = await response.text();
                solutionHtmlCache[paddedId] = html;
            } catch (error) {
                console.error('Failed to load solution:', error);
                return;
            }
        }

        solutionText.innerHTML = html;

        const targetPhase = (phase === 'all' || !phase) ? (window.solutionPhaseCount || 1) : phase;
        scrollToPhase(targetPhase);
    }
}

function scrollToPhase(phase) {
    const scrollContainer = document.getElementById('solution-scroll-container');
    if (!scrollContainer) return;

    const paragraphs = scrollContainer.querySelectorAll('#solution-text > p');
    let targetElement = null;

    for (const p of paragraphs) {
        if (p.textContent.includes(`Step ${phase}`)) {
            targetElement = p;
            break;
        }
    }

    if (!targetElement) {
        const allChildren = scrollContainer.querySelectorAll('#solution-text > *');
        for (const child of allChildren) {
            if (child.textContent.includes(`Step ${phase}`)) {
                targetElement = child;
                break;
            }
        }
    }

    if (targetElement) {
        // Calculate offset relative to scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const offsetTop = targetRect.top - containerRect.top + scrollContainer.scrollTop;

        scrollContainer.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

function showSolutionPanel() {
    const panel = document.getElementById('solution-container');
    if (panel) panel.classList.remove('hidden');
}

function hideSolutionPanel() {
    const panel = document.getElementById('solution-container');
    if (panel) panel.classList.add('hidden');
}

// ===== From viewer-controls.js =====

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

function getCurrentPhaseCount() {
    const mode = getCurrentMode();
    return mode === 'problem' ? (window.problemPhaseCount || 0) : (window.solutionPhaseCount || 0);
}

function getCurrentMode() {
    return window.getCurrentMode ? window.getCurrentMode() : 'problem';
}

function attachPhaseButtonListeners() {
    const allBtn = document.getElementById('btn-all');
    if (allBtn) {
        allBtn.replaceWith(allBtn.cloneNode(true));
        document.getElementById('btn-all').addEventListener('click', () => {
            if (window.setPhase) window.setPhase('all');
            setActiveButton('btn-all');
            const currentMode = getCurrentMode();
            updateProblemText(currentMode, 'all', globalPaddedId, globalBaseUrl);
        });
    }

    const count = getCurrentPhaseCount();
    for (let i = 1; i <= count; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) {
            btn.replaceWith(btn.cloneNode(true));
            document.getElementById(`btn-phase-${i}`).addEventListener('click', () => {
                if (window.setPhase) window.setPhase(i);
                setActiveButton(`btn-phase-${i}`);
                const currentMode = getCurrentMode();
                updateProblemText(currentMode, i, globalPaddedId, globalBaseUrl);
            });
        }
    }
}

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

function setActiveModeButton(activeId) {
    const probBtn = document.getElementById('btn-mode-problem');
    const solBtn = document.getElementById('btn-mode-solution');
    if (probBtn) probBtn.classList.remove('active');
    if (solBtn) solBtn.classList.remove('active');
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add('active');
}

// ===== From ui-controls.js =====

function setupControls() {
    document.getElementById('btn-restart').addEventListener('click', () => {
        if (window.resetAnimation) window.resetAnimation();
    });

    const playPauseBtn = document.getElementById('btn-play-pause');
    playPauseBtn.addEventListener('click', () => {
        if (window.togglePause) {
            const paused = window.togglePause(window.p5Instance);
            playPauseBtn.textContent = paused ? '▶' : '⏸';
        }
    });

    document.getElementById('btn-mode-problem').addEventListener('click', () => {
        if (window.setMode && window.setMode('problem')) {
            renderPhaseButtons('problem', window.problemPhaseCount || 0);
            attachPhaseButtonListeners();
            setActiveButton('btn-all');
            setActiveModeButton('btn-mode-problem');
            updateProblemText('problem', 'all', globalPaddedId, globalBaseUrl);
        }
    });

    const solutionBtn = document.getElementById('btn-mode-solution');
    if (solutionBtn && !solutionBtn.disabled) {
        solutionBtn.addEventListener('click', () => {
            if (window.setMode && window.setMode('solution')) {
                renderPhaseButtons('solution', window.solutionPhaseCount || 0);
                attachPhaseButtonListeners();
                setActiveButton('btn-all');
                setActiveModeButton('btn-mode-solution');
                updateProblemText('solution', 'all', globalPaddedId, globalBaseUrl);
            }
        });
    }

    attachPhaseButtonListeners();
}

// ===== Controls rendering =====

function renderControls(config, paddedId, baseUrl) {
    const hasSolution = config.solutionPhases && config.solutionPhases.length > 0;
    window.problemPhaseCount = config.problemPhases ? config.problemPhases.length : (config.phases ? config.phases.length : 0);
    window.solutionPhaseCount = config.solutionPhases ? config.solutionPhases.length : 0;

    const canvasWrapper = document.getElementById('canvas-wrapper');
    let controlsContainer = document.getElementById('controls-container');
    if (controlsContainer) controlsContainer.remove();
    controlsContainer = document.createElement('div');
    controlsContainer.id = 'controls-container';
    canvasWrapper.appendChild(controlsContainer);
    controlsContainer.innerHTML = `
        <div class="controls collapsed" id="draggable-controls">
            <div class="controls-header" id="controls-drag-handle">
                <div class="collapsed-view" style="display: none;">
                    <span class="drag-handle-icon">⋮⋮</span>
                    <button class="mode-shortcut-btn" id="btn-shortcut-problem">Prob</button>
                    <button class="mode-shortcut-btn" id="btn-shortcut-solution" ${!hasSolution ? 'disabled' : ''}>Sol</button>
                </div>
                <span class="controls-title expanded-view">Controls</span>
                <button class="controls-collapse-btn" id="btn-collapse">+</button>
            </div>
            <div class="controls-body">
                <div class="control-section mode-section">
                    <div class="button-group mode-toggle">
                        <button id="btn-mode-problem" class="active mode-btn">Prob</button>
                        <button id="btn-mode-solution" class="mode-btn" ${!hasSolution ? 'disabled' : ''}>Sol</button>
                    </div>
                </div>
                <div class="control-section">
                    <div class="control-label">Play</div>
                    <div class="button-group">
                        <button id="btn-restart">↺</button>
                        <button id="btn-play-pause">⏸</button>
                    </div>
                </div>
                <div class="control-section">
                    <div class="control-label">Phase</div>
                    <div class="button-group" style="margin-bottom: 4px;">
                        <button id="btn-all" class="active">All</button>
                    </div>
                    <div class="phase-buttons" id="phase-buttons-container"></div>
                </div>
            </div>
        </div>
    `;
    setupDraggable();
    renderPhaseButtons('problem', config.problemPhases ? config.problemPhases.length : (config.phases ? config.phases.length : 0));
    setupControls();

    const expandOnModeClick = () => {
        const controls = document.getElementById('draggable-controls');
        if (controls && controls.classList.contains('collapsed')) {
            toggleControls(controls, document.getElementById('btn-collapse'));
        }
    };
    document.getElementById('btn-mode-problem').addEventListener('click', expandOnModeClick);
    const solBtn = document.getElementById('btn-mode-solution');
    if (solBtn) solBtn.addEventListener('click', expandOnModeClick);

    document.getElementById('btn-shortcut-problem').addEventListener('click', (e) => {
        e.stopPropagation();
        const controls = document.getElementById('draggable-controls');
        const probBtn = document.getElementById('btn-mode-problem');
        if (controls.classList.contains('collapsed')) {
            if (!probBtn.classList.contains('active')) probBtn.click();
            toggleControls(controls, document.getElementById('btn-collapse'));
        } else {
            if (probBtn.classList.contains('active')) toggleControls(controls, document.getElementById('btn-collapse'));
            else probBtn.click();
        }
    });

    const shortSolBtn = document.getElementById('btn-shortcut-solution');
    if (shortSolBtn) {
        shortSolBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (shortSolBtn.disabled) return;
            const controls = document.getElementById('draggable-controls');
            const solBtn = document.getElementById('btn-mode-solution');
            if (controls.classList.contains('collapsed')) {
                if (!solBtn.classList.contains('active')) solBtn.click();
                toggleControls(controls, document.getElementById('btn-collapse'));
            } else {
                if (solBtn.classList.contains('active')) toggleControls(controls, document.getElementById('btn-collapse'));
                else solBtn.click();
            }
        });
    }
}

function toggleControls(controls, collapseBtn) {
    const isCollapsed = controls.classList.toggle('collapsed');
    collapseBtn.textContent = isCollapsed ? '+' : '−';
    if (!isCollapsed) {
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const currentLeft = controls.offsetLeft;
        const currentTop = controls.offsetTop;
        const maxLeft = canvasWrapper.clientWidth - controls.offsetWidth - 10;
        const maxTop = canvasWrapper.clientHeight - controls.offsetHeight - 10;
        if (currentLeft > maxLeft) controls.style.left = Math.max(0, maxLeft) + 'px';
        if (currentTop > maxTop) controls.style.top = Math.max(0, maxTop) + 'px';
    }
}

function setupDraggable() {
    const controls = document.getElementById('draggable-controls');
    const handle = document.getElementById('controls-drag-handle');
    const collapseBtn = document.getElementById('btn-collapse');
    if (!controls || !handle) return;
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag, { passive: false });
    function startDrag(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        startX = clientX;
        startY = clientY;
        initialLeft = controls.offsetLeft;
        initialTop = controls.offsetTop;
        controls.style.transition = 'none';
        if (e.type === 'touchstart') e.preventDefault();
    }
    const onMove = (e) => {
        if (!isDragging) return;
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const canvasWrapper = document.getElementById('canvas-wrapper');
        const dx = clientX - startX;
        const dy = clientY - startY;
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        const padding = 5;
        const maxLeft = canvasWrapper.clientWidth - controls.offsetWidth - padding;
        const maxTop = canvasWrapper.clientHeight - controls.offsetHeight - padding;
        newLeft = Math.max(padding, Math.min(newLeft, maxLeft));
        newTop = Math.max(padding, Math.min(newTop, maxTop));
        controls.style.left = newLeft + 'px';
        controls.style.top = newTop + 'px';
        controls.style.right = 'auto';
        if (e.type === 'touchmove') e.preventDefault();
    };
    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            controls.style.transition = '';
        }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleControls(controls, collapseBtn);
    });
}

window.setPhase = function(phase) {
    if (!window.animator || !window.phaseMap) return;

    const mode = window.currentMode || 'problem';
    const phaseMap = mode === 'problem' ? window.phaseMap.problem : window.phaseMap.solution;
    if (!phaseMap) return;

    // problem phase 배열
    const problemPhases = window.phaseMap.problem
        ? Object.keys(window.phaseMap.problem)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => window.phaseMap.problem[key])
        : [];

    // 현재 모드 phase 배열
    const currentPhases = Object.keys(phaseMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => phaseMap[key]);

    if (phase === 'all') {
        // solution 모드: problem 완료 상태에서 solution 전체 시퀀스
        // problem 모드: problem 전체 시퀀스
        window.animator.reset();
        if (mode === 'solution') {
            problemPhases.forEach(phaseName => {
                window.animator.applyPhaseObjects(phaseName);
            });
            window.animator.playSequence(currentPhases);
        } else {
            window.animator.playSequence(currentPhases);
        }
    } else {
        // solution 모드: problem 완료 + solution[phase]부터
        // problem 모드: problem[phase]부터
        const allPhases = mode === 'solution'
            ? [...problemPhases, ...currentPhases]
            : currentPhases;
        const startIndex = mode === 'solution'
            ? problemPhases.length + (phase - 1)
            : phase - 1;
        window.animator.playFrom(allPhases, startIndex);
    }
};

window.togglePause = function() {
    if (!window.animator) return false;
    window.animator.isPaused = !window.animator.isPaused;
    return window.animator.isPaused;
};

window.resetAnimation = function() {
    if (!window.animator || !window.phaseMap) return;

    const mode = window.currentMode || 'problem';
    const phaseMap = mode === 'problem' ? window.phaseMap.problem : window.phaseMap.solution;
    if (!phaseMap) return;

    // problem phase 배열
    const problemPhases = window.phaseMap.problem
        ? Object.keys(window.phaseMap.problem)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => window.phaseMap.problem[key])
        : [];

    // 현재 모드 phase 배열
    const currentPhases = Object.keys(phaseMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => phaseMap[key]);

    // solution 모드: problem + solution 전체
    // problem 모드: problem 전체
    const allPhases = mode === 'solution'
        ? [...problemPhases, ...currentPhases]
        : currentPhases;

    window.animator.reset();
    window.animator.playSequence(allPhases);
};

window.setMode = function(mode) {
    if (!window.animator || !window.phaseMap) return false;

    const phaseMap = mode === 'problem' ? window.phaseMap.problem : window.phaseMap.solution;
    if (!phaseMap || Object.keys(phaseMap).length === 0) {
        return false;
    }

    window.currentMode = mode;

    // problem phase 배열
    const problemPhases = window.phaseMap.problem
        ? Object.keys(window.phaseMap.problem)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => window.phaseMap.problem[key])
        : [];

    // 현재 모드 phase 배열
    const currentPhases = Object.keys(phaseMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => phaseMap[key]);

    window.animator.reset();

    if (mode === 'problem') {
        // problem 전체 시퀀스 처음부터
        window.animator.playSequence(currentPhases);
    } else {
        // solution: problem 완료 상태에서 solution 전체 시퀀스
        problemPhases.forEach(phaseName => {
            window.animator.applyPhaseObjects(phaseName);
        });
        window.animator.playSequence(currentPhases);
    }

    return true;
};

window.getCurrentMode = function() { return window.currentMode || 'problem'; };
