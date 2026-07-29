import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XDimension, XRightAngle, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0270';

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
        const url = `./problems-mid2/270/${file}`;
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
        const url = `./problems-mid2/270/solution.html`;
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
        let A, B, C, D, E;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점
            A = p.createVector(0, 0);
            C = p.createVector(8, 0);
            E = p.createVector(11, 0);
            D = p.createVector(11, 5);

            // B : 직선 x=0 과 직선 CD 의 교점
            B = intersectLines(A, p.createVector(0, 1), C, D);

            const center = p.createVector(
                (A.x + B.x + C.x + D.x + E.x) / 5,
                (A.y + B.y + C.y + D.y + E.y) / 5
            );

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, E], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'segAE', object: XSegment(p, A, E), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 0.2 },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptE', object: new XPoint(p, E, 'E', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'dimAC', object: new XDimension(p, A, C, '8', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'dimCE', object: new XDimension(p, C, E, '3', { offset: -10 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'dimDE', object: new XDimension(p, D, E, '5', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.2 },
                { id: 'segDE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 0.6 } },
                { id: 'ptD', object: new XPoint(p, D, 'D', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'rightDEC', object: new XRightAngle(p, D, E, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
                {
                    group: [
                        { id: 'segDB', object: XSegment(p, D, B), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'segAB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'rightBAC', object: new XRightAngle(p, B, A, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                { delay: 0.3 },
                { id: 'segBE', object: XSegment(p, B, E, { dashed: true }), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'fillCBE', object: new XPolygon(p, [C, B, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                // travel DCE, BCA — 닮은 두 삼각형 윤곽 + 트레이서
                {
                    group: [
                        { id: 'triDCE', object: new XPolygon(p, [D, C, E], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                        { id: 'triDCE_t', object: new XPolygon(p, [D, C, E], { color: [0, 0, 0, 0] }), animate: { mode: 'travel', duration: 1.5 } },
                        { id: 'triBCA', object: new XPolygon(p, [B, C, A], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                        { id: 'triBCA_t', object: new XPolygon(p, [B, C, A], { color: [0, 0, 0, 0] }), animate: { mode: 'travel', duration: 1.5 } }
                    ],
                    parallel: true
                },
                // pulse DCE, BCA || text["닮음", upper left]
                {
                    group: [
                        { id: 'triDCE', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'triBCA', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'text1', object: new XText(p, [20, 25], '닮음',
                            { fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                          animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                }
            ]);

            phaseNames.problem = ['problem1'];
            phaseNames.solution = ['solution1'];

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
