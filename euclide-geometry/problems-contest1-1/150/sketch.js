import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XAngleMarker,
    XDimension, XRightAngle, XSegmentMarker, XText
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';
import { projectPointToLine } from '../../lib/geometry.js';

const sketch = (p) => {
    let A, B, C, M, D, E, F;
    let animator;
    let size;

    p.setup = function () {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점: B,C x축 대칭, BC 중점 = 원점
        const sqrt10 = Math.sqrt(10);
        B = p.createVector(-16 * sqrt10 / 5, 0);
        C = p.createVector(16 * sqrt10 / 5, 0);
        A = p.createVector(2 * sqrt10, 18 * sqrt10 / 5);
        M = p.createVector(0, 0);

        // D: 각 A의 이등분선과 BC의 수직이등분선(x=0)의 교점
        const abDir = p5.Vector.sub(B, A).normalize();
        const acDir = p5.Vector.sub(C, A).normalize();
        const bisDir = p5.Vector.add(abDir, acDir);
        const tD = -A.x / bisDir.x;
        D = p5.Vector.add(A, p5.Vector.mult(bisDir, tD));

        // E: D에서 AB에 내린 수선의 발
        E = projectPointToLine(D, A, B);
        // F: D에서 AC에 내린 수선의 발
        F = projectPointToLine(D, A, C);

        animator = new XAnimator(p);
        animator.initViewport([A, B, D, F], size, 50);

        // ── Problem Phase 1 ──
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { center: M }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { center: M }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { delay: 0.4 },
            {
                group: [
                    { id: 'ptM', object: new XPoint(p, M, 'M', { center: A }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markBM', object: new XSegmentMarker(p, B, M, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markMC', object: new XSegmentMarker(p, M, C, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segMD', object: XSegment(p, M, D), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptD', object: new XPoint(p, D, 'D', { center: A }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleDAF', object: new XAngleMarker(p, D, A, F, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'rightDMC', object: new XRightAngle(p, D, M, C, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
        ]);

        // ── Problem Phase 2 ──
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'segDB', object: XSegment(p, D, B), animate: { mode: 'draw', duration: 0.9 } },
                    { id: 'segDC', object: XSegment(p, D, C), animate: { mode: 'draw', duration: 0.9 } },
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'segDE', object: XSegment(p, D, E, { dashed: true }), animate: { mode: 'draw', duration: 0.9 } },
                    { id: 'segCF', object: XSegment(p, C, F, { dashed: true }), animate: { mode: 'draw', duration: 0.9 } },
                    { id: 'segDF', object: XSegment(p, D, F, { dashed: true }), animate: { mode: 'draw', duration: 0.9 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'rightBED', object: new XRightAngle(p, B, E, D, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'rightDFC', object: new XRightAngle(p, D, F, C, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptE', object: new XPoint(p, E, 'E', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptF', object: new XPoint(p, F, 'F', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'dimBE', object: new XDimension(p, B, E, '4', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimCD', object: new XDimension(p, C, D, '4\\sqrt{10}', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
        ]);

        // ── Solution Phase 1 ──
        animator.registerPhase('solution1', [
            {
                group: [
                    { action: 'fade', targets: ['segAD', 'dimBE', 'dimCD'], opacity: 0.3, duration: 0.5 },
                    {
                        group: [
                            { id: 'triDMB', object: new XPolygon(p, [D, M, B]), animate: { mode: 'travel', duration: 0.8 } },
                            { id: 'triDMB', animate: { mode: 'travel', duration: 0.8 } },
                        ],
                        parallel: false
                    },
                    {
                        group: [
                            { id: 'triDMC', object: new XPolygon(p, [D, M, C]), animate: { mode: 'travel', duration: 0.8 } },
                            { id: 'triDMC', animate: { mode: 'travel', duration: 0.8 } },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { id: 'triDMB', action: 'remove' },
            { id: 'triDMC', action: 'remove' },
            { id: 'segDB', action: 'remove' },
            { id: 'segDC', action: 'remove' },
            {
                group: [
                    { id: 'segDB_g', object: XSegment(p, D, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segDC_g', object: XSegment(p, D, C, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markDB', object: new XSegmentMarker(p, D, B, { mark: 2 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markDC', object: new XSegmentMarker(p, D, C, { mark: 2 }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
        ]);

        // ── Solution Phase 2 ──
        animator.registerPhase('solution2', [
            { action: 'fade', targets: ['segDB_g', 'segDC_g'], opacity: 0.3, duration: 0.6 },
            {
                group: [
                    { id: 'fillADE', object: new XPolygon(p, [A, D, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillADF', object: new XPolygon(p, [A, D, F], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillADE', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'fillADF', animate: { mode: 'travel', duration: 1.5 } },
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'segDE', action: 'remove' },
            { id: 'segDF', action: 'remove' },
            {
                group: [
                    { id: 'segDE_y', object: XSegment(p, D, E, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segDF_y', object: XSegment(p, D, F, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markDE', object: new XSegmentMarker(p, D, E, { mark: 3 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markDF', object: new XSegmentMarker(p, D, F, { mark: 3 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'fillADE', action: 'hide', duration: 0.7 },
                    { id: 'fillADF', action: 'hide', duration: 0.7 },
                ],
                parallel: true
            },
            { delay: 1.0 },
        ]);

        // ── Solution Phase 3 ──
        animator.registerPhase('solution3', [
            // recover green DB, DC
            {
                group: [
                    { id: 'segDB_g', action: 'recover', duration: 0.7 },
                    { id: 'segDC_g', action: 'recover', duration: 0.7 },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'fillDEB', object: new XPolygon(p, [D, E, B], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'fillDFC', object: new XPolygon(p, [D, F, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.3 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'fillDEB', animate: { mode: 'pulse', duration: 1.8 } },
                    { id: 'fillDFC', animate: { mode: 'pulse', duration: 1.8 } },
                    { id: 'dimCF', object: new XDimension(p, C, F, '4', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'text1', object: new XText(p, [20, 25], '\\overline{CF} = \\overline{DB}',
                        { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                      animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'dimDF', object: new XDimension(p, D, F, '12', { offset: -10 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 },
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 3
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
