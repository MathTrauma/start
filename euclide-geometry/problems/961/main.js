/**
 * Problem 961 — main.js (자체 렌더링 방식)
 * mount(container, opts) / destroy() 인터페이스
 */
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XSegmentMarker, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

// --- mount / destroy ---

export function mount(container, opts = {}) {
    const pid = opts.problemId || '961';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L9</span>
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

function setupControls(animator, phaseNames, solutionBasePhases) {
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
                    ? [...solutionBasePhases, ...phaseNames.solution]
                    : phaseNames[currentMode];
                const startIdx = currentMode === 'solution'
                    ? solutionBasePhases.length + (phase - 1)
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
            solutionBasePhases.forEach(ph => animator.applyPhaseObjects(ph));
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
        const phaseNames = { problem: [], solution: [] };

        const syncVertices = (obj, ...vecs) => {
            if (!obj) return;
            vecs.forEach((v, i) => { if (obj.vertices && obj.vertices[i]) obj.vertices[i].set(v); });
            if (obj._perimeterDirty !== undefined) obj._perimeterDirty = true;
        };

        p.setup = function () {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점
            const O = p.createVector(0, 0);
            const r = 2;
            const A = p.createVector(0, 4);
            const B = p.createVector(r * Math.cos(150 * Math.PI / 180), r * Math.sin(150 * Math.PI / 180));
            const C = p.createVector(r * Math.cos(30 * Math.PI / 180), r * Math.sin(30 * Math.PI / 180));
            const G = p.createVector(0, 2);
            const S = p.createVector(0, -2);

            // 계산된 점
            const D = p5.Vector.add(B, C).mult(0.5);
            const E = p5.Vector.add(C, A).mult(0.5);
            const F = p5.Vector.add(A, B).mult(0.5);

            // P: 동적 점 (초기 위치 = B)
            const P = B.copy();
            const G1 = p.createVector(0, 0);
            const G2 = p.createVector(0, 0);

            function recomputeAll() {
                G1.set((A.x + B.x + P.x) / 3, (A.y + B.y + P.y) / 3);
                G2.set((A.x + C.x + P.x) / 3, (A.y + C.y + P.y) / 3);
            }
            recomputeAll();

            const center = p.createVector(0, 1.5);

            // Animator
            animator = new XAnimator(p);
            animator.initViewport([A, B, C, S], size);

            // 이동 애니메이션 각도
            const startAngleP = 210 * Math.PI / 180;
            const endAngleP = 330 * Math.PI / 180;

            // _driver 객체
            const driverObj = {
                visible: false, progress: 0, mode: 'default',
                frameCallback: null,
                reset: function () { this.progress = 0; this.frameCallback = null; },
                render: () => {}
            };

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'ptO', object: new XPoint(p, O, 'O', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'circO', object: XCircle(p, O, r), animate: { mode: 'draw', duration: 1.6 } },
                { id: 'ptA', object: new XPoint(p, A, 'A', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'segAB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'segBC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 1.1 } },
                { id: 'ptG', object: new XPoint(p, G, 'G', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                { delay: 0.5 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                { id: 'ptP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'segAP', object: XSegment(p, A, P, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segBP', object: XSegment(p, B, P, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segCP', object: XSegment(p, C, P, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                { id: 'segG1G2', object: XSegment(p, G1, G2), animate: { mode: 'draw', duration: 1.0 } },
                {
                    group: [
                        { id: 'ptG1', object: new XPoint(p, G1, 'G₁', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptG2', object: new XPoint(p, G2, 'G₂', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // P를 원 위로 이동 (210° → 330°)
                {
                    group: [
                        { id: '_driver', object: driverObj, animate: { mode: 'default', duration: 4.0, from: 0, to: 1 } },
                        { id: '_driver', setFrameCallback: function () {
                            const prg = animator.get('_driver').progress;
                            const angle = startAngleP + (endAngleP - startAngleP) * prg;
                            P.set(r * Math.cos(angle), r * Math.sin(angle));
                            recomputeAll();
                        }},
                        { id: 'ptP', setFrameCallback: (obj) => { obj.pos.set(P.x, P.y); } },
                        { id: 'ptG1', setFrameCallback: (obj) => { obj.pos.set(G1.x, G1.y); } },
                        { id: 'ptG2', setFrameCallback: (obj) => { obj.pos.set(G2.x, G2.y); } },
                        { id: 'segAP', setFrameCallback: (obj) => syncVertices(obj, A, P) },
                        { id: 'segBP', setFrameCallback: (obj) => syncVertices(obj, B, P) },
                        { id: 'segCP', setFrameCallback: (obj) => syncVertices(obj, C, P) },
                        { id: 'segG1G2', setFrameCallback: (obj) => syncVertices(obj, G1, G2) }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            // 문제 1단계 완료 상태에서 시작 (phase 2 미적용)
            animator.registerPhase('solution1', [
                { id: 'segAD', object: XSegment(p, A, D, { dashed: true }), animate: { mode: 'draw', duration: 1.0 } },
                {
                    group: [
                        { id: 'ptG', animate: { mode: 'pulse', duration: 1.8 } },
                        { id: 'circO', animate: { mode: 'pulse', duration: 1.8 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                {
                    group: [
                        { id: 'segGB', object: XSegment(p, G, B), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'segGC', object: XSegment(p, G, C), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'markGB', object: new XSegmentMarker(p, G, B, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'markGC', object: new XSegmentMarker(p, G, C, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'angleGCB', object: new XAngleMarker(p, G, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'angleCBG', object: new XAngleMarker(p, C, B, G, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'segBE', object: XSegment(p, B, E), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'segCF', object: XSegment(p, C, F), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { id: 'angleACG', object: new XAngleMarker(p, A, C, G, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                {
                    group: [
                        {
                            group: [
                                { id: 'angleACG', animate: { mode: 'pulse', duration: 1.5 } },
                                { id: 'angleCBG', animate: { mode: 'pulse', duration: 1.5 } }
                            ],
                            parallel: true
                        },
                        { id: 'text1', object: new XText(p, [20, 25], '접현각',
                            { fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                          animate: { mode: 'draw', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1'];

            // 풀이 모드에서는 problem1만 적용 (problem2 제외)
            const solutionBasePhases = ['problem1'];

            setupControls(animator, phaseNames, solutionBasePhases);
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
