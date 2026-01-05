# Gemini Animator Library Usage Guide

This library provides a declarative way to manage geometric animations, separating logic from rendering.

## 1. Basic Setup

Import `animator.js` in your HTML.

```javascript
let animator;
let A, B, segAB;

function setup() {
    createCanvas(800, 600);
    animator = new Animator(p);

    // 1. Create Geometric Objects
    // Note: Objects are created but not visible until played
    A = new GPoint(p, createVector(-100, 0), "A");
    B = new GPoint(p, createVector(100, 0), "B");
    segAB = new GSegment(p, A.pos, B.pos);

    // 2. Define Animation Sequences
    animator.registerSequence("Phase1", [
        // Step 1: Show Point A (0.5s)
        { target: A, duration: 0.5 },
        
        // Step 2: Show Point B (0.5s)
        { target: B, duration: 0.5 },
        
        // Step 3: Draw Segment AB (1.0s)
        { target: segAB, duration: 1.0 }
    ]);

    // 3. Start Animation
    animator.play("Phase1");
}

function draw() {
    background(255);
    translate(width/2, height/2); // Adjust coordinates as needed
    
    // 4. Update and Draw
    animator.updateAndDraw();
}
```

## 2. Advanced Features

### Parallel Animations (Groups)
Run multiple animations simultaneously using `group`.

```javascript
animator.registerSequence("ParallelExample", [
    { 
        group: [
            { target: objectA, duration: 1.0 },
            { target: objectB, duration: 1.0 }
        ] 
    }
]);
```

### Fade Out
Use `mode: 'fadeOut'` to fade an object out.

```javascript
animator.registerSequence("FadeExample", [
    { target: myPolygon, duration: 1.0 }, // Appear (Fade In/Draw)
    { target: myPolygon, duration: 0.5, mode: 'fadeOut' } // Disappear
]);
```

### Supported Objects
- `GPoint(p, pos, label, options)`
- `GSegment(p, start, end, options)`
- `GPolygon(p, vertices, options)`
- `GCircle(p, center, radius, options)`
- `GRightAngle(p, p1, vertex, p2, size, options)`
- `GAngleMarker(p, p1, vertex, p2, options)`

### Global Transforms
If you use global coordinate transform functions `tx(val)` and `ty(val)`, the library will automatically detect and use them. Otherwise, it uses raw coordinates.
