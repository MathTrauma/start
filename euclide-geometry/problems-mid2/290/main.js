import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, getIncenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0290';

    const problemContainer = document.getElementById('problem-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const solutionContainer = document.getElementById('solution-container');
    const solutionText = document.getElementById('solution-text');

    if (problemContainer) {
        problemContainer.className = 'problem-container';
        problemContainer.innerHTML = `
            <div class="problem-content">
                <span class="problem-tag level">중2</span>
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
        const url = `./problems-mid2/290/${file}`;
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
        const url = `./problems-mid2/290/solution.html`;
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

function createSketch(pid) {
    return (p) => {
        let animator, size;
        let A, B, C, D, E, I, center;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function() {
            size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점
            B = p.createVector(-2, 0);
            C = p.createVector(2, 0);

            // A : ∠CBA = 58°, ∠BCA = 70° 를 만족하는 점 (두 직선의 교점)
            const bDir = p.createVector(B.x + Math.cos(p.radians(58)), B.y + Math.sin(p.radians(58)));
            const cDir = p.createVector(C.x + Math.cos(p.radians(110)), C.y + Math.sin(p.radians(110)));
            A = intersectLines(B, bDir, C, cDir);

            I = getIncenter(A, B, C);                 // 내심
            D = intersectLines(A, I, B, C);            // 각 A 이등분선 ∩ BC
            E = intersectLines(B, I, C, A);            // 각 B 이등분선 ∩ CA

            center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, E, I], size);

            // ===== Problem Phase 1 =====
            animator.registerPhase('problem1', [
                { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 0.9 } },
                {
                    group: [
                        { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.2 },
                { id: 'ang1', object: new XAngleMarker(p, A, C, B, { marker: '70°' }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 }
            ]);

            // ===== Problem Phase 2 =====
            animator.registerPhase('problem2', [
                { id: 'ptI', object: new XPoint(p, I, 'I', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.2 } },
                {
                    group: [
                        { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'segBE', object: XSegment(p, B, E), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'ptE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                { id: 'ang2', object: new XAngleMarker(p, A, D, B, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.2 },
                { id: 'ang3', object: new XAngleMarker(p, A, E, B, { marker: 'y°' }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.2 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                { id: 'fillADC', object: new XPolygon(p, [A, D, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: 'α' }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'angleDAC', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'ang1', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'ang2', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 2 =====
            animator.registerPhase('solution2', [
                { action: 'fade', targets: ['fillADC', 'angleDAC'], opacity: 0, duration: 0.2 },
                { id: 'fillBEC', object: new XPolygon(p, [B, E, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'angleCBE', object: new XAngleMarker(p, C, B, E, { marker: 'β' }), animate: { mode: 'draw', duration: 0.6 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'angleCBE', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'ang1', animate: { mode: 'pulse', duration: 1.2 } },
                        { id: 'ang3', animate: { mode: 'pulse', duration: 1.2 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
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
