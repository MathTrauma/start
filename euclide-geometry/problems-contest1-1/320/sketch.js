
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XDimension, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, G, P;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(-2.1, -1.3);
        B = p.createVector(2.1, -1.3);
        C = p.createVector(1.2, 1.3);
        D = p.createVector(-3.0, 1.3);

        // 계산된 점
        E = p5.Vector.add(C, D).div(2);  // CD의 중점
        F = p5.Vector.add(A, D).div(2);  // AD의 중점
        G = intersectLines(A, E, B, F);  // AE와 BF의 교점
        P = intersectLines(A, E, B, C);  // AE 연장선과 BC의 교점

        // 삼각형 중심점 계산
        const centerEFG = p.createVector(
            (E.x + F.x + G.x) / 3,
            (E.y + F.y + G.y) / 3
        );
        const centerGFA = p.createVector(
            (G.x + F.x + A.x) / 3,
            (G.y + F.y + A.y) / 3
        );
        const centerDFE = p.createVector(
            (D.x + F.x + E.x) / 3,
            (D.y + F.y + E.y) / 3
        );

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // offset 슬라이딩 헬퍼 (팩토리 패턴 - 현재 offset에서 toOffset으로 이동)
        const createOffsetSliderFactory = (toOffset, duration) => {
            return () => {
                let elapsed = 0;
                let lastTime = null;
                let fromOffset = null;
                return (obj) => {
                    const now = performance.now();
                    if (lastTime === null) {
                        lastTime = now;
                        fromOffset = obj.offset;  // 첫 호출 시 현재 offset 저장
                    }
                    const dt = (now - lastTime) / 1000;
                    lastTime = now;
                    elapsed += dt;
                    const progress = Math.min(1, elapsed / duration);
                    obj.offset = fromOffset + (toOffset - fromOffset) * progress;
                    if (progress >= 1) {
                        obj.frameCallback = null;
                    }
                };
            };
        };

        // 텍스트 표시용 헬퍼 객체 생성 함수
        const createTextDisplay = (text, yOffset = 20) => ({
            visible: true,
            progress: 1,
            mode: 'default',
            text: text,
            yOffset: yOffset,
            render: function () {
                if (!this.visible) return;
                p.push();
                p.resetMatrix();
                p.fill(p.theme.text || 0);
                p.noStroke();
                p.textSize(16);
                p.textAlign(p.LEFT, p.TOP);
                p.text(this.text, 20, this.yOffset);
                p.pop();
            }
        });

        // ===== Problem Phases =====

        // Phase 1: 평행사변형 ABCD
        animator.registerPhase('problem1', [
            { id: 'parallelogram', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Phase 2: 중점 E, F와 교점 G
        animator.registerPhase('problem2', [
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'segAE', object: XSegment(p, A, E), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBF', object: XSegment(p, B, F), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.2 },
            { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'segEF', object: XSegment(p, E, F), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 닮음1
        animator.registerPhase('solution1', [
            { id: 'pointP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { action: 'addToBounds', points: [P], duration: 1.0 },
                    { id: 'segEP', object: XSegment(p, E, P), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segCP', object: XSegment(p, C, P, { dashed: true }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triGFA', object: new XPolygon(p, [G, F, A], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triGBP', object: new XPolygon(p, [G, B, P], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimAF', object: new XDimension(p, A, F, '1', { offset: 12 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'dimBP', object: new XDimension(p, B, P, '4', { offset: -12 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'text1', object: createTextDisplay('𝐴𝐺 : 𝐺𝑃 = 1 : 4', 20), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 2: 닮음비 표시
        animator.registerPhase('solution2', [
            { id: 'text2', object: createTextDisplay('𝐴𝑃 = 𝑙 이라 하자.', 45), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'dimAG', object: new XDimension(p, A, G, '0.2𝑙', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimGP', object: new XDimension(p, G, P, '0.8𝑙', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'dimEP', object: new XDimension(p, E, P, '0.5𝑙', { offset: 12 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.5 },
            { id: 'dimGE', object: new XDimension(p, G, E, '0.3𝑙', { offset: 12, color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'text3', object: createTextDisplay('△𝐴𝐺𝐹 : △𝐹𝐺𝐸 = 2 : 3', 70), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 3: 넓이비 표시
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 'triGFA', action: 'hide', duration: 0.5 },
                    { id: 'triGBP', action: 'hide', duration: 0.5 },
                    { id: 'dimGP', action: 'hide', duration: 0.5 },
                    { id: 'dimEP', action: 'hide', duration: 0.5 }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'label3S', object: new XPoint(p, centerEFG, '3𝑆', { noDot: true, dx: 0, dy: 0 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'dimGE', setFrameCallbackFactory: createOffsetSliderFactory(-12, 1.0) }
                ],
                parallel: true
            },
            { id: 'label2S', object: new XPoint(p, centerGFA, '2𝑆', { noDot: true, dx: 0, dy: 0 }), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'segFA', object: XSegment(p, F, A), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markFA', object: new XSegmentMarker(p, F, A, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segFD', object: XSegment(p, F, D), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markFD', object: new XSegmentMarker(p, F, D, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            { id: 'label5S', object: new XPoint(p, centerDFE, '5𝑆', { noDot: true, dx: 0, dy: 0 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            { id: 'text4', object: createTextDisplay('|▱𝐴𝐵𝐶𝐷| = 40𝑆 = 160', 95), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2',
                3: 'solution3'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 3
        });

        // Phase 시퀀스 자동 실행
    };

    p.draw = function () {
        p.background(p.theme.background);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);

        if (animator) {
            animator.updateAndDraw();
        }

        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
