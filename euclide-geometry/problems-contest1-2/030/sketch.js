import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getCircumcenter, circleLineIntersection, intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XRightAngle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let O, A, B, C, X, D, E, H, P, Q;
    let animator;
    const R = 3;  // 원 O의 반지름

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의 (원 O 위의 점들)
        O = p.createVector(0, 0);
        A = p.createVector(R * Math.cos(111 * Math.PI / 180), R * Math.sin(111 * Math.PI / 180));
        B = p.createVector(R * Math.cos(-128 * Math.PI / 180), R * Math.sin(-128 * Math.PI / 180));
        C = p.createVector(R * Math.cos(-52 * Math.PI / 180), R * Math.sin(-52 * Math.PI / 180));

        // X: 삼각형 BCO의 외심
        X = getCircumcenter(B, C, O);
        const omegaR = p5.Vector.dist(X, O);

        // D: 선분 AB와 원 Ω의 교점 (B가 아닌 점)
        const intersectionsAB = circleLineIntersection(X, omegaR, A, B);
        D = intersectionsAB.find(pt => p5.Vector.dist(pt, B) > 0.1) || intersectionsAB[0];

        // E: 선분 AC와 원 Ω의 교점 (C가 아닌 점)
        const intersectionsAC = circleLineIntersection(X, omegaR, A, C);
        E = intersectionsAC.find(pt => p5.Vector.dist(pt, C) > 0.1) || intersectionsAC[0];

        // H: BC의 중점
        H = p5.Vector.add(B, C).mult(0.5);

        // P: 직선 DO와 AC의 교점
        P = intersectLines(D, O, A, C);

        // Q: 직선 EO와 AB의 교점
        Q = intersectLines(E, O, A, B);

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D, E], size, 60);

        // 텍스트 오버레이 헬퍼
        const createTextDisplay = (text, xOffset = 20, yOffset = 20) => ({
            visible: true,
            progress: 1,
            mode: 'default',
            opacity: 1,
            text: text,
            xOffset: xOffset,
            yOffset: yOffset,
            render: function() {
                if (!this.visible || this.opacity <= 0) return;
                p.push();
                p.resetMatrix();
                const c = p.color(p.theme.text || '#FFFFFF');
                p.fill(p.red(c), p.green(c), p.blue(c), this.opacity * 255);
                p.noStroke();
                p.textSize(16);
                p.textAlign(p.LEFT, p.TOP);
                p.text(this.text, this.xOffset, this.yOffset);
                p.pop();
            }
        });

        // 테마 색상
        const t = p.theme;
        const fillBlue = t.fillBlue || [137, 180, 250, 80];
        const fillRed = t.fillRed || [243, 139, 168, 80];

        // 색상 전환 헬퍼
        const createColorFader = (targetColor, duration) => {
            let elapsed = 0, lastTime = null, startColor = null;
            return (obj) => {
                if (!startColor) startColor = [...obj.style.strokeColor];
                const now = performance.now();
                if (!lastTime) lastTime = now;
                elapsed += (now - lastTime) / 1000;
                lastTime = now;
                const progress = Math.min(1, elapsed / duration);
                const r = startColor[0] + (targetColor[0] - startColor[0]) * progress;
                const g = startColor[1] + (targetColor[1] - startColor[1]) * progress;
                const b = startColor[2] + (targetColor[2] - startColor[2]) * progress;
                obj.style.strokeColor = [r, g, b, 255];
                if (progress >= 1) obj.frameCallback = null;
            };
        };

        // ===== Problem Phases =====

        // Phase 1: 기본 원과 점들
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointO', object: new XPoint(p, O, 'O', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'circleO', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Phase 2: 삼각형 OBC의 외접원 Ω와 D, E, 선분 DP, EQ
        animator.registerPhase('problem2', [
            { id: 'circleOmega', object: XCircle(p, X, omegaR, { color: p.theme.auxiliary || [100, 150, 255] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dx: -12, dy: 0 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 12, dy: 0 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'segDP', object: XSegment(p, D, P, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segEQ', object: XSegment(p, E, Q, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: circleO 색상 변경, OB/OC green, poly B->A->C, pulse
        animator.registerPhase('solution1', [
            { id: 'circleO', setFrameCallbackFactory: () => createColorFader([0, 255, 0], 0.8) },
            { delay: 0.8 },
            {
                group: [
                    { id: 'segOB', object: XSegment(p, O, B, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segOC', object: XSegment(p, O, C, { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'polyBAC', object: new XPolygon(p, [B, A, C], { color: COLORS.green, closed: false }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'circleO', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'polyBAC', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segOB', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segOC', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'segOH', object: XSegment(p, O, H), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'pointH', object: new XPoint(p, H, 'H', { dx: 0, dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightCHO', object: new XRightAngle(p, C, H, O, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            {
                group: [
                    { id: 'angleBAC', object: new XAngleMarker(p, B, A, C, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleHOC', object: new XAngleMarker(p, H, O, C, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBOH', object: new XAngleMarker(p, B, O, H, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // Solution Phase 2: hide circleO/polyBAC, OB/OC 색상 복구, pulse ODBC, Ω
        animator.registerPhase('solution2', [
            {
                group: [
                    { id: 'circleO', action: 'hide', duration: 0.7 },
                    { id: 'polyBAC', action: 'hide', duration: 0.7 },
                    { id: 'segOB', setFrameCallbackFactory: () => createColorFader([255, 255, 255], 0.7) },
                    { id: 'segOC', setFrameCallbackFactory: () => createColorFader([255, 255, 255], 0.7) }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'polyODBC', object: new XPolygon(p, [O, D, B, C]), animate: { mode: 'draw', duration: 0 } },
            {
                group: [
                    { id: 'polyODBC', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'circleOmega', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleODA', object: new XAngleMarker(p, O, D, A, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'angleOCH', object: new XAngleMarker(p, O, C, H, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'textInfo', object: createTextDisplay('내접사각형의 대외각', 20, 20), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 },
            {
                group: [
                    { id: 'triADP', object: new XPolygon(p, [A, D, P], { filled: true, fillColor: [...fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triOCH', object: new XPolygon(p, [O, C, H], { filled: true, fillColor: [...fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triADP', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triOCH', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'rightCHO', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'rightAPD', object: new XRightAngle(p, A, P, D, 15, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } }
                        ]
                    }
                ],
                parallel: true
            },
            { id: 'pointP', object: new XPoint(p, P, 'P', { dx: 12, dy: 0 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 3.0 }
        ]);

        // Solution Phase 3: 삼각형 AEQ ≅ OBH
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 'triADP', action: 'hide', duration: 1.0 },
                    { id: 'triOCH', action: 'hide', duration: 1.0 },
                    { action: 'fade', targets: ['rightAPD'], opacity: 0.3, duration: 1.0 },
                    { id: 'angleODA', action: 'hide', duration: 1.0 },
                    { id: 'angleOCH', action: 'hide', duration: 1.0 },
                    { id: 'polyODBC', action: 'hide', duration: 1.0 }
                ],
                parallel: true
            },
            { id: 'polyOBCE', object: new XPolygon(p, [O, B, C, E]), animate: { mode: 'draw', duration: 0 } },
            {
                group: [
                    { id: 'polyOBCE', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'circleOmega', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleHBO', object: new XAngleMarker(p, H, B, O, { arcSize: 25, marker: 'star' }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'angleAEQ', object: new XAngleMarker(p, A, E, Q, { arcSize: 25, marker: 'star' }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 2.0 },
            {
                group: [
                    { id: 'triAEQ', object: new XPolygon(p, [A, E, Q], { filled: true, fillColor: [...fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triOBH', object: new XPolygon(p, [O, B, H], { filled: true, fillColor: [...fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triAEQ', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triOBH', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'rightCHO', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'rightEQA', object: new XRightAngle(p, E, Q, A, 15, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } }
                        ]
                    }
                ],
                parallel: true
            },
            { id: 'pointQ', object: new XPoint(p, Q, 'Q', { dx: -12, dy: 8 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 3.0 }
        ]);

        // Solution Phase 4: fade all except text, draw triangle ADE green, draw segments DP, EQ green
        const greenColor = t.highlight || '#22d3ee';
        animator.registerPhase('solution4', [
            // textInfo, rightEQA를 제외한 모든 객체 fade
            { action: 'fadeAll', opacity: 0.2, duration: 0.5, exclude: ['textInfo', 'pointA', 'pointQ', 'pointD', 'pointO', 'pointE', 'pointP', 'rightEQA'] },
            // triAEQ, triOBH 숨기기 + 직각 APD 복구
            {
                group: [
                    { id: 'triAEQ', action: 'hide' },
                    { id: 'triOBH', action: 'hide' },
                    { id: 'rightAPD', set: { opacity: 1 } }
                ],
                parallel: true
            },
            // draw triangle ADE green || draw segments DP, EQ green (병렬)
            {
                group: [
                    { id: 'triADE', object: new XPolygon(p, [A, D, E], { color: greenColor }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segDP2', object: XSegment(p, D, P, { color: greenColor, weight: 1.5 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segEQ2', object: XSegment(p, E, Q, { color: greenColor, weight: 1.5 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 3.0 }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3', 4: 'solution4' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 4
        });
    };

    p.draw = function () {
        p.background(p.theme.background);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);

        if (animator) {
            animator.updateAndDraw();
        }

        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
