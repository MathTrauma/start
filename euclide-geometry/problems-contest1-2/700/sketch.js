import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { circleLineIntersection } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XSegmentMarker, XDimension } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, M, O, X, Y;
    let circleRadius;
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

        // 기본 점 정의 (animation.md 기반)
        // 스케일: 96 -> 9.6, 72 -> 7.2, 128 -> 12.8
        B = p.createVector(-3.6, 0);
        C = p.createVector(3.6, 0);

        // A 계산: |AB| = 9.6, |AC| = 7.2
        // (x + 3.6)² + y² = 92.16
        // (x - 3.6)² + y² = 51.84
        // x = 2.8, y = sqrt(51.2) ≈ 7.155
        const Ax = 2.8;
        const Ay = Math.sqrt(51.2);
        A = p.createVector(Ax, Ay);

        // D: AC를 C 너머로 연장, |AD| = 12.8
        const AC = p5.Vector.sub(C, A);
        const AClen = AC.mag();
        const ACdir = AC.copy().normalize();
        D = p5.Vector.add(A, p5.Vector.mult(ACdir, 12.8));

        // M: AB의 중점
        M = p5.Vector.add(A, B).mult(0.5);

        // 원 O: B에서 직선 AB에 접하고 C를 지나는 원
        // O는 B에서 AB에 수직인 직선 위에 있음
        const AB = p5.Vector.sub(B, A);
        const ABperp = p.createVector(-AB.y, AB.x).normalize();
        // O = B + t * ABperp, |OB| = |OC|
        // t² * 1 = |O - C|²
        // O - C = (B.x + t*ABperp.x - C.x, B.y + t*ABperp.y - C.y)
        // t² = (B.x - C.x + t*ABperp.x)² + (B.y - C.y + t*ABperp.y)²
        const dx = B.x - C.x;
        const dy = B.y - C.y;
        // t² = (dx + t*px)² + (dy + t*py)² where px = ABperp.x, py = ABperp.y
        // t² = dx² + 2*dx*t*px + t²*px² + dy² + 2*dy*t*py + t²*py²
        // t² = dx² + dy² + 2*t*(dx*px + dy*py) + t²*(px² + py²)
        // t² = dx² + dy² + 2*t*(dx*px + dy*py) + t²  (since px² + py² = 1)
        // 0 = dx² + dy² + 2*t*(dx*px + dy*py)
        // t = -(dx² + dy²) / (2*(dx*px + dy*py))
        const px = ABperp.x, py = ABperp.y;
        const t = -(dx * dx + dy * dy) / (2 * (dx * px + dy * py));
        O = p5.Vector.add(B, p5.Vector.mult(ABperp, t));
        circleRadius = p5.Vector.dist(O, B);

        // E: 직선 MD와 원 O의 교점 (D가 아닌 점)
        const intersections = circleLineIntersection(O, circleRadius, M, D);
        if (intersections.length === 2) {
            // D에서 더 먼 점이 E
            const d0 = p5.Vector.dist(intersections[0], D);
            const d1 = p5.Vector.dist(intersections[1], D);
            E = d0 > d1 ? p.createVector(intersections[0].x, intersections[0].y)
                        : p.createVector(intersections[1].x, intersections[1].y);
        } else {
            E = p.createVector(intersections[0].x, intersections[0].y);
        }

        // X: AB를 A 너머로 1.3배 연장, Y: AB를 B 너머로 1.3배 연장
        X = p5.Vector.sub(A, p5.Vector.mult(AB, 0.3));
        Y = p5.Vector.add(B, p5.Vector.mult(AB, 0.3));

        // 바운딩 박스 중심
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            // 삼각형 ABC 그리기
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
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
            // D 추가, CD 그리기, 원 O 그리기
            {
                group: [
                    { action: 'addToBounds', points: [D], duration: 2.0 },
                    { id: 'segCD', object: XSegment(p, C, D), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'circleO', object: XCircle(p, O, circleRadius), animate: { mode: 'draw', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 0.3 },
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 2.0 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            // M 표시 및 치수선, 마커
            {
                group: [
                    { id: 'pointM', object: new XPoint(p, M, 'M', { dx: -15, dy: 10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'dimAM', object: new XDimension(p, A, M, '48', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBM', object: new XDimension(p, M, B, '48', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimAC', object: new XDimension(p, A, C, '72'), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markAM', object: new XSegmentMarker(p, A, M, { mark: 2 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'markMB', object: new XSegmentMarker(p, M, B, { mark: 2 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // MD 그리기
            { id: 'segMD', object: XSegment(p, M, D), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.3 },
            { id: 'pointE', object: new XPoint(p, E, 'E', { dx: -15, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 1.0 },
            // AE 그리기
            { id: 'segAE', object: XSegment(p, A, E), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.3 },
            { id: 'dimAE', object: new XDimension(p, A, E, '60'), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 1 =====
        // 접현각과 방멱: AB² = AC · AD
        animator.registerPhase('solution1', [
            // AE, MD, dimAE fade
            {
                group: [
                    { id: 'segAE', action: 'fade', duration: 0.7 },
                    { id: 'segMD', action: 'fade', duration: 0.7 },
                    { id: 'dimAE', action: 'fade', duration: 0.7 }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // 삼각형 ABC 채우기 (접현각 CBA)
            { id: 'fillABC', object: new XPolygon(p, [A, B, C], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            { id: 'angleCBA', object: new XAngleMarker(p, C, B, A, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 삼각형 ADB 채우기 (접현각 ADB)
            { id: 'fillADB', object: new XPolygon(p, [A, D, B], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            { id: 'angleADB', object: new XAngleMarker(p, A, D, B, { arcSize: 30, marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.5 },
            // 텍스트
            { id: 'text1', object: createTextDisplay('AB² = AC · AD ⟹ AD = 128', 20), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            // 숨기기
            {
                group: [
                    { id: 'angleCBA', action: 'hide', duration: 2.0 },
                    { id: 'angleADB', action: 'hide', duration: 2.0 },
                    { id: 'fillABC', action: 'hide', duration: 2.0 },
                    { id: 'fillADB', action: 'hide', duration: 2.0 }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 2 =====
        // 방멱: MB² = ME · MD
        animator.registerPhase('solution2', [
            // 삼각형 MBE 채우기
            { id: 'fillMBE', object: new XPolygon(p, [M, B, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            { id: 'angleEBM', object: new XAngleMarker(p, E, B, M, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.3 },
            // 삼각형 MDB 채우기
            { id: 'fillMDB', object: new XPolygon(p, [M, D, B], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 0.5 },
            { id: 'angleMDB', object: new XAngleMarker(p, M, D, B, { arcSize: 30, marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
            { delay: 0.5 },
            // 텍스트
            { id: 'text2', object: createTextDisplay('MB² = ME · MD', 45), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            // 숨기기
            {
                group: [
                    { id: 'angleEBM', action: 'hide', duration: 2.0 },
                    { id: 'angleMDB', action: 'hide', duration: 2.0 },
                    { id: 'fillMBE', action: 'hide', duration: 2.0 },
                    { id: 'fillMDB', action: 'hide', duration: 2.0 }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 3 =====
        // MA = MB 이므로 MA² = ME · MD → 삼각형 AED의 외접원 접선
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
            // MD, dimAE recover
            {
                group: [
                    { id: 'segMD', action: 'recover', duration: 1.0 },
                    { id: 'dimAE', action: 'recover', duration: 1.0 }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // MA, MB pulse
            {
                group: [
                    { id: 'markAM', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'markMB', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'dimAM', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'dimBM', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 텍스트
            { id: 'text3', object: createTextDisplay('MA² = ME · MD', 70), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 },
            // X, Y를 bounds에 추가하면서 외접원 AED 그리기
            {
                group: [
                    { action: 'addToBounds', points: [X, Y], duration: 1.7 },
                    { id: 'circumAED', object: XCircle(p, circumAED.center, circumAED.radius, { color: '#FFD700' }), animate: { mode: 'draw', duration: 1.7 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 4 =====
        // 접선-할선 닮음: AM : AE = MD : AD
        // travel 범위 계산 (열린 경로: M→A→E, M→D→A)
        const distMA = p5.Vector.dist(M, A);
        const distAE = p5.Vector.dist(A, E);
        const distEM = p5.Vector.dist(E, M);
        const perimeterMAE = distMA + distAE + distEM;
        const travelMAE_mid = distMA / perimeterMAE;
        const travelMAE_end = (distMA + distAE) / perimeterMAE;

        const distMD = p5.Vector.dist(M, D);
        const distDA = p5.Vector.dist(D, A);
        const distAM = p5.Vector.dist(A, M);
        const perimeterMDA = distMD + distDA + distAM;
        const travelMDA_mid = distMD / perimeterMDA;
        const travelMDA_end = (distMD + distDA) / perimeterMDA;

        animator.registerPhase('solution4', [
            // 삼각형 MAE, MDA 채우기
            {
                group: [
                    { id: 'fillMAE', object: new XPolygon(p, [M, A, E], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.6 } },
                    { id: 'fillMDA', object: new XPolygon(p, [M, D, A], { filled: true, fillColor: [...p.theme.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.6 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 각 MAE, ADM 표시
            {
                group: [
                    { id: 'angleMAE', object: new XAngleMarker(p, M, A, E, { arcSize: 25, marker: 'dot' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleADM', object: new XAngleMarker(p, A, D, M, { arcSize: 30, marker: 'dot' }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 첫 번째 travel (M→A, M→D) + pulse
            {
                group: [
                    { id: 'angleMAE', animate: { mode: 'pulse', duration: 0.75 } },
                    { id: 'angleADM', animate: { mode: 'pulse', duration: 0.75 } },
                    { id: 'fillMAE', animate: { mode: 'travel', duration: 0.75, from: 0, to: travelMAE_mid } },
                    { id: 'fillMDA', animate: { mode: 'travel', duration: 0.75, from: 0, to: travelMDA_mid } }
                ],
                parallel: true
            },
            // 두 번째 travel (A→E, D→A) + pulse
            {
                group: [
                    { id: 'angleMAE', animate: { mode: 'pulse', duration: 0.75 } },
                    { id: 'angleADM', animate: { mode: 'pulse', duration: 0.75 } },
                    { id: 'fillMAE', animate: { mode: 'travel', duration: 0.75, from: travelMAE_mid, to: travelMAE_end } },
                    { id: 'fillMDA', animate: { mode: 'travel', duration: 0.75, from: travelMDA_mid, to: travelMDA_end } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            // 최종 결과 텍스트
            { id: 'text4', object: createTextDisplay('AM : AE = MD : AD ⟹ DE = 79.9', 95), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 2.0 }
        ]);

        // phaseMap 설정
        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2', 3: 'solution3', 4: 'solution4' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 4
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
