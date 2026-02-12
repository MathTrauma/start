/**
 * ui-controller.js
 * 사용자 인터페이스 제어 (DOM 조작, 이벤트 핸들링)
 */

export class UIController {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.elements = {};
        this._initElements();
    }

    _initElements() {
        const ids = [
            'login-btn', 'logout-btn', 'canvas-wrapper', 'problem-container',
            'problem-text', 'solution-text', 'solution-container',
            'solution-scroll-container', 'phase-buttons-container',
            'btn-mode-problem', 'btn-mode-solution', 'btn-all', 'controls-container'
        ];
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    // --- Authentication UI ---
    updateAuthUI(isLoggedIn) {
        if (this.elements['login-btn']) this.elements['login-btn'].style.display = isLoggedIn ? 'none' : 'block';
        if (this.elements['logout-btn']) this.elements['logout-btn'].style.display = isLoggedIn ? 'block' : 'none';
    }

    // --- Error Rendering ---
    renderError(problemId, message) {
        if (this.elements['problem-container']) {
            this.elements['problem-container'].innerHTML = `
                <div class="error-message">
                    <h2>문제를 불러올 수 없습니다</h2>
                    <p>Problem ID: ${problemId}</p>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // --- Problem/Solution Text Rendering ---
    renderProblemContent(html, level, isContest) {
        if (!this.elements['problem-container']) return;

        const levelLabel = level == 9 ? '영재고' : level == 0 ? '기본정리' : `L${level}`;
        this.elements['problem-container'].className = 'problem-container';
        this.elements['problem-container'].innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">${levelLabel}</span>
                ${isContest ? '<span class="problem-tag contest">Contest</span>' : ''}
                <span id="problem-text">${html}</span>
                ${isContest ? ' <button id="toggle-canvas-btn" class="toggle-canvas-btn">▼ 그림 보기</button>' : ''}
            </div>
        `;

        // 동적 생성 요소 참조 갱신
        this.elements['problem-text'] = document.getElementById('problem-text');

        if (isContest) {
            this._setupContestToggle();
        }
    }

    renderSolutionContent(html) {
        if (this.elements['solution-text']) {
            this.elements['solution-text'].innerHTML = html;
        }
    }

    toggleSolutionPanel(show) {
        const panel = this.elements['solution-container'];
        if (panel) {
            if (show) panel.classList.remove('hidden');
            else panel.classList.add('hidden');
        }
    }

    scrollToPhase(phase) {
        const container = this.elements['solution-scroll-container'];
        const textContainer = this.elements['solution-text'];
        if (!container || !textContainer) return;

        // "Step X" 텍스트를 포함하는 요소 찾기
        const findTarget = () => {
            const paragraphs = textContainer.querySelectorAll('p');
            for (const p of paragraphs) {
                if (p.textContent.includes(`Step ${phase}`)) return p;
            }
            const children = textContainer.children;
            for (const child of children) {
                if (child.textContent.includes(`Step ${phase}`)) return child;
            }
            return null;
        };

        const target = findTarget();
        if (target) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const offsetTop = targetRect.top - containerRect.top + container.scrollTop;

            container.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
    }

    // --- Controls UI ---
    renderControls(config) {
        const hasSolution = config.solutionPhases && config.solutionPhases.length > 0;
        const parent = this.elements['canvas-wrapper'];
        if (!parent) return;

        // Remove existing controls
        const existing = document.getElementById('controls-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = 'controls-container';
        parent.appendChild(container);

        container.innerHTML = `
            <div class="controls collapsed" id="draggable-controls">
                <div class="controls-header" id="controls-drag-handle">
                    <div class="collapsed-view">
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
                        <div class="control-label">Phase</div>
                        <div class="button-group" style="margin-bottom: 4px; justify-content: space-between;">
                            <button id="btn-all" class="active">All</button>
                            <button id="btn-play-pause" class="play-pause-btn" title="Pause">❚❚</button>
                        </div>
                        <div class="phase-buttons" id="phase-buttons-container"></div>
                    </div>
                </div>
            </div>
        `;

        this._setupDraggable();
        this._bindControlEvents();
    }

    renderPhaseButtons(count) {
        const container = document.getElementById('phase-buttons-container');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 1; i <= count; i++) {
            const btn = document.createElement('button');
            btn.id = `btn-phase-${i}`;
            btn.dataset.phase = i;
            btn.textContent = `${i}`;
            btn.addEventListener('click', () => {
                if (this.callbacks.onPhaseChange) this.callbacks.onPhaseChange(i);
                this.setActivePhaseButton(i);
            });
            container.appendChild(btn);
        }
    }

    setActivePhaseButton(phaseIndexOrAll) {
        const allBtn = document.getElementById('btn-all');
        if (allBtn) allBtn.classList.toggle('active', phaseIndexOrAll === 'all');

        const buttons = document.querySelectorAll('#phase-buttons-container button');
        buttons.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.phase) === phaseIndexOrAll);
        });
    }

    setActiveModeButton(mode) {
        const probBtn = document.getElementById('btn-mode-problem');
        const solBtn = document.getElementById('btn-mode-solution');
        if (probBtn) probBtn.classList.toggle('active', mode === 'problem');
        if (solBtn) solBtn.classList.toggle('active', mode === 'solution');
    }

    setPlayPauseState(isPlaying) {
        const btn = document.getElementById('btn-play-pause');
        if (btn) {
            btn.textContent = isPlaying ? '❚❚' : '▶';
            btn.title = isPlaying ? 'Pause' : 'Play';
        }
    }

    // --- Internal Helpers ---

    _bindControlEvents() {
        document.getElementById('btn-mode-problem')?.addEventListener('click', () => {
            if (this.callbacks.onModeChange) this.callbacks.onModeChange('problem');
        });

        document.getElementById('btn-mode-solution')?.addEventListener('click', () => {
            if (this.callbacks.onModeChange) this.callbacks.onModeChange('solution');
        });

        document.getElementById('btn-all')?.addEventListener('click', () => {
            if (this.callbacks.onPhaseChange) this.callbacks.onPhaseChange('all');
            this.setActivePhaseButton('all');
        });

        document.getElementById('btn-play-pause')?.addEventListener('click', () => {
            if (this.callbacks.onPlayPause) this.callbacks.onPlayPause();
        });

        // Collapse/Expand shortcuts
        document.getElementById('btn-shortcut-problem')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleShortcut('problem');
        });
        document.getElementById('btn-shortcut-solution')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleShortcut('solution');
        });
    }

    _handleShortcut(mode) {
        const controls = document.getElementById('draggable-controls');
        const collapseBtn = document.getElementById('btn-collapse');
        const modeBtn = document.getElementById(`btn-mode-${mode}`);

        if (controls.classList.contains('collapsed')) {
            if (!modeBtn.classList.contains('active')) modeBtn.click();
            this._toggleControls(controls, collapseBtn);
        } else {
            if (modeBtn.classList.contains('active')) this._toggleControls(controls, collapseBtn);
            else modeBtn.click();
        }
    }

    _setupContestToggle() {
        const toggleBtn = document.getElementById('toggle-canvas-btn');
        const wrapper = this.elements['canvas-wrapper'];

        if (toggleBtn && wrapper) {
            wrapper.style.display = 'none';

            toggleBtn.addEventListener('click', () => {
                const isHidden = wrapper.style.display === 'none';
                if (isHidden) {
                    wrapper.style.display = 'block';
                    wrapper.style.opacity = '1';
                    wrapper.style.visibility = 'visible';
                    toggleBtn.textContent = '▲ 그림 숨기기';
                    if (this.callbacks.onCanvasReveal) this.callbacks.onCanvasReveal();
                } else {
                    wrapper.style.display = 'none';
                    toggleBtn.textContent = '▼ 그림 보기';
                    if (this.callbacks.onCanvasHide) this.callbacks.onCanvasHide();
                }
            });
        }
    }

    _toggleControls(controls, collapseBtn) {
        const isCollapsed = controls.classList.toggle('collapsed');
        collapseBtn.textContent = isCollapsed ? '+' : '−';

        // 펼쳤을 때 위치 보정 (화면 밖으로 나가지 않도록)
        if (!isCollapsed) {
            const canvasWrapper = document.getElementById('canvas-wrapper');
            if (canvasWrapper) {
                const currentLeft = controls.offsetLeft;
                const currentTop = controls.offsetTop;
                const maxLeft = canvasWrapper.clientWidth - controls.offsetWidth - 10;
                const maxTop = canvasWrapper.clientHeight - controls.offsetHeight - 10;
                if (currentLeft > maxLeft) controls.style.left = Math.max(0, maxLeft) + 'px';
                if (currentTop > maxTop) controls.style.top = Math.max(0, maxTop) + 'px';
            }
        }
    }

    _setupDraggable() {
        const controls = document.getElementById('draggable-controls');
        const handle = document.getElementById('controls-drag-handle');
        const collapseBtn = document.getElementById('btn-collapse');

        if (!controls || !handle) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const startDrag = (e) => {
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
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            const canvasWrapper = document.getElementById('canvas-wrapper');
            const dx = clientX - startX;
            const dy = clientY - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // 경계 검사
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

        // Mouse events
        handle.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', endDrag);

        // Touch events
        handle.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', endDrag);

        // Collapse button
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleControls(controls, collapseBtn);
        });
    }
}
