
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, projectPointToLine, getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XRightAngle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, H, G, circumO, circumR;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의 (정사각형 ABCD)
        A = p.createVector(-2, -2);
        B = p.createVector(2, -2);
        C = p.createVector(2, 2);
        D = p.createVector(-2, 2);

        // E: AB 위, AE:EB = 1:3
        E = p5.Vector.lerp(A, B, 0.25);

        // F: AD 위, AF:FD = 1:3
        F = p5.Vector.lerp(A, D, 0.25);

        // H: A에서 ED에 내린 수선의 발
        H = projectPointToLine(A, E, D);

        // G: AH 연장선과 BC의 교점
        G = intersectLines(A, H, B, C);

        // C, D, G의 외접원 (DG가 지름)
        circumO = getCircumcenter(C, D, G);
        circumR = p5.Vector.dist(circumO, D);

        // 중심점 (레이블 배치용)
        const center = p.createVector(0, 0);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phases =====

        // Phase 1: 사각형 ABCD
        animator.registerPhase('problem1', [
            { id: 'squareABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.2 },
            { id: 'segED', object: XSegment(p, E, D), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // Phase 2: 선분 ED에 수선내리기
        animator.registerPhase('problem2', [
            { id: 'segAH', object: XSegment(p, A, H), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.2 },
            { id: 'pointH', object: new XPoint(p, H, 'H', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightAHE', object: new XRightAngle(p, A, H, E, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.3 },
            { id: 'triHFC', object: new XPolygon(p, [H, F, C]), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 직각들 표시
        animator.registerPhase('solution1', [
            { id: 'segHG', object: XSegment(p, H, G), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.2 },
            { id: 'pointG', object: new XPoint(p, G, 'G', { dx: 15, dy: 0 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'segFG', object: XSegment(p, F, G, { dashed: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightGHD', object: new XRightAngle(p, G, H, D, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'rightDCG', object: new XRightAngle(p, D, C, G, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightGHD', animate: { mode: 'pulse', duration: 0.9 } },
                    { id: 'rightDCG', animate: { mode: 'pulse', duration: 0.9 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'rightGFD', object: new XRightAngle(p, G, F, D, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: 공원점 - 원그리기
        animator.registerPhase('solution2', [
            { id: 'segDG', object: XSegment(p, D, G), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'circumCircle', object: XCircle(p, circumO, circumR, { color: p.theme.auxiliary || [100, 150, 255] }), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            { id: 'rightGHD', action: 'remove' },
            { id: 'rightCHF', object: new XRightAngle(p, C, H, F, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 3: 원주각 표시
        animator.registerPhase('solution3', [
            { id: 'angleFCH', object: new XAngleMarker(p, F, C, H, { arcSize: 40, marker: 'star' }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'angleFDE', object: new XAngleMarker(p, F, D, E, { arcSize: 40, marker: 'star' }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'angleEAH', object: new XAngleMarker(p, E, A, H, { arcSize: 40, marker: 'star' }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2',
                3: 'solution3'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 3
        });

        // Phase 시퀀스 자동 실행
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
