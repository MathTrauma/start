import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { projectPointToLine } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XRightAngle, XDimension, XAngleMarker, XText, XPoint } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '1505';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level level-mid3">중3</span>
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
        const url = `./problems-mid3/505/${file}`;
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
        const url = `./problems-mid3/505/solution.html`;
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
        let animator, size;
        let A, B, C, D;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점: 직각삼각형 (∠C=90°), CA=20, CB=15, AB=25
            C = p.createVector(0, 0);
            A = p.createVector(20, 0);
            B = p.createVector(0, 15);
            // D: C에서 AB에 내린 수선의 발 (CD=12, BD=9, AD=16)
            D = projectPointToLine(C, A, B);

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'ABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 0.9 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'rightBCA', object: new XRightAngle(p, B, C, A, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'dimCA', object: new XDimension(p, C, A, '20', { offset: -10 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'dimCB', object: new XDimension(p, C, B, '15', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.9 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'rightCDB', object: new XRightAngle(p, C, D, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                {
                    group: [
                        { id: 'dimCD', object: new XDimension(p, C, D, '12', { offset: -10 }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'dimBD', object: new XDimension(p, B, D, '9', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                {
                    group: [
                        { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleDCB', object: new XAngleMarker(p, D, C, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { id: 'ABC', animate: { mode: 'pulse', duration: 1.2 } },
                { id: 'triCBD', object: new XPolygon(p, [C, B, D]), animate: { mode: 'pulse', duration: 1.2 } },
                { id: 'text1', object: new XText(p, [20, 25], '\\cos \\angle A = \\frac{\\overline{CD}}{\\overline{CB}} = \\frac{12}{15} = \\frac{4}{5}', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } }
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
            animator.updateAndDraw();
            p.pop();
        };
    };
}
