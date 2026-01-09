// Problem 009: 이등변삼각형과 수선
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, D, M, H, E;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points
        B = p.createVector(0, 0);
        C = p.createVector(6, 0);

        // A 계산: tkz-euclide 코드 기반
        // 보조점 a: B에서 120도 방향으로 3만큼
        let a = p.createVector(
            B.x + 3 * p.cos(120),
            B.y + 3 * p.sin(120)
        );

        // 보조점 x: C 오른쪽
        let x = p.createVector(9, 0);

        // X: C를 중심으로 x를 156도 회전
        let xRelative = p5.Vector.sub(x, C);
        let angle = 156;
        let X = p.createVector(
            C.x + xRelative.x * p.cos(angle) - xRelative.y * p.sin(angle),
            C.y + xRelative.x * p.sin(angle) + xRelative.y * p.cos(angle)
        );

        // A: 직선 aB와 직선 CX의 교점
        A = intersectLines(a, B, C, X);

        // M: BC의 중점
        M = p5.Vector.lerp(B, C, 0.5);

        // D: AC와 원 A(반지름 AB)의 교점
        let radiusAB = p5.Vector.dist(A, B);
        let intersectAC = circleLineIntersection(A, radiusAB, A, C);
        D = intersectAC[1];  // A가 아닌 점

        // H: A를 BD에 정사영
        H = projectPointToLine(A, B, D);

        // E: D를 BC에 정사영
        E = projectPointToLine(D, B, C);

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, D, M, H, E], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 삼각형 ABC와 기본 점들
        prob.pointA = new MPoint(p, A, "A", -10, 15);
        prob.pointB = new MPoint(p, B, "B", -15, -10);
        prob.pointC = new MPoint(p, C, "C", 10, -10);

        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCA = new MSegment(p, C, A);

        prob.pointM = new MPoint(p, M, "M", 0, -15);

        // Phase 2: 이등변삼각형과 점 D
        prob.pointD = new MPoint(p, D, "D", 0, 15);
        prob.segBD = new MSegment(p, B, D, { color: [100, 100, 200] });

        // Phase 3: 수선의 발 H, E
        prob.segAH = new MSegment(p, A, H, { color: [200, 100, 100], dashed: true });
        prob.pointH = new MPoint(p, H, "H", 10, -10);
        prob.segDE = new MSegment(p, D, E, { color: [200, 100, 100], dashed: true });
        prob.pointE = new MPoint(p, E, "E", 0, -15);

        // ===== Solution Phases =====
        // TODO: Solution phases will be added later
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
        // Phase 1: 삼각형 ABC와 기본 점들
        prob.pointA.display(0.2);
        prob.pointB.display(0.2);
        prob.pointC.display(0.2);

        if (prob.pointC.completed) {
            prob.segAB.display(0.6);
        }
        if (prob.segAB.completed) {
            prob.segBC.display(0.6);
        }
        if (prob.segBC.completed) {
            prob.segCA.display(0.6);
        }
        if (prob.segCA.completed) {
            prob.pointM.display(0.2);
        }

        // Phase 2: 이등변삼각형과 점 D
        if (prob.pointM.completed) {
            prob.pointD.display(0.2);
        }
        if (prob.pointD.completed) {
            prob.segBD.display(0.8);
        }

        // Phase 3: 수선의 발 H, E
        if (prob.segBD.completed) {
            prob.segAH.display(0.6);
        }
        if (prob.segAH.completed) {
            prob.pointH.display(0.2);
        }
        if (prob.pointH.completed) {
            prob.segDE.display(0.6);
        }
        if (prob.segDE.completed) {
            prob.pointE.display(0.2);
        }
    }

    // ===== Problem Static =====
    function drawProblemStatic() {
        prob.pointA.displayStatic();
        prob.pointB.displayStatic();
        prob.pointC.displayStatic();
        prob.segAB.displayStatic();
        prob.segBC.displayStatic();
        prob.segCA.displayStatic();
        prob.pointM.displayStatic();
        prob.pointD.displayStatic();
        prob.segBD.displayStatic();
        prob.segAH.displayStatic();
        prob.pointH.displayStatic();
        prob.segDE.displayStatic();
        prob.pointE.displayStatic();
    }

    // ===== Problem Phase Only =====
    function drawProblemPhaseOnly(phase) {
        if (phase === 1) {
            // Phase 1 animation
            prob.pointA.display(0.2);
            prob.pointB.display(0.2);
            prob.pointC.display(0.2);

            if (prob.pointC.completed) prob.segAB.display(0.6);
            if (prob.segAB.completed) prob.segBC.display(0.6);
            if (prob.segBC.completed) prob.segCA.display(0.6);
            if (prob.segCA.completed) prob.pointM.display(0.2);
        } else if (phase === 2) {
            // Phase 1 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.pointM.displayStatic();

            // Phase 2 animation
            prob.pointD.display(0.2);
            if (prob.pointD.completed) prob.segBD.display(0.8);
        } else if (phase === 3) {
            // Phases 1-2 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.pointM.displayStatic();
            prob.pointD.displayStatic();
            prob.segBD.displayStatic();

            // Phase 3 animation
            prob.segAH.display(0.6);
            if (prob.segAH.completed) prob.pointH.display(0.2);
            if (prob.pointH.completed) prob.segDE.display(0.6);
            if (prob.segDE.completed) prob.pointE.display(0.2);
        }
    }

    // ===== Solution Phases =====
    function drawSolutionPhases() {
        // TODO: Solution phases will be added later
    }

    // ===== Solution Phase Only =====
    function drawSolutionPhaseOnly(phase) {
        // TODO: Solution phases will be added later
    }
};

new p5(sketch);
