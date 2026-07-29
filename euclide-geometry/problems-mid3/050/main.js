import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XSegment, XPoint, XAngleMarker, XPolygon, XDimension } from '../../lib/x_object.js';
import { XPopup } from '../../lib/x_popup.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '1050';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">중3</span>
                <span id="main-problem-text">로딩 중...</span>
            </div>
        `;
        loadHtml('problem.html', 'main-problem-text');
    }

    if (solutionText) loadSolutionHtml();
    if (solutionContainer) solutionContainer.classList.add('hidden');

    if (canvasWrapper) {
        canvasWrapper.style.opacity = '1';
        canvasWrapper.style.visibility = 'visible';
        p5Instance = new p5(createSketch(pid), 'canvas-wrapper');
    }
}

export function destroy() {
    if (p5Instance) {
        p5Instance.remove();
        p5Instance = null;
    }
    uiController = null;
    const controlsEl = document.getElementById('controls-container');
    if (controlsEl) controlsEl.remove();
    // 캔버스가 사라져도 팝업 DOM 은 남으므로 직접 정리
    document.querySelectorAll('.canvas-popup').forEach(el => el.remove());
}

function renderKaTeX(el) {
    if (window.renderMathInElement) {
        renderMathInElement(el, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false
        });
    }
}

async function loadHtml(file, targetId) {
    try {
        const url = `./problems-mid3/050/${file}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const el = document.getElementById(targetId);
        el.innerHTML = await res.text();
        renderKaTeX(el);
    } catch {
        document.getElementById(targetId).textContent = '문제를 불러올 수 없습니다.';
    }
}

async function loadSolutionHtml() {
    try {
        const url = `./problems-mid3/050/solution.html`;
        const res = await fetch(url);
        if (res.ok) {
            const el = document.getElementById('solution-text');
            el.innerHTML = await res.text();
            renderKaTeX(el);
        }
    } catch { /* 풀이 없음 */ }
}

function setupControls(animator, phaseNames) {
    let currentMode = 'problem';
    let isPlaying = true;

    uiController = new UIController({
        onModeChange: (mode) => setMode(mode),
        onPhaseChange: (phase) => {
            if (phase === 'all') {
                setMode(currentMode);
            } else {
                uiController.setActivePhaseButton(phase);
                const allPhases = currentMode === 'solution'
                    ? [...phaseNames.problem, ...phaseNames.solution]
                    : phaseNames[currentMode];
                const startIdx = currentMode === 'solution'
                    ? phaseNames.problem.length + (phase - 1)
                    : phase - 1;
                animator.playFrom(allPhases, startIdx);
            }
        },
        onPlayPause: () => {
            isPlaying = !isPlaying;
            animator.isPaused = !isPlaying;
            if (isPlaying && p5Instance) {
                animator.lastFrameTime = performance.now();
                p5Instance.loop();
            } else if (p5Instance) {
                p5Instance.noLoop();
            }
            uiController.setPlayPauseState(isPlaying);
        }
    });

    const config = { solutionPhases: phaseNames.solution };
    uiController.renderControls(config);
    uiController.renderPhaseButtons(phaseNames.problem.length);
    uiController.setActivePhaseButton('all');

    function setMode(mode) {
        currentMode = mode;
        uiController.setActiveModeButton(mode);

        const count = mode === 'problem' ? phaseNames.problem.length : phaseNames.solution.length;
        uiController.renderPhaseButtons(count);
        uiController.setActivePhaseButton('all');

        animator.reset();
        if (mode === 'solution' && phaseNames.solution.length > 0) {
            phaseNames.problem.forEach(ph => animator.applyPhaseObjects(ph));
            animator.playSequence(phaseNames.solution);
            const solContainer = document.getElementById('solution-container');
            if (solContainer) solContainer.classList.remove('hidden');
        } else {
            animator.playSequence(phaseNames.problem);
            const solContainer = document.getElementById('solution-container');
            if (solContainer) solContainer.classList.add('hidden');
        }
    }
}

function createSketch(pid) {
    return (p) => {
        let animator;
        let A, B, C, D, Q, R, H, P;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // === 점 정의 ===
            A = p.createVector(0, 4);
            B = p.createVector(0, 0);
            C = p.createVector(8, 0);
            D = p.createVector(8, 4);
            Q = p.createVector(5, 0);          // 접는 선이 BC 와 만나는 점
            R = p.createVector(3, 4);          // 접는 선이 AD 와 만나는 점
            H = p.createVector(5, 4);          // Q 에서 AD 에 내린 수선의 발
            P = p.createVector(16 / 5, -12 / 5);  // C 를 직선 RQ 에 대해 대칭이동한 점

            const center = p.createVector(4, 2);

            // 축 RQ 를 중심으로 한 3차원 회전의 2D 정사영.
            // 축에 나란한 성분은 그대로, 수직인 성분에만 cos(theta) 를 곱하면
            // theta = 0 → 원래 위치, theta = 180° → 축에 대한 대칭(= 접힌 상태)이 된다.
            const axisU = p5.Vector.sub(Q, R).normalize();
            const foldInto = (target, X, cosT) => {
                const v = p5.Vector.sub(X, R);
                const par = p5.Vector.mult(axisU, v.dot(axisU));
                const perp = p5.Vector.sub(v, par);
                target.x = R.x + par.x + perp.x * cosT;
                target.y = R.y + par.y + perp.y * cosT;
            };

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, P], size);

            // ===== Problem Phase 1: 직사각형 외곽선 + 치수 + 각 x =====
            animator.registerPhase('problem1', [
                // draw segs AB->BQ->QC->CD->DR->RA
                {
                    id: 'outline',
                    object: new XPolygon(p, [A, B, Q, C, D, R, A], { closed: false }),
                    animate: { mode: 'draw', duration: 1.6 }
                },
                // display A,B,Q,C,D,R
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptQ', object: new XPoint(p, Q, 'Q', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptR', object: new XPoint(p, R, 'R', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // xdim AB[4, down], AD[8, up]
                {
                    group: [
                        { id: 'dimAB', object: new XDimension(p, A, B, '4', { offset: -10 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'dimAD', object: new XDimension(p, A, D, '8', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 }
            ]);

            // ===== Problem Phase 2: 접는 선 RQ 와 접기 =====
            animator.registerPhase('problem2', [
                // draw seg QR
                { id: 'segQR', object: XSegment(p, Q, R), animate: { mode: 'draw', duration: 0.5 } },
                // draw QC, CD, DR dashed instantly — 외곽선을 걷어내고 접히는 쪽만 점선으로 교체
                {
                    group: [
                        { id: 'outline', action: 'remove' },
                        { id: 'pathABQ', object: new XPolygon(p, [A, B, Q], { closed: false }), action: 'show' },
                        { id: 'segRA', object: XSegment(p, R, A), action: 'show' },
                        { id: 'dashQC', object: XSegment(p, Q, C, { dashed: true }), action: 'show' },
                        { id: 'dashCD', object: XSegment(p, C, D, { dashed: true }), action: 'show' },
                        { id: 'dashDR', object: XSegment(p, D, R, { dashed: true }), action: 'show' }
                    ],
                    parallel: true
                },
                // rotate QC, CD, DR 180° about axis QR
                {
                    group: [
                        {
                            id: 'foldPath',
                            object: new XPolygon(p, [Q, C, D, R], { closed: false }),
                            animate: { mode: 'default', duration: 1.8, from: 0, to: 1 }
                        },
                        {
                            id: 'foldPath',
                            setFrameCallback: (self) => {
                                const cosT = Math.cos(Math.PI * self.progress);
                                foldInto(self.vertices[1], C, cosT);
                                foldInto(self.vertices[2], D, cosT);
                                self._perimeterDirty = true;
                            }
                        }
                    ],
                    parallel: true
                },
                // display P
                { id: 'ptP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
                // draw angle BRQ with marker x — 접힌 뒤라야 ∠BRQ 가 보인다
                { id: 'angleBRQ', object: new XAngleMarker(p, B, R, Q, { marker: 'x', useTex: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 1: AR = l 로 두고 AD 를 나누기 =====
            animator.registerPhase('solution1', [
                // ghost xdim AD
                { id: 'dimAD', action: 'fade', opacity: 0.3, duration: 0.3 },
                // xdim AR[l, up], RD[8-l, up] — 기존 치수선 위에 한 단 쌓는다
                {
                    group: [
                        { id: 'dimAR', object: new XDimension(p, A, R, 'l', { offset: 28, useTex: true }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'dimRD', object: new XDimension(p, R, D, '8-l', { offset: 28, useTex: true }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 2: 접은 각이 같음 → 직각삼각형 QHR =====
            animator.registerPhase('solution2', [
                // draw angle QRD with marker x
                { id: 'angleQRD', object: new XAngleMarker(p, Q, R, D, { marker: 'x', useTex: true }), animate: { mode: 'draw', duration: 0.6 } },
                // draw QH, RH dashed thick green (수선의 발 H 도 함께 표시)
                {
                    group: [
                        { id: 'segQH', object: XSegment(p, Q, H, { dashed: true, color: COLORS.green, weight: 3 }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segRH', object: XSegment(p, R, H, { dashed: true, color: COLORS.green, weight: 3 }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'ptH', object: new XPoint(p, H, 'H', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // xdim QH[4, down], RH[2, down]
                {
                    group: [
                        { id: 'dimQH', object: new XDimension(p, Q, H, '4', { offset: -10 }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'dimRH', object: new XDimension(p, R, H, '2', { offset: -10 }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                // popup text
                {
                    id: 'popupAnswer',
                    object: new XPopup(p, '$\\sin x = \\dfrac{\\overline{HQ}}{\\overline{QR}} = \\dfrac{2\\sqrt5}{5}$'),
                    animate: { mode: 'draw', duration: 0.3 }
                },
                { delay: 1.0 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1', 'solution2'];

            setupControls(animator, phaseNames);
            animator.playSequence(phaseNames.problem);
        };

        p.draw = function () {
            p.background(p.theme.background);
            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.scale(1, -1);
            if (animator) animator.updateAndDraw();
            p.pop();
        };
    };
}
