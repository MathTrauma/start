
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, projectPointToLine, circleLineIntersection } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XRightAngle, XAngleMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, H, M, N;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의
        B = p.createVector(0, 0);
        C = p.createVector(6, 0);

        // 보조점 계산 (tikz 스타일)
        const a = p.createVector(3 * Math.cos(120 * Math.PI / 180), 3 * Math.sin(120 * Math.PI / 180));
        const x = p.createVector(9, 0);

        // X = C에서 x를 156도 회전
        const xRelC = p5.Vector.sub(x, C);
        const angle156 = 156 * Math.PI / 180;
        const X = p.createVector(
            C.x + xRelC.x * Math.cos(angle156) - xRelC.y * Math.sin(angle156),
            C.y + xRelC.x * Math.sin(angle156) + xRelC.y * Math.cos(angle156)
        );

        // A = 직선 aB와 직선 CX의 교점
        A = intersectLines(a, B, C, X);

        // D = 직선 AC와 원(A, |AB|)의 교점
        const radiusAB = p5.Vector.dist(A, B);
        const intersections = circleLineIntersection(A, radiusAB, A, C);
        // D는 A와 C 사이에 있는 점 (A가 아닌 점)
        D = intersections.find(pt => p5.Vector.dist(pt, A) > 0.1 && p5.Vector.dist(pt, C) < p5.Vector.dist(A, C));
        if (!D) D = intersections[1]; // fallback

        // M = BC의 중점
        M = p5.Vector.add(B, C).div(2);

        // H = A에서 BD에 내린 수선의 발
        H = projectPointToLine(A, B, D);

        // E = D에서 BC에 내린 수선의 발 (BC가 x축이므로 간단)
        E = p.createVector(D.x, 0);

        // N = DC의 중점
        N = p5.Vector.add(D, C).div(2);

        // 중심점 (레이블 배치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size);

        // ===== Problem Phases =====

        // Phase 1: 삼각형 ABC와 기본 점들
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 0.2 },
            { id: 'segBD', object: XSegment(p, B, D), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.2 },
            { id: 'segAH', object: XSegment(p, A, H), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'pointH', object: new XPoint(p, H, 'H', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            { id: 'rightAHB', object: new XRightAngle(p, A, H, B, 0.3), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.5 }
        ]);

        // Phase 2: 수선 DE와 중점 M
        animator.registerPhase('problem2', [
            { id: 'segDE', object: XSegment(p, D, E), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.2 },
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'rightDEB', object: new XRightAngle(p, D, E, B, 0.3), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            { id: 'pointM', object: new XPoint(p, M, 'M', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

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

        // Solution Phase 1: 각 표시
        animator.registerPhase('solution1', [
            { id: 'angleDCM', object: new XAngleMarker(p, D, C, M, { marker: 'dot' }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleEBD', object: new XAngleMarker(p, E, B, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'angleHBA', object: new XAngleMarker(p, H, B, A, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'angleADH', object: new XAngleMarker(p, A, D, H, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'text1', object: createTextDisplay('○ + ▲ = 5 × ●', 20), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'text2', object: createTextDisplay('○ + ● = ▲', 45), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 },
            { id: 'text3', object: createTextDisplay('○ = 2 × ●', 70), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.5 }
        ]);

        // Solution Phase 2: 중점 N과 선분들
        animator.registerPhase('solution2', [
            { id: 'text1', action: 'remove' },
            { id: 'text2', action: 'remove' },
            { id: 'text3', action: 'remove' },
            { id: 'pointN', object: new XPoint(p, N, 'N', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.2 },
            {
                group: [
                    { id: 'segEN', object: XSegment(p, E, N), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'segMN', object: XSegment(p, M, N), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'segDN', object: XSegment(p, D, N, { dashed: true }), animate: { mode: 'draw', duration: 0.1 } },
            { id: 'segCN', object: XSegment(p, C, N, { dashed: true }), animate: { mode: 'draw', duration: 0.1 } },
            {
                group: [
                    { id: 'segDN', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'segCN', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'segEN', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'angleCEN', object: new XAngleMarker(p, C, E, N, { arcSize: 30, marker: 'dot' }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 3: 삼각형과 최종 비교
        animator.registerPhase('solution3', [
            { id: 'segDN', action: 'remove' },
            { id: 'segCN', action: 'remove' },
            {
                group: [
                    { id: 'triCMN', object: new XPolygon(p, [C, M, N], { filled: true, fillColor: [100, 150, 255, 80] }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'triCBD', object: new XPolygon(p, [C, B, D], { filled: true, fillColor: [255, 150, 100, 80] }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triCMN', animate: { mode: 'travel', duration: 1.0 } },
                    { id: 'triCBD', animate: { mode: 'travel', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'angleCMN', object: new XAngleMarker(p, C, M, N, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.5 },
            { id: 'angleENM', object: new XAngleMarker(p, E, N, M, { arcSize: 30, marker: 'dot' }), animate: { mode: 'draw', duration: 0.3 } },
            {
                group: [
                    { id: 'segEM', object: XSegment(p, E, M, { weight: 3 }), animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'segMN', animate: { mode: 'pulse', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'segMN', animate: { mode: 'pulse', duration: 1.0 } },
                    { id: 'segBD', animate: { mode: 'pulse', duration: 1.0 } }
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
