const fs = require('fs');
const path = require('path');

// 분석 대상: euclide-geometry/problems 하위의 모든 sketch.js
const PROBLEMS_DIR = path.resolve(__dirname, '../../euclide-geometry/problems');

const RULES = [
    {
        id: 'use-xanimator',
        name: 'XAnimator 사용 여부',
        check: (content) => content.includes('new XAnimator(p)') && content.includes('animator.updateAndDraw()')
    },
    {
        id: 'no-direct-p5-draw',
        name: '직접 그리기 함수 미사용 (효율성)',
        check: (content) => {
            const drawMatch = content.match(/p\.draw\s*=\s*function\s*\(\)\s*{([\s\S]*?)};/);
            if (!drawMatch) return true;
            const body = drawMatch[1];
            // animator 이외의 p5 그리기 함수가 포함되어 있는지 확인
            return !body.match(/p\.(line|ellipse|rect|circle|text|beginShape|endShape)\(/);
        }
    },
    {
        id: 'register-context',
        name: 'sketchContext 등록 여부',
        check: (content) => content.includes('sketchContext.register')
    }
];

function analyze() {
    console.log(`🔍 [분석 시작] 대상 디렉토리: ${PROBLEMS_DIR}\n`);

    if (!fs.existsSync(PROBLEMS_DIR)) {
        console.error('❌ 에러: 문제를 찾을 수 없습니다.');
        return;
    }

    const problems = fs.readdirSync(PROBLEMS_DIR).filter(f => !f.startsWith('.'));
    let summary = { total: 0, issues: 0 };

    problems.forEach(id => {
        const sketchPath = path.join(PROBLEMS_DIR, id, 'sketch.js');
        if (fs.existsSync(sketchPath)) {
            summary.total++;
            const content = fs.readFileSync(sketchPath, 'utf8');
            const failedRules = RULES.filter(rule => !rule.check(content));

            if (failedRules.length > 0) {
                summary.issues++;
                console.log(`[Problem ${id}]`);
                failedRules.forEach(r => console.log(`  - ⚠️  ${r.name} 위반`));
            }
        }
    });

    console.log(`\n📊 [분석 완료]`);
    console.log(`- 전체 sketch.js 개수: ${summary.total}`);
    console.log(`- 비효율/미준수 파일: ${summary.issues}`);
}

analyze();
