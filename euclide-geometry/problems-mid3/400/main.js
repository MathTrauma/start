import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XSegment, XPoint, XAngleMarker, XRightAngle, XPolygon, XDimension } from '../../lib/x_object.js';
import { XPopup } from '../../lib/x_popup.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '1400';

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
        const url = `./problems-mid3/400/${file}`;
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
        const url = `./problems-mid3/400/solution.html`;
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
        let A, B, C, D, H, E;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // === 점 정의 ===
            A = p.createVector(0, 5);
            B = p.createVector(0, 0);
            C = p.createVector(10, 0);
            D = p.createVector(4, 8);
            H = p.createVector(4, 0);          // D 에서 BC 에 내린 수선의 발

            // E = 대각선 AC 와 수선 DH 의 교점 (DH 는 x = H.x 위의 수직선)
            const t = (H.x - A.x) / (C.x - A.x);
            E = p.createVector(H.x, A.y + t * (C.y - A.y));

            const center = p.createVector((A.x + B.x + C.x + D.x) / 4, (A.y + B.y + C.y + D.y) / 4);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D], size);

            // ===== Problem Phase 1: 사각형과 두 직각 =====
            animator.registerPhase('problem1', [
                // draw ABCD
                { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 1.2 } },
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
                // draw right angles CBA, ADC
                {
                    group: [
                        { id: 'rightCBA', object: new XRightAngle(p, C, B, A, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'rightADC', object: new XRightAngle(p, A, D, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                // xdim AD[5, up]
                { id: 'dimAD', object: new XDimension(p, A, D, '5', { offset: 10 }), animate: { mode: 'draw', duration: 0.7 } },
                // xdim DC[10, up]
                { id: 'dimDC', object: new XDimension(p, D, C, '10', { offset: 10 }), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 0.5 }
            ]);

            // ===== Problem Phase 2: 각의 이등분선 AC 와 수선 DH =====
            animator.registerPhase('problem2', [
                // draw seg AC
                { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 0.7 } },
                // draw angles DCA, ACB with markt
                {
                    group: [
                        { id: 'angleDCA', object: new XAngleMarker(p, D, C, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // draw seg DH
                { id: 'segDH', object: XSegment(p, D, H), animate: { mode: 'draw', duration: 0.7 } },
                // display H
                { id: 'ptH', object: new XPoint(p, H, 'H', { center }), animate: { mode: 'draw', duration: 0.3 } },
                // draw right angle CHD
                { id: 'rightCHD', object: new XRightAngle(p, C, H, D, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.9 }
            ]);

            // ===== Solution Phase 1: △ABC ≡ △ADC =====
            animator.registerPhase('solution1', [
                // draw triangles CDA, CBA green
                {
                    group: [
                        { id: 'triCDA', object: new XPolygon(p, [C, D, A], { color: COLORS.green }), animate: { mode: 'draw', duration: 0.9 } },
                        { id: 'triCBA', object: new XPolygon(p, [C, B, A], { color: COLORS.green }), animate: { mode: 'draw', duration: 0.9 } }
                    ],
                    parallel: true
                },
                // pulse CDA, CBA || pulse 직각들과 각 DCA, ACB — 두 삼각형의 합동 강조
                {
                    group: [
                        { id: 'triCDA', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'triCBA', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'rightCBA', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'rightADC', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'angleDCA', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'angleACB', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                // draw angles CAD, BAC with markc
                {
                    group: [
                        { id: 'angleCAD', object: new XAngleMarker(p, C, A, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.9 }
            ]);

            // ===== Solution Phase 2: AB ∥ DH 에서 DE = 5 =====
            animator.registerPhase('solution2', [
                // remove green CDA, CBA — 0.4 초에 걸쳐 사라지도록 hide 사용
                {
                    group: [
                        { id: 'triCDA', action: 'hide', duration: 0.4 },
                        { id: 'triCBA', action: 'hide', duration: 0.4 }
                    ],
                    parallel: true
                },
                // display E[above right]
                { id: 'ptE', object: new XPoint(p, E, 'E', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                // AB 는 사각형 외곽선의 일부이므로 pulse 대상 선분을 따로 얹는다
                { id: 'segAB', object: XSegment(p, A, B), action: 'show' },
                // pulse AB, DH — 두 선분이 평행임을 강조
                {
                    group: [
                        { id: 'segAB', animate: { mode: 'pulse', duration: 1.4 } },
                        { id: 'segDH', animate: { mode: 'pulse', duration: 1.4 } }
                    ],
                    parallel: true
                },
                // draw angle DEA with markc
                { id: 'angleDEA', object: new XAngleMarker(p, D, E, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.9 } },
                { delay: 0.8 },
                // xdim DE[5, up]
                { id: 'dimDE', object: new XDimension(p, D, E, '5', { offset: 10 }), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 0.6 }
            ]);

            // ===== Solution Phase 3: 닮음에서 EH = x, HC = 2x =====
            animator.registerPhase('solution3', [
                // xdim EH[x, up]
                { id: 'dimEH', object: new XDimension(p, E, H, 'x', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 0.5 } },
                // xdim HC[2x, down]
                { id: 'dimHC', object: new XDimension(p, H, C, '2x', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 0.7 },
                // popup text
                {
                    id: 'popupAnswer',
                    object: new XPopup(p, '$10^2 = (5+x)^2 + (2x)^2$'),
                    animate: { mode: 'draw', duration: 1.2 }
                }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1', 'solution2', 'solution3'];

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
