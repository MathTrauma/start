
import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import { XPolygon, XSegment, XPoint } from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E, F, G;
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

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 삼각형 ABC
        A = p.createVector(0, 4);
        B = p.createVector(-3, 0);
        C = p.createVector(4, 0);

        // 메넬라우스 직선 위의 점들 (기울기 1/2)
        D = p.createVector(1, 0);      // BC 위
        E = p.createVector(3, 1);      // CA 위
        F = p.createVector(-5.4, -3.2); // AB 연장선 위

        // 보조점 G: B를 지나고 DEF에 평행한 직선과 AC의 교점
        // DEF 기울기: (1-0)/(3-1) = 1/2
        // B를 지나는 평행선: y = (x + 3) / 2
        // AC 직선: y = 4 - x
        // 교점: (x + 3) / 2 = 4 - x → x + 3 = 8 - 2x → 3x = 5 → x = 5/3
        // y = 4 - 5/3 = 7/3
        G = p.createVector(5/3, 7/3);

        // 메넬라우스 직선 연장 (시각화용)
        const lineExtendLeft = p.createVector(-6.5, -3.75);
        const lineExtendRight = p.createVector(4.5, 1.75);

        // 평행선 연장 (B를 지나는 선, 기울기 1/2)
        const parallelLeft = p.createVector(-5, -1);
        const parallelRight = p.createVector(3, 3);

        // Animator 초기화
        animator = new XAnimator(p);
        animator.initViewport([A, B, C, F], size);

        // ===== Problem Phases =====

        // Phase 1: 삼각형 ABC
        animator.registerPhase('problem1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            {
                group: [
                    { id: 'pointA', object: new XPoint(p, A, 'A', { dx: 0, dy: 15 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointB', object: new XPoint(p, B, 'B', { dx: -12, dy: -8 }), animate: { mode: 'draw', duration: 0.3 } },
                    { id: 'pointC', object: new XPoint(p, C, 'C', { dx: 12, dy: -8 }), animate: { mode: 'draw', duration: 0.3 } }
                ],
                parallel: true
            },
            { delay: 0.5 }
        ]);

        // Phase 2: 메넬라우스 직선 DEF || BF
        animator.registerPhase('problem2', [
            {
                group: [
                    { id: 'lineDEF', object: XSegment(p, lineExtendLeft, lineExtendRight, { color: p.theme.highlight }), animate: { mode: 'draw', duration: 1.5 } },
                    { id: 'segBF', object: XSegment(p, B, F), animate: { mode: 'draw', duration: 1.5 } }
                ],
                parallel: true
            },
            {
                group: [
                    { id: 'pointD', object: new XPoint(p, D, 'D', { dx: 0, dy: -15 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointE', object: new XPoint(p, E, 'E', { dx: 12, dy: 8 }), animate: { mode: 'draw', duration: 0.5 } },
                    { id: 'pointF', object: new XPoint(p, F, 'F', { dx: -12, dy: -8 }), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 }
        ]);

        // ===== Solution Phases =====

        // Solution Phase 1: 평행선 보조선 (B를 지나고 DEF에 평행)
        animator.registerPhase('solution1', [
            { id: 'lineBG', object: XSegment(p, parallelLeft, parallelRight, { dashed: true }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'pointG', object: new XPoint(p, G, 'G', { dx: 12, dy: 8 }), animate: { mode: 'draw', duration: 0.5 } },
            { delay: 1.0 }
        ]);

        // Solution Phase 2: 닮음 삼각형
        animator.registerPhase('solution2', [
            // travel AFE, ABG || text
            {
                group: [
                    { id: 'triAFE', object: new XPolygon(p, [A, F, E], { filled: true, fillColor: [100, 200, 255, 80] }), animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'triABG', object: new XPolygon(p, [A, B, G], { filled: true, fillColor: [255, 200, 100, 80] }), animate: { mode: 'travel', duration: 2.0 } },
                    { id: 'text1', object: createTextDisplay('AF/FB = AE/EG', 20), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 1.0 },
            // remove AFE, ABG
            {
                group: [
                    { id: 'triAFE', action: 'remove' },
                    { id: 'triABG', action: 'remove' }
                ],
                parallel: true
            },
            { delay: 0.3 },
            // travel BCG, DCE || text[next line]
            {
                group: [
                    { id: 'triBCG', object: new XPolygon(p, [B, C, G], { filled: true, fillColor: [100, 200, 255, 80] }), animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'triDCE', object: new XPolygon(p, [D, C, E], { filled: true, fillColor: [255, 200, 100, 80] }), animate: { mode: 'travel', duration: 1.5 } },
                    { id: 'text2', object: createTextDisplay('BD/DC = GE/EC', 45), animate: { mode: 'draw', duration: 0.5 } }
                ],
                parallel: true
            },
            { delay: 2.0 }
        ]);

        const phaseMap = {
            problem: {
                1: 'problem1',
                2: 'problem2'
            },
            solution: {
                1: 'solution1',
                2: 'solution2'
            }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 2,
            solutionPhaseCount: 2
        });
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
