import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XSegment, XCircle, XPoint, XAngleMarker, XRightAngle, XPolygon, XDimension } from '../../lib/x_object.js';
import { XPopup } from '../../lib/x_popup.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '1100';

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
        const url = `./problems-mid3/100/${file}`;
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
        const url = `./problems-mid3/100/solution.html`;
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
        let A, B, C, D, O, H, X;
        let r;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // === 점 정의 ===
            const s2 = Math.SQRT2;
            A = p.createVector(0, 2);
            B = p.createVector(0, 0);
            C = p.createVector(2, 0);
            D = p.createVector(2, 2);

            // BC, CD 에 접하므로 중심은 대각선 AC 위의 (2-r, r).
            // 사분원(중심 A, 반지름 2)에 외접 → √2(2-r) = 2+r → r = 6-4√2
            r = 6 - 4 * s2;
            O = p.createVector(2 - r, r);
            H = p.createVector(O.x, 0);            // BC 위의 접점
            X = p.createVector(s2, 2 - s2);        // 대각선 AC 와 호 BD 의 교점

            const center = p.createVector(1, 1);

            // 열린 호 헬퍼 (docs/animator.md 의 arc 패턴)
            const createOpenArc = (c, radius, startDeg, endDeg, opts = {}) => {
                const startAngle = startDeg * Math.PI / 180;
                const endAngle = endDeg * Math.PI / 180;
                const segments = opts.segments || 48;
                const vertices = [];
                for (let i = 0; i <= segments; i++) {
                    const a = startAngle + (i / segments) * (endAngle - startAngle);
                    vertices.push(p.createVector(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius));
                }
                return new XPolygon(p, vertices, { ...opts, closed: false });
            };

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                // draw polygon ABCD
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
                // xdim AD[2, up], AB[2, down]
                {
                    group: [
                        { id: 'dimAD', object: new XDimension(p, A, D, '2', { offset: 10 }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'dimAB', object: new XDimension(p, A, B, '2', { offset: -10 }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // draw arc BD (중심 A, 반지름 2) — B 는 A 기준 -90°, D 는 0°
                { id: 'arcBD', object: createOpenArc(A, 2, -90, 0), animate: { mode: 'draw', duration: 0.7 } },
                { delay: 0.3 },
                // draw circle O
                { id: 'circO', object: XCircle(p, O, r), animate: { mode: 'draw', duration: 0.7 } },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 1: 대각선 위의 분할 =====
            animator.registerPhase('solution1', [
                // draw seg AC
                { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 1.0 } },
                // display O
                { id: 'ptO', object: new XPoint(p, O, 'O', { center }), animate: { mode: 'draw', duration: 0.3 } },
                { delay: 0.3 },
                // xdim AX[2, up]
                { id: 'dimAX', object: new XDimension(p, A, X, '2', { offset: 10 }), animate: { mode: 'draw', duration: 0.6 } },
                // xdim XO[r, down]
                { id: 'dimXO', object: new XDimension(p, X, O, 'r', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.5 } },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 2: OC = √2 r =====
            animator.registerPhase('solution2', [
                // draw seg OH
                { id: 'segOH', object: XSegment(p, O, H), animate: { mode: 'draw', duration: 0.6 } },
                // draw right angle CHO
                { id: 'rightCHO', object: new XRightAngle(p, C, H, O, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 },
                // draw angle OCH yellow with marker 45°
                { id: 'angleOCH', object: new XAngleMarker(p, O, C, H, { marker: '45°', color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.6 } },
                // xdim OC[√2 r, up]
                { id: 'dimOC', object: new XDimension(p, O, C, '\\sqrt{2}\\,r', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 0.5 } },
                // popup text
                {
                    id: 'popupAnswer',
                    object: new XPopup(p, '$\\overline{AC} = 2\\sqrt2 = 2 + r + \\sqrt2\\,r$'),
                    animate: { mode: 'draw', duration: 1.0 }
                },
                { delay: 1.5 }
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
