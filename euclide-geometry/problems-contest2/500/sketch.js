import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XDimension, XAngleMarker, XRightAngle, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, O;
    const R = 18; // 외접원 반지름 (= AB/2 = 36/2)
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 점 정의
        B = p.createVector(-46 / 3, 0);
        C = p.createVector(46 / 3, 0);
        A = p.createVector(46 / 3, (40 * Math.sqrt(2)) / 3);
        E = p.createVector(26 / 3, 0);
        F = p.createVector(66 / 3, 0);

        // D: 직선 AE와 외접원의 교점 (A 제외)
        D = p.createVector(6, (-16 * Math.sqrt(2)) / 3);

        // 외심 O: 직각삼각형 → 빗변 AB의 중점
        O = p.createVector(0, (20 * Math.sqrt(2)) / 3);

        animator = new XAnimator(p);
        animator.initViewport([A, B, D, C], size, 50);

        // ===== Problem Phase 1: 삼각형, 직각 마커, 점 표시, 외접원 + XDim BA =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.6 } },
            { id: 'rightAngleC', object: new XRightAngle(p, A, C, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: 10, dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: -12, dy: 8 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: 10, dy: 8 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'circO', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'dimBA', object: new XDimension(p, B, A, '36', { offset: 10 }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2: 선분 AD, 점 E/D, 치수, 각 마커, 선분 BD yellow =====
        animator.registerPhase('problem2', [
            { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.4 } },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { dx: -12, dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'dimEA', object: new XDimension(p, E, A, '20', { offset: 10 }), animate: { mode: 'draw', duration: 1.3 } },
            { delay: 0.7 },
            {
                group: [
                    { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { marker: '\\theta', useTex: true, arcSize: 30 }), animate: { mode: 'draw', duration: 0.9 } },
                    { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { marker: '2\\theta', useTex: true, arcSize: 40 }), animate: { mode: 'draw', duration: 0.9 } }
                ],
                parallel: true
            },
            { id: 'segBD', object: XSegment(p, B, D, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 1.3 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: BD 숨김, F 보조선, XDim AF, 각 CAF =====
        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'segBD', action: 'hide', duration: 0.5 },
                    { action: 'addToBounds', points: [F], duration: 1.5 },
                    { id: 'segCF', object: XSegment(p, C, F, { dashed: true }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'segAF', object: XSegment(p, A, F, { dashed: true }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointF', object: new XPoint(p, F, 'F', { dx: 10, dy: 8 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'dimAF', object: new XDimension(p, A, F, '20', { offset: 10 }), animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            { id: 'angleCAF', object: new XAngleMarker(p, C, A, F, { marker: '\\theta', useTex: true, arcSize: 30 }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 2: 텍스트, 삼각형 ABF, 선분 AE 강조, XDim BE/EC/CF =====
        const xBase = 25;
        const xRight = size - 25;
        const yBase = size - 25;
        const lineH = 28;

        const textFirst = new XText(p, [xBase, yBase], '내각이등분선', { fontSize: 16, screenCoord: true, textAlign: p.LEFT });
        const textFormula = new XText(p, [xBase, yBase],
            '\\overline{AB} : \\overline{AF} = \\overline{BE} : \\overline{EF}',
            { fontSize: 14, screenCoord: true, useTex: true, textAlign: p.LEFT }
        );
        const textSecond = new XText(p, [xRight, yBase],
            '20^2 = (5x)^2 + h^2',
            { fontSize: 14, screenCoord: true, useTex: true, textAlign: p.RIGHT }
        );
        const textThird = new XText(p, [xRight, yBase],
            '36^2 = (23x)^2 + h^2',
            { fontSize: 14, screenCoord: true, useTex: true, textAlign: p.RIGHT }
        );

        const createYMover = (dy, duration) => () => {
            let elapsed = 0, lastTime = null, startY = null;
            return (obj) => {
                const now = performance.now();
                if (startY === null) startY = obj.pos.y;
                if (!lastTime) lastTime = now;
                elapsed += (now - lastTime) / 1000;
                lastTime = now;
                const t = Math.min(1, elapsed / duration);
                obj.pos.y = startY + dy * t;
                if (t >= 1) obj.frameCallback = null;
            };
        };

        // XDimension offset 슬라이더 (dimBE를 down → up으로 이동)
        const createOffsetSlider = (toOffset, duration) => {
            let elapsed = 0, lastTime = null, fromOffset = null;
            return (obj) => {
                if (fromOffset === null) fromOffset = obj.offset;
                const now = performance.now();
                if (!lastTime) lastTime = now;
                elapsed += (now - lastTime) / 1000;
                lastTime = now;
                const progress = Math.min(1, elapsed / duration);
                obj.offset = fromOffset + (toOffset - fromOffset) * progress;
                if (progress >= 1) obj.frameCallback = null;
            };
        };

        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'textFirst', object: textFirst, animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'triABF', object: new XPolygon(p, [A, B, F], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segAE', object: XSegment(p, A, E, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'textFirst', setFrameCallbackFactory: createYMover(-lineH, 1.3) },
                    { id: 'textFormula', object: textFormula, animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'dimBE', object: new XDimension(p, B, E, '18x', { offset: -10 }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'dimEC', object: new XDimension(p, E, C, '5x', { offset: -10 }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'dimCF', object: new XDimension(p, C, F, '5x', { offset: -10 }), animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            { id: 'dimAC', object: new XDimension(p, A, C, 'h', { offset: 10 }), animate: { mode: 'draw', duration: 1.3 } },
            {
                group: [
                    { id: 'fillAEC', object: new XPolygon(p, [A, E, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.4 } },
                    { id: 'textSecond', object: textSecond, animate: { mode: 'draw', duration: 1.4 } }
                ],
                parallel: true
            },
            { delay: 0.7 },
            {
                group: [
                    { id: 'fillAEC', action: 'remove' },
                    { id: 'fillABC', object: new XPolygon(p, [A, B, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.4 } },
                    { id: 'textSecond', setFrameCallbackFactory: createYMover(-lineH, 1.0) },
                    { id: 'textThird', object: textThird, animate: { mode: 'draw', duration: 1.4 } }
                ],
                parallel: true
            },
            { delay: 1.7 },
            { id: 'fillABC', action: 'hide', duration: 0.3 }
        ]);

        // ===== Solution Phase 3: BD 복원, 직각 EDB, 삼각형 채움, 이동 + dimBE 위로 =====
        animator.registerPhase('solution3', [
            { id: 'segBD', animate: { mode: 'draw', duration: 0.7 } },
            { id: 'rightEDB', object: new XRightAngle(p, E, D, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            {
                group: [
                    { id: 'fillAEC', object: new XPolygon(p, [A, E, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillBED', object: new XPolygon(p, [B, E, D], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'fillAEC', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'fillBED', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'dimBE', setFrameCallbackFactory: () => createOffsetSlider(10, 1.2) }
                ],
                parallel: true
            }
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

    p.draw = function () {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1); // 수학 좌표계 (y축 위로)
        animator.updateAndDraw();
        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
