
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { getIncenter, getCircumcenter, projectPointToLine, intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XCircle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, I, D, E, P;
    let inradius, circumcenterIEC, circumradiusIEC;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(-1, 3);
        B = p.createVector(-2, 0);
        C = p.createVector(2, 0);

        // 계산된 점
        I = getIncenter(A, B, C);                    // 내심
        D = projectPointToLine(I, A, B);             // AB 위 접점
        E = projectPointToLine(I, B, C);             // BC 위 접점
        P = intersectLines(A, I, D, E);              // AI와 DE 교점
        inradius = p5.Vector.dist(I, D);             // 내접원 반지름

        // 외접원 (solution phase 3)
        circumcenterIEC = getCircumcenter(I, E, C);
        circumradiusIEC = p5.Vector.dist(circumcenterIEC, I);

        // 중심점 (레이블 자동 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // 텍스트 표시용 헬퍼 함수 (화면 좌표계)
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

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, P], size);

        // ===== Problem Phases =====

        // Problem Phase 1: 삼각형 ABC, 내접원, D/E 표시
        animator.registerPhase('problem1', [
            // 삼각형 ABC 그리기
            { id: 'triangleABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            // 점 A, B, C 표시
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 내접원 (E에서 시작, 반시계방향)
            { id: 'incircle', object: XCircle(p, I, inradius, { startPoint: E }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            // D, E 표시 (outside - 중심 반대쪽)
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // Problem Phase 2: 선분 AP, DP, IE, 직각 CEI
        animator.registerPhase('problem2', [
            // 선분 AP, DP
            {
                group: [
                    { id: 'segAP', object: XSegment(p, A, P), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segDP', object: XSegment(p, D, P), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'pointP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            // 선분 IE
            { id: 'segIE', object: XSegment(p, I, E), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 직각 CEI
            { id: 'rightCEI', object: new XRightAngle(p, C, E, I, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 각도 분석
        animator.registerPhase('solution1', [
            // 텍스트: ∠A = 2α, ∠B = 2β, ∠C = 2γ (좌상단)
            { id: 'textAngles', object: createTextDisplay('∠A = 2α, ∠B = 2β, ∠C = 2γ', 20), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.3 },
            // 선분 BE, BD (노란색)
            {
                group: [
                    { id: 'segBE', object: XSegment(p, B, E, { color: '#FFD700' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segBD', object: XSegment(p, B, D, { color: '#FFD700' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // pulse BE, BD + 각 BDE, DEB 마커
            {
                group: [
                    { id: 'segBE', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segBD', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleBDE', object: new XAngleMarker(p, B, D, E, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'angleDEB', object: new XAngleMarker(p, D, E, B, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 텍스트: ○ = 90° - β (다음 줄)
            { id: 'textMarkc', object: createTextDisplay('○ = 90° - β', 45), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.3 },
            // 각 PEC 마커
            { id: 'anglePEC', object: new XAngleMarker(p, P, E, C, { arcSize: 35, marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 2: 삼각형 IAC
        animator.registerPhase('solution2', [
            // 삼각형 IAC 채우기
            { id: 'triangleIAC', object: new XPolygon(p, [I, A, C], { filled: true, fillColor: [100, 150, 255, 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            // 점 I 표시
            { id: 'pointI', object: new XPoint(p, I, 'I', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            // 각 IAC (α), ACI (γ)
            {
                group: [
                    { id: 'angleIAC', object: new XAngleMarker(p, I, A, C, { arcSize: 30, marker: 'α' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleACI', object: new XAngleMarker(p, A, C, I, { arcSize: 30, marker: 'γ' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // 각 PIC (α + γ)
            { id: 'anglePIC', object: new XAngleMarker(p, P, I, C, { arcSize: 35, marker: 'α+γ' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 2.0 }
        ]);

        // Solution Phase 3: 공원점 증명
        animator.registerPhase('solution3', [
            // IEC 외접원
            { id: 'circumIEC', object: XCircle(p, circumcenterIEC, circumradiusIEC), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            // 선분 PC
            { id: 'segPC', object: XSegment(p, P, C), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            // travel IEC + 직각 CPI
            {
                group: [
                    { id: 'triangleIEC', object: new XPolygon(p, [I, E, C]), animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'rightCPI', object: new XRightAngle(p, C, P, I, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2',
                3: 'solution3'
            }
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

        if (animator) {
            animator.updateAndDraw();
        }

        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
