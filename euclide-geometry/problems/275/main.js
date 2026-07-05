/**
 * Problem 275 — main.js (자체 렌더링 방식)
 * mount(container, opts) / destroy() 인터페이스
 */
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XText, XSegmentMarker, XRightAngle } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

// --- mount / destroy ---

export function mount(container, opts = {}) {
    const pid = opts.problemId || '275';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    // 문제 텍스트
    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L2</span>
                <span id="main-problem-text">로딩 중...</span>
            </div>
        `;
        loadHtml(pid, 'problem.html', 'main-problem-text');
    }

    // 풀이 텍스트 (초기에는 숨김)
    if (solutionText) {
        loadSolutionHtml(pid);
    }
    if (solutionContainer) solutionContainer.classList.add('hidden');

    // 캔버스
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

// --- HTML 로더 ---

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

async function loadHtml(pid, file, targetId) {
    try {
        const url = `./problems/${pid}/${file}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        const el = document.getElementById(targetId);
        el.innerHTML = await res.text();
        renderKaTeX(el);
    } catch {
        document.getElementById(targetId).textContent = '문제를 불러올 수 없습니다.';
    }
}

async function loadSolutionHtml(pid) {
    try {
        const url = `./problems/${pid}/solution.html`;
        const res = await fetch(url);
        if (res.ok) {
            const el = document.getElementById('solution-text');
            el.innerHTML = await res.text();
            renderKaTeX(el);
        }
    } catch { /* 풀이 없음 — 무시 */ }
}

// --- Controls 초기화 (UIController 사용) ---

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

    const config = {
        solutionPhases: phaseNames.solution
    };
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
        if (mode === 'solution') {
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

// --- p5 Sketch ---

function createSketch(pid) {
    return (p) => {
        let animator, size;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // ===== 좌표 (problem.tex 주석 기준) =====
            const B = p.createVector(0, 0);
            const C = p.createVector(42, 0);
            const A = p.createVector(114 / 7, 72 * Math.sqrt(6) / 7);   // (16.286, 25.197)
            const I = p.createVector(18, 4 * Math.sqrt(6));             // 내심 (18, 9.798)
            const X = p.createVector(6, 0);
            const Y = p.createVector(30, 0);

            // 내접원 접점: D(BC), E(CA), F(AB)
            const D = p.createVector(18, 0);                            // BC 접점 = 현 XY의 중점
            const F = p5.Vector.add(A, p5.Vector.sub(B, A).mult(12 / 30)); // AF = 12
            const E = p5.Vector.add(A, p5.Vector.sub(C, A).mult(12 / 36)); // AE = 12

            const r1 = p5.Vector.dist(I, A);   // 원 O_1 반지름 (I에서 A까지, = 4√15)
            const r2 = I.y;                    // 내접원 O_2 반지름 (= 4√6, BC에 접함)

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);
            // 원 O_1의 최하점 — 뷰포트가 원 전체를 담도록 bounds에 포함
            const circleBottom = p.createVector(I.x, I.y - r1);

            // 합동 강조용 fill 색 (두 삼각형 동일 색)
            const fillCong = [...p.theme.fillBlue.slice(0, 3), 70];

            // Animator
            animator = new XAnimator(p);
            animator.initViewport([A, B, C, circleBottom], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.2 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // display I || draw circle O_1
                {
                    group: [
                        { id: 'ptI', object: new XPoint(p, I, 'I', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'circO1', object: XCircle(p, I, r1), animate: { mode: 'draw', duration: 1.5 } }
                    ],
                    parallel: true
                },
                // draw segs IA, IX, IY with marker[1] — 세 반지름 + 동치 tick 1개
                {
                    group: [
                        { id: 'segIA', object: XSegment(p, I, A), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'segIX', object: XSegment(p, I, X), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'segIY', object: XSegment(p, I, Y), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markIA', object: new XSegmentMarker(p, I, A, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markIX', object: new XSegmentMarker(p, I, X, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'markIY', object: new XSegmentMarker(p, I, Y, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'ptX', object: new XPoint(p, X, 'X', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptY', object: new XPoint(p, Y, 'Y', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'circO2', object: XCircle(p, I, r2), animate: { mode: 'draw', duration: 1.2 } },
                // draw segs ID, IE, IF || display D, E, F
                {
                    group: [
                        {
                            group: [
                                { id: 'segID', object: XSegment(p, I, D), animate: { mode: 'draw', duration: 0.7 } },
                                { id: 'segIE', object: XSegment(p, I, E), animate: { mode: 'draw', duration: 0.7 } },
                                { id: 'segIF', object: XSegment(p, I, F), animate: { mode: 'draw', duration: 0.7 } }
                            ],
                            parallel: true
                        },
                        {
                            group: [
                                { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                                { id: 'ptE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                                { id: 'ptF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                            ],
                            parallel: true
                        }
                    ],
                    parallel: true
                },
                // mark segs ID[2], IE[2], IF[2] (동치 tick 2개) || draw right angles IFA, YDI
                {
                    group: [
                        { id: 'markID', object: new XSegmentMarker(p, I, D, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markIE', object: new XSegmentMarker(p, I, E, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markIF', object: new XSegmentMarker(p, I, F, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'rightIFA', object: new XRightAngle(p, I, F, A, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'rightYDI', object: new XRightAngle(p, Y, D, I, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                // fill IFA, IDY, IDX — 합동 삼각형 동일 색
                {
                    group: [
                        { id: 'fillIFA', object: new XPolygon(p, [I, F, A], { filled: true, fillColor: fillCong }), animate: { mode: 'draw', duration: 1.5 } },
                        { id: 'fillIDY', object: new XPolygon(p, [I, D, Y], { filled: true, fillColor: fillCong }), animate: { mode: 'draw', duration: 1.5 } },
                        { id: 'fillIDX', object: new XPolygon(p, [I, D, X], { filled: true, fillColor: fillCong }), animate: { mode: 'draw', duration: 1.5 } }
                    ],
                    parallel: true
                },
                // pulse IFA, IDY, IDX
                {
                    group: [
                        { id: 'fillIFA', animate: { mode: 'pulse', duration: 1.5 } },
                        { id: 'fillIDY', animate: { mode: 'pulse', duration: 1.5 } },
                        { id: 'fillIDX', animate: { mode: 'pulse', duration: 1.5 } }
                    ],
                    parallel: true
                },
                // mark[3] AF, XD, DY — 합동 대응변 동치 tick 3개
                {
                    group: [
                        { id: 'markAF', object: new XSegmentMarker(p, A, F, { mark: 3 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markXD', object: new XSegmentMarker(p, X, D, { mark: 3 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markDY', object: new XSegmentMarker(p, D, Y, { mark: 3 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                {
                    id: 'text1',
                    object: new XText(p, [size - 15, size - 25],
                        '\\overline{XY} = 2 \\times \\overline{AF} = 30+36-42 =24',
                        { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.RIGHT }),
                    animate: { mode: 'draw', duration: 1.5 }
                },
                { delay: 2.0 }
            ]);

            phaseNames.problem = ['problem1'];
            phaseNames.solution = ['solution1', 'solution2'];

            setupControls(animator, phaseNames);
            animator.playSequence(phaseNames.problem);
        };

        p.draw = function() {
            p.background(p.theme.background);
            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.scale(1, -1);
            animator.updateAndDraw();
            p.pop();
        };
    };
}
