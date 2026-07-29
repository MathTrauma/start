import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XDimension, XCircle, XAngleMarker, XRightAngle } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '265';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

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
        let A, B, C, O, X, Y, P;
        const R = 6;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 도형: 원 ω (중심 O, 반지름 6)
            O = p.createVector(0, 0);
            X = p.createVector(0, 6);
            Y = p.createVector(0, -6);
            // B(6:210°), C(6:-30°)
            B = p.createVector(R * Math.cos(p.radians(210)), R * Math.sin(p.radians(210)));
            C = p.createVector(R * Math.cos(p.radians(-30)), R * Math.sin(p.radians(-30)));
            // A: ω 위에서 AX = 4, x 좌표 양수 → y = 14/3, x = √(36 - (14/3)²)
            const yA = 14 / 3;
            A = p.createVector(Math.sqrt(R * R - yA * yA), yA);

            // P: 선분 AY 와 원 O_2(중심 Y, 반지름 6)의 교점 (선분 위, A 쪽)
            // 직선 AY 위의 점을 A + t(Y-A) 로 두면 (1-t)²·|AY|² = 6² → t = 1 - 6/|AY|
            const AY = p5.Vector.sub(Y, A);
            P = p5.Vector.add(A, p5.Vector.mult(AY, 1 - R / AY.mag()));

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            // 원 ω 전체가 보이도록 바운딩에 원의 상하좌우 극점 포함
            animator.initViewport([
                A, B, C, X, Y,
                p.createVector(R, 0), p.createVector(-R, 0)
            ], size);

            // ===== Problem Phase 1 (첫 장면) =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'circleOmega', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 0.8 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                { id: 'dimBC', object: new XDimension(p, B, C, '6\\sqrt{3}', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.8 } }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                { id: 'segAY', object: XSegment(p, A, Y), animate: { mode: 'draw', duration: 0.7 } },
                { id: 'ptP', object: new XPoint(p, P, 'P', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.2 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'segPB', object: XSegment(p, P, B), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segPC', object: XSegment(p, P, C), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.2 },
                { id: 'angleBPC', object: new XAngleMarker(p, B, P, C, { marker: '120°' }), animate: { mode: 'draw', duration: 0.6 } }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'segAX', object: XSegment(p, A, X), animate: { mode: 'draw', duration: 0.5 } },
                {
                    group: [
                        { id: 'rightXAY', object: new XRightAngle(p, X, A, Y, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'ptX', object: new XPoint(p, X, 'X', { center }), animate: { mode: 'draw', duration: 0.2 } }
                    ],
                    parallel: true
                },
                { id: 'segXY', object: XSegment(p, X, Y, { dashed: true }), animate: { mode: 'draw', duration: 0.7 } },
                { delay: 0.3 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
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
