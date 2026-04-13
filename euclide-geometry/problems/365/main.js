/**
 * Problem 365 — main.js (자체 렌더링 방식)
 * mount(container, opts) / destroy() 인터페이스
 */
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XDimension, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

// --- mount / destroy ---

export function mount(container, opts = {}) {
    const pid = opts.problemId || '365';

    // 기존 viewer DOM 재활용
    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');
    const solutionScroll = document.getElementById('solution-scroll-container');

    // 문제 텍스트
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

    // 풀이 텍스트 (초기에는 숨김)
    if (solutionText) {
        loadSolutionHtml(pid);
    }
    if (solutionContainer) solutionContainer.classList.add('hidden');

    // 캔버스
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

const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const WORKER_BASE = 'https://euclide-worker.painfultrauma.workers.dev';

function getBaseUrl() {
    return isLocal ? '.' : WORKER_BASE;
}

async function getAuthHeaders() {
    const headers = {};
    if (!isLocal && typeof window.supabaseClient !== 'undefined') {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
        } catch { /* ignore */ }
    }
    return headers;
}

async function loadHtml(pid, file, targetId) {
    try {
        const url = `${getBaseUrl()}/problems/${pid}/${file}`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(res.status);
        document.getElementById(targetId).innerHTML = await res.text();
    } catch {
        document.getElementById(targetId).textContent = '문제를 불러올 수 없습니다.';
    }
}

async function loadSolutionHtml(pid) {
    try {
        const url = `${getBaseUrl()}/problems/${pid}/solution.html`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers });
        if (res.ok) {
            document.getElementById('solution-text').innerHTML = await res.text();
        }
    } catch { /* 풀이 없음 — 무시 */ }
}

// --- Controls 초기화 (UIController 사용) ---

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

function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

function createSketch(pid) {
    return (p) => {
        let animator, size;
        let A, B, C, D, P, O, r;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점 (극좌표)
            A = p.createVector(2 * Math.cos(72 * Math.PI / 180), 2 * Math.sin(72 * Math.PI / 180));
            B = p.createVector(2 * Math.cos(200 * Math.PI / 180), 2 * Math.sin(200 * Math.PI / 180));
            C = p.createVector(2 * Math.cos(-20 * Math.PI / 180), 2 * Math.sin(-20 * Math.PI / 180));

            // D: AB 위, AD:DB = 1:3
            D = p5.Vector.add(p5.Vector.mult(A, 3), p5.Vector.mult(B, 1)).mult(1 / 4);

            // 외접원
            O = getCircumcenter(A, B, C);
            r = p5.Vector.dist(O, A);

            // P: ∠PDA = ∠ACB
            const CA = p5.Vector.sub(A, C);
            const CB = p5.Vector.sub(B, C);
            const angleACB = Math.acos(p5.Vector.dot(CA, CB) / (CA.mag() * CB.mag()));

            const angleAOnCircle = Math.atan2(A.y - O.y, A.x - O.x);
            const angleCOnCircle = Math.atan2(C.y - O.y, C.x - O.x);

            let bestT = 0, bestErr = Infinity;
            for (let i = 0; i <= 1000; i++) {
                const t = i / 1000;
                const theta = angleCOnCircle + t * normalizeAngle(angleAOnCircle - angleCOnCircle);
                const pv = p.createVector(O.x + r * Math.cos(theta), O.y + r * Math.sin(theta));
                const DP = p5.Vector.sub(pv, D);
                const DA = p5.Vector.sub(A, D);
                const anglePDA = Math.acos(Math.min(1, Math.max(-1, p5.Vector.dot(DP, DA) / (DP.mag() * DA.mag()))));
                const err = Math.abs(anglePDA - angleACB);
                if (err < bestErr) { bestErr = err; bestT = theta; }
            }
            P = p.createVector(O.x + r * Math.cos(bestT), O.y + r * Math.sin(bestT));

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            // duplicate 이동 헬퍼
            const createDupTranslatorFactory = (sharedPts, origPts, dxScreen, dyScreen, duration) => {
                return () => {
                    let elapsed = 0, lastTime = null;
                    const scale = p.geometryScale;
                    const dxMath = dxScreen / scale;
                    const dyMath = dyScreen / scale;
                    return (obj) => {
                        const now = performance.now();
                        if (!lastTime) lastTime = now;
                        elapsed += (now - lastTime) / 1000;
                        lastTime = now;
                        const t = Math.min(1, elapsed / duration);
                        sharedPts.forEach((pt, i) => {
                            pt.x = origPts[i].x + dxMath * t;
                            pt.y = origPts[i].y + dyMath * t;
                        });
                        sharedPts.forEach((pt, i) => {
                            if (obj.vertices && obj.vertices[i]) {
                                obj.vertices[i].x = pt.x;
                                obj.vertices[i].y = pt.y;
                            }
                        });
                        if (obj.vertices) obj._perimeterDirty = true;
                        if (t >= 1) obj.frameCallback = null;
                    };
                };
            };

            // clone 준비
            const dA1 = A.copy(), dD1 = D.copy(), dP1 = P.copy();
            const orig1 = [A.copy(), D.copy(), P.copy()];
            const movFactory1 = createDupTranslatorFactory([dA1, dD1, dP1], orig1, -100, 0, 1.5);

            const dA2 = A.copy(), dP2 = P.copy(), dB2 = B.copy();
            const orig2 = [A.copy(), P.copy(), B.copy()];
            const movFactory2 = createDupTranslatorFactory([dA2, dP2, dB2], orig2, 20, -10, 1.5);

            // Animator
            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, P], size);

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
                { delay: 0.5 },
                { id: 'circO', object: XCircle(p, O, r), animate: { mode: 'draw', duration: 1.8 } },
                { id: 'segDP', object: XSegment(p, D, P), animate: { mode: 'draw', duration: 1.2 } },
                {
                    group: [
                        { id: 'ptD', object: new XPoint(p, D, 'D', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptP', object: new XPoint(p, P, 'P', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'anglePDA', object: new XAngleMarker(p, P, D, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                { id: 'dimDP', object: new XDimension(p, D, P, '3', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                {
                    group: [
                        { id: 'dimDA', object: new XDimension(p, D, A, 'k', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'dimBA', object: new XDimension(p, B, A, '4k', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { action: 'fade', targets: ['dimDP', 'dimDA', 'dimBA'], opacity: 0.3, duration: 0.6 },
                {
                    group: [
                        { id: 'segBP', object: XSegment(p, B, P), animate: { mode: 'draw', duration: 1.3 } },
                        { id: 'segAP', object: XSegment(p, A, P), animate: { mode: 'draw', duration: 1.3 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'angleACB', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'angleAPB', object: new XAngleMarker(p, A, P, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                        {
                            group: [
                                { delay: 1.0 },
                                { id: 'angleAPB', animate: { mode: 'pulse', duration: 1.2 } }
                            ],
                            parallel: false
                        }
                    ],
                    parallel: true
                },
                { delay: 0.7 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                { id: 'angleDAP', object: new XAngleMarker(p, B, A, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                { action: 'fadeAll', opacity: 0.3, duration: 0.7 },
                {
                    group: [
                        { id: 't1_tri', object: new XPolygon(p, [dA1, dD1, dP1], { color: COLORS.green }), action: 'show' },
                        { id: 't1_anglePDA', object: new XAngleMarker(p, dP1, dD1, dA1, { marker: 'circle', color: COLORS.green }), action: 'show' },
                        { id: 't1_angleDAP', object: new XAngleMarker(p, dD1, dA1, dP1, { marker: 'triangle', color: COLORS.green }), action: 'show' },
                        { id: 't1_tri', setFrameCallbackFactory: movFactory1 },
                        { id: 't2_tri', object: new XPolygon(p, [dA2, dP2, dB2], { color: COLORS.yellow }), action: 'show' },
                        { id: 't2_angleAPB', object: new XAngleMarker(p, dA2, dP2, dB2, { marker: 'circle', color: COLORS.yellow }), action: 'show' },
                        { id: 't2_angleBAP', object: new XAngleMarker(p, dB2, dA2, dP2, { marker: 'triangle', color: COLORS.yellow }), action: 'show' },
                        { id: 't2_tri', setFrameCallbackFactory: movFactory2 }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                {
                    group: [
                        { id: 't1_tri', animate: { mode: 'travel', duration: 1.8 } },
                        { id: 't2_tri', animate: { mode: 'travel', duration: 1.8 } },
                        { id: 'text1', object: new XText(p, [20, 25], '\\triangle ADP \\sim \\triangle APB',
                            { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                          animate: { mode: 'draw', duration: 1.8 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 3 =====
            animator.registerPhase('solution3', [
                {
                    group: [
                        { id: 't1_tri', action: 'remove' },
                        { id: 't1_anglePDA', action: 'remove' },
                        { id: 't1_angleDAP', action: 'remove' },
                        { id: 't2_tri', action: 'remove' },
                        { id: 't2_angleAPB', action: 'remove' },
                        { id: 't2_angleBAP', action: 'remove' },
                        { action: 'fadeAll', opacity: 1, duration: 0.6 }
                    ],
                    parallel: true
                },
                { id: 'fillADP', object: new XPolygon(p, [A, D, P], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } },
                { delay: 0.3 },
                { id: 'fillAPB', object: new XPolygon(p, [A, P, B], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'dimDP', animate: { mode: 'pulse', duration: 2.0 } },
                        {
                            group: [
                                { id: 'dimBP', object: new XDimension(p, B, P, 'x', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                                { id: 'dimBP', animate: { mode: 'pulse', duration: 0.8 } }
                            ],
                            parallel: false
                        }
                    ],
                    parallel: true
                },
                { id: 'text2', object: new XText(p, [20, 50], '넓이비 ↔ 밑변길이비 ↔ 닮음제곱비',
                    { fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                  animate: { mode: 'draw', duration: 1.5 } },
                { delay: 2.0 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1', 'solution2', 'solution3'];

            // Controls UI (기존 뷰어와 동일한 UIController 사용)
            setupControls(animator, phaseNames);

            // 초기 재생
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
