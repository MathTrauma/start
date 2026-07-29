
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { COLORS } from '../../lib/config.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XRightAngle, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let O, A, B, C, D, X, M;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        const t = p.theme;
        const radius = 2;

        // 중심 O
        O = p.createVector(0, 0);

        // 극좌표로 점 정의: V(deg:r)
        const degToRad = (deg) => deg * Math.PI / 180;
        A = p.createVector(radius * Math.cos(degToRad(110)), radius * Math.sin(degToRad(110)));
        B = p.createVector(radius * Math.cos(degToRad(160)), radius * Math.sin(degToRad(160)));
        C = p.createVector(radius * Math.cos(degToRad(-110)), radius * Math.sin(degToRad(-110)));
        D = p.createVector(radius * Math.cos(degToRad(20)), radius * Math.sin(degToRad(20)));

        // X: AC와 BD의 교점
        X = intersectLines(A, C, B, D);

        // M: BD의 중점
        M = p5.Vector.add(B, D).mult(0.5);

        // 레이블 배치용 중심
        const center = p.createVector(0, 0);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phase 1: 사각형 ABCD =====
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D], { weight: 2 }), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { id: 'circleO', object: XCircle(p, O, radius, { startPoint: A }), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'pointO', object: new XPoint(p, O, 'O', { center }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // ===== Problem Phase 2: 중심과 이은 선분 그리기 =====
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'segAC', object: XSegment(p, A, C, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segBD', object: XSegment(p, B, D, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'rightAXB', object: new XRightAngle(p, A, X, B, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'segOA', object: XSegment(p, O, A), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segOC', object: XSegment(p, O, C), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'polyABCO', object: new XPolygon(p, [A, B, C, O], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'segOA', action: 'remove' },
                    { id: 'segOC', action: 'remove' }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: 등적변환 =====
        animator.registerPhase('solution1', [
            { id: 'segOM', object: XSegment(p, O, M, { dashed: true }), animate: { mode: 'draw', duration: 0.8 } },
            {
                group: [
                    { id: 'segMB', object: XSegment(p, M, B, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segMD', object: XSegment(p, M, D, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markMB', object: new XSegmentMarker(p, M, B, { mark: 2, color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markMD', object: new XSegmentMarker(p, M, D, { mark: 2, color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'rightOMD', object: new XRightAngle(p, O, M, D, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { id: 'polyABCO', animate: { mode: 'morph', duration: 1.5, morphTarget: [A, B, C, M] } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2: 재분해 =====
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'segAC', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'rightAXB', animate: { mode: 'fadeOut', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triAMB', object: new XPolygon(p, [A, M, B], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.5 } },
                    { id: 'triAMD', object: new XPolygon(p, [A, M, D], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triAMB', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triAMD', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'triAMB', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'triAMD', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'triCMB', object: new XPolygon(p, [C, M, B], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.5 } },
                    { id: 'triCMD', object: new XPolygon(p, [C, M, D], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triCMB', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triCMD', animate: { mode: 'travel', duration: 1.5 } }
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
                2: 'solution2'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
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
