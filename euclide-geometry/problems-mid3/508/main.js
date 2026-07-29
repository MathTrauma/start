import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XCircle, XPoint, XRightAngle, XSegmentMarker, XAngleMarker } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '1508';

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
        const url = `./problems-mid3/508/${file}`;
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
        const url = `./problems-mid3/508/solution.html`;
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
        let A, B, C, M;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점: M(0,0) 원점, B(-2,0), C(2,0), A = M에서 거리 2·각 60° (탈레스 → ∠A=90°)
            M = p.createVector(0, 0);
            B = p.createVector(-2, 0);
            C = p.createVector(2, 0);
            A = p.createVector(2 * Math.cos(Math.PI / 3), 2 * Math.sin(Math.PI / 3)); // (1, √3)

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            // bounding box는 A,B,C만 — 외접원은 뷰포트에 반영하지 않음
            animator.initViewport([A, B, C], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 0.9 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'rightBAC', object: new XRightAngle(p, B, A, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'markBM', object: new XSegmentMarker(p, B, M, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markMC', object: new XSegmentMarker(p, M, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'segAM', object: XSegment(p, A, M), animate: { mode: 'draw', duration: 0.6 } },
                { id: 'angleCMA', object: new XAngleMarker(p, C, M, A, { marker: '60°' }), animate: { mode: 'draw', duration: 0.6 } }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                // 외접원 (중심 M, 반지름 2) — 뷰포트 변경 없음
                { id: 'circleCAB', object: XCircle(p, M, 2), animate: { mode: 'draw', duration: 0.9 } },
                { delay: 0.3 },
                { id: 'markMA', object: new XSegmentMarker(p, M, A, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                // MC는 독립 객체가 없으므로 오버레이 선분을 만들어 함께 pulse
                { id: 'segMC', object: XSegment(p, M, C), action: 'show' },
                {
                    group: [
                        { id: 'segAM', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'segMC', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                {
                    group: [
                        { id: 'angleMAC', object: new XAngleMarker(p, M, A, C, { marker: 'star' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleACM', object: new XAngleMarker(p, A, C, M, { marker: 'star' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                }
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
            animator.updateAndDraw();
            p.pop();
        };
    };
}
