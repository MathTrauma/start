import p5 from 'p5';
import { applyTheme, getCanvasSize } from '../../lib/draw-utils.js';
import { XAnimator } from '../../lib/x_animator.js';
import {
    XPolygon, XSegment, XPoint, XCircle,
    XAngleMarker, XDimension, XObject, XText
} from '../../lib/x_object.js';
import { sketchContext } from '../../lib/sketch-context.js';

const sketch = (p) => {
    let A, B, C, D, E;
    let animator;

    p.setup = function () {
        const size = getCanvasSize(600, 20);
        p.createCanvas(size, size);
        p.pixelDensity(window.devicePixelRatio || 1);

        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode') || 'problem';

        A = p.createVector(0, 0);
        D = p.createVector(4, 0);
        B = p.createVector(10, 0);
        
        // Point C: AC = 2*sqrt(10), BC = 3*sqrt(10)
        // x = 2.5, y = sqrt(40 - 2.5^2) = sqrt(33.75) = 5.809475...
        const Cx = 2.5;
        const Cy = -Math.sqrt(33.75); // Use negative Y for coordinate system (A is (0,0), B is (10,0))
        C = p.createVector(Cx, Cy);

        // Point E: On line AC, CD // BE
        // CD slope: (Cy - 0) / (Cx - 4) = Cy / -1.5
        const m_cd = Cy / -1.5;
        // Line AC: y = (Cy/Cx) * x
        // Line BE: y = m_cd * (x - 10)
        // (Cy/Cx) * x = m_cd * x - 10 * m_cd
        // (Cy/Cx - m_cd) * x = -10 * m_cd
        const Ex = (-10 * m_cd) / (Cy / Cx - m_cd);
        const Ey = (Cy / Cx) * Ex;
        E = p.createVector(Ex, Ey);

        animator = new XAnimator(p);
        const t = p.theme;

        // --- PROBLEM PHASES ---
        
        // Phase 1
        animator.addPhase('Problem Phase 1', [
            { id: 'triABC', object: new XPolygon(p, [A, B, C]), animate: { mode: 'draw', duration: 2.0 } },
            { id: 'ptsABC', object: [new XPoint(p, A, 'A'), new XPoint(p, B, 'B'), new XPoint(p, C, 'C')], animate: { mode: 'display', duration: 0.3 } },
            { id: 'delay1_1', delay: 0.7 },
            { id: 'segAD', object: new XSegment(p, A, D), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'ptD', object: new XPoint(p, D, 'D', { position: 'below' }), animate: { mode: 'display', duration: 0.3 } },
            { id: 'anglesC', object: [
                new XAngleMarker(p, A, C, D, { marker: 'circle' }),
                new XAngleMarker(p, D, C, B, { marker: 'circle' })
            ], animate: { mode: 'draw', duration: 0.8 } },
            { id: 'dims1', object: [
                new XDimension(p, A, D, '4', { offset: -10 }),
                new XDimension(p, D, B, '6', { offset: -10 }),
                new XDimension(p, A, C, '2x', { offset: 10 }),
                new XDimension(p, C, B, '3x', { offset: 10 })
            ], animate: { mode: 'draw', duration: 1.2 } },
            { id: 'delay1_2', delay: 1.5 }
        ]);

        // Phase 2
        animator.addPhase('Problem Phase 2', [
            { id: 'segsE', object: [
                new XSegment(p, B, E, { dashed: true }),
                new XSegment(p, C, E, { dashed: true })
            ], animate: { mode: 'draw', duration: 1.2 } },
            { id: 'ptE', object: new XPoint(p, E, 'E'), animate: { mode: 'display', duration: 0.3 } },
            { id: 'dimEB', object: new XDimension(p, E, B, '15', { offset: 10 }), animate: { mode: 'draw', duration: 1.5 } },
            { id: 'anglesE', object: [
                new XAngleMarker(p, E, B, C, { marker: 'circle' }),
                new XAngleMarker(p, C, E, B, { marker: 'circle' })
            ], animate: { mode: 'draw', duration: 0.8 } },
            { id: 'delay2', delay: 2.0 }
        ]);

        // --- SOLUTION PHASES ---
        
        // Phase 1
        animator.addPhase('Solution Phase 1', [
            [
                { id: 'pulseCEB', target: 'anglesE', animate: { mode: 'pulse', duration: 3.0 } },
                { id: 'pulseACD', target: 'anglesC', animate: { mode: 'pulse', duration: 3.0 } },
                { id: 'travelACD', object: new XPolygon(p, [A, C, D]), animate: { mode: 'travel', duration: 3.0, repeat: 2 } },
                { id: 'travelAEB', object: new XPolygon(p, [A, E, B]), animate: { mode: 'travel', duration: 3.0, repeat: 2 } }
            ],
            { id: 'dimCD', object: new XDimension(p, C, D, '6', { offset: 10 }), animate: { mode: 'draw', duration: 1.2 } },
            { id: 'delayS1', delay: 1.5 },
            { id: 'pulseCD_BD', target: ['dimCD', 'dimBD'], animate: { mode: 'pulse', duration: 2.0 } },
            { id: 'angleCBD', object: new XAngleMarker(p, C, B, D, { marker: 'circle' }), animate: { mode: 'draw', duration: 0.8 } },
            { id: 'delayS1_2', delay: 1.5 }
        ]);

        // Phase 2
        animator.addPhase('Solution Phase 2', [
            { id: 'fadeAngles', target: ['anglesE', 'anglesC', 'angleCBD'], animate: { mode: 'fade', duration: 0.7, except: ['angleCBD', 'anglesC'] } },
            { id: 'pulseS2', target: ['angleCBD', 'anglesC'], animate: { mode: 'pulse', duration: 2.0 } },
            { id: 'delayS2_1', delay: 1.5 },
            { id: 'circCDB', object: new XCircle(p, getCircumcenter(C, D, B), p.dist(C.x, C.y, B.x, B.y)/2), animate: { mode: 'draw', duration: 1.8 } }, // Temporary circle logic
            { id: 'fillS2', object: [
                new XPolygon(p, [A, C, D], { filled: true, fillColor: [...t.fillBlue.slice(0, 3), 60] }),
                new XPolygon(p, [A, B, C], { filled: true, fillColor: [...t.fillRed.slice(0, 3), 60] })
            ], animate: { mode: 'draw', duration: 1.5 } },
            [
                { id: 'travelS2_1', object: new XPolygon(p, [A, C, D]), animate: { mode: 'travel', duration: 1.7 } },
                { id: 'travelS2_2', object: new XPolygon(p, [A, B, C]), animate: { mode: 'travel', duration: 1.7 } },
                { id: 'textS2', object: new XText(p, [50, 50], '\overline{AC}^2 = \overline{AD} \cdot \overline{AB}', { useTex: true, fontSize: 18, screenCoord: true }), animate: { mode: 'display', duration: 1.7 } }
            ],
            { id: 'delayS2_2', delay: 2.0 }
        ]);

        animator.initBounds([A, B, C, E]);
    };

    p.draw = function () {
        applyTheme(p);
        p.background(p.theme.background);
        animator.run();
    };
};

new p5(sketch, sketchContext.getContainer());
