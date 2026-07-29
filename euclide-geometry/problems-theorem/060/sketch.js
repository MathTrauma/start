import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let O, E, F, G, H, A, B, C, D;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        const r = 4;
        const toRad = deg => deg * Math.PI / 180;

        O = p.createVector(0, 0);
        E = p.createVector(r * Math.cos(toRad(140)), r * Math.sin(toRad(140)));
        F = p.createVector(r * Math.cos(toRad(-90)), r * Math.sin(toRad(-90)));
        G = p.createVector(r * Math.cos(toRad(10)),  r * Math.sin(toRad(10)));
        H = p.createVector(r * Math.cos(toRad(77)),  r * Math.sin(toRad(77)));

        // 원점 중심 반지름 r인 원 위의 P, Q에서 접선의 교점
        function tangentIntersect(P, Q) {
            const det = P.x * Q.y - P.y * Q.x;
            const r2 = r * r;
            return p.createVector(r2 * (Q.y - P.y) / det, r2 * (P.x - Q.x) / det);
        }

        A = tangentIntersect(E, H);
        B = tangentIntersect(E, F);
        C = tangentIntersect(F, G);
        D = tangentIntersect(G, H);

        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size, 50);

        const t = p.theme;

        // ===== 문제 Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dy: -12 }),        animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -15 }),        animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 12, dy: 12 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'ptD', object: new XPoint(p, D, 'D', { dx: 12 }),         animate: { mode: 'draw', duration: 0.5 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segAO', object: XSegment(p, A, O), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBO', object: XSegment(p, B, O), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCO', object: XSegment(p, C, O), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleBAO', object: new XAngleMarker(p, B, A, O, { marker: 'α' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleOAD', object: new XAngleMarker(p, O, A, D, { marker: 'α' }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'angleCBO', object: new XAngleMarker(p, C, B, O, { marker: 'β' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleOBA', object: new XAngleMarker(p, O, B, A, { marker: 'β' }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'angleDCO', object: new XAngleMarker(p, D, C, O, { marker: 'γ' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleOCB', object: new XAngleMarker(p, O, C, B, { marker: 'γ' }), animate: { mode: 'draw', duration: 0.8 } },
                ],
                parallel: true
            },
            { delay: 0.3 },
        ]);

        // ===== 풀이 Phase 1 =====
        animator.registerPhase('solution1', [
            { id: 'ptO', object: new XPoint(p, O, 'O', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'segOE', object: XSegment(p, O, E), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segOH', object: XSegment(p, O, H), animate: { mode: 'draw', duration: 1.0 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'rightAEO', object: new XRightAngle(p, A, E, O, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'rightAHO', object: new XRightAngle(p, A, H, O, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 삼각형 OAE, OAH 녹색
            {
                group: [
                    { id: 'triOAE', object: new XPolygon(p, [O, A, E], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triOAH', object: new XPolygon(p, [O, A, H], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                ],
                parallel: true
            },
            // travel + after 1s: XSegmentMarker OE[2], OH[2]
            {
                group: [
                    { id: 'triOAE', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triOAH', animate: { mode: 'travel', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            {
                                group: [
                                    { id: 'markOE', object: new XSegmentMarker(p, O, E, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                                    { id: 'markOH', object: new XSegmentMarker(p, O, H, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                                ],
                                parallel: true
                            },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'triOAE', action: 'hide', duration: 0.5 },
                    { id: 'triOAH', action: 'hide', duration: 0.5 },
                ],
                parallel: true
            },
            // 선분 OF, 직각 OFC
            { id: 'segOF', object: XSegment(p, O, F), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'rightOFC', object: new XRightAngle(p, O, F, C, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 0.3 },
            // 삼각형 OBE, OBF 노란색
            {
                group: [
                    { id: 'triOBE', object: new XPolygon(p, [O, B, E], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triOBF', object: new XPolygon(p, [O, B, F], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.5 } },
                ],
                parallel: true
            },
            // travel + after 1s: XSegmentMarker OF[2]
            {
                group: [
                    { id: 'triOBE', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triOBF', animate: { mode: 'travel', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'markOF', object: new XSegmentMarker(p, O, F, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'triOBE', action: 'hide', duration: 0.5 },
                    { id: 'triOBF', action: 'hide', duration: 0.5 },
                ],
                parallel: true
            },
            // 선분 OG, 직각 OGC
            { id: 'segOG', object: XSegment(p, O, G), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'rightOGC', object: new XRightAngle(p, O, G, C, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 0.3 },
            // 삼각형 OCF, OCG 분홍색
            {
                group: [
                    { id: 'triOCF', object: new XPolygon(p, [O, C, F], { color: COLORS.pink }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triOCG', object: new XPolygon(p, [O, C, G], { color: COLORS.pink }), animate: { mode: 'draw', duration: 1.5 } },
                ],
                parallel: true
            },
            // travel + after 1s: XSegmentMarker OG[2]
            {
                group: [
                    { id: 'triOCF', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triOCG', animate: { mode: 'travel', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'markOG', object: new XSegmentMarker(p, O, G, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'triOCF', action: 'hide', duration: 0.5 },
                    { id: 'triOCG', action: 'hide', duration: 0.5 },
                ],
                parallel: true
            },
            { delay: 1.0 },
        ]);

        // ===== 풀이 Phase 2 =====
        animator.registerPhase('solution2', [
            { id: 'segOD', object: XSegment(p, O, D), animate: { mode: 'draw', duration: 1.2 } },
            // pulse [rightOGC, rightAHO] || pulse [segOH, segOG, segOD]
            {
                group: [
                    { id: 'rightOGC', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'rightAHO', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segOH',    animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segOG',    animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segOD',    animate: { mode: 'pulse', duration: 1.5 } },
                ],
                parallel: true
            },
            { delay: 0.7 },
            // filldraw OHD, OGD 같은 색
            {
                group: [
                    { id: 'fillOHD', object: new XPolygon(p, [O, H, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillOGD', object: new XPolygon(p, [O, G, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                ],
                parallel: true
            },
            // 각 ADO, ODC (star)
            {
                group: [
                    { id: 'angleADO', object: new XAngleMarker(p, A, D, O, { marker: 'star' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleODC', object: new XAngleMarker(p, O, D, C, { marker: 'star' }), animate: { mode: 'draw', duration: 1.0 } },
                ],
                parallel: true
            },
            { delay: 2.0 },
        ]);

        const phaseMap = {
            problem:  { 1: 'problem1' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 1,
            solutionPhaseCount: 2
        });

        animator.playSequence(['problem1']);
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
