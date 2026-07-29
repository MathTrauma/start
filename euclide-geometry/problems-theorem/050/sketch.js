import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { getCircumcenter, circleLineIntersection } from '../../lib/geometry.js';

const sketch = (p) => {
    let A, B, C, D, E, O;
    let circumRadius;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // Basic Points
        const bx = -2 * Math.sqrt(7 / 3);
        const cx = 2 * Math.sqrt(7 / 3);
        B = p.createVector(bx, 0);
        C = p.createVector(cx, 0);

        // A 계산: AB = 3, AC = 5
        const ax = -4 / cx;
        const ay = Math.sqrt(9 - (ax - bx) * (ax - bx));
        A = p.createVector(ax, ay);

        // 외심과 외접원 반지름 계산
        O = getCircumcenter(A, B, C);
        circumRadius = p5.Vector.dist(O, A);

        // E: 각 A의 이등분선과 BC의 교점 (각의 이등분선 정리: BE:EC = AB:AC = 3:5)
        const AB = 3, AC = 5;
        E = p.createVector(
            (AC * B.x + AB * C.x) / (AB + AC),
            (AC * B.y + AB * C.y) / (AB + AC)
        );

        // D: 각 A의 이등분선과 외접원의 교점 (A가 아닌 점)
        const intersections = circleLineIntersection(O, circumRadius, A, E);
        if (intersections.length >= 2) {
            const d1 = p5.Vector.dist(p.createVector(intersections[0].x, intersections[0].y), A);
            const d2 = p5.Vector.dist(p.createVector(intersections[1].x, intersections[1].y), A);
            D = d1 > d2
                ? p.createVector(intersections[0].x, intersections[0].y)
                : p.createVector(intersections[1].x, intersections[1].y);
        }

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // 뷰포트 중심 계산 (라벨 배치용)
        const center = p5.Vector.add(A, p5.Vector.add(B, C)).mult(1 / 3);

        // 테마 색상
        const t = p.theme;
        const fillBlue = [...t.fillBlue.slice(0, 3), 80];
        const fillRed = [...t.fillRed.slice(0, 3), 80];

        // ===== Problem Phase 1: 삼각형 ABC =====
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
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2: 외접원, AD, E, D, 각 마커 =====
        animator.registerPhase('problem2', [
            {
                group: [
                    { action: 'addToBounds', points: [D], duration: 2.0 },
                    { id: 'circumcircle', object: XCircle(p, O, circumRadius), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    // E[below left]: 화면 기준 왼쪽 아래
                    { id: 'pointE', object: new XPoint(p, E, 'E', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
                    // D[below]: 화면 기준 아래
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dx: 0, dy: 15 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: polyline 및 각 마커 =====
        // travel 계산용 (A->B->C 열린 경로)
        const distAB_poly = p5.Vector.dist(A, B);
        const distBC_poly = p5.Vector.dist(B, C);
        const distCA_poly = p5.Vector.dist(C, A);
        const perimeterABC = distAB_poly + distBC_poly + distCA_poly;
        const travelEndABC = (distAB_poly + distBC_poly) / perimeterABC;

        // travel 계산용 (A->D->C 열린 경로)
        const distAD_poly = p5.Vector.dist(A, D);
        const distDC_poly = p5.Vector.dist(D, C);
        const distCA_poly2 = p5.Vector.dist(C, A);
        const perimeterADC = distAD_poly + distDC_poly + distCA_poly2;
        const travelEndADC = (distAD_poly + distDC_poly) / perimeterADC;

        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'polyABC', object: new XPolygon(p, [A, B, C], { color: '#00FF00' }), animate: { mode: 'draw', duration: 2.0, from: 0, to: travelEndABC } },
                    { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'polyADC', object: new XPolygon(p, [A, D, C], { color: '#00FF00' }), animate: { mode: 'draw', duration: 2.0, from: 0, to: travelEndADC } },
                    { id: 'angleCBA', animate: { mode: 'pulse', duration: 3.0 } },
                    // after 1.0초: angleCDA 그리기 후 pulse
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'angleCDA', object: new XAngleMarker(p, C, D, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                            { id: 'angleCDA', animate: { mode: 'pulse', duration: 2.2 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 2: filldraw 삼각형, travel =====

        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'triABC', set: { opacity: 0.3 } },  // fade ABC
                    { id: 'triABE', object: new XPolygon(p, [A, B, E], { filled: true, fillColor: fillBlue }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triADC', object: new XPolygon(p, [A, D, C], { filled: true, fillColor: fillRed }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'polyABC', action: 'hide', duration: 1.0 },
                    { id: 'polyADC', action: 'hide', duration: 1.0 }
                ],
                parallel: true
            },
            // travel ABE, ADC 2 times
            {
                group: [
                    { id: 'triABE', animate: { mode: 'travel', duration: 3.0, repeat: 2 } },
                    { id: 'triADC', animate: { mode: 'travel', duration: 3.0, repeat: 2 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 3: XDimension =====

        animator.registerPhase('solution3', [
            {
                group: [
                    // XDim AB[3, down]: A→B의 CW 90° = 아래쪽 (offset: -10)
                    { id: 'dimAB', object: new XDimension(p, A, B, '3', { offset: -10 }), animate: { mode: 'draw', duration: 1.5 } },
                    // XDim AC[5, up]: A→C의 CCW 90° = 위쪽 (offset: 10)
                    { id: 'dimAC', object: new XDimension(p, A, C, '5', { offset: 10 }), animate: { mode: 'draw', duration: 1.5 } },
                    // XDim AE[x, down]: A→E의 CW 90° (offset: -10)
                    { id: 'dimAE', object: new XDimension(p, A, E, 'x', { offset: -10 }), animate: { mode: 'draw', duration: 1.5 } },
                    // XDim AD[6, up]: A→D의 CCW 90° (offset: 10)
                    { id: 'dimAD', object: new XDimension(p, A, D, '6', { offset: 10 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
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

        animator.playSequence(['problem1', 'problem2']);
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
