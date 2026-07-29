import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XDimension, XAngleMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, P;
    let O1, O2, r1, r2;
    let animator;
    let center;

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

    // offset 슬라이더 헬퍼
    const createOffsetSlider = (from, to, dur) => {
        let elapsed = 0, lastTime = null;
        return (obj) => {
            const now = performance.now();
            if (!lastTime) lastTime = now;
            elapsed += (now - lastTime) / 1000;
            lastTime = now;
            obj.offset = from + (to - from) * Math.min(1, elapsed / dur);
            if (elapsed >= dur) obj.frameCallback = null;
        };
    };

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점 B, D
        B = p.createVector(-2.5, 0);
        D = p.createVector(2.5, 0);

        // A: |AB| = 3.5, |AD| = 2, y > 0
        const Ax = 0.825;
        const Ay = Math.sqrt(4 - Math.pow(Ax - 2.5, 2));
        A = p.createVector(Ax, Ay);

        // C: |BC| = 7, |CD| = 4, y < 0
        const Cx = 3.3;
        const Cy = -Math.sqrt(16 - Math.pow(Cx - 2.5, 2));
        C = p.createVector(Cx, Cy);

        // 뷰포트 중심 계산
        center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        // 외심 계산
        O1 = getCircumcenter(A, B, D);
        O2 = getCircumcenter(B, C, D);
        r1 = p.dist(O1.x, O1.y, A.x, A.y);
        r2 = p.dist(O2.x, O2.y, B.x, B.y);

        // 접선 계산: A에서 O1의 접선 방향
        const tangentDirA = p.createVector(-(A.y - O1.y), A.x - O1.x).normalize();

        // P: 두 접선의 교점 (직선 BD 위)
        const tA = -A.y / tangentDirA.y;
        P = p5.Vector.add(A, p5.Vector.mult(tangentDirA, tA));

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size, 50);

        // ===== Problem Phase 1: 사각형 ABCD와 두 외접원 =====
        animator.registerPhase('problem1', [
            { id: 'quadABCD', object: new XPolygon(p, [A, B, C, D]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'circleO1', object: XCircle(p, O1, r1), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 1.0 },
            {
                group: [
                    { action: 'fade', targets: ['circleO1'], opacity: 0.2, duration: 0.8 },
                    { id: 'circleO2', object: XCircle(p, O2, r2, { color: '#FFFF00' }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Problem Phase 2: 접선과 교점 P =====
        const extendA = p5.Vector.add(A, p5.Vector.mult(p5.Vector.sub(A, P), 0.2));
        const extendC = p5.Vector.add(C, p5.Vector.mult(p5.Vector.sub(C, P), 0.2));

        animator.registerPhase('problem2', [
            {
                group: [
                    { action: 'addToBounds', points: [P], duration: 1.5 },
                    { id: 'segPB', object: XSegment(p, P, B, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segPA', object: XSegment(p, P, A), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segPC', object: XSegment(p, P, C), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'lineAext', object: XSegment(p, A, extendA), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'lineCext', object: XSegment(p, C, extendC), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { id: 'pointP', object: new XPoint(p, P, 'P', { dx: 0, dy: -15 }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'dimAB', object: new XDimension(p, A, B, '35', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBC', object: new XDimension(p, B, C, 'x', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAD', object: new XDimension(p, A, D, '20', { offset: 12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimCD', object: new XDimension(p, C, D, '40', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1: PA = PC 확인 =====
        animator.registerPhase('solution1', [
            { id: 'text1', object: createTextDisplay('PA = PC', 20), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 2: 원 O1에 대한 방멱 =====
        const t = p.theme;
        const fillColor1 = [...t.fillBlue.slice(0, 3), 60];
        const fillColor2 = [...t.fillRed.slice(0, 3), 60];

        animator.registerPhase('solution2', [
            {
                group: [
                    { action: 'recover', targets: ['circleO1'], duration: 0.8 },
                    { action: 'fade', targets: ['circleO2', 'dimBC', 'dimCD'], opacity: 0.2, duration: 0.8 }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triPDA', object: new XPolygon(p, [P, D, A], { filled: true, fillColor: fillColor1 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'angleDAP', object: new XAngleMarker(p, D, A, P, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triPAB', object: new XPolygon(p, [P, A, B], { filled: true, fillColor: fillColor2 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'anglePBA', object: new XAngleMarker(p, P, B, A, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triPDA', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triPAB', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleDAP', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'anglePBA', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'text2', object: createTextDisplay('PA : AD = PB : AB', 40), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 3: 원 O2에 대한 방멱 =====
        const fillColor3 = [...t.fillBlue.slice(0, 3), 60];
        const fillColor4 = [...t.fillRed.slice(0, 3), 60];

        animator.registerPhase('solution3', [
            {
                group: [
                    { action: 'recover', targets: ['circleO2', 'dimBC', 'dimCD'], duration: 0.8 },
                    { action: 'fade', targets: ['circleO1', 'dimAB', 'dimAD'], opacity: 0.2, duration: 0.8 },
                    { id: 'triPAB', action: 'remove' },
                    { id: 'triPDA', action: 'remove' }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimCD', setFrameCallback: createOffsetSlider(-12, 12, 1.2) },
                    { id: 'triPCD', object: new XPolygon(p, [P, C, D], { filled: true, fillColor: fillColor3 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'anglePCD', object: new XAngleMarker(p, P, C, D, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triPBC', object: new XPolygon(p, [P, B, C], { filled: true, fillColor: fillColor4 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triPCD', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triPBC', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'anglePCD', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleCBD', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'text3', object: createTextDisplay('PC : CD = PB : BC', 60), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
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
