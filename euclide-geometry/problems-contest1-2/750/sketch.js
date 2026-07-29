import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XDimension, XSegmentMarker, XText, XCircle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';
import { circleLineIntersection, intersectLines } from '../../lib/geometry.js';

const sketch = (p) => {
    let A, B, C, D, P, Q, X, O;
    let animator;
    let size;

    p.setup = function() {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        const r = 2 * Math.SQRT2;
        const toRad = (deg) => deg * Math.PI / 180;

        O = p.createVector(0, 0);
        Q = p.createVector(r * Math.cos(toRad(15)), r * Math.sin(toRad(15)));
        A = p.createVector(r * Math.cos(toRad(105)), r * Math.sin(toRad(105)));
        B = p.createVector(r * Math.cos(toRad(195)), r * Math.sin(toRad(195)));
        C = p.createVector(r * Math.cos(toRad(-15)), r * Math.sin(toRad(-15)));

        // D: on BC with BD = 4
        const dirBC = p5.Vector.sub(C, B).normalize();
        D = p5.Vector.add(B, p5.Vector.mult(dirBC, 4));

        // P: intersection of line AD and circle O (not A)
        const hits = circleLineIntersection(O, r, A, D);
        P = (p5.Vector.dist(hits[0], A) > 0.01) ? hits[0] : hits[1];

        // X: intersection of seg DQ and seg AC
        X = intersectLines(D, Q, A, C);

        // Animator
        animator = new XAnimator(p);
        animator.initViewport([A, B, P, C], size, 50);

        const center = p5.Vector.add(p5.Vector.add(A, B), p5.Vector.add(C, P)).mult(0.25);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'circO', object: XCircle(p, O, r), animate: { mode: 'draw', duration: 1.7 } },
            { delay: 0.3 },
            { id: 'segAP', object: XSegment(p, A, P), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'ptD', object: new XPoint(p, D, 'D', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptP', object: new XPoint(p, P, 'P', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.4 },
            { id: 'angleCDA', object: new XAngleMarker(p, C, D, A, { marker: '120°' }), animate: { mode: 'draw', duration: 0.8 } },
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            { id: 'ptQ', object: new XPoint(p, Q, 'Q', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'segDQ', object: XSegment(p, D, Q), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'rightCXQ', object: new XRightAngle(p, C, X, Q, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: '15°' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'segCQ', object: XSegment(p, C, Q), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segCP', object: XSegment(p, C, P), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'markCQ', object: new XSegmentMarker(p, C, Q, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markCP', object: new XSegmentMarker(p, C, P, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
                ],
                parallel: true
            },
            { id: 'dimBD', object: new XDimension(p, B, D, '4', { offset: -10 }), animate: { mode: 'draw', duration: 1.1 } },
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            { id: 'segAQ', object: XSegment(p, A, Q), animate: { mode: 'draw', duration: 1.3 } },
            {
                group: [
                    { id: 'text1', object: new XText(p, [20, 25], '\\overline{CP} = \\overline{CQ} \\Longrightarrow \\angle CAQ = \\angle DAC', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleCAQ', object: new XAngleMarker(p, C, A, Q, { marker: '15°' }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'markDX', object: new XSegmentMarker(p, D, X, { mark: 2 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'markXQ', object: new XSegmentMarker(p, X, Q, { mark: 2 }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'markCD', object: new XSegmentMarker(p, C, D, { mark: 1 }), animate: { mode: 'draw', duration: 0.6 } },
                    { id: 'markAD', object: new XSegmentMarker(p, A, D, { mark: 3 }), animate: { mode: 'draw', duration: 0.6 } },
                    { id: 'markAQ', object: new XSegmentMarker(p, A, Q, { mark: 3 }), animate: { mode: 'draw', duration: 0.6 } },
                ],
                parallel: true
            },
            { delay: 1.0 },
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'triACD', object: new XPolygon(p, [A, C, D], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.4 } },
                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: '45°' }), animate: { mode: 'draw', duration: 1.0 } },
                ],
                parallel: true
            },
            { id: 'angleQCA', object: new XAngleMarker(p, Q, C, A, { marker: '45°' }), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'rightQCD', object: new XRightAngle(p, Q, C, D, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 },
            { id: 'triACD', action: 'hide', duration: 0.7 },
            {
                group: [
                    { id: 'polyAPCQ', object: new XPolygon(p, [A, P, C, Q], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.6 } },
                    { id: 'angleDCP', object: new XAngleMarker(p, D, C, P, { marker: '60°' }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
        ]);

        // ===== Solution Phase 3 =====
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 'polyAPCQ', action: 'hide', duration: 0.8 },
                    { id: 'angleCDA', action: 'fade', opacity: 0.3, duration: 0.8 },
                    { id: 'angleADB', object: new XAngleMarker(p, A, D, B, { marker: '60°' }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { id: 'anglePDC', object: new XAngleMarker(p, P, D, C, { marker: '60°' }), animate: { mode: 'draw', duration: 0.8 } },
            {
                group: [
                    { id: 'markDP', object: new XSegmentMarker(p, D, P, { mark: 1 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAD', object: new XDimension(p, A, D, '4', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBA', object: new XDimension(p, B, A, '4', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
        ]);

        // ===== Solution Phase 4 =====
        animator.registerPhase('solution4', [
            { id: 'triBCQ', object: new XPolygon(p, [B, C, Q], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.8 } },
            {
                group: [
                    { id: 'triBCQ', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'rightQCD', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'rightBAQ', object: new XRightAngle(p, B, A, Q, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'triBCQ', action: 'hide', duration: 1.0 },
                    { id: 'triABQ', object: new XPolygon(p, [A, B, Q], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.8 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleACB', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleAQB', object: new XAngleMarker(p, A, Q, B, { marker: '45°' }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAQ', object: new XDimension(p, A, Q, '4', { offset: 10 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'dimBQ', object: new XDimension(p, B, Q, '4\\sqrt{2}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 1.0 } },
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { action: 'fade', targets: ['anglePDC', 'angleDCP'], opacity: 0.3, duration: 1.2 },
                    { id: 'dimDC', object: new XDimension(p, D, C, 'x', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimCQ', object: new XDimension(p, C, Q, 'x', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { delay: 2.0 },
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3', 4: 'solution4' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 4
        });
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

new p5(sketch, 'canvas-wrapper');
