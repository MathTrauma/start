import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XAngleMarker,
    XCircle, XDimension
} from '../../lib/x_object.js';
import { circleLineIntersection } from '../../lib/geometry.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, P;
    let animator;
    let size;

    p.setup = function () {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        const deg = Math.PI / 180;

        A = p.createVector(0, 0);
        C = p.createVector(4 * Math.cos(230 * deg), 4 * Math.sin(230 * deg));
        D = p.createVector(4 * Math.cos(-50 * deg), 4 * Math.sin(-50 * deg));

        // P on AC with AP:PC = 3:1
        P = p5.Vector.add(
            p5.Vector.mult(A, 1 / 4),
            p5.Vector.mult(C, 3 / 4)
        );

        // B: intersection of line DP with circle O (center A, radius 4), not D
        const hits = circleLineIntersection(A, 4, D, P);
        B = hits[0];
        if (p5.Vector.dist(B, D) < 0.01) B = hits[1];

        const r = 4; // circle radius

        // 사각형 중심 (display 위치 자동 계산용)
        const center = p5.Vector.add(p5.Vector.add(A, B), p5.Vector.add(C, D)).mult(0.25);

        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size, 50);

        // ── Problem Phase 1 ──
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { delay: 0.7 },
            {
                group: [
                    { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { id: 'ptP', object: new XPoint(p, P, 'P', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'dimAD', object: new XDimension(p, A, D, '4', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimPA', object: new XDimension(p, P, A, '3', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimCP', object: new XDimension(p, C, P, '1', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
        ]);

        // ── Solution Phase 1 ──
        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { marker: 'θ' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleCAD', object: new XAngleMarker(p, C, A, D, { marker: '2θ' }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            { id: 'circO', object: XCircle(p, A, r), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 1.5 },
        ]);

        const phaseMap = {
            problem: { 1: 'problem1' },
            solution: { 1: 'solution1' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 1,
            solutionPhaseCount: 1
        });
    };

    p.draw = function () {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
