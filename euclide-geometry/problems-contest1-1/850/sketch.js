import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XDimension, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, P, Y, O, omegaCenter;
    let R, omegaR;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(5.038, 3.346);
        B = p.createVector(-5.710, -1.992);
        C = p.createVector(3.950, -4.580);

        // 외접원
        O = p.createVector(0, 0);
        R = 6.047;

        // D: BC를 3:2로 내분
        D = p5.Vector.add(p5.Vector.mult(B, 2), p5.Vector.mult(C, 3)).div(5);

        // 내접원 Ω
        omegaCenter = p.createVector(1.260, 0.837);
        omegaR = 4.536;

        // P: 외접원의 A에서의 접선과 직선 BC의 교점
        P = p.createVector(11.677, -6.650);

        // Y: ray PA beyond A, YA = 2
        Y = p.createVector(3.932, 5.012);

        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.7 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAB', object: new XDimension(p, A, B, '12', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBC', object: new XDimension(p, B, C, '10', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAC', object: new XDimension(p, A, C, '8', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            { id: 'circABC', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 1.8 } },
            { delay: 0.5 },
            { id: 'circOmega', object: XCircle(p, omegaCenter, omegaR), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            { action: 'fade', targets: ['dimAB', 'dimBC', 'dimAC'], opacity: 0.3, duration: 0.7 },
            { action: 'addToBounds', points: [P], duration: 1.2 },
            { delay: 0.5 },
            {
                group: [
                    { id: 'segPY', object: XSegment(p, P, Y, { dashed: true }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'segPC', object: XSegment(p, P, C, { dashed: true }), animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptY', object: new XPoint(p, Y, 'Y', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'fillPAD', object: new XPolygon(p, [P, A, D], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.6 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleDAP', object: new XAngleMarker(p, D, A, P, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'anglePDA', object: new XAngleMarker(p, P, D, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleDAP', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'anglePDA', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'angleDAP', action: 'hide', duration: 0.6 },
                    { id: 'anglePDA', action: 'hide', duration: 0.6 },
                    { id: 'fillPAD', action: 'hide', duration: 0.6 }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleCAP', object: new XAngleMarker(p, C, A, P, { marker: 'x', size: 16 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleDBA', object: new XAngleMarker(p, D, B, A, { marker: 'x', size: 16 }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleCAP', animate: { mode: 'pulse', duration: 1.3 } },
                    { id: 'angleDBA', animate: { mode: 'pulse', duration: 1.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: 'y', size: 16 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { marker: 'z', size: 16 }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 3 =====
        animator.registerPhase('solution3', [
            { id: 'triPAD_green', object: new XPolygon(p, [P, A, D], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.4 } },
            {
                group: [
                    { id: 'anglePDA_xz', object: new XAngleMarker(p, P, D, A, { marker: 'x+z', size: 16 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'text1', object: new XText(p, [20, 25], '\\angle PDA = \\angle DAP', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'text2', object: new XText(p, [20, 50], 'x+y = x+z \\Longrightarrow y=z', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 2.0 }
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
