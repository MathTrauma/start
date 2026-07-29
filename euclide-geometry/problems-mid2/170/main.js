import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XSegment, XCircle, XPoint, XAngleMarker, XPolygon, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { getIncenter } from '../../lib/geometry.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0170';

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
        const url = `./problems-mid2/170/${file}`;
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
        const url = `./problems-mid2/170/solution.html`;
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
        let O, A, B, C, S, I;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // === 점 정의 (외심 O, 반지름 2 위의 극좌표) ===
            const R = 2;
            const pol = (deg) => p.createVector(R * Math.cos(deg * Math.PI / 180), R * Math.sin(deg * Math.PI / 180));
            O = p.createVector(0, 0);
            A = pol(70);
            B = pol(210);
            C = pol(-30);
            S = pol(-90);          // 호 BC(A 미포함)의 중점 = 직선 AI 와 외접원의 교점
            I = getIncenter(A, B, C);

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, S], size);

            // ===== Problem Phase 1: 삼각형 ABC + 외접원 =====
            animator.registerPhase('problem1', [
                {
                    group: [
                        { id: 'AB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.9 } },
                        { id: 'BC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0.9 } },
                        { id: 'CA', object: XSegment(p, C, A), animate: { mode: 'draw', duration: 0.9 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // draw circle ABC (외접원)
                { id: 'circABC', object: XCircle(p, O, R, { startPoint: A }), animate: { mode: 'draw', duration: 1.0 } },
                { delay: 0.3 }
            ]);

            // ===== Problem Phase 2: 내심 I, 선분 AS, BS =====
            animator.registerPhase('problem2', [
                // display I[above right]
                { id: 'pointI', object: new XPoint(p, I, 'I', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                // draw AS (직선 AI 가 외접원과 만나는 점 S 까지)
                { id: 'pointS', object: new XPoint(p, S, 'S', { center }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'AS', object: XSegment(p, A, S), animate: { mode: 'draw', duration: 0.7 } },
                // draw BS
                { id: 'BS', object: XSegment(p, B, S), animate: { mode: 'draw', duration: 0.5 } },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 1: ∠A, ∠B 이등분 =====
            animator.registerPhase('solution1', [
                // draw angles BAS, SAC with markc (∠A 를 AS 가 이등분)
                {
                    group: [
                        { id: 'angleBAS', object: new XAngleMarker(p, B, A, S, { arcSize: 32, marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleSAC', object: new XAngleMarker(p, S, A, C, { arcSize: 32, marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // draw seg IB
                { id: 'IB', object: XSegment(p, I, B), animate: { mode: 'draw', duration: 0.6 } },
                // draw angles IBA, CBI with markt (∠B 를 BI 가 이등분)
                {
                    group: [
                        { id: 'angleIBA', object: new XAngleMarker(p, I, B, A, { arcSize: 28, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleCBI', object: new XAngleMarker(p, C, B, I, { arcSize: 28, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 2: ∠SBI = ∠BIS → 이등변삼각형 SIB =====
            animator.registerPhase('solution2', [
                // draw angle SBC with markc (= ∠SAC, 호 SC 원주각) — 다른 원 마커와 크기 통일
                { id: 'angleSBC', object: new XAngleMarker(p, S, B, C, { arcSize: 32, marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 },
                // pulse angles BAS, IBA (∠A/2, ∠B/2 강조)
                {
                    group: [
                        { id: 'angleBAS', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'angleIBA', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                // draw angle BIS with marker ○+△ (= ∠A/2 + ∠B/2, 삼각형 ABI 의 외각)
                { id: 'angleBIS', object: new XAngleMarker(p, B, I, S, { arcSize: 26, marker: '○+△' }), animate: { mode: 'draw', duration: 0.7 } },
                { delay: 0.5 },
                // fill SIB || travel SIB (SB = SI 인 이등변삼각형)
                {
                    group: [
                        { id: 'fillSIB', object: new XPolygon(p, [S, I, B], { filled: true, fillColor: [100, 180, 220, 80] }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'travelSIB', object: new XPolygon(p, [S, I, B]), animate: { mode: 'travel', duration: 1.0 } }
                    ],
                    parallel: true
                },
                // draw segs SI, SB thick green (이등변 변 강조)
                {
                    group: [
                        { id: 'segSI', object: XSegment(p, S, I, { color: COLORS.green, weight: 4 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'segSB', object: XSegment(p, S, B, { color: COLORS.green, weight: 4 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                // mark[2] SI, SB (SB = SI)
                {
                    group: [
                        { id: 'markSI', object: new XSegmentMarker(p, S, I, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markSB', object: new XSegmentMarker(p, S, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
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
