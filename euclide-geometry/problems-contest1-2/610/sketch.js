import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getCircumcenter, circleLineIntersection } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XDimension, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, K;
    let circumDEF, circumRadiusDEF;
    let animator;

    // 텍스트 오버레이 헬퍼
    const createTextDisplay = (text, yOffset = 20) => ({
        visible: true,
        progress: 1,
        mode: 'default',
        text: text,
        yOffset: yOffset,
        render: function() {
            if (!this.visible) return;
            p.push();
            p.resetMatrix();
            p.fill(p.theme.text || 0);
            p.noStroke();
            p.textSize(16);
            p.textAlign(p.LEFT, p.TOP);
            p.text(this.text, 20, this.yOffset);
            p.pop();
        }
    });

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        // B(-4.5, 0), C(4.5, 0) - BC = 9
        B = p.createVector(-4.5, 0);
        C = p.createVector(4.5, 0);

        // A 계산: AB = 8, AC = 10
        // |AB|² = (x + 4.5)² + y² = 64
        // |AC|² = (x - 4.5)² + y² = 100
        // 연립하면 x = -2, y = √57.75
        const Ax = -2;
        const Ay = Math.sqrt(57.75);
        A = p.createVector(Ax, Ay);

        // D: BC 위의 점, BD = 4
        // B에서 C 방향으로 4만큼
        D = p.createVector(B.x + 4, 0);

        // E: AB의 중점
        E = p5.Vector.lerp(A, B, 0.5);

        // F: AC의 중점
        F = p5.Vector.lerp(A, C, 0.5);

        // DEF의 외접원
        circumDEF = getCircumcenter(D, E, F);
        circumRadiusDEF = p5.Vector.dist(circumDEF, D);

        // K: DEF 외접원과 AD의 교점 (D가 아닌 점)
        const intersections = circleLineIntersection(circumDEF, circumRadiusDEF, A, D);
        // D가 아닌 교점 선택
        if (intersections.length >= 2) {
            const d0 = p5.Vector.dist(intersections[0], D);
            const d1 = p5.Vector.dist(intersections[1], D);
            K = d0 > 0.01 ? intersections[0] : intersections[1];
        } else if (intersections.length === 1) {
            K = intersections[0];
        } else {
            K = p5.Vector.lerp(A, D, 0.5); // fallback
        }

        // 중심점 (레이블 자동 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            // 삼각형 ABC 그리기
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.7 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // XDimension AB[8], AC[10]
            {
                group: [
                    { id: 'dimAB', object: new XDimension(p, A, B, '8', { offset: -15 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'dimAC', object: new XDimension(p, A, C, '10', { offset: 15 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // AD 그리기
            { id: 'AD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            // D 표시 및 BD, DC 치수
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'dimBD', object: new XDimension(p, B, D, '4', { offset: -12 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'dimDC', object: new XDimension(p, D, C, '5', { offset: -12 }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            // E, F 표시
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // DEF 외접원
            { id: 'circumDEF', object: XCircle(p, circumDEF, circumRadiusDEF), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            // K 표시
            { id: 'pointK', object: new XPoint(p, K, 'K', { dx: 15, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            // 각 DAC, BAD with markc
            {
                group: [
                    { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { arcSize: 25, marker: 'c' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { arcSize: 30, marker: 'c' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // fade AD, DAC, BAD
            { action: 'fade', targets: ['AD', 'angleDAC', 'angleBAD'], opacity: 0.3, duration: 0.5 },
            { delay: 0.3 },
            // 삼각형 DEF bright cyan
            { id: 'triDEF', object: new XPolygon(p, [D, E, F], { color: '#00FFFF' }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.5 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // BE, BD 선분 그리기 (pulse with mark)
            {
                group: [
                    { id: 'segBE', object: XSegment(p, B, E, { color: '#00FF00' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segBD', object: XSegment(p, B, D, { color: '#00FF00' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markBE', object: new XSegmentMarker(p, B, E, { count: 2 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markBD', object: new XSegmentMarker(p, B, D, { count: 2 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 각 BED, EDB with markt
            {
                group: [
                    { id: 'angleBED', object: new XAngleMarker(p, B, E, D, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleEDB', object: new XAngleMarker(p, E, D, B, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 각 DEF with markt
            { id: 'angleDEF', object: new XAngleMarker(p, D, E, F, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 3 =====
        animator.registerPhase('solution3', [
            // hide BE, BD || CF, CD 선분 (purple)
            {
                group: [
                    { action: 'fade', targets: ['segBE', 'segBD', 'markBE', 'markBD'], opacity: 0, duration: 0.5 },
                    { id: 'segCF', object: XSegment(p, C, F, { color: '#9900FF' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segCD', object: XSegment(p, C, D, { color: '#9900FF' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markCF', object: new XSegmentMarker(p, C, F, { count: 3 }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'markCD', object: new XSegmentMarker(p, C, D, { count: 3 }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 각 DFC, CDF with star
            {
                group: [
                    { id: 'angleDFC', object: new XAngleMarker(p, D, F, C, { arcSize: 25, marker: 'star' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCDF', object: new XAngleMarker(p, C, D, F, { arcSize: 25, marker: 'star' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 각 EFD with star
            { id: 'angleEFD', object: new XAngleMarker(p, E, F, D, { arcSize: 30, marker: 'star' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 4 =====
        animator.registerPhase('solution4', [
            // 텍스트: D는 AEF의 방심
            { id: 'textExcenter', object: createTextDisplay('𝐷 는 △𝐴𝐸𝐹 의 방심', 20), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.5 },
            // pulse 외접원 DEF, point K
            {
                group: [
                    { id: 'circumDEF', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'pointK', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 텍스트: K는 AEF의 내심
            { id: 'textIncenter', object: createTextDisplay('𝐾 는 △𝐴𝐸𝐹 의 내심', 45), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // phaseMap 설정
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

        // 애니메이션 시작
        animator.playSequence(['problem1', 'problem2']);
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
