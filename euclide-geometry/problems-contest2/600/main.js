/**
 * Problem 460 — main.js (자체 렌더링 방식)
 * mount(container, opts) / destroy() 인터페이스
 * Contest 문제: 그림 보기 1 (AB < AC) / 그림 보기 2 (AB > AC) 두 가지 배치 제공
 */
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XSegmentMarker, XRightAngle, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;
let currentVariant = null; // 1: AB < AC, 2: AB > AC

// --- mount / destroy ---

export function mount(container, opts = {}) {
    const pid = opts.problemId || '460';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L4</span>
                <span class="problem-tag contest">Contest</span>
                <span id="main-problem-text">로딩 중...</span>
                <button id="btn-canvas-1" class="toggle-canvas-btn">▼ 그림 보기 1</button>
                <button id="btn-canvas-2" class="toggle-canvas-btn">▼ 그림 보기 2</button>
            </div>
        `;
        loadHtml(pid, 'problem.html', 'main-problem-text');
    }

    const solutionText = document.getElementById('solution-text');
    if (solutionText) loadHtml(pid, 'solution.html', 'solution-text');
    if (solutionContainer) solutionContainer.classList.add('hidden');

    // Contest: 캔버스는 그림 보기 버튼을 눌러야 표시
    if (canvasWrapper) canvasWrapper.style.display = 'none';

    document.getElementById('btn-canvas-1')?.addEventListener('click', () => toggleVariant(pid, 1));
    document.getElementById('btn-canvas-2')?.addEventListener('click', () => toggleVariant(pid, 2));
}

export function destroy() {
    destroySketch();
    currentVariant = null;
    const canvasWrapper = document.getElementById('canvas-wrapper');
    if (canvasWrapper) canvasWrapper.style.display = '';
}

// --- 그림 보기 1/2 토글 ---

function toggleVariant(pid, variant) {
    const canvasWrapper = document.getElementById('canvas-wrapper');
    if (!canvasWrapper) return;

    if (currentVariant === variant) {
        // 같은 버튼 재클릭 → 숨기기
        destroySketch();
        currentVariant = null;
        canvasWrapper.style.display = 'none';
        updateToggleButtons();
        return;
    }

    // 다른 배치로 전환 (기존 스케치 제거 후 재생성)
    destroySketch();
    currentVariant = variant;
    canvasWrapper.style.display = 'block';
    canvasWrapper.style.opacity = '1';
    canvasWrapper.style.visibility = 'visible';
    p5Instance = new p5(createSketch(pid, variant), 'canvas-wrapper');
    updateToggleButtons();
}

function updateToggleButtons() {
    [1, 2].forEach(v => {
        const btn = document.getElementById(`btn-canvas-${v}`);
        if (btn) {
            btn.textContent = currentVariant === v ? `▲ 그림 숨기기 ${v}` : `▼ 그림 보기 ${v}`;
        }
    });
}

function destroySketch() {
    if (p5Instance) {
        p5Instance.remove();
        p5Instance = null;
    }
    uiController = null;
    const controlsEl = document.getElementById('controls-container');
    if (controlsEl) controlsEl.remove();
    const solutionContainer = document.getElementById('solution-container');
    if (solutionContainer) solutionContainer.classList.add('hidden');
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

function createSketch(pid, variant) {
    return (p) => {
        let animator, size;
        const phaseNames = { problem: [], solution: [] };

        // 세 점의 외심
        function circumcenter(P1, P2, P3) {
            const ax = P1.x, ay = P1.y, bx = P2.x, by = P2.y, cx = P3.x, cy = P3.y;
            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
            const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
            return p.createVector(ux, uy);
        }

        p.setup = function () {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본점 (variant 1: AB < AC, variant 2: AB > AC)
            const B = p.createVector(-4, 0);
            const C = p.createVector(4, 0);
            const M = p.createVector(0, 0);
            const A = p.createVector(variant === 1 ? -1 : 1, 5);

            // 계산된 점
            const D = p.createVector(A.x, 0);              // A에서 BC에 내린 수선의 발
            const Q = p.createVector(-A.x, 0);             // D의 M 대칭점 = 외접원과 BC의 두 번째 교점
            const N = p5.Vector.add(A, Q).mult(0.5);       // AQ의 중점
            const u = A.copy().normalize();                // 직선 AM 방향 (M이 원점)
            const P = u.copy().mult(p5.Vector.dot(C, u));  // C의 직선 AM 위 정사영
            const O = circumcenter(A, B, Q);               // 외접원 ABP = ABQ의 외심
            const r = p5.Vector.dist(O, B);
            const O2 = p5.Vector.add(A, C).mult(0.5);      // 공원점 A,D,P,C의 외심 (∠ADC = 90° → AC가 지름)
            const r2 = p5.Vector.dist(A, C) / 2;

            // 직선 AM: A에서 M/P 중 먼 쪽까지 그린다
            const lineEnd = p5.Vector.dist(A, P) > p5.Vector.dist(A, M) ? P : M;

            // 점 라벨 바깥 방향 기준점 (삼각형 무게중심)
            const cen = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            // Animator (외접원 상하단까지 뷰포트에 포함)
            const circTop = p.createVector(O.x, O.y + r);
            const circBot = p.createVector(O.x, O.y - r);
            animator = new XAnimator(p);
            animator.initViewport([A, B, C, circTop, circBot], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                { id: 'ptM', object: new XPoint(p, M, 'M', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'segAL', object: XSegment(p, A, lineEnd), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'segCP', object: XSegment(p, C, P), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'ptP', object: new XPoint(p, P, 'P', { center: cen }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'rightCPM', object: new XRightAngle(p, C, P, M, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 1.0 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                { id: 'circABP', object: XCircle(p, O, r, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 2.0 } },
                { id: 'ptQ', object: new XPoint(p, Q, 'Q', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'ptB', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: 'ptQ', animate: { mode: 'pulse', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                { id: 'segAQ', object: XSegment(p, A, Q), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'ptN', object: new XPoint(p, N, 'N', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'markNA', object: new XSegmentMarker(p, N, A, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'markNQ', object: new XSegmentMarker(p, N, Q, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                {
                    group: [
                        { id: 'segNB', object: XSegment(p, N, B, { color: COLORS.green, dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'segNC', object: XSegment(p, N, C, { color: COLORS.green, dashed: true }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 1 : 점 M의 방멱 =====
            animator.registerPhase('solution1', [
                { id: 'ptM', animate: { mode: 'pulse', duration: 0.8 } },
                {
                    group: [
                        { id: 'segMB', object: XSegment(p, M, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segMQ', object: XSegment(p, M, Q, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segMP', object: XSegment(p, M, P, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'segMA', object: XSegment(p, M, A, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { id: 'text1', object: new XText(p, [20, 25], '점 M의 방멱',
                    { fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 0.8 } },
                { id: 'text2', object: new XText(p, [20, 50], '\\overline{MB} \\cdot \\overline{MQ} = \\overline{MA} \\cdot \\overline{MP}',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.2 } },
                { delay: 1.0 },
                {
                    group: [
                        { id: 'markMB', object: new XSegmentMarker(p, M, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'markMC', object: new XSegmentMarker(p, M, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 2 : 공원점 A,D,P,C로 MQ = MD =====
            animator.registerPhase('solution2', [
                { id: 'segAD', object: XSegment(p, A, D, { dashed: true }), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'ptD', object: new XPoint(p, D, 'D', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'rightADC', object: new XRightAngle(p, A, D, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.5 },
                { action: 'addToBounds', points: [p.createVector(O2.x, O2.y + r2), p.createVector(O2.x, O2.y - r2)], duration: 0.8 },
                { id: 'circADPC', object: XCircle(p, O2, r2, { color: COLORS.cyan, dashed: true }), animate: { mode: 'draw', duration: 1.8 } },
                {
                    group: [
                        { id: 'rightADC', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'rightCPM', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { id: 'text4', object: new XText(p, [20, 75], '∠ADC = ∠APC = 90° ⇒ A, D, P, C 공원점',
                    { fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.2 } },
                { delay: 1.5 },
                { id: 'text5', object: new XText(p, [20, 100], '\\overline{MA} \\cdot \\overline{MP} = \\overline{MC} \\cdot \\overline{MD} \\;\\Rightarrow\\; \\overline{MD} = \\overline{MQ} \\;\\; (\\because\\; \\overline{MB} = \\overline{MC})',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.2 } },
                { id: 'circADPC', action: 'hide', duration: 0.6 },
                {
                    group: [
                        { id: 'markMD', object: new XSegmentMarker(p, M, D, { mark: 3 }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'markMQ', object: new XSegmentMarker(p, M, Q, { mark: 3 }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 3 : 중위선 → 수직이등분선 =====
            animator.registerPhase('solution3', [
                {
                    group: [
                        { id: 'markMD', animate: { mode: 'pulse', duration: 1.0 } },
                        { id: 'markMQ', animate: { mode: 'pulse', duration: 1.0 } }
                    ],
                    parallel: true
                },
                { id: 'segNM', object: XSegment(p, N, M, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'rightNMC', object: new XRightAngle(p, N, M, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                { id: 'text6', object: new XText(p, [20, 125], 'MN \\parallel AD \\;\\Rightarrow\\; MN \\perp BC',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.4 } },
                { delay: 1.0 },
                {
                    group: [
                        { id: 'segNB', animate: { mode: 'pulse', duration: 1.5 } },
                        { id: 'segNC', animate: { mode: 'pulse', duration: 1.5 } }
                    ],
                    parallel: true
                },
                { id: 'text7', object: new XText(p, [20, 150], '\\therefore\\; \\overline{NB} = \\overline{NC} \\;\\blacksquare',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.4 } },
                { delay: 2.0 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1', 'solution2', 'solution3'];

            // 풀이 모드는 문제 그림 전체 위에서 시작
            const solutionBasePhases = ['problem1', 'problem2'];

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
