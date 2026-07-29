
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, reflectPoint } from '../../lib/geometry.js';
import { COLORS } from '../../lib/config.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XText } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, O, D, E;
    let animator;
    const R = 3;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의 (외접원 위의 점들)
        O = p.createVector(0, 0);
        A = p.createVector(R * Math.cos(90 * Math.PI / 180), R * Math.sin(90 * Math.PI / 180));
        B = p.createVector(R * Math.cos(-128 * Math.PI / 180), R * Math.sin(-128 * Math.PI / 180));
        C = p.createVector(R * Math.cos(-52 * Math.PI / 180), R * Math.sin(-52 * Math.PI / 180));

        // D: B에서의 접선과 직선 AC의 교점
        const tangentDir = p.createVector(-(B.y - O.y), B.x - O.x);
        const tangentPoint = p5.Vector.add(B, tangentDir);
        D = intersectLines(B, tangentPoint, A, C);

        // E: D를 BC에 대해 대칭 → B와 대칭점의 직선과 AC의 교점
        const D_reflected = reflectPoint(D, B, C);
        E = intersectLines(B, D_reflected, A, C);

        const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

        // duplicate 이동 헬퍼
        const createDupTranslatorFactory = (sharedPts, origPts, dxScreen, dyScreen, duration) => {
            return () => {
                let elapsed = 0, lastTime = null;
                const scale = p.geometryScale;
                const dxMath = dxScreen / scale;
                const dyMath = dyScreen / scale;
                return (obj) => {
                    const now = performance.now();
                    if (!lastTime) lastTime = now;
                    elapsed += (now - lastTime) / 1000;
                    lastTime = now;
                    const t = Math.min(1, elapsed / duration);
                    sharedPts.forEach((pt, i) => {
                        pt.x = origPts[i].x + dxMath * t;
                        pt.y = origPts[i].y + dyMath * t;
                    });
                    sharedPts.forEach((pt, i) => {
                        if (obj.vertices[i]) {
                            obj.vertices[i].x = pt.x;
                            obj.vertices[i].y = pt.y;
                        }
                    });
                    obj._perimeterDirty = true;
                    if (t >= 1) obj.frameCallback = null;
                };
            };
        };

        // clone ABC move(-120, 30) — shared points
        const dA1 = A.copy(), dB1 = B.copy(), dC1 = C.copy();
        const orig1 = [A.copy(), B.copy(), C.copy()];
        const dup1 = [dA1, dB1, dC1];
        const movFactory1 = createDupTranslatorFactory(dup1, orig1, -120, 30, 1.5);

        // clone BCE move(120, -10) — shared points
        const dB2 = B.copy(), dC2 = C.copy(), dE2 = E.copy();
        const orig2 = [B.copy(), C.copy(), E.copy()];
        const dup2 = [dB2, dC2, dE2];
        const movFactory2 = createDupTranslatorFactory(dup2, orig2, 120, -10, 1.5);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phase 1: 이등변삼각형 ABC와 외접원 =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.2 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.2 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2: 접선과 점 D =====
        animator.registerPhase('problem2', [
            { id: 'circleO', object: XCircle(p, O, R, { color: p.theme.auxiliary || [100, 150, 255] }), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { action: 'addToBounds', points: [D], duration: 1.2 },
                    {
                        group: [
                            { id: 'segBD', object: XSegment(p, B, D, { closed: false }), animate: { mode: 'draw', duration: 2.0 } },
                            { id: 'segCD', object: XSegment(p, C, D, { closed: false }), animate: { mode: 'draw', duration: 2.0 } }
                        ],
                        parallel: true
                    }
                ],
                parallel: true
            },
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 3: 각의 이등분과 점 E =====
        animator.registerPhase('problem3', [
            { id: 'segBE', object: XSegment(p, B, E, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            // ghost angles CBA, ACB || draw angles DBC, CBE markc
            {
                group: [
                    {
                        group: [
                            { id: 'angleCBA', action: 'fade', opacity: 0.3, duration: 0.3 },
                            { id: 'angleACB', action: 'fade', opacity: 0.3, duration: 0.3 }
                        ],
                        parallel: true
                    },
                    {
                        group: [
                            { id: 'angleDBC', object: new XAngleMarker(p, D, B, C, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                            { id: 'angleCBE', object: new XAngleMarker(p, C, B, E, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
                        ],
                        parallel: true
                    }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1: 접현각 표시과 같은 각 표시 =====
        animator.registerPhase('solution1', [
            // pulse DBC (2.0) || after 1, draw BAC markc (1.0)
            {
                group: [
                    { id: 'angleDBC', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // pulse DBC, BAC (1.0) || text["접현각", lower left] as t1
            {
                group: [
                    { id: 'angleDBC', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'angleBAC', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 't1', object: new XText(p, [20, size - 25], '접현각', { fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // draw ABC green || travel ABC (1.5)
            {
                group: [
                    { id: 'triABC_green', object: new XPolygon(p, [A, B, C], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triABC', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            // clone ABC move(-120, 30) with angles
            { id: '_abc_tri', object: new XPolygon(p, [dA1, dB1, dC1], { color: COLORS.green }), action: 'show' },
            { id: '_abc_angleCBA', object: new XAngleMarker(p, dC1, dB1, dA1, { marker: 'triangle', color: COLORS.green }), action: 'show' },
            { id: '_abc_angleACB', object: new XAngleMarker(p, dA1, dC1, dB1, { marker: 'triangle', color: COLORS.green }), action: 'show' },
            { id: '_abc_angleBAC', object: new XAngleMarker(p, dB1, dA1, dC1, { marker: 'circle', color: COLORS.green }), action: 'show' },
            { id: '_abc_tri', setFrameCallbackFactory: movFactory1 },
            { delay: 0.5 },
            // draw BCE yellow || travel BCE (1.5)
            {
                group: [
                    { id: 'triBCE_yellow', object: new XPolygon(p, [B, C, E], { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triBCE_yellow', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            // clone BCE move(120, -10) with angle ACB
            { id: '_bce_tri', object: new XPolygon(p, [dB2, dC2, dE2], { color: COLORS.yellow }), action: 'show' },
            { id: '_bce_angleACB', object: new XAngleMarker(p, dE2, dC2, dB2, { marker: 'triangle', color: COLORS.yellow }), action: 'show' },
            { id: '_bce_angleCBE', object: new XAngleMarker(p, dC2, dB2, dE2, { marker: 'circle', color: COLORS.yellow }), action: 'show' },
            { id: '_bce_tri', setFrameCallbackFactory: movFactory2 },
            // ghost except clones
            { action: 'fadeAll', opacity: 0.3, exclude: ['_abc_tri', '_abc_angleCBA', '_abc_angleACB', '_abc_angleBAC', '_bce_tri', '_bce_angleACB', '_bce_angleCBE'], duration: 0.7 },
            // draw angle cloned BEC markt
            { id: '_bce_angleBEC', object: new XAngleMarker(p, dB2, dE2, dC2, { marker: 'triangle', color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // remove clones (fade out 0.7) || recover all (0.7) || draw angle original AEB (0.7)
            {
                group: [
                    { action: 'fade', targets: ['_abc_tri', '_abc_angleCBA', '_abc_angleACB', '_abc_angleBAC', '_bce_tri', '_bce_angleACB', '_bce_angleCBE', '_bce_angleBEC'], opacity: 0, duration: 0.7 },
                    { action: 'fadeAll', opacity: 1.0, exclude: ['_abc_tri', '_abc_angleCBA', '_abc_angleACB', '_abc_angleBAC', '_bce_tri', '_bce_angleACB', '_bce_angleCBE', '_bce_angleBEC'], duration: 0.7 },
                    { id: 'angleBEC', object: new XAngleMarker(p, B, E, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { id: '_abc_tri', action: 'remove' },
            { id: '_abc_angleCBA', action: 'remove' },
            { id: '_abc_angleACB', action: 'remove' },
            { id: '_abc_angleBAC', action: 'remove' },
            { id: '_bce_tri', action: 'remove' },
            { id: '_bce_angleACB', action: 'remove' },
            { id: '_bce_angleCBE', action: 'remove' },
            { id: '_bce_angleBEC', action: 'remove' },
            // draw angles AEB, BCD
            {
                group: [
                    { id: 'angleAEB', object: new XAngleMarker(p, A, E, B), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleBCD', object: new XAngleMarker(p, B, C, D), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            // fill triangles AEB, BCD same color
            {
                group: [
                    { id: 'fillAEB', object: new XPolygon(p, [A, E, B], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'fillBCD', object: new XPolygon(p, [B, C, D], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // t1을 한 줄 위로 부드럽게 이동 (현재 위치 기반)
            { id: 't1', setFrameCallbackFactory: (() => {
                const toY = size - 50, dur = 1.0;
                return () => {
                    let elapsed = 0, lastTime = null, fromY = null;
                    return (obj) => {
                        if (fromY === null) fromY = obj.pos.y;
                        const now = performance.now();
                        if (!lastTime) lastTime = now;
                        elapsed += (now - lastTime) / 1000;
                        lastTime = now;
                        const t = Math.min(1, elapsed / dur);
                        obj.pos.y = fromY + (toY - fromY) * t;
                        if (t >= 1) obj.frameCallback = null;
                    };
                };
            })() },
            // text 비례식
            { id: 'text2', object: new XText(p, [20, size - 25], '\\overline{AE} : 40 = 40 : 50', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.5 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2', 3: 'problem3' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 3,
            solutionPhaseCount: 2
        });
    };

    p.draw = function () {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);
        if (animator) animator.updateAndDraw();
        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
