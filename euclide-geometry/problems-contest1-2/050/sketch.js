
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, G, M, P, Q, R, X, Y;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(-1, 7);
        B = p.createVector(-3.5, 0);
        C = p.createVector(3.5, 0);

        // G: 무게중심
        G = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

        // M: BC의 중점
        M = p5.Vector.add(B, C).div(2);

        // P: AC를 7:11로 내분 (AP:PC = 7:11)
        P = p5.Vector.lerp(A, C, 7 / 18);

        // Q: PG와 BC의 교점
        Q = intersectLines(P, G, B, C);

        // R: PG와 AB의 교점
        R = intersectLines(P, G, A, B);

        // X: P를 지나고 BC에 평행한 직선이 AB와 만나는 점
        // BC가 y=0이므로, P를 지나고 y=P.y인 수평선과 AB의 교점
        const parallelPoint = p.createVector(P.x + 10, P.y);  // BC에 평행 (y 고정)
        X = intersectLines(P, parallelPoint, A, B);

        // Y: P를 지나고 BC에 평행한 직선이 AM과 만나는 점
        Y = intersectLines(P, parallelPoint, A, M);

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phases =====

        // Phase 1: 삼각형 ABC, 중선 AM, 무게중심 G
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'pointM', object: new XPoint(p, M, 'M', { dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'segAM', object: XSegment(p, A, M), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 }
        ]);

        // Phase 2: 직선 PG와 교점들, XDims
        animator.registerPhase('problem2', [
            { id: 'pointP', object: new XPoint(p, P, 'P', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { action: 'addToBounds', points: [R], duration: 1.8 },
                    { id: 'segBR', object: XSegment(p, B, R, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segPR', object: XSegment(p, P, R), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'pointQ', object: new XPoint(p, Q, 'Q', { dx: 10, dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'dimPG', object: new XDimension(p, P, G, '20', { offset: 10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimGQ', object: new XDimension(p, G, Q, '24', { offset: 10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 평행선 PY
        animator.registerPhase('solution1', [
            {
                group: [
                    { action: 'setBounds', points: [A, B, C], replace: true, duration: 1.5 },
                    { id: 'segPY', object: XSegment(p, P, Y), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimYP', object: new XDimension(p, Y, P, '5x', { offset: 10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimQM', object: new XDimension(p, Q, M, '6x', { offset: -10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'dimPG', action: 'fade', duration: 0.8 },
                    { id: 'dimGQ', action: 'fade', duration: 0.8 }
                ],
                parallel: true
            }
        ]);

        // Solution Phase 2: 비율 정보
        animator.registerPhase('solution2', [
            {
                group: [
                    { action: 'setBounds', points: [A, M, C], replace: true, duration: 1.2 },
                    { id: 'segGM', object: XSegment(p, G, M), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimGM', object: new XDimension(p, G, M, '6y', { offset: 10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'pointG', action: 'fade', duration: 1.2 }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'dimYG', object: new XDimension(p, Y, G, '5y', { offset: -10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAY', object: new XDimension(p, A, Y, '7y', { offset: -10, fontSize: 12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            { id: 'dimMC', object: new XDimension(p, M, C, '\\frac{7}{90}x', { offset: -15, fontSize: 12, useTex: true }), animate: { mode: 'draw', duration: 0.6 } },
            { delay: 1.0 },
            {
                group: [
                    { action: 'setBounds', points: [G, B, C], replace: true, duration: 1.5 },
                    { id: 'dimBQ', object: new XDimension(p, B, Q, '\\frac{7}{48}x', { offset: 15, fontSize: 12, useTex: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // Solution Phase 3: 평행선 XY
        animator.registerPhase('solution3', [
            { action: 'setBounds', points: [X, R, P], replace: true, duration: 1.5 },
            { id: 'segXY', object: XSegment(p, X, Y), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'dimXY', object: new XDimension(p, X, Y, '5x', { offset: 10, fontSize: 12 }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.7 }
        ]);

        // Solution Phase 4: 닮음
        animator.registerPhase('solution4', [
            { id: 'triRBQ', object: new XPolygon(p, [R, B, Q], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'triRXP', object: new XPolygon(p, [R, X, P], { filled: true, fillColor: [255, 150, 100, 80] }), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'triRBQ', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triRXP', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2',
                3: 'solution3',
                4: 'solution4'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 4
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
