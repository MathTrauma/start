import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XSegment, XPoint, XAngleMarker, XSegmentMarker } from '../../lib/x_object.js';
import { UIController } from '../../js/ui-controller.js';

let p5Instance = null;
let uiController = null;

export function mount(container, opts = {}) {
    const pid = opts.problemId || '0120';

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
        const url = `./problems-mid2/120/${file}`;
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
        const url = `./problems-mid2/120/solution.html`;
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

            // === 기본 점 ===
            B = p.createVector(-2, 0);
            C = p.createVector(2, 0);
            E = p.createVector(3.5, 0);   // BC 를 C 너머로 연장한 위치

            // A: BC 수직이등분선 위, ∠BAC = 44° → 밑각 ∠ABC = ∠ACB = 68°
            const baseAngle = 68 * Math.PI / 180;
            A = p.createVector(0, 2 * Math.tan(baseAngle));

            // D: ∠DCE = 56°(외각 112°의 절반), CB = CD 인 이등변삼각형 CDB
            //    → D = C + CB·(cos56°, sin56°). 그러면 ∠DBC = ∠BDC = 28°.
            const CB = p5.Vector.dist(C, B);
            const half = 56 * Math.PI / 180;
            D = p.createVector(C.x + CB * Math.cos(half), C.y + CB * Math.sin(half));

            // 레이블 자동 배치용 중심 (삼각형 ABC 무게중심)
            const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

            animator = new XAnimator(p);
            animator.initViewport([A, B, C, D, E], size);

            // ===== Problem Phase 1: 삼각형 ABC =====
            animator.registerPhase('problem1', [
                // draw ABC (개별 선분 — BC 는 이후 삼각형 CDB 와 공유)
                {
                    group: [
                        { id: 'AB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'BC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 1.0 } },
                        { id: 'CA', object: XSegment(p, C, A), animate: { mode: 'draw', duration: 1.0 } }
                    ],
                    parallel: true
                },
                // display A, B, C
                {
                    group: [
                        { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // mark[1] segs AB, AC (이등변삼각형 ABC 의 두 변)
                {
                    group: [
                        { id: 'markAB', object: new XSegmentMarker(p, A, B, { mark: 1 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markAC', object: new XSegmentMarker(p, A, C, { mark: 1 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // draw angle BAC with marker 44° (꼭지각)
                { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { arcSize: 30, marker: '44°' }), animate: { mode: 'draw', duration: 0.5 } },
                { delay: 0.5 }
            ]);

            // ===== Problem Phase 2: 삼각형 CDB, 외각 이등분 =====
            animator.registerPhase('problem2', [
                // BC 연장선 CE + 삼각형 CDB 의 두 변 DB, DC
                {
                    group: [
                        { id: 'CE', object: XSegment(p, C, E), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'DB', object: XSegment(p, D, B), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'DC', object: XSegment(p, D, C), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                // display D, E
                {
                    group: [
                        { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // mark[2] segs BC, CD (CB = CD)
                {
                    group: [
                        { id: 'markBC', object: new XSegmentMarker(p, B, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                        { id: 'markCD', object: new XSegmentMarker(p, C, D, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } }
                    ],
                    parallel: true
                },
                // draw angles ECD, DCA with markc (외각을 이등분한 두 각)
                {
                    group: [
                        { id: 'angleECD', object: new XAngleMarker(p, E, C, D, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'angleDCA', object: new XAngleMarker(p, D, C, A, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 0.5 }
            ]);

            // ===== Solution Phase 1 =====
            animator.registerPhase('solution1', [
                // ghost except[ABC, A,B,C] (꼭지각 44°도 유지)
                {
                    action: 'fadeAll', opacity: 0.3, duration: 0.4,
                    exclude: ['AB', 'BC', 'CA', 'pointA', 'pointB', 'pointC', 'angleBAC']
                },
                // draw angles CBA, ACB with marker 68° (이등변삼각형 밑각)
                {
                    group: [
                        { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { arcSize: 30, marker: '68°' }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { arcSize: 30, marker: '68°' }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 },

                // remove angle CBA || recover(전체 복원)
                {
                    group: [
                        { id: 'angleCBA', action: 'remove' },
                        { action: 'fadeAll', opacity: 1.0, duration: 0.4 }
                    ],
                    parallel: true
                },
                // change angle marker ECD, DCA to 56° (외각 112°의 절반)
                {
                    group: [
                        { id: 'angleECD', action: 'hide' },
                        { id: 'angleDCA', action: 'hide' }
                    ],
                    parallel: true
                },
                {
                    group: [
                        { id: 'angleECD2', object: new XAngleMarker(p, E, C, D, { arcSize: 25, marker: '56°' }), animate: { mode: 'draw', duration: 0.5 } },
                        { id: 'angleDCA2', object: new XAngleMarker(p, D, C, A, { arcSize: 25, marker: '56°' }), animate: { mode: 'draw', duration: 0.5 } }
                    ],
                    parallel: true
                },
                { delay: 0.3 },

                // pulse DBC with mark[2] (CB = CD 인 이등변삼각형 강조)
                {
                    group: [
                        { id: 'DB', animate: { mode: 'pulse', duration: 1.4 } },
                        { id: 'DC', animate: { mode: 'pulse', duration: 1.4 } },
                        { id: 'BC', animate: { mode: 'pulse', duration: 1.4 } },
                        { id: 'markBC', animate: { mode: 'pulse', duration: 1.4 } },
                        { id: 'markCD', animate: { mode: 'pulse', duration: 1.4 } }
                    ],
                    parallel: true
                },
                // draw angles BDC, CBD with marker 28° (두 밑각 = 정답 ∠DBC)
                {
                    group: [
                        { id: 'angleBDC', object: new XAngleMarker(p, B, D, C, { arcSize: 40, size: 16, marker: '28°' }), animate: { mode: 'draw', duration: 0.7 } },
                        { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { arcSize: 40, size: 16, marker: '28°' }), animate: { mode: 'draw', duration: 0.7 } }
                    ],
                    parallel: true
                },
                { delay: 1.0 }
            ]);

            phaseNames.problem = ['problem1', 'problem2'];
            phaseNames.solution = ['solution1'];

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
