import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XCircle,
    XSegmentMarker, XDimension, XAngleMarker, XText
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, P, O_circ;
    let R_circ;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 (animation.md 기준, ×2 스케일)
        A = p.createVector(0, Math.sqrt(11));
        B = p.createVector(-5, 0);
        D = p.createVector(5, 0);
        P = p.createVector(1, 0);  // 대각선 교점

        // 외접원 중심: A,B,D 공통 외심
        // y0: A,B 등거리 → -2√11·y0 = 14 → y0 = -7/√11
        const y0 = -7 / Math.sqrt(11);
        O_circ = p.createVector(0, y0);
        R_circ = 18 / Math.sqrt(11);

        // C: 직선 AP와 외접원의 교점 (A 제외), t=3에서 C=(3, -2√11)
        C = p.createVector(3, -2 * Math.sqrt(11));

        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size, 50);

        const t = p.theme;

        // XDimension offset 슬라이더: from → to 를 dur 초 동안 애니메이션
        const createOffsetSlider = (from, to, dur) => {
            let elapsed = 0, lastTime = null;
            return (obj) => {
                const now = performance.now();
                if (!lastTime) lastTime = now;
                elapsed += (now - lastTime) / 1000;
                lastTime = now;
                const progress = Math.min(elapsed / dur, 1);
                obj.offset = from + (to - from) * progress;
                if (elapsed >= dur) obj.frameCallback = null;
            };
        };

        // ===== 문제 Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'circO', object: XCircle(p, O_circ, R_circ), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dy: -12 }),        animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -15 }),        animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 12, dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptD', object: new XPoint(p, D, 'D', { dx: 12 }),         animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { delay: 0.7 },
            {
                group: [
                    { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.3 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
        ]);

        // ===== 문제 Phase 2 =====
        animator.registerPhase('problem2', [
            // XSegmentMarker AB[1], AD[1] || XDims AB[$3$,down], AD[$3$,up]
            {
                group: [
                    { id: 'markAB', object: new XSegmentMarker(p, A, B, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markAD', object: new XSegmentMarker(p, A, D, { mark: 1 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'dimAB', object: new XDimension(p, A, B, '3', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'dimAD', object: new XDimension(p, A, D, '3', { offset: 10,  useTex: true }), animate: { mode: 'draw', duration: 1.3 } },
                ],
                parallel: true
            },
            { delay: 0.4 },
            { id: 'dimBD', object: new XDimension(p, B, D, '5', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.4 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'dimBC', object: new XDimension(p, B, C, '3k', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'dimCD', object: new XDimension(p, C, D, '2k', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.3 } },
                ],
                parallel: true
            },
        ]);

        // ===== 풀이 Phase 1 =====
        animator.registerPhase('solution1', [
            // fade [XDims BD,BC,CD] || pulse [XDims AB,AD]
            //   after 1s: draw angles DCA, ACB with markc
            {
                group: [
                    { action: 'fade', targets: ['dimBD', 'dimBC', 'dimCD'], opacity: 0.2, duration: 0.6 },
                    { id: 'dimAB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'dimAD', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            {
                                group: [
                                    { id: 'angleDCA', object: new XAngleMarker(p, D, C, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                                ],
                                parallel: true
                            },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { delay: 0.7 },
            // move dimBD[up] || XDims BP[$3$,down], PD[$2$,down] || text[...,upper left]
            {
                group: [
                    { id: 'dimBD', setFrameCallbackFactory: () => createOffsetSlider(-10, 10, 0.5) },
                    { id: 'dimBP', object: new XDimension(p, B, P, '3', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimPD', object: new XDimension(p, P, D, '2', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'textMethod', object: new XText(p, [20, 25], '스튜어트 정리 or 이등분선 길이 공식', { fontSize: 14, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.7 } },
                ],
                parallel: true
            },
            // XDims AP[$\sqrt{3}$, up]
            { id: 'dimAP', object: new XDimension(p, A, P, '\\sqrt{3}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.5 },
        ]);

        // ===== 풀이 Phase 2 =====
        animator.registerPhase('solution2', [
            // filldraw triangles ABP, DCP
            {
                group: [
                    { id: 'fillABP', object: new XPolygon(p, [A, B, P], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.4 } },
                    { id: 'fillDCP', object: new XPolygon(p, [D, C, P], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.4 } },
                ],
                parallel: true
            },
            // pulse ABP, DCP
            {
                group: [
                    { id: 'fillABP', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'fillDCP', animate: { mode: 'pulse', duration: 1.5 } },
                ],
                parallel: true
            },
            // text 비례식
            { id: 'textProp1', object: new XText(p, [20, 50], '\\overline{AP}:\\overline{BP}=\\overline{DP}:\\overline{CP}', { useTex: true, fontSize: 14, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'textProp2', object: new XText(p, [20, 82], '\\sqrt{3}:3=2:\\overline{PC}', { useTex: true, fontSize: 14, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.5 },
        ]);

        const phaseMap = {
            problem:  { 1: 'problem1', 2: 'problem2' },
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
