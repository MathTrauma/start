
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, projectPointToLine, getCircumcenter, getOrthocenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XText, XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XCircle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let A, B, C, D, E, F, H, O, G, M, P, Q;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // B(-4, 0), C(4, 0), BC = 8
        B = p.createVector(-4, 0);
        C = p.createVector(4, 0);

        // A: AB=10, AC=9
        // (x+4)² + y² = 100, (x-4)² + y² = 81 → 16x = 19
        const ax = 19 / 16;
        const ay = Math.sqrt(81 - Math.pow(ax - 4, 2));
        A = p.createVector(ax, ay);

        // M: AB의 중점
        M = p5.Vector.add(A, B).mult(0.5);

        O = getCircumcenter(A, B, C);
        H = getOrthocenter(A, B, C);

        // 수선의 발
        D = projectPointToLine(A, B, C);
        E = projectPointToLine(B, A, C);
        F = projectPointToLine(C, A, B);

        // G: 직선 AO ∩ BC (표시 안 함)
        G = intersectLines(A, O, B, C);

        // P: 직선 AG ∩ BE, Q: 직선 AG ∩ CF
        P = intersectLines(A, G, B, E);
        Q = intersectLines(A, G, C, F);

        const circumR = p5.Vector.dist(O, A);

        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        animator = new XAnimator(p);
        // 외접원 범위까지 포함
        animator.initViewport([
            A, B, C,
            p.createVector(O.x - circumR, O.y - circumR),
            p.createVector(O.x + circumR, O.y + circumR)
        ], size);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segAD', object: XSegment(p, A, D, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segBE', object: XSegment(p, B, E, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segCF', object: XSegment(p, C, F, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'rightADB', object: new XRightAngle(p, A, D, B, 12, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'rightAEB', object: new XRightAngle(p, A, E, B, 12, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'rightBFC', object: new XRightAngle(p, B, F, C, 12, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { id: 'pointH', object: new XPoint(p, H, 'H', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            { id: 'pointO', object: new XPoint(p, O, 'O', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'segAG', object: XSegment(p, A, G), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'pointP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointQ', object: new XPoint(p, Q, 'Q', { center }), animate: { mode: 'draw', duration: 0.3 } }
        ]);

        // 텍스트 객체 (solution1용)
        const textEq = new XText(p, { x: size * 0.22, y: 25 }, '\\angle AOB = 2 \\times \\angle C', {
            useTex: true, screenCoord: true, fillColor: p.theme.stroke
        });

        // ===== Solution Phase 1: 외접원과 중심각 =====
        animator.registerPhase('solution1', [
            { action: 'fadeAll', opacity: 0.2, duration: 1.2 },
            { id: 'circumCircle', object: XCircle(p, O, circumR, { color: COLORS.green }), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'polyAOB', object: new XPolygon(p, [A, O, B], { color: COLORS.green, closed: false }), animate: { mode: 'draw', duration: 1.6 } },
                    { id: 'polyACB', object: new XPolygon(p, [A, C, B], { color: COLORS.green, closed: false }), animate: { mode: 'draw', duration: 1.6 } }
                ],
                parallel: true
            },
            { id: 'angleAOB', object: new XAngleMarker(p, A, O, B, { marker: '2\\times \\angle C', useTex: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.7 },
            {
                group: [
                    { id: 'circumCircle', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'polyAOB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'polyACB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'textEq', object: textEq, animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2: OM과 동치각 =====
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'segAD', action: 'recover', duration: 0.7 },
                    { id: 'segBE', action: 'recover', duration: 0.7 },
                    { id: 'segCF', action: 'recover', duration: 0.7 },
                    { id: 'segAG', action: 'recover', duration: 0.7 },
                    { id: 'angleAOB', action: 'hide', duration: 0.7 },
                    { id: 'circumCircle', action: 'hide', duration: 0.7 },
                    { id: 'polyAOB', action: 'hide', duration: 0.7 },
                    { id: 'polyACB', action: 'hide', duration: 0.7 }
                ],
                parallel: true
            },
            { id: 'segOM', object: XSegment(p, O, M), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'pointM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightOMA', object: new XRightAngle(p, O, M, A, 12, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 0.8 },
            // in turns: 순차 그리기 + delay + 완료된 각 pulse
            {
                group: [
                    // 순차: draw → delay → draw → delay → draw → delay → draw
                    {
                        group: [
                            { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.5 } },
                            { delay: 0.5 },
                            { id: 'angleAOM', object: new XAngleMarker(p, A, O, M, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.5 } },
                            { delay: 0.5 },
                            { id: 'angleAQF', object: new XAngleMarker(p, A, Q, F, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.5 } },
                            { delay: 0.5 },
                            { id: 'anglePQH', object: new XAngleMarker(p, P, Q, H, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.5 } }
                        ],
                        parallel: false
                    },
                    // ACB: 0.5s 후부터 3.0s pulse
                    {
                        group: [
                            { delay: 0.5 },
                            { id: 'angleACB', animate: { mode: 'pulse', duration: 3.0 } }
                        ],
                        parallel: false
                    },
                    // AOM: 1.5s 후부터 2.0s pulse
                    {
                        group: [
                            { delay: 1.5 },
                            { id: 'angleAOM', animate: { mode: 'pulse', duration: 2.0 } }
                        ],
                        parallel: false
                    },
                    // AQF: 2.5s 후부터 1.0s pulse
                    {
                        group: [
                            { delay: 2.5 },
                            { id: 'angleAQF', animate: { mode: 'pulse', duration: 1.0 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 3: 수심관련각 =====
        animator.registerPhase('solution3', [
            // angle PQH 마커를 ∠C로 교체
            {
                group: [
                    { id: 'anglePQH', action: 'remove' },
                    { id: 'anglePQH_C', object: new XAngleMarker(p, P, Q, H, { marker: '\\angle C', useTex: true }), animate: { mode: 'draw', duration: 0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segAD', action: 'fade', duration: 0.5 },
                    { id: 'segAG', action: 'fade', duration: 0.5 },
                    { id: 'segCF', action: 'fade', duration: 0.5 }
                ],
                parallel: true
            },
            // right angles recover (fadeAll로 희미해진 상태)
            {
                group: [
                    { id: 'rightAEB', action: 'recover', duration: 0.5 },
                    { id: 'rightBFC', action: 'recover', duration: 0.5 }
                ],
                parallel: true
            },
            { id: 'triBHF', object: new XPolygon(p, [B, H, F], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'triBAE', object: new XPolygon(p, [B, A, E], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.5 } },
            // pulse + after 1s draw angles
            {
                group: [
                    { id: 'triBHF', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'triBAE', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'rightAEB', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'rightBFC', animate: { mode: 'pulse', duration: 3.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            {
                                group: [
                                    { id: 'angleFHB', object: new XAngleMarker(p, F, H, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                                    { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } }
                                ],
                                parallel: true
                            }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // angle FHB 마커를 ∠A로 교체
            {
                group: [
                    { id: 'angleFHB', action: 'remove' },
                    { id: 'angleFHB_A', object: new XAngleMarker(p, F, H, B, { marker: '\\angle A', useTex: true }), animate: { mode: 'draw', duration: 0 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 4: 삼각형 PHQ =====
        animator.registerPhase('solution4', [
            {
                group: [
                    { id: 'triBHF', action: 'fade', duration: 1.0 },
                    { id: 'triBAE', action: 'fade', duration: 1.0 }
                ],
                parallel: true
            },
            { id: 'triPHQ', object: new XPolygon(p, [P, H, Q], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'angleHPQ', object: new XAngleMarker(p, H, P, Q, { marker: '\\angle B', useTex: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3', 4: 'solution4' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 4
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
