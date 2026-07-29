
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XRightAngle, XAngleMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let O1, O2, T, A, B, C, D;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // TikZ 데이터 기반 설정
        const R = 3;  // 큰 원 반지름
        const r = 2;  // 작은 원 반지름
        const angle = 17 * Math.PI / 180;  // 지름 각도 17°

        // 중심점들 (수직 배치)
        O1 = p.createVector(0, 0);
        O2 = p.createVector(0, 1);  // O2는 O1 위에

        // 내접점 T (두 원이 만나는 점)
        T = p.createVector(0, R);  // (0, 3)

        // O1의 지름 AB (17° 각도)
        A = p.createVector(R * Math.cos(angle), R * Math.sin(angle));
        B = p.createVector(-R * Math.cos(angle), -R * Math.sin(angle));

        // O2의 지름 CD (AB와 평행, O2 중심 기준)
        C = p.createVector(r * Math.cos(angle), O2.y + r * Math.sin(angle));
        D = p.createVector(-r * Math.cos(angle), O2.y - r * Math.sin(angle));

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, T, p.createVector(0, -R)], size);

        // ===== Problem Phases =====

        // Phase 1: 두 원
        animator.registerPhase('problem1', [
            { id: 'circleO1', object: XCircle(p, O1, R), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'pointO1', object: new XPoint(p, O1, 'O_1', { dx: 10, dy: 10, useTex: true }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            { id: 'circleO2', object: XCircle(p, O2, r), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointO2', object: new XPoint(p, O2, 'O_2', { dx: 10, dy: 10, useTex: true }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointT', object: new XPoint(p, T, 'T', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 }
        ]);

        // Phase 2: 지름 AB
        animator.registerPhase('problem2', [
            { id: 'segAB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 1.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // Phase 3: 지름 CD
        animator.registerPhase('problem3', [
            { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 1.0 } },
            {
                group: [
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // 접선 (T에서 수평선)
        const tangentLeft = p.createVector(-2, T.y);
        const tangentRight = p.createVector(2, T.y);

        // Solution Phase 1: 직선 TO₁, 접선과 지름이 이루는 직각, 동위각
        animator.registerPhase('solution1', [
            { id: 'segTO1', object: XSegment(p, T, O1), animate: { mode: 'draw', duration: 1.2 } },
            // 접선 그리기 (dashed)
            { id: 'tangent', object: XSegment(p, tangentLeft, tangentRight, { dashed: true }), animate: { mode: 'draw', duration: 0.8 } },
            // 접선과 TO₁이 이루는 직각 (tangentRight, T, O1 순서)
            { id: 'rightTangent', object: new XRightAngle(p, tangentRight, T, O1, 0.25), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleAO1T', object: new XAngleMarker(p, A, O1, T, { arcSize: 30 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleCO2T', object: new XAngleMarker(p, C, O2, T, { arcSize: 25 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleAO1T', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'angleCO2T', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: 이등변삼각형 CO₂T
        animator.registerPhase('solution2', [
            // 단계 1에서 그려진 각 AO₁T, CO₂T을 제외한 모든 객체를 투명화
            { action: 'fadeAll', opacity: 0.4, exclude: ['angleAO1T', 'angleCO2T'], duration: 0.5 },
            // 삼각형 CO₂T 그리기
            { id: 'triCO2T', object: new XPolygon(p, [C, O2, T], { color: p.theme.highlight }), animate: { mode: 'draw', duration: 1.2 } },
            // 이등변삼각형의 두 밑각 (dot 마커)
            {
                group: [
                    { id: 'angleTCO2', object: new XAngleMarker(p, T, C, O2, { arcSize: 25, marker: 'dot', distance: 1.0 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleO2TC', object: new XAngleMarker(p, O2, T, C, { arcSize: 25, marker: 'dot', distance: 1.0 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 3: 이등변삼각형 AO₁T
        animator.registerPhase('solution3', [
            // 단계 2에서 그려진 것들도 투명화 (각 AO₁T, CO₂T 제외)
            { action: 'fade', targets: ['triCO2T', 'angleTCO2', 'angleO2TC'], opacity: 0.4, duration: 0.5 },
            // 삼각형 AO₁T 그리기
            { id: 'triAO1T', object: new XPolygon(p, [A, O1, T], { color: p.theme.highlight }), animate: { mode: 'draw', duration: 1.5 } },
            // 이등변삼각형의 두 밑각 (dot 마커)
            {
                group: [
                    { id: 'angleTAO1', object: new XAngleMarker(p, T, A, O1, { arcSize: 25, marker: 'dot', distance: 1.0 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'angleO1TA', object: new XAngleMarker(p, O1, T, A, { arcSize: 25, marker: 'dot', distance: 1.0 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2',
                3: 'problem3'
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
            problemPhaseCount: 3,
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
