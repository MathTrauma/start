
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, getCircumcenter, circleLineIntersection } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XCircle, XAngleMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, G;
    let animator;
    let O1, O2;  // 원의 중심들
    let radiusO1, radiusO2;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        A = p.createVector(0, 3);
        B = p.createVector(-2.3, -1.9);
        C = p.createVector(2.3, -1.9);

        // D: AC를 5:2로 내분하는 점 (AD:DC = 5:2)
        D = p5.Vector.add(A, p5.Vector.sub(C, A).mult(5 / 7));

        // E: BD 위의 점, DE = DC (tikz 방식)
        const DC = p5.Vector.dist(D, C);
        const dirBD = p5.Vector.sub(D, B).normalize();
        E = p5.Vector.add(D, dirBD.mult(-DC));  // D에서 B 방향으로 DC만큼

        // O1: BD의 E에서의 수선과 AC의 C에서의 수선의 교점
        const dirBD2 = p5.Vector.sub(D, B);
        const perpBD = p.createVector(-dirBD2.y, dirBD2.x);
        const E_perp = p5.Vector.add(E, perpBD);

        const dirAC = p5.Vector.sub(C, A);
        const perpAC = p.createVector(-dirAC.y, dirAC.x);
        const C_perp = p5.Vector.add(C, perpAC);

        O1 = intersectLines(E, E_perp, C, C_perp);
        radiusO1 = p5.Vector.dist(O1, C);

        // F: 직선 AE와 원 O1의 교점 (E가 아닌 점)
        const intersectionsAE = circleLineIntersection(O1, radiusO1, A, E);
        F = intersectionsAE.find(pt => p5.Vector.dist(pt, E) > 0.1) || intersectionsAE[1];

        // O2: 삼각형 ABF의 외접원 중심
        O2 = getCircumcenter(A, B, F);
        radiusO2 = p5.Vector.dist(O2, A);

        // G: 직선 AC와 원 O2의 교점 (A가 아닌 점)
        const intersectionsAC = circleLineIntersection(O2, radiusO2, A, C);
        G = intersectionsAC.find(pt => p5.Vector.dist(pt, A) > 0.1) || intersectionsAC[1];

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        const t = p.theme;

        // 텍스트 표시용 헬퍼 객체 생성 함수
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

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phases =====

        // Phase 1: 삼각형 ABC와 점 D
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
            { delay: 1.0 },
            { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 }
        ]);

        // Phase 2: 접원
        animator.registerPhase('problem2', [
            { action: 'addToBounds', points: [F], duration: 1.5 },
            { id: 'circleO1', object: XCircle(p, O1, radiusO1), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'segAF', object: XSegment(p, A, F), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // Phase 3: 외접원 ABF
        animator.registerPhase('problem3', [
            { action: 'setBounds', points: [A, B, C, F, G], replace: true, duration: 1.2 },
            { id: 'circleO2', object: XCircle(p, O2, radiusO2, { color: t.auxiliary || [150, 150, 150] }), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'segCG', object: XSegment(p, C, G), animate: { mode: 'draw', duration: 1.0 } },
            { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 }
        ]);

        // ===== Solution Phases =====

        // 삼각형 BEF의 외접원
        const O_BEF = getCircumcenter(B, E, F);
        const radius_BEF = p5.Vector.dist(O_BEF, B);

        // Solution Phase 1: 방멱 관계
        const yellowColor = [251, 191, 36];  // #fbbf24
        animator.registerPhase('solution1', [
            // 텍스트 표시
            { id: 'text1', object: createTextDisplay('AC² = AE·AF', 20), animate: { mode: 'draw', duration: 1.0 } },
            // pulse AC and AB
            {
                group: [
                    { id: 'segAC', object: XSegment(p, A, C), animate: { mode: 'draw', duration: 0.1 } },
                    { id: 'segAB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 0.1 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segAC', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'segAB', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'text2', object: createTextDisplay('AE·AF = AB²', 45), animate: { mode: 'draw', duration: 1.0 } },
            // 삼각형 BEF의 외접원 (노란색)
            { id: 'circleBEF', object: XCircle(p, O_BEF, radius_BEF, { color: yellowColor }), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'angleEBA', object: new XAngleMarker(p, E, B, A, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleAFB', object: new XAngleMarker(p, A, F, B, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // Solution Phase 2: 보조선
        animator.registerPhase('solution2', [
            { action: 'fadeAll', opacity: 0.4, duration: 0.5, exclude: ['circleBEF', 'angleEBA', 'angleAFB', 'pointB', 'pointE', 'pointF'] },
            {
                group: [
                    { id: 'segBG', object: XSegment(p, B, G, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBF', object: XSegment(p, B, F, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleAGB', object: new XAngleMarker(p, A, G, B, { arcSize: 25, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleAFB', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.5 },
            { id: 'segFG', object: XSegment(p, F, G, { dashed: true, weight: 1 }), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'angleBGF', object: new XAngleMarker(p, B, G, F, { arcSize: 35, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleBAE', object: new XAngleMarker(p, B, A, E, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segFG', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // Solution Phase 3: 결론
        animator.registerPhase('solution3', [
            { id: 'angleDEA', object: new XAngleMarker(p, D, E, A, { arcSize: 30, marker: '△+○', size: 14 }), animate: { mode: 'draw', duration: 0.5 } },
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
