import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPoint, XAngleMarker, XRightAngle, XPolygon, XDimension } from '../../lib/x_object.js';
import { XPopup } from '../../lib/x_popup.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '1080';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">중3</span>
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
    document.querySelectorAll('.canvas-popup').forEach(el => el.remove());
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
        const url = `./problems-mid3/080/${file}`;
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
        const url = `./problems-mid3/080/solution.html`;
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
        let A, B, C, D, E, F;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // === 점 정의 ===
            const s3 = Math.sqrt(3);
            A = p.createVector(0, s3);
            B = p.createVector(0, 0);
            C = p.createVector(1 + s3, 0);
            D = p.createVector(1 + s3, s3);
            E = p.createVector(0, 1);          // AB 위의 점
            F = p.createVector(1, 0);          // BC 위의 점

            const center = p.createVector((1 + s3) / 2, s3 / 2);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                // draw polygon ABCD
                { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 1.3 } },
                // display A,B,C,D
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // draw EFD thick yellow — 이후 pulse/travel 대상인 삼각형 DFE 와 같은 객체
                {
                    id: 'triEFD',
                    object: new XPolygon(p, [E, F, D], { color: COLORS.yellow, weight: 3 }),
                    animate: { mode: 'draw', duration: 1.0 }
                },
                // display E,F (D 는 위에서 이미 표시됨)
                {
                    group: [
                        { id: 'ptE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // draw angle BEF with marker 45°
                { id: 'angleBEF', object: new XAngleMarker(p, B, E, F, { marker: '45°' }), animate: { mode: 'draw', duration: 0.6 } },
                // draw right angle DFE
                { id: 'rightDFE', object: new XRightAngle(p, D, F, E, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                // draw angle EDF with marker 30° — 좁은 각이라 멀리 빼서 크게
                { id: 'angleEDF', object: new XAngleMarker(p, E, D, F, { marker: '30°', size: 19, arcSize: 55 }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.4 },
                // xdim FD[√6, down]
                { id: 'dimFD', object: new XDimension(p, F, D, '\\sqrt{6}', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.7 } }
            ]);

            // ===== Solution Phase 1: 두 직각이등변삼각형 =====
            animator.registerPhase('solution1', [
                // draw angle EFB with marker 45°
                { id: 'angleEFB', object: new XAngleMarker(p, E, F, B, { marker: '45°' }), animate: { mode: 'draw', duration: 0.5 } },
                // draw angle CFD with marker 45°
                { id: 'angleCFD', object: new XAngleMarker(p, C, F, D, { marker: '45°' }), animate: { mode: 'draw', duration: 0.5 } },
                // draw angle FDC with marker 45°
                { id: 'angleFDC', object: new XAngleMarker(p, F, D, C, { marker: '45°' }), animate: { mode: 'draw', duration: 0.5 } },
                { delay: 0.9 },
                // xdim FC[√3, down], CD[√3, down]
                {
                    group: [
                        { id: 'dimFC', object: new XDimension(p, F, C, '\\sqrt{3}', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'dimCD', object: new XDimension(p, C, D, '\\sqrt{3}', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                // pulse triangle DFE
                { id: 'triEFD', animate: { mode: 'pulse', duration: 1.2 } },
                // xdim EF[√2, up]
                { id: 'dimEF', object: new XDimension(p, E, F, '\\sqrt{2}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.5 },
                // xdim BF[1, down]
                { id: 'dimBF', object: new XDimension(p, B, F, '1', { offset: -10 }), animate: { mode: 'draw', duration: 0.5 } }
            ]);

            // ===== Solution Phase 2: DE 를 구해 cos 15° =====
            animator.registerPhase('solution2', [
                // travel triangle DFE
                { id: 'triEFD', animate: { mode: 'travel', duration: 1.2 } },
                // xdim ED[2√2, up]
                { id: 'dimED', object: new XDimension(p, E, D, '2\\sqrt{2}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 0.5 } },
                { delay: 0.4 },
                // draw angle ADE with marker 15°
                // 15° 는 라이브러리가 30° 미만 마커를 0.7 배로 줄이므로 size 를 그만큼 키워 잡는다
                { id: 'angleADE', object: new XAngleMarker(p, A, D, E, { marker: '15°', size: 27, arcSize: 85 }), animate: { mode: 'draw', duration: 0.6 } },
                // xdim AD[1+√3, up]
                { id: 'dimAD', object: new XDimension(p, A, D, '1+\\sqrt{3}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 0.7 } },
                // popup text
                {
                    id: 'popupAnswer',
                    object: new XPopup(p, '$\\cos 15^\\circ = \\dfrac{\\overline{DA}}{\\overline{DE}} = \\dfrac{\\sqrt2+\\sqrt6}{4}$'),
                    animate: { mode: 'draw', duration: 0.3 }
                },
                { delay: 1.0 }
            ]);

            phaseNames.problem = ['problem1'];
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
