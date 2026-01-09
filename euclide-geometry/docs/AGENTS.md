# AGENTS.md - Development Guidelines for Euclide Geometry Project

Guidelines for agentic coding agents working on this Euclidean Geometry animation project.

## Project Overview

Educational web application for visualizing geometry problems with step-by-step p5.js animations.
- **Main Application** (`euclide-geometry/`): Frontend geometry viewer with p5.js animations
- **Cloudflare Worker** (`euclide-worker/`): Backend API serving content from R2 storage
- **Root Services** (`/`): app with Supabase authentication

## Build & Development Commands

### Main Application (euclide-geometry/)
```bash
# Convert LaTeX to HTML (MathJax SVG rendering)
npm run convert              # Convert single problem (prompts for ID)
npm run convert:all          # Convert all problems

# Local development server
npx http-server -p 8080

# Validate problem metadata
./scripts/validate-metadata.sh

# Sync metadata to index.json
./scripts/sync-metadata.sh [problem_id|all]

# Deploy to Cloudflare R2
./scripts/deploy-changes.sh [problem_id|all|lib|index]
```

### Root Services
```bash
# Start Express server
npm start
```

### Cloudflare Worker
```bash
cd euclide-worker && npx wrangler deploy
```

## Testing

**No formal testing framework configured.** Manual testing only:
- Local HTTP server: `npx http-server -p 8080`
- Validation scripts: `./scripts/validate-metadata.sh`
- Manual verification of deployed content

## Code Style Guidelines

### JavaScript Conventions

#### General Rules
- **No TypeScript**: Pure JavaScript only
- **Indentation**: 4 spaces (not tabs)
- **Quotes**: Single quotes for strings
- **Comments**: Korean and English mixed; maintain existing language style

#### Naming Conventions
- **Problem IDs**: 3-digit padded numbers (`001`, `002`, etc.)
- **Functions**: 
  - camelCase for regular functions (`projectPointToLine`, `getIncenter`)
- **Constants**: UPPER_SNAKE_CASE (`COLORS`, `PHASES`)
- **Variables**: camelCase for locals, UPPER_SNAKE_CASE for globals
- **Files**: kebab-case (`draw-utils.js`, `problem-template.tex`)

#### p5.js Sketch Structure
**CRITICAL: Always use p5.js instance mode**
```javascript
const sketch = (p) => {
    let p5Instance = p;  // Store for utility functions
    
    p.setup = () => {
        const canvas = p.createCanvas(800, 600);
        canvas.parent('canvas-wrapper');
        // Mathematical coordinates: origin at center
    };
    
    p.draw = () => {
        // Use p5.Vector for all geometric calculations
        // Access geometry utilities: projectPointToLine, intersectLines, etc.
    };
};
new p5(sketch);
```

#### Vector Usage
```javascript
// CORRECT: Use p5.Vector for all points
const A = new p5.Vector(0, 0);
const B = p5.Vector.sub(C, A);

// INCORRECT: Don't use plain objects
const A = { x: 0, y: 0 };  // ❌
```

#### Drawing Functions
```javascript
// Use COLORS constant for consistency
const COLORS = {
    TRIANGLE_BLUE: [100, 150, 255],
    TRIANGLE_RED: [255, 100, 100],
    EMISSION_BLUE: [50, 100, 255],
    ALPHA_LIGHT: 50,
    ALPHA_MEDIUM: 80
};

```

#### Error Handling
- No formal error handling required
- Use `console.log` for debugging
- Validate structure with `./scripts/validate-metadata.sh`

### File Organization
```
problems/XXX/
├── problem.tex          # LaTeX source (first line: % level N)
├── problem.html         # MathJax SVG rendered HTML
├── config.json          # Problem metadata and phases
├── sketch.js            # p5.js animation code
└── animation.md         # Animation design document
```

### Phase-Based Animation Pattern
```javascript
// config.json structure
{
    "id": "001",
    "level": 2,
    "problemPhases": [
        { "id": 1, "startTime": 0, "duration": 2.0, "endTime": 2.0 }
    ],
    "solutionPhases": [
        { "id": 1, "startTime": 0, "duration": 2.0, "endTime": 2.0 }
    ]
}

// sketch.js pattern
const prob = {};  // Problem phase animations
const sol = {};   // Solution phase animations

prob[1] = (p) => {
    // Animation for problem phase 1
};
```

## Key Libraries & Utilities

### Available in All Sketches
- **`lib/geometry.js`**: Geometric calculations
  - `projectPointToLine(P, A, B)` - Project point P onto line AB
  - `intersectLines(A, B, C, D)` - Intersection of lines AB and CD
  - `getIncenter(A, B, C)` - Incenter of triangle ABC
  - `getCircumcenter(A, B, C)` - Circumcenter of triangle ABC
  - `getOrthocenter(A, B, C)` - Orthocenter of triangle ABC
  - `reflectPoint(P, A, B)` - Reflect point P over line AB
  - `circleLineIntersection(center, radius, p1, p2)` - Circle-line intersections

- **`lib/draw-utils.js`**: Drawing utilities
  - `COLORS` constant - Standard color palette
  - `calculateScaleFromPoints(points, w, h, padding)` - Auto-scale canvas

- **`lib/animator.js`**: Animation framework
  - `PolyAnimator` class - Polygon animation with fade-in/out, motion, effects

## Development Workflow

### 7-Step Problem Creation Process
1. User writes `problem.tex` with LaTeX (first line: `% level N`)
2. AI generates `animation.md` draft (see `docs/tex-parser.md`)
3. User completes animation phases in `animation.md`
4. AI creates `sketch.js` animation (see `docs/animator.md`)
5. Convert LaTeX → HTML: `npm run convert`
6. Sync metadata: `./scripts/sync-metadata.sh XXX`
7. Deploy to R2: `./scripts/deploy-changes.sh XXX`

### Critical Deployment Notes
- **Deployment Targets**:
    - **GitHub (Git Push)**: Static site files (`index.html`, `viewer.html`, `styles/*.css`). **NEVER** deploy these to R2.
    - **Cloudflare R2 (deploy-changes.sh)**: Data and logic files (`problems/*`, `lib/*.js`, `index.json`).
- **Always convert LaTeX before deployment**: `npm run convert`
- **Always sync metadata after changes**: `./scripts/sync-metadata.sh`
- **Validate before deployment**: `./scripts/validate-metadata.sh`
- **MathJax SVG format**: All formulas pre-rendered as `<mjx-container jax="SVG">`

## Important Project Rules

### Korean Documentation
- Korean comments are standard in this codebase
- Workflow documents in Korean (`.claude/WORKFLOW.md`)
- **Maintain existing comment language** (don't translate Korean to English)
- Phase descriptions in `config.json` are in Korean

### Version Control
- Library files include version numbers (`ui-controls.v1.0.0.js`)
- Use semantic versioning for library updates
- Problem IDs are immutable once assigned

### Git Workflow
- Standard git workflow (add, commit, push)
- No pre-commit hooks configured
- Commit messages can be in English or Korean

### Performance & Architecture
- MathJax SVG pre-rendering for fast client-side display
- Cloudflare R2 for global CDN distribution
- p5.js instance mode to avoid global namespace pollution
- Supabase for authentication (configured in `js/auth.js`)

## Common Issues

### LaTeX Conversion
- Ensure MathJax is loaded before conversion
- Check for malformed LaTeX syntax in `problem.tex`
- Verify SVG output in `problem.html`

### Animation Issues
- Phase names must match between `config.json` and `sketch.js`
- Always use `p5.Vector` in instance mode (never plain objects)
- Ensure canvas parent element `#canvas-wrapper` exists

### Deployment Issues
- Run `./scripts/validate-metadata.sh` before deploying
- Check Cloudflare R2 bucket permissions if upload fails
- Verify `wrangler.toml` configuration in `euclide-worker/`