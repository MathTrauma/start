
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XCircle } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, O;
    let animator;

    // 텍스트 오버레이 헬퍼 (화면 좌표 사용)
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
        A = p.createVector(0, 4);
        C = p.createVector(0, 0);

        // B: y=0, x<0, ∠BAC = 24°
        const angleBAC = 24 * Math.PI / 180;
        B = p.createVector(-4 * Math.tan(angleBAC), 0);

        // D: y=4, ∠DBC = 22°
        // BC 벡터: B→C 방향 = (|B.x|, 0), 오른쪽 방향
        // D는 A의 오른쪽에 위치 (D.x > 0)
        const angleDBC = 22 * Math.PI / 180;
        D = p.createVector(4 / Math.tan(angleDBC) + B.x, 4);

        // E: AC와 BD의 교점
        E = intersectLines(A, C, B, D);

        // O: DE의 중점 (삼각형 DAE의 외심, ∠DAE=90°이므로)
        O = p5.Vector.add(D, E).div(2);

        // 바운딩 박스 중심
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            // 삼각형 ABC 그리기 (nofill)
            { id: 'triangleABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
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
            // 직각 ACB 표시
            { id: 'rightACB', object: new XRightAngle(p, A, C, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.5 },
            // 선분 AD 그리기
            { id: 'AD', object: XSegment(p, A, D), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 직각 CAD 표시
            { id: 'rightCAD', object: new XRightAngle(p, C, A, D, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.5 },
            // 선분 BD 그리기
            { id: 'BD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 15, dy: 0 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1: 외접원 =====
        animator.registerPhase('solution1', [
            // 삼각형 DAE 채우기
            { id: 'triangleDAE', object: new XPolygon(p, [D, A, E], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            // 외접원 그리기 (중심 O, 반지름 OD)
            { id: 'circumCircle', object: XCircle(p, O, p5.Vector.dist(O, D)), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            // 점 O 표시 및 반지름 그리기 (병렬)
            {
                group: [
                    { id: 'pointO', object: new XPoint(p, O, 'O', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'OA', object: XSegment(p, O, A, { color: '#FFCC00' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'OD', object: XSegment(p, O, D, { color: '#FFCC00' }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'OE', object: XSegment(p, O, E, { color: '#FFCC00' }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.5 },
            // 각 ADE, OAD with marker θ
            {
                group: [
                    { id: 'angleADE', object: new XAngleMarker(p, A, D, E, { arcSize: 30, marker: 'θ' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleOAD', object: new XAngleMarker(p, O, A, D, { arcSize: 25, marker: 'θ' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 각 AOE with marker 2θ
            { id: 'angleAOE', object: new XAngleMarker(p, A, O, E, { arcSize: 35, marker: '2θ' }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 2: 이등변삼각형 =====
        animator.registerPhase('solution2', [
            // fade all except angle AOE
            { action: 'fadeAll', opacity: 0.4, exclude: ['angleAOE'], duration: 1.5 },
            { delay: 0.3 },
            // AO, AB 강조 (green) || 텍스트 (병렬)
            {
                group: [
                    { id: 'AO_green', object: XSegment(p, A, O, { color: '#00FF00', weight: 3 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'AB_green', object: XSegment(p, A, B, { color: '#00FF00', weight: 3 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'textCondition', object: createTextDisplay('2×AB = DE', 20), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // pulse
            {
                group: [
                    { id: 'AO_green', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'AB_green', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 삼각형 ABO 채우기
            { id: 'triangleABO', object: new XPolygon(p, [A, B, O], { filled: true, fillColor: [255, 200, 100, 80] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            // 각 DBA with marker 2θ
            { id: 'angleDBA', object: new XAngleMarker(p, D, B, A, { arcSize: 30, marker: '2θ' }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 3: 최종 계산 =====
        animator.registerPhase('solution3', [
            // fade all[except DBA] || unfade ADE || remove[ABO]
            {
                group: [
                    { action: 'fadeAll', opacity: 0.4, exclude: ['angleDBA'], duration: 1.0 },
                    { id: 'angleADE', set: { opacity: 1 } },
                    { id: 'triangleABO', action: 'remove' }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 삼각형 ABD 그리기
            { id: 'triangleABD', object: new XPolygon(p, [A, B, D]), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            // 각 BAD (= 114°) 표시
            { id: 'angleBAD', object: new XAngleMarker(p, B, A, D, { arcSize: 40, marker: '114°' }), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.5 },
            // 텍스트: 3θ + 114° = 180° (화면 좌상단, 두 번째 줄)
            { id: 'textEquation', object: createTextDisplay('3θ + 114° = 180°', 45), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1'
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
            problemPhaseCount: 1,
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
