// Problem 007: 내심과 외접원
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let A, B, C, I, O, D, E, F;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Base points - 삼각형 ABC
        B = p.createVector(0, 0);
        C = p.createVector(8, 0);
        A = p.createVector(2, 5);

        // I: 삼각형 ABC의 내심
        I = getIncenter(A, B, C);

        // O: 삼각형 ADI의 외접원의 중심
        // CI에 수직인 방향 벡터
        let dirCI = p5.Vector.sub(I, C).normalize();
        let perpDir = p.createVector(-dirCI.y, dirCI.x).mult(2);
        let perpPoint = p5.Vector.add(I, perpDir);

        // AI의 수직이등분선
        let midAI = p5.Vector.lerp(A, I, 0.5);
        let dirAI = p5.Vector.sub(I, A).normalize();
        let perpAI = p.createVector(-dirAI.y, dirAI.x);
        let perpAIPoint = p5.Vector.add(midAI, perpAI);

        // 두 직선의 교점 O
        O = intersectLines(I, perpPoint, midAI, perpAIPoint);

        // D: AB와 원 O의 교점 (A가 아닌 점)
        let intersectAB = circleLineIntersection(O, p5.Vector.dist(O, I), A, B);
        D = intersectAB[1];  // A가 아닌 점 선택

        // E: AC와 원 O의 교점 (A가 아닌 점)
        let intersectAC = circleLineIntersection(O, p5.Vector.dist(O, I), A, C);
        E = intersectAC[1];  // A가 아닌 점 선택

        // F: AC와 원 I의 교점 (E가 아닌 점)
        let intersectAC2 = circleLineIntersection(I, p5.Vector.dist(I, E), A, C);
        F = intersectAC2[0];  // E가 아닌 점 선택

        // Calculate scale from all points
        calculateScaleFromPoints([A, B, C, I, D, E, F], p.width, p.height, 60);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 삼각형 ABC와 내심 I
        prob.pointA = new MPoint(p, A, "A", -15, 15);
        prob.pointB = new MPoint(p, B, "B", -15, -10);
        prob.pointC = new MPoint(p, C, "C", 10, -10);

        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCA = new MSegment(p, C, A);

        prob.pointI = new MPoint(p, I, "I", 0, -15);
        prob.lineCI = new MSegment(p, C, I, { color: [100, 100, 200] });

        // Phase 2: 삼각형 ADI의 외접원
        prob.pointD = new MPoint(p, D, "D", -15, 0);
        prob.circleO = new MCircle(p, O, p5.Vector.dist(O, I), { color: [100, 100, 200] });

        // Phase 3: 점 E와 원 I
        prob.pointE = new MPoint(p, E, "E", 10, 0);
        prob.circleI = new MCircle(p, I, p5.Vector.dist(I, E), { color: [200, 100, 100] });
        prob.pointF = new MPoint(p, F, "F", -10, 15);

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
        // Phase 1: 삼각형 ABC와 내심 I
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
            prob.pointI.display(0.2);
        }
        if (prob.pointI.completed) {
            prob.lineCI.display(0.5);
        }

        // Phase 2: 삼각형 ADI의 외접원
        if (prob.lineCI.completed) {
            prob.pointD.display(0.2);
        }
        if (prob.pointD.completed) {
            prob.circleO.display(1.0);
        }

        // Phase 3: 점 E와 원 I
        if (prob.circleO.completed) {
            prob.pointE.display(0.2);
        }
        if (prob.pointE.completed) {
            prob.circleI.display(0.8);
        }
        if (prob.circleI.completed) {
            prob.pointF.display(0.2);
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
        prob.pointI.displayStatic();
        prob.lineCI.displayStatic();
        prob.pointD.displayStatic();
        prob.circleO.displayStatic();
        prob.pointE.displayStatic();
        prob.circleI.displayStatic();
        prob.pointF.displayStatic();
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
            if (prob.segCA.completed) prob.pointI.display(0.2);
            if (prob.pointI.completed) prob.lineCI.display(0.5);
        } else if (phase === 2) {
            // Phase 1 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.pointI.displayStatic();
            prob.lineCI.displayStatic();

            // Phase 2 animation
            prob.pointD.display(0.2);
            if (prob.pointD.completed) prob.circleO.display(1.0);
        } else if (phase === 3) {
            // Phases 1-2 static
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCA.displayStatic();
            prob.pointI.displayStatic();
            prob.lineCI.displayStatic();
            prob.pointD.displayStatic();
            prob.circleO.displayStatic();

            // Phase 3 animation
            prob.pointE.display(0.2);
            if (prob.pointE.completed) prob.circleI.display(0.8);
            if (prob.circleI.completed) prob.pointF.display(0.2);
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
