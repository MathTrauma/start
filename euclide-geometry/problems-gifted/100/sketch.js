import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { intersectLines, reflectPoint, projectPointToLine } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XRightAngle, XDimension } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, M, N, Cp, E, H, P;
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본 점 정의 (사다리꼴 ABCD)
        A = p.createVector(0, 5);
        B = p.createVector(-1, 0);
        C = p.createVector(6, 0);
        D = p.createVector(6, 5);

        // 계산된 점
        // M: AB의 중점
        M = p5.Vector.add(A, B).div(2);

        // N: M을 지나고 AB에 수직인 직선과 CD의 교점
        const perpDir = p.createVector(5, -1);  // AB 방향 (-1,-5)의 수직
        const Mx = p.createVector(M.x + perpDir.x, M.y + perpDir.y);
        N = intersectLines(M, Mx, C, D);

        // C': C를 직선 MN에 대해 대칭
        Cp = reflectPoint(C, M, N);

        // E: 직선 AC'과 CD의 교점
        E = intersectLines(A, Cp, C, D);

        // H: A를 BC에 투영
        H = projectPointToLine(A, B, C);

        // P: BC 연장선 위의 점 (삼각형 BAH ~ BPM 닮음을 위해)
        // BP = 13 (닮음비로 계산)
        const BCdir = p5.Vector.sub(C, B).normalize();
        P = p5.Vector.add(B, BCdir.mult(13));

        // offset 슬라이딩 헬퍼 (팩토리 패턴 - 현재 offset에서 toOffset으로 이동)
        const createOffsetSliderFactory = (toOffset, duration) => {
            return () => {
                let elapsed = 0;
                let lastTime = null;
                let fromOffset = null;
                return (obj) => {
                    const now = performance.now();
                    if (lastTime === null) {
                        lastTime = now;
                        fromOffset = obj.offset;  // 첫 호출 시 현재 offset 저장
                    }
                    const dt = (now - lastTime) / 1000;
                    lastTime = now;
                    elapsed += dt;
                    const progress = Math.min(1, elapsed / duration);
                    obj.offset = fromOffset + (toOffset - fromOffset) * progress;
                    if (progress >= 1) {
                        obj.frameCallback = null;
                    }
                };
            };
        };

        // 레이블 자동 배치용 중심
        const center = p.createVector(
            (A.x + B.x + C.x + D.x) / 4,
            (A.y + B.y + C.y + D.y) / 4
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, D], size);

        // ===== Problem Phases =====

        // Phase 1: 사다리꼴 ABCD (폴리곤 AMBCND로 그림)
        animator.registerPhase('problem1', [
            { id: 'polyAMBCND', object: new XPolygon(p, [A, M, B, C, N, D]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'rightC', object: new XRightAngle(p, B, C, D, 15, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'rightD', object: new XRightAngle(p, C, D, A, 15, { pixel: true }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'dimAD', object: new XDimension(p, A, D, '6', { offset: 12 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimCD', object: new XDimension(p, C, D, '5', { offset: -12 }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'dimBC', object: new XDimension(p, B, C, '7', { offset: -12 }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // Phase 2: 접은 후의 모양
        animator.registerPhase('problem2', [
            // C'을 bounds에 추가
            { action: 'addToBounds', points: [Cp], duration: 0.8 },
            // 접는 선 MN (점선) || 접힌 변 A-C', C'-N
            {
                group: [
                    { id: 'MN', object: XSegment(p, M, N, { dashed: true, weight: 2 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'ACp', object: XSegment(p, A, Cp), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'CpN', object: XSegment(p, Cp, N), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // 점 M 라벨 || 직각 BMN || 점 N, E 라벨
            {
                group: [
                    { id: 'pointM', object: new XPoint(p, M, 'M', { dx: -15, dy: 0 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'rightBMN', object: new XRightAngle(p, B, M, N, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'pointN', object: new XPoint(p, N, 'N', { center }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // M-B-C-N 부분을 점선으로 (기존 폴리곤 숨기고 새로 그림)
            { id: 'polyAMBCND', action: 'hide' },
            {
                group: [
                    { id: 'segAM', object: XSegment(p, A, M), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'segMB', object: XSegment(p, M, B, { dashed: true, opacity: 0.5 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segBC', object: XSegment(p, B, C, { dashed: true, opacity: 0.5 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCN', object: XSegment(p, C, N, { dashed: true, opacity: 0.5 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segND', object: XSegment(p, N, D), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'segDA', object: XSegment(p, D, A), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'segEN', object: XSegment(p, E, N, { dashed: true, opacity: 0.5 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // 겹쳐진 부분 (핑크색)
            { id: 'overlap', object: new XPolygon(p, [M, N, E, A], { filled: true, fillColor: [255, 182, 193, 80] }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: H점 추가 및 치수 표시
        animator.registerPhase('solution1', [
            // 기존 치수 페이드 아웃
            { action: 'fade', targets: ['dimAD', 'dimCD', 'dimBC'], opacity: 0.3, duration: 0.7 },
            // AH 선분 그리기
            { id: 'segAH', object: XSegment(p, A, H), animate: { mode: 'draw', duration: 1.2 } },
            // H 라벨 || 직각 AHB
            {
                group: [
                    { id: 'pointH', object: new XPoint(p, H, 'H', { position: 'below' }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'rightAHB', object: new XRightAngle(p, A, H, B, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            // 치수 표시
            {
                group: [
                    { id: 'dimAH', object: new XDimension(p, A, H, '5', { offset: 12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAB', object: new XDimension(p, A, B, '√26', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBH', object: new XDimension(p, B, H, '1', { offset: 12 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: P점 추가 및 닮음 삼각형 표시
        animator.registerPhase('solution2', [
            // P를 bounds에 추가 || NP, CP 선분 그리기
            {
                group: [
                    { action: 'addToBounds', points: [P], duration: 1.0 },
                    { id: 'segNP', object: XSegment(p, N, P), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segCP', object: XSegment(p, C, P, { dashed: true }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { id: 'pointP', object: new XPoint(p, P, 'P', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            // 닮음 삼각형 그리기 (녹색)
            {
                group: [
                    { id: 'triBAH', object: new XPolygon(p, [B, A, H], { color: COLORS.green }), animate: { mode: 'draw', duration: 2.0 } },
                    { id: 'triBPM', object: new XPolygon(p, [B, P, M], { color: COLORS.green }), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            // travel BAH, BPM
            {
                group: [
                    { id: 'triBAH', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triBPM', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            // remove M
            { id: 'pointM', action: 'remove', duration: 0.3 },
            // BM 치수 표시
            { id: 'dimBM', object: new XDimension(p, B, M, '½√26', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
            // BP 치수 표시
            { id: 'dimBP', object: new XDimension(p, B, P, '13', { offset: -24 }), animate: { mode: 'draw', duration: 1.5 } },
            // CP 치수 표시
            { id: 'dimCP', object: new XDimension(p, C, P, '6', { offset: -12 }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 3: 치수 슬라이드 및 새 삼각형
        animator.registerPhase('solution3', [
            // hide dimAB || slide dimBM left
            {
                group: [
                    { id: 'dimAB', action: 'hide', duration: 0.5 },
                    { id: 'dimBM', setFrameCallbackFactory: createOffsetSliderFactory(12, 1.0) }
                ],
                parallel: true
            },
            // remove BAH, BPM
            {
                group: [
                    { id: 'triBAH', action: 'remove', duration: 0.5 },
                    { id: 'triBPM', action: 'remove', duration: 0.5 }
                ],
                parallel: true
            },
            // draw triangles EDA, ECP
            {
                group: [
                    { id: 'triEDA', object: new XPolygon(p, [E, D, A], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'triECP', object: new XPolygon(p, [E, C, P], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            // travel EDA, ECP
            {
                group: [
                    { id: 'triEDA', animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triECP', animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            // XDimension ED
            { id: 'dimED', object: new XDimension(p, E, D, '⁵⁄₂', { offset: -12 }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 1.0 },
            // hide segAH, dimAH, rightAHB, dimBH
            {
                group: [
                    { id: 'segAH', action: 'hide', duration: 0.5 },
                    { id: 'dimAH', action: 'hide', duration: 0.5 },
                    { id: 'rightAHB', action: 'hide', duration: 0.5 },
                    { id: 'dimBH', action: 'hide', duration: 0.5 }
                ],
                parallel: true
            },
            // draw segment ME dashed
            { id: 'segME', object: XSegment(p, M, E, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
            // draw right angle MEN
            { id: 'rightMEN', object: new XRightAngle(p, M, E, N, 15, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } }
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
