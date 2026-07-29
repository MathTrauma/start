import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XRightAngle, XSegmentMarker, XText, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { intersectLines, getCircumcenter, circleLineIntersection } from '../../lib/geometry.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let A, B, C, D, E, F, G, H, Bp;
    let animator, size;

    p.setup = function() {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점
        A = p.createVector(0, 0);
        B = p.createVector(2, 0);
        E = p.createVector(0, -2);
        H = p.createVector(1, 0);
        Bp = p.createVector(-2, 0); // B' (표시 안 함)

        // 계산점
        // D: 직선 EH와 원 O(중심 A, 반지름 2)의 교점 (E 아닌 것)
        const hits = circleLineIntersection(A, 2, E, H);
        D = (p5.Vector.dist(hits[0], E) > 0.01) ? hits[0] : hits[1];

        // C: AC = AB + AD (마름모)
        C = p5.Vector.add(B, D);

        // F: 대각선 교점 = BD 중점
        F = p5.Vector.add(B, D).mult(0.5);

        // G: 삼각형 ABD 무게중심 = DE와 AC 교점
        G = p.createVector((A.x + B.x + D.x) / 3, (A.y + B.y + D.y) / 3);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // Problem Phase 1
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'ptA', object: new XPoint(p, A, 'A', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptB', object: new XPoint(p, B, 'B', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptD', object: new XPoint(p, D, 'D', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 },
            {
                group: [
                    { action: 'addToBounds', points: [E], duration: 1.2 },
                    { id: 'triAEB', object: new XPolygon(p, [A, E, B]), animate: { mode: 'draw', duration: 1.8 } },
                    { id: 'rightEAB', object: new XRightAngle(p, E, A, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } }
                ],
                parallel: true
            },
            { id: 'ptE', object: new XPoint(p, E, 'E', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // Problem Phase 2
        animator.registerPhase('problem2', [
            { id: 'segDB', object: XSegment(p, D, B), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'ptF', object: new XPoint(p, F, 'F', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            { id: 'segED', object: XSegment(p, E, D), animate: { mode: 'draw', duration: 1.4 } },
            { id: 'ptH', object: new XPoint(p, H, 'H', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptG', object: new XPoint(p, G, 'G', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 },
            {
                group: [
                    { id: 'fillCGD', object: new XPolygon(p, [C, G, D], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillAGH', object: new XPolygon(p, [A, G, H], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillEBH', object: new XPolygon(p, [E, B, H], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'text1', object: new XText(p, [size / 2, size - 140], '|\\triangle CGD| + |\\triangle AGH| + |\\triangle EBH| = 2', { useTex: true, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 }
        ]);

        // Solution Phase 1
        animator.registerPhase('solution1', [
            {
                group: [
                    { action: 'addToBounds', points: [Bp], duration: 1.2 },
                    { id: 'circO', object: XCircle(p, A, 2, { color: COLORS.yellow, weight: 1, dashed: true }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'lineDAB', object: new XPolygon(p, [D, A, B], { color: COLORS.green, weight: 4, closed: false }), animate: { mode: 'draw', duration: 1.6 } },
                    { id: 'lineDAB', setFrameCallbackFactory: () => {
                        let patched = false;
                        return (obj) => {
                            if (patched) return;
                            patched = true;
                            const origRender = obj.render.bind(obj);
                            obj.render = function() {
                                origRender();
                                if (this.mode === 'draw' && this.progress > 0 && this.progress < 1) {
                                    const pos = this.findPositionByProgress(this.progress);
                                    this.drawTravelingCircle(this.tx(pos), this.ty(pos));
                                }
                            };
                        };
                    }},
                    { id: 's1_text1', object: new XText(p, [20, 25], '중심각', { screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.6 } },
                    { id: 's1_text1', setFrameCallbackFactory: () => {
                        let elapsed = 0, lastTime = null;
                        const baseSize = 14;
                        return (obj) => {
                            if (obj.mode !== 'draw' || obj.progress >= 1) {
                                obj.opacity = 1;
                                obj.fontSize = baseSize;
                                obj.frameCallback = null;
                                return;
                            }
                            const now = performance.now();
                            if (!lastTime) lastTime = now;
                            elapsed += (now - lastTime) / 1000;
                            lastTime = now;
                            const wave = Math.sin(elapsed * Math.PI * 4);
                            obj.opacity = 0.5 + 0.5 * wave;
                            obj.fontSize = baseSize + 4 * wave;
                        };
                    }}
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'lineDEB', object: new XPolygon(p, [D, E, B], { color: COLORS.green, weight: 4, closed: false }), animate: { mode: 'draw', duration: 2.1 } },
                    { id: 'lineDEB', setFrameCallbackFactory: () => {
                        let patched = false;
                        return (obj) => {
                            if (patched) return;
                            patched = true;
                            const origRender = obj.render.bind(obj);
                            obj.render = function() {
                                origRender();
                                if (this.mode === 'draw' && this.progress > 0 && this.progress < 1) {
                                    const pos = this.findPositionByProgress(this.progress);
                                    this.drawTravelingCircle(this.tx(pos), this.ty(pos));
                                }
                            };
                        };
                    }},
                    { id: 's1_text2', object: new XText(p, [20, 50], '원주각', { screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 2.1 } },
                    { id: 's1_text2', setFrameCallbackFactory: () => {
                        let elapsed = 0, lastTime = null;
                        const baseSize = 14;
                        return (obj) => {
                            if (obj.mode !== 'draw' || obj.progress >= 1) {
                                obj.opacity = 1;
                                obj.fontSize = baseSize;
                                obj.frameCallback = null;
                                return;
                            }
                            const now = performance.now();
                            if (!lastTime) lastTime = now;
                            elapsed += (now - lastTime) / 1000;
                            lastTime = now;
                            const wave = Math.sin(elapsed * Math.PI * 4);
                            obj.opacity = 0.5 + 0.5 * wave;
                            obj.fontSize = baseSize + 4 * wave;
                        };
                    }}
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleBED', object: new XAngleMarker(p, B, E, D, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { action: 'setBounds', points: [A, B, C, D, E], replace: true, duration: 0.8 },
                    { id: 'circO', action: 'remove' }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'lineDAB', action: 'hide', duration: 1.0 },
                    { id: 'lineDEB', action: 'hide', duration: 1.0 },
                    {
                        id: 'circumAEB',
                        object: (() => {
                            const cc = getCircumcenter(A, E, B);
                            const cr = p5.Vector.dist(cc, A);
                            return XCircle(p, cc, cr);
                        })(),
                        animate: { mode: 'draw', duration: 1.5 }
                    }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'segBG', object: XSegment(p, B, G), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'rightEGB', object: new XRightAngle(p, E, G, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 2
        animator.registerPhase('solution2', [
            { id: 'circumAEB', action: 'hide', duration: 0.6 },
            {
                group: [
                    { id: 'angleBAC', animate: { mode: 'pulse', duration: 1.2 } },
                    { id: 'angleDCA', object: new XAngleMarker(p, D, C, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleEHB', object: new XAngleMarker(p, E, H, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleGHA', object: new XAngleMarker(p, G, H, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleCGD', object: new XAngleMarker(p, C, G, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleEHB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleGHA', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleCGD', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'fillCGD', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'fillAGH', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'fillEBH', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'markGD1', object: new XSegmentMarker(p, G, D, { mark: 1 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markGH1', object: new XSegmentMarker(p, G, H, { mark: 1 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markBH1', object: new XSegmentMarker(p, B, H, { mark: 1 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markAG2', object: new XSegmentMarker(p, A, G, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markCG2', object: new XSegmentMarker(p, C, G, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markEB2', object: new XSegmentMarker(p, E, B, { mark: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markAH3', object: new XSegmentMarker(p, A, H, { mark: 3 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markEH3', object: new XSegmentMarker(p, E, H, { mark: 3 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markCD3', object: new XSegmentMarker(p, C, D, { mark: 3 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            {
                group: [
                    { id: 'segGD_green', object: XSegment(p, G, D, { color: COLORS.green }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'segGB_green', object: XSegment(p, G, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { id: 'lineGHB', object: new XPolygon(p, [G, H, B], { color: COLORS.green, closed: false }), animate: { mode: 'draw', duration: 1.4 } },
            {
                group: [
                    { id: 's2_text1', object: new XText(p, [size / 2, size - 112], '\\overline{GH}^2 + \\overline{GD}^2 = \\overline{BH}^2', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'polyBGH', object: new XPolygon(p, [B, G, H]), animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            { id: 'main_text', object: new XText(p, [size / 2, size - 80], '|\\triangle CGD| + |\\triangle AGH| = |\\triangle EBH| = 1', { useTex: true, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'dimAH', object: new XDimension(p, A, H, '1', { offset: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'dimHB', object: new XDimension(p, H, B, '1', { offset: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 3
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 'fillAGH', animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'fillCGD', animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 's3_text1', object: new XText(p, [size / 2, size - 48], '|\\triangle CGD| = 4 \\times |\\triangle AGH|', { useTex: true, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.1 } },
                    { id: 'main_text', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { id: 's3_text2', object: new XText(p, p.createVector((A.x + G.x + H.x) / 3, (A.y + G.y + H.y) / 3), '\\dfrac{1}{5}', { useTex: true }), animate: { mode: 'draw', duration: 1.0 } },
            { id: 's3_text3', object: new XText(p, p.createVector((G.x + H.x + B.x + F.x) / 4, (G.y + H.y + B.y + F.y) / 4), '\\dfrac{2}{5}', { useTex: true }), animate: { mode: 'draw', duration: 1.0 } },
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
