import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XCircle, XPoint, XAngleMarker, XRightAngle, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0293';

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
        const url = `./problems-mid2/293/${file}`;
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
        const url = `./problems-mid2/293/solution.html`;
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
        let A, B, C, D, E, O, R, center;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점
            A = p.createVector(0, 0);
            C = p.createVector(4, 0);

            // B : x=4 (∠ACB=90°), y 음수, ∠BAC=21°
            B = p.createVector(4, -4 * Math.tan(p.radians(21)));

            // D : x=0 (AD // BC), ∠DBC=23° — BC 방향(0,1)을 23° 회전한 반직선과 직선 x=0 의 교점
            const dirBD = p.createVector(-Math.sin(p.radians(23)), Math.cos(p.radians(23)));
            D = intersectLines(B, p5.Vector.add(B, dirBD), A, p.createVector(0, 1));

            E = intersectLines(A, C, B, D);         // AC 와 BD 의 교점
            O = p5.Vector.add(D, E).mult(0.5);      // DE 의 중점 = △DAE 의 외심
            R = p5.Vector.dist(O, A);               // 외접원 반지름

            center = p.createVector((A.x + B.x + C.x + D.x) / 4, (A.y + B.y + C.y + D.y) / 4);

            animator = new XAnimator(p);
            // 외접원이 [A,B,C,D] 박스를 벗어나므로 원의 상하좌우 극점을 뷰포트에 포함
            animator.initViewport([
                A, B, C, D,
                p.createVector(O.x - R, O.y), p.createVector(O.x + R, O.y),
                p.createVector(O.x, O.y - R), p.createVector(O.x, O.y + R)
            ], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { id: 'rightACB', object: new XRightAngle(p, A, C, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'rightCAD', object: new XRightAngle(p, C, A, D, 16, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.5 } },
                { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.5 } },
                { id: 'ptE', object: new XPoint(p, E, 'E', { dx: 12 }), animate: { mode: 'draw', duration: 0.5 } }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'triDAE', object: new XPolygon(p, [D, A, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                { id: 'circO', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 2.0 } },
                {
                    group: [
                        { id: 'ptO', object: new XPoint(p, O, 'O', { center }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'segOA', object: XSegment(p, O, A, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segOE', object: XSegment(p, O, E, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segOD', object: XSegment(p, O, D, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 },
                {
                    group: [
                        { id: 'angleADE', object: new XAngleMarker(p, A, D, E, { marker: 'θ' }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'angleOAD', object: new XAngleMarker(p, O, A, D, { marker: 'θ' }), animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { id: 'angleAOE', object: new XAngleMarker(p, A, O, E, { marker: '2θ' }), animate: { mode: 'draw', duration: 1.2 } },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                { action: 'fadeAll', opacity: 0.3, exclude: ['angleAOE'], duration: 1.5 },
                {
                    group: [
                        { id: 'segAO_g', object: XSegment(p, A, O, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segAB_g', object: XSegment(p, A, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'text1', object: new XText(p, [20, 25], '2\\times \\overline{AB} = \\overline{ED}',
                            { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                          animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'segAO_g', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'segAB_g', animate: { mode: 'pulse', duration: 2.0 } }
                    ],
                    parallel: true
                },
                { id: 'triABO', object: new XPolygon(p, [A, B, O], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                { id: 'angleDBA', object: new XAngleMarker(p, D, B, A, { marker: '2θ' }), animate: { mode: 'draw', duration: 1.2 } },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 3 =====
            animator.registerPhase('solution3', [
                {
                    group: [
                        // fade all[except DBA] — unfade 대상 ADE 는 제외해야 recover 와 충돌하지 않음
                        { action: 'fadeAll', opacity: 0.3, exclude: ['angleDBA', 'angleADE'], duration: 1.0 },
                        { id: 'angleADE', action: 'recover', duration: 1.0 },
                        { id: 'triABO', action: 'remove' }
                    ],
                    parallel: true
                },
                { id: 'triABD', object: new XPolygon(p, [A, B, D]), animate: { mode: 'draw', duration: 2.0 } },
                { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { marker: '111°' }), animate: { mode: 'draw', duration: 2.0 } },
                { id: 'text2', object: new XText(p, [20, 50], '3\\theta + 111^\\circ = 180^\\circ',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.0 } }
            ]);

            phaseNames.problem = ['problem1'];
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
