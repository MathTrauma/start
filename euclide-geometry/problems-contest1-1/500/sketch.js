import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XSegmentMarker, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 좌표 계산
        // C = (0,0), A = (2,0) → b = CA = 2
        // a² = b² + ba → a = b(1+√5)/2 = 1+√5 (황금비 관련)
        // a = c (BC = AB), ∠BCA = ∠BAC = 72°, ∠ABC = 36°
        const b = 2;
        const a = 1 + Math.sqrt(5); // ≈ 3.236

        C = p.createVector(0, 0);
        A = p.createVector(b, 0);

        // B = C + a·(cos72°, sin72°)
        const angleBCA = 72 * Math.PI / 180;
        B = p.createVector(a * Math.cos(angleBCA), a * Math.sin(angleBCA));

        // D: AC를 C쪽으로 a만큼 연장 → D = C + a·(-1, 0)
        D = p.createVector(-a, 0);

        // 외접원
        const circumCenter = getCircumcenter(B, C, D);
        const circumRadius = p5.Vector.dist(circumCenter, B);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phase 1: 삼각형 ABC =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: 12, dy: -10 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: 0, dy: -15 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'markBC', object: new XSegmentMarker(p, B, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markBA', object: new XSegmentMarker(p, B, A, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAB', object: new XDimension(p, A, B, 'a', { offset: -10 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimCA', object: new XDimension(p, C, A, 'b', { offset: -10 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: 보조선 CD, BD =====
        animator.registerPhase('solution1', [
            {
                group: [
                    { action: 'addToBounds', points: [D], duration: 1.5 },
                    {
                        group: [
                            { delay: 0.5 },
                            {
                                group: [
                                    { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 2.0 } },
                                    { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 2.0 } }
                                ],
                                parallel: true
                            }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markDC', object: new XSegmentMarker(p, D, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2: 외접원, 각도 관계 =====
        animator.registerPhase('solution2', [
            { id: 'circumCircle', object: XCircle(p, circumCenter, circumRadius), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: 'x' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 },
            // pulse 외접원, 1초 후 접현각 CDB 표시
            {
                group: [
                    { id: 'circumCircle', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'angleCDB', object: new XAngleMarker(p, C, D, B, { marker: 'x' }), animate: { mode: 'draw', duration: 0.8 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // 이등변삼각형 BDC 강조 (DC = BC)
            {
                group: [
                    { id: 'segCDgreen', object: XSegment(p, C, D, { color: '#00FF00' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCBgreen', object: XSegment(p, C, B, { color: '#00FF00' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'angleDBC', object: new XAngleMarker(p, D, B, C, { marker: 'x' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 },
            {
                group: [
                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: '2x' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: '2x' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 1,
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
