// Animation Classes for Geometry Problems
// 트리거 기반 애니메이션 시스템

// ===== 애니메이션 기본 클래스 =====
class Animatable {
    constructor(p) {
        this.p = p;
        this.t = 0;           // 진행률 (0~1)
        this.completed = false;
        this.started = false;
        this.visible = true;
    }

    display(duration) {
        if (!this.visible) return;

        if (duration === 0) {
            this.t = 1;
            this.completed = true;
            this.started = true;
            this.render(1);
            return;
        }

        if (!this.started) {
            this.started = true;
        }

        if (!this.completed && !isPaused) {
            this.t += (this.p.deltaTime / 1000) / duration;
            if (this.t >= 1) {
                this.t = 1;
                this.completed = true;
            }
        }

        this.render(this.t);
    }

    displayStatic() {
        if (!this.visible) return;
        this.t = 1;
        this.completed = true;
        this.started = true;
        this.render(1);
    }

    hide() {
        this.visible = false;
    }

    show() {
        this.visible = true;
    }

    reset() {
        this.t = 0;
        this.completed = false;
        this.started = false;
        this.visible = true;
    }

    render(t) {}
}

// ===== 선분 클래스 =====
class MSegment extends Animatable {
    constructor(p, sv, ev, options = {}) {
        super(p);
        this.sv = sv;
        this.ev = ev;
        this.color = options.color || [0, 0, 0];
        this.weight = options.weight || 1.5;
        this.dashed = options.dashed || false;
    }

    render(t) {
        this.p.stroke(...this.color);
        this.p.strokeWeight(this.weight);

        if (this.dashed) {
            this.p.drawingContext.setLineDash([5, 5]);
        }

        let sx = tx(this.sv), sy = ty(this.sv);
        let ex = tx(this.ev), ey = ty(this.ev);
        this.p.line(sx, sy, this.p.lerp(sx, ex, t), this.p.lerp(sy, ey, t));

        if (this.dashed) {
            this.p.drawingContext.setLineDash([]);
        }
    }
}

// ===== 점 클래스 =====
class MPoint extends Animatable {
    constructor(p, pt, label, dx, dy, options = {}) {
        super(p);
        this.pt = pt;
        this.label = label;
        this.dx = dx;
        this.dy = dy;
        this.color = options.color || [0, 0, 0];
        this.size = options.size || 6;
    }

    render(t) {
        let alpha = t * 255;
        this.p.fill(...this.color, alpha);
        this.p.noStroke();
        this.p.circle(tx(this.pt), ty(this.pt), this.size);

        this.p.scale(1, -1);
        this.p.fill(...this.color, alpha);
        this.p.text(this.label, tx(this.pt) + this.dx, -ty(this.pt) + this.dy);
        this.p.scale(1, -1);
        this.p.noFill();
    }
}

// ===== 직각 표시 클래스 =====
class MRightAngle extends Animatable {
    constructor(p, P1, V, P2, size, options = {}) {
        super(p);
        this.P1 = P1;
        this.V = V;
        this.P2 = P2;
        this.size = size;
        this.color = options.color || [0, 0, 0];
        this.weight = options.weight || 1;
    }

    render(t) {
        let alpha = t * 255;
        this.p.stroke(...this.color, alpha);
        this.p.strokeWeight(this.weight);

        let v1 = p5.Vector.sub(this.P1, this.V).normalize();
        let v2 = p5.Vector.sub(this.P2, this.V).normalize();
        let a = p5.Vector.add(this.V, p5.Vector.mult(v1, this.size));
        let b = p5.Vector.add(a, p5.Vector.mult(v2, this.size));
        let c = p5.Vector.add(this.V, p5.Vector.mult(v2, this.size));

        this.p.line(tx(a), ty(a), tx(b), ty(b));
        this.p.line(tx(b), ty(b), tx(c), ty(c));
    }
}

// ===== 깜빡이는 직각 표시 클래스 =====
class MBlinkingRightAngle extends Animatable {
    constructor(p, angles, size, blinkCount, options = {}) {
        super(p);
        this.angles = angles;
        this.size = size;
        this.blinkCount = blinkCount;
        this.delayTime = options.delayTime || 0.1;
        this.drawTime = options.drawTime || 0.2;
        this.cycleTime = this.delayTime + this.drawTime;
        this.color = options.color || [220, 50, 50];
        this.weight = options.weight || 2.5;
    }

    display(duration) {
        if (!this.visible) return;

        if (!this.started) {
            this.started = true;
        }

        if (!this.completed && !isPaused) {
            this.t += (this.p.deltaTime / 1000) / duration;
            if (this.t >= 1) {
                this.t = 1;
                this.completed = true;
            }
        }

        let elapsed = this.t * duration;
        let cycleIndex = Math.floor(elapsed / this.cycleTime);
        let timeInCycle = elapsed - (cycleIndex * this.cycleTime);

        if (cycleIndex >= this.blinkCount) {
            this.renderAngles();
            return;
        }

        if (timeInCycle < this.delayTime) return;

        this.renderAngles();
    }

    renderAngles() {
        this.p.stroke(...this.color);
        this.p.strokeWeight(this.weight);

        this.angles.forEach(([P1, V, P2]) => {
            let v1 = p5.Vector.sub(P1, V).normalize();
            let v2 = p5.Vector.sub(P2, V).normalize();
            let a = p5.Vector.add(V, p5.Vector.mult(v1, this.size));
            let b = p5.Vector.add(a, p5.Vector.mult(v2, this.size));
            let c = p5.Vector.add(V, p5.Vector.mult(v2, this.size));

            this.p.line(tx(a), ty(a), tx(b), ty(b));
            this.p.line(tx(b), ty(b), tx(c), ty(c));
        });
    }

    render(t) {}
}

// ===== 별 이모지 클래스 =====
class MAngleStar extends Animatable {
    constructor(p, P1, V, P2, distance = 0.3) {
        super(p);
        this.P1 = P1;
        this.V = V;
        this.P2 = P2;
        this.distance = distance;
    }

    render(t) {
        let alpha = t * 255;

        let v1 = p5.Vector.sub(this.P1, this.V).normalize();
        let v2 = p5.Vector.sub(this.P2, this.V).normalize();
        let mid = p5.Vector.add(v1, v2).normalize();
        let starPos = p5.Vector.add(this.V, p5.Vector.mult(mid, this.distance));

        this.p.push();
        this.p.scale(1, -1);
        this.p.textSize(16);
        this.p.fill(255, 200, 0, alpha);
        this.p.noStroke();
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.text("⭐", tx(starPos), -ty(starPos));
        this.p.pop();
    }
}

// ===== 채워진 삼각형 클래스 =====
class MFilledTriangle extends Animatable {
    constructor(p, v1, v2, v3, options = {}) {
        super(p);
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        this.fillColor = options.fillColor || [100, 100, 200];
        this.strokeColor = options.strokeColor || [100, 100, 200];
        this.maxAlpha = options.maxAlpha || 80;
    }

    render(t) {
        let alpha = t * this.maxAlpha;

        this.p.fill(...this.fillColor, alpha);
        this.p.stroke(...this.strokeColor, alpha + 50);
        this.p.strokeWeight(1.5);
        this.p.triangle(
            tx(this.v1), ty(this.v1),
            tx(this.v2), ty(this.v2),
            tx(this.v3), ty(this.v3)
        );
    }
}

// ===== 폴리곤 (정사각형 등) 클래스 =====
class MPolygon extends Animatable {
    constructor(p, vertices, options = {}) {
        super(p);
        this.vertices = vertices;
        this.color = options.color || [0, 0, 0];
        this.weight = options.weight || 1.5;
        this.filled = options.filled || false;
        this.fillColor = options.fillColor || [255, 255, 255, 0];
    }

    render(t) {
        let alpha = t * 255;
        this.p.stroke(...this.color, alpha);
        this.p.strokeWeight(this.weight);

        if (this.filled) {
            this.p.fill(...this.fillColor);
        } else {
            this.p.noFill();
        }

        this.p.beginShape();
        this.vertices.forEach(v => {
            this.p.vertex(tx(v), ty(v));
        });
        this.p.endShape(this.p.CLOSE);
    }
}

// ===== 원 클래스 =====
class MCircle extends Animatable {
    constructor(p, center, radius, options = {}) {
        super(p);
        this.center = center;
        this.radius = radius;
        this.color = options.color || [0, 0, 0];
        this.weight = options.weight || 1.5;
    }

    render(t) {
        this.p.noFill();
        this.p.stroke(...this.color);
        this.p.strokeWeight(this.weight);

        if (t < 1) {
            this.p.arc(tx(this.center), ty(this.center),
                this.radius * 2 * scale, this.radius * 2 * scale,
                0, t * 360);
        } else {
            this.p.circle(tx(this.center), ty(this.center), this.radius * 2 * scale);
        }
    }
}

// ===== 이동하는 삼각형 클래스 (등적변환용) =====
class MMovingTriangle extends Animatable {
    constructor(p, v1, vFrom, v2, vTo, options = {}) {
        super(p);
        this.v1 = v1;
        this.vFrom = vFrom;
        this.v2 = v2;
        this.vTo = vTo;
        this.fillColor = options.fillColor || [100, 100, 200];
        this.strokeColor = options.strokeColor || [100, 100, 200];
        this.fillAlpha = options.fillAlpha || 80;
    }

    render(t) {
        let vMoving = p5.Vector.lerp(this.vFrom, this.vTo, t);

        this.p.fill(...this.fillColor, this.fillAlpha);
        this.p.stroke(...this.strokeColor);
        this.p.strokeWeight(1.5);

        this.p.triangle(
            tx(this.v1), ty(this.v1),
            tx(vMoving), ty(vMoving),
            tx(this.v2), ty(this.v2)
        );
    }
}

// ===== 삼각형 테두리 클래스 =====
class MTriangle extends Animatable {
    constructor(p, v1, v2, v3, options = {}) {
        super(p);
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        this.color = options.color || [0, 0, 0];
        this.weight = options.weight || 1.5;
    }

    render(t) {
        let alpha = t * 255;
        this.p.noFill();
        this.p.stroke(...this.color, alpha);
        this.p.strokeWeight(this.weight);

        this.p.beginShape();
        this.p.vertex(tx(this.v1), ty(this.v1));
        this.p.vertex(tx(this.v2), ty(this.v2));
        this.p.vertex(tx(this.v3), ty(this.v3));
        this.p.endShape(this.p.CLOSE);
    }
}

// ===== 페이딩 삼각형 클래스 (페이드인/아웃 지원) =====
class MFadingTriangle extends Animatable {
    constructor(p, v1, v2, v3, options = {}) {
        super(p);
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        this.fillColor = options.fillColor || [100, 100, 200];
        this.strokeColor = options.strokeColor || [0, 0, 0];
        this.maxAlpha = options.maxAlpha || 100;
        this.emission = options.emission || false;
        this.emissionColor = options.emissionColor || [255, 150, 150];

        // 페이드아웃 상태
        this.fadingOut = false;
        this.fadeT = 0;
        this.fadeCompleted = false;
    }

    startFadeOut(duration) {
        this.fadingOut = true;
        this.fadeDuration = duration;
        this.fadeT = 0;
        this.fadeCompleted = false;
    }

    display(duration) {
        if (!this.visible) return;

        if (duration === 0) {
            this.t = 1;
            this.completed = true;
            this.started = true;
            this.render(1, 1);
            return;
        }

        if (!this.started) {
            this.started = true;
        }

        // 페이드인
        if (!this.completed && !isPaused) {
            this.t += (this.p.deltaTime / 1000) / duration;
            if (this.t >= 1) {
                this.t = 1;
                this.completed = true;
            }
        }

        // 페이드아웃
        let fadeAlpha = 1;
        if (this.fadingOut && !this.fadeCompleted && !isPaused) {
            this.fadeT += (this.p.deltaTime / 1000) / this.fadeDuration;
            if (this.fadeT >= 1) {
                this.fadeT = 1;
                this.fadeCompleted = true;
            }
            fadeAlpha = 1 - this.fadeT;
        }

        if (this.fadeCompleted) return; // 완전히 사라짐

        this.render(this.t, fadeAlpha);
    }

    displayStatic() {
        if (!this.visible) return;
        this.t = 1;
        this.completed = true;
        this.started = true;

        let fadeAlpha = this.fadeCompleted ? 0 : (this.fadingOut ? (1 - this.fadeT) : 1);
        if (fadeAlpha > 0) {
            this.render(1, fadeAlpha);
        }
    }

    render(t, fadeAlpha = 1) {
        let alpha = t * this.maxAlpha * fadeAlpha;
        if (alpha <= 0) return;

        this.p.push();
        this.p.fill(...this.fillColor, alpha);

        if (this.emission) {
            this.p.stroke(...this.emissionColor, alpha);
            this.p.strokeWeight(2);
        } else {
            this.p.stroke(...this.strokeColor, alpha);
            this.p.strokeWeight(1.5);
        }

        this.p.triangle(
            tx(this.v1), ty(this.v1),
            tx(this.v2), ty(this.v2),
            tx(this.v3), ty(this.v3)
        );
        this.p.pop();
    }

    reset() {
        super.reset();
        this.fadingOut = false;
        this.fadeT = 0;
        this.fadeCompleted = false;
    }
}

// ===== 각도 점 클래스 =====
class MAngleDot extends Animatable {
    constructor(p, v1, vertex, v2, options = {}) {
        super(p);
        this.v1 = v1;
        this.vertex = vertex;
        this.v2 = v2;
        this.distance = options.distance || 0.4;
        this.size = options.size || 4;
        this.color = options.color || [0, 0, 0];
    }

    render(t) {
        let alpha = t * 255;

        let dir1 = p5.Vector.sub(this.v1, this.vertex).normalize().mult(0.5);
        let dir2 = p5.Vector.sub(this.v2, this.vertex).normalize().mult(0.5);
        let avgDir = p5.Vector.add(dir1, dir2).normalize().mult(this.distance);
        let dotPos = p5.Vector.add(this.vertex, avgDir);

        this.p.push();
        this.p.fill(...this.color, alpha);
        this.p.noStroke();
        this.p.circle(tx(dotPos), ty(dotPos), this.size);
        this.p.pop();
    }
}

// ===== 이동 + 페이딩 삼각형 클래스 (등적변환용) =====
class MMovingFadingTriangle extends Animatable {
    constructor(p, v1, v2, vFrom, vTo, options = {}) {
        super(p);
        this.v1 = v1;
        this.v2 = v2;
        this.vFrom = vFrom;
        this.vTo = vTo;
        this.fillColor = options.fillColor || [100, 100, 200];
        this.strokeColor = options.strokeColor || [100, 100, 200];
        this.maxAlpha = options.maxAlpha || 80;

        // 이동 상태
        this.moving = false;
        this.moveT = 0;
        this.moveCompleted = false;
        this.moveDuration = 1.0;

        // 페이드아웃 상태
        this.fadingOut = false;
        this.fadeT = 0;
        this.fadeCompleted = false;
        this.fadeDuration = 0.3;
    }

    startMove(duration) {
        this.moving = true;
        this.moveDuration = duration;
        this.moveT = 0;
        this.moveCompleted = false;
    }

    startFadeOut(duration) {
        this.fadingOut = true;
        this.fadeDuration = duration;
        this.fadeT = 0;
        this.fadeCompleted = false;
    }

    display(duration) {
        if (!this.visible) return;

        if (duration === 0) {
            this.t = 1;
            this.completed = true;
            this.started = true;
            this.render(1, 1, 1);
            return;
        }

        if (!this.started) {
            this.started = true;
        }

        // 페이드인
        if (!this.completed && !isPaused) {
            this.t += (this.p.deltaTime / 1000) / duration;
            if (this.t >= 1) {
                this.t = 1;
                this.completed = true;
            }
        }

        // 이동
        let moveProgress = 0;
        if (this.moving && !this.moveCompleted && !isPaused) {
            this.moveT += (this.p.deltaTime / 1000) / this.moveDuration;
            if (this.moveT >= 1) {
                this.moveT = 1;
                this.moveCompleted = true;
            }
        }
        moveProgress = this.moveT;

        // 페이드아웃
        let fadeAlpha = 1;
        if (this.fadingOut && !this.fadeCompleted && !isPaused) {
            this.fadeT += (this.p.deltaTime / 1000) / this.fadeDuration;
            if (this.fadeT >= 1) {
                this.fadeT = 1;
                this.fadeCompleted = true;
            }
            fadeAlpha = 1 - this.fadeT;
        }

        if (this.fadeCompleted) return;

        this.render(this.t, moveProgress, fadeAlpha);
    }

    displayStatic() {
        if (!this.visible) return;
        this.t = 1;
        this.completed = true;
        this.started = true;

        let fadeAlpha = this.fadeCompleted ? 0 : (this.fadingOut ? (1 - this.fadeT) : 1);
        let moveProgress = this.moveCompleted ? 1 : this.moveT;

        if (fadeAlpha > 0) {
            this.render(1, moveProgress, fadeAlpha);
        }
    }

    render(t, moveProgress = 0, fadeAlpha = 1) {
        let alpha = t * this.maxAlpha * fadeAlpha;
        if (alpha <= 0) return;

        let vMoving = p5.Vector.lerp(this.vFrom, this.vTo, moveProgress);

        this.p.push();
        this.p.fill(...this.fillColor, alpha);
        this.p.stroke(...this.strokeColor, alpha + 50);
        this.p.strokeWeight(1.5);

        this.p.triangle(
            tx(this.v1), ty(this.v1),
            tx(this.v2), ty(this.v2),
            tx(vMoving), ty(vMoving)
        );
        this.p.pop();
    }

    reset() {
        super.reset();
        this.moving = false;
        this.moveT = 0;
        this.moveCompleted = false;
        this.fadingOut = false;
        this.fadeT = 0;
        this.fadeCompleted = false;
    }
}
