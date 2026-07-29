import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { COLORS } from '../../lib/config.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XSegmentMarker, XAngleMarker, XText } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0000';

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
        const url = `./problems-mid2/000/${file}`;
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
        const url = `./problems-mid2/000/solution.html`;
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

            // 점 정의
            A = p.createVector(0, 2);
            B = p.createVector(-1, 0);
            C = p.createVector(1, 0);
            D = p.createVector(0, 0);

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

            // 공유 점 2개를 추적하는 segment sync 헬퍼
            const createSegSyncFactory = (ptA, ptB) => {
                return () => {
                    return (obj) => {
                        if (obj.vertices[0]) { obj.vertices[0].x = ptA.x; obj.vertices[0].y = ptA.y; }
                        if (obj.vertices[1]) { obj.vertices[1].x = ptB.x; obj.vertices[1].y = ptB.y; }
                        obj._perimeterDirty = true;
                    };
                };
            };

            // clone ABD move(-50, 80)
            const dA1 = A.copy(), dB1 = B.copy(), dD1 = D.copy();
            const orig1 = [A.copy(), B.copy(), D.copy()];
            const dup1 = [dA1, dB1, dD1];
            const movFactory1 = createDupTranslatorFactory(dup1, orig1, -50, 80, 1.6);

            // clone ACD move(50, 80)
            const dA2 = A.copy(), dC2 = C.copy(), dD2 = D.copy();
            const orig2 = [A.copy(), C.copy(), D.copy()];
            const dup2 = [dA2, dC2, dD2];
            const movFactory2 = createDupTranslatorFactory(dup2, orig2, 50, 80, 1.6);

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
                {
                    group: [
                        { id: 'markAB', object: new XSegmentMarker(p, A, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markAC', object: new XSegmentMarker(p, A, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'segAD', object: XSegment(p, A, D, { closed: false }), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'markBD', object: new XSegmentMarker(p, B, D, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markDC', object: new XSegmentMarker(p, D, C, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markAD', object: new XSegmentMarker(p, A, D, { mark: 3 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // clone ABD || clone ACD || ghost all others
                {
                    group: [
                        {
                            group: [
                                { id: '_abd_tri', object: new XPolygon(p, [dA1, dB1, dD1], { color: COLORS.green }), action: 'show' },
                                { id: '_abd_segAB', object: XSegment(p, dA1, dB1, { closed: false, color: COLORS.green }), action: 'show' },
                                { id: '_abd_segBD', object: XSegment(p, dB1, dD1, { closed: false, color: COLORS.yellow }), action: 'show' },
                                { id: '_abd_segAD', object: XSegment(p, dA1, dD1, { closed: false, color: COLORS.blue }), action: 'show' },
                                { id: '_abd_markAB', object: new XSegmentMarker(p, dA1, dB1, { mark: 2, color: COLORS.green }), action: 'show' },
                                { id: '_abd_markBD', object: new XSegmentMarker(p, dB1, dD1, { mark: 1, color: COLORS.yellow }), action: 'show' },
                                { id: '_abd_markAD', object: new XSegmentMarker(p, dA1, dD1, { mark: 3, color: COLORS.blue }), action: 'show' },
                                { id: '_abd_tri', setFrameCallbackFactory: movFactory1 },
                                { id: '_abd_segAB', setFrameCallbackFactory: createSegSyncFactory(dA1, dB1) },
                                { id: '_abd_segBD', setFrameCallbackFactory: createSegSyncFactory(dB1, dD1) },
                                { id: '_abd_segAD', setFrameCallbackFactory: createSegSyncFactory(dA1, dD1) }
                            ],
                            parallel: false
                        },
                        {
                            group: [
                                { id: '_acd_tri', object: new XPolygon(p, [dA2, dC2, dD2], { color: COLORS.green }), action: 'show' },
                                { id: '_acd_segAC', object: XSegment(p, dA2, dC2, { closed: false, color: COLORS.green }), action: 'show' },
                                { id: '_acd_segDC', object: XSegment(p, dD2, dC2, { closed: false, color: COLORS.yellow }), action: 'show' },
                                { id: '_acd_segAD', object: XSegment(p, dA2, dD2, { closed: false, color: COLORS.blue }), action: 'show' },
                                { id: '_acd_markAC', object: new XSegmentMarker(p, dA2, dC2, { mark: 2, color: COLORS.green }), action: 'show' },
                                { id: '_acd_markDC', object: new XSegmentMarker(p, dD2, dC2, { mark: 1, color: COLORS.yellow }), action: 'show' },
                                { id: '_acd_markAD', object: new XSegmentMarker(p, dA2, dD2, { mark: 3, color: COLORS.blue }), action: 'show' },
                                { id: '_acd_tri', setFrameCallbackFactory: movFactory2 },
                                { id: '_acd_segAC', setFrameCallbackFactory: createSegSyncFactory(dA2, dC2) },
                                { id: '_acd_segDC', setFrameCallbackFactory: createSegSyncFactory(dD2, dC2) },
                                { id: '_acd_segAD', setFrameCallbackFactory: createSegSyncFactory(dA2, dD2) }
                            ],
                            parallel: false
                        },
                        { action: 'fadeAll', opacity: 0.3, exclude: ['_abd_tri', '_abd_segAB', '_abd_segBD', '_abd_segAD', '_abd_markAB', '_abd_markBD', '_abd_markAD', '_acd_tri', '_acd_segAC', '_acd_segDC', '_acd_segAD', '_acd_markAC', '_acd_markDC', '_acd_markAD'], duration: 0.7 }
                    ],
                    parallel: true
                },
                // pulse seg AB + marker green || seg AC + marker green
                {
                    group: [
                        { id: '_abd_segAB', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_abd_markAB', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_acd_segAC', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_acd_markAC', animate: { mode: 'pulse', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // pulse seg BD + marker yellow || seg DC + marker yellow
                {
                    group: [
                        { id: '_abd_segBD', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_abd_markBD', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_acd_segDC', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_acd_markDC', animate: { mode: 'pulse', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // pulse seg AD + marker blue || seg AD + marker blue
                {
                    group: [
                        { id: '_abd_segAD', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_abd_markAD', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_acd_segAD', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: '_acd_markAD', animate: { mode: 'pulse', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // text "SSS 합동" || draw angle DBA of cloned ABD || draw angle ACD of cloned ACD
                {
                    group: [
                        { id: 'text1', object: new XText(p, [20, 25], 'SSS 합동', { fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: '_abd_angleDBA', object: new XAngleMarker(p, dD1, dB1, dA1, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: '_acd_angleACD', object: new XAngleMarker(p, dA2, dC2, dD2, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            phaseNames.problem = ['problem1'];
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
