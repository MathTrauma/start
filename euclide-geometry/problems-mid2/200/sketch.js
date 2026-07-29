import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XText } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { intersectLines } from '../../lib/geometry.js';
import { COLORS } from '../../lib/config.js';

const sketch = (p) => {
    let O, A, B, C, D, E;
    let animator, size;

    p.setup = function() {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 기본점: O 중심, A/B/C는 반지름 2인 원 위
        O = p.createVector(0, 0);
        const r = 2;
        A = p.createVector(r * Math.cos(79 * Math.PI / 180), r * Math.sin(79 * Math.PI / 180));
        B = p.createVector(r * Math.cos(215 * Math.PI / 180), r * Math.sin(215 * Math.PI / 180));
        C = p.createVector(r * Math.cos(-35 * Math.PI / 180), r * Math.sin(-35 * Math.PI / 180));

        // 계산점
        // D: 직선 AO와 직선 BC의 교점
        D = intersectLines(A, O, B, C);
        // E: OD의 중점
        E = p5.Vector.add(O, D).mult(0.5);

        // 각도 마커 공통 옵션: arc 유지, 20% 멀리, 텍스트 50% 크게
        const AO = { keepArc: true, arcSize: 24, size: 18 };
        const AO22 = { ...AO, arcSize: 32 }; // 22° 소각은 더 멀리

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // Problem Phase 1: 삼각형 + 라벨 + 선분 OA,OB,OC
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'ptO', object: new XPoint(p, O, 'O', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptA', object: new XPoint(p, A, 'A', { center: O }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { center: O }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptC', object: new XPoint(p, C, 'C', { center: O }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segOA', object: XSegment(p, O, A), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segOB', object: XSegment(p, O, B), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segOC', object: XSegment(p, O, C), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Problem Phase 2: 각도 BAO=22°, ACO=33°, BOC=x°
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'angleBAO', object: new XAngleMarker(p, B, A, O, { marker: '22°', ...AO22 }), animate: { mode: 'draw', duration: 0.9 } },
                    { id: 'angleACO', object: new XAngleMarker(p, A, C, O, { marker: '33°', ...AO }), animate: { mode: 'draw', duration: 0.9 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'angleBOC', object: new XAngleMarker(p, B, O, C, { marker: 'x°', ...AO }), animate: { mode: 'draw', duration: 0.9 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 1: ghost BOC, OBA=22°, segOE, pulse, BOD=44°
        animator.registerPhase('solution1', [
            { id: 'angleBOC', action: 'fade', opacity: 0.3, duration: 0.5 },
            {
                group: [
                    { id: 'angleOBA', object: new XAngleMarker(p, O, B, A, { marker: '22°', ...AO22 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'segOE', object: XSegment(p, O, E), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            {
                group: [
                    { id: 'angleOBA', animate: { mode: 'pulse', duration: 1.6 } },
                    { id: 'angleBAO', animate: { mode: 'pulse', duration: 1.6 } },
                    { id: 'angleBOD', object: new XAngleMarker(p, B, O, D, { marker: '44°', ...AO }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: OAC=33°, pulse, BOD→66°, text
        animator.registerPhase('solution2', [
            { id: 'angleOAC', object: new XAngleMarker(p, O, A, C, { marker: '33°', ...AO }), animate: { mode: 'draw', duration: 0.8 } },
            { delay: 0.4 },
            {
                group: [
                    { id: 'angleOAC', animate: { mode: 'pulse', duration: 1.6 } },
                    { id: 'angleACO', animate: { mode: 'pulse', duration: 1.6 } },
                    { id: 'angleDOC', object: new XAngleMarker(p, D, O, C, { marker: '66°', ...AO }), animate: { mode: 'draw', duration: 1.0 } }
                ],
                parallel: true
            },
            { id: 'text1', object: new XText(p, [20, 25], 'x = 44+66 = 110', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } }
        ]);

        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
        });
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
