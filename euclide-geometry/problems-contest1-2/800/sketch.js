import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { circleLineIntersection } from '../../lib/geometry.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint, XAngleMarker, XCircle, XSegmentMarker } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let O, A, B, C, D, E, F, G;
    let circleRadius;
    let animator;

    // 텍스트 오버레이 헬퍼 (화면 좌표)
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

    // 월드 좌표에 텍스트 표시 헬퍼
    const createWorldText = (text, worldPos) => ({
        visible: true,
        progress: 1,
        opacity: 1,
        mode: 'default',
        text: text,
        worldPos: worldPos,
        render: function() {
            if (!this.visible || this.opacity <= 0) return;
            const px = p.tx ? p.tx(this.worldPos) : this.worldPos.x;
            const py = p.ty ? p.ty(this.worldPos) : this.worldPos.y;
            p.push();
            p.translate(px, py);
            p.scale(1, -1);
            const alpha = Math.floor(255 * this.opacity * this.progress);
            p.fill(p.red(p.theme.text || 0), p.green(p.theme.text || 0), p.blue(p.theme.text || 0), alpha);
            p.noStroke();
            p.textSize(16);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.text, 0, 0);
            p.pop();
        }
    });

    p.setup = function() {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);
        const t = p.theme;

        // 기본 점 정의 (animation.md 기반)
        O = p.createVector(0.14, 1.66);
        A = p.createVector(0.49, 3.64);
        B = p.createVector(-2.46, 0.01);
        C = p.createVector(2.46, -0.01);
        circleRadius = 2;

        // D: AB와 원 O의 교점 (A 아님)
        const intersAB = circleLineIntersection(O, circleRadius, A, B);
        if (intersAB.length === 2) {
            const d0 = p5.Vector.dist(p.createVector(intersAB[0].x, intersAB[0].y), A);
            const d1 = p5.Vector.dist(p.createVector(intersAB[1].x, intersAB[1].y), A);
            D = d0 > d1 ? p.createVector(intersAB[0].x, intersAB[0].y)
                        : p.createVector(intersAB[1].x, intersAB[1].y);
        } else {
            D = p.createVector(intersAB[0].x, intersAB[0].y);
        }

        // E: AC와 원 O의 교점 (A 아님)
        const intersAC = circleLineIntersection(O, circleRadius, A, C);
        if (intersAC.length === 2) {
            const d0 = p5.Vector.dist(p.createVector(intersAC[0].x, intersAC[0].y), A);
            const d1 = p5.Vector.dist(p.createVector(intersAC[1].x, intersAC[1].y), A);
            E = d0 > d1 ? p.createVector(intersAC[0].x, intersAC[0].y)
                        : p.createVector(intersAC[1].x, intersAC[1].y);
        } else {
            E = p.createVector(intersAC[0].x, intersAC[0].y);
        }

        // F, G: BC와 원 O의 교점 (F.x < G.x)
        const intersBC = circleLineIntersection(O, circleRadius, B, C);
        if (intersBC.length === 2) {
            if (intersBC[0].x < intersBC[1].x) {
                F = p.createVector(intersBC[0].x, intersBC[0].y);
                G = p.createVector(intersBC[1].x, intersBC[1].y);
            } else {
                F = p.createVector(intersBC[1].x, intersBC[1].y);
                G = p.createVector(intersBC[0].x, intersBC[0].y);
            }
        } else {
            F = p.createVector(intersBC[0].x, intersBC[0].y);
            G = p.createVector(intersBC[0].x, intersBC[0].y);
        }

        // 중심점 계산 (점 라벨 위치용)
        const center = p.createVector(
            (A.x + B.x + C.x) / 3,
            (A.y + B.y + C.y) / 3
        );

        // EGC 삼각형 중심점 (텍스트 "8" 위치용)
        const centerEGC = p.createVector(
            (E.x + G.x + C.x) / 3,
            (E.y + G.y + C.y) / 3
        );

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C], size, 50);

        // travel 경로 계산 (열린 경로: F->G->D, E->A->G)
        const distFG = p5.Vector.dist(F, G);
        const distGD = p5.Vector.dist(G, D);
        const distDF = p5.Vector.dist(D, F);
        const perimeterFGD = distFG + distGD + distDF;
        const travelFGD_end = (distFG + distGD) / perimeterFGD;

        const distEA = p5.Vector.dist(E, A);
        const distAG = p5.Vector.dist(A, G);
        const distGE = p5.Vector.dist(G, E);
        const perimeterEAG = distEA + distAG + distGE;
        const travelEAG_end = (distEA + distAG) / perimeterEAG;

        // ===== Problem Phase 1 =====
        animator.registerPhase('problem1', [
            // draw triangle ABC (dur: 2.0)
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            // display A,B,C (dur: 0.3)
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { center }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { center }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            // draw circle O (dur: 1.8)
            { id: 'circleO', object: XCircle(p, O, circleRadius), animate: { mode: 'draw', duration: 1.8 } },
            // display D,E,F,G in turns (dur: 0.3 respectively)
            { id: 'pointD', object: new XPoint(p, D, 'D', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointE', object: new XPoint(p, E, 'E', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointF', object: new XPoint(p, F, 'F', { center }), animate: { mode: 'draw', duration: 0.3 } },
            { id: 'pointG', object: new XPoint(p, G, 'G', { center }), animate: { mode: 'draw', duration: 0.3 } },
            // delay (dur: 2.0)
            { delay: 2.0 }
        ]);

        // ===== Problem Phase 2 =====
        animator.registerPhase('problem2', [
            // draw segments DF, AG, EG (dur: 1.2)
            {
                group: [
                    { id: 'segDF', object: XSegment(p, D, F), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segAG', object: XSegment(p, A, G), animate: { mode: 'draw', duration: 1.2 } },
                    { id: 'segEG', object: XSegment(p, E, G), animate: { mode: 'draw', duration: 1.2 } }
                ],
                parallel: true
            },
            // XSegmentMarker DB[2], DF[2], EG[2] (dur: 0.7)
            {
                group: [
                    { id: 'markDB', object: new XSegmentMarker(p, D, B, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markDF', object: new XSegmentMarker(p, D, F, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } },
                    { id: 'markEG', object: new XSegmentMarker(p, E, G, { mark: 2 }), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            // filldraw EGC (dur: 1.2)
            { id: 'fillEGC', object: new XPolygon(p, [E, G, C], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 80] }), animate: { mode: 'draw', duration: 1.2 } },
            // text[$8$, center of EGC] (dur: 0.5)
            { id: 'text8', object: createWorldText('8', centerEGC), animate: { mode: 'draw', duration: 0.5 } }
        ]);

        // ===== Solution Phase 0 =====
        animator.registerPhase('solution0', [
            // fade all (dur: 1.2)
            { action: 'fadeAll', opacity: 0.3, duration: 1.2 },
            // draw poly DFGE (dur: 1.8)
            { id: 'polyDFGE', object: new XPolygon(p, [D, F, G, E]), animate: { mode: 'draw', duration: 1.8 } },
            // draw angles DFB, CGE with marker star (dur: 0.8)
            {
                group: [
                    { id: 'angleDFB', object: new XAngleMarker(p, D, F, B, { marker: 'star' }), animate: { mode: 'draw', duration: 0.8 } },
                    { id: 'angleCGE', object: new XAngleMarker(p, C, G, E, { marker: 'star' }), animate: { mode: 'draw', duration: 0.8 } }
                ],
                parallel: true
            },
            // pulse angles DFB, CGE (dur: 2.0)
            {
                group: [
                    { id: 'angleDFB', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'angleCGE', animate: { mode: 'pulse', duration: 2.0 } }
                ],
                parallel: true
            },
            // delay (dur: 2.0)
            { delay: 2.0 },
            // hide poly DFGE (dur: 0.7)
            { id: 'polyDFGE', action: 'hide', duration: 0.7 },
            // show(recover all except DFGE) (dur: 0.5)
            { action: 'recoverAll', exclude: ['polyDFGE'], duration: 0.5 },
            // delay (dur: 1.0)
            { delay: 1.0 }
        ]);

        // ===== Solution Phase 1 =====
        animator.registerPhase('solution1', [
            // hide EGC (dur: 0.5)
            {
                group: [
                    { id: 'fillEGC', action: 'hide', duration: 0.5 },
                    { id: 'text8', action: 'hide', duration: 0.5 }
                ],
                parallel: true
            },
            // draw segment DG dashed (dur: 1.0)
            { id: 'segDG', object: XSegment(p, D, G, { dashed: true }), animate: { mode: 'draw', duration: 1.0 } },
            // travel 경로용 폴리곤 생성 (투명, 즉시)
            {
                group: [
                    { id: 'pathFGD', object: new XPolygon(p, [F, G, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 40] }), animate: { mode: 'draw', duration: 0 } },
                    { id: 'pathEAG', object: new XPolygon(p, [E, A, G], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 40] }), animate: { mode: 'draw', duration: 0 } }
                ],
                parallel: true
            },
            // pulse XSegs DF, EG || travel F->G->D || travel E->A->G (dur: 3.0)
            //     after 1.0, draw angles DGF, GAE with markc (dur: 1.0)
            //         after 1.0 pulse angles DGF, GAE
            {
                group: [
                    // 메인 애니메이션 (3.0초)
                    { id: 'markDF', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'markEG', animate: { mode: 'pulse', duration: 3.0 } },
                    { id: 'pathFGD', animate: { mode: 'travel', duration: 3.0, from: 0, to: travelFGD_end } },
                    { id: 'pathEAG', animate: { mode: 'travel', duration: 3.0, from: 0, to: travelEAG_end } },
                    // after 1.0: 각 마커 그리기 (1.0초)
                    {
                        group: [
                            { delay: 1.0 },
                            {
                                group: [
                                    { id: 'angleDGF', object: new XAngleMarker(p, D, G, F, { marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } },
                                    { id: 'angleGAE', object: new XAngleMarker(p, G, A, E, { marker: 'circle' }), animate: { mode: 'draw', duration: 1.0 } }
                                ],
                                parallel: true
                            },
                            // after 1.0 (그리기 완료 후): pulse angles DGF, GAE
                            {
                                group: [
                                    { id: 'angleDGF', animate: { mode: 'pulse', duration: 1.0 } },
                                    { id: 'angleGAE', animate: { mode: 'pulse', duration: 1.0 } }
                                ],
                                parallel: true
                            }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // travel 경로 숨기기
            {
                group: [
                    { id: 'pathFGD', action: 'hide', duration: 0.3 },
                    { id: 'pathEAG', action: 'hide', duration: 0.3 }
                ],
                parallel: true
            },
            // delay (dur: 2.0)
            { delay: 2.0 },

            // fade [seg DF, XSeg DF] (dur: 0.5) || draw poly ADGE green (dur: 1.6) || draw seg DB (dur: 0.7)
            {
                group: [
                    { id: 'segDF', set: { opacity: 0.3 }, duration: 0.5 },
                    { id: 'markDF', set: { opacity: 0.3 }, duration: 0.5 },
                    { id: 'polyADGE', object: new XPolygon(p, [A, D, G, E], { color: [0, 255, 0] }), animate: { mode: 'draw', duration: 1.6 } },
                    { id: 'segDB', object: XSegment(p, D, B), animate: { mode: 'draw', duration: 0.7 } }
                ],
                parallel: true
            },
            // pulse ADGE, DB (dur: 2.0)
            //     after 1.0, draw angles BDG, AEG with markt (dur: 1.0) || text ["대외각", upper left] (dur: 0.5) || draw angles GDA, GEC with marker 'x' (dur: 1.0)
            {
                group: [
                    // 메인 애니메이션 (2.0초)
                    { id: 'polyADGE', animate: { mode: 'pulse', duration: 2.0 } },
                    { id: 'segDB', animate: { mode: 'pulse', duration: 2.0 } },
                    // after 1.0: 각 마커 + 텍스트
                    {
                        group: [
                            { delay: 1.0 },
                            {
                                group: [
                                    { id: 'angleBDG', object: new XAngleMarker(p, B, D, G, { marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                                    { id: 'angleAEG', object: new XAngleMarker(p, A, E, G, { marker: 'triangle' }), animate: { mode: 'draw', duration: 1.0 } },
                                    { id: 'textExterior', object: createTextDisplay('대외각', 20), animate: { mode: 'draw', duration: 0.5 } },
                                    { id: 'angleGDA', object: new XAngleMarker(p, G, D, A, { marker: 'x' }), animate: { mode: 'draw', duration: 1.0 } },
                                    { id: 'angleGEC', object: new XAngleMarker(p, G, E, C, { marker: 'x' }), animate: { mode: 'draw', duration: 1.0 } }
                                ],
                                parallel: true
                            }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // delay (dur: 1.0)
            { delay: 1.0 },

            // pulse XDims BD, GE || filldraw triangles DBG, GEA same color (dur: 1.5)
            {
                group: [
                    { id: 'markDB', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'markEG', animate: { mode: 'pulse', duration: 1.5 } },
                    { id: 'fillDBG', object: new XPolygon(p, [D, B, G], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillGEA', object: new XPolygon(p, [G, E, A], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            // travel DBG, GEA (dur: 3.0)
            {
                group: [
                    { id: 'fillDBG', animate: { mode: 'travel', duration: 3.0 } },
                    { id: 'fillGEA', animate: { mode: 'travel', duration: 3.0 } }
                ],
                parallel: true
            },
            // delay (dur: 2.0)
            { delay: 2.0 }
        ]);

        // ===== Solution Phase 2 =====
        animator.registerPhase('solution2', [
            // hide [triangles DBG, GEA, poly ADGE] || recover [seg DF] (dur: 1.2)
            {
                group: [
                    { id: 'fillDBG', action: 'hide', duration: 1.2 },
                    { id: 'fillGEA', action: 'hide', duration: 1.2 },
                    { id: 'polyADGE', action: 'hide', duration: 1.2 },
                    { id: 'segDF', set: { opacity: 1 }, duration: 1.2 },
                    { id: 'markDF', set: { opacity: 1 }, duration: 1.2 }
                ],
                parallel: true
            },
            // draw poly ADFG yellow (dur: 1.5)
            { id: 'polyADFG', object: new XPolygon(p, [A, D, F, G], { color: [255, 255, 0] }), animate: { mode: 'draw', duration: 1.5 } },
            // draw angle DAG with marker star (dur: 1.0) || pulse angle DFB (dur: 2.0)
            //     after 1.0, pulse DAG
            {
                group: [
                    { id: 'angleDAG', object: new XAngleMarker(p, D, A, G, { marker: 'star' }), animate: { mode: 'draw', duration: 1.0 } },
                    { id: 'angleDFB', animate: { mode: 'pulse', duration: 2.0 } },
                    // after 1.0: pulse DAG
                    {
                        group: [
                            { delay: 1.0 },
                            { id: 'angleDAG', animate: { mode: 'pulse', duration: 1.0 } }
                        ],
                        parallel: false
                    }
                ],
                parallel: true
            },
            // delay (dur: 1.2)
            { delay: 1.2 },
            // fade [ADFG] (dur: 0.8)
            { id: 'polyADFG', set: { opacity: 0.3 }, duration: 0.8 },
            // draw triangles ADG, GEC same color (dur: 1.5)
            {
                group: [
                    { id: 'fillADG', object: new XPolygon(p, [A, D, G], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'fillGEC', object: new XPolygon(p, [G, E, C], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 60] }), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            // travel triangles ADG, GEC (dur: 2.0)
            {
                group: [
                    { id: 'fillADG', animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'fillGEC', animate: { mode: 'travel', duration: 2.0 } }
                ],
                parallel: true
            },
            // delay (dur: 2.0)
            { delay: 2.0 }
        ]);

        // phaseMap 설정
        const phaseMap = {
            problem: { 1: 'problem1', 2: 'problem2' },
            solution: { 0: 'solution0', 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 3
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
