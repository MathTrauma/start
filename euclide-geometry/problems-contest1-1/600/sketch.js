import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XCircle,
    XAngleMarker, XDimension, XText
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { getCircumcenter } from '../../lib/geometry.js';

const sketch = (p) => {
    let A, B, C, D, E;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점: A(0,0), D(4,0), B(10,0)
        A = p.createVector(0, 0);
        D = p.createVector(4, 0);
        B = p.createVector(10, 0);

        // C: 각이등분선 정리 AD/BD=2/3 → AC=2√10, BC=3√10 → cx=2.5, cy=3√15/2
        C = p.createVector(2.5, 3 * Math.sqrt(15) / 2);

        // E: 직선 AC 위, BE//CD 조건 (t=2.5 파라미터)
        E = p.createVector(6.25, 3 * Math.sqrt(15) / 2 * 2.5);

        // CDB 외접원
        const circumCDB = getCircumcenter(C, D, B);
        const rCDB = p5.Vector.dist(circumCDB, C);

        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        const t = p.theme;

        // ===== Problem Phase 1: 삼각형과 각이등분선 CD =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: -12, dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: 12, dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: -10, dy: -12 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.7 },
            // animation.md의 "draw segment AD"는 각이등분선 CD를 의미
            { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointD', object: new XPoint(p, D, 'D', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'angleACD', object: new XAngleMarker(p, A, C, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleDCB', object: new XAngleMarker(p, D, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAD', object: new XDimension(p, A, D, '4', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimDB', object: new XDimension(p, D, B, '6', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAC', object: new XDimension(p, A, C, '2x', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimCB', object: new XDimension(p, C, B, '3x', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Problem Phase 2: 점 E, BE//CD, BE=15 =====
        animator.registerPhase('problem2', [
            { action: 'addToBounds', points: [E], duration: 0.5 },
            {
                group: [
                    { id: 'segBE', object: XSegment(p, B, E, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCE', object: XSegment(p, C, E, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 10, dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'dimEB', object: new XDimension(p, E, B, '15', { offset: 10 }), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'angleEBC', object: new XAngleMarker(p, E, B, C, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCEB', object: new XAngleMarker(p, C, E, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: ACD~AEB 닮음으로 CD=6, BD=CD=6 확인 =====
        animator.registerPhase('solution1', [
            // travel용 삼각형 즉시 생성 (duration 0)
            {
                group: [
                    { id: 'triACD', object: new XPolygon(p, [A, C, D]), animate: { mode: 'draw', duration: 0 } },
                    { id: 'triAEB', object: new XPolygon(p, [A, E, B]), animate: { mode: 'draw', duration: 0 } }
                ],
                parallel: true
            },
            // pulse 각 + travel 삼각형 (1회차)
            {
                group: [
                    { id: 'angleCEB', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'angleACD', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'triACD', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triAEB', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            // travel 2회차
            {
                group: [
                    { id: 'triACD', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triAEB', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'dimCD', object: new XDimension(p, C, D, '6', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.5 },
            // CD=BD=6 강조
            {
                group: [
                    { id: 'dimCD', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'dimDB', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2: CDB 외접원 접선, AC²=AD·AB =====
        const textAC = new XText(p, { x: size * 0.2, y: 25 }, '\\overline{AC}^2 = \\overline{AD} \\cdot \\overline{AB}', {
            useTex: true, fontSize: 16, screenCoord: true, fillColor: p.theme.stroke
        });

        animator.registerPhase('solution2', [
            // 각도 마커만 개별 fade (angleCBD, angleACD 제외)
            {
                group: [
                    { id: 'angleDCB', set: { opacity: 0.2 } },
                    { id: 'angleEBC', set: { opacity: 0.2 } },
                    { id: 'angleCEB', set: { opacity: 0.2 } }
                ],
                parallel: true
            },
            // 남은 두 각 강조
            {
                group: [
                    { id: 'angleCBD', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleACD', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 1.5 },
            { id: 'circCDB', object: XCircle(p, circumCDB, rCDB), animate: { mode: 'draw', duration: 1.8 } },
            {
                group: [
                    { id: 'fillACD', object: new XPolygon(p, [A, C, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillABC', object: new XPolygon(p, [A, B, C], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'fillACD', animate: { mode: 'travel', duration: 1.7 } },
                    { id: 'fillABC', animate: { mode: 'travel', duration: 1.7 } },
                    { id: 'textAC', object: textAC, animate: { mode: 'draw', duration: 1.7 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
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
