
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XDimension, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, M, E, P, F, G;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(-2, 2);
        B = p.createVector(-2, -2);
        C = p.createVector(2, -2);
        D = p.createVector(2, 2);

        // 계산된 점
        M = p5.Vector.add(C, D).div(2);  // (2, 0)
        E = p5.Vector.add(A, p5.Vector.mult(D, 3)).div(4);  // (1, 2)
        P = intersectLines(A, M, B, E);
        F = p.createVector(3, -2);
        G = intersectLines(A, M, B, C);  // AM과 BC의 교점

        // 바운딩 박스 점들의 중심 (레이블 자동 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phases =====

        // Phase 1: 정사각형 ABCD
        animator.registerPhase('problem1', [
            {
                group: [
                    { id: 'AB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'BC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'CD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'DA', object: XSegment(p, D, A), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
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
            { delay: 0.5 },
            { id: 'pointM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // Phase 2: 같은 각 표시
        animator.registerPhase('problem2', [
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'BE', object: XSegment(p, B, E), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'ME', object: XSegment(p, M, E), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.2 },
            {
                group: [
                    { id: 'angleBEM', object: new XAngleMarker(p, B, E, M, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleMED', object: new XAngleMarker(p, M, E, D, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Phase 3: 교점 P와 보조선
        animator.registerPhase('problem3', [
            { id: 'AM', object: XSegment(p, A, M), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.2 },
            { id: 'pointP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 연장선
        animator.registerPhase('solution1', [
            {
                group: [
                    { action: 'addToBounds', points: [F], duration: 1.5 },
                    { id: 'CF', object: XSegment(p, C, F), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'MF', object: XSegment(p, M, F), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'angleMFC', object: new XAngleMarker(p, M, F, C, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
            {
                group: [
                    { id: 'angleBEM', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'angleMFC', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'triangleBEF', object: new XPolygon(p, [B, E, F], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'segBE_green', object: XSegment(p, B, E, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markBE', object: new XSegmentMarker(p, B, E, { mark: 2, color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBF_green', object: XSegment(p, B, F, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markBF', object: new XSegmentMarker(p, B, F, { mark: 2, color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // Solution Phase 2: 수직보조선
        animator.registerPhase('solution2', [
            { id: 'BM', object: XSegment(p, B, M), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'rightEMB', object: new XRightAngle(p, E, M, B, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'triangleBEF', action: 'hide', duration: 1.0 },
                    { id: 'segBE_green', action: 'hide', duration: 1.0 },
                    { id: 'markBE', action: 'hide', duration: 1.0 },
                    { id: 'segBF_green', action: 'hide', duration: 1.0 },
                    { id: 'markBF', action: 'hide', duration: 1.0 }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 3: 닮음 삼각형
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 'angleDME', object: new XAngleMarker(p, D, M, E, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'triangleEMD', object: new XPolygon(p, [E, M, D], { filled: true, fillColor: [255, 220, 100, 80] }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'angleBMC', object: new XAngleMarker(p, B, M, C, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
            {
                group: [
                    { id: 'angleCBM', object: new XAngleMarker(p, C, B, M, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'triangleMBC', object: new XPolygon(p, [M, B, C], { filled: true, fillColor: [255, 220, 100, 80] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            // 선분 중앙에 숫자 표시 (BC:below, CM:right, MD:right, DE:above)
            { id: 'dimBC', object: new XDimension(p, B, C, '4', { offset: -12 }), animate: { mode: 'draw', duration: 0.5 } },
            { id: 'dimCM', object: new XDimension(p, C, M, '2', { offset: -12 }), animate: { mode: 'draw', duration: 0.5 } },
            { id: 'dimMD', object: new XDimension(p, M, D, '2', { offset: -12 }), animate: { mode: 'draw', duration: 0.5 } },
            { id: 'dimDE', object: new XDimension(p, D, E, '1', { offset: -12 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            { id: 'dimAE', object: new XDimension(p, A, E, '3', { offset: 12 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 4: 또다른 닮음
        animator.registerPhase('solution4', [
            {
                group: [
                    { id: 'triangleEMD', action: 'hide', duration: 0.5 },
                    { id: 'triangleMBC', action: 'hide', duration: 0.5 }
                ],
                parallel: true
            },
            {
                group: [
                    { action: 'addToBounds', points: [G], duration: 1.5 },
                    { id: 'MG', object: XSegment(p, M, G), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'FG', object: XSegment(p, F, G), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'pointC', action: 'hide' },
                    { id: 'pointF', action: 'hide' },
                    { id: 'pointG', action: 'hide' },
                    { id: 'angleBMC', action: 'hide' },
                    { id: 'angleMFC', action: 'hide' },
                    { id: 'angleBEM', action: 'hide' },
                    { id: 'angleMED', action: 'hide' },
                    { id: 'dimCM', action: 'hide' },
                    { id: 'dimMD', action: 'hide' },
                    { id: 'dimDE', action: 'hide' }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimCG', object: new XDimension(p, C, G, '4', { offset: -12 }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'trianglePEA', object: new XPolygon(p, [P, E, A], { filled: true, fillColor: [255, 180, 100, 80] }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'trianglePBG', object: new XPolygon(p, [P, B, G], { filled: true, fillColor: [255, 180, 100, 80] }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2',
                3: 'problem3'
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
            problemPhaseCount: 3,
            solutionPhaseCount: 4
        });

        // Phase 시퀀스 자동 실행
    };

    p.draw = function() {
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
