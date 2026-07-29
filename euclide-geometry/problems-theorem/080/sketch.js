import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XSegmentMarker, XRightAngle, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { projectPointToLine } from '../../lib/geometry.js';

const sketch = (p) => {
    let N, S, A, B, C, Cprime, D, E, X, Y;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        const r = 2;
        const toRad = deg => deg * Math.PI / 180;

        N = p.createVector(r * Math.cos(toRad(90)),   r * Math.sin(toRad(90)));
        S = p.createVector(r * Math.cos(toRad(-90)),  r * Math.sin(toRad(-90)));
        A = p.createVector(r * Math.cos(toRad(25)),   r * Math.sin(toRad(25)));
        B = p.createVector(r * Math.cos(toRad(230)),  r * Math.sin(toRad(230)));
        C = p.createVector(r * Math.cos(toRad(-50)),  r * Math.sin(toRad(-50)));

        // X: midpoint of BC
        X = p5.Vector.add(B, C).mult(0.5);

        // C': extends BA through A with AC' = AC
        const AC_len = p5.Vector.dist(A, C);
        const dirBA = p5.Vector.sub(A, B).normalize();
        Cprime = p5.Vector.add(A, p5.Vector.mult(dirBA, AC_len));

        // D: projection of N onto AB
        D = projectPointToLine(N, A, B);

        // E: midpoint of CC'
        E = p5.Vector.add(C, Cprime).mult(0.5);

        // Y: extends segment NA through N, 0.5 times length NA
        const NA_len = p5.Vector.dist(N, A);
        const dirNA = p5.Vector.sub(N, A).normalize();
        Y = p5.Vector.add(N, p5.Vector.mult(dirNA, NA_len * 0.5));

        const O_circ = p.createVector(0, 0);

        animator = new XAnimator(p);
        animator.initViewport([N, B, S, C, A], size, 50);

        const t = p.theme;

        // ===== 문제 Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dy: -12 }),        animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 12, dy: 10 }),  animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { id: 'circABC', object: XCircle(p, O_circ, r), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'ptX', object: new XPoint(p, X, ''), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'markBX', object: new XSegmentMarker(p, B, X, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markXC', object: new XSegmentMarker(p, X, C, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
                ],
                parallel: true
            },
            { id: 'segNS', object: XSegment(p, N, S), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'ptN', object: new XPoint(p, N, 'N', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptS', object: new XPoint(p, S, 'S', { dy: 12 }),  animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { id: 'rightCXN', object: new XRightAngle(p, C, X, N, 14, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.5 },
            {
                group: [
                    { id: 'circABC', action: 'fade', opacity: 0.2, duration: 0.3 },
                    { id: 'segNS',   action: 'fade', opacity: 0.2, duration: 0.3 },
                ],
                parallel: true
            },
        ]);

        // ===== 문제 Phase 2 =====
        animator.registerPhase('problem2', [
            { id: 'segND', object: XSegment(p, N, D), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'ptD', object: new XPoint(p, D, 'D', { dx: 12, dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightADN', object: new XRightAngle(p, A, D, N, 14, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            {
                group: [
                    {
                        group: [
                            { id: 'textBD', object: new XText(p, p5.Vector.add(B, D).mult(0.5), '①', { fontSize: 16 }), animate: { mode: 'draw', duration: 1.0 } },
                            { id: 'textDA', object: new XText(p, p5.Vector.add(D, A).mult(0.5), '②', { fontSize: 16 }), animate: { mode: 'draw', duration: 1.0 } },
                            { id: 'textAC', object: new XText(p, p5.Vector.add(A, C).mult(0.5), '③', { fontSize: 16 }), animate: { mode: 'draw', duration: 1.0 } },
                        ],
                        parallel: true
                    },
                    { id: 'textEq', object: new XText(p, [20, 25], '① = ② + ③', { fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.0 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
        ]);

        // ===== 풀이 Phase 1 =====
        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'textBD', action: 'fade', opacity: 0.2, duration: 0.3 },
                    { id: 'textDA', action: 'fade', opacity: 0.2, duration: 0.3 },
                ],
                parallel: true
            },
            {
                group: [
                    { action: 'addToBounds', points: [Cprime], duration: 2.0 },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'segND', animate: { mode: 'draw', duration: 1.3 } },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { id: 'segACp', object: XSegment(p, A, Cprime), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'ptCp', object: new XPoint(p, Cprime, "C'", { dx: 12, dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'textACp', object: new XText(p, p5.Vector.add(A, Cprime).mult(0.5), '③', { fontSize: 16 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'segCCp', object: XSegment(p, C, Cprime), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segYE',  object: XSegment(p, Y, E),       animate: { mode: 'draw', duration: 1.5 } },
                ],
                parallel: true
            },
            { id: 'rightCpEY', object: new XRightAngle(p, Cprime, E, Y, 14, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
            { delay: 1.2 },
            {
                group: [
                    { id: 'segNC',  object: XSegment(p, N, C,      { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segNCp', object: XSegment(p, N, Cprime, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'markNC',  object: new XSegmentMarker(p, N, C,      { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markNCp', object: new XSegmentMarker(p, N, Cprime, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            { delay: 2.0 },
        ]);

        // ===== 풀이 Phase 2 =====
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'markBX', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'markXC', animate: { mode: 'pulse', duration: 1.5 } },
                ],
                parallel: true
            },
            { id: 'segNB', object: XSegment(p, N, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'markNB', object: new XSegmentMarker(p, N, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.0 },
            { id: 'fillNBCp', object: new XPolygon(p, [N, B, Cprime], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'segND', animate: { mode: 'pulse', duration: 2.0 } },
            {
                group: [
                    { id: 'segDB',  object: XSegment(p, D, B),      animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'segDCp', object: XSegment(p, D, Cprime), animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'textBD', action: 'recover', duration: 0.5 },
                    { id: 'textDA', action: 'recover', duration: 0.5 },
                ],
                parallel: true
            },
        ]);

        const phaseMap = {
            problem:  { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
        });

        animator.playSequence(['problem1', 'problem2']);
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
