
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XDimension } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, G;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        const t = p.theme;

        // 기본 점 정의
        A = p.createVector(0, 0);
        B = p.createVector(3, 0);
        C = p.createVector(3.7, 1.5);
        D = p.createVector(0.7, 1.5);

        // F: CD를 1:2로 내분 (CF:FD = 1:2, C에 가까움)
        F = p5.Vector.add(p5.Vector.mult(C, 2), D).div(3);

        // E: BD와 AF의 교점
        E = intersectLines(B, D, A, F);

        // G: BC 연장선과 AF의 교점
        G = intersectLines(B, C, A, F);

        // 레이블 배치용 중심
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phase 1: 평행사변형 ABCD =====
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D], { weight: 2 }), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.7 },
            { id: 'segBD', object: XSegment(p, B, D, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } }
        ]);

        // ===== Problem Phase 2: 점 F와 교점들 =====
        animator.registerPhase('problem2', [
            { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { action: 'addToBounds', points: [G], duration: 1.5 },
            {
                group: [
                    { id: 'segAG', object: XSegment(p, A, G), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segCG', object: XSegment(p, C, G), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimEA', object: new XDimension(p, E, A, '6', { offset: -12 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'dimFG', object: new XDimension(p, F, G, '5', { offset: 12 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1: 삼각형 EAB, EFD 닮음 =====
        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'triEAB', object: new XPolygon(p, [E, A, B], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triEFD', object: new XPolygon(p, [E, F, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'dimEF', object: new XDimension(p, E, F, 'x', { offset: -12 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 },
            {
                group: [
                    { id: 'segED', object: XSegment(p, E, D, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimED', object: new XDimension(p, E, D, 'xk', { offset: 0, color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segEB', object: XSegment(p, E, B, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimEB', object: new XDimension(p, E, B, '6k', { offset: 0, color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 2: 삼각형 EDA, EBG 닮음 =====
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'triEAB', action: 'remove' },
                    { id: 'triEFD', action: 'remove' },
                    { id: 'triEDA', object: new XPolygon(p, [E, D, A], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.7 } },
                    { id: 'triEBG', object: new XPolygon(p, [E, B, G], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 2.7 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'segEB', object: XSegment(p, E, B, { weight: 3 }), animate: { mode: 'travel', duration: 1.2 } },
                    { id: 'segED', object: XSegment(p, E, D, { weight: 3 }), animate: { mode: 'travel', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segAE', object: XSegment(p, A, E, { weight: 3 }), animate: { mode: 'travel', duration: 1.2 } },
                    { id: 'segGE', object: XSegment(p, G, E, { weight: 3 }), animate: { mode: 'travel', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
        });

        // Phase 시퀀스 자동 실행
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
