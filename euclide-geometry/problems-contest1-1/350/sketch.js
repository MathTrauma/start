import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, G;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 좌표 계산
        const sqrt10 = Math.sqrt(10);
        const sqrt6 = Math.sqrt(6);
        const sqrt15 = Math.sqrt(15);

        // 기본 점 (A, E, F, D 는 x축 위)
        A = p.createVector(-3, 0);
        E = p.createVector(0, 0);
        F = p.createVector(sqrt10, 0);
        D = p.createVector(sqrt10 + 2, 0);

        // G: EG = 3, GF = 2 조건을 만족하는 점
        G = p.createVector(3 * sqrt10 / 4, 3 * sqrt6 / 4);

        // C: GF 연장선 위, FC = sqrt(10)
        C = p.createVector(sqrt10 + 5 / 4, -3 * sqrt15 / 4);

        // B: 평행사변형 조건 (B - A = C - D)
        B = p.createVector(-3 - 3 / 4, -3 * sqrt15 / 4);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phase 1: 평행사변형 =====
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.4 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: 12, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dx: 12, dy: -10 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Problem Phase 2: 점 E, F, G와 각의 이등분선 =====
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'segBG', object: XSegment(p, B, G), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCG', object: XSegment(p, C, G), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 8, dy: 12 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { dx: -8, dy: 12 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointG', object: new XPoint(p, G, 'G', { dx: 0, dy: -15 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'angleEBA', object: new XAngleMarker(p, E, B, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCBE', object: new XAngleMarker(p, C, B, E, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimEG', object: new XDimension(p, E, G, '3', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimGF', object: new XDimension(p, G, F, '2', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimFD', object: new XDimension(p, F, D, '2', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: 각도 관계와 합동 =====
        animator.registerPhase('solution1', [
            // 기존 각 마커 숨기고 x° 마커로 교체
            {
                group: [
                    { id: 'angleEBA', action: 'hide' },
                    { id: 'angleCBE', action: 'hide' }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleEBA_x', object: new XAngleMarker(p, E, B, A, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCBE_x', object: new XAngleMarker(p, C, B, E, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            // pulse와 각 FDC 그리기
            {
                group: [
                    { id: 'angleEBA_x', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'angleCBE_x', animate: { mode: 'pulse', duration: 3.0 } },
                    {
                        group: [
                            { id: 'angleFDC', object: new XAngleMarker(p, F, D, C, { marker: '2x°' }), animate: { mode: 'draw', duration: 0.8 } },
                            { delay: 0.5 },
                            { id: 'angleFDC', animate: { mode: 'pulse', duration: 1.2 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // 각 DCF 그리기
            { id: 'angleDCF', object: new XAngleMarker(p, D, C, F, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.5 },

            // 엇각: CBE pulse와 AEB 그리기
            {
                group: [
                    { id: 'angleCBE_x', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { id: 'angleAEB', object: new XAngleMarker(p, A, E, B, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.8 } },
                            { delay: 0.5 },
                            { id: 'angleAEB', animate: { mode: 'pulse', duration: 1.2 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // 각 FEG, GFE, CFD 그리기
            {
                group: [
                    { id: 'angleFEG', object: new XAngleMarker(p, F, E, G, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleGFE', object: new XAngleMarker(p, G, F, E, { marker: 'star' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCFD', object: new XAngleMarker(p, C, F, D, { marker: 'star' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.5 },

            // 각 EGF 그리기
            { id: 'angleEGF', object: new XAngleMarker(p, E, G, F, { marker: '2x°' }), animate: { mode: 'draw', duration: 0.8 } },

            // 삼각형 합동 travel과 CD 치수
            {
                group: [
                    { id: 'triFGE', object: new XPolygon(p, [F, G, E]), animate: { mode: 'travel', duration: 4.0, repeat: 2 } },
                    { id: 'triFDC', object: new XPolygon(p, [F, D, C]), animate: { mode: 'travel', duration: 4.0, repeat: 2 } },
                    { id: 'dimCD', object: new XDimension(p, C, D, '3', { offset: -10 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 },

            // AB, AE 치수
            { id: 'dimAB', object: new XDimension(p, A, B, '3', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.5 },
            { id: 'dimAE', object: new XDimension(p, A, E, '3', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2: 닮음 =====
        animator.registerPhase('solution2', [
            // 삼각형 GBC, GEF 그리기
            { id: 'triGBC', object: new XPolygon(p, [G, B, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'triGEF', object: new XPolygon(p, [G, E, F], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } },
            // travel
            {
                group: [
                    { id: 'triGBC', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triGEF', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            // EF, FC 치수와 텍스트
            {
                group: [
                    { id: 'dimEF', object: new XDimension(p, E, F, 'l', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimFC', object: new XDimension(p, F, C, 'l', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // hide XDims AB, AE, FD, CD || draw XDim BC
            {
                group: [
                    { id: 'dimAB', action: 'hide', duration: 1.0 },
                    { id: 'dimAE', action: 'hide', duration: 1.0 },
                    { id: 'dimFD', action: 'hide', duration: 1.0 },
                    { id: 'dimCD', action: 'hide', duration: 1.0 },
                    { id: 'dimBC', object: new XDimension(p, B, C, '5+l', { offset: -10 }), animate: { mode: 'draw', duration: 1.8 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
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
