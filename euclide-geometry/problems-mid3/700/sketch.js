import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XDimension, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기하 설정
        // P = 원점, PA = 5, PB = 20, PC = PD = 10
        // 직선 AB가 x축과 60° 각도 → 두 원의 크기가 달라짐
        const sqrt3 = Math.sqrt(3);
        const P = p.createVector(0, 0);
        const A = p.createVector(2.5, 2.5 * sqrt3);           // (2.5, 4.33)
        const B = p.createVector(10, 10 * sqrt3);             // (10, 17.32)
        const C = p.createVector(-10, 0);
        const D = p.createVector(10, 0);

        // 접선 연장 (양쪽 1.5배씩 → 총 CD의 2배)
        // CD = 20, 양쪽 10씩 연장 → 총 40
        const Cext = p.createVector(C.x - 10, 0);
        const Dext = p.createVector(D.x + 10, 0);

        // 원의 중심과 반지름 (서로 다른 크기)
        const O1 = p.createVector(-10, 35 * sqrt3 / 3);       // (-10, 20.21)
        const r1 = 35 * sqrt3 / 3;                            // ≈ 20.21
        const O2 = p.createVector(10, 5 * sqrt3);             // (10, 8.66)
        const r2 = 5 * sqrt3;                                 // ≈ 8.66

        // 뷰포트용 점들
        const viewportPoints = [
            p.createVector(-32, -5),
            p.createVector(22, -5),
            p.createVector(-32, 42),
            p.createVector(22, 42)
        ];

        // 라벨 배치용 중심 (뷰포트 중심)
        const center = p.createVector(-5, 18.5);

        animator = new XAnimator(p);
        animator.initViewport(viewportPoints, size, 30);

        const t = p.theme;
        const green = COLORS.green;
        const pink = COLORS.pink;

        // 텍스트 오버레이 헬퍼
        const createTextDisplay = (text, yOffset = 20) => ({
            visible: true,
            progress: 1,
            mode: 'default',
            opacity: 1,
            text: text,
            yOffset: yOffset,
            render: function() {
                if (!this.visible || this.opacity <= 0) return;
                p.push();
                p.resetMatrix();
                p.fill(p.red(p.theme.text || 0), p.green(p.theme.text || 0), p.blue(p.theme.text || 0), 255 * this.opacity);
                p.noStroke();
                p.textSize(16);
                p.textAlign(p.LEFT, p.TOP);
                p.text(this.text, 20, this.yOffset);
                p.pop();
            },
            reset: function() { this.visible = true; this.opacity = 1; }
        });

        // ===== Problem Phase 1: 두 원 + 접선 =====
        animator.registerPhase('problem1', [
            { id: 'circle1', object: XCircle(p, O1, r1, { startPoint: C }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'circle2', object: XCircle(p, O2, r2, { startPoint: D }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            { id: 'tangentCD', object: XSegment(p, Cext, Dext), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Problem Phase 2: 교점 P =====
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'segBP', object: XSegment(p, B, P), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'pointP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: 원 O₁에 대한 방멱 =====
        animator.registerPhase('solution1', [
            { id: 'segPC', object: XSegment(p, P, C, { color: green, weight: 2 }), animate: { mode: 'draw', duration: 0.5 } },
            {
                group: [
                    { id: 'segPA', object: XSegment(p, P, A, { color: green, weight: 2 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'segPB', object: XSegment(p, P, B, { color: green, weight: 2 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { id: 'circle1', animate: { mode: 'pulse', duration: 1.0 } },
            { id: 'text1', object: createTextDisplay('PC² = PA · PB', 20), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 2: 원 O₂에 대한 방멱 =====
        animator.registerPhase('solution2', [
            { id: 'circle1', set: { opacity: 0.3 }, duration: 0.7 },
            { id: 'segPD', object: XSegment(p, P, D, { color: pink, weight: 2 }), animate: { mode: 'draw', duration: 0.5 } },
            { id: 'circle2', animate: { mode: 'pulse', duration: 1.0 } },
            { id: 'text2', object: createTextDisplay('PD² = PA · PB', 45), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            { id: 'segPD', animate: { mode: 'draw', duration: 0.7, color: green } }
        ]);

        // ===== Solution Phase 3: PC = PD 결론 + PA = 5 =====
        animator.registerPhase('solution3', [
            { action: 'fadeAll', opacity: 0.2, exclude: ['pointP', 'pointC', 'pointD', 'tangentCD', 'segPC', 'segPD'], duration: 0.5 },
            {
                group: [
                    { id: 'dimPC', object: new XDimension(p, C, P, '10', { offset: -15 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'dimPD', object: new XDimension(p, P, D, '10', { offset: -15 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markCP', object: new XSegmentMarker(p, C, P, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'markPD', object: new XSegmentMarker(p, P, D, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 },
            { action: 'fadeAll', opacity: 1.0, duration: 0.5 },
            { id: 'dimPA', object: new XDimension(p, P, A, '5', { offset: 15 }), animate: { mode: 'draw', duration: 0.7 } },
            {
                group: [
                    { id: 'pointP', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'pointA', animate: { mode: 'pulse', duration: 1.0 } }
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
