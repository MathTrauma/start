import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, circleLineIntersection, getCircumcenter } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XRightAngle, XDimension, XAngleMarker, XArc, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let animator;

    // 고정 상수
    const Bx = -3, By = -4;
    const Cx = 3, Cy = -4;
    const Zx = 0, Zy = 0;
    const R = 5;
    const Ux = 0, Uy = -5;
    const ANGLE_PROBLEM = Math.atan2(4, 3);       // A(3,4)
    const ANGLE_SOL_START = 0;                      // A(5,0)
    const ANGLE_SOL_END = 70 * Math.PI / 180;      // A(5cos70, 5sin70)
    const R_O1 = Math.sqrt((Ux - Bx) ** 2 + (Uy - By) ** 2); // √10

    let currentAngleA = ANGLE_PROBLEM;

    // 공유 p5.Vector
    let B, C, Z, U, A, I, V, X, Y, K;
    let _tempFar;

    // 헬퍼: 다각형/선분 정점 동기화
    const syncVertices = (obj, ...vecs) => {
        if (!obj) return;
        vecs.forEach((v, i) => {
            if (obj.vertices[i] && v) {
                obj.vertices[i].set(v);
            }
        });
        obj._perimeterDirty = true;
    };

    // 헬퍼: 호(Arc) + 점들을 포함하는 경로 생성
    const createArcPath = (p, center, radius, startAngle, endAngle, closingPoints = [], options = {}) => {
        let arcDiff = endAngle - startAngle;
        while (arcDiff > Math.PI) arcDiff -= 2 * Math.PI;
        while (arcDiff < -Math.PI) arcDiff += 2 * Math.PI;
        
        const tempArc = XArc(p, center, radius, startAngle, startAngle + arcDiff, { segments: 32 });
        const arcOnlyVerts = tempArc.vertices.slice(1); // center 제외
        return new XPolygon(p, [...arcOnlyVerts, ...closingPoints], options);
    };

    function recomputeAll() {
        const ax = Zx + R * Math.cos(currentAngleA);
        const ay = Zy + R * Math.sin(currentAngleA);
        A.set(ax, ay);

        // I (내심)
        const a = Math.sqrt((Bx - Cx) ** 2 + (By - Cy) ** 2);
        const b = Math.sqrt((ax - Cx) ** 2 + (ay - Cy) ** 2);
        const c = Math.sqrt((ax - Bx) ** 2 + (ay - By) ** 2);
        const peri = a + b + c;
        I.set((a * ax + b * Bx + c * Cx) / peri, (a * ay + b * By + c * Cy) / peri);

        // V (이등분선 ∩ 외접원)
        const BAx = ax - Bx, BAy = ay - By;
        const BAlen = Math.sqrt(BAx * BAx + BAy * BAy);
        const BCx_ = Cx - Bx, BCy_ = Cy - By;
        const BClen = Math.sqrt(BCx_ * BCx_ + BCy_ * BCy_);
        const bisX = BAx / BAlen + BCx_ / BClen;
        const bisY = BAy / BAlen + BCy_ / BClen;

        _tempFar.set(Bx + bisX * 100, By + bisY * 100);
        const hits = circleLineIntersection(Z, R, B, _tempFar);

        let bestDist = -1;
        let vx = 0, vy = 0;
        for (const h of hits) {
            const dx = h.x - Bx, dy = h.y - By;
            const dist = dx * dx + dy * dy;
            if (dist > bestDist) {
                bestDist = dist;
                vx = h.x; vy = h.y;
            }
        }
        V.set(vx, vy);

        // 파생점: X = UV∩BC, Y = UV∩CA, K = CA∩BV
        const newX = intersectLines(U, V, B, C);
        if (newX) X.set(newX.x, newX.y);
        const newY = intersectLines(U, V, C, A);
        if (newY) Y.set(newY.x, newY.y);
        const newK = intersectLines(C, A, B, V);
        if (newK) K.set(newK.x, newK.y);
    }

    // 텍스트 표시용 헬퍼
    const createTextDisplay = (text, yOffset = 20) => ({
        visible: true,
        progress: 1,
        mode: 'default',
        text: text,
        yOffset: yOffset,
        render: function () {
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

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 벡터 초기화
        B = p.createVector(Bx, By);
        C = p.createVector(Cx, Cy);
        Z = p.createVector(Zx, Zy);
        U = p.createVector(Ux, Uy);
        _tempFar = p.createVector(0, 0);
        A = p.createVector(0, 0);
        I = p.createVector(0, 0);
        V = p.createVector(0, 0);
        X = p.createVector(0, 0);
        Y = p.createVector(0, 0);
        K = p.createVector(0, 0);

        // 초기 상태 계산
        currentAngleA = ANGLE_PROBLEM;
        recomputeAll();

        // 뷰포트 설정
        animator = new XAnimator(p);
        animator.initViewport([p.createVector(0, R), p.createVector(0, -R), p.createVector(-R, 0), p.createVector(R, 0)], size, 50);

        // Solution 단계용 미리 정의된 데이터
        currentAngleA = ANGLE_SOL_START;
        recomputeAll();
        const circleO2Obj = XCircle(p, p.createVector(V.x, V.y), p.dist(V.x, V.y, Cx, Cy));

        currentAngleA = ANGLE_SOL_END;
        recomputeAll();
        const finalA = p.createVector(A.x, A.y);
        const finalI = p.createVector(I.x, I.y);
        const finalV = p.createVector(V.x, V.y);
        const ptX = p.createVector(X.x, X.y);
        const circumIBU = getCircumcenter(finalI, B, U);
        const rIBU = p.dist(circumIBU.x, circumIBU.y, finalI.x, finalI.y);

        // Arc Paths (V->A)
        const angleV_sol = Math.atan2(finalV.y - Zy, finalV.x - Zx);
        const pathVAB = createArcPath(p, Z, R, angleV_sol, ANGLE_SOL_END, [B], { color: COLORS.green });
        const pathVAU = createArcPath(p, Z, R, angleV_sol, ANGLE_SOL_END, [U], { color: COLORS.green });

        // Problem 초기 상태 복원
        currentAngleA = ANGLE_PROBLEM;
        recomputeAll();

        const initObj = {
            visible: false, progress: 0, mode: 'default',
            frameCallback: () => { currentAngleA = ANGLE_PROBLEM; recomputeAll(); },
            reset: function() { this.frameCallback = () => { currentAngleA = ANGLE_PROBLEM; recomputeAll(); }; },
            render: () => {}
        };

        // ===== Phases =====
        animator.registerPhase('problem1', [
            { id: '_init', object: initObj, animate: { mode: 'default', duration: 0.5 } },
            { id: 'textDistortion', object: createTextDisplay('가독성 문제로 왜곡된 그림을 사용', 20), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            { group: [
                { id: 'pointA', object: new XPoint(p, A, 'A', { center: Z }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointB', object: new XPoint(p, B, 'B', { center: Z }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointC', object: new XPoint(p, C, 'C', { center: Z }), animate: { mode: 'draw', duration: 0.3 } }
            ], parallel: true },
            { id: 'circumCircle', object: XCircle(p, Z, R), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 1.0 },
            { group: [
                { id: 'segAU', object: XSegment(p, A, U, { color: COLORS.yellow, dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.5 } },
                { id: 'segBV', object: XSegment(p, B, V, { color: COLORS.yellow, dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.5 } }
            ], parallel: true },
            { group: [
                { id: 'pointI', object: new XPoint(p, I, 'I', { dx: -15, dy: -15 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointK', object: new XPoint(p, K, 'K', { center: Z }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointU', object: new XPoint(p, U, 'U', { center: Z }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointV', object: new XPoint(p, V, 'V', { center: Z }), animate: { mode: 'draw', duration: 0.3 } }
            ], parallel: true },
            { delay: 1.0 }
        ]);

        animator.registerPhase('problem2', [
            { group: [
                { id: 'segID', object: XSegment(p, I, p.createVector(1, -4)), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'segIE', object: XSegment(p, I, p.createVector(3, -2)), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'segUV', object: XSegment(p, U, V), animate: { mode: 'draw', duration: 1.2 } }
            ], parallel: true },
            { group: [
                { id: 'pointD', object: new XPoint(p, p.createVector(1, -4), 'D', { center: Z }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointE', object: new XPoint(p, p.createVector(3, -2), 'E', { center: Z }), animate: { mode: 'draw', duration: 0.3 } }
            ], parallel: true },
            { group: [
                { id: 'rightIDB', object: new XRightAngle(p, I, p.createVector(1, -4), B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                { id: 'rightAEI', object: new XRightAngle(p, A, p.createVector(3, -2), I, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } }
            ], parallel: true },
            { delay: 1.0 },
            { group: [
                { id: 'dimBD', object: new XDimension(p, B, p.createVector(1, -4), '32', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'dimDC', object: new XDimension(p, p.createVector(1, -4), C, 'r', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'dimCE', object: new XDimension(p, C, p.createVector(3, -2), 'r', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'dimEK', object: new XDimension(p, p.createVector(3, -2), K, '18', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } }
            ], parallel: true },
            { delay: 0.7 },
            { group: [
                { id: 'triKIE', object: new XPolygon(p, [K, I, p.createVector(3, -2)], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
                { id: 'triIBD', object: new XPolygon(p, [I, B, p.createVector(1, -4)], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } }
            ], parallel: true },
            { group: [
                { group: [
                    { id: 'triKIE', animate: { mode: 'travel', duration: 2.5 } },
                    { id: 'triIBD', animate: { mode: 'travel', duration: 2.5 } }
                ], parallel: true },
            ], parallel: true },
            { delay: 2.0 },
            { group: [
                { id: 'triKIE', action: 'hide', duration: 0.3 }, { id: 'triIBD', action: 'hide', duration: 0.3 },
                { id: 'dimBD', action: 'hide', duration: 0.3 }, { id: 'dimDC', action: 'hide', duration: 0.3 },
                { id: 'dimCE', action: 'hide', duration: 0.3 }, { id: 'dimEK', action: 'hide', duration: 0.3 }
            ], parallel: true }
        ]);

        animator.registerPhase('solution1', [
            { id: '_init', setFrameCallback: null },
            { group: [
                { id: 'textDistortion', action: 'hide' }, { id: 'segID', action: 'hide' }, { id: 'segIE', action: 'hide' },
                { id: 'rightIDB', action: 'hide' }, { id: 'rightAEI', action: 'hide' },
                { id: 'pointD', action: 'hide' }, { id: 'pointE', action: 'hide' }
            ], parallel: true },
            { group: [
                { id: 'segIX', object: XSegment(p, I, X), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'segIY', object: XSegment(p, I, Y), animate: { mode: 'draw', duration: 0.3 } }
            ], parallel: true },
            { group: [
                { id: 'pointX', object: new XPoint(p, X, 'X', { dx: 10, dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
                { id: 'pointY', object: new XPoint(p, Y, 'Y', { dx: 10, dy: 15 }), animate: { mode: 'draw', duration: 0.3 } }
            ], parallel: true },
            // Dependent Objects FrameCallbacks
            { group: [
                { id: 'triABC', setFrameCallback: (obj) => syncVertices(obj, A, B, C) },
                { id: 'segAU', setFrameCallback: (obj) => syncVertices(obj, A, U) },
                { id: 'segBV', setFrameCallback: (obj) => syncVertices(obj, B, V) },
                { id: 'segUV', setFrameCallback: (obj) => syncVertices(obj, U, V) },
                { id: 'segIX', setFrameCallback: (obj) => syncVertices(obj, I, X) },
                { id: 'segIY', setFrameCallback: (obj) => syncVertices(obj, I, Y) }
            ]},
            // Move: PROBLEM -> SOL_START
            { id: '_init', setFrameCallback: function() {
                const prg = animator.get('_init').progress;
                currentAngleA = ANGLE_PROBLEM + (ANGLE_SOL_START - ANGLE_PROBLEM) * prg;
                recomputeAll();
            }},
            { group: [
                { id: '_init', animate: { mode: 'default', duration: 1.8, from: 0, to: 1 } },
                { id: 'textIXCY', object: createTextDisplay('IXCY 가 마름모임을 깨닫는 것이 핵심', 20), animate: { mode: 'draw', duration: 0.3 } }
            ], parallel: true },
            { id: 'circleO1', object: XCircle(p, U, R_O1), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 1.0 },
            { id: 'circleO2', object: circleO2Obj, animate: { mode: 'draw', duration: 2.0 } },
            { delay: 1.0 },
            // Move: SOL_START -> SOL_END
            { id: 'circleO2', setFrameCallback: (obj) => {
                const r = p.dist(V.x, V.y, Cx, Cy);
                if (obj.center) obj.center.set(V);
                if (obj.radius !== undefined) obj.radius = r;
                if (obj.vertices) {
                    const n = obj.vertices.length;
                    for (let i = 0; i < n; i++) {
                        const a = (i/n) * Math.PI * 2;
                        obj.vertices[i].set(V.x + Math.cos(a)*r, V.y + Math.sin(a)*r);
                    }
                }
            }},
            { id: '_init', setFrameCallback: function() {
                const prg = animator.get('_init').progress;
                currentAngleA = ANGLE_SOL_START + (ANGLE_SOL_END - ANGLE_SOL_START) * prg;
                recomputeAll();
            }},
            { id: '_init', animate: { mode: 'default', duration: 4.0, from: 0, to: 1 } },
            { group: [ { id: 'circleO1', action: 'hide', duration: 1.2 }, { id: 'circleO2', action: 'hide', duration: 1.2 } ], parallel: true }
        ]);

        animator.registerPhase('solution2', [
            { id: '_init', setFrameCallback: () => { currentAngleA = ANGLE_SOL_END; recomputeAll(); } },
            { group: [
                { id: 'angleVBA', object: new XAngleMarker(p, finalV, B, finalA, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'angleCBV', object: new XAngleMarker(p, C, B, finalV, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
            ], parallel: true },
            { id: 'pathVAB', object: pathVAB, animate: { mode: 'draw', duration: 1.5 } },
            { group: [
                { id: 'pathVAU', object: pathVAU, animate: { mode: 'draw', duration: 1.5 } },
                { id: 'angleVUA', object: new XAngleMarker(p, finalV, U, finalA, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } }
            ], parallel: true },
            { group: [
                { id: 'pathVAB', animate: { mode: 'pulse', duration: 2.0 } },
                { id: 'pathVAU', animate: { mode: 'pulse', duration: 2.0 } },
                { id: 'angleVBA', animate: { mode: 'pulse', duration: 2.0 } },
                { id: 'angleVUA', animate: { mode: 'pulse', duration: 2.0 } }
            ], parallel: true },
            { delay: 1.5 },
            { group: [
                { id: 'circumIBU', object: XCircle(p, circumIBU, rIBU), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'segBU', object: XSegment(p, B, U), animate: { mode: 'draw', duration: 1.2 } },
                { id: 'pathVAB', action: 'hide', duration: 1.0 },
                { id: 'pathVAU', action: 'hide', duration: 1.0 }
            ], parallel: true },
            { group: [
                { id: 'angleIUB', object: new XAngleMarker(p, finalI, U, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                { id: 'angleIXB', object: new XAngleMarker(p, finalI, ptX, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } }
            ], parallel: true },
            { delay: 1.0 },
            { group: [
                { id: 'segAU_sol', object: XSegment(p, finalA, U, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.85 } },
                { id: 'segUB_sol', object: XSegment(p, U, B, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.85 } }
            ]},
            { group: [
                { group: [
                    { id: 'segAC_sol', object: XSegment(p, finalA, C, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.85 } },
                    { id: 'segCB_sol', object: XSegment(p, C, B, { color: COLORS.yellow }), animate: { mode: 'draw', duration: 0.85 } }
                ]},
                { group: [ { delay: 1.0 }, { id: 'angleACB', object: new XAngleMarker(p, finalA, C, B, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } } ] }
            ], parallel: true },
            { group: [
                { id: 'angleIXB', animate: { mode: 'pulse', duration: 2.0 } },
                { id: 'angleACB', animate: { mode: 'pulse', duration: 2.0 } }
            ], parallel: true },
            { delay: 2.0 }
        ]);

        animator.registerPhase('solution3', [
            { group: [
                { id: 'segAU_sol', action: 'hide', duration: 0.5 }, { id: 'segUB_sol', action: 'hide', duration: 0.5 },
                { id: 'segAC_sol', action: 'hide', duration: 0.5 }, { id: 'segCB_sol', action: 'hide', duration: 0.5 },
                { id: 'circumIBU', action: 'hide', duration: 0.5 },
                { id: 'segAU', action: 'fade', duration: 0.5 }, { id: 'segBV', action: 'fade', duration: 0.5 }
            ], parallel: true },
            { group: [
                { id: 'markIX', object: new XSegmentMarker(p, I, X, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                { id: 'markXC', object: new XSegmentMarker(p, X, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                { id: 'markCY', object: new XSegmentMarker(p, C, Y, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                { id: 'markYI', object: new XSegmentMarker(p, Y, I, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } }
            ], parallel: true },
            { id: '_init', setFrameCallback: function() {
                const prg = animator.get('_init').progress;
                currentAngleA = ANGLE_SOL_END + (ANGLE_PROBLEM - ANGLE_SOL_END) * prg;
                recomputeAll();
            }},
            { id: '_init', animate: { mode: 'default', duration: 1.2, from: 0, to: 1 } },
            { delay: 2.0 }
        ]);

        sketchContext.register({
            p5Instance: p, animator, phaseMap: { problem: { 1: 'problem1', 2: 'problem2' }, solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3' } },
            problemPhaseCount: 2, solutionPhaseCount: 3
        });
    };

    p.draw = () => {
        p.background(p.theme.background);
        p.push(); p.translate(p.width / 2, p.height / 2); p.scale(1, -1);
        if (animator) animator.updateAndDraw();
        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');