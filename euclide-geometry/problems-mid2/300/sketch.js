import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XSegmentMarker, XText
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let A, B, C, D, E, F;
    let animator;
    let size;

    p.setup = function () {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점: 평행사변형 ABCD, 중심=원점
        A = p.createVector(-3.6, -1.5);
        B = p.createVector(2.4, -1.5);
        C = p.createVector(3.6, 1.5);
        D = p.createVector(-2.4, 1.5);

        // E: DC의 3:2 내분점
        E = p5.Vector.add(D, p5.Vector.sub(C, D).mult(3 / 5));
        // F: 직선 AE와 직선 BC의 교점
        F = p.createVector(4.4, 3.5);

        const center = p.createVector(0, 0);

        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size, 50);

        // 꼭짓점 모핑 헬퍼
        const createVertexMorphFactory = (vertexIndex, target, duration) => {
            return () => {
                let elapsed = 0, lastTime = null, startPos = null;
                return (obj) => {
                    const now = performance.now();
                    if (!lastTime) { lastTime = now; startPos = obj.vertices[vertexIndex].copy(); }
                    elapsed += (now - lastTime) / 1000;
                    lastTime = now;
                    const t = Math.min(1, elapsed / duration);
                    obj.vertices[vertexIndex].x = startPos.x + (target.x - startPos.x) * t;
                    obj.vertices[vertexIndex].y = startPos.y + (target.y - startPos.y) * t;
                    obj._perimeterDirty = true;
                    if (t >= 1) obj.frameCallback = null;
                };
            };
        };

        // clone ACD → AFD: 복제 꼭짓점
        const dA = A.copy(), dC = C.copy(), dD = D.copy();

        // ── Problem Phase 1 ──
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
        ]);

        // ── Problem Phase 2 ──
        animator.registerPhase('problem2', [
            {
                group: [
                    { action: 'addToBounds', points: [F], duration: 1.0 },
                    { id: 'segCF', object: XSegment(p, C, F, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segAF', object: XSegment(p, A, F), animate: { mode: 'draw', duration: 1.2 } },
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptE', object: new XPoint(p, E, 'E', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptF', object: new XPoint(p, F, 'F', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'fillDEF', object: new XPolygon(p, [D, E, F], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'fillBCE', object: new XPolygon(p, [B, C, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.3 } },
                ],
                parallel: true
            },
        ]);

        // ── Solution Phase 1 ──
        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'segDC_g', object: XSegment(p, D, C, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.1 } },
                    { id: 'segAB_g', object: XSegment(p, A, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.1 } },
                    { id: 'markDC', object: new XSegmentMarker(p, D, C, { mark: 2, type: 'arrow' }), animate: { mode: 'draw', duration: 1.1 } },
                    { id: 'markAB', object: new XSegmentMarker(p, A, B, { mark: 2, type: 'arrow' }), animate: { mode: 'draw', duration: 1.1 } },
                ],
                parallel: true
            },
            // BCE → ACE: 꼭짓점 B(index 0)를 A로 이동
            { id: 'fillBCE', setFrameCallbackFactory: createVertexMorphFactory(0, A, 1.2) },
            { delay: 1.2 },
            // 모핑 완료 후 정적 객체로 교체 (phase 전환 시 반복 방지)
            { id: 'fillBCE', action: 'remove' },
            { id: 'fillACE', object: new XPolygon(p, [A, C, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), action: 'show' },
            { delay: 1.0 },
        ]);

        // ── Solution Phase 2 ──
        const bgc = p.color(p.theme.background);
        const bgColor = [p.red(bgc), p.green(bgc), p.blue(bgc), 255];

        animator.registerPhase('solution2', [
            // hide green segments & marks
            { action: 'fade', targets: ['segDC_g', 'segAB_g', 'markDC', 'markAB'], opacity: 0, duration: 0.5 },
            // draw triangle ACD green
            { id: 'triACD', object: new XPolygon(p, [A, C, D], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.2 } },
            // clone ACD → AFD || text
            {
                group: [
                    {
                        group: [
                            { id: '_acd_tri', object: new XPolygon(p, [dA, dC, dD], { color: COLORS.green }), action: 'show' },
                            { id: '_acd_tri', setFrameCallbackFactory: createVertexMorphFactory(1, F, 1.5) },
                        ],
                        parallel: false
                    },
                    { id: 'text1', object: new XText(p, [20, 25], '|\\triangle ACD| = |\\triangle AFD|',
                        { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                      animate: { mode: 'draw', duration: 1.5 } },
                ],
                parallel: true
            },
            { delay: 1.5 },
            { delay: 1.0 },
            // fill AED with background color (공통부분 제거)
            { id: 'fillAED', object: new XPolygon(p, [A, E, D], { filled: true, fillColor: bgColor }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'text2', object: new XText(p, [20, 50], '|\\triangle ACE| = |\\triangle DEF|',
                { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
              animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.5 },
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
