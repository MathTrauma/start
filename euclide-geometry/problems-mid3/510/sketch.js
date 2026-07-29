import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XDimension, XText } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let A, B, C, D;
    let animator, size;

    p.setup = function() {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점
        B = p.createVector(-3 * Math.SQRT2 * Math.sqrt(1.5), 0);  // -3√3
        C = p.createVector(3 * Math.SQRT2 * Math.sqrt(1.5), 0);   //  3√3
        const sqrt3 = Math.sqrt(3);
        B = p.createVector(-3 * sqrt3, 0);
        C = p.createVector(3 * sqrt3, 0);

        // A: ∠ABC = 30°, AB = 8 → B에서 BC방향(+x) 기준 30° 위
        A = p.createVector(B.x + 8 * Math.cos(Math.PI / 6), B.y + 8 * Math.sin(Math.PI / 6));
        // A = (√3, 4)

        // D: AB 위의 점, AD = 7/2 (닮음에서 유도)
        D = p5.Vector.add(A, p5.Vector.sub(B, A).mult(7 / 16));
        // D = (-3√3/4, 9/4)

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

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // --- Problem Phase 1 ---
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'ptA', object: new XPoint(p, A, 'A', { dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'dimAB', object: new XDimension(p, A, B, '8', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 0.9 } },
            { id: 'dimBC', object: new XDimension(p, B, C, '6\\sqrt{3}', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'dimAC', object: new XDimension(p, A, C, '2\\sqrt{7}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.5 }
        ]);

        // --- Problem Phase 2 ---
        animator.registerPhase('problem2', [
            { action: 'fade', targets: ['dimAB', 'dimBC', 'dimAC'], opacity: 0.3, duration: 0.7 },
            { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 0.9 } },
            { id: 'ptD', object: new XPoint(p, D, 'D', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: '30°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.2 },
            { id: 'angleACD', object: new XAngleMarker(p, A, C, D, { marker: '30°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.2 }
        ]);

        // --- Solution Phase 1 ---
        // 각 마커 arcSize 고정 (이동 중 auto 계산 흔들림 방지)
        const arcSizeAngle = 25;

        // clone ACD green move(-100, 150)
        const dA1 = A.copy(), dC1 = C.copy(), dD1 = D.copy();
        const orig1 = [A.copy(), C.copy(), D.copy()];
        const dup1 = [dA1, dC1, dD1];
        const movFactory1 = createDupTranslatorFactory(dup1, orig1, -100, 100, 1.8);

        // clone ABC yellow move(0, -120)
        const dA2 = A.copy(), dB2 = B.copy(), dC2 = C.copy();
        const orig2 = [A.copy(), B.copy(), C.copy()];
        const dup2 = [dA2, dB2, dC2];
        const movFactory2 = createDupTranslatorFactory(dup2, orig2, 0, -120, 2.4);

        animator.registerPhase('solution1', [
            { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.2 },
            // clone ACD green
            { id: '_acd_tri', object: new XPolygon(p, [dA1, dC1, dD1], { color: COLORS.green }), action: 'show' },
            { id: '_acd_angleDAC', object: new XAngleMarker(p, dD1, dA1, dC1, { marker: 'triangle', color: COLORS.green, arcSize: arcSizeAngle }), action: 'show' },
            { id: '_acd_angleACD', object: new XAngleMarker(p, dA1, dC1, dD1, { marker: '30°', color: COLORS.green, arcSize: arcSizeAngle }), action: 'show' },
            { id: '_acd_tri', setFrameCallbackFactory: movFactory1 },
            { delay: 0.5 },
            // clone ABC yellow
            { id: '_abc_tri', object: new XPolygon(p, [dA2, dB2, dC2], { color: COLORS.yellow }), action: 'show' },
            { id: '_abc_angleDAC2', object: new XAngleMarker(p, dB2, dA2, dC2, { marker: 'triangle', color: COLORS.yellow, arcSize: arcSizeAngle }), action: 'show' },
            { id: '_abc_angleCBA', object: new XAngleMarker(p, dC2, dB2, dA2, { marker: '30°', color: COLORS.yellow, arcSize: arcSizeAngle }), action: 'show' },
            { id: '_abc_tri', setFrameCallbackFactory: movFactory2 },
            { delay: 0.5 },
            {
                group: [
                    { action: 'fadeAll', opacity: 0.3, exclude: ['_acd_tri', '_acd_angleDAC', '_acd_angleACD', '_abc_tri', '_abc_angleDAC2', '_abc_angleCBA'], duration: 0.7 },
                    { id: 'text1', object: new XText(p, [20, 25], '\\overline{AD} : \\overline{AC} = \\overline{AC} : \\overline{AB}', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 1
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
