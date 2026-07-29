import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getOrthocenter, getCircumcenter, projectPointToLine, intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XDimension, XRightAngle, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '330';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L3</span>
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
        let A, B, C, H, D, E, F, P;
        let O1center, O1r, O2center, O2r; // 외접원 AFH, HFD
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점
            A = p.createVector(3.5, 0.5);
            B = p.createVector(-3.5, 4.0);
            C = p.createVector(-3.5, -5.1);

            // 수심
            H = getOrthocenter(A, B, C);

            // 수선의 발
            D = projectPointToLine(H, B, C);
            E = projectPointToLine(H, C, A);
            F = projectPointToLine(H, A, B);

            // 직선 EF와 직선 AD의 교점 P
            P = intersectLines(E, F, A, D);

            // 외접원 AFH
            O1center = getCircumcenter(A, F, H);
            O1r = p5.Vector.dist(O1center, A);

            // 외접원 HFD
            O2center = getCircumcenter(H, F, D);
            O2r = p5.Vector.dist(O2center, H);

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, E, F, H, P], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
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
                        { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segBE', object: XSegment(p, B, E), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segCF', object: XSegment(p, C, F), animate: { mode: 'draw', duration: 1.0 } }
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
                },
                {
                    group: [
                        { id: 'rightADB', object: new XRightAngle(p, A, D, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'rightAFC', object: new XRightAngle(p, A, F, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'rightAEB', object: new XRightAngle(p, A, E, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                {
                    group: [
                        { id: 'segDE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'segEF', object: XSegment(p, E, F), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'segFD', object: XSegment(p, F, D), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                { id: 'ptH', object: new XPoint(p, H, 'H', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'ptP', object: new XPoint(p, P, 'P', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'dimHD', object: new XDimension(p, H, D, '28', { offset: -10 }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'dimAP', object: new XDimension(p, A, P, '30', { offset: -10 }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'dimPH', object: new XDimension(p, P, H, 'x', { offset: 10 }), animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                // draw angles DAC, CBE with markc
                {
                    group: [
                        { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'angleCBE', object: new XAngleMarker(p, C, B, E, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                // pulse angles DAC, CBE
                {
                    group: [
                        { id: 'angleDAC', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'angleCBE', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 },
                // draw circum circle AFH as O1
                { id: 'circO1', object: XCircle(p, O1center, O1r), animate: { mode: 'draw', duration: 1.3 } },
                // draw angle HFE with markc
                { id: 'angleHFE', object: new XAngleMarker(p, H, F, E, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                // pulse angles DAC, HFE
                {
                    group: [
                        { id: 'angleDAC', animate: { mode: 'pulse', duration: 1.5 } },
                        { id: 'angleHFE', animate: { mode: 'pulse', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // ghost O1 || draw circum circle HFD
                {
                    group: [
                        { id: 'circO1', action: 'fade', opacity: 0.3, duration: 1.3 },
                        { id: 'circO2', object: XCircle(p, O2center, O2r), animate: { mode: 'draw', duration: 1.3 } }
                    ],
                    parallel: true
                },
                // draw angle DFH with markc
                { id: 'angleDFH', object: new XAngleMarker(p, D, F, H, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                // pulse angles CBE, DFH
                {
                    group: [
                        { id: 'angleCBE', animate: { mode: 'pulse', duration: 1.5 } },
                        { id: 'angleDFH', animate: { mode: 'pulse', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                // ghost all except labels, dims, angles HFE, DFH
                {
                    action: 'fadeAll', opacity: 0.3,
                    exclude: [
                        'ptA', 'ptB', 'ptC', 'ptD', 'ptE', 'ptF', 'ptH', 'ptP',
                        'dimHD', 'dimAP', 'dimPH',
                        'angleHFE', 'angleDFH'
                    ],
                    duration: 0.3
                },
                // draw triangle EDP || draw seg EH
                {
                    group: [
                        { id: 'triFDP', object: new XPolygon(p, [F, D, P], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segFH', object: XSegment(p, F, H), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                // text (lower right)
                { id: 'text1', object: new XText(p, [size - 20, size - 25], '\\overline{FD} : \\overline{FP} = 28 : x',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.RIGHT }),
                  animate: { mode: 'draw', duration: 1.5 } },
                { delay: 1.5 }
            ]);

            // text1을 위로 밀어올리는 헬퍼
            const createTextSlideUpFactory = (targetY, duration) => {
                return () => {
                    let elapsed = 0, lastTime = null, startY = null;
                    return (obj) => {
                        if (startY === null) startY = obj.pos.y;
                        const now = performance.now();
                        if (!lastTime) lastTime = now;
                        elapsed += (now - lastTime) / 1000;
                        lastTime = now;
                        const t = Math.min(1, elapsed / duration);
                        const ease = 1 - Math.pow(1 - t, 3);
                        obj.pos.y = startY + (targetY - startY) * ease;
                        if (t >= 1) obj.frameCallback = null;
                    };
                };
            };

            // ===== Solution Phase 3 =====
            // extend DF through F by 40% → X (no label)
            const dirDF = p5.Vector.sub(F, D);
            const X = p5.Vector.add(F, p5.Vector.mult(dirDF, 0.4));

            animator.registerPhase('solution3', [
                // extend segment DF through F
                { id: 'segDX', object: XSegment(p, D, X, { dashed: true }), animate: { mode: 'draw', duration: 0.8 } },
                // restore right angle AFC
                { id: 'rightAFC', action: 'recover', duration: 0.2 },
                // draw angles EFA, AFX with markt
                {
                    group: [
                        { id: 'angleEFA', object: new XAngleMarker(p, E, F, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'angleAFX', object: new XAngleMarker(p, A, F, X, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                // pulse angles EFA, AFX
                {
                    group: [
                        { id: 'angleEFA', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'angleAFX', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                // text1 slides up, text2 appears at lower right
                {
                    group: [
                        { id: 'text1', setFrameCallbackFactory: createTextSlideUpFactory(size - 50, 0.5) },
                        { id: 'text2', object: new XText(p, [size - 20, size - 25], '\\overline{FD} : \\overline{FP} = (x+58) : 30',
                            { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.RIGHT }),
                          animate: { mode: 'draw', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1', 'solution2', 'solution3'];

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
