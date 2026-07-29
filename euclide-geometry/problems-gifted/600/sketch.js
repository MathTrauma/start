import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XSegmentMarker, XText } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { intersectLines, getCircumcenter, circleLineIntersection } from '../../lib/geometry.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let O, A, B, C, D, E, F, G, X, Y;
    let O_, rO_;
    let animator, size;

    p.setup = function() {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점: 원 O 중심 (0,0), 반지름 2
        O = p.createVector(0, 0);
        A = p.createVector(0, -2);
        B = p.createVector(2 * Math.cos(30 * Math.PI / 180), 2 * Math.sin(30 * Math.PI / 180));
        C = p.createVector(2 * Math.cos(190 * Math.PI / 180), 2 * Math.sin(190 * Math.PI / 180));
        D = p.createVector(2 * Math.cos(110 * Math.PI / 180), 2 * Math.sin(110 * Math.PI / 180));
        X = p.createVector(-4, -2);
        Y = p.createVector(4, -2);

        // 계산점: D에서의 접선 l_ (OD에 수직)
        const D2 = p.createVector(D.x - D.y, D.y + D.x);
        E = intersectLines(A, B, D, D2);
        F = intersectLines(A, C, D, D2);

        // 외접원 O_ (삼각형 AEF) 및 점 G (직선 AD와 O_의 교점, A 아닌 점)
        O_ = getCircumcenter(A, E, F);
        rO_ = p5.Vector.dist(O_, A);
        const hits = circleLineIntersection(O_, rO_, A, D);
        G = (p5.Vector.dist(hits[0], A) > 0.01) ? hits[0] : hits[1];

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, D, C], size, 50);

        // Problem Phase 1
        animator.registerPhase('problem1', [
            { id: 'ptO', object: new XPoint(p, O, 'O', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'circO', object: XCircle(p, O, 2), animate: { mode: 'draw', duration: 1.6 } },
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { dx: -12 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'segL', object: XSegment(p, X, Y), animate: { mode: 'draw', duration: 1.1 } },
            { delay: 0.5 },
            { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'ptD', object: new XPoint(p, D, 'D', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'markCD', object: new XSegmentMarker(p, C, D, { mark: 1 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'markCA', object: new XSegmentMarker(p, C, A, { mark: 1 }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleCAX', object: new XAngleMarker(p, C, A, X, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleYAB', object: new XAngleMarker(p, Y, A, B, { marker: '60°' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            }
        ]);

        // Problem Phase 2
        animator.registerPhase('problem2', [
            { action: 'addToBounds', points: [E, F], duration: 1.5 },
            {
                group: [
                    { id: 'segEF', object: XSegment(p, E, F), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBE', object: XSegment(p, B, E), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCF', object: XSegment(p, C, F), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptE', object: new XPoint(p, E, 'E', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptF', object: new XPoint(p, F, 'F', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ef2', object: XSegment(p, F, E, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'cb2', object: XSegment(p, C, B, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markEf2', object: new XSegmentMarker(p, F, E, { mark: 2, type: 'arrow' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markCb2', object: new XSegmentMarker(p, C, B, { mark: 2, type: 'arrow' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // Solution Phase 1
        animator.registerPhase('solution1', [
            { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.7 } },
            { id: 'segDB', object: XSegment(p, D, B, { dashed: true }), animate: { mode: 'draw', duration: 0.9 } },
            { delay: 1.0 },
            { id: 'markDB', object: new XSegmentMarker(p, D, B, { mark: 1 }), animate: { mode: 'draw', duration: 0.5 } },
            { id: 'angleDBC', object: new XAngleMarker(p, D, B, C, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.7 } },
            { id: 'angleBCD', object: new XAngleMarker(p, B, C, D, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.5 }
        ]);

        // Solution Phase 2
        animator.registerPhase('solution2', [
            { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: '60°' }), animate: { mode: 'draw', duration: 0.6 } },
            {
                group: [
                    { id: 'polyABDC', object: new XPolygon(p, [A, B, D, C], { color: COLORS.green }), animate: { mode: 'draw', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'text1', object: new XText(p, [20, 25], '3x + 60 = 180', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.0 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // 75: text x=40 || change all x° → 40°
            {
                group: [
                    { id: 'text2', object: new XText(p, [20, 50], 'x = 40', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleCAX', action: 'remove' },
                    { id: 'angleCBA', action: 'remove' },
                    { id: 'angleDBC', action: 'remove' },
                    { id: 'angleBCD', action: 'remove' },
                    { id: 'angleCAX_40', object: new XAngleMarker(p, C, A, X, { marker: '40°' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleCBA_40', object: new XAngleMarker(p, C, B, A, { marker: '40°' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleDBC_40', object: new XAngleMarker(p, D, B, C, { marker: '40°' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBCD_40', object: new XAngleMarker(p, B, C, D, { marker: '40°' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            // 76: text "원주각" || draw angles BAD, DAC
            {
                group: [
                    { id: 'text3', object: new XText(p, [20, 75], '원주각', { fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { marker: '40°' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: '40°' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // Solution Phase 3
        animator.registerPhase('solution3', [
            {
                group: [
                    { action: 'addToBounds', points: [G], duration: 1.5 },
                    { id: 'circO_', object: XCircle(p, O_, rO_), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { id: 'segAG', object: XSegment(p, A, G), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'ptG', object: new XPoint(p, G, 'G', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 },
            // 84-87: angle BDE, DEB
            { id: 'angleBDE', object: new XAngleMarker(p, B, D, E, { marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.5 },
            { id: 'angleDEB', object: new XAngleMarker(p, D, E, B, { marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.5 },
            // 89-92: seg FG, angles FGD, DFG
            { id: 'segFG', object: XSegment(p, F, G), animate: { mode: 'draw', duration: 0.9 } },
            { id: 'angleFGD', object: new XAngleMarker(p, F, G, D, { marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'angleDFG', object: new XAngleMarker(p, D, F, G, { marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 },
            // 94-96: seg GE, angle GEF
            { id: 'segGE', object: XSegment(p, G, E), animate: { mode: 'draw', duration: 0.9 } },
            { id: 'angleGEF', object: new XAngleMarker(p, G, E, F, { marker: '40°' }), animate: { mode: 'draw', duration: 0.8 } }
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
