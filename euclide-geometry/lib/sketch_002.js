// sketch_002.js (ES Module)
import p5 from 'p5';
import { Animator } from './animator.js';
import { TPoint, TSegment, TPolygon } from './t_object.js';
import { calculateScaleFromPoints, applyTheme } from './draw-utils.js';
import { intersectLines } from './geometry.js';

const sketch = (p) => {
    let animator;
    let A, B, C, D, M, N, O, E, F, G, H;
    let pA, pB, pC, pD, polyABCD, segAC, segBD, pM, pN, pO, segMO, segNO, segOE, segOF, segOG, segOH, pE, pF, pG, pH;
    let triGHD, triGHO, triDNG, triDNH, triGFC, triGFO;

    p.setup = () => {
        p.createCanvas(800, 600).parent('canvas-wrapper');
        p.pixelDensity(1);
        animator = new Animator(p);

        // Apply Theme from URL param or default
        const params = new URLSearchParams(window.location.search);
        const currentTheme = params.get('theme') || 'light';
        applyTheme(p, currentTheme);

        // 1. Define Geometry
        A = p.createVector(-2, -2);
        B = p.createVector(3, -2);
        C = p.createVector(1, 2);
        D = p.createVector(-1.25, 1);

        M = p5.Vector.add(A, C).mult(0.5);
        N = p5.Vector.add(B, D).mult(0.5);

        let dirBD = p5.Vector.sub(D, B);
        let dirAC = p5.Vector.sub(C, A);
        
        // Use geometry.js intersectLines (A, B, C, D) where AB and CD are lines
        O = intersectLines(
            M, p5.Vector.add(M, dirBD), 
            N, p5.Vector.add(N, dirAC)
        );

        E = p5.Vector.add(A, B).mult(0.5);
        F = p5.Vector.add(B, C).mult(0.5);
        G = p5.Vector.add(C, D).mult(0.5);
        H = p5.Vector.add(D, A).mult(0.5);

        // Auto-Scale
        calculateScaleFromPoints(p, [A, B, C, D, O, E, F, G, H, M, N], p.width, p.height, 60);

        // Objects - Use Theme Colors
        const t = p.theme; // Access theme properties

        pA = new TPoint(p, A, "A", { dx: -15, dy: 15 });
        pB = new TPoint(p, B, "B", { dx: 10, dy: 15 });
        pC = new TPoint(p, C, "C", { dx: 10, dy: -10 });
        pD = new TPoint(p, D, "D", { dx: -15, dy: -10 });
        
        polyABCD = new TPolygon(p, [A, B, C, D], { color: t.stroke, weight: 2 });
        
        segAC = new TSegment(p, A, C, { dashed: true }); // Uses theme auxiliary color by default
        segBD = new TSegment(p, B, D, { dashed: true });
        
        pM = new TPoint(p, M, "M", { dx: 5, dy: -5, color: t.stroke }); // Or specialized color
        pN = new TPoint(p, N, "N", { dx: 5, dy: 5, color: t.stroke });
        pO = new TPoint(p, O, "O", { dx: 10, dy: 10, color: '#FF0000' }); // Keep specialized color for O? Or use t.highlight? Let's use red for emphasis.
        
        segMO = new TSegment(p, M, O, { color: t.auxiliary, dashed: true });
        segNO = new TSegment(p, N, O, { color: t.auxiliary, dashed: true });
        
        const redLine = t.fillRed.slice(0,3).concat([255]); // Make opaque red from fill color
        segOE = new TSegment(p, O, E, { color: redLine });
        segOF = new TSegment(p, O, F, { color: redLine });
        segOG = new TSegment(p, O, G, { color: redLine });
        segOH = new TSegment(p, O, H, { color: redLine });
        
        pE = new TPoint(p, E, "E", { dx: 0, dy: 15 });
        pF = new TPoint(p, F, "F", { dx: 10, dy: 0 });
        pG = new TPoint(p, G, "G", { dx: 0, dy: -15 });
        pH = new TPoint(p, H, "H", { dx: -15, dy: 0 });

        // Solution Triangles
        triGHD = new TPolygon(p, [G, H, D], { filled: true, fillColor: t.fillBlue, color: t.fillBlue }); // Stroke matches fill
        triGHO = new TPolygon(p, [G, H, O], { filled: true, fillColor: t.fillBlue, color: t.fillBlue });
        
        triDNG = new TPolygon(p, [D, N, G], { filled: true, fillColor: t.fillBlue, color: t.fillBlue });
        triDNH = new TPolygon(p, [D, N, H], { filled: true, fillColor: t.fillBlue, color: t.fillBlue });

        triGFC = new TPolygon(p, [G, F, C], { filled: true, fillColor: t.fillBlue, color: t.fillBlue });
        triGFO = new TPolygon(p, [G, F, O], { filled: true, fillColor: t.fillBlue, color: t.fillBlue });

        // Sequences
        animator.registerSequence("Problem_Phase1", [
            { group: [{target: pA}, {target: pB}, {target: pC}, {target: pD}], duration: 0.2 },
            { target: polyABCD, duration: 1.5 }
        ]);
        animator.registerSequence("Problem_Phase2", [
            { group: [{target: segAC}, {target: segBD}], duration: 1.0 },
            { group: [{target: pM}, {target: pN}], duration: 0.2 },
            { group: [{target: segMO}, {target: segNO}], duration: 0.5 },
            { target: pO, duration: 0.2 }
        ]);
        animator.registerSequence("Problem_Phase3", [
            { group: [{target: segOE}, {target: segOF}, {target: segOG}, {target: segOH}], duration: 1.0 },
            { group: [{target: pE}, {target: pF}, {target: pG}, {target: pH}], duration: 0.2 }
        ]);
        animator.registerSequence("Solution_Phase1", [
            { group: [{target: triGHD}, {target: triGHO}], duration: 1.5 },
            { target: triGHO, mode: 'travel', duration: 1.5 },
            { target: triGHO, morphTo: [G, H, N], duration: 1.5 },
            { target: triGHO, mode: 'pulse', duration: 1.0 }
        ]);
        animator.registerSequence("Solution_Phase2", [
            { group: [{target: triDNG}, {target: triDNH}], duration: 1.5 }
        ]);
        animator.registerSequence("Solution_Phase3", [
            { group: [{target: triGFC}, {target: triGFO}], duration: 1.5 },
            { target: triGFO, mode: 'travel', duration: 1.5 },
            { target: triGFO, morphTo: [G, F, M], duration: 1.5 },
            { target: triGFO, mode: 'pulse', duration: 1.0 }
        ]);

        window.playPhase = (name) => {
            const phases = [
                'Problem_Phase1', 
                'Problem_Phase2', 
                'Problem_Phase3', 
                'Solution_Phase1', 
                'Solution_Phase2', 
                'Solution_Phase3'
            ];

            const idx = phases.indexOf(name);

            if (idx === -1) {
                console.warn(`Phase '${name}' not found.`);
                return;
            }

            let opts = { retain: true };

            if (idx === 0) {
                opts.retain = false;
            } else {
                opts.precursors = phases.slice(0, idx);
            }

            animator.play(name, opts);
        };
        
        window.setTheme = (themeName) => {
            applyTheme(p, themeName);
            // Force objects to re-read theme colors if they cached them?
            // Currently TObject reads theme in constructor OR getRenderStyle reads dynamic properties?
            // TObject constructor caches 'this.style'. 
            // We need a way to update styles dynamically.
            // Simple hack: reload sketch? No.
            // Better: make TObject.getRenderStyle() read from p.theme if 'useTheme' flag is set?
            // Or just iterate all objects and update styles.
            // For now, let's just set the theme on p. The next frame draw() calls background(p.theme.background).
            // But objects won't change color unless we rebuild them or they reference theme dynamically.
            // TObject constructor: this.style = { ... options.color || theme.stroke ... }
            // So they are cached.
            // We should reload the page for theme change or implement a 'updateTheme()' on all objects.
            // Let's implement full reload for simplicity in this test environment, or just accept background change.
            // Actually, let's just expose it and let user reload if needed, or better:
            // Since this is a test, let's just make getRenderStyle use theme if style is default?
            // Too complex for now. Let's just set it and redraw background.
            // Real solution: Restart sketch.
        };
        
        window.playPhase("Problem_Phase1");
    };



    p.draw = () => {
        // Use theme background
        p.background(p.theme.background);
        
        p.push();
        p.translate(p.width / 2, p.height / 2 - 40);
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();
        
        if (animator.currentSequenceName === "Problem_Phase1" && isSequenceComplete("Problem_Phase1")) 
            window.playPhase("Problem_Phase2");
        else if (animator.currentSequenceName === "Problem_Phase2" && isSequenceComplete("Problem_Phase2")) 
            window.playPhase("Problem_Phase3");
        else if (animator.currentSequenceName === "Problem_Phase3" && isSequenceComplete("Problem_Phase3")) 
            window.playPhase("Solution_Phase1");
        else if (animator.currentSequenceName === "Solution_Phase1" && isSequenceComplete("Solution_Phase1")) 
            window.playPhase("Solution_Phase2");
        else if (animator.currentSequenceName === "Solution_Phase2" && isSequenceComplete("Solution_Phase2")) 
            window.playPhase("Solution_Phase3");
    };

    function isSequenceComplete(name) {
        const seq = animator.sequences.get(name);
        return animator.currentStepIndex >= seq.length;
    }
};

new p5(sketch);
