// Problem XXX Sketch Template

const sketch = (p) => {
    // Points
    let A, B, C;

    p.setup = () => {
        let canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        p.angleMode(p.DEGREES);

        // Define points
        A = p.createVector(0, 0);
        B = p.createVector(3, 0);
        C = p.createVector(0, 3);

        resetAnimation();
        setupControls(p);
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width/2, p.height/2);
        p.scale(1, -1);

        p.stroke(0);
        p.strokeWeight(1.5);
        p.noFill();

        // PHASE 1: Example (0-2 seconds)
        m_drawPoint(p, A, "A", -10, -5, 0);
        m_drawPoint(p, B, "B", 10, -5, 0.2);
        m_drawPoint(p, C, "C", -10, 10, 0.4);
        m_triangle(p, A, B, C, 0.6, 1.4);
    };
};

new p5(sketch);

// Setup UI controls
function setupControls(p) {
    document.getElementById('btn-restart').addEventListener('click', () => {
        resetAnimation();
    });

    const playPauseBtn = document.getElementById('btn-play-pause');
    playPauseBtn.addEventListener('click', () => {
        const paused = togglePause(p);
        playPauseBtn.textContent = paused ? 'Play' : 'Pause';
    });

    document.getElementById('btn-all').addEventListener('click', () => {
        setPhase('all');
        setActiveButton('btn-all');
    });

    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) {
            btn.addEventListener('click', () => {
                setPhase(i);
                setActiveButton(`btn-phase-${i}`);
            });
        }
    }
}

function setActiveButton(activeId) {
    document.getElementById('btn-all').classList.remove('active');
    for (let i = 1; i <= 10; i++) {
        const btn = document.getElementById(`btn-phase-${i}`);
        if (btn) btn.classList.remove('active');
    }
    document.getElementById(activeId).classList.add('active');
}
