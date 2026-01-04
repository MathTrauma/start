# AGENTS.md - Development Guidelines for Euclide Geometry Project

This file contains guidelines for agentic coding agents working on this Euclidean Geometry animation project.

## Project Overview

This is an educational web application for visualizing geometry problems with step-by-step animations. The project consists of:
- **Main Application** (`euclide-geometry/`): Frontend geometry viewer with p5.js animations
- **Cloudflare Worker** (`euclide-worker/`): Backend API serving content from R2 storage
- **Root Services** (`/`): Express.js app with Google OAuth authentication

## Build & Development Commands

### Main Application (euclide-geometry/)
```bash
# Convert LaTeX to HTML (MathJax SVG rendering)
npm run convert
npm run convert:all

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
# Start Express server with OAuth
npm start
```

### Cloudflare Worker
```bash
# Deploy worker
cd euclide-worker && npx wrangler deploy
```

## Testing

**No formal testing framework is currently configured.** Testing is done through:
- Manual testing via local HTTP server (`npx http-server -p 8080`)
- Validation scripts (`./scripts/validate-metadata.sh`)
- Manual verification of deployed content

## Code Style Guidelines

### JavaScript Conventions

#### p5.js Sketch Structure
- **Instance mode required**: All sketches must use `const sketch = (p) => { ... }`
- **Global p5 reference**: Store `p5Instance = p` for utility functions
- **Canvas setup**: `p.createCanvas(800, 600)` with `canvas.parent('canvas-wrapper')`
- **Coordinate system**: Use mathematical coordinates with origin at center

#### File Organization
```
problems/XXX/
├── problem.tex          # LaTeX problem description
├── problem.html         # MathJax SVG rendered HTML
├── config.json          # Problem metadata and phases
├── sketch.js            # p5.js animation code
└── animation.md         # Animation design document
```

#### Naming Conventions
- **Problem IDs**: 3-digit padded numbers (001, 002, etc.)
- **Functions**: CamelCase with descriptive names (`m_drawPoint`, `m_triangle`)
- **Constants**: UPPER_SNAKE_CASE (`COLORS`, `PHASES`)
- **Variables**: camelCase for local variables, UPPER_SNAKE_CASE for globals
- **Files**: kebab-case for resources, camelCase for code

#### Import Patterns
```javascript
// p5.js instance mode
const sketch = (p) => {
    // Geometry utilities (always available)
    // projectPointToLine, intersectLines, getIncenter, etc.
    
    // Animation utilities
    // m_drawPoint, m_drawLine, m_drawCircle, etc.
    
    // Use p5.Vector for all geometric calculations
};
```

### Code Structure

#### Phase-Based Animation
```javascript
let prob = {};  // Problem phases
let sol = {};   // Solution phases

// Phase structure in config.json
{
    "phases": {
        "prob-1": "문제 설명",
        "prob-2": "보조선 그리기",
        "sol-1": "풀이 1단계",
        "sol-2": "풀이 2단계"
    }
}
```

#### Drawing Functions
- Use utility functions from `lib/draw-utils.js`
- Prefix drawing functions with `m_` (e.g., `m_drawPoint`, `m_drawLine`)
- Consistent color scheme using `COLORS` constant

#### Error Handling
- No formal error handling required
- Use console.log for debugging
- Validate problem structure with `./scripts/validate-metadata.sh`

## LaTeX & MathJax Guidelines

### LaTeX Format
```latex
% level 2
% #태그1 #태그2

문제 내용...
```

### HTML Conversion
- **Critical**: Convert LaTeX to MathJax SVG before deployment
- Use `jax="SVG"` format for client-side rendering
- All formulas become `<mjx-container class="MathJax" jax="SVG">` elements
- Run `npm run convert` for single problem or `npm run convert:all` for all

## Development Workflow

### 7-Step Problem Creation Process
1. **User writes** `problem.tex` with LaTeX
2. **AI generates** `animation.md` draft  
3. **User completes** animation phases
4. **AI creates** `sketch.js` animation
5. **Convert** LaTeX → HTML using MathJax
6. **Sync metadata** to index.json
7. **Deploy to R2** using custom scripts

### Key Libraries
- `lib/geometry.js`: Geometric calculations (projectPointToLine, intersectLines, etc.)
- `lib/animation.js`: Animation utilities and phase management
- `lib/draw-utils.js`: Drawing functions (m_drawPoint, m_drawLine, etc.)
- `lib/ui-controls.v1.0.0.js`: UI controls for animation playback

## Deployment Architecture

```
GitHub → GitHub Pages (static site)
       → Cloudflare R2 (content storage)  
       → Cloudflare Workers (API endpoint)
```

### R2 Storage Structure
- `/problems/XXX/`: Individual problem folders
- `/lib/`: Shared libraries and styles
- `/index.json`: Problem metadata index

## Important Notes

### Korean Documentation
- Extensive use of Korean comments and documentation
- Workflow documents are in Korean (`.claude/WORKFLOW.md`)
- Maintain Korean comments in existing code

### Version Control
- All library files include version numbers (e.g., `v1.0.0`)
- Use semantic versioning for library updates
- Problem IDs are immutable once assigned

### Performance Considerations  
- MathJax SVG pre-rendering for faster load times
- Cloudflare R2 for global content distribution
- p5.js instance mode to avoid global conflicts

### Security
- Google OAuth for authentication (Express.js backend)
- No sensitive data in frontend code
- Cloudflare Workers for serverless API

## Common Issues & Solutions

### LaTeX Conversion Issues
- Ensure MathJax is loaded before conversion
- Check for malformed LaTeX syntax
- Verify SVG output in `problem.html`

### Animation Problems
- Check phase names match between `config.json` and `sketch.js`
- Verify p5.Vector usage in instance mode
- Ensure canvas parent element exists

### Deployment Issues
- Validate metadata before deployment
- Check R2 bucket permissions
- Verify Cloudflare Worker configuration