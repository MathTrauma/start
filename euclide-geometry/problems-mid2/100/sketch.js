import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let size;
    let scale;
    let overlay; // 2D 텍스트 오버레이

    // 기본 점 (수학 좌표) — 1.5배 확대 + 아래로 이동
    const oy = -1.5;
    const pts = {
        A: { x: 0, y: 3 + oy }, B: { x: -1.5, y: 0 + oy }, C: { x: 0, y: 0 + oy },
        D: { x: 0, y: 3 + oy }, E: { x: 1.5, y: 0 + oy },  F: { x: 0, y: 0 + oy }
    };

    const COLORS = {
        green: [100, 200, 100],
        yellow: [230, 200, 80],
    };

    // DEF 초기 오프셋 (수학 좌표 단위)
    const defInitOffset = { x: 1.2, y: 0 };
    const defInitRotZ = 20 * Math.PI / 180; // z축 20도

    // 애니메이션 상태
    let currentPhase = null;
    let phaseQueue = [];
    let phaseIndex = 0;
    let elapsed = 0;
    let lastTime = null;

    // 진행 상태
    const state = {
        // problem1
        abcDraw: 0,        // 0→1: ABC 삼각형 그리기
        abcLabels: 0,      // 0→1: A,B,C 레이블
        abcRight: 0,        // 0→1: 직각 표시
        abcMarks: 0,        // 0→1: 세그먼트 마커
        defDraw: 0,         // 0→1: DEF 삼각형 그리기
        defLabels: 0,
        defRight: 0,
        defMarks: 0,
        // solution1
        flipT: 0,           // 0→1: y축 플립 해제 (π→0)
        delayS1a: 0,        // delay
        rotateT: 0,         // 0→1: z축 회전 해제 (20°→0°)
        delayS1b: 0,        // delay
        moveT: 0,           // 0→1: x 오프셋 이동 (0.5→0)
        // solution2
        polyABC: 0,         // 0→1: polyline A->B->C
        polyDEF: 0,         // 0→1: polyline D->E->F
        angleCBA: 0,        // 0→1: angle at B (markt)
        angleDEF: 0,        // 0→1: angle at E (markt)
        delay2: 0,          // delay
        angleBAC: 0,        // 0→1: angle at A (markc)
        angleFDE: 0,        // 0→1: angle at D (markc)
    };

    // 미니 animator 인터페이스 (viewer-app.js 호환)
    const animator = {
        isPaused: false,
        lastFrameTime: null,
        phases: new Map(),
        phaseSequence: [],
        currentPhaseInSequence: 0,

        registerPhase(name, steps) {
            this.phases.set(name, steps);
        },
        playSequence(names) {
            phaseQueue = names;
            phaseIndex = 0;
            elapsed = 0;
            lastTime = null;
            if (names.length > 0) currentPhase = names[0];
        },
        playFrom(names, startIndex) {
            this.reset();
            for (let i = 0; i < startIndex && i < names.length; i++) {
                this.applyPhaseObjects(names[i]);
            }
            phaseQueue = names;
            phaseIndex = startIndex;
            elapsed = 0;
            lastTime = null;
            if (startIndex < names.length) currentPhase = names[startIndex];
        },
        applyPhaseObjects(name) {
            // instant: 해당 phase의 최종 상태 적용
            const steps = this.phases.get(name);
            if (!steps) return;
            steps.forEach(step => {
                step.targets.forEach(t => { state[t] = 1; });
            });
        },
        reset() {
            currentPhase = null;
            phaseQueue = [];
            phaseIndex = 0;
            elapsed = 0;
            lastTime = null;
            Object.keys(state).forEach(k => state[k] = 0);
        },
        updateAndDraw() {
            if (!currentPhase || this.isPaused) return;

            const now = performance.now();
            if (!lastTime) lastTime = now;
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            const steps = this.phases.get(currentPhase);
            if (!steps) return;

            // 현재 step 찾기: 모든 이전 step 완료 여부
            let stepIdx = 0;
            for (let i = 0; i < steps.length; i++) {
                const allDone = steps[i].targets.every(t => state[t] >= 1);
                if (allDone) stepIdx = i + 1;
                else break;
            }

            if (stepIdx >= steps.length) {
                // phase 완료 → 다음 phase
                phaseIndex++;
                if (phaseIndex < phaseQueue.length) {
                    currentPhase = phaseQueue[phaseIndex];
                    elapsed = 0;
                    lastTime = null;
                } else {
                    currentPhase = null;
                }
                return;
            }

            const step = steps[stepIdx];
            step.targets.forEach(t => {
                state[t] = Math.min(1, state[t] + dt / step.duration);
            });
        }
    };

    // 좌표 변환: 수학→스크린(WEBGL 원점 = 캔버스 중앙)
    const tx = (v) => v.x * scale;
    const ty = (v) => v.y * scale;

    // 삼각형 그리기 (progress 0~1로 둘레를 따라 그림)
    function drawTriangle(pA, pB, pC, progress) {
        if (progress <= 0) return;
        const verts = [pA, pB, pC, pA];
        let totalLen = 0;
        const lens = [];
        for (let i = 0; i < 3; i++) {
            const d = Math.sqrt((verts[i + 1].x - verts[i].x) ** 2 + (verts[i + 1].y - verts[i].y) ** 2);
            lens.push(d);
            totalLen += d;
        }
        const target = progress * totalLen;
        let acc = 0;
        p.beginShape();
        p.vertex(tx(verts[0]), ty(verts[0]));
        for (let i = 0; i < 3; i++) {
            if (acc + lens[i] <= target) {
                p.vertex(tx(verts[i + 1]), ty(verts[i + 1]));
                acc += lens[i];
            } else {
                const t = (target - acc) / lens[i];
                const mx = verts[i].x + (verts[i + 1].x - verts[i].x) * t;
                const my = verts[i].y + (verts[i + 1].y - verts[i].y) * t;
                p.vertex(tx({ x: mx, y: my }), ty({ x: mx, y: my }));
                break;
            }
        }
        p.endShape();
    }

    // 직각 표시
    function drawRightAngle(p1, vertex, p2, progress, sz) {
        if (progress <= 0) return;
        const s = sz || 0.12;
        const v1x = p1.x - vertex.x, v1y = p1.y - vertex.y;
        const l1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const v2x = p2.x - vertex.x, v2y = p2.y - vertex.y;
        const l2 = Math.sqrt(v2x * v2x + v2y * v2y);
        const a = { x: vertex.x + (v1x / l1) * s, y: vertex.y + (v1y / l1) * s };
        const b = { x: a.x + (v2x / l2) * s, y: a.y + (v2y / l2) * s };
        const c = { x: vertex.x + (v2x / l2) * s, y: vertex.y + (v2y / l2) * s };

        if (progress < 0.5) {
            const t = progress / 0.5;
            const mid = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            p.line(tx(a), ty(a), tx(mid), ty(mid));
        } else {
            p.line(tx(a), ty(a), tx(b), ty(b));
            const t = (progress - 0.5) / 0.5;
            const mid = { x: b.x + (c.x - b.x) * t, y: b.y + (c.y - b.y) * t };
            p.line(tx(b), ty(b), tx(mid), ty(mid));
        }
    }

    // 세그먼트 마커 (tick)
    function drawSegMark(pA, pB, count, progress) {
        if (progress <= 0) return;
        const mx = (tx(pA) + tx(pB)) / 2;
        const my = (ty(pA) + ty(pB)) / 2;
        const dx = tx(pB) - tx(pA);
        const dy = ty(pB) - ty(pA);
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        const ux = dx / len, uy = dy / len;
        const perpX = -uy, perpY = ux;
        const halfSize = 6 * progress;
        const gap = 5;
        const totalW = (count - 1) * gap;
        for (let i = 0; i < count; i++) {
            const off = -totalW / 2 + i * gap;
            const cx = mx + ux * off;
            const cy = my + uy * off;
            p.line(cx + perpX * halfSize, cy + perpY * halfSize,
                   cx - perpX * halfSize, cy - perpY * halfSize);
        }
    }

    // 폴리라인 그리기 (progress 0~1, 열린 경로)
    function drawPolyline(points, progress) {
        if (progress <= 0) return;
        let totalLen = 0;
        const lens = [];
        for (let i = 0; i < points.length - 1; i++) {
            const d = Math.sqrt((points[i + 1].x - points[i].x) ** 2 + (points[i + 1].y - points[i].y) ** 2);
            lens.push(d);
            totalLen += d;
        }
        const target = progress * totalLen;
        let acc = 0;
        p.beginShape();
        p.vertex(tx(points[0]), ty(points[0]));
        for (let i = 0; i < lens.length; i++) {
            if (acc + lens[i] <= target) {
                p.vertex(tx(points[i + 1]), ty(points[i + 1]));
                acc += lens[i];
            } else {
                const t = (target - acc) / lens[i];
                const mx = points[i].x + (points[i + 1].x - points[i].x) * t;
                const my = points[i].y + (points[i + 1].y - points[i].y) * t;
                p.vertex(tx({ x: mx, y: my }), ty({ x: mx, y: my }));
                break;
            }
        }
        p.endShape();
    }

    // 각도 호 그리기 (marker: 'triangle' | 'circle')
    // progress < 1: 아크 애니메이션, progress >= 1: 마커만 표시 (아크 제거)
    function drawAngleArc(p1, vertex, p2, progress, marker) {
        if (progress <= 0) return;
        const r = 0.2;
        const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
        const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
        let start = a1;
        let diff = a2 - a1;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;

        if (progress < 1) {
            // 아크 애니메이션
            const drawEnd = start + diff * progress;
            const n = Math.ceil(30 * progress);
            p.beginShape();
            for (let i = 0; i <= n; i++) {
                const a = start + (drawEnd - start) * (i / n);
                p.vertex(tx({ x: vertex.x + r * Math.cos(a), y: vertex.y + r * Math.sin(a) }),
                         ty({ x: vertex.x + r * Math.cos(a), y: vertex.y + r * Math.sin(a) }));
            }
            p.endShape();
        } else {
            // 마커만 표시
            const midA = start + diff * 0.5;
            const mx = vertex.x + r * Math.cos(midA);
            const my = vertex.y + r * Math.sin(midA);
            if (marker === 'triangle') {
                const s = 0.05;
                const perpX = -Math.sin(midA), perpY = Math.cos(midA);
                const tipX = mx + Math.cos(midA) * s;
                const tipY = my + Math.sin(midA) * s;
                p.beginShape();
                p.vertex(tx({ x: mx + perpX * s, y: my + perpY * s }), ty({ x: mx + perpX * s, y: my + perpY * s }));
                p.vertex(tx({ x: tipX, y: tipY }), ty({ x: tipX, y: tipY }));
                p.vertex(tx({ x: mx - perpX * s, y: my - perpY * s }), ty({ x: mx - perpX * s, y: my - perpY * s }));
                p.endShape(p.CLOSE);
            } else if (marker === 'circle') {
                const cr = 0.04;
                p.beginShape();
                for (let i = 0; i <= 20; i++) {
                    const a = (i / 20) * Math.PI * 2;
                    p.vertex(tx({ x: mx + cr * Math.cos(a), y: my + cr * Math.sin(a) }),
                             ty({ x: mx + cr * Math.cos(a), y: my + cr * Math.sin(a) }));
                }
                p.endShape(p.CLOSE);
            }
        }
    }

    // 레이블 (2D 오버레이에 그림)
    function drawLabel(pt, label, progress, screenOffsetX, screenOffsetY) {
        if (progress <= 0) return;
        const sx = size / 2 + tx(pt) + (screenOffsetX || 0);
        const sy = size / 2 - ty(pt) + (screenOffsetY || 0);
        const fg = p.theme?.foreground || 255;
        overlay.fill(fg, 255 * progress);
        overlay.noStroke();
        overlay.textSize(14);
        overlay.textAlign(overlay.CENTER, overlay.CENTER);
        const ox = pt.x < -0.1 ? -12 : pt.x > 0.1 ? 12 : 0;
        const oy = pt.y > 0.5 ? -12 : 12;
        overlay.text(label, sx + ox, sy + oy);
    }

    p.setup = function () {
        size = getCanvasSize(600, 20);
        p.createCanvas(size, size, p.WEBGL);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // scale: 수학 단위 → 픽셀 (점들이 캔버스에 잘 맞도록)
        scale = size / 5;

        // 2D 텍스트 오버레이
        overlay = p.createGraphics(size, size);
        overlay.pixelDensity(window.devicePixelRatio || 1);

        // Phase 등록
        animator.registerPhase('problem1', [
            { targets: ['abcDraw'], duration: 1.5 },
            { targets: ['abcLabels', 'abcRight', 'abcMarks'], duration: 0.8 },
            { targets: ['defDraw'], duration: 1.5 },
            { targets: ['defLabels', 'defRight', 'defMarks'], duration: 0.8 },
        ]);

        animator.registerPhase('solution1', [
            { targets: ['flipT'], duration: 1.5 },
            { targets: ['delayS1a'], duration: 0.3 },
            { targets: ['rotateT'], duration: 1.0 },
            { targets: ['delayS1b'], duration: 0.3 },
            { targets: ['moveT'], duration: 1.0 },
        ]);

        animator.registerPhase('solution2', [
            { targets: ['polyABC', 'polyDEF'], duration: 1.2 },
            { targets: ['angleCBA', 'angleDEF'], duration: 0.8 },
            { targets: ['delay2'], duration: 0.7 },
            { targets: ['angleBAC', 'angleFDE'], duration: 0.8 },
        ]);

        const phaseMap = {
            problem: { 1: 'problem1' },
            solution: { 1: 'solution1', 2: 'solution2' }
        };

        sketchContext.register({
            p5Instance: p,
            animator: animator,
            phaseMap: phaseMap,
            problemPhaseCount: 1,
            solutionPhaseCount: 2
        });
    };

    // DEF 현재 변환값 계산
    function getDefTransform() {
        const flipAngle = Math.PI * (1 - state.flipT);
        const rotZ = defInitRotZ * (1 - state.rotateT);
        const offsetX = defInitOffset.x * (1 - state.moveT);
        return { flipAngle, rotZ, offsetX };
    }

    p.draw = function () {
        const bg = p.theme?.background || 30;
        p.background(bg);

        // 오버레이 클리어
        overlay.clear();

        // y축 위로 양수
        p.scale(1, -1);

        const sw = p.theme?.foreground || 255;
        p.stroke(sw);
        p.strokeWeight(2);
        p.noFill();

        animator.updateAndDraw();

        // === ABC 삼각형 (항상 고정) ===
        drawTriangle(pts.A, pts.B, pts.C, state.abcDraw);

        if (state.abcRight > 0) {
            p.strokeWeight(1.5);
            drawRightAngle(pts.A, pts.C, pts.B, state.abcRight);
            p.strokeWeight(2);
        }
        if (state.abcMarks > 0) {
            p.strokeWeight(1.5);
            drawSegMark(pts.A, pts.B, 2, state.abcMarks);
            drawSegMark(pts.A, pts.C, 1, state.abcMarks);
            p.strokeWeight(2);
        }
        if (state.abcLabels > 0) {
            const lo = -10 * state.moveT; // 최종 위치에서 왼쪽으로
            drawLabel(pts.A, 'A', state.abcLabels, lo, 0);
            drawLabel(pts.B, 'B', state.abcLabels);
            drawLabel(pts.C, 'C', state.abcLabels, lo, 0);
        }

        // === DEF 삼각형 (플립 + 회전 + 이동 애니메이션) ===
        if (state.defDraw > 0) {
            const dt = getDefTransform();

            p.push();
            // 변환 순서: 이동 → z축 회전 → y축 플립
            p.translate(tx({ x: dt.offsetX, y: 0 }), 0, 0);
            p.rotateZ(dt.rotZ);
            p.rotateY(dt.flipAngle);

            p.stroke(sw);
            p.strokeWeight(2);
            p.noFill();

            drawTriangle(pts.D, pts.E, pts.F, state.defDraw);

            if (state.defRight > 0) {
                p.strokeWeight(1.5);
                drawRightAngle(pts.D, pts.F, pts.E, state.defRight);
                p.strokeWeight(2);
            }
            if (state.defMarks > 0) {
                p.strokeWeight(1.5);
                drawSegMark(pts.D, pts.E, 2, state.defMarks);
                drawSegMark(pts.D, pts.F, 1, state.defMarks);
                p.strokeWeight(2);
            }

            p.pop();

            // DEF 레이블 (2D 오버레이 — 변환된 스크린 좌표 계산)
            if (state.defLabels > 0) {
                // 각 점의 2D 투영 좌표 계산
                const cosY = Math.cos(dt.flipAngle), cosZ = Math.cos(dt.rotZ), sinZ = Math.sin(dt.rotZ);
                const project = (pt) => {
                    const x0 = tx(pt) * cosY;
                    const y0 = ty(pt);
                    // z축 회전
                    const rx = x0 * cosZ - y0 * sinZ;
                    const ry = x0 * sinZ + y0 * cosZ;
                    return { x: rx + tx({ x: dt.offsetX, y: 0 }), y: ry };
                };
                const ro = 10 * state.moveT; // 최종 위치에서 오른쪽으로
                [['D', pts.D, ro], ['E', pts.E, 0], ['F', pts.F, ro]].forEach(([label, pt, extra]) => {
                    const proj = project(pt);
                    const sx = proj.x - tx(pt) + extra;
                    const sy = -proj.y + ty(pt);
                    drawLabel(pt, label, state.defLabels, sx, sy);
                });
            }
        }

        // === Solution2: 폴리라인 + 각도 ===
        if (state.polyABC > 0) {
            p.stroke(...COLORS.green);
            p.strokeWeight(2.5);
            p.noFill();
            drawPolyline([pts.A, pts.B, pts.C], state.polyABC);
        }
        if (state.polyDEF > 0) {
            p.stroke(...COLORS.yellow);
            p.strokeWeight(2.5);
            p.noFill();
            drawPolyline([pts.D, pts.E, pts.F], state.polyDEF);
        }
        if (state.polyABC > 0 || state.polyDEF > 0) {
            p.stroke(sw);
            p.strokeWeight(2);
        }
        if (state.angleCBA > 0) {
            p.strokeWeight(1.5);
            drawAngleArc(pts.C, pts.B, pts.A, state.angleCBA, 'triangle');
            p.strokeWeight(2);
        }
        if (state.angleDEF > 0) {
            p.strokeWeight(1.5);
            drawAngleArc(pts.D, pts.E, pts.F, state.angleDEF, 'triangle');
            p.strokeWeight(2);
        }
        if (state.angleBAC > 0) {
            p.strokeWeight(1.5);
            drawAngleArc(pts.B, pts.A, pts.C, state.angleBAC, 'circle');
            p.strokeWeight(2);
        }
        if (state.angleFDE > 0) {
            p.strokeWeight(1.5);
            drawAngleArc(pts.F, pts.D, pts.E, state.angleFDE, 'circle');
            p.strokeWeight(2);
        }

        // 오버레이를 WEBGL 위에 렌더링
        p.push();
        p.scale(1, -1); // 되돌리기 (이미지가 뒤집히지 않도록)
        p.noStroke();
        p.texture(overlay);
        p.plane(size, size);
        p.pop();
    };
};

new p5(sketch, 'canvas-wrapper');
