import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { COLORS } from '../../lib/config.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XSegmentMarker, XAngleMarker } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0050';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">중2</span>
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
        const url = `./problems-mid2/050/${file}`;
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
        const url = `./problems-mid2/050/solution.html`;
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
        let A, B, C, D;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 점 정의: A 꼭짓점, ∠A=40°, AB=AC=2
            const r = 2;
            const halfA = 20 * Math.PI / 180;
            A = p.createVector(0, 2);
            C = p.createVector(A.x + r * Math.sin(halfA), A.y - r * Math.cos(halfA));
            B = p.createVector(A.x - r * Math.sin(halfA), A.y - r * Math.cos(halfA));

            // D: AB 위, BC = CD
            // ∠B = ∠C = 70°, 삼각형 BCD에서 BC = CD → ∠DBC = ∠BDC
            // BD / sin(∠BCD) = BC / sin(∠BDC) → BD = BC * sin(40°) / sin(70°)
            const BC = p.dist(B.x, B.y, C.x, C.y);
            const BD = BC * Math.sin(40 * Math.PI / 180) / Math.sin(70 * Math.PI / 180);
            const dirAB = p5.Vector.sub(B, A).normalize();
            D = p5.Vector.add(A, dirAB.mult(p5.Vector.dist(A, B) - BD));

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            // duplicate 이동 헬퍼
            const createDupTranslatorFactory = (sharedPts, origPts, dxScreen, dyScreen, duration) => {
                return () => {
                    let elapsed = 0, lastTime = null;
                    const scale = p.geometryScale;
                    const dxMath = dxScreen / scale;
                    const dyMath = dyScreen / scale;
                    return (obj) => {
                        const now = performance.now();
                        if (!lastTime) lastTime = now;
                        elapsed += (now - lastTime) / 1000;
                        lastTime = now;
                        const t = Math.min(1, elapsed / duration);
                        sharedPts.forEach((pt, i) => {
                            pt.x = origPts[i].x + dxMath * t;
                            pt.y = origPts[i].y + dyMath * t;
                        });
                        sharedPts.forEach((pt, i) => {
                            if (obj.vertices[i]) {
                                obj.vertices[i].x = pt.x;
                                obj.vertices[i].y = pt.y;
                            }
                        });
                        obj._perimeterDirty = true;
                        if (t >= 1) obj.frameCallback = null;
                    };
                };
            };

            // clone ABC move
            const cA1 = A.copy(), cB1 = B.copy(), cC1 = C.copy();
            const orig1 = [A.copy(), B.copy(), C.copy()];
            const dup1 = [cA1, cB1, cC1];
            const movFactory1 = createDupTranslatorFactory(dup1, orig1, -120, -10, 1.6);

            // clone DBC move
            const cD2 = D.copy(), cB2 = B.copy(), cC2 = C.copy();
            const orig2 = [D.copy(), B.copy(), C.copy()];
            const dup2 = [cD2, cB2, cC2];
            const movFactory2 = createDupTranslatorFactory(dup2, orig2, 160, 50, 1.6);

            // Animator 초기화
            animator = new XAnimator(p);
            animator.initViewport([A, B, C], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
                {
                    group: [
                        { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } },
                {
                    group: [
                        { id: 'markAB', object: new XSegmentMarker(p, A, B, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markAC', object: new XSegmentMarker(p, A, C, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                {
                    group: [
                        { id: 'markAB', action: 'fade', opacity: 0.3, duration: 0.5 },
                        { id: 'markAC', action: 'fade', opacity: 0.3, duration: 0.5 }
                    ],
                    parallel: true
                },
                { id: 'segCD', object: XSegment(p, C, D, { closed: false }), animate: { mode: 'draw', duration: 1.1 } },
                { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'markBC', object: new XSegmentMarker(p, B, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markCD', object: new XSegmentMarker(p, C, D, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { id: 'angleBDC', object: new XAngleMarker(p, B, D, C, { marker: '?' }), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                // clone ABC || clone DBC || ghost
                {
                    group: [
                        {
                            group: [
                                { id: '_abc_tri', object: new XPolygon(p, [cA1, cB1, cC1], { color: COLORS.green }), action: 'show' },
                                { id: '_abc_markAB', object: new XSegmentMarker(p, cA1, cB1, { mark: 1, color: COLORS.green }), action: 'show' },
                                { id: '_abc_markAC', object: new XSegmentMarker(p, cA1, cC1, { mark: 1, color: COLORS.green }), action: 'show' },
                                { id: '_abc_angleCBA', object: new XAngleMarker(p, cC1, cB1, cA1, { marker: 'triangle', color: COLORS.green }), action: 'show' },
                                { id: '_abc_tri', setFrameCallbackFactory: movFactory1 }
                            ],
                            parallel: false
                        },
                        {
                            group: [
                                { id: '_dbc_tri', object: new XPolygon(p, [cD2, cB2, cC2], { color: COLORS.yellow }), action: 'show' },
                                { id: '_dbc_markBC', object: new XSegmentMarker(p, cB2, cC2, { mark: 2, color: COLORS.yellow }), action: 'show' },
                                { id: '_dbc_markCD', object: new XSegmentMarker(p, cC2, cD2, { mark: 2, color: COLORS.yellow }), action: 'show' },
                                { id: '_dbc_angleCBD', object: new XAngleMarker(p, cC2, cB2, cD2, { marker: 'triangle', color: COLORS.yellow }), action: 'show' },
                                { id: '_dbc_tri', setFrameCallbackFactory: movFactory2 }
                            ],
                            parallel: false
                        },
                        { action: 'fadeAll', opacity: 0.3, exclude: ['_abc_tri', '_abc_markAB', '_abc_markAC', '_abc_angleCBA', '_dbc_tri', '_dbc_markBC', '_dbc_markCD', '_dbc_angleCBD'], duration: 1.0 }
                    ],
                    parallel: true
                },
                // pulse segs AB,AC (2s) || draw ACB (1s) then pulse CBA+ACB (1s)
                {
                    group: [
                        { id: '_abc_markAB', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: '_abc_markAC', animate: { mode: 'pulse', duration: 2.0 } },
                        {
                            group: [
                                { id: '_abc_angleACB', object: new XAngleMarker(p, cA1, cC1, cB1, { marker: 'triangle', color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                                {
                                    group: [
                                        { id: '_abc_angleCBA', animate: { mode: 'pulse', duration: 1.0 } },
                                        { id: '_abc_angleACB', animate: { mode: 'pulse', duration: 1.0 } }
                                    ],
                                    parallel: true
                                }
                            ],
                            parallel: false
                        }
                    ],
                    parallel: true
                },
                // pulse segs CB,CD (2s) || draw BDC (1s) then pulse CBD+BDC (1s)
                {
                    group: [
                        { id: '_dbc_markBC', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: '_dbc_markCD', animate: { mode: 'pulse', duration: 2.0 } },
                        {
                            group: [
                                { id: '_dbc_angleBDC', object: new XAngleMarker(p, cB2, cD2, cC2, { marker: 'triangle', color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.0 } },
                                {
                                    group: [
                                        { id: '_dbc_angleCBD', animate: { mode: 'pulse', duration: 1.0 } },
                                        { id: '_dbc_angleBDC', animate: { mode: 'pulse', duration: 1.0 } }
                                    ],
                                    parallel: true
                                }
                            ],
                            parallel: false
                        }
                    ],
                    parallel: true
                }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1'];

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
