import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0060';

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
        const url = `./problems-mid2/060/${file}`;
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
        const url = `./problems-mid2/060/solution.html`;
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
        let A, B, C, D, E;
        const phaseNames = { problem: [], solution: [] };

        p.setup = function () {
            const size = getCanvasSize(600, 20);
            p.createCanvas(size, size);
            p.pixelDensity(window.devicePixelRatio || 1);

            const params = new URLSearchParams(window.location.search);
            applyTheme(p, params.get('theme') || undefined);

            // 기본 점 정의
            B = p.createVector(0, 0);
            C = p.createVector(4, 0);

            // A: BC의 수직이등분선 위, ∠BAC = 114°
            // ∠ABC = ∠ACB = (180-114)/2 = 33°
            const baseAngle = 33 * Math.PI / 180;
            A = p.createVector(2, 2 * Math.tan(baseAngle));

            // E: BC 위, BE = BA
            const BA = p5.Vector.dist(B, A);
            E = p.createVector(BA, 0);

            // D: BC 위, CD = CA (CA = BA since isosceles)
            D = p.createVector(4 - BA, 0);

            // 바운딩 박스 점들의 중심 (레이블 자동 배치용)
            const center = p.createVector(
                (A.x + B.x + C.x) / 3,
                (A.y + B.y + C.y) / 3
            );

            // Animator 초기화
            animator = new XAnimator(p);
            animator.initViewport([A, B, C], size);

            // ===== Problem Phase 1: 삼각형 ABC와 점 D, E =====
            animator.registerPhase('problem1', [
                // 삼각형 ABC 그리기
                {
                    group: [
                        { id: 'AB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'BC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0.8 } },
                        { id: 'CA', object: XSegment(p, C, A), animate: { mode: 'draw', duration: 0.8 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // 밑각 표시 (markc = circle)
                {
                    group: [
                        { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // 점 A, B, C 표시
                {
                    group: [
                        { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                { delay: 1.5 },
                // 점 E 표시 및 BE=BA 강조
                { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'AB', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'BE', object: XSegment(p, B, E, { color: '#888888' }), animate: { mode: 'pulse', duration: 2.0 } }
                    ],
                    parallel: true
                },
                { id: 'BE', action: 'remove' },
                { id: 'AE', object: XSegment(p, A, E), animate: { mode: 'draw', duration: 1.2 } },
                { delay: 1.0 },
                // 점 D 표시 및 CD=CA 강조
                { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                { delay: 0.3 },
                {
                    group: [
                        { id: 'CA', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'CD', object: XSegment(p, C, D, { color: '#888888' }), animate: { mode: 'pulse', duration: 2.0 } }
                    ],
                    parallel: true
                },
                { id: 'CD', action: 'remove' },
                { id: 'AD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.2 } },
                { delay: 1.0 },
                // ∠DAE = 33° 표시
                { id: 'angleDAE', object: new XAngleMarker(p, D, A, E, { arcSize: 25, marker: '33°' }), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 1.0 }
            ]);

            // ===== Solution Phase 1: 이등변삼각형 분석 =====
            animator.registerPhase('solution1', [
                // fadeAll 및 ∠DAE 숨기기
                { action: 'fadeAll', opacity: 0.4, exclude: ['angleCBA', 'angleACB'], duration: 0.8 },
                { id: 'angleDAE', action: 'hide' },
                { delay: 0.3 },
                // 삼각형 BEA 채우기
                { id: 'triangleBEA', object: new XPolygon(p, [B, E, A], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.5 } },
                { delay: 0.3 },
                // ∠AEB, ∠BAE 표시 (markt = triangle)
                {
                    group: [
                        { id: 'angleAEB', object: new XAngleMarker(p, A, E, B, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleBAE', object: new XAngleMarker(p, B, A, E, { arcSize: 20, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // 같은 각 pulse (∠CBA = ∠AEB = ∠BAE)
                {
                    group: [
                        { id: 'angleCBA', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'angleAEB', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'angleBAE', animate: { mode: 'pulse', duration: 2.0 } }
                    ],
                    parallel: true
                },
                { delay: 2.0 },
                // 삼각형 BEA 숨기기
                { id: 'triangleBEA', action: 'hide' },
                { id: 'angleBAE', action: 'hide' },
                { delay: 0.5 },
                // 삼각형 CDA 채우기
                { id: 'triangleCDA', object: new XPolygon(p, [C, D, A], { filled: true, fillColor: [255, 150, 100, 80] }), animate: { mode: 'draw', duration: 1.5 } },
                { delay: 0.3 },
                // ∠CDA, ∠DAC 표시 (markt = triangle)
                {
                    group: [
                        { id: 'angleCDA', object: new XAngleMarker(p, C, D, A, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } },
                        { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { arcSize: 20, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.6 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },
                // 같은 각 pulse (∠ACB = ∠CDA = ∠DAC)
                {
                    group: [
                        { id: 'angleACB', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'angleCDA', animate: { mode: 'pulse', duration: 2.0 } },
                        { id: 'angleDAC', animate: { mode: 'pulse', duration: 2.0 } }
                    ],
                    parallel: true
                },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 2: 삼각형 ADE =====
            animator.registerPhase('solution2', [
                // 삼각형 CDA, angle DAC 숨기기
                {
                    group: [
                        { id: 'triangleCDA', action: 'hide' },
                        { id: 'angleDAC', action: 'hide' }
                    ],
                    parallel: true
                },
                { delay: 0.5 },
                // fadeAll 복원
                { action: 'fadeAll', opacity: 1.0, duration: 0.5 },
                { delay: 0.3 },
                // 삼각형 ADE 채우기
                { id: 'triangleADE', object: new XPolygon(p, [A, D, E], { filled: true, fillColor: [150, 200, 100, 80] }), animate: { mode: 'draw', duration: 1.5 } },
                { delay: 0.5 },
                // ∠DAE 표시 (markc = circle)
                { id: 'angleDAE2', object: new XAngleMarker(p, D, A, E, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                { delay: 2.0 }
            ]);

            // ===== Solution Phase 3: ∠BAC 계산 =====
            animator.registerPhase('solution3', [
                // 마커 변경: DAE, CBA, ACB → 33°
                {
                    group: [
                        { id: 'angleDAE2', action: 'hide' },
                        { id: 'angleCBA', action: 'hide' },
                        { id: 'angleACB', action: 'hide' }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'angleDAE3', object: new XAngleMarker(p, D, A, E, { arcSize: 25, marker: '33°' }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'angleCBA2', object: new XAngleMarker(p, C, B, A, { arcSize: 30, marker: '33°' }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'angleACB2', object: new XAngleMarker(p, A, C, B, { arcSize: 30, marker: '33°' }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 },
                // 삼각형 ADE, angle DAE 숨기기
                {
                    group: [
                        { id: 'triangleADE', action: 'hide' },
                        { id: 'angleDAE3', action: 'hide' }
                    ],
                    parallel: true
                },
                { delay: 1.0 },
                // ∠BAC = 114° 표시
                { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { arcSize: 35, marker: '114°' }), animate: { mode: 'draw', duration: 1.0 } },
                { delay: 2.0 }
            ]);

            phaseNames.problem = ['problem1'];
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
