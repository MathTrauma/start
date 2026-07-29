import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getIncenter, projectPointToLine } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XCircle, XPoint, XDimension, XRightAngle } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0275';

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
        loadHtml(pid, 'problem.html', 'main-problem-text');
    }

    if (solutionText) loadSolutionHtml(pid);
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

async function loadHtml(pid, file, targetId) {
    try {
        const url = `./problems-mid2/275/${file}`;
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
        const url = `./problems-mid2/275/solution.html`;
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

function createSketch(pid) {
    return (p) => {
        let animator, size;
        let A, B, C, I, D, E, F, r, center;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점 (∠C = 90°, 5-12-13 직각삼각형)
            A = p.createVector(5, 0);
            B = p.createVector(0, 12);
            C = p.createVector(0, 0);

            I = getIncenter(A, B, C);              // 내심
            D = projectPointToLine(I, B, C);       // 내접원과 BC 의 접점
            E = projectPointToLine(I, C, A);       // 내접원과 CA 의 접점
            F = projectPointToLine(I, A, B);       // 내접원과 AB 의 접점
            r = p5.Vector.dist(I, D);              // 내접원 반지름

            center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            // 내접원 색 — 테마별 빨강 계열, stroke 이므로 alpha 는 불투명으로
            const redStroke = [...p.theme.fillRed.slice(0, 3), 255];

            animator = new XAnimator(p);
            animator.initViewport([A, B, C], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 0.9 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'dimCA', object: new XDimension(p, C, A, '5', { offset: -10 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'dimBC', object: new XDimension(p, B, C, '12', { offset: -10 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                { id: 'ptI', object: new XPoint(p, I, 'I', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'fillBIA', object: new XPolygon(p, [B, I, A], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 0.7 } },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'dimBA', object: new XDimension(p, B, A, '13', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } },
                { id: 'circOI', object: XCircle(p, I, r, { color: redStroke }), animate: { mode: 'draw', duration: 0.9 } },
                {
                    group: [
                        { id: 'segID', object: XSegment(p, I, D), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segIE', object: XSegment(p, I, E), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segIF', object: XSegment(p, I, F), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'rightIDC', object: new XRightAngle(p, I, D, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'rightIEA', object: new XRightAngle(p, I, E, A, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'rightIFB', object: new XRightAngle(p, I, F, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                {
                    group: [
                        { id: 'segIA', object: XSegment(p, I, A, { dashed: true }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segIB', object: XSegment(p, I, B, { dashed: true }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segIC', object: XSegment(p, I, C, { dashed: true }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'fillCIB', object: new XPolygon(p, [C, I, B], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'fillAIC', object: new XPolygon(p, [A, I, C], { filled: true, fillColor: [0, 255, 0, 60] }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
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
