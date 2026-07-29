
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, projectPointToLine } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XRightAngle, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let O, A, B, C, D, E, X;
    let animator;
    const R = 3;  // 원의 반지름

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의 (원 위의 점들)
        O = p.createVector(0, 0);
        A = p.createVector(R * Math.cos(0), R * Math.sin(0));                    // 0°
        B = p.createVector(R * Math.cos(150 * Math.PI / 180), R * Math.sin(150 * Math.PI / 180));  // 150°
        C = p.createVector(R * Math.cos(210 * Math.PI / 180), R * Math.sin(210 * Math.PI / 180));  // 210°
        D = p.createVector(R * Math.cos(270 * Math.PI / 180), R * Math.sin(270 * Math.PI / 180));  // 270°

        // E: A에서 BD에 내린 수선의 발
        E = projectPointToLine(A, B, D);

        // X: AC와 BD의 교점
        X = intersectLines(A, C, B, D);

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        const yellowColor = [251, 191, 36];

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phases =====

        // Phase 1: 사각형 ABCD와 원 O
        animator.registerPhase('problem1', [
            { id: 'quadABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'pointO', object: new XPoint(p, O, 'O', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'circleO', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Phase 2: 대각선과 수선
        animator.registerPhase('problem2', [
            { id: 'segAC', object: XSegment(p, A, C, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.0 },
            { id: 'segAE', object: XSegment(p, A, E), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'pointE', object: new XPoint(p, E, 'E', { dx: -15 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightAED', object: new XRightAngle(p, A, E, D, 0.25), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 각도 분석
        animator.registerPhase('solution1', [
            { id: 'segAE', set: { opacity: 0.3 } },
            { id: 'angleDCB', object: new XAngleMarker(p, D, C, B, { arcSize: 25, marker: '120' }), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { arcSize: 25, marker: '60' }), animate: { mode: 'draw', duration: 1.0 } },
            {
                group: [
                    { id: 'segBC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0.1 } },
                    { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 0.1 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segBC', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'segCD', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segBC', object: XSegment(p, B, C, { color: yellowColor }), animate: { mode: 'draw', duration: 0.1 } },
                    { id: 'segCD', object: XSegment(p, C, D, { color: yellowColor }), animate: { mode: 'draw', duration: 0.1 } },
                    { id: 'angleBAD', action: 'remove' }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { arcSize: 35, marker: '30' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCAD', object: new XAngleMarker(p, C, A, D, { arcSize: 45, marker: '30' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // Solution Phase 2: 정삼각형 OBC
        animator.registerPhase('solution2', [
            { id: 'angleDCB', animate: { mode: 'fadeOut', duration: 0.3 } },
            { id: 'angleDCB', action: 'hide' },
            {
                group: [
                    { id: 'segOB', object: XSegment(p, O, B, { color: yellowColor }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segOC', object: XSegment(p, O, C, { color: yellowColor }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleBOC', object: new XAngleMarker(p, B, O, C, { arcSize: 20, marker: '60' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleOCB', object: new XAngleMarker(p, O, C, B, { arcSize: 20, marker: '60' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCBO', object: new XAngleMarker(p, C, B, O, { arcSize: 20, marker: '60' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimBC', object: new XDimension(p, B, C, 'r', { offset: -15 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimCD', object: new XDimension(p, C, D, 'r', { offset: -15 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimCO', object: new XDimension(p, C, O, 'r', { offset: -15 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimBO', object: new XDimension(p, B, O, 'r', { offset: 15 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // Solution Phase 3: 원주각 관찰
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 'segOB', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'segOC', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'dimBO', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'dimCO', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'angleBOC', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'angleOCB', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'angleCBO', animate: { mode: 'fadeOut', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segOB', action: 'hide' },
                    { id: 'segOC', action: 'hide' },
                    { id: 'dimBO', action: 'hide' },
                    { id: 'dimCO', action: 'hide' },
                    { id: 'angleBOC', action: 'hide' },
                    { id: 'angleOCB', action: 'hide' },
                    { id: 'angleCBO', action: 'hide' }
                ],
                parallel: true
            },
            { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { arcSize: 30, marker: '30' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 4: 닮음 삼각형
        animator.registerPhase('solution4', [
            {
                group: [
                    { id: 'triBCX', object: new XPolygon(p, [B, C, X], { weight: 2.5 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triABC', object: new XPolygon(p, [A, B, C], { weight: 2.5 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triBCX', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triABC', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { arcSize: 35, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBXC', object: new XAngleMarker(p, B, X, C, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleDXA', object: new XAngleMarker(p, D, X, A, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleADX', object: new XAngleMarker(p, A, D, X, { arcSize: 35, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'pointX', object: new XPoint(p, X, 'X', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'triAXD', object: new XPolygon(p, [A, X, D], { weight: 2.5 }), animate: { mode: 'draw', duration: 1.0 } },
            {
                group: [
                    { id: 'triBCX', animate: { mode: 'travel', duration: 1.0 } },
                    { id: 'triAXD', animate: { mode: 'travel', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'dimBX', object: new XDimension(p, B, X, 'r', { offset: 15 }), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'dimXE', object: new XDimension(p, X, E, 'a', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimED', object: new XDimension(p, E, D, 'a', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
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
