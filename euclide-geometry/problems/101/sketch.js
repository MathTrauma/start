// Problem 003: 원에 내접하는 사각형과 꺾은선에 의한 넓이 이등분
// 클래스 기반 애니메이션

let p5Instance;

const sketch = (p) => {
    // Points
    let O, A, B, C, D, P;
    const radius = 2;

    // Animation objects
    let prob = {};  // Problem phases
    let sol = {};   // Solution phases

    p5Instance = p;
    window._p5Instance = p;

    p.setup = () => {
        const canvas = p.createCanvas(600, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        O = p.createVector(0, 0);

        A = p.createVector(radius * p.cos(110), radius * p.sin(110));
        B = p.createVector(radius * p.cos(160), radius * p.sin(160));
        C = p.createVector(radius * p.cos(-110), radius * p.sin(-110));
        D = p.createVector(radius * p.cos(20), radius * p.sin(20));

        // Intersection of diagonals
        P = intersectLines(A, C, B, D);

        // Calculate scale from all points
        calculateScaleFromPoints([O, A, B, C, D], p.width, p.height, 80);

        initAnimations();
        resetAnimation();
    };

    function initAnimations() {
        // ===== Problem Phases =====
        // Phase 1: 원과 사각형
        prob.circle = new MCircle(p, O, radius);
        prob.pointA = new MPoint(p, A, "A", -15, -5);
        prob.pointB = new MPoint(p, B, "B", -15, -5);
        prob.pointC = new MPoint(p, C, "C", -5, 5);
        prob.pointD = new MPoint(p, D, "D", 10, 5);
        prob.segAB = new MSegment(p, A, B);
        prob.segBC = new MSegment(p, B, C);
        prob.segCD = new MSegment(p, C, D);
        prob.segDA = new MSegment(p, D, A);

        // Phase 2: 대각선과 중심
        prob.diagAC = new MSegment(p, A, C, { color: [128, 128, 128], dashed: true });
        prob.diagBD = new MSegment(p, B, D, { color: [128, 128, 128], dashed: true });
        prob.rightAngleP = new MRightAngle(p, A, P, B, 0.2);
        prob.segOA = new MSegment(p, O, A, { color: [100, 100, 200] });
        prob.segOB = new MSegment(p, O, B, { color: [100, 100, 200] });
        prob.segOC = new MSegment(p, O, C, { color: [100, 100, 200] });
        prob.segOD = new MSegment(p, O, D, { color: [100, 100, 200] });
        prob.pointO = new MPoint(p, O, "O", -15, -10);

        // ===== Solution Phases =====
        let midBD = p5.Vector.add(B, D).mult(0.5);

        // Phase 1: 등적변환
        sol.pointM = new MPoint(p, midBD, "M", 10, 5);
        sol.segOM = new MSegment(p, O, midBD, { color: [128, 128, 128], dashed: true });
        sol.triAOC = new MMovingTriangle(p, A, O, C, midBD, {
            fillColor: [100, 100, 200, 80],
            strokeColor: [100, 100, 200]
        });
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
        // p.background(255);
        p.background(15, 23, 42);

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

    // ===== Problem Phases (클래스 기반) =====
    function drawProblemPhases() {
        // Phase 1: 원과 사각형 ABCD
        prob.circle.display(0.8);
        prob.pointA.display(0.2);
        prob.pointB.display(0.2);
        prob.pointC.display(0.2);
        prob.pointD.display(0.2);

        if (prob.pointD.completed) {
            prob.segAB.display(0.3);
        }
        if (prob.segAB.completed) {
            prob.segBC.display(0.3);
        }
        if (prob.segBC.completed) {
            prob.segCD.display(0.3);
        }
        if (prob.segCD.completed) {
            prob.segDA.display(0.3);
        }

        // Phase 2: 대각선과 중심
        if (prob.segDA.completed) {
            prob.diagAC.display(0.6);
            prob.diagBD.display(0.6);
        }

        if (prob.diagAC.completed) {
            prob.rightAngleP.display(0.3);
        }

        if (prob.rightAngleP.completed) {
            prob.segOA.display(0.4);
            prob.segOB.display(0.4);
            prob.segOC.display(0.4);
            prob.segOD.display(0.4);
        }

        if (prob.segOA.completed) {
            prob.pointO.display(0.2);
        }
    }

    // ===== Problem Static (Solution 모드용) =====
    function drawProblemStatic() {
        prob.circle.displayStatic();
        prob.pointA.displayStatic();
        prob.pointB.displayStatic();
        prob.pointC.displayStatic();
        prob.pointD.displayStatic();
        prob.segAB.displayStatic();
        prob.segBC.displayStatic();
        prob.segCD.displayStatic();
        prob.segDA.displayStatic();
        prob.diagAC.displayStatic();
        prob.diagBD.displayStatic();
        prob.rightAngleP.displayStatic();
        prob.segOA.displayStatic();
        prob.segOB.displayStatic();
        prob.segOC.displayStatic();
        prob.segOD.displayStatic();
        prob.pointO.displayStatic();
    }

    // ===== Problem Phase Only (단계별) =====
    function drawProblemPhaseOnly(phase) {
        if (phase === 1) {
            // Phase 1만 애니메이션
            prob.circle.display(0.8);
            prob.pointA.display(0.2);
            prob.pointB.display(0.2);
            prob.pointC.display(0.2);
            prob.pointD.display(0.2);

            if (prob.pointD.completed) {
                prob.segAB.display(0.3);
            }
            if (prob.segAB.completed) {
                prob.segBC.display(0.3);
            }
            if (prob.segBC.completed) {
                prob.segCD.display(0.3);
            }
            if (prob.segCD.completed) {
                prob.segDA.display(0.3);
            }
        } else if (phase === 2) {
            // Phase 1은 static
            prob.circle.displayStatic();
            prob.pointA.displayStatic();
            prob.pointB.displayStatic();
            prob.pointC.displayStatic();
            prob.pointD.displayStatic();
            prob.segAB.displayStatic();
            prob.segBC.displayStatic();
            prob.segCD.displayStatic();
            prob.segDA.displayStatic();

            // Phase 2 애니메이션
            prob.diagAC.display(0.6);
            prob.diagBD.display(0.6);

            if (prob.diagAC.completed) {
                prob.rightAngleP.display(0.3);
            }

            if (prob.rightAngleP.completed) {
                prob.segOA.display(0.4);
                prob.segOB.display(0.4);
                prob.segOC.display(0.4);
                prob.segOD.display(0.4);
            }

            if (prob.segOA.completed) {
                prob.pointO.display(0.2);
            }
        }
    }

    // ===== Solution Phases (클래스 기반) =====
    function drawSolutionPhases() {
        // Phase 1: 등적변환
        sol.pointM.display(0.3);

        if (sol.pointM.completed) {
            sol.segOM.display(0.7);
        }

        if (sol.segOM.completed) {
            sol.triAOC.display(1.5);
        }
    }

    // ===== Solution Phase Only (단계별) =====
    function drawSolutionPhaseOnly(phase) {
        if (phase === 1) {
            sol.pointM.display(0.3);

            if (sol.pointM.completed) {
                sol.segOM.display(0.7);
            }

            if (sol.segOM.completed) {
                sol.triAOC.display(1.5);
            }
        }
    }
};

new p5(sketch);
