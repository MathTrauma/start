/**
 * Problem 115 — main.js (자체 렌더링 방식)
 * mount(container, opts) / destroy() 인터페이스
 */
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { projectPointToLine } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XDimension, XRightAngle, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

// --- mount / destroy ---

export function mount(container, opts = {}) {
    const pid = opts.problemId || '115';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L1</span>
                <span id="main-problem-text">로딩 중...</span>
            </div>
        `;
        loadHtml(pid, 'problem.html', 'main-problem-text');
    }

    if (solutionText) {
        loadSolutionHtml(pid);
    }
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

// --- HTML 로더 ---

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

// --- Controls ---

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

    const config = {
        solutionPhases: phaseNames.solution
    };
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

// --- p5 Sketch ---

function createSketch(pid) {
    return (p) => {
        let animator, size;
        let O, A, B, C, D, H1, H2;
        let lStart, lEnd;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점
            O = p.createVector(0, 0);
            B = p.createVector(-1, 1);
            C = p.createVector(-1, -1);
            D = p.createVector(1, -1);
            A = p.createVector(1, 1);

            // 직선 l: O를 지나고 기울기 1/2
            const lDir = p.createVector(1, 0.5);
            lDir.normalize();

            // H1: A에서 l로의 수선의 발
            H1 = projectPointToLine(A, O, p.createVector(O.x + lDir.x, O.y + lDir.y));
            // H2: B에서 l로의 수선의 발
            H2 = projectPointToLine(B, O, p.createVector(O.x + lDir.x, O.y + lDir.y));

            // 직선 l 확장 (H1, H2 양쪽에서 더 확장)
            const ext = 0.5;
            const minT = Math.min(
                p5.Vector.dot(p5.Vector.sub(H1, O), lDir),
                p5.Vector.dot(p5.Vector.sub(H2, O), lDir)
            );
            const maxT = Math.max(
                p5.Vector.dot(p5.Vector.sub(H1, O), lDir),
                p5.Vector.dot(p5.Vector.sub(H2, O), lDir)
            );
            lStart = p5.Vector.add(O, p5.Vector.mult(lDir, minT - ext));
            lEnd = p5.Vector.add(O, p5.Vector.mult(lDir, maxT + ext));

            const center = O;

            // Animator
            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, H1, H2], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'ptO', object: new XPoint(p, O, 'O', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 1.8 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                { id: 'lineL', object: XSegment(p, lStart, lEnd), animate: { mode: 'draw', duration: 1.5 } },
                {
                    group: [
                        { id: 'segAH1', object: XSegment(p, A, H1), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segBH2', object: XSegment(p, B, H2), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'ptH1', object: new XPoint(p, H1, 'H_1', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptH2', object: new XPoint(p, H2, 'H_2', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'rightAH1H2', object: new XRightAngle(p, A, H1, H2, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'rightH1H2B', object: new XRightAngle(p, H1, H2, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'dimAH1', object: new XDimension(p, A, H1, 'a', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'dimBH2', object: new XDimension(p, B, H2, 'b', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                {
                    group: [
                        { id: 'segAO', object: XSegment(p, A, O), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segBO', object: XSegment(p, B, O), animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { id: 'rightAOB', object: new XRightAngle(p, A, O, B, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                {
                    group: [
                        { id: 'angleH1OA', object: new XAngleMarker(p, H1, O, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'angleBOH2', object: new XAngleMarker(p, B, O, H2, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 },
                { id: 'angleOAH1', object: new XAngleMarker(p, O, A, H1, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
                {
                    group: [
                        { id: 'triAOH1', object: new XPolygon(p, [A, O, H1], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                        { id: 'triAOH1_t', object: new XPolygon(p, [A, O, H1], { color: [0, 0, 0, 0] }), animate: { mode: 'travel', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                { id: 'angleH2BO', object: new XAngleMarker(p, H2, B, O, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                {
                    group: [
                        { id: 'triOBH2', object: new XPolygon(p, [O, B, H2], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                        { id: 'triOBH2_t', object: new XPolygon(p, [O, B, H2], { color: [0, 0, 0, 0] }), animate: { mode: 'travel', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                {
                    group: [
                        { id: 'markAO', object: new XSegmentMarker(p, A, O, { mark: 1 }), animate: { mode: 'draw', duration: 1.1 } },
                        { id: 'markOB', object: new XSegmentMarker(p, O, B, { mark: 1 }), animate: { mode: 'draw', duration: 1.1 } },
                        { id: 'dimOH1', object: new XDimension(p, O, H1, 'b', { offset: -10 }), animate: { mode: 'draw', duration: 1.1 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
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
