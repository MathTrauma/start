import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getIncenter, getCircumcenter, circleLineIntersection, projectPointToLine } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '274';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">L2</span>
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

// pop 애니메이션: centroid 기준 scale 0→1
const createPopCallback = (vertices, centroid, duration) => {
    return () => {
        let elapsed = 0, lastTime = null;
        const originals = vertices.map(v => ({ x: v.x, y: v.y }));
        return (obj) => {
            const now = performance.now();
            if (!lastTime) lastTime = now;
            elapsed += (now - lastTime) / 1000;
            lastTime = now;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            vertices.forEach((v, i) => {
                v.x = centroid.x + (originals[i].x - centroid.x) * ease;
                v.y = centroid.y + (originals[i].y - centroid.y) * ease;
            });
            if (obj._perimeterDirty !== undefined) obj._perimeterDirty = true;
            if (t >= 1) obj.frameCallback = null;
        };
    };
};

function createSketch(pid) {
    return (p) => {
        let animator, size;
        let A, B, C, I, D, E;
        let O1, r1, O2, r2;
        let R, P, Q; // 수선의 발
        let inR; // 내접원 반지름
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 스케일 조정: BC=71 → 수학 좌표계에서 적절한 크기로
            const sc = 4 / 71;
            B = p.createVector(0, 0);
            C = p.createVector(71 * sc, 0);

            // A: AB=61, AC=51, BC=71
            const AB = 61 * sc, AC = 51 * sc, BC = 71 * sc;
            const ax = (AB * AB + BC * BC - AC * AC) / (2 * BC);
            const ay = Math.sqrt(AB * AB - ax * ax);
            A = p.createVector(ax, ay);

            I = getIncenter(A, B, C);

            // 외접원 AIB
            O1 = getCircumcenter(A, I, B);
            r1 = p5.Vector.dist(O1, A);

            // D: 외접원 AIB와 BC의 교점 (D≠B)
            const hits1 = circleLineIntersection(O1, r1, B, C);
            D = hits1.find(pt => p5.Vector.dist(pt, B) > 0.01) || hits1[0];

            // 외접원 AIC
            O2 = getCircumcenter(A, I, C);
            r2 = p5.Vector.dist(O2, A);

            // E: 외접원 AIC와 BC의 교점 (E≠C)
            const hits2 = circleLineIntersection(O2, r2, B, C);
            E = hits2.find(pt => p5.Vector.dist(pt, C) > 0.01) || hits2[0];

            // 수선의 발
            R = projectPointToLine(I, A, B);
            P = projectPointToLine(I, B, C);
            Q = projectPointToLine(I, C, A);

            // 내접원 반지름
            inR = p5.Vector.dist(I, P);

            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, E, I], size);

            // ===== Problem Phase 1 =====
            const triVerts = [A.copy(), B.copy(), C.copy()];
            const triCentroid = p.createVector(
                (A.x + B.x + C.x) / 3,
                (A.y + B.y + C.y) / 3
            );
            // pop 시작 시 centroid에 모아둠
            triVerts.forEach(v => { v.x = triCentroid.x; v.y = triCentroid.y; });

            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, triVerts), action: 'show' },
                { id: 'triABC', setFrameCallbackFactory: createPopCallback(triVerts, triCentroid, 0.5) },
                { delay: 0.6 },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptI', object: new XPoint(p, I, 'I', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'circO1', object: XCircle(p, O1, r1), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'ptD', object: new XPoint(p, D, 'D', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                { delay: 0.5 },
                {
                    group: [
                        { id: 'circO1', action: 'fade', opacity: 0.3, duration: 0.5 },
                        { id: 'circO2', object: XCircle(p, O2, r2), animate: { mode: 'draw', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { id: 'ptE', object: new XPoint(p, E, 'E', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'circO2', action: 'fade', opacity: 0.3, duration: 0.5 },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'circIC', object: XCircle(p, I, inR), animate: { mode: 'draw', duration: 1.3 } },
                {
                    group: [
                        { id: 'segIR', object: XSegment(p, I, R, { dashed: true }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'segIP', object: XSegment(p, I, P, { dashed: true }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'segIQ', object: XSegment(p, I, Q, { dashed: true }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'markIR', object: new XSegmentMarker(p, I, R, { mark: 1 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markIP', object: new XSegmentMarker(p, I, P, { mark: 1 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markIQ', object: new XSegmentMarker(p, I, Q, { mark: 1 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'ptR', object: new XPoint(p, R, 'R', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptP', object: new XPoint(p, P, 'P', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptQ', object: new XPoint(p, Q, 'Q', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                { id: 'circIC', action: 'fade', opacity: 0, duration: 0.7 },
                {
                    group: [
                        { id: 'segIA', object: XSegment(p, I, A), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'segIB', object: XSegment(p, I, B), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'segIC', object: XSegment(p, I, C), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'markIA', object: new XSegmentMarker(p, I, A, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markIB', object: new XSegmentMarker(p, I, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markIC', object: new XSegmentMarker(p, I, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { id: 'circO1', action: 'recover', duration: 0.3 },
                {
                    group: [
                        { id: 'angleCDI', object: new XAngleMarker(p, C, D, I, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'angleBAI', object: new XAngleMarker(p, B, A, I, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'fillIRA', object: new XPolygon(p, [I, R, A], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.3 } },
                        { id: 'fillIPB', object: new XPolygon(p, [I, P, B], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.3 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 }
            ]);

            phaseNames.problem = ['problem1'];
            phaseNames.solution = ['solution1', 'solution2'];

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
