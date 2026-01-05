/**
 * euclide-geometry/lib_gemini/animator.js
 * 
 * Gemini Refactored Animation Library v1.1
 * - Includes 'fadeOut' mode support
 * - Added GCircle and GAngleMarker
 */

class Animator {
    constructor(p) {
        this.p = p;
        this.sequences = new Map();
        this.currentSequenceName = null;
        this.currentStepIndex = 0;
        this.isPaused = false;
        this.renderList = [];
    }

    registerSequence(name, steps) {
        this.sequences.set(name, steps);
    }

    play(name) {
        if (!this.sequences.has(name)) {
            console.warn(`Sequence '${name}' not found.`);
            return;
        }
        this.currentSequenceName = name;
        this.currentStepIndex = 0;
        this.renderList = [];
        
        const steps = this.sequences.get(name);
        const uniqueObjects = new Set();
        
        steps.forEach(step => {
            if (step.target) uniqueObjects.add(step.target);
            if (Array.isArray(step.group)) {
                step.group.forEach(item => {
                    if (item.target) uniqueObjects.add(item.target);
                });
            }
        });

        uniqueObjects.forEach(obj => {
            obj.reset();
            this.renderList.push(obj);
        });
    }

    updateAndDraw() {
        if (!this.currentSequenceName) return;
        this.update();
        this.draw();
    }

    update() {
        if (this.isPaused) return;
        if (typeof isPaused !== 'undefined' && isPaused) return;

        const steps = this.sequences.get(this.currentSequenceName);
        if (!steps || this.currentStepIndex >= steps.length) return;

        const currentStep = steps[this.currentStepIndex];
        const dt = this.p.deltaTime / 1000;

        let stepComplete = false;

        if (currentStep.group) {
            let allComplete = true;
            currentStep.group.forEach(item => {
                const target = item.target;
                const duration = item.duration !== undefined ? item.duration : 1.0;
                const mode = item.mode || 'default';
                
                if (!target.started) target.start(mode);
                target.process(dt, duration);
                
                if (!target.isCompleted()) allComplete = false;
            });
            stepComplete = allComplete;
        } else {
            const target = currentStep.target;
            const duration = currentStep.duration !== undefined ? currentStep.duration : 1.0;
            const mode = currentStep.mode || 'default';

            if (target) {
                if (!target.started) target.start(mode);
                target.process(dt, duration);
                stepComplete = target.isCompleted();
            } else {
                stepComplete = true;
            }
        }

        if (stepComplete) {
            this.currentStepIndex++;
        }
    }

    draw() {
        this.renderList.forEach(obj => {
            if (obj.visible) obj.render();
        });
    }
}

class GObject {
    constructor(p) {
        this.p = p;
        this.progress = 0;
        this.started = false;
        this.completed = false;
        this.visible = false;
        this.mode = 'default'; // default, fadeOut
        this.style = {
            strokeColor: [0, 0, 0],
            strokeWeight: 1.5,
            fillColor: [255, 255, 255, 0],
            filled: false
        };
    }

    start(mode = 'default') {
        // If restarting for a new mode (like fadeOut), reset progress but keep visible
        if (this.started && this.completed && mode !== this.mode) {
             this.mode = mode;
             this.progress = 0;
             this.completed = false;
        } else if (!this.started) {
            this.started = true;
            this.visible = true;
            this.mode = mode;
        }
    }

    reset() {
        this.progress = 0;
        this.started = false;
        this.completed = false;
        this.visible = false;
        this.mode = 'default';
    }

    process(dt, duration) {
        if (this.completed) return;
        if (duration === 0) {
            this.progress = 1;
            this.completed = true;
            return;
        }

        this.progress += dt / duration;
        if (this.progress >= 1) {
            this.progress = 1;
            this.completed = true;
        }
    }

    isCompleted() {
        return this.completed;
    }

    getAlpha() {
        if (this.mode === 'fadeOut') {
            return (1 - this.progress) * 255;
        }
        return this.progress * 255;
    }

    tx(val) { return (typeof window.tx === 'function') ? window.tx(val) : (val.x !== undefined ? val.x : val); }
    ty(val) { return (typeof window.ty === 'function') ? window.ty(val) : (val.y !== undefined ? val.y : val); }

    render() {}
}

class GPoint extends GObject {
    constructor(p, pos, label = "", options = {}) {
        super(p);
        this.pos = pos;
        this.label = label;
        this.dx = options.dx || 10;
        this.dy = options.dy || 10;
        this.style.fillColor = options.color || [0, 0, 0];
        this.style.radius = options.radius || 6;
    }

    render() {
        const p = this.p;
        // Points usually don't fade out slowly in geometric construction unless specified,
        // but we respect getAlpha() for general fadeOut support.
        // For 'default' (fadeIn), points usually just appear or pop. 
        // Let's make them fade in alpha.
        const alpha = this.getAlpha();
        
        p.push();
        p.noStroke();
        p.fill(...this.style.fillColor, alpha);
        
        let x = this.tx(this.pos);
        let y = this.ty(this.pos);

        p.circle(x, y, this.style.radius);

        if (this.label) {
            p.scale(1, -1);
            p.fill(...this.style.fillColor, alpha);
            p.text(this.label, x + this.dx, -y + this.dy);
            p.scale(1, -1);
        }
        p.pop();
    }
}

class GSegment extends GObject {
    constructor(p, startPos, endPos, options = {}) {
        super(p);
        this.startPos = startPos;
        this.endPos = endPos;
        this.style.strokeColor = options.color || [0, 0, 0];
        this.style.strokeWeight = options.weight || 1.5;
        this.dashed = options.dashed || false;
    }

    render() {
        const p = this.p;
        p.push();
        
        let alpha = 255;
        if (this.mode === 'fadeOut') alpha = this.getAlpha();
        
        const col = this.style.strokeColor;
        p.stroke(col[0], col[1], col[2], alpha);
        p.strokeWeight(this.style.strokeWeight);
        if (this.dashed) p.drawingContext.setLineDash([5, 5]);

        let sx = this.tx(this.startPos);
        let sy = this.ty(this.startPos);
        let ex = this.tx(this.endPos);
        let ey = this.ty(this.endPos);

        // For fadeIn, we draw partial line. For fadeOut, we draw full line with fading alpha.
        let currX = ex, currY = ey;
        if (this.mode === 'default') {
            currX = p.lerp(sx, ex, this.progress);
            currY = p.lerp(sy, ey, this.progress);
        }

        p.line(sx, sy, currX, currY);

        if (this.dashed) p.drawingContext.setLineDash([]);
        p.pop();
    }
}

class GRightAngle extends GObject {
    constructor(p, p1, vertex, p2, size = 0.3, options = {}) {
        super(p);
        this.p1 = p1;
        this.vertex = vertex;
        this.p2 = p2;
        this.size = size;
        this.style.strokeColor = options.color || [0, 0, 0];
    }

    render() {
        const p = this.p;
        const alpha = this.getAlpha();

        p.push();
        p.stroke(...this.style.strokeColor, alpha);
        p.strokeWeight(1);
        p.noFill();

        const v1 = p5.Vector.sub(this.p1, this.vertex).normalize();
        const v2 = p5.Vector.sub(this.p2, this.vertex).normalize();
        
        const a = p5.Vector.add(this.vertex, p5.Vector.mult(v1, this.size));
        const b = p5.Vector.add(a, p5.Vector.mult(v2, this.size));
        const c = p5.Vector.add(this.vertex, p5.Vector.mult(v2, this.size));

        p.line(this.tx(a), this.ty(a), this.tx(b), this.ty(b));
        p.line(this.tx(b), this.ty(b), this.tx(c), this.ty(c));
        p.pop();
    }
}

class GCircle extends GObject {
    constructor(p, center, radius, options = {}) {
        super(p);
        this.center = center;
        this.radius = radius;
        this.style.strokeColor = options.color || [0, 0, 0];
        this.style.strokeWeight = options.weight || 1.5;
    }

    render() {
        const p = this.p;
        p.push();
        p.noFill();
        
        let alpha = 255;
        if (this.mode === 'fadeOut') alpha = this.getAlpha();
        
        p.stroke(...this.style.strokeColor, alpha);
        p.strokeWeight(this.style.strokeWeight);

        const cx = this.tx(this.center);
        const cy = this.ty(this.center);
        
        // Scale handling if needed. Assuming global 'scale' var exists or just 1.
        const s = (typeof scale !== 'undefined') ? scale : 1; 

        if (this.mode === 'default' && this.progress < 1) {
            p.arc(cx, cy, this.radius * 2 * s, this.radius * 2 * s, 0, this.progress * 360);
        } else {
            p.circle(cx, cy, this.radius * 2 * s);
        }
        p.pop();
    }
}

class GAngleMarker extends GObject {
    constructor(p, p1, vertex, p2, options = {}) {
        super(p);
        this.p1 = p1;
        this.vertex = vertex;
        this.p2 = p2;
        this.distance = options.distance || 0.4;
        this.size = options.size || 4;
        this.style.fillColor = options.color || [0, 0, 0];
    }

    render() {
        const p = this.p;
        const alpha = this.getAlpha();

        let dir1 = p5.Vector.sub(this.p1, this.vertex).normalize().mult(0.5);
        let dir2 = p5.Vector.sub(this.p2, this.vertex).normalize().mult(0.5);
        let avgDir = p5.Vector.add(dir1, dir2).normalize().mult(this.distance);
        let dotPos = p5.Vector.add(this.vertex, avgDir);

        p.push();
        p.fill(...this.style.fillColor, alpha);
        p.noStroke();
        p.circle(this.tx(dotPos), this.ty(dotPos), this.size);
        p.pop();
    }
}

class GPolygon extends GObject {
    constructor(p, vertices, options = {}) {
        super(p);
        this.vertices = vertices; 
        this.style.strokeColor = options.color || [0, 0, 0];
        this.style.strokeWeight = options.weight || 1.5;
        this.style.fillColor = options.fillColor || [200, 200, 200];
        this.style.filled = options.filled || false;
        
        this.perimeter = 0;
        this.dists = [];
        for(let i=0; i<vertices.length; i++) {
            const next = vertices[(i+1)%vertices.length];
            const d = p.dist(vertices[i].x, vertices[i].y, next.x, next.y);
            this.dists.push(d);
            this.perimeter += d;
        }
    }

    render() {
        const p = this.p;
        p.push();
        
        let strokeAlpha = 255;
        let fillAlphaVal = (this.style.fillColor.length > 3) ? this.style.fillColor[3] : 100;
        let fillAlpha = fillAlphaVal;

        if (this.mode === 'fadeOut') {
            const factor = 1 - this.progress;
            strokeAlpha *= factor;
            fillAlpha *= factor;
        } else if (this.mode === 'default') {
            // FadeIn handled by drawing partial lines, but fill needs alpha fade
            fillAlpha = this.progress * fillAlphaVal;
        }

        p.stroke(this.style.strokeColor[0], this.style.strokeColor[1], this.style.strokeColor[2], strokeAlpha);
        p.strokeWeight(this.style.strokeWeight);
        
        if (this.style.filled) {
            p.fill(this.style.fillColor[0], this.style.fillColor[1], this.style.fillColor[2], fillAlpha);
        } else {
            p.noFill();
        }

        const drawLen = (this.mode === 'default') ? this.perimeter * this.progress : this.perimeter;
        let currentLen = 0;

        p.beginShape();
        if (this.vertices.length > 0) {
            const v0 = this.vertices[0];
            p.vertex(this.tx(v0), this.ty(v0));

            for (let i = 0; i < this.vertices.length; i++) {
                const start = this.vertices[i];
                const end = this.vertices[(i + 1) % this.vertices.length];
                const segLen = this.dists[i];

                if (currentLen + segLen <= drawLen) {
                    p.vertex(this.tx(end), this.ty(end));
                    currentLen += segLen;
                } else {
                    const remain = drawLen - currentLen;
                    const ratio = remain / segLen;
                    const interX = p.lerp(start.x, end.x, ratio);
                    const interY = p.lerp(start.y, end.y, ratio);
                    p.vertex(this.tx({x:interX, y:interY}), this.ty({x:interX, y:interY}));
                    break;
                }
            }
        }
        
        if ((this.mode === 'default' && this.progress >= 1) || this.mode === 'fadeOut') {
            p.endShape(p.CLOSE);
        } else {
            p.endShape();
        }
        p.pop();
    }
}
