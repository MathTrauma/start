import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XCircle, XDimension, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, O;
    let l1Start, l1End, l2Start, l2End;
    let animator;
    let circumRadius;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        const sqrt3 = Math.sqrt(3);
        A = p.createVector(0, 0);
        B = p.createVector(sqrt3, -1);
        C = p.createVector(sqrt3, 0);

        // 평행선 정의
        l1Start = p.createVector(0, -1.5);
        l1End = p.createVector(0, 4.5);
        l2Start = p.createVector(sqrt3, -1.5);
        l2End = p.createVector(sqrt3, 4.5);

        // D 계산: l1 위의 점, ∠ADB = 20°
        const cot20 = 1 / Math.tan(20 * Math.PI / 180);
        const dY = sqrt3 * cot20 - 1;
        D = p.createVector(0, dY);

        // E 계산: BD와 AC(x축)의 교점
        E = intersectLines(B, D, A, C);

        // O 계산: DE의 중점 (직각삼각형 DAE의 외심)
        O = p5.Vector.add(D, E).div(2);

        // 외접원 반지름
        circumRadius = p5.Vector.dist(D, E) / 2;

        // 바운딩 박스 중심
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 80);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            // 삼각형 ABC 그리기
            {
                group: [
                    { id: 'AB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'BC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'CA', object: XSegment(p, C, A), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 직각 ACB와 각 CBA 60°
            {
                group: [
                    { id: 'rightACB', object: new XRightAngle(p, A, C, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { arcSize: 30, marker: '60°' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 치수선
            {
                group: [
                    { id: 'dimBC', object: new XDimension(p, B, C, '1', { offset: -12 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'dimAB', object: new XDimension(p, A, B, '2', { offset: -12 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            // D 추가 || AD, l1, l2 그리기 (동시 진행)
            {
                group: [
                    { action: 'addToBounds', points: [D], duration: 1.5 },
                    { id: 'AD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'l1', object: XSegment(p, l1Start, l1End, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'l2', object: XSegment(p, l2Start, l2End, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 직각 CAD
            { id: 'rightCAD', object: new XRightAngle(p, C, A, D, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.3 },
            { id: 'pointD', object: new XPoint(p, D, 'D', { dx: -15, dy: 0 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.3 },
            // BD 그리기
            { id: 'BD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 0, dy: -15 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            // 삼각형 DAE filldraw
            { id: 'triDAE', object: new XPolygon(p, [D, A, E], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            // 외접원
            { id: 'circumDAE', object: XCircle(p, O, circumRadius), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            // O 표시 || OA, OD, OE 그리기 (yellow) 후 마커 표시
            {
                group: [
                    { id: 'pointO', object: new XPoint(p, O, 'O', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'OA', object: XSegment(p, O, A, { color: '#FFD700' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'OD', object: XSegment(p, O, D, { color: '#FFD700' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'OE', object: XSegment(p, O, E, { color: '#FFD700' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // 마커 표시 (선분 그리기 직후)
            {
                group: [
                    { id: 'markOA', object: new XSegmentMarker(p, O, A, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'markOD', object: new XSegmentMarker(p, O, D, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'markOE', object: new XSegmentMarker(p, O, E, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.5 },
            // 각 ADE, OAD with 20°
            {
                group: [
                    { id: 'angleADE', object: new XAngleMarker(p, A, D, E, { arcSize: 30, marker: '20°' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleOAD', object: new XAngleMarker(p, O, A, D, { arcSize: 25, marker: '20°' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 각 AOE with 40°
            { id: 'angleAOE', object: new XAngleMarker(p, A, O, E, { arcSize: 35, marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // fade all except angle AOE
            { action: 'fadeAll', opacity: 0.3, exclude: ['angleAOE'], duration: 1.0 },
            { delay: 0.3 },
            // 각 CBD 20°, DBA 40°
            {
                group: [
                    { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { arcSize: 25, marker: '20°' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleDBA', object: new XAngleMarker(p, D, B, A, { arcSize: 35, marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // AB, OA 강조
            {
                group: [
                    { id: 'AB', set: { opacity: 1 } },
                    { id: 'AB_highlight', object: XSegment(p, A, B, { color: '#00FF00', weight: 2 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'OA', set: { opacity: 1 } },
                    { id: 'OA_highlight', object: XSegment(p, O, A, { color: '#00FF00', weight: 2 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // pulse
            {
                group: [
                    { id: 'AB_highlight', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'OA_highlight', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 삼각형 ABO filldraw
            { id: 'pointO', set: { opacity: 1 } },
            { id: 'pointA', set: { opacity: 1 } },
            { id: 'pointB', set: { opacity: 1 } },
            { id: 'triABO', object: new XPolygon(p, [A, B, O], { filled: true, fillColor: [0, 255, 100, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 3 =====
        animator.registerPhase('solution3', [
            // XDimension AO[2]
            { id: 'dimAO', object: new XDimension(p, A, O, '2', { offset: -12 }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.5 },
            // XDimension DO[2], OE[2]
            {
                group: [
                    { id: 'dimDO', object: new XDimension(p, D, O, '2'), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'dimOE', object: new XDimension(p, O, E, '2'), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // phaseMap 설정
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

        // 애니메이션 시작
        animator.playSequence(['problem1', 'problem2']);
    };

    p.draw = function() {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
