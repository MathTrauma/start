import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XRightAngle, XDimension, XText } from '../../lib/x_object.js';
import { COLORS } from '../../lib/config.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let animator;

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 점 정의
        const O = p.createVector(0, 0);
        const O1 = p.createVector(-3, 0);
        const r = 6, r1 = 3;
        const A = p.createVector(6, 0);
        const B = p.createVector(-6, 0);

        // 접선 계산: A에서 O₁에 접하는 직선
        // cosθ = 1/3, sinθ = 2√2/3
        const P = p.createVector(-2, 2 * Math.SQRT2);

        // Q: 직선 AP와 원 O의 교점 (A 아닌 쪽)
        // 매개변수 t = 4/3
        const Q = p.createVector(-14 / 3, 8 * Math.SQRT2 / 3);

        // arc 헬퍼
        const createOpenArc = (center, radius, startDeg, endDeg, opts = {}) => {
            const startAngle = startDeg * Math.PI / 180;
            const endAngle = endDeg * Math.PI / 180;
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

        // duplicate 이동 헬퍼: 공유 점 + polygon vertices 동기화
        const createDupTranslatorFactory = (sharedPts, origPts, dxScreen, dyScreen, duration) => {
            return () => {
                let elapsed = 0, lastTime = null;
                const scale = p.geometryScale;
                const dxMath = dxScreen / scale;
                const dyMath = dyScreen / scale;
                return (obj) => {
                    const now = performance.now();
                    if (!lastTime) lastTime = now;
                    elapsed += (now - lastTime) / 1000;
                    lastTime = now;
                    const t = Math.min(1, elapsed / duration);
                    // 공유 점 업데이트 (angle marker가 참조)
                    sharedPts.forEach((pt, i) => {
                        pt.x = origPts[i].x + dxMath * t;
                        pt.y = origPts[i].y + dyMath * t;
                    });
                    // polygon vertices 동기화
                    sharedPts.forEach((pt, i) => {
                        if (obj.vertices[i]) {
                            obj.vertices[i].x = pt.x;
                            obj.vertices[i].y = pt.y;
                        }
                    });
                    obj._perimeterDirty = true;
                    if (t >= 1) obj.frameCallback = null;
                };
            };
        };

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, P, Q], size, 50);

        // 뷰포트 중심 (라벨 배치 기준)
        const vc = p.createVector(animator.viewport.centerX, animator.viewport.centerY);

        // --- Problem Phase 1 ---
        animator.registerPhase('problem1', [
            { id: 'segAB', object: XSegment(p, A, B), animate: { mode: 'draw', duration: 1.2 } },
            {
                group: [
                    { id: 'ptO', object: new XPoint(p, O, 'O', { center: vc }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'arcO', object: createOpenArc(O, r, 0, 180), animate: { mode: 'draw', duration: 1.8 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptA', object: new XPoint(p, A, 'A', { dx: 12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptB', object: new XPoint(p, B, 'B', { dx: -12 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'ptO1', object: new XPoint(p, O1, 'O₁', { center: vc }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'arcO1', object: createOpenArc(O1, r1, 0, 180), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            { id: 'dimO1O', object: new XDimension(p, O1, O, '3', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } },
            { delay: 0.5 }
        ]);

        // --- Problem Phase 2 ---
        animator.registerPhase('problem2', [
            { id: 'segAQ', object: XSegment(p, A, Q), animate: { mode: 'draw', duration: 1.4 } },
            {
                group: [
                    { id: 'ptP', object: new XPoint(p, P, 'P', { dy: -12 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'ptQ', object: new XPoint(p, Q, 'Q', { dx: -10, dy: -10 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'segBP', object: XSegment(p, B, P), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'text1', object: new XText(p, [20, 25], '\\overline{BP} = ?', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            }
        ]);

        // --- Solution Phase 1 ---
        animator.registerPhase('solution1', [
            { id: 'segPO', object: XSegment(p, P, O), animate: { mode: 'draw', duration: 1.0 } },
            {
                group: [
                    { id: 'angleOPA', object: new XAngleMarker(p, O, P, A, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'angleABP', object: new XAngleMarker(p, A, B, P, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'text2', object: new XText(p, [20, 50], '접현각', { fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'angleOPA', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'angleABP', animate: { mode: 'pulse', duration: 1.5 } }
                ],
                parallel: true
            },
            { delay: 0.5 },
            { id: 'triAPO', object: new XPolygon(p, [A, P, O], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'triABP', object: new XPolygon(p, [A, B, P], { filled: true, fillColor: [...p.theme.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
            {
                group: [
                    { id: 'triAPO', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triABP', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // --- 헬퍼: blink (opacity 점멸) ---
        const createBlinkFactory = (cycles, duration) => {
            return () => {
                let elapsed = 0, lastTime = null;
                return (obj) => {
                    const now = performance.now();
                    if (!lastTime) lastTime = now;
                    elapsed += (now - lastTime) / 1000;
                    lastTime = now;
                    const t = Math.min(1, elapsed / duration);
                    obj.opacity = 0.2 + 0.8 * Math.abs(Math.sin(t * Math.PI * cycles));
                    if (t >= 1) { obj.opacity = 1; obj.frameCallback = null; }
                };
            };
        };

        // --- 헬퍼: screenCoord text y 이동 ---
        const createTextMoverFactory = (dy, duration) => {
            return () => {
                let elapsed = 0, lastTime = null, startY = null;
                return (obj) => {
                    const now = performance.now();
                    if (!lastTime) { lastTime = now; startY = obj.pos.y; }
                    elapsed += (now - lastTime) / 1000;
                    lastTime = now;
                    const t = Math.min(1, elapsed / duration);
                    obj.pos.y = startY + dy * t;
                    if (t >= 1) obj.frameCallback = null;
                };
            };
        };

        // --- Solution Phase 2 ---
        const sc = p.geometryScale;

        // clone _apo: APO → move(20, 100)
        const dA1 = A.copy(), dP1 = P.copy(), dO1 = O.copy();
        const orig1 = [A.copy(), P.copy(), O.copy()];
        const dup1 = [dA1, dP1, dO1];
        const movFactory1 = createDupTranslatorFactory(dup1, orig1, 20, 100, 1.7);

        // clone _abp: ABP → move(-10, -120) + 각 PAO용 O 포함
        const dA2 = A.copy(), dB2 = B.copy(), dP2 = P.copy(), dO2 = O.copy();
        const orig2 = [A.copy(), B.copy(), P.copy(), O.copy()];
        const dup2 = [dA2, dB2, dP2, dO2];
        const movFactory2 = createDupTranslatorFactory(dup2, orig2, -10, -120, 1.7);

        // clone 최종 위치 (segment draw용)
        const dx1 = 20 / sc, dy1 = 100 / sc;
        const fA1 = p.createVector(A.x + dx1, A.y + dy1);
        const fP1 = p.createVector(P.x + dx1, P.y + dy1);
        const fO1 = p.createVector(O.x + dx1, O.y + dy1);
        const dx2 = -10 / sc, dy2 = -120 / sc;
        const fA2 = p.createVector(A.x + dx2, A.y + dy2);
        const fB2 = p.createVector(B.x + dx2, B.y + dy2);
        const fP2 = p.createVector(P.x + dx2, P.y + dy2);

        // @xyz 이후 생성 객체 ID (text 제외) — hide 대상
        const hideTargets = [
            '_apo_tri', '_apo_angleOPA', '_apo_anglePAO',
            '_abp_tri', '_abp_angleABP', '_abp_anglePAO',
            'segAO_apo', 'segAP_abp', 'segOP_apo', 'segPB_abp'
        ];

        animator.registerPhase('solution2', [
            // draw angle PAO markt
            { id: 'anglePAO', object: new XAngleMarker(p, P, A, O, { marker: 'triangle' }), animate: { mode: 'draw', duration: 0.7 } },
            // ghost all @xyz
            { action: 'fadeAll', opacity: 0.3, duration: 0.5 },
            // clone APO as _apo white || clone ABP as _abp white
            {
                group: [
                    {
                        group: [
                            { id: '_apo_tri', object: new XPolygon(p, [dA1, dP1, dO1], { color: '#FFFFFF' }), action: 'show' },
                            { id: '_apo_angleOPA', object: new XAngleMarker(p, dO1, dP1, dA1, { marker: 'circle', color: '#FFFFFF' }), action: 'show' },
                            { id: '_apo_anglePAO', object: new XAngleMarker(p, dP1, dA1, dO1, { marker: 'triangle', color: '#FFFFFF' }), action: 'show' },
                            { id: '_apo_tri', setFrameCallbackFactory: movFactory1 }
                        ],
                        parallel: false
                    },
                    {
                        group: [
                            { id: '_abp_tri', object: new XPolygon(p, [dA2, dB2, dP2], { color: '#FFFFFF' }), action: 'show' },
                            { id: '_abp_angleABP', object: new XAngleMarker(p, dA2, dB2, dP2, { marker: 'circle', color: '#FFFFFF' }), action: 'show' },
                            { id: '_abp_anglePAO', object: new XAngleMarker(p, dP2, dA2, dO2, { marker: 'triangle', color: '#FFFFFF' }), action: 'show' },
                            { id: '_abp_tri', setFrameCallbackFactory: movFactory2 }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // clone 이동 완료 대기
            { delay: 1.7 },
            // draw segments AO of _apo, AP of _abp green (단독)
            {
                group: [
                    { id: 'segAO_apo', object: XSegment(p, fA1, fO1, { color: COLORS.green }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segAP_abp', object: XSegment(p, fA2, fP2, { color: COLORS.green }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 0.2 },
            // draw segments OP of _apo, PB of _abp red || text t3
            {
                group: [
                    { id: 'segOP_apo', object: XSegment(p, fO1, fP1, { color: '#FF0000' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'segPB_abp', object: XSegment(p, fP2, fB2, { color: '#FF0000' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 't3', object: new XText(p, [20, 75], '\\overline{AO}:\\overline{AP} = \\overline{OP}:\\overline{PB}', { useTex: true, fontSize: 18, screenCoord: true, textAlign: p.LEFT }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            { delay: 2.5 },
            // hide @xyz 이후 non-text || recover all except hide 대상
            {
                group: [
                    { action: 'fade', targets: hideTargets, opacity: 0, duration: 0.8 },
                    { action: 'fadeAll', opacity: 1, exclude: hideTargets, duration: 0.8 }
                ],
                parallel: true
            },
            { delay: 1.5 }
        ]);

        // --- Solution Phase 3 ---
        animator.registerPhase('solution3', [
            // draw segment O₁P
            { id: 'segO1P', object: XSegment(p, O1, P), animate: { mode: 'draw', duration: 1.1 } },
            // draw right angle QPO₁ || dim O₁P[3, up] || dim OA[6, down]
            {
                group: [
                    { id: 'rightQPO1', object: new XRightAngle(p, Q, P, O1, 20, { pixel: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimO1P', object: new XDimension(p, O1, P, '3', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimOA', object: new XDimension(p, O, A, '6', { offset: -10 }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            { delay: 0.7 },
            // dim PA[6√2, up]
            { id: 'dimPA', object: new XDimension(p, P, A, '6\\sqrt{2}', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 1.5 } },
            { delay: 1.0 },
            // ghost dim O₁P, dim O₁O
            { action: 'fade', targets: ['dimO1P', 'dimO1O', 'rightQPO1'], opacity: 0.3, duration: 0.5 },
            // blink t3 || text t4 at lower center
            {
                group: [
                    { id: 't3', setFrameCallbackFactory: createBlinkFactory(3, 2.1) },
                    { id: 't4', object: new XText(p, [size / 2, size - 25], '\\overline{AO}:\\overline{AP}=6:6\\sqrt{2} = 1: \\sqrt{2}', { useTex: true, fontSize: 18, screenCoord: true }), animate: { mode: 'draw', duration: 2.1 } }
                ],
                parallel: true
            },
            // frameCallback t4 move one line up || blink t3 || text t5 at lower center
            {
                group: [
                    { id: 't4', setFrameCallbackFactory: createTextMoverFactory(-25, 0.7) },
                    { id: 't3', setFrameCallbackFactory: createBlinkFactory(3, 1.5) },
                    { id: 't5', object: new XText(p, [size / 2, size - 25], '\\overline{OP}:\\overline{PB}= 1: \\sqrt{2}', { useTex: true, fontSize: 18, screenCoord: true }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            // draw triangle OPB green
            { id: 'triOPB', object: new XPolygon(p, [O, P, B], { color: COLORS.green }), animate: { mode: 'draw', duration: 1.7 } },
            // draw right angle BPO || dim PO[x, down], BP[√2x, up]
            {
                group: [
                    { id: 'rightBPO', object: new XRightAngle(p, B, P, O, 20, { pixel: true }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'dimPO', object: new XDimension(p, P, O, 'x', { offset: -10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'dimBP', object: new XDimension(p, B, P, '\\sqrt{2}x', { offset: 10, useTex: true }), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
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
