import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XDimension, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, P, O;
    let r; // 외접원 반지름
    let animator, size;

    p.setup = function() {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 (극좌표, 반지름 2)
        A = p.createVector(2 * Math.cos(72 * Math.PI / 180), 2 * Math.sin(72 * Math.PI / 180));
        B = p.createVector(2 * Math.cos(200 * Math.PI / 180), 2 * Math.sin(200 * Math.PI / 180));
        C = p.createVector(2 * Math.cos(-20 * Math.PI / 180), 2 * Math.sin(-20 * Math.PI / 180));

        // D: AB 위, AD:DB = 1:3
        D = p5.Vector.add(p5.Vector.mult(A, 3), p5.Vector.mult(B, 1)).mult(1 / 4);

        // 외접원
        O = getCircumcenter(A, B, C);
        r = p5.Vector.dist(O, A);

        // P: 외접원 위, ∠PDA = ∠ACB 를 만족하는 점
        // ∠ACB 계산
        const CA = p5.Vector.sub(A, C);
        const CB = p5.Vector.sub(B, C);
        const angleACB = Math.acos(
            p5.Vector.dot(CA, CB) / (CA.mag() * CB.mag())
        );

        // P를 원 위에서 탐색: ∠PDA = ∠ACB
        // B를 포함하지 않는 호 AC 위 → 각도 범위 결정
        const angleA = Math.atan2(A.y - O.y, A.x - O.x);
        const angleC = Math.atan2(C.y - O.y, C.x - O.x);
        const angleB = Math.atan2(B.y - O.y, B.x - O.x);

        // B를 포함하지 않는 호: angleC → angleA (반시계, B 미포함 쪽)
        // 수치 탐색으로 P 찾기
        let bestT = 0, bestErr = Infinity;
        for (let i = 0; i <= 1000; i++) {
            const t = i / 1000;
            // angleC에서 angleA까지 (B를 안 지나는 쪽)
            let theta = angleC + t * normalizeAngle(angleA - angleC);
            const px = O.x + r * Math.cos(theta);
            const py = O.y + r * Math.sin(theta);
            const pv = p.createVector(px, py);

            // ∠PDA 계산
            const DP = p5.Vector.sub(pv, D);
            const DA = p5.Vector.sub(A, D);
            const dot = p5.Vector.dot(DP, DA);
            const anglePDA = Math.acos(Math.min(1, Math.max(-1, dot / (DP.mag() * DA.mag()))));

            const err = Math.abs(anglePDA - angleACB);
            if (err < bestErr) {
                bestErr = err;
                bestT = theta;
            }
        }
        P = p.createVector(O.x + r * Math.cos(bestT), O.y + r * Math.sin(bestT));

        const center = p.createVector((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);

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
                        if (obj.vertices && obj.vertices[i]) {
                            obj.vertices[i].x = pt.x;
                            obj.vertices[i].y = pt.y;
                        }
                    });
                    if (obj.vertices) obj._perimeterDirty = true;
                    if (t >= 1) obj.frameCallback = null;
                };
            };
        };

        // clone ADP (t1) 준비
        const dA1 = A.copy(), dD1 = D.copy(), dP1 = P.copy();
        const orig1 = [A.copy(), D.copy(), P.copy()];
        const dup1 = [dA1, dD1, dP1];
        const movFactory1 = createDupTranslatorFactory(dup1, orig1, -100, 0, 1.5);

        // clone APB (t2) 준비
        const dA2 = A.copy(), dP2 = P.copy(), dB2 = B.copy();
        const orig2 = [A.copy(), P.copy(), B.copy()];
        const dup2 = [dA2, dP2, dB2];
        const movFactory2 = createDupTranslatorFactory(dup2, orig2, 20, -10, 1.5);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D, P], size);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'circO', object: XCircle(p, O, r), animate: { mode: 'draw', duration: 1.8 } },
            { id: 'segDP', object: XSegment(p, D, P), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'ptD', object: new XPoint(p, D, 'D', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptP', object: new XPoint(p, P, 'P', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'anglePDA', object: new XAngleMarker(p, P, D, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleACB', object: new XAngleMarker(p, A, C, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            { id: 'dimDP', object: new XDimension(p, D, P, '3', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'dimDA', object: new XDimension(p, D, A, 'k', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBA', object: new XDimension(p, B, A, '4k', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            // ghost all dims
            { action: 'fade', targets: ['dimDP', 'dimDA', 'dimBA'], opacity: 0.3, duration: 0.6 },
            {
                group: [
                    { id: 'segBP', object: XSegment(p, B, P), animate: { mode: 'draw', duration: 1.3 } },
                    { id: 'segAP', object: XSegment(p, A, P), animate: { mode: 'draw', duration: 1.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleACB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleAPB', object: new XAngleMarker(p, A, P, B, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'angleAPB', animate: { mode: 'pulse', duration: 1.2 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { delay: 0.7 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            { id: 'angleDAP', object: new XAngleMarker(p, B, A, C, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
            { action: 'fadeAll', opacity: 0.3, duration: 0.7 },
            // clone ADP as t1 green, move(-100, 0)
            {
                group: [
                    { id: 't1_tri', object: new XPolygon(p, [dA1, dD1, dP1], { color: COLORS.green }), action: 'show' },
                    { id: 't1_anglePDA', object: new XAngleMarker(p, dP1, dD1, dA1, { marker: 'circle', color: COLORS.green }), action: 'show' },
                    { id: 't1_angleDAP', object: new XAngleMarker(p, dD1, dA1, dP1, { marker: 'triangle', color: COLORS.green }), action: 'show' },
                    { id: 't1_tri', setFrameCallbackFactory: movFactory1 },
                    // clone APB as t2 yellow, move(70, -70)
                    { id: 't2_tri', object: new XPolygon(p, [dA2, dP2, dB2], { color: COLORS.yellow }), action: 'show' },
                    { id: 't2_angleAPB', object: new XAngleMarker(p, dA2, dP2, dB2, { marker: 'circle', color: COLORS.yellow }), action: 'show' },
                    { id: 't2_angleBAP', object: new XAngleMarker(p, dB2, dA2, dP2, { marker: 'triangle', color: COLORS.yellow }), action: 'show' },
                    { id: 't2_tri', setFrameCallbackFactory: movFactory2 }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 't1_tri', animate: { mode: 'travel', duration: 1.8 } },
                    { id: 't2_tri', animate: { mode: 'travel', duration: 1.8 } },
                    { id: 'text1', object: new XText(p, [20, 25], '\\triangle ADP \\sim \\triangle APB',
                        { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
                      animate: { mode: 'draw', duration: 1.8 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 3 =====
        animator.registerPhase('solution3', [
            {
                group: [
                    { id: 't1_tri', action: 'remove' },
                    { id: 't1_anglePDA', action: 'remove' },
                    { id: 't1_angleDAP', action: 'remove' },
                    { id: 't2_tri', action: 'remove' },
                    { id: 't2_angleAPB', action: 'remove' },
                    { id: 't2_angleBAP', action: 'remove' },
                    { action: 'fadeAll', opacity: 1, duration: 0.6 }
                ],
                parallel: true
            },
            { id: 'fillADP', object: new XPolygon(p, [A, D, P], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            { id: 'fillAPB', object: new XPolygon(p, [A, P, B], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'dimDP', animate: { mode: 'pulse', duration: 2.0 } },
                    {
                        group: [
                            { id: 'dimBP', object: new XDimension(p, B, P, 'x', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                            { id: 'dimBP', animate: { mode: 'pulse', duration: 0.8 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            { id: 'text2', object: new XText(p, [20, 50], '넓이비 ↔ 밑변길이비 ↔ 닮음제곱비',
                { fontSize: 18, screenCoord: true, textAlign: p.LEFT }),
              animate: { mode: 'draw', duration: 1.5 } },
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

    p.draw = function() {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();
    };
};

function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

new p5(sketch, 'canvas-wrapper');
