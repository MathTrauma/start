
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, projectPointToLine, getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XRightAngle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, M, X, Y, circumO;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        B = p.createVector(-3, -3);
        C = p.createVector(3, -3);

        // A: 이등변삼각형의 꼭짓점 (BC의 수직이등분선 위)
        // 꼭지각 55도로 설정
        const baseAngle = 65 * Math.PI / 180;
        const midBC = p5.Vector.add(B, C).div(2);
        const height = (C.x - B.x) / 2 / Math.tan(baseAngle / 2);
        A = p.createVector(midBC.x, midBC.y + height);

        // D: BC의 중점 (수선의 발)
        D = p5.Vector.add(B, C).div(2);

        // E: D를 AB에 사영
        E = projectPointToLine(D, A, B);

        // F: B와 E의 중점
        F = p5.Vector.add(B, E).div(2);

        // M: DE의 중점
        M = p5.Vector.add(D, E).div(2);

        // X: AM과 CE의 교점
        X = intersectLines(A, M, C, E);

        // Y: AD와 CE의 교점
        Y = intersectLines(A, D, C, E);

        // A, C, D의 외접원 중심
        circumO = getCircumcenter(A, C, D);
        const circumR = p5.Vector.dist(circumO, A);

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phases =====

        // Phase 1: 삼각형 ABC
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Phase 2: 수선의 발 D
        animator.registerPhase('problem2', [
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.2 },
            { id: 'rightADC', object: new XRightAngle(p, A, D, C, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 }
        ]);

        // Phase 3: 사영점 E
        animator.registerPhase('problem3', [
            { id: 'segDE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.2 },
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightBED', object: new XRightAngle(p, B, E, D, 16, { pixel: true }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 }
        ]);

        // Phase 4: 중점 M과 보조선
        animator.registerPhase('problem4', [
            { id: 'pointM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'segCE', object: XSegment(p, C, E), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.2 },
            { id: 'segAM', object: XSegment(p, A, M), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.0 }
        ]);

        // Phase 5: 교점 X (라벨 없음)
        animator.registerPhase('problem5', [
            { id: 'pointX', object: new XPoint(p, X, '', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 닮음 찾기
        animator.registerPhase('solution1', [
            { id: 'pointF', object: new XPoint(p, F, 'F', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'segDF', object: XSegment(p, D, F), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            { id: 'triBDF', object: new XPolygon(p, [B, D, F], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'triBCE', object: new XPolygon(p, [B, C, E], { filled: true, fillColor: [255, 150, 100, 80] }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'triBDF', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triBCE', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triBDF', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'triBCE', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleFDB', object: new XAngleMarker(p, F, D, B, { arcSize: 25, marker: 'dot' }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'angleECB', object: new XAngleMarker(p, E, C, B, { arcSize: 25, marker: 'dot' }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: 추가 닮음 찾기
        animator.registerPhase('solution2', [
            { id: 'triBDF', action: 'remove' },
            { id: 'triBCE', action: 'remove' },
            { delay: 0.2 },
            {
                group: [
                    { id: 'triBDE', object: new XPolygon(p, [B, D, E], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triDAE', object: new XPolygon(p, [D, A, E], { filled: true, fillColor: [255, 150, 100, 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triBDE', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'triDAE', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'angleADE', object: new XAngleMarker(p, A, D, E, { arcSize: 22, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleDBE', object: new XAngleMarker(p, D, B, E, { arcSize: 22, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            { id: 'triBDE', action: 'remove' },
            { id: 'triDAE', action: 'remove' },
            { delay: 0.3 },
            {
                group: [
                    { id: 'triBDF2', object: new XPolygon(p, [B, D, F], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'triDAM', object: new XPolygon(p, [D, A, M], { filled: true, fillColor: [255, 150, 100, 60] }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triBDF2', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'triDAM', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            { id: 'angleMAD', object: new XAngleMarker(p, M, A, D, { arcSize: 25, marker: 'dot' }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'angleMAD', animate: { mode: 'pulse', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 3: 공원점
        animator.registerPhase('solution3', [
            { id: 'triBDF2', action: 'remove' },
            { id: 'triDAM', action: 'remove' },
            { delay: 0.3 },
            {
                group: [
                    { id: 'triXAY', object: new XPolygon(p, [X, A, Y], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'triDCY', object: new XPolygon(p, [D, C, Y], { filled: true, fillColor: [255, 150, 100, 60] }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triXAY', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'triDCY', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { id: 'circumCircle', object: XCircle(p, circumO, circumR, { color: p.theme.auxiliary || [100, 150, 255] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 1.0 },
            { id: 'rightCXA', object: new XRightAngle(p, C, X, A, 16, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2',
                3: 'problem3',
                4: 'problem4',
                5: 'problem5'
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
            problemPhaseCount: 5,
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
