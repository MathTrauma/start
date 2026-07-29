
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { projectPointToLine, getOrthocenter, intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, E, F, G, H;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        B = p.createVector(-2, 0);
        C = p.createVector(2, 0);

        // 삼각형 ABC 각도 (수심 성질로부터)
        // ∠HBE = 35° → ∠A = 55°
        // ∠HCF = 27° → ∠B = 63°
        // ∠C = 62°
        const angleA = 55 * Math.PI / 180;
        const angleB = 63 * Math.PI / 180;
        const angleC = 62 * Math.PI / 180;

        // A 계산: B에서 63° 방향과 C에서 (180-62)° 방향의 교점
        const dirFromB = p.createVector(Math.cos(angleB), Math.sin(angleB));
        const dirFromC = p.createVector(-Math.cos(angleC), Math.sin(angleC));
        A = intersectLines(B, p5.Vector.add(B, dirFromB), C, p5.Vector.add(C, dirFromC));

        // E: A에서 BC에 내린 수선의 발
        E = projectPointToLine(A, B, C);

        // F: B에서 CA에 내린 수선의 발
        F = projectPointToLine(B, C, A);

        // H: 수심 (orthocenter)
        H = getOrthocenter(A, B, C);

        // G: C에서 AB에 내린 수선의 발
        G = projectPointToLine(C, A, B);

        // 바운딩 박스 중심 (레이블 자동 배치용)
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
            { delay: 1.5 }
        ]);

        // Phase 2: 수선 및 각도 표시
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'AE', object: XSegment(p, A, E), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'BF', object: XSegment(p, B, F), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightCEA', object: new XRightAngle(p, C, E, A, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'rightAFB', object: new XRightAngle(p, A, F, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'pointH', object: new XPoint(p, H, 'H', { dx: -15, dy: 5 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            { id: 'angleEBH', object: new XAngleMarker(p, E, B, H, { arcSize: 35, marker: '35°', size: 11 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            { id: 'CH', object: XSegment(p, C, H), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'angleFCH', object: new XAngleMarker(p, F, C, H, { arcSize: 35, marker: '27°', size: 11 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 삼각형 AGC, AFB와 각도 분석
        animator.registerPhase('solution1', [
            { id: 'triangleAGC', object: new XPolygon(p, [A, G, C], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightCGA', object: new XRightAngle(p, C, G, A, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleGAC', object: new XAngleMarker(p, G, A, C, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightCGA', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleGAC', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'triangleAGC', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'rightCGA', animate: { mode: 'fadeOut', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'triangleAGC', action: 'hide' },
            { id: 'rightCGA', action: 'hide' },
            { delay: 0.3 },
            { id: 'triangleAFB', object: new XPolygon(p, [A, F, B], { filled: true, fillColor: [100, 200, 150, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'rightAFB2', object: new XRightAngle(p, A, F, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightAFB2', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleGAC', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'angleFBA', object: new XAngleMarker(p, F, B, A, { arcSize: 40, marker: '27°', size: 11, distance: 1.2 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'triangleAFB', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'rightAFB2', animate: { mode: 'fadeOut', duration: 1.0 } },
                    { id: 'angleGAC', animate: { mode: 'fadeOut', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'triangleAFB', action: 'hide' },
            { id: 'rightAFB2', action: 'hide' },
            { id: 'angleGAC', action: 'hide' },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: 삼각형 CGB, CEH와 최종 각도
        animator.registerPhase('solution2', [
            { id: 'triangleCGB', object: new XPolygon(p, [C, G, B], { filled: true, fillColor: [255, 180, 100, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightCGB', object: new XRightAngle(p, C, G, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleGCB', object: new XAngleMarker(p, G, C, B, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'triangleCEH', object: new XPolygon(p, [C, E, H], { filled: true, fillColor: [200, 100, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'rightCEA', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'rightCGB', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'angleEHC', object: new XAngleMarker(p, E, H, C, { arcSize: 35, marker: '62°', size: 14 }), animate: { mode: 'draw', duration: 1.5 } },
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
