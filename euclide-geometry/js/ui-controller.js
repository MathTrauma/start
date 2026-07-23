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

        const LEVEL_LABELS = { mid2: '중2', mid3: '중3', 'contest1-1': '경시 1차-1', 'contest1-2': '경시 1차-2', contest2: '경시2차', gifted: '영재고', 0: '기본정리' };
        const levelLabel = LEVEL_LABELS[level] ?? `L${level}`;
        this.elements['problem-container'].className = 'problem-container';
        this.elements['problem-container'].innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level level-${level}">${levelLabel}</span>
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

        // "Step X" 제목(h2)을 우선 찾고, 없으면 일반 요소에서 검색
        const findTarget = () => {
            const headings = textContainer.querySelectorAll('h2');
            for (const h of headings) {
                if (h.textContent.includes(`Step ${phase}`)) return h;
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
        // 화면 전체를 자유롭게 이동할 수 있도록 body 에 부착 (position: fixed)
        const parent = document.body;
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
                        <span class="drag-handle-icon" aria-hidden="true">
                            <svg viewBox="0 0 8 14" fill="currentColor">
                                <circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/>
                                <circle cx="2" cy="7" r="1.3"/><circle cx="6" cy="7" r="1.3"/>
                                <circle cx="2" cy="12" r="1.3"/><circle cx="6" cy="12" r="1.3"/>
                            </svg>
                        </span>
                        <button class="mode-shortcut-btn" id="btn-shortcut-problem">문제</button>
                        <button class="mode-shortcut-btn" id="btn-shortcut-solution" ${!hasSolution ? 'disabled' : ''}>풀이</button>
                    </div>
                    <span class="controls-title expanded-view">Controls</span>
                    <button class="controls-collapse-btn" id="btn-collapse">+</button>
                </div>
                <div class="controls-body">
                    <div class="control-section mode-section">
                        <div class="button-group mode-toggle">
                            <button id="btn-mode-problem" class="active mode-btn">문제</button>
                            <button id="btn-mode-solution" class="mode-btn" ${!hasSolution ? 'disabled' : ''}>풀이</button>
                        </div>
                    </div>
                    <div class="control-section">
                        <div class="control-label">Phase</div>
                        <div class="phase-row">
                            <button id="btn-all" class="active">All</button>
                            <div class="phase-buttons" id="phase-buttons-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._setupDraggable();
        this._bindControlEvents();
        this._setupCanvasPlayPause();
        this._placeAtCanvasBoundary();
        this._showOnboarding();
    }

    // 캔버스 클릭/탭 → 정지·재생 토글 (별도 버튼 대체)
    _setupCanvasPlayPause() {
        if (this._canvasToggleBound) return;

        const wrapper = document.getElementById('canvas-wrapper');
        if (!wrapper) return;

        wrapper.addEventListener('click', () => {
            if (this.callbacks.onPlayPause) this.callbacks.onPlayPause();
        });
        wrapper.style.cursor = 'pointer';
        this._canvasToggleBound = true;
    }

    // 1단 레이아웃(모바일·태블릿)에서 초기 위치를 문제/캔버스 경계에 둔다
    _placeAtCanvasBoundary() {
        if (window.matchMedia('(min-width: 1025px)').matches) return;

        const controls = document.getElementById('draggable-controls');
        const canvasSection = document.querySelector('.canvas-section');
        if (!controls || !canvasSection) return;

        requestAnimationFrame(() => {
            const rect = canvasSection.getBoundingClientRect();
            const w = controls.offsetWidth;
            const h = controls.offsetHeight;
            const padding = 5;

            const left = Math.max(padding, Math.min((window.innerWidth - w) / 2, window.innerWidth - w - padding));
            const top = Math.max(padding, Math.min(rect.top - h / 2, window.innerHeight - h - padding));

            controls.style.left = `${left}px`;
            controls.style.top = `${top}px`;
            controls.style.right = 'auto';
        });
    }

    // 최초 1회 — ① 드래그로 이동 ② 캔버스 탭으로 정지·재생 안내
    _showOnboarding() {
        const KEY = 'euclide-controls-onboarded';
        try {
            if (localStorage.getItem(KEY)) return;
        } catch {
            return;
        }

        const controls = document.getElementById('draggable-controls');
        const canvasSection = document.querySelector('.canvas-section');
        if (!controls) return;

        const fadeOut = (el, done) => {
            el.classList.add('hiding');
            setTimeout(() => {
                el.remove();
                if (done) done();
            }, 300);
        };

        const finish = () => {
            try { localStorage.setItem(KEY, '1'); } catch { /* 무시 */ }
        };

        // ① 드래그 안내 — 컨트롤 아래 말풍선
        const dragTip = document.createElement('div');
        dragTip.className = 'controls-onboarding';
        dragTip.textContent = '드래그해서 원하는 위치로 옮기세요';
        controls.appendChild(dragTip);

        // ② 캔버스 탭 안내 — 캔버스 위 배너
        const showCanvasTip = () => {
            if (!canvasSection) return finish();

            const canvasTip = document.createElement('div');
            canvasTip.className = 'canvas-onboarding';
            canvasTip.textContent = '그림을 탭하면 정지 / 재생';
            canvasSection.appendChild(canvasTip);

            setTimeout(() => fadeOut(canvasTip, finish), 4000);
        };

        let dragTipDone = false;
        const closeDragTip = () => {
            if (dragTipDone) return;
            dragTipDone = true;
            fadeOut(dragTip, showCanvasTip);
        };

        setTimeout(closeDragTip, 4000);
        document.getElementById('controls-drag-handle')
            ?.addEventListener('pointerdown', closeDragTip, { once: true });
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

    // 정지·재생 버튼은 캔버스 탭으로 대체됨 — 호출부 호환을 위해 시그니처만 유지
    setPlayPauseState() {}

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

        // 펼쳤을 때 위치 보정 (뷰포트 밖으로 나가지 않도록)
        if (!isCollapsed) {
            const currentLeft = controls.offsetLeft;
            const currentTop = controls.offsetTop;
            const maxLeft = window.innerWidth - controls.offsetWidth - 10;
            const maxTop = window.innerHeight - controls.offsetHeight - 10;
            if (currentLeft > maxLeft) controls.style.left = Math.max(0, maxLeft) + 'px';
            if (currentTop > maxTop) controls.style.top = Math.max(0, maxTop) + 'px';
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

            const dx = clientX - startX;
            const dy = clientY - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // 경계 검사 — 화면(뷰포트) 전체 기준, 완전히 벗어나지 않도록만 제한
            const padding = 5;
            const maxLeft = window.innerWidth - controls.offsetWidth - padding;
            const maxTop = window.innerHeight - controls.offsetHeight - padding;
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
