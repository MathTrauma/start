import p5 from 'p5';

export class TObject {
    constructor(p, options = {}) {
        this.p = p;
        this.progress = 0;
        this.started = false;
        this.completed = false;
        this.visible = false;
        this.mode = 'default';
        this.savedState = null; // State storage
        
        // Theme resolving logic
        const theme = p.theme || {
            stroke: [0, 0, 0],
            fillBlue: [255, 255, 255, 0],
            fillRed: [255, 255, 255, 0]
        };

        const defaultStroke = theme.stroke || [0, 0, 0];
        const defaultFill = [255, 255, 255, 0];

        this.style = {
            strokeColor: this.parseColor(options.color || options.strokeColor || defaultStroke),
            strokeWeight: options.weight || options.strokeWeight || 1.5,
            fillColor: this.parseColor(options.fillColor || defaultFill),
            filled: options.filled || false
        };
    }

    parseColor(c) {
        if (typeof c === 'string') {
            const col = this.p.color(c);
            return [col.levels[0], col.levels[1], col.levels[2], col.levels[3]];
        }
        return c; 
    }

    start(config = {}) {
        const mode = config.mode || 'default';
        if (this.started && this.completed) {
             this.mode = mode;
             this.progress = 0;
             this.completed = false;
             this.visible = true; // Always visible on new start
             this.onStart(config);
        } else if (!this.started) {
            this.started = true;
            this.visible = true;
            this.mode = mode;
            this.onStart(config);
        }
    }

    onStart(config) {}

    reset() {
        this.progress = 0;
        this.started = false;
        this.completed = false;
        this.visible = false;
        this.mode = 'default';
        this.savedState = null; // Reset saved state
        this.onReset();
    }
    
    onReset() {}

    saveCurrentState() {
        this.savedState = {
            visible: this.visible,
            mode: this.mode,
            progress: this.progress
        };
    }

    complete() {
        if (this.savedState) {
            this.visible = this.savedState.visible;
            this.mode = this.savedState.mode;
            this.progress = 1;
            this.completed = true;
            this.started = true;
        } else {
            this.progress = 1;
            this.completed = true;
            this.started = true;
            this.visible = true;
            this.mode = 'default';
        }
        this.onComplete();
    }
    
    onComplete() {
         if (this.morphTarget) {
             this.vertices = this.morphTarget.map(v => v.copy());
             this.isMorphing = false;
         }
    }

    process(dt, duration) {
        if (this.completed) return;
        if (duration === 0) {
            this.progress = 1;
            this.completed = true;
            this.saveCurrentState(); // Save state immediately
            return;
        }
        this.progress += dt / duration;
        if (this.progress >= 1) {
            this.progress = 1;
            this.completed = true;
            if (this.mode === 'fadeOut') {
                this.visible = false;
            }
            this.saveCurrentState(); // Save final state
        }
    }

    isCompleted() { return this.completed; }

    getRenderStyle() {
        let strokeAlpha = 255;
        let fillAlpha = 0;
        const baseStrokeAlpha = (this.style.strokeColor.length > 3) ? this.style.strokeColor[3] : 255;
        const baseFillAlpha = (this.style.fillColor.length > 3) ? this.style.fillColor[3] : 100;
        let weight = this.style.strokeWeight;

        if (this.mode === 'fadeOut') {
            const factor = 1 - this.progress;
            strokeAlpha = baseStrokeAlpha * factor;
            fillAlpha = baseFillAlpha * factor;
        } 
        else if (this.mode === 'pulse') {
            const pulse = (Math.sin(this.progress * Math.PI * 6) + 1) / 2; 
            strokeAlpha = Math.min(255, baseStrokeAlpha + 55 * pulse);
            fillAlpha = baseFillAlpha + (255 - baseFillAlpha) * 0.3 * pulse; 
            weight = this.style.strokeWeight + 1 * pulse;
        }
        else if (this.mode === 'default') {
            strokeAlpha = baseStrokeAlpha;
            fillAlpha = this.progress * baseFillAlpha;
        }
        else {
            strokeAlpha = baseStrokeAlpha;
            fillAlpha = baseFillAlpha;
        }

        return {
            strokeColor: [...this.style.strokeColor.slice(0, 3), strokeAlpha],
            fillColor: [...this.style.fillColor.slice(0, 3), fillAlpha],
            strokeWeight: weight
        };
    }

    tx(val) { 
        if (typeof this.p.tx === 'function') return this.p.tx(val);
        if (typeof window.tx === 'function') return window.tx(val);
        return (val.x !== undefined ? val.x : val); 
    }
    ty(val) { 
        if (typeof this.p.ty === 'function') return this.p.ty(val);
        if (typeof window.ty === 'function') return window.ty(val);
        return (val.y !== undefined ? val.y : val); 
    }

    render() {}
}

export class TPoint extends TObject {
    constructor(p, pos, label = "", options = {}) {
        super(p, options);
        this.pos = pos;
        this.label = label;
        this.dx = options.dx || 10;
        this.dy = options.dy || 10;
        
        const theme = p.theme || {};
        const defaultColor = theme.text || [0, 0, 0];
        
        if (!options.color && !options.fillColor) {
            this.style.fillColor = this.parseColor(defaultColor);
        }
        
        this.style.radius = options.radius || 6;
    }

    render() {
        const p = this.p;
        const style = this.getRenderStyle();
        
        let x = this.tx(this.pos);
        let y = this.ty(this.pos);

        p.push();
        p.noStroke();
        
        p.fill(style.fillColor); 
        p.circle(x, y, this.style.radius * (this.mode === 'pulse' ? (1 + 0.2 * (style.strokeWeight/this.style.strokeWeight)) : 1));

        if (this.label) {
            p.fill(style.fillColor);
            p.push();
            p.translate(x, y);
            p.scale(1, -1);
            p.text(this.label, this.dx, this.dy);
            p.pop();
        }
        p.pop();
    }
}

export class TSegment extends TObject {
    constructor(p, startPos, endPos, options = {}) {
        super(p, options);
        this.startPos = startPos;
        this.endPos = endPos;
        
        const theme = p.theme || {};
        if (options.dashed && !options.color) {
             this.style.strokeColor = this.parseColor(theme.auxiliary || [150,150,150]);
        }
        
        this.dashed = options.dashed || false;
    }

    render() {
        const p = this.p;
        const style = this.getRenderStyle();
        p.push();
        
        p.stroke(style.strokeColor);
        p.strokeWeight(style.strokeWeight);
        if (this.dashed) p.drawingContext.setLineDash([5, 5]);

        let sx = this.tx(this.startPos), sy = this.ty(this.startPos);
        let ex = this.tx(this.endPos), ey = this.ty(this.endPos);

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

export class TRightAngle extends TObject {
    constructor(p, p1, vertex, p2, size = 0.3, options = {}) {
        super(p, options);
        this.p1 = p1;
        this.vertex = vertex;
        this.p2 = p2;
        this.size = size;
    }
    render() {
        const p = this.p;
        const style = this.getRenderStyle();
        p.push();
        p.stroke(style.strokeColor);
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

export class TCircle extends TObject {
    constructor(p, center, radius, options = {}) {
        super(p, options);
        this.center = center;
        this.radius = radius;
    }
    render() {
        const p = this.p;
        const style = this.getRenderStyle();
        p.push();
        p.noFill();
        p.stroke(style.strokeColor);
        p.strokeWeight(style.strokeWeight);
        const cx = this.tx(this.center);
        const cy = this.ty(this.center);
        const s = (this.p.geometryScale) ? this.p.geometryScale : 60; 
        if (this.mode === 'default' && this.progress < 1) {
            p.arc(cx, cy, this.radius * 2 * s, this.radius * 2 * s, 0, this.progress * p.TWO_PI);
        } else {
            p.circle(cx, cy, this.radius * 2 * s);
        }
        p.pop();
    }
}

export class TAngleMarker extends TObject {
    constructor(p, p1, vertex, p2, options = {}) {
        super(p, options);
        this.p1 = p1;
        this.vertex = vertex;
        this.p2 = p2;
        this.distance = options.distance || 0.4;
        this.size = options.size || 4;
    }
    render() {
        const p = this.p;
        const style = this.getRenderStyle();
        let dir1 = p5.Vector.sub(this.p1, this.vertex).normalize().mult(0.5);
        let dir2 = p5.Vector.sub(this.p2, this.vertex).normalize().mult(0.5);
        let avgDir = p5.Vector.add(dir1, dir2).normalize().mult(this.distance);
        let dotPos = p5.Vector.add(this.vertex, avgDir);
        p.push();
        p.fill(style.fillColor); 
        p.noStroke();
        p.circle(this.tx(dotPos), this.ty(dotPos), this.size);
        p.pop();
    }
}

export class TPolygon extends TObject {
    constructor(p, vertices, options = {}) {
        super(p, options);
        this.vertices = vertices.map(v => v.copy ? v.copy() : this.p.createVector(v.x, v.y));
        this.originalVertices = this.vertices.map(v => v.copy());
        this.setupPerimeter();
        this.morphStart = null;
        this.morphTarget = null;
    }

    setupPerimeter() {
        this.perimeter = 0;
        this.dists = [];
        for(let i=0; i<this.vertices.length; i++) {
            const next = this.vertices[(i+1)%this.vertices.length];
            const d = this.p.dist(this.vertices[i].x, this.vertices[i].y, next.x, next.y);
            this.dists.push(d);
            this.perimeter += d;
        }
    }

    onStart(config) {
        if (config.morphTo) {
            this.morphStart = this.vertices.map(v => v.copy());
            this.morphTarget = config.morphTo.map(v => v.copy ? v.copy() : this.p.createVector(v.x, v.y));
            this.isMorphing = true;
        } else {
            this.isMorphing = false;
        }
    }

    onReset() {
        this.vertices = this.originalVertices.map(v => v.copy());
        this.isMorphing = false;
        this.morphStart = null;
        this.morphTarget = null;
    }
    
    onComplete() {
         if (this.morphTarget) {
             this.vertices = this.morphTarget.map(v => v.copy());
             this.isMorphing = false;
         }
    }

    render() {
        const p = this.p;
        const style = this.getRenderStyle();

        let renderVertices = this.vertices;
        if (this.isMorphing && this.morphStart && this.morphTarget) {
            renderVertices = this.morphStart.map((v, i) => {
                if (this.morphTarget[i]) {
                    return v.copy().lerp(this.morphTarget[i], this.progress);
                }
                return v;
            });
        }

        p.push();
        
        if (this.mode === 'travel') {
            p.stroke(style.strokeColor);
            p.strokeWeight(style.strokeWeight);
            if (this.style.filled) p.fill(style.fillColor);
            else p.noFill();
            
            p.beginShape();
            renderVertices.forEach(v => p.vertex(this.tx(v), this.ty(v)));
            p.endShape(p.CLOSE);

            const dist = this.perimeter * this.progress;
            let currentLen = 0;
            let targetX = renderVertices[0].x;
            let targetY = renderVertices[0].y;

            for (let i = 0; i < renderVertices.length; i++) {
                const start = renderVertices[i];
                const end = renderVertices[(i + 1) % renderVertices.length];
                const segLen = this.dists[i]; 

                if (currentLen + segLen >= dist) {
                    const ratio = (dist - currentLen) / segLen;
                    targetX = p.lerp(start.x, end.x, ratio);
                    targetY = p.lerp(start.y, end.y, ratio);
                    break;
                }
                currentLen += segLen;
            }
            this.drawTravelingCircle(this.tx({x:targetX, y:targetY}), this.ty({x:targetX, y:targetY}));

        } else {
            p.stroke(style.strokeColor);
            p.strokeWeight(style.strokeWeight);
            if (this.style.filled) p.fill(style.fillColor);
            else p.noFill();

            if (this.isMorphing || this.mode === 'fadeOut' || this.mode === 'pulse' || (this.mode === 'default' && this.progress >= 1)) {
                p.beginShape();
                renderVertices.forEach(v => p.vertex(this.tx(v), this.ty(v)));
                p.endShape(p.CLOSE);
            } else if (this.mode === 'default') {
                const drawLen = this.perimeter * this.progress;
                let currentLen = 0;
                p.beginShape();
                if (this.vertices.length > 0) {
                    p.vertex(this.tx(this.vertices[0]), this.ty(this.vertices[0]));
                    for (let i = 0; i < this.vertices.length; i++) {
                        const start = this.vertices[i];
                        const end = this.vertices[(i + 1) % this.vertices.length];
                        const segLen = this.dists[i];
                        if (currentLen + segLen <= drawLen) {
                            p.vertex(this.tx(end), this.ty(end));
                            currentLen += segLen;
                        } else {
                            const ratio = (drawLen - currentLen) / segLen;
                            const interX = p.lerp(start.x, end.x, ratio);
                            const interY = p.lerp(start.y, end.y, ratio);
                            p.vertex(this.tx({x:interX, y:interY}), this.ty({x:interX, y:interY}));
                            break;
                        }
                    }
                }
                p.endShape(); 
            }
        }
        
        p.pop();
        
        if (this.isMorphing && this.progress >= 1) {
            this.vertices = this.morphTarget.map(v => v.copy());
            this.setupPerimeter();
            this.isMorphing = false; 
            this.morphStart = null;
            this.morphTarget = null;
        }
    }

    drawTravelingCircle(x, y) {
        const p = this.p;
        p.push();
        // Highlight color logic could also come from theme
        const highlight = (this.p.theme && this.p.theme.highlight) ? this.p.theme.highlight : '#22d3ee';
        p.drawingContext.shadowBlur = 15;
        p.drawingContext.shadowColor = highlight; 
        p.noStroke();
        p.fill(highlight); 
        p.circle(x, y, 10);
        p.fill(255);
        p.circle(x, y, 5);
        p.pop();
    }
}