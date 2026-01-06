/**
 * euclide-geometry/lib_gemini/draw-utils.js
 * 
 * Utility functions for geometry, drawing, and theming.
 */

export const THEMES = {
    light: {
        background: '#FFFFFF',
        stroke: '#333333',
        text: '#000000',
        fillBlue: [0, 100, 255, 50],
        fillRed: [255, 50, 50, 50],
        highlight: '#FFD700', // Gold
        auxiliary: '#AAAAAA'  // Dashed lines
    },
    dark: {
        background: '#1E1E2E', // Deep Navy/Grey
        stroke: '#CDD6F4',     // Soft White
        text: '#FFFFFF',
        fillBlue: [137, 180, 250, 80], // Neon Blue
        fillRed: [243, 139, 168, 80],  // Neon Red/Pink
        highlight: '#F9E2AF', // Soft Yellow
        auxiliary: '#6C7086'
    },
    sepia: {
        background: '#F4ECD8', // Warm Beige
        stroke: '#433422',     // Dark Brown
        text: '#5D4037',
        fillBlue: [100, 149, 237, 60], // Cornflower Blue
        fillRed: [205, 92, 92, 60],    // Indian Red
        highlight: '#D4AF37', // Antique Gold
        auxiliary: '#A1887F'
    },
    chalkboard: {
        background: '#2F4F4F', // Dark Slate Gray
        stroke: '#F0F8FF',     // Alice Blue
        text: '#FFFFFF',
        fillBlue: [135, 206, 235, 80], // Sky Blue
        fillRed: [255, 182, 193, 80],  // Light Pink
        highlight: '#FFFACD', // Lemon Chiffon
        auxiliary: '#778899'
    }
};

/**
 * Applies a theme to the p5 instance.
 * @param {Object} p - p5 instance
 * @param {string} themeName - 'light', 'dark', 'sepia', 'chalkboard'
 */
export function applyTheme(p, themeName = 'light') {
    const theme = THEMES[themeName] || THEMES.light;
    p.theme = theme;
    if (p.background) p.background(theme.background);
}

/**
 * Calculates scale based on points to fit in width/height.
 * Attaches tx() and ty() to p5 instance.
 * IMPORTANT: tx/ty return RELATIVE coordinates from the center (0,0).
 * The p5 draw loop MUST use translate(width/2, height/2).
 */
export function calculateScaleFromPoints(p, points, width, height, margin = 60) {
    if (!points || points.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
    });

    const dataW = maxX - minX;
    const dataH = maxY - minY;

    const availableW = width - 2 * margin;
    const availableH = height - 2 * margin;

    // Calculate scale
    let scaleX = dataW > 0 ? availableW / dataW : Infinity;
    let scaleY = dataH > 0 ? availableH / dataH : Infinity;
    
    let scale = Math.min(scaleX, scaleY);
    if (scale === Infinity) scale = 100;

    if (scale > 200) scale = 200;

    p.geometryScale = scale;

    // Data Center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Attach transform functions
    // Returns coordinates relative to the center.
    // Drawing context is expected to be translated to center.
    p.tx = (v) => (v.x - centerX) * scale;
    p.ty = (v) => (v.y - centerY) * scale;
}

/**
 * Returns responsive canvas size (1:1 ratio).
 * @param {number} maxSize - Maximum canvas size (default 800)
 * @param {number} padding - Padding from viewport edges (default 20)
 * @returns {number} - Canvas size (width = height)
 */
export function getCanvasSize(maxSize = 800, padding = 20) {
    return Math.min(maxSize, window.innerWidth - padding);
}