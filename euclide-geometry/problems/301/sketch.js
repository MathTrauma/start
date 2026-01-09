// sketch.js - Problem 004: 공원점
import p5 from 'p5';
import { Animator } from '../../lib/animator.js';
import { TPoint, TSegment, TPolygon, TRightAngle, TAngleMarker, TCircle } from '../../lib/t_object.js';
import { calculateScaleFromPoints, applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { projectPointToLine, intersectLines, getCircumcenter } from '../../lib/geometry.js';

const sketch = (p) => {
    let animator;
    let isAutoPlay = false;
    let A, B, C, D, E, F, H, G;
    let allPoints = [];
    
    // Global reference for legacy compatibility
    window._p5Instance = p;
    window.p5Instance = p;
    
    // Objects
    let polyABCD, pA, pB, pC, pD;
    let pE, pF, segED;
    let segAH, pH, rightAHE, triHFC;
    let segHG, pG, segFG, rightGHD, rightDCG, rightGFD;
    let segDG, circumCDG, rightCHF;
    let starFCE, starFDE, starEAH;

    p.setup = () => {
        const size = getCanvasSize(800, 20);
        p.createCanvas(size, size).parent('canvas-wrapper');
        p.pixelDensity(1);
        animator = new Animator(p);

        // Theme
        const params = new URLSearchParams(window.location.search);
        applyTheme(p, params.get('theme') || undefined);

        // 1. Geometry Setup
        A = p.createVector(-2, -2);
        B = p.createVector(2, -2);
        C = p.createVector(2, 2);
        D = p.createVector(-2, 2);

        E = p5.Vector.lerp(A, B, 0.25);
        F = p5.Vector.lerp(A, D, 0.25);
        
        H = projectPointToLine(A, E, D);
        G = intersectLines(A, H, B, C);

        allPoints = [A, B, C, D, E, F, H, G];
        calculateScaleFromPoints(p, allPoints, p.width, p.height, 60);

        const t = p.theme;

        // 2. Object Initialization
        // Problem Phase 1
        polyABCD = new TPolygon(p, [A, B, C, D], { color: t.stroke, weight: 2 });
        pA = new TPoint(p, A, "A", { dx: -15, dy: 15 });
        pB = new TPoint(p, B, "B", { dx: 15, dy: 15 });
        pC = new TPoint(p, C, "C", { dx: 15, dy: -15 });
        pD = new TPoint(p, D, "D", { dx: -15, dy: -15 });
        pE = new TPoint(p, E, "E", { dx: 0, dy: 15 });
        pF = new TPoint(p, F, "F", { dx: -15, dy: 0 });
        segED = new TSegment(p, E, D, { color: t.stroke });

        // Problem Phase 2
        segAH = new TSegment(p, A, H, { color: t.fillBlue });
        pH = new TPoint(p, H, "H", { dx: 10, dy: 15 });
        // 직각 표시 크기 0.3 -> 0.1
        rightAHE = new TRightAngle(p, A, H, E, 0.1, { color: t.stroke });
        triHFC = new TPolygon(p, [H, F, C], { 
            filled: true, 
            fillColor: [...t.fillBlue.slice(0, 3), 40], 
            color: [...t.fillBlue.slice(0, 3), 180]
        });

        // Solution Phase 1
        segHG = new TSegment(p, H, G, { color: t.fillRed });
        pG = new TPoint(p, G, "G", { dx: 15, dy: 0 });
        segFG = new TSegment(p, F, G, { color: t.stroke, dashed: true });
        // 직각 표시 크기 0.3 -> 0.1
        rightGHD = new TRightAngle(p, G, H, D, 0.1, { color: t.stroke });
        rightDCG = new TRightAngle(p, D, C, G, 0.1, { color: t.stroke });
        rightGFD = new TRightAngle(p, G, F, D, 0.1, { color: t.stroke });

        // Solution Phase 2
        segDG = new TSegment(p, D, G, { color: t.stroke, weight: 1.5 });
        const circumCenter = getCircumcenter(C, D, G);
        const radius = p5.Vector.dist(circumCenter, D);
        circumCDG = new TCircle(p, circumCenter, radius, { color: [100, 150, 200], weight: 1.5 });
        // 직각 표시 크기 0.3 -> 0.1
        rightCHF = new TRightAngle(p, C, H, F, 0.1, { color: t.fillRed });

        // Solution Phase 3
        // 이모지 크기 15 -> 8
        starFCE = new TAngleMarker(p, F, C, E, { distance: 0.8, emoji: '⭐', size: 8, fillColor: t.stroke });
        starFDE = new TAngleMarker(p, F, D, E, { distance: 0.8, emoji: '⭐', size: 8, fillColor: t.stroke });
        starEAH = new TAngleMarker(p, E, A, H, { distance: 0.8, emoji: '⭐', size: 8, fillColor: t.stroke });

        // 3. Sequence Registration
        animator.registerSequence("prob-1", [
            { target: polyABCD, duration: 1.0 },
            { group: [{ target: pA }, { target: pB }, { target: pC }, { target: pD }], duration: 0.3 },
            { target: null, duration: 0.5 }, // delay
            { group: [{ target: pE }, { target: pF }], duration: 0.3 },
            { target: segED, duration: 1.0 }
        ]);
        
        animator.registerSequence("prob-2", [
            { target: segAH, duration: 0.5 },
            { target: pH, duration: 0.3 },
            { target: rightAHE, duration: 0.5 },
            { target: triHFC, duration: 1.5 }
        ]);
        
        animator.registerSequence("sol-1", [
            { target: segHG, duration: 1.0 },
            { target: pG, duration: 0.3 },
            { target: segFG, duration: 1.0 },
            { group: [{ target: rightGHD }, { target: rightDCG }], duration: 0.5 },
            // Blink -> Pulse
            { group: [{ target: rightGHD, mode: 'pulse' }, { target: rightDCG, mode: 'pulse' }], duration: 0.9 },
            { target: rightGFD, duration: 0.5 }
        ]);
        
        animator.registerSequence("sol-2", [
            { target: segDG, duration: 1.5 },
            { target: circumCDG, duration: 2.0 },
            { group: [
                { target: rightGHD, mode: 'fadeOut', duration: 0.5 },
                { target: rightCHF, duration: 0.5 }
            ]}
        ]);
        
        animator.registerSequence("sol-3", [
            { target: starFCE, duration: 0.3 },
            { target: starFDE, duration: 0.3 },
            { target: starEAH, duration: 0.3 }
        ]);

        // Interface for UI Controls
        window.playPhase = (name) => {
            const phases = ['prob-1', 'prob-2', 'sol-1', 'sol-2', 'sol-3'];
            const idx = phases.indexOf(name);
            if (idx === -1) return;
            let opts = {};
            if (idx > 0) opts.precursors = phases.slice(0, idx);
            animator.play(name, opts);
        };

        window.resetAnimation = () => {
            isAutoPlay = true;
            window.playPhase('prob-1');
        };
        window.togglePause = () => { animator.isPaused = !animator.isPaused; return animator.isPaused; };
        window.setMode = (mode) => {
            if (mode === 'problem') { window.playPhase('prob-1'); return true; }
            if (mode === 'solution') { window.playPhase('sol-1'); return true; }
            return false;
        };
        window.getCurrentMode = () => animator.currentSequenceName?.startsWith('sol-') ? 'solution' : 'problem';
        window.setPhase = (phase) => {
            const currentMode = window.getCurrentMode();
            const prefix = currentMode === 'problem' ? 'prob-' : 'sol-';
            if (phase === 'all') {
                isAutoPlay = true;
                window.playPhase(prefix + '1');
            } else {
                isAutoPlay = false;
                window.playPhase(prefix + phase);
            }
        };
        window.problemPhaseCount = 2;
        window.solutionPhaseCount = 3;

        isAutoPlay = true;
        window.playPhase("prob-1");
    };

    p.draw = () => {
        p.background(p.theme.background);
        p.push();
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1);
        animator.updateAndDraw();
        p.pop();

        // Auto-play Logic
        if (isAutoPlay) {
            const problemPhases = ['prob-1', 'prob-2'];
            const solutionPhases = ['sol-1', 'sol-2', 'sol-3'];
            const currentSeqName = animator.currentSequenceName;
            
            const probIdx = problemPhases.indexOf(currentSeqName);
            if (probIdx >= 0 && probIdx < problemPhases.length - 1) {
                if (isSequenceComplete(currentSeqName)) {
                    window.playPhase(problemPhases[probIdx + 1]);
                }
            }
            
            const solIdx = solutionPhases.indexOf(currentSeqName);
            if (solIdx >= 0 && solIdx < solutionPhases.length - 1) {
                if (isSequenceComplete(currentSeqName)) {
                    const nextPhaseIndex = solIdx + 1;
                    window.playPhase(solutionPhases[nextPhaseIndex]);
                    if (typeof updateProblemText === 'function' && typeof globalPaddedId !== 'undefined') {
                        updateProblemText('solution', nextPhaseIndex + 1, globalPaddedId, globalBaseUrl);
                    }
                }
            }
        }
    };

    function isSequenceComplete(name) {
        const seq = animator.sequences.get(name);
        return seq && animator.currentStepIndex >= seq.length;
    }

    p.windowResized = () => {
        const size = getCanvasSize(800, 20);
        p.resizeCanvas(size, size);
        calculateScaleFromPoints(p, allPoints, p.width, p.height, 60);
    };
};

new p5(sketch);
