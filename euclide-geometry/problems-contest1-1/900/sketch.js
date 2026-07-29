import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XObject, XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XText } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';
import { projectPointToLine } from '../../lib/geometry.js';

const sketch = (p) => {
    const R = 2;
    const START_T = 20 * Math.PI / 180;
    const END_T = 33 * Math.PI / 180;

    let A, B, O;          // 고정점
    let C, D, O1, T_pt;   // 동점 (t에 의존)
    let r1;                // O1 반지름
    let t = START_T;
    let animator;

    // 열린 호 생성 (중심 꼭짓점 없음, closed: false)
    const createOpenArc = (center, radius, startAngle, endAngle, opts = {}) => {
        const segments = opts.segments || 32;
        const vertices = [];
        const angleDiff = endAngle - startAngle;
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (i / segments) * angleDiff;
            vertices.push(p.createVector(
                center.x + Math.cos(angle) * radius,
                center.y + Math.sin(angle) * radius
            ));
        }
        return new XPolygon(p, vertices, { ...opts, closed: false });
    };

    // 호 꼭짓점 동적 갱신
    const updateArcVertices = (obj, center, radius, startAngle, endAngle) => {
        const segments = obj.vertices.length - 1;
        const angleDiff = endAngle - startAngle;
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (i / segments) * angleDiff;
            obj.vertices[i].set(
                center.x + Math.cos(angle) * radius,
                center.y + Math.sin(angle) * radius
            );
        }
        obj._perimeterDirty = true;
    };

    // 폴리곤 꼭짓점 동기화
    const syncVertices = (obj, ...vecs) => {
        if (!obj) return;
        vecs.forEach((v, i) => obj.vertices[i] && obj.vertices[i].set(v));
        obj._perimeterDirty = true;
    };

    // t로부터 모든 동점 재계산
    const computeAll = () => {
        C.set(R * Math.cos(t), R * Math.sin(t));
        const sinHalf = Math.sin(t / 2);
        const h = 2 * (1 - sinHalf) / (1 + sinHalf);
        r1 = 2 - h;
        O1.set(h, 0);
        D.set(2 * h - 2, 0);
        const proj = projectPointToLine(O1, A, C);
        T_pt.set(proj.x, proj.y);
    };

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 고정점
        A = p.createVector(-R, 0);
        B = p.createVector(R, 0);
        O = p.createVector(0, 0);

        // 동점 (mutable)
        C = p.createVector(0, 0);
        D = p.createVector(0, 0);
        O1 = p.createVector(0, 0);
        T_pt = p.createVector(0, 0);

        // 초기 상태 계산 (t = START_T)
        computeAll();

        animator = new XAnimator(p);
        animator.initViewport([A, B, p.createVector(0, R)], size, 50);

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            { id: 'segAB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dx: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'arcO', object: createOpenArc(O, R, 0, Math.PI), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'lineACB', object: new XPolygon(p, [A, C, B], { closed: false }), animate: { mode: 'draw', duration: 1.8 } },
            { id: 'ptC', object: new XPoint(p, C, 'C', { dx: 10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } },
            { delay: 0.5 },
            { id: 'arcO1', object: createOpenArc(O1, r1, 0, Math.PI), animate: { mode: 'draw', duration: 1.7 } },
            {
                group: [
                    { id: 'ptD', object: new XPoint(p, D, 'D', { dy: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptT', object: new XPoint(p, T_pt, 'T', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { id: 'segTB', object: XSegment(p, T_pt, B), animate: { mode: 'draw', duration: 1.1 } },
            { delay: 0.3 },
            {
                group: [
                    { id: 'angleCBT', object: new XAngleMarker(p, C, B, T_pt, { marker: 'y°' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleTBA', object: new XAngleMarker(p, T_pt, B, A, { marker: 'x°' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            { id: 'text1', object: new XText(p, [20, 25], 'x = y \\; ?', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.5 }
        ]);

        // ===== Problem Phase 2: t 애니메이션 (20° → 33°) =====
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: '_driver', object: new XObject(p), animate: { mode: 'default', duration: 3.0, from: 0, to: 1 } },
                    { id: '_driver', setFrameCallback: (self) => {
                        t = START_T + (END_T - START_T) * self.progress;
                        computeAll();
                    }},
                    // XPolygon 계열: 꼭짓점 수동 동기화
                    { id: 'lineACB', setFrameCallback: (obj) => syncVertices(obj, A, C, B) },
                    { id: 'arcO1', setFrameCallback: (obj) => updateArcVertices(obj, O1, r1, 0, Math.PI) },
                    { id: 'segTB', setFrameCallback: (obj) => syncVertices(obj, T_pt, B) }
                    // XPoint, XAngleMarker: 공유 벡터 참조이므로 자동 갱신
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // Solution phases는 t=END_T 상태에서 XPolygon 생성 (복사된 꼭짓점이 올바르도록)
        t = END_T;
        computeAll();

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            {
                group: [
                    { id: 'rightTCB', object: new XRightAngle(p, T_pt, C, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleBTC', object: new XAngleMarker(p, B, T_pt, C, { marker: 'z°' }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'text2', object: new XText(p, [20, 50], 'y + z = 90^\\circ', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'triBCT', object: new XPolygon(p, [B, C, T_pt]), animate: { mode: 'travel', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            { id: 'segDT', object: XSegment(p, D, T_pt), animate: { mode: 'draw', duration: 1.1 } },
            {
                group: [
                    { id: 'angleBTC', animate: { mode: 'pulse', duration: 3.0 } },
                    {
                        group: [
                            {
                                group: [
                                    { id: 'rightDTB', object: new XRightAngle(p, D, T_pt, B, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.7 } },
                                    { id: 'angleBDT', object: new XAngleMarker(p, B, D, T_pt, { marker: 'z°' }), animate: { mode: 'draw', duration: 0.7 } }
                                ],
                                parallel: true
                            },
                            {
                                group: [
                                    { delay: 1.0 },
                                    { id: 'angleBDT', animate: { mode: 'pulse', duration: 2.0 } }
                                ],
                                parallel: false
                            }
                        ],
                        parallel: true
                    }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'triBTD', object: new XPolygon(p, [B, T_pt, D]), animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'text3', object: new XText(p, [20, 75], 'x + z = 90^\\circ', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // 초기 상태로 복원 (problem1이 t=START_T에서 시작하도록)
        t = START_T;
        computeAll();

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
