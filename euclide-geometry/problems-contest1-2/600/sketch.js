import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, getIncenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, X, I;
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
        // A(0, 2), B(2:170°), C(2:10°) - B, C 극좌표
        A = p.createVector(0, 2);
        B = p.createVector(2 * Math.cos(170 * Math.PI / 180), 2 * Math.sin(170 * Math.PI / 180));
        C = p.createVector(2 * Math.cos(10 * Math.PI / 180), 2 * Math.sin(10 * Math.PI / 180));

        // X: AC를 A 너머로 연장 (A를 기준으로 C 반대 방향)
        const CA = p5.Vector.sub(A, C);
        X = p5.Vector.add(A, p5.Vector.mult(CA, 0.4));  // A + 0.4*(A-C)

        // D 계산: BC 위의 점, ∠ADB = 60° (즉 ∠ADC = 120°)
        const findD = () => {
            for (let t = 0.01; t < 0.99; t += 0.001) {
                const Dt = p5.Vector.lerp(B, C, t);
                const DA = p5.Vector.sub(A, Dt);
                const DB = p5.Vector.sub(B, Dt);
                const angle = Math.abs(DA.angleBetween(DB)) * 180 / Math.PI;
                if (Math.abs(angle - 60) < 0.5) {
                    return Dt;
                }
            }
            return p5.Vector.lerp(B, C, 0.5);
        };
        D = findD();

        // E 계산: AB 위의 점, CE가 각 C의 이등분선 (∠ACE = ∠DCE = 20°)
        const CA_dir = p5.Vector.sub(A, C);
        const CD_dir = p5.Vector.sub(D, C);
        const angleACD = CA_dir.angleBetween(CD_dir);
        const bisectorAngle = CA_dir.heading() + angleACD / 2;
        const bisectorDir = p.createVector(Math.cos(bisectorAngle), Math.sin(bisectorAngle));
        const bisectorEnd = p5.Vector.add(C, p5.Vector.mult(bisectorDir, 10));
        E = intersectLines(C, bisectorEnd, A, B);

        // I: 삼각형 ADC의 내심
        I = getIncenter(A, D, C);

        // 바운딩 박스 중심
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([B, C, X], size, 60);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            // 삼각형 ABC 그리기
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
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
            // AD 그리기
            { id: 'AD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'pointD', object: new XPoint(p, D, 'D', { dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            // 각 CDA = 120°
            { id: 'angleCDA', object: new XAngleMarker(p, C, D, A, { arcSize: 30, marker: '120°' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            // CE 그리기 (각 C의 이등분선)
            { id: 'CE', object: XSegment(p, C, E), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            { id: 'pointE', object: new XPoint(p, E, 'E', { dx: -15, dy: -15 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            // 각 ACE, ECD with triangle marker
            {
                group: [
                    { id: 'angleACE', object: new XAngleMarker(p, A, C, E, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleECD', object: new XAngleMarker(p, E, C, D, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 텍스트: △=20°
            { id: 'textAngle', object: createTextDisplay('△ = 20°', 20), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            // DE 그리기
            { id: 'DE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 각 DEC with marker 𝑥
            { id: 'angleDEC', object: new XAngleMarker(p, D, E, C, { arcSize: 40, marker: '𝑥' }), animate: { mode: 'draw', duration: 0.7 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            // AX (dashed) - CA 연장선 (A 너머)
            { id: 'AX', object: XSegment(p, A, X, { dashed: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 각 DAC = 20°
            { id: 'angleDAC', object: new XAngleMarker(p, D, A, C, { arcSize: 25, marker: '20°' }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.3 },
            // 각 BAD = 80°
            { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { arcSize: 35, marker: '80°' }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.3 },
            // 각 XAB = 80°
            { id: 'angleXAB', object: new XAngleMarker(p, X, A, B, { arcSize: 40, marker: '80°' }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // fade all except specific angles
            { action: 'fadeAll', opacity: 0.3, exclude: ['angleACE', 'angleECD', 'angleBAD', 'angleXAB'], duration: 0.3 },
            { delay: 0.3 },
            // pulse angles || draw triangle ADC bright green
            {
                group: [
                    { id: 'angleACE', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleECD', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleBAD', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleXAB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'triADC', object: new XPolygon(p, [A, D, C], { color: '#00FF00' }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 텍스트: E는 삼각형 ADC의 방심!
            { id: 'textExcenter', object: createTextDisplay('E는 삼각형 ADC 의 방심!', 45), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 3 =====
        // 외접원 AED 계산
        const calcCircumcircle = (p1, p2, p3) => {
            const ax = p1.x, ay = p1.y;
            const bx = p2.x, by = p2.y;
            const cx = p3.x, cy = p3.y;
            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            if (Math.abs(d) < 1e-10) return { center: p1, radius: 0 };
            const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
            const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
            const centerPt = p.createVector(ux, uy);
            const radius = p5.Vector.dist(centerPt, p1);
            return { center: centerPt, radius };
        };
        const circumAED = calcCircumcircle(A, E, D);

        animator.registerPhase('solution3', [
            // fade all except E, D, A
            { action: 'fadeAll', opacity: 0.3, exclude: ['pointE', 'pointD', 'pointA', 'DE', 'AD'], duration: 0.5 },
            { delay: 0.3 },
            // display I (incenter)
            { id: 'pointI', object: new XPoint(p, I, 'I', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            // 외접원 AED
            { id: 'circumAED', object: XCircle(p, circumAED.center, circumAED.radius), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            // ED, EI 노란색으로 그리기
            {
                group: [
                    { id: 'segED', object: XSegment(p, E, D, { color: '#FFFF00' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segEI', object: XSegment(p, E, I, { color: '#FFFF00' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // pulse ED, EI || draw AD, AI
            {
                group: [
                    { id: 'segED', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'segEI', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'segAD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'segAI', object: XSegment(p, A, I), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 텍스트: x = 10°
            { id: 'textAnswer', object: createTextDisplay('𝑥 = 10°', 70), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // phaseMap 설정
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
