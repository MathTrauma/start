/**
 * Problem 140 — main.js (자체 렌더링 방식)
 * mount(container, opts) / destroy() 인터페이스
 */
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XDimension, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

// --- mount / destroy ---

export function mount(container, opts = {}) {
    const pid = opts.problemId || '140';

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

async function loadHtml(pid, file, targetId) {
    try {
        const url = `./problems/${pid}/${file}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        document.getElementById(targetId).innerHTML = await res.text();
    } catch {
        document.getElementById(targetId).textContent = '문제를 불러올 수 없습니다.';
    }
}

async function loadSolutionHtml(pid) {
    try {
        const url = `./problems/${pid}/solution.html`;
        const res = await fetch(url);
        if (res.ok) {
            document.getElementById('solution-text').innerHTML = await res.text();
        }
    } catch { /* 풀이 없음 — 무시 */ }
}

// --- Controls (UIController) ---

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

// --- p5 Sketch ---

function createSketch(pid) {
    return (p) => {
        let animator, size;
        let A, B, C, D;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점: B(0,0), D(5,0), C(9,0) → 중앙 정렬 위해 BC 중점(4.5, 0)을 원점으로 평행이동
            const shiftX = -4.5;
            B = p.createVector(0 + shiftX, 0);
            D = p.createVector(5 + shiftX, 0);
            C = p.createVector(9 + shiftX, 0);
            // A : AC = 6, 삼각형이 시각적으로 안정되도록 A = (6, 3√3) 사용
            A = p.createVector(6 + shiftX, 3 * Math.sqrt(3));

            const center = p.createVector(
                (A.x + B.x + C.x) / 3,
                (A.y + B.y + C.y) / 3
            );

            // duplicate 이동 헬퍼 (365 참조)
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

            // t1 : clone ABC, move (0, 100) — 위로
            const dA1 = A.copy(), dB1 = B.copy(), dC1 = C.copy();
            const orig1 = [A.copy(), B.copy(), C.copy()];
            const movFactory1 = createDupTranslatorFactory([dA1, dB1, dC1], orig1, 0, 100, 1.5);

            // t2 : clone ADC, move (0, -100) — 아래로
            const dA2 = A.copy(), dD2 = D.copy(), dC2 = C.copy();
            const orig2 = [A.copy(), D.copy(), C.copy()];
            const movFactory2 = createDupTranslatorFactory([dA2, dD2, dC2], orig2, 0, -100, 1.5);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D], size);

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
                { delay: 0.3 },
                { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.0 } },
                { id: 'ptD', object: new XPoint(p, D, 'D', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                {
                    group: [
                        { id: 'dimDC', object: new XDimension(p, D, C, '4', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                        { id: 'dimAC', object: new XDimension(p, A, C, '6', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                { delay: 0.5 },
                { action: 'fadeAll', opacity: 0.3, duration: 0.6 },
                {
                    group: [
                        // t1 : ABC clone (green) + dim AC + angle ACB
                        { id: 't1_tri', object: new XPolygon(p, [dA1, dB1, dC1], { color: COLORS.green }), action: 'show' },
                        { id: 't1_dimAC', object: new XDimension(p, dA1, dC1, '6', { offset: 10, color: COLORS.green }), action: 'show' },
                        { id: 't1_angleACB', object: new XAngleMarker(p, dA1, dC1, dB1, { marker: 'circle', color: COLORS.green }), action: 'show' },
                        { id: 't1_tri', setFrameCallbackFactory: movFactory1 },
                        // t2 : ADC clone (yellow) + dims DC, AC + angle ACD
                        { id: 't2_tri', object: new XPolygon(p, [dA2, dD2, dC2], { color: COLORS.yellow }), action: 'show' },
                        { id: 't2_dimDC', object: new XDimension(p, dD2, dC2, '4', { offset: -10, color: COLORS.yellow }), action: 'show' },
                        { id: 't2_dimAC', object: new XDimension(p, dA2, dC2, '6', { offset: 10, color: COLORS.yellow }), action: 'show' },
                        { id: 't2_angleACD', object: new XAngleMarker(p, dA2, dC2, dD2, { marker: 'circle', color: COLORS.yellow }), action: 'show' },
                        { id: 't2_tri', setFrameCallbackFactory: movFactory2 }
                    ],
                    parallel: true
                },
                { delay: 1.5 },
                {
                    group: [
                        { id: 'text1', object: new XText(p, [20, 25], '\\angle A = \\angle ADC',
                            { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                          animate: { mode: 'draw', duration: 1.3 } },
                        { id: 't1_angleBAC', object: new XAngleMarker(p, dB1, dA1, dC1, { marker: 'triangle', color: COLORS.green }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 't2_angleCDA', object: new XAngleMarker(p, dC2, dD2, dA2, { marker: 'triangle', color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 't1_angleACB', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 't1_angleBAC', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 't2_angleACD', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 't2_angleCDA', animate: { mode: 'pulse', duration: 2.0 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 't1_dimBC', object: new XDimension(p, dB1, dC1, 'x', { offset: -10 }), animate: { mode: 'draw', duration: 1.4 } },
                        { id: 'text2', object: new XText(p, [20, 50], '\\overline{DC}:\\overline{AC} = \\overline{AC}:\\overline{BC}',
                            { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                          animate: { mode: 'draw', duration: 1.2 } }
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
