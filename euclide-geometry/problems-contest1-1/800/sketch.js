import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XAngleMarker,
    XCircle, XDimension, XRightAngle
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const BLUE = '#89B4FA'; // COLORS에 없어 직접 정의

const sketch = (p) => {
    let A, B, C, I, IA, T, X, Y, H, S;
    let r1, r2;
    let animator;
    let size;

    p.setup = function () {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점
        A  = p.createVector(0, 0);
        B  = p.createVector(6, 0);
        C  = p.createVector(8, 8 * Math.sqrt(3));
        I  = p.createVector(4, 4 / Math.sqrt(3));
        IA = p.createVector(18, 6 * Math.sqrt(3));
        T  = p.createVector(18, 0);
        X  = p.createVector(22, 0);
        Y  = p.createVector(12, 12 * Math.sqrt(3));
        H  = p.createVector(18, 4 / Math.sqrt(3));
        S  = p.createVector(4, 0);  // 내접원과 AB의 접점, 접선 길이 = s-a = 4

        // 반지름
        r1 = 4 / Math.sqrt(3);          // 내접원: Area/s = 24√3/18
        r2 = 6 * Math.sqrt(3);          // 방접원: Area/(s-a) = 24√3/4

        animator = new XAnimator(p);
        animator.initViewport([A, B, C, X, Y], size, 50);

        // ── Problem Phase 1 ──
        animator.registerPhase('problem1', [
            { action: 'setBounds', points: [A, B, C], replace: true, duration: 0 },
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.7 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { delay: 0.7 },
            {
                group: [
                    { id: 'dimAB', object: new XDimension(p, A, B, '6', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAC', object: new XDimension(p, A, C, '16', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: '60°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.5 },
        ]);

        // ── Problem Phase 2 ──
        animator.registerPhase('problem2', [
            { id: 'circO1', object: XCircle(p, I, r1), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'ptI', object: new XPoint(p, I, 'I', { dx: -12, dy: 0 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            {
                group: [
                    { action: 'addToBounds', points: [X, Y], duration: 1.5 },
                    {
                        group: [
                            { id: 'segBX', object: XSegment(p, B, X, { dashed: true }), animate: { mode: 'draw', duration: 2.0 } },
                            { id: 'segCY', object: XSegment(p, C, Y, { dashed: true }), animate: { mode: 'draw', duration: 2.0 } },
                        ],
                        parallel: true
                    },
                ],
                parallel: true
            },
            { id: 'circO2', object: XCircle(p, IA, r2), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'ptIA', object: new XPoint(p, IA, 'I_A', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'segIIA', object: XSegment(p, I, IA, { color: BLUE }), animate: { mode: 'draw', duration: 1.3 } },
            { delay: 1.5 },
        ]);

        // ── Solution Phase 1 ──
        animator.registerPhase('solution1', [
            { id: 'dimBC', object: new XDimension(p, B, C, '14', { offset: -10 }), animate: { mode: 'draw', duration: 1.3 } },
            { id: 'dimAB', action: 'fade', opacity: 0.3, duration: 0.5 },
            {
                group: [
                    { id: 'segIS', object: XSegment(p, I, S), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segIAT', object: XSegment(p, IA, T), animate: { mode: 'draw', duration: 1.0 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'rightXSI', object: new XRightAngle(p, X, S, I, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                    { id: 'rightXTIA', object: new XRightAngle(p, X, T, IA, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAS', object: new XDimension(p, A, S, '4', { offset: 10 }),   animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAT', object: new XDimension(p, A, T, '18', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
        ]);

        // ── Solution Phase 2 ──
        animator.registerPhase('solution2', [
            { id: 'triIAIH', object: new XPolygon(p, [IA, I, H], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'dimIH', object: new XDimension(p, I, H, '14', { offset: -10 }), animate: { mode: 'draw', duration: 1.3 } },
            { id: 'rightIAHI', object: new XRightAngle(p, IA, H, I, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'angleHIIA', object: new XAngleMarker(p, H, I, IA, { marker: '30°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 },
        ]);

        const phaseMap = {
            problem:  { 1: 'problem1',  2: 'problem2'  },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
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
