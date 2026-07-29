
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XArc, XRightAngle, XAngleMarker, XSegmentMarker, XDimension, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let animator;
    const RADIUS = 13;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 점 정의 (sketch1.js와 동일)
        const O = p.createVector(0, 0);
        const A = p.createVector(-13, 0);
        const B = p.createVector(13, 0);
        const S = p.createVector(0, -13);

        const C = p.createVector(12, 5);
        const D = p.createVector(2, 3);
        const E = p.createVector(5, -12);

        // F: B에서 DE에 내린 수선의 발
        const F = p.createVector(3, -2);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, S], size, 50);

        // ===== Problem Phase 1 (sketch1과 동일) =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center: O }), animate: { mode: 'draw', duration: 0.4 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center: O }), animate: { mode: 'draw', duration: 0.4 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center: O }), animate: { mode: 'draw', duration: 0.4 } }
                ],
                parallel: true
            },
            { id: 'rightACB', object: new XRightAngle(p, A, C, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2 (sketch1과 동일) =====
        animator.registerPhase('problem2', [
            { id: 'lowerArc', object: XArc(p, O, RADIUS, Math.PI, 2 * Math.PI, { filled: false }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center: O }), animate: { mode: 'draw', duration: 0.4 } },
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center: O }), animate: { mode: 'draw', duration: 0.4 } }
                ],
                parallel: true
            },
            { id: 'segDE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 1.1 } },
            { id: 'rightADE', object: new XRightAngle(p, A, D, E, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 },
            { id: 'dimCB', object: new XDimension(p, C, B, 'x', { offset: 10 }), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'dimDC', object: new XDimension(p, D, C, '2x', { offset: 10 }), animate: { mode: 'draw', duration: 1.1 } },
            {
                group: [
                    { id: 'dimAD', object: new XDimension(p, A, D, 'y', { offset: 10 }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'dimDE', object: new XDimension(p, D, E, 'y', { offset: 10 }), animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Alt Solution Phase 1: 삼각형 ABC 강조 + 피타고라스 =====
        const t = p.theme;
        const greenFill = [...[0, 255, 0].slice(0, 3), 60];

        const VP = '\\vphantom{\\overline{X}^2}';
        const text1 = new XText(p, [15, 20],
            `${VP} \\overline{AC}^2 + \\overline{CB}^2 = \\overline{AB}^2`,
            { fontSize: 14, useTex: true, screenCoord: true, textAlign: p.LEFT });
        const text1b = new XText(p, [15, 48],
            `${VP} \\Rightarrow (y+2x)^2 + x^2 = 26^2`,
            { fontSize: 14, useTex: true, screenCoord: true, textAlign: p.LEFT });

        animator.registerPhase('altSolution1', [
            { id: 'greenABC', object: new XPolygon(p, [A, B, C], { filled: true, fillColor: greenFill, color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'greenABC', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'text1', object: text1, animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'text1b', object: text1b, animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // ===== Alt Solution Phase 2: 수선의 발 F, 삼각형 BFE, AEB =====
        const text2 = new XText(p, [size - 15, 20],
            `${VP} \\overline{EB}^2 = (y-x)^2 + (2x)^2`,
            { fontSize: 14, useTex: true, screenCoord: true, textAlign: p.RIGHT });
        const text3 = new XText(p, [size - 15, 48],
            `${VP} \\overline{AE}^2 + \\overline{EB}^2 = \\overline{AB}^2 \\Rightarrow 2y^2 + (y-x)^2 + (2x)^2 = 26^2`,
            { fontSize: 14, useTex: true, screenCoord: true, textAlign: p.RIGHT });

        animator.registerPhase('altSolution2', [
            { id: 'greenABC', action: 'hide', duration: 0.5 },
            {
                group: [
                    { id: 'segEB', object: XSegment(p, E, B), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'segFB', object: XSegment(p, F, B), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            // 삼각형 BFE
            { id: 'triBFE', object: new XPolygon(p, [B, F, E]), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'pointF', object: new XPoint(p, F, 'F', { dx: -15 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightEFB', object: new XRightAngle(p, E, F, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            {
                group: [
                    { id: 'dimDE', action: 'hide', duration: 1.2 },
                    { id: 'dimFB', object: new XDimension(p, F, B, '2x', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimFE', object: new XDimension(p, F, E, 'y-x', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'text2', object: text2, animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 },
            // 숨기고 삼각형 AEB
            { id: 'triBFE', action: 'hide', duration: 0.5 },
            { id: 'greenAEB', object: new XPolygon(p, [A, E, B], { filled: true, fillColor: greenFill, color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'rightBEA', object: new XRightAngle(p, B, E, A, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            { id: 'greenAEB', animate: { mode: 'pulse', duration: 1.0 } },
            { id: 'text3', object: text3, animate: { mode: 'draw', duration: 1.0 } },
            { delay: 2.0 }
        ]);

        // PhaseMap
        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'altSolution1', 2: 'altSolution2' }
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

        if (animator) {
            animator.updateAndDraw();
        }

        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
