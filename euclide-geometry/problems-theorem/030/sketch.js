import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker, XSegmentMarker, XRightAngle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, I, M, O, I_A, X, Y;
    let animator;
    const R = 3; // 외접원 반지름

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 외접원 중심
        O = p.createVector(0, 0);

        // 삼각형 ABC (외접원 위의 점들)
        const angleA = 85 * Math.PI / 180;
        const angleB = 215 * Math.PI / 180;
        const angleC = 335 * Math.PI / 180;

        A = p.createVector(R * Math.cos(angleA), R * Math.sin(angleA));
        B = p.createVector(R * Math.cos(angleB), R * Math.sin(angleB));
        C = p.createVector(R * Math.cos(angleC), R * Math.sin(angleC));

        // 변의 길이
        const a = p.dist(B.x, B.y, C.x, C.y); // |BC|
        const b = p.dist(C.x, C.y, A.x, A.y); // |CA|
        const c = p.dist(A.x, A.y, B.x, B.y); // |AB|
        const sum = a + b + c;

        // 내심 I 계산
        I = p.createVector(
            (a * A.x + b * B.x + c * C.x) / sum,
            (a * A.y + b * B.y + c * C.y) / sum
        );

        // 방심 I_A 계산 (A 맞은편)
        const sumA = -a + b + c;
        I_A = p.createVector(
            (-a * A.x + b * B.x + c * C.x) / sumA,
            (-a * A.y + b * B.y + c * C.y) / sumA
        );

        // M: AI 연장선과 외접원의 교점
        const dir = p5.Vector.sub(I, A).normalize();
        const ax = A.x, ay = A.y, dx = dir.x, dy = dir.y;
        const qa = dx * dx + dy * dy;
        const qb = 2 * (ax * dx + ay * dy);
        const qc = ax * ax + ay * ay - R * R;
        const disc = qb * qb - 4 * qa * qc;
        const t1 = (-qb + Math.sqrt(disc)) / (2 * qa);
        const t2 = (-qb - Math.sqrt(disc)) / (2 * qa);
        const t = Math.abs(t1) > Math.abs(t2) ? t1 : t2;
        M = p.createVector(A.x + t * dir.x, A.y + t * dir.y);

        // X: AB를 B 방향으로 1.4만큼 연장한 점
        const dirAB = p5.Vector.sub(B, A).normalize();
        X = p5.Vector.add(B, p5.Vector.mult(dirAB, 1.4));

        // Y: AC를 C 방향으로 1.4만큼 연장한 점
        const dirAC = p5.Vector.sub(C, A).normalize();
        Y = p5.Vector.add(C, p5.Vector.mult(dirAC, 1.4));

        // 삼각형 IBC의 외접원 반지름 계산
        const IB = p.dist(I.x, I.y, B.x, B.y);
        const IC = p.dist(I.x, I.y, C.x, C.y);
        const BC = a;
        const s_IBC = (IB + IC + BC) / 2;
        const area_IBC = Math.sqrt(s_IBC * (s_IBC - IB) * (s_IBC - IC) * (s_IBC - BC));
        const R_IBC = (IB * IC * BC) / (4 * area_IBC);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, M, p.createVector(-R, R), p.createVector(R, -R)], size);

        // 색상 전환 헬퍼 (기존 선분의 색을 점진적으로 변경)
        const createColorFader = (toColor, duration) => {
            let elapsed = 0;
            let lastTime = null;
            let fromColor = null;
            return (obj) => {
                const now = performance.now();
                if (lastTime === null) {
                    lastTime = now;
                    fromColor = [...obj.style.strokeColor];
                }
                const dt = (now - lastTime) / 1000;
                lastTime = now;
                elapsed += dt;
                const progress = Math.min(1, elapsed / duration);

                const r = Math.round(fromColor[0] + (toColor[0] - fromColor[0]) * progress);
                const g = Math.round(fromColor[1] + (toColor[1] - fromColor[1]) * progress);
                const b = Math.round(fromColor[2] + (toColor[2] - fromColor[2]) * progress);
                obj.style.strokeColor = [r, g, b, 255];

                if (progress >= 1) {
                    obj.frameCallback = null;
                }
            };
        };

        // 색상 상수
        const PURPLE = [153, 0, 255];
        const YELLOW = [255, 255, 0];
        const GREEN = [0, 255, 0];

        // ===== Problem Phase 1: 외접원과 삼각형 =====
        animator.registerPhase('problem1', [
            { id: 'circumcircle', object: XCircle(p, O, R), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: 0, dy: -15 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: -12, dy: 8 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: 12, dy: 8 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // ===== Problem Phase 2: 내심과 점 M =====
        animator.registerPhase('problem2', [
            { id: 'segAM', object: XSegment(p, A, M), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointI', object: new XPoint(p, I, 'I', { dx: 12, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointM', object: new XPoint(p, M, 'M', { dx: 12, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            {
                group: [
                    { id: 'segMB', object: XSegment(p, M, B, { color: '#00FF00' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segMC', object: XSegment(p, M, C, { color: '#00FF00' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segMI', object: XSegment(p, M, I, { color: '#00FF00' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'markMB', object: new XSegmentMarker(p, M, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'markMC', object: new XSegmentMarker(p, M, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'markMI', object: new XSegmentMarker(p, M, I, { mark: 2 }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            // hide [MB, MC, MI] - segments and markers
            {
                group: [
                    { action: 'hide', id: 'segMB' },
                    { action: 'hide', id: 'segMC' },
                    { action: 'hide', id: 'segMI' },
                    { action: 'hide', id: 'markMB' },
                    { action: 'hide', id: 'markMC' },
                    { action: 'hide', id: 'markMI' }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // draw angles BAI, IAC with marker α
            {
                group: [
                    { id: 'angleBAI', object: new XAngleMarker(p, B, A, I, { arcSize: 30, marker: 'α' }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'angleIAC', object: new XAngleMarker(p, I, A, C, { arcSize: 30, marker: 'α' }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // draw segment BI
            { id: 'segBI', object: XSegment(p, B, I), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // draw angles IBA, CBI with marker β
            {
                group: [
                    { id: 'angleIBA', object: new XAngleMarker(p, I, B, A, { arcSize: 30, marker: 'β' }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'angleCBI', object: new XAngleMarker(p, C, B, I, { arcSize: 30, marker: 'β' }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // draw angle BIM with marker α+β
            { id: 'angleBIM', object: new XAngleMarker(p, B, I, M, { arcSize: 30, marker: 'α+β' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.5 },
            // 강조할 선분들 추가 (AC, BC, BM) - 아직 없는 것들
            {
                group: [
                    { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 0 } },
                    { id: 'segBC', object: XSegment(p, B, C), animate: { mode: 'draw', duration: 0 } },
                    { id: 'segBM', object: XSegment(p, B, M), animate: { mode: 'draw', duration: 0 } }
                ],
                parallel: true
            },
            // setFrameCallback로 색상 전환 (전체 선분이 동시에 색이 변함)
            {
                group: [
                    { id: 'segAM', setFrameCallback: createColorFader(PURPLE, 1.5) },
                    { id: 'segAC', setFrameCallback: createColorFader(PURPLE, 1.5) },
                    { id: 'segBC', setFrameCallback: createColorFader(PURPLE, 1.5) },
                    { id: 'segBM', setFrameCallback: createColorFader(PURPLE, 1.5) }
                ],
                parallel: true
            },
            { delay: 1.5 },
            // draw angle MBC with marker α (larger arcSize)
            { id: 'angleMBC', object: new XAngleMarker(p, M, B, C, { arcSize: 30, marker: 'α' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // pulse angle MBC, IAC
            {
                group: [
                    { id: 'angleMBC', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'angleIAC', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // draw segments MB, MI bright green
            {
                group: [
                    { action: 'show', id: 'segMB' },
                    { action: 'show', id: 'segMI' }
                ],
                parallel: true
            },
            { delay: 1.5 },
            // display XSegmentMarker[2] MB, MI
            {
                group: [
                    { id: 'markMB2', object: new XSegmentMarker(p, M, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'markMI2', object: new XSegmentMarker(p, M, I, { mark: 2 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // draw segment IC
            { id: 'segIC', object: XSegment(p, I, C), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // draw angles ACI, ICB with marker γ
            {
                group: [
                    { id: 'angleACI', object: new XAngleMarker(p, A, C, I, { arcSize: 30, marker: 'γ' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleICB', object: new XAngleMarker(p, I, C, B, { arcSize: 30, marker: 'γ' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // draw angle MIC with marker α+γ
            { id: 'angleMIC', object: new XAngleMarker(p, M, I, C, { arcSize: 30, marker: 'α+γ' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 },
            // draw segments CM bright yellow
            { id: 'segCM', object: XSegment(p, C, M, { color: '#FFFF00' }), animate: { mode: 'draw', duration: 1.2 } },
            // pulse BAI || draw angle BCM with marker α
            {
                group: [
                    { id: 'angleBAI', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleBCM', object: new XAngleMarker(p, B, C, M, { arcSize: 30, marker: 'α' }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // draw segments MI, MC yellow
            {
                group: [
                    { id: 'segMI', setFrameCallback: createColorFader(YELLOW, 1.5) },
                    { id: 'segCM', setFrameCallback: createColorFader(YELLOW, 1.5) }
                ],
                parallel: true
            },
            { delay: 1.5 },
            // XSegmentMarker[2] MC
            { id: 'markMC2', object: new XSegmentMarker(p, M, C, { mark: 2 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 3 =====
        const DEFAULT_COLOR = p.theme.stroke ? p.color(p.theme.stroke).levels.slice(0,3) : [200,200,200];
        animator.registerPhase('solution3', [
            // change color of all colored objects to normal (white)
            {
                group: [
                    { id: 'segAM', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) },
                    { id: 'segAC', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) },
                    { id: 'segBC', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) },
                    { id: 'segBM', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) },
                    { id: 'segCM', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) },
                    { id: 'segMI', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) },
                    { id: 'segMB', setFrameCallback: createColorFader(DEFAULT_COLOR, 1.5) }
                ],
                parallel: true
            },
            // fade all except ABC, AM, I, M, BI, IC, angles(IBA, CBI), angles(ACI, ICB)
            { action: 'fadeAll', opacity: 0.2, exclude: ['triABC', 'segAM', 'pointI', 'pointM', 'segBI', 'segIC', 'angleIBA', 'angleCBI', 'angleACI', 'angleICB'], duration: 1.5 },
            { delay: 0.3 },
            // add I_A to bounds || draw segments BX, CY, MI_A
            {
                group: [
                    { action: 'setBounds', points: [I_A, X, Y], duration: 1.5 },
                    { id: 'segBX', object: XSegment(p, B, X), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segCY', object: XSegment(p, C, Y), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segMIA', object: XSegment(p, M, I_A), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // draw segments BI_A, CI_A
            {
                group: [
                    { id: 'segBIA', object: XSegment(p, B, I_A), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCIA', object: XSegment(p, C, I_A), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // draw angles I_ABC, XBI_A with markc || draw angles I_ACY, BCI_A with markt
            {
                group: [
                    { id: 'angleIABC', object: new XAngleMarker(p, I_A, B, C, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleXBIA', object: new XAngleMarker(p, X, B, I_A, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleIACY', object: new XAngleMarker(p, I_A, C, Y, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleBCIA', object: new XAngleMarker(p, B, C, I_A, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // display point I_A
            { id: 'pointIA', object: new XPoint(p, I_A, 'Iₐ', { dx: 0, dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 },
            // draw right angles IB I_A, I_A CI with size 30
            {
                group: [
                    { id: 'rightIBIA', object: new XRightAngle(p, I, B, I_A, 30, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'rightIACI', object: new XRightAngle(p, I_A, C, I, 30, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // draw circum circle IBC (center M, radius MI)
            { id: 'circumIBC', object: XCircle(p, M, R_IBC, { color: '#00FFFF' }), animate: { mode: 'draw', duration: 2.0 } },
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
