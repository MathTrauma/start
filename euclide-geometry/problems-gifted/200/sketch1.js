
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

        // 점 정의
        // AB = 26, 원 중심 O, 반지름 13
        const O = p.createVector(0, 0);
        const A = p.createVector(-13, 0);
        const B = p.createVector(13, 0);
        const N = p.createVector(0, 13);
        const S = p.createVector(0, -13);

        // C: 직각삼각형 ABC, 직각 at C, BC=√26, AC=5√26
        const C = p.createVector(12, 5);
        // D: AC 위, AD:DC = 3:2
        const D = p.createVector(2, 3);
        // E: 하반원 위, ∠ADE=90°, DA=DE
        const E = p.createVector(5, -12);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, S], size, 50);

        // ===== Problem Phase 1 =====
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

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            // 하반원 (180° → 360°)
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
            // 치수선
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

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            { id: 'segAE', object: XSegment(p, A, E, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'angleDEA', object: new XAngleMarker(p, D, E, A, { marker: '45^\\circ', useTex: true, size: 9 }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // 뷰포트 확장 + 상반원 (0° → 180°)
            {
                group: [
                    { action: 'addToBounds', points: [N], duration: 1.0 },
                    { id: 'upperArc', object: XArc(p, O, RADIUS, 0, Math.PI, { filled: false, dashed: true, color: COLORS.green }), animate: { mode: 'draw', duration: 1.8 } }
                ],
                parallel: true
            },
            // DN 점선
            { id: 'segDN', object: XSegment(p, D, N, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointN', object: new XPoint(p, N, 'N', { center: O }), animate: { mode: 'draw', duration: 0.3 } },
            // NA, NB 점선
            {
                group: [
                    { id: 'segNA', object: XSegment(p, N, A, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segNB', object: XSegment(p, N, B, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // 각 NBA (45°)
            { id: 'angleNBA', object: new XAngleMarker(p, N, B, A, { marker: '45^\\circ', useTex: true, size: 9 }), animate: { mode: 'draw', duration: 0.8 } },
            // 선분 마커 NA[2], NB[2]
            {
                group: [
                    { id: 'markNA', object: new XSegmentMarker(p, N, A, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markNB', object: new XSegmentMarker(p, N, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 3 =====
        const LINE_HEIGHT = 28;
        const textX = 15;
        const textY = 20;
        const VP = '\\vphantom{\\overline{X}^2}';

        const text1 = new XText(p, [textX, textY],
            `${VP} \\overline{AD} = \\overline{DC} + \\overline{BC} \\Rightarrow y=2x + x`,
            { fontSize: 14, useTex: true, screenCoord: true, textAlign: p.LEFT });
        const text2 = new XText(p, [textX, textY + LINE_HEIGHT],
            `${VP} (5x)^2 + x^2 = 26^2`,
            { fontSize: 14, useTex: true, screenCoord: true, textAlign: p.LEFT });

        animator.registerPhase('solution3', [
            { id: 'text1', object: text1, animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.5 },
            { id: 'text2', object: text2, animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.5 }
        ]);

        // PhaseMap
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

        if (animator) {
            animator.updateAndDraw();
        }

        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
