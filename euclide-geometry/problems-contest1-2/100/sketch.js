import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XObject, XPolygon, XSegment, XPoint, XAngleMarker,
    XCircle, XDimension, XRightAngle, XText
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let A, B, C, D, E, O;
    let animator;
    let size;

    p.setup = function () {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점
        O = p.createVector(0, 0);
        const r = 3;
        A = p.createVector(r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6)); // 3:30°
        C = p.createVector(0, -r);   // 3:-90°
        D = p.createVector(6, -3);

        // B: 원 O(반지름 3) 위, |BD|=8 → 두 원의 교점에서 볼록사각형 조건 만족 해
        // 45x² + 60x - 56 = 0 (radical axis 대입)
        const discB = Math.sqrt(60 * 60 + 4 * 45 * 56);
        const xB = (-60 - discB) / (2 * 45); // 아래쪽 교점
        B = p.createVector(xB, (5 + 6 * xB) / 3);

        // E: 선분 BD와 원 O의 교점 (B 아님)
        // |B + t*(D-B)|² = 9 → t = -2B·(D-B)/|D-B|²
        const dir = p5.Vector.sub(D, B);
        const tE = -2 * B.dot(dir) / dir.magSq();
        E = p5.Vector.add(B, p5.Vector.mult(dir, tE));

        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D, E], size, 50);

        // 선분 끝점에 따라가는 lead circle 생성 헬퍼
        const makeDot = (start, end, segId) => {
            const dot = new XObject(p, {});
            dot.render = function () {
                if (!this.visible) return;
                const seg = animator.get(segId);
                // closed 2-vertex polygon: perimeter=2|AB|, A→B 구간은 progress 0→0.5
                if (!seg || seg.progress <= 0 || seg.progress >= 0.5) return;
                const t = seg.progress * 2; // [0, 0.5] → [0, 1]
                const wx = start.x + t * (end.x - start.x);
                const wy = start.y + t * (end.y - start.y);
                p.push();
                p.noStroke();
                p.fill(0, 255, 0);
                p.circle(p.tx({ x: wx, y: wy }), p.ty({ x: wx, y: wy }), 10);
                p.pop();
            };
            return dot;
        };

        // ── Problem Phase 1 ──
        animator.registerPhase('problem1', [
            { id: 'polyABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.3 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { dx: -12, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptD', object: new XPoint(p, D, 'D', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                ],
                parallel: true
            },
            { id: 'dimCD', object: new XDimension(p, C, D, '6', { offset: -10 }), animate: { mode: 'draw', duration: 1.3 } },
            { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'dimBD', object: new XDimension(p, B, D, '8', { offset: -10 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.5 },
        ]);

        // ── Problem Phase 2 ──
        animator.registerPhase('problem2', [
            { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { marker: '60°' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 0.7 },
            { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 1.1 } },
            { id: 'angleDCA', object: new XAngleMarker(p, D, C, A, { marker: '60°' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 0.7 },
            { id: 'polyAEC', object: new XPolygon(p, [A, E, C], { closed: false }), animate: { mode: 'draw', duration: 1.4 } },
            { id: 'angleAEC', object: new XAngleMarker(p, A, E, C, { marker: '120°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 },
        ]);

        // ── Solution Phase 1 ──
        animator.registerPhase('solution1', [
            {
                group: [
                    { action: 'fade', targets: ['angleCBA', 'angleDCA', 'angleAEC'], opacity: 0.2, duration: 0.5 },
                    { action: 'fade', targets: ['dimCD', 'dimBD'], opacity: 0.2, duration: 0.5 },
                ],
                parallel: true
            },
            {
                group: [
                    // pulse angleCBA, angleAEC (3.0s)
                    {
                        group: [
                            { id: 'angleCBA', animate: { mode: 'pulse', duration: 3.0 } },
                            { id: 'angleAEC', animate: { mode: 'pulse', duration: 3.0 } },
                        ],
                        parallel: true
                    },
                    // after 1초: 원 O 그리기 (2.0s)
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'circO', object: XCircle(p, O, r, { startPoint: A }), animate: { mode: 'draw', duration: 2.0 } },
                        ],
                        parallel: false
                    },
                ],
                parallel: true
            },
            { id: 'segOC', object: XSegment(p, O, C, { weight: 1, dashed: true }), animate: { mode: 'draw', duration: 0.9 } },
            // 직각 표시 후 fade
            { id: 'rightDCO', object: new XRightAngle(p, D, C, O, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.6 } },
            { id: 'rightDCO', action: 'fade', opacity: 0.2, duration: 0.2 },
            { delay: 1.5 },
        ]);

        // ── Solution Phase 2 ──
        animator.registerPhase('solution2', [
            {
                id: 'textFormula',
                object: new XText(p, [20, 25], '\\overline{CD}^2 = \\overline{BD} \\cdot \\overline{ED}',
                    { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                animate: { mode: 'draw', duration: 1.5 }
            },
            // CD 초록 두 번 (지우고 다시 그리기) — 굵은 선 + lead circle
            {
                group: [
                    { id: 'segCD_g1', object: XSegment(p, C, D, { color: COLORS.green, weight: 3 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'dotCD_g1', object: makeDot(C, D, 'segCD_g1'), animate: { mode: 'draw', duration: 0 } },
                ],
                parallel: true
            },
            { id: 'segCD_g1', action: 'remove' },
            { id: 'dotCD_g1', action: 'remove' },
            {
                group: [
                    { id: 'segCD_g2', object: XSegment(p, C, D, { color: COLORS.green, weight: 3 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'dotCD_g2', object: makeDot(C, D, 'segCD_g2'), animate: { mode: 'draw', duration: 0 } },
                ],
                parallel: true
            },
            { id: 'dotCD_g2', action: 'remove' },
            // DE 초록
            {
                group: [
                    { id: 'segDE_g', object: XSegment(p, D, E, { color: COLORS.green, weight: 3 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'dotDE_g', object: makeDot(D, E, 'segDE_g'), animate: { mode: 'draw', duration: 0 } },
                ],
                parallel: true
            },
            { id: 'dotDE_g', action: 'remove' },
            // DE 숨기면서 동시에 DB 초록 그리기
            {
                group: [
                    { id: 'segDE_g', action: 'hide', duration: 0.2 },
                    {
                        group: [
                            { id: 'segDB_g', object: XSegment(p, D, B, { color: COLORS.green, weight: 3 }), animate: { mode: 'draw', duration: 1.4 } },
                            { id: 'dotDB_g', object: makeDot(D, B, 'segDB_g'), animate: { mode: 'draw', duration: 0 } },
                        ],
                        parallel: true
                    },
                ],
                parallel: true
            },
            { id: 'dotDB_g', action: 'remove' },
            { delay: 2.0 },
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
