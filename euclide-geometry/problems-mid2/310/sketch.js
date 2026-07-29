
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XSegmentMarker } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, M, N, O, E, F, G, H;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(-2, -2);
        B = p.createVector(3, -2);
        C = p.createVector(1, 2.3);
        D = p.createVector(-1.25, 1.4);

        // M: 대각선 AC의 중점
        M = p5.Vector.add(A, C).mult(0.5);
        // N: 대각선 BD의 중점
        N = p5.Vector.add(B, D).mult(0.5);

        // O: M을 지나고 BD에 평행한 직선과 N을 지나고 AC에 평행한 직선의 교점
        const dirBD = p5.Vector.sub(D, B);
        const pointOnLine1 = p5.Vector.add(M, dirBD);
        const dirAC = p5.Vector.sub(C, A);
        const pointOnLine2 = p5.Vector.add(N, dirAC);
        O = intersectLines(M, pointOnLine1, N, pointOnLine2);

        // E, F, G, H: 각 변의 중점
        E = p5.Vector.add(A, B).mult(0.5);
        F = p5.Vector.add(B, C).mult(0.5);
        G = p5.Vector.add(C, D).mult(0.5);
        H = p5.Vector.add(D, A).mult(0.5);

        // 사각형 중심 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        const t = p.theme;

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D, O], size, 50);

        // ===== Problem Phase 1: 사각형 ABCD =====
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D], { weight: 2 }), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // ===== Problem Phase 2: 대각선과 중점들, O =====
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'segAC', object: XSegment(p, A, C, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segBD', object: XSegment(p, B, D, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointN', object: new XPoint(p, N, 'N', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segMO', object: XSegment(p, M, O, { dashed: true }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'segNO', object: XSegment(p, N, O, { dashed: true }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { id: 'pointO', object: new XPoint(p, O, 'O', { center }), animate: { mode: 'draw', duration: 0.2 } },
            { delay: 0.5 }
        ]);

        // ===== Problem Phase 3: O에서 각 변의 중점으로 =====
        animator.registerPhase('problem3', [
            {
                group: [
                    { id: 'segOE', object: XSegment(p, O, E, { color: t.fillRed, weight: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segOF', object: XSegment(p, O, F, { color: t.fillRed, weight: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segOG', object: XSegment(p, O, G, { color: t.fillRed, weight: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segOH', object: XSegment(p, O, H, { color: t.fillRed, weight: 2 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointH', object: new XPoint(p, H, 'H', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // ===== Solution Phase 1: 등적변환-1 =====
        animator.registerPhase('solution1', [
            // filldraw polygon GDHO (1.5)
            { id: 'polyGDHO', object: new XPolygon(p, [G, D, H, O], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            // draw segments GH, NO green (1.0)
            {
                group: [
                    { id: 'segGH_green', object: XSegment(p, G, H, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segNO_green', object: XSegment(p, N, O, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            // mark GH[arrow], NO[arrow] (0.5)
            {
                group: [
                    { id: 'markGH', object: new XSegmentMarker(p, G, H, { type: 'arrow' }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markNO', object: new XSegmentMarker(p, N, O, { type: 'arrow' }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            // frameCallback GDHO -> GDHN (1.4)
            { id: 'polyGDHO', animate: { mode: 'morph', duration: 1.4, morphTarget: [G, D, H, N] } },
            { delay: 1.0 }
        ]);

        // sol2 에서 생성되는 객체 ID (sol3 에서 일괄 제거용)
        const sol2Objects = [
            'triDNG', 'triDHN', 'triDBC', 'triDAB',
            'segDN', 'segNG', 'segBC', 'segHN', 'segAB',
            'markNG', 'markBC', 'markHN', 'markAB',
            'segGH_green', 'segNO_green'
        ];

        // ===== Solution Phase 2: 다른 방식으로 삼각형 분해 =====
        animator.registerPhase('solution2', [
            // remove marks GH, NO || undraw seg GH, NO (0.7)
            {
                group: [
                    { id: 'markGH', action: 'remove' },
                    { id: 'markNO', action: 'remove' },
                    { id: 'segGH_green', animate: { mode: 'draw', duration: 0.7, from: 1, to: 0 } },
                    { id: 'segNO_green', animate: { mode: 'draw', duration: 0.7, from: 1, to: 0 } }
                ],
                parallel: true
            },
            // draw segment DN yellow (1.5)
            { id: 'segDN', object: XSegment(p, D, N, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.5 } },
            // pulse two triangles GDN, HDN (1.8) — polyGDHO 를 두 삼각형으로 교체 후 pulse
            { id: 'polyGDHO', action: 'remove' },
            {
                group: [
                    { id: 'triDNG', object: new XPolygon(p, [D, N, G], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), action: 'show' },
                    { id: 'triDHN', object: new XPolygon(p, [D, H, N], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), action: 'show' }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triDNG', animate: { mode: 'pulse', duration: 1.8 } },
                    { id: 'triDHN', animate: { mode: 'pulse', duration: 1.8 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // draw segments NG, BC marker[arrow] yellow || travel triangles DNG, DBC (2.0)
            { id: 'triDBC', object: new XPolygon(p, [D, B, C], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), action: 'show' },
            {
                group: [
                    { id: 'segNG', object: XSegment(p, N, G, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'markNG', object: new XSegmentMarker(p, N, G, { type: 'arrow' }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'segBC', object: XSegment(p, B, C, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'markBC', object: new XSegmentMarker(p, B, C, { type: 'arrow' }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'triDNG', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triDBC', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 },
            // draw segments HN, AB marker[arrow] yellow || travel triangles DHN, DAB (2.0)
            { id: 'triDAB', object: new XPolygon(p, [D, A, B], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), action: 'show' },
            {
                group: [
                    { id: 'segHN', object: XSegment(p, H, N, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'markHN', object: new XSegmentMarker(p, H, N, { type: 'arrow' }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'segAB', object: XSegment(p, A, B, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'markAB', object: new XSegmentMarker(p, A, B, { type: 'arrow' }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'triDHN', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triDAB', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 3: 등적변환-2 =====
        animator.registerPhase('solution3', [
            // remove objects made in sol-phase 2 (0.8)
            { action: 'fade', targets: sol2Objects, opacity: 0, duration: 0.8 },
            ...sol2Objects.map(id => ({ id, action: 'remove' })),
            // filldraw polygon FCGO (1.5)
            { id: 'polyFCGO', object: new XPolygon(p, [F, C, G, O], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            // draw segments GF, MO green (1.0)
            {
                group: [
                    { id: 'segGF_green', object: XSegment(p, G, F, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segMO_green', object: XSegment(p, M, O, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            // frameCallback FCGO -> FCGM (1.7)
            { id: 'polyFCGO', animate: { mode: 'morph', duration: 1.7, morphTarget: [F, C, G, M] } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 4: 다른 방식으로 삼각형 분해 =====
        animator.registerPhase('solution4', [
            // Phase 3 green segments 제거
            { id: 'segGF_green', action: 'remove' },
            { id: 'segMO_green', action: 'remove' },
            // 사각형 GCFM 즉시 채우기
            { id: 'quadGCFM', object: new XPolygon(p, [G, C, F, M], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 50] }), animate: { mode: 'draw', duration: 0.3 } },
            // 이전 polygon 제거
            { id: 'polyFCGO', action: 'remove' },
            {
                group: [
                    { id: 'triCMG', object: new XPolygon(p, [C, M, G], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triCMF', object: new XPolygon(p, [C, M, F], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triCMG', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'triCMF', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // 삼각형 CAD 새로 생성 (CMG와 같은 색)
            { id: 'triCAD', object: new XPolygon(p, [C, A, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'triCMG', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triCAD', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 },
            // 삼각형 CAB 새로 생성 (CMF와 같은 색)
            { id: 'triCAB', object: new XPolygon(p, [C, A, B], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'triCMF', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triCAB', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // Phase map 정의
        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2',
                3: 'problem3'
            },
            solution: {
                1: 'solution1',
                2: 'solution2',
                3: 'solution3',
                4: 'solution4'
            }
        };

        // sketchContext에 등록 (전역 변수 대신)
        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 3,
            solutionPhaseCount: 4
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
