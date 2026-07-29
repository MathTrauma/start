
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, getIncenter, circleLineIntersection } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, I, O, D, E, F;
    let animator;
    let circumO, circumR;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        B = p.createVector(0, 0);
        C = p.createVector(8, 0);
        A = p.createVector(2, 5);

        // I: 삼각형 ABC의 내심
        I = getIncenter(A, B, C);

        // CI에 접하는 원의 중심 O 계산
        // 조건: CI가 외접원에 접함 => O에서 CI까지의 거리 = OI
        // AI의 수직이등분선과 CI에 수직인 직선 I의 교점
        const midAI = p5.Vector.add(A, I).div(2);
        const dirAI = p5.Vector.sub(I, A);
        const perpAI = p.createVector(-dirAI.y, dirAI.x);
        const perpAI_point = p5.Vector.add(midAI, perpAI);

        const dirCI = p5.Vector.sub(I, C);
        const perpCI = p.createVector(-dirCI.y, dirCI.x);
        const perpCI_point = p5.Vector.add(I, perpCI);

        O = intersectLines(midAI, perpAI_point, I, perpCI_point);
        circumR = p5.Vector.dist(O, I);

        // D: 직선 AB와 원 O의 교점 (A가 아닌 점)
        const intersectionsAB = circleLineIntersection(O, circumR, A, B);
        D = intersectionsAB.find(pt => p5.Vector.dist(pt, A) > 0.1) || intersectionsAB[1];

        // E: 직선 AC와 원 O의 교점 (A가 아닌 점)
        const intersectionsAC = circleLineIntersection(O, circumR, A, C);
        E = intersectionsAC.find(pt => p5.Vector.dist(pt, A) > 0.1) || intersectionsAC[1];

        // F: 직선 AC와 원 I(중심 I, 반지름 IE)의 교점 (E가 아닌 점)
        const radiusIE = p5.Vector.dist(I, E);
        const intersectionsIE = circleLineIntersection(I, radiusIE, A, C);
        F = intersectionsIE.find(pt => p5.Vector.dist(pt, E) > 0.1) || intersectionsIE[1];

        // CI 연장점 (I에서 CI 방향으로 CI 길이의 절반만큼 연장)
        const I_ext = p5.Vector.add(I, p5.Vector.mult(dirCI, 0.5));

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D, E, F], size);

        // ===== Problem Phases =====

        // Phase 1: 삼각형 ABC와 내심 I
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // CI 연장선 (dashed, I 너머로 연장)
            { id: 'lineCI', object: XSegment(p, C, I_ext, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.2 },
            { id: 'pointI', object: new XPoint(p, I, 'I', { dx: 10, dy: 10 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // Phase 2: 삼각형 ADI의 외접원
        animator.registerPhase('problem2', [
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            { id: 'circleADI', object: XCircle(p, O, circumR, { color: p.theme.auxiliary || [100, 150, 255] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            // 접선 표시 (CI가 원에 접함)
            { id: 'lineCI', animate: { mode: 'pulse', duration: 1.0 } },
            { delay: 1.0 }
        ]);

        // Phase 3: 점 E와 원 I
        animator.registerPhase('problem3', [
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.3 },
            { id: 'circleI', object: XCircle(p, I, p5.Vector.dist(I, E), { color: [255, 100, 100] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        const t = p.theme;
        const redColor = [255, 100, 100];

        // Solution Phase 1: 각도와 선분 분석
        animator.registerPhase('solution1', [
            // circle I fade (progress 0.8 = 20% opacity)
            { id: 'circleI', animate: { mode: 'fadeOut', duration: 0.5, to: 0.8 } },
            // 새 bounding box [A, D, I, E]
            { action: 'setBounds', points: [A, D, I, E], replace: true, duration: 1.5 },
            // 선분 AI
            { id: 'segAI', object: XSegment(p, A, I), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 각 DAI, IAF (IAC)
            {
                group: [
                    { id: 'angleDAI', object: new XAngleMarker(p, D, A, I, { arcSize: 25, marker: 'dot' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleIAF', object: new XAngleMarker(p, I, A, F, { arcSize: 35, marker: 'dot' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 선분 ID, IE 빨간색
            {
                group: [
                    { id: 'segID', object: XSegment(p, I, D, { color: redColor, weight: 2 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segIE', object: XSegment(p, I, E, { color: redColor, weight: 2 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // pulse ID, IE
            {
                group: [
                    { id: 'segID', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'segIE', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            // 선분 IF 빨간색
            { id: 'segIF', object: XSegment(p, I, F, { color: redColor, weight: 2 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.5 }
        ]);

        // Solution Phase 2: 외접원과 접선 관계
        animator.registerPhase('solution2', [
            // pulse 5초 동안, 2초 후 삼각형 그리기 시작
            {
                group: [
                    // pulse circle ADI와 line CI (5초)
                    { id: 'circleADI', animate: { mode: 'pulse', duration: 5.0 } },
                    { id: 'lineCI', animate: { mode: 'pulse', duration: 5.0 } },
                    // 2초 대기 후 삼각형 AIE 그리기
                    {
                        group: [
                            { delay: 2.0 },
                            { id: 'triAIE', object: new XPolygon(p, [A, I, E]), animate: { mode: 'draw', duration: 1.0 } },
                            { id: 'triAIE', animate: { mode: 'travel', duration: 1.0 } },
                            { id: 'angleCIE', object: new XAngleMarker(p, C, I, E, { arcSize: 30, marker: 'dot' }), animate: { mode: 'draw', duration: 1.0 } }
                        ]
                    }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // Solution Phase 3: 닮음 삼각형
        animator.registerPhase('solution3', [
            // 각 AFI, IEC with triangle marker
            {
                group: [
                    { id: 'angleAFI', object: new XAngleMarker(p, A, F, I, { arcSize: 25, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'angleIEC', object: new XAngleMarker(p, I, E, C, { arcSize: 35, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            // 새 bounding box [A, D, C]
            { action: 'setBounds', points: [A, D, C], replace: true, duration: 1.5 },
            // 삼각형 AFI, IEC 채우기
            {
                group: [
                    { id: 'triAFI', object: new XPolygon(p, [A, F, I], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triIEC', object: new XPolygon(p, [I, E, C], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2',
                3: 'problem3'
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
            problemPhaseCount: 3,
            solutionPhaseCount: 3
        });

        // Phase 시퀀스 자동 실행
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
