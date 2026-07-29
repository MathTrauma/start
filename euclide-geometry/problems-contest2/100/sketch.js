
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getIncenter, getCircumcenter, circleLineIntersection, intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, I, O, D, E, F, K;
    let circumRadius, centerAIE, radiusAIE;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점: BC = 5 (비율 4:5:6)
        B = p.createVector(-2.5, 0);
        C = p.createVector(2.5, 0);

        // A: dist(A,B) = 4, dist(A,C) = 6
        A = p.createVector(-2, Math.sqrt(15.75));

        // 내심 I
        I = getIncenter(A, B, C);

        // 외심 O와 외접원 반지름
        O = getCircumcenter(A, B, C);
        circumRadius = p5.Vector.dist(O, A);

        // D: 직선 AI와 외접원의 교점 (A 제외)
        const intersectionsAI = circleLineIntersection(O, circumRadius, A, I);
        D = intersectionsAI[0].dist(A) > intersectionsAI[1].dist(A) ? intersectionsAI[0] : intersectionsAI[1];

        // E: 직선 BI와 외접원의 교점 (B 제외)
        const intersectionsBI = circleLineIntersection(O, circumRadius, B, I);
        E = intersectionsBI[0].dist(B) > intersectionsBI[1].dist(B) ? intersectionsBI[0] : intersectionsBI[1];

        // F: 직선 AI와 BC의 교점
        F = intersectLines(A, I, B, C);

        // K: 직선 DE와 AC의 교점
        K = intersectLines(D, E, A, C);

        // AIE 외접원
        centerAIE = getCircumcenter(A, I, E);
        radiusAIE = p5.Vector.dist(centerAIE, A);

        // 레이블 배치용 중심
        const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D, E], size);

        // ===== Problem Phase 1: 삼각형 ABC와 외접원 =====
        animator.registerPhase('problem1', [
            {
                group: [
                    { id: 'AB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'BC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'CA', object: XSegment(p, C, A), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'circumcircle', object: XCircle(p, O, circumRadius), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2: 내심과 각의 이등분선 =====
        animator.registerPhase('problem2', [
            { id: 'AD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'angleIAC', object: new XAngleMarker(p, I, A, C, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleBAI', object: new XAngleMarker(p, B, A, I, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'BE', object: XSegment(p, B, E), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 15, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointI', object: new XPoint(p, I, 'I', { dx: -15 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'angleIBA', object: new XAngleMarker(p, I, B, A, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCBI', object: new XAngleMarker(p, C, B, I, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // ===== Problem Phase 3: DE와 K, IK =====
        animator.registerPhase('problem3', [
            { id: 'DE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointK', object: new XPoint(p, K, 'K', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            { id: 'IK', object: XSegment(p, I, K, { weight: 2 }), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'dimIK', object: new XDimension(p, I, K, '30', { offset: -15 }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1: 원주각 =====
        animator.registerPhase('solution1', [
            { action: 'fadeAll', opacity: 0.4, duration: 0.8 },
            { id: 'BD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'triBAD', object: new XPolygon(p, [B, A, D], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triBED', object: new XPolygon(p, [B, E, D], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleBED', object: new XAngleMarker(p, B, E, D, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBAI', set: { opacity: 1 } },
                    { id: 'BD', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'angleBED', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleBAI', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            // A에서 시작하여 반시계 방향으로 원 그리기
            { id: 'circleAIE', object: XCircle(p, centerAIE, radiusAIE, { color: '#fbbf24', startPoint: A }), animate: { mode: 'draw', duration: 1.2 } },
            // hide (fadeOut) 후 remove
            {
                group: [
                    { id: 'triBAD', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'triBED', animate: { mode: 'fadeOut', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triBAD', action: 'remove' },
                    { id: 'triBED', action: 'remove' }
                ],
                parallel: true
            }
        ]);

        // ===== Solution Phase 2: 원주각 동치 =====
        animator.registerPhase('solution2', [
            { action: 'fadeAll', opacity: 0.4, duration: 0.5, exclude: ['circleAIE'] },
            {
                group: [
                    { id: 'triAEB', object: new XPolygon(p, [A, E, B], { filled: true, fillColor: [150, 200, 100, 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triACB', object: new XPolygon(p, [A, C, B], { filled: true, fillColor: [150, 200, 100, 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { arcSize: 35, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'angleAEB', object: new XAngleMarker(p, A, E, B, { arcSize: 35, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'AB', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'circleAIE', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'angleAEB', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'angleAKI', object: new XAngleMarker(p, A, K, I, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 3.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'circleAIE', animate: { mode: 'fadeOut', duration: 1.5 } },
                    { id: 'angleACB', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'angleAKI', animate: { mode: 'pulse', duration: 3.0 } }
                ],
                parallel: true
            },
            { delay: 1.5 },
            {
                group: [
                    { id: 'circleAIE', action: 'remove' },
                    { id: 'IK', set: { opacity: 1 } },
                    { id: 'IK', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'BC', set: { opacity: 1 } },
                    { id: 'BC', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 3: 각의 이등분선 성질 =====
        animator.registerPhase('solution3', [
            { action: 'fadeAll', opacity: 0.4, duration: 0.8 },
            {
                group: [
                    { id: 'AF', object: XSegment(p, A, F), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { dy: -15 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triABF', object: new XPolygon(p, [A, B, F], { filled: true, fillColor: [255, 180, 100, 60] }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'triACF', object: new XPolygon(p, [A, C, F], { filled: true, fillColor: [100, 180, 255, 60] }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'dimAB', object: new XDimension(p, A, B, '4𝑘', { offset: -20 }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'dimAC', object: new XDimension(p, A, C, '6𝑘', { offset: 20 }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 },
            {
                group: [
                    { id: 'dimBF', object: new XDimension(p, B, F, '2𝑘', { offset: -15 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimFC', object: new XDimension(p, F, C, '3𝑘', { offset: -15 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // hide (fadeOut)
            {
                group: [
                    { id: 'dimAC', animate: { mode: 'fadeOut', duration: 1.5 } },
                    { id: 'triACF', animate: { mode: 'fadeOut', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAC', action: 'hide' },
                    { id: 'triACF', action: 'hide' }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'triBAI', object: new XPolygon(p, [B, A, I], { filled: true, fillColor: [200, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triBFI', object: new XPolygon(p, [B, F, I], { filled: true, fillColor: [200, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAI', object: new XDimension(p, A, I, '2𝑙', { offset: 15 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimIF', object: new XDimension(p, I, F, '𝑙', { offset: 15 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2', 3: 'problem3' },
            solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 3,
            solutionPhaseCount: 3
        });

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
