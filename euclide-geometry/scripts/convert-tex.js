#!/usr/bin/env node
/**
 * LaTeX to HTML converter using MathJax
 * Converts problem.tex and solution-phase-*.tex files to pre-rendered HTML
 */

const fs = require('fs');
const path = require('path');

// MathJax configuration
require('mathjax').init({
    loader: { load: ['input/tex', 'output/svg'] },
    tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true
    },
    svg: {
        fontCache: 'local'
    }
}).then((MathJax) => {
    main(MathJax);
}).catch((err) => {
    console.error('MathJax initialization failed:', err);
    process.exit(1);
});

async function main(MathJax) {
    const args = process.argv.slice(2);
    const convertAll = args.includes('--all');
    const specificProblem = args.find(arg => /^\d{3}$/.test(arg));

    const problemsDir = path.join(__dirname, '..', 'problems');

    if (!fs.existsSync(problemsDir)) {
        console.error('Problems directory not found:', problemsDir);
        process.exit(1);
    }

    const problemDirs = fs.readdirSync(problemsDir)
        .filter(dir => /^\d{3}$/.test(dir))
        .filter(dir => !specificProblem || dir === specificProblem)
        .sort();

    console.log(`Found ${problemDirs.length} problem(s) to process\n`);

    for (const problemDir of problemDirs) {
        const problemPath = path.join(problemsDir, problemDir);
        await convertProblemDir(MathJax, problemPath, problemDir);
    }

    console.log('\nConversion complete!');
}

async function convertProblemDir(MathJax, dirPath, problemId) {
    console.log(`Processing problem ${problemId}...`);

    // Find all .tex files
    const texFiles = fs.readdirSync(dirPath)
        .filter(file => file.endsWith('.tex'));

    for (const texFile of texFiles) {
        const texPath = path.join(dirPath, texFile);
        const htmlFile = texFile.replace('.tex', '.html');
        const htmlPath = path.join(dirPath, htmlFile);

        try {
            const html = await convertTexToHtml(MathJax, texPath);
            fs.writeFileSync(htmlPath, html, 'utf8');
            console.log(`  ${texFile} -> ${htmlFile}`);
        } catch (err) {
            console.error(`  Error converting ${texFile}:`, err.message);
        }
    }
}

async function convertTexToHtml(MathJax, texPath) {
    const texContent = fs.readFileSync(texPath, 'utf8');

    // Remove comment lines (starting with %)
    const lines = texContent.split('\n')
        .filter(line => !line.trim().startsWith('%'));

    // Join and clean up
    let content = lines.join('\n')
        .replace(/\\\\/g, '')  // Remove LaTeX line breaks
        .trim();

    // Convert LaTeX math to SVG
    const html = await convertMathToSvg(MathJax, content);

    return html;
}

async function convertMathToSvg(MathJax, text) {
    // Split text into segments: math and non-math
    const segments = [];
    let lastIndex = 0;

    // Pattern to match inline math $...$ and display math $$...$$ or \[...\]
    const mathPatterns = [
        { regex: /\$\$([^$]+)\$\$/g, display: true },
        { regex: /\\\[([\s\S]*?)\\\]/g, display: true },
        { regex: /\$([^$]+)\$/g, display: false }
    ];

    // Find all math expressions with their positions
    const mathMatches = [];

    // First, find display math ($$...$$ and \[...\])
    let match;
    const displayRegex = /\$\$([^$]+)\$\$|\\\[([\s\S]*?)\\\]/g;
    while ((match = displayRegex.exec(text)) !== null) {
        mathMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            latex: match[1] || match[2],
            display: true,
            original: match[0]
        });
    }

    // Then find inline math ($...$) but exclude those inside display math
    const inlineRegex = /\$([^$]+)\$/g;
    while ((match = inlineRegex.exec(text)) !== null) {
        const isInsideDisplay = mathMatches.some(m =>
            match.index >= m.start && match.index < m.end
        );
        if (!isInsideDisplay) {
            mathMatches.push({
                start: match.index,
                end: match.index + match[0].length,
                latex: match[1],
                display: false,
                original: match[0]
            });
        }
    }

    // Sort by position
    mathMatches.sort((a, b) => a.start - b.start);

    // Build result by processing segments
    let result = '';
    let currentPos = 0;

    for (const mathMatch of mathMatches) {
        // Add text before this math
        if (mathMatch.start > currentPos) {
            result += escapeHtml(text.slice(currentPos, mathMatch.start));
        }

        // Convert math to SVG
        try {
            const svg = await MathJax.tex2svg(mathMatch.latex, { display: mathMatch.display });
            const svgHtml = MathJax.startup.adaptor.outerHTML(svg);
            result += svgHtml;
        } catch (err) {
            console.error(`  Math conversion error: ${mathMatch.latex}`);
            result += `<span class="math-error">${escapeHtml(mathMatch.original)}</span>`;
        }

        currentPos = mathMatch.end;
    }

    // Add remaining text
    if (currentPos < text.length) {
        result += escapeHtml(text.slice(currentPos));
    }

    // Wrap in paragraph and handle line breaks
    result = result
        .split('\n\n')
        .filter(p => p.trim())
        .map(p => `<p>${p.trim()}</p>`)
        .join('\n');

    return result;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
