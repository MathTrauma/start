// Problem 011: 삼각형의 수심과 외심
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, O, H, D, E, F, G, P, Q;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points - BC가 밑변
        // B(-3.5, 0), C(3.5, 0)
        B = p.createVector(-3.5, 0);
        C = p.createVector(3.5, 0);

        // A 계산: AB = 10, AC = 8
        // A = (x, y)
        // (x + 3.5)² + y² = 100 (AB = 10)
        // (x - 3.5)² + y² = 64  (AC = 8)
        // 두 식을 빼면: 14x = 36 → x = 18/7
        let ax = 18 / 7;
        // y² = 100 - (x + 3.5)²
        let ay = Math.sqrt(100 - Math.pow(ax + 3.5, 2));
        A = p.createVector(ax, ay);

        // O: 삼각형 ABC의 외심
        O = getCircumcenter(A, B, C);

        // H: 삼각형 ABC의 수심
        H = getOrthocenter(A, B, C);

        // D, E, F: 각 꼭짓점에서 대변에 내린 수선의 발 (표시되지 않는 점들)
        D = projectPointToLine(A, B, C);  // A에서 BC에 내린 수선의 발
        E = projectPointToLine(B, A, C);  // B에서 AC에 내린 수선의 발
        F = projectPointToLine(C, A, B);  // C에서 AB에 내린 수선의 발

        // G: 직선 AO와 BC의 교점 (표시하지 않음)
        G = intersectLines(A, O, B, C);

        // P: 선분 AG와 BE의 교점
        P = intersectLines(A, G, B, E);

        // Q: 선분 AG와 CF의 교점
        Q = intersectLines(A, G, C, F);

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, O, H, D, E, F, G, P, Q], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 삼각형 ABC
        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCA = new MSegment(p, C, A);

        prob.pointA = new MPoint(p, A, "A", 0, 15);
        prob.pointB = new MPoint(p, B, "B", -15, -10);
        prob.pointC = new MPoint(p, C, "C", 15, -10);

        // 수선 AD, BE, CF
        prob.segAD = new MSegment(p, A, D, { color: [100, 100, 200], dashed: true });
        prob.segBE = new MSegment(p, B, E, { color: [100, 100, 200], dashed: true });
        prob.segCF = new MSegment(p, C, F, { color: [100, 100, 200], dashed: true });

        // 점 H (수심)
        prob.pointH = new MPoint(p, H, "H", -15, -10);

        // Phase 2: 직선 AG
        prob.segAG = new MSegment(p, A, G, { color: [200, 100, 100] });

        // 점 P, Q
        prob.pointP = new MPoint(p, P, "P", -15, 10);
        prob.pointQ = new MPoint(p, Q, "Q", 15, 10);
    }

    function resetAllAnimations() {
        Object.values(prob).forEach(obj => obj.reset());
        Object.values(sol).forEach(obj => obj.reset());
    }

    const originalResetAnimation = window.resetAnimation;
    window.resetAnimation = function() {
        if (originalResetAnimation) originalResetAnimation();
        if (Object.keys(prob).length > 0) {
            resetAllAnimations();
        }
    };

    p.draw = () => {
        p.background(255);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);

        const currentMode = getCurrentMode();
        const phase = selectedPhase;

        if (currentMode === 'problem') {
            if (phase === 'all') {
                drawProblemPhases();
            } else {
                drawProblemPhaseOnly(phase);
            }
        } else {
            drawProblemStatic();
            if (phase === 'all') {
                drawSolutionPhases();
            } else {
                drawSolutionPhaseOnly(phase);
            }
        }

        p.pop();
    };

    // ===== Problem Phases =====
    function drawProblemPhases() {
        // Phase 1: 삼각형 ABC (duration: 2.0초)
        prob.segAB.display(0.67);
        prob.segBC.display(0.67);
        prob.segCA.display(0.66);

        // 점 A, B, C 표시 @ 2.0 (duration: 0.3)
        if (prob.segCA.completed) {
            prob.pointA.display(0.1);
            prob.pointB.display(0.1);
            prob.pointC.display(0.1);
        }

        // 선분 AD, BE, CF 그리기 @ 2.3 (duration: 1.5)
        if (prob.pointC.completed) {
            prob.segAD.display(0.5);
            prob.segBE.display(0.5);
            prob.segCF.display(0.5);
        }

        // 점 H (수심) 표시 @ 3.8 (duration: 0.3)
        if (prob.segCF.completed) {
            prob.pointH.display(0.3);
        }

        // delay @ 4.1 (duration: 0.5) - Phase 1 완료 후 대기

        // Phase 2: 직선 AG (duration: 1.5)
        if (prob.pointH.completed) {
            prob.segAG.display(1.5);
        }

        // 점 P 표시 @ 1.5 (duration: 0.3)
        if (prob.segAG.completed) {
            prob.pointP.display(0.3);
        }

        // 점 Q 표시 @ 1.8 (duration: 0.3)
        if (prob.pointP.completed) {
            prob.pointQ.display(0.3);
        }
    }

    // ===== Problem Static =====
    function drawProblemStatic() {
        prob.segAB.displayStatic();
        prob.segBC.displayStatic();
        prob.segCA.displayStatic();
        prob.pointA.displayStatic();
        prob.pointB.displayStatic();
        prob.pointC.displayStatic();
        prob.segAD.displayStatic();
        prob.segBE.displayStatic();
        prob.segCF.displayStatic();
        prob.pointH.displayStatic();
        prob.segAG.displayStatic();
        prob.pointP.displayStatic();
        prob.pointQ.displayStatic();
    }

    // ===== Problem Phase Only =====
    function drawProblemPhaseOnly(phase) {
        if (phase === 1) {
            // Phase 1 animation: 삼각형 ABC와 수선
            prob.segAB.display(0.67);
            prob.segBC.display(0.67);
            prob.segCA.display(0.66);

            if (prob.segCA.completed) {
                prob.pointA.display(0.1);
                prob.pointB.display(0.1);
                prob.pointC.display(0.1);
            }
            if (prob.pointC.completed) {
                prob.segAD.display(0.5);
                prob.segBE.display(0.5);
                prob.segCF.display(0.5);
            }
            if (prob.segCF.completed) {
                prob.pointH.display(0.3);
            }
        } else if (phase === 2) {
            // Phase 1 static
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAD.displayStatic();
            prob.segBE.displayStatic();
            prob.segCF.displayStatic();
            prob.pointH.displayStatic();

            // Phase 2 animation: 직선 AG
            prob.segAG.display(1.5);
            if (prob.segAG.completed) prob.pointP.display(0.3);
            if (prob.pointP.completed) prob.pointQ.display(0.3);
        }
    }

    // ===== Solution Phases =====
    function drawSolutionPhases() {
        // No solution phases yet
    }

    // ===== Solution Phase Only =====
    function drawSolutionPhaseOnly(phase) {
        // No solution phases yet
    }
};

new p5(sketch);
