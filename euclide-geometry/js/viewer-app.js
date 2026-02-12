/**
 * viewer-app.js
 * Euclide Geometry Viewer Application Entry Point
 */

import { DataLoader } from './data-loader.js';
import { UIController } from './ui-controller.js';
import { LIB_BASE } from './env.js';

const [
    { sketchContext },
    { CONFIG, THEMES, DEFAULT_THEME, setBaseUrl, useProductionUrl, useLocalUrl },
    { applyTheme }
] = await Promise.all([
    import(LIB_BASE + 'sketch-context.js'),
    import(LIB_BASE + 'config.js'),
    import(LIB_BASE + 'draw-utils.js')
]);

class EuclideApp {
    constructor() {
        this.dataLoader = new DataLoader();
        this.ui = new UIController({
            onPhaseChange: (phase) => this.setPhase(phase),
            onModeChange: (mode) => this.setMode(mode),
            onCanvasReveal: () => this.onCanvasReveal(),
            onCanvasHide: () => this.onCanvasHide(),
            onPlayPause: () => this.togglePlayPause(),
        });

        this.isPlaying = true;

        this.config = null;
        this.problemId = null;
        this.isContestMode = false;
        this.scriptLoaded = false;
        this.isBookmarked = false;
        this.activeSolution = 1;
    }

    async init() {
        // Auth Check
        if (typeof window.initAuth === 'function') {
            window.initAuth(async (session) => {
                this.ui.updateAuthUI(!!session);
                if (session) {
                    await this.loadBookmarkStatus();
                } else {
                    this.hideBookmarkButton();
                }
            });
        }

        // URL 파라미터 파싱
        const urlParams = new URLSearchParams(window.location.search);
        this.problemId = (urlParams.get('problem') || '001').padStart(3, '0');

        await this.loadProblem(this.problemId);

        // 이전/다음 문제 탐색용 목록
        fetch(CONFIG.API.getUrl(CONFIG.API.ENDPOINTS.INDEX))
            .then(r => r.json())
            .then(data => { this.problemIds = data.problems.map(p => p.id); })
            .catch(() => { this.problemIds = []; });
    }

    navigate(delta) {
        if (!this.problemIds?.length) return;
        const next = this.problemIds.indexOf(this.problemId) + delta;
        if (next >= 0 && next < this.problemIds.length) {
            window.location.href = `viewer.html?problem=${this.problemIds[next]}`;
        }
    }

    async loadProblem(id) {
        try {
            // 이전 상태 초기화
            sketchContext.reset();
            this.scriptLoaded = false;
            this.activeSolution = 1;

            this.config = await this.dataLoader.loadConfig(id);
            this.isContestMode = this.config.contest === true;

            // 다른 풀이가 있으면 UI 표시 + 프리로드
            if (this.config.solutions && this.config.solutions.length > 1) {
                this.showSolutionSelector(this.config.solutions);
                this.dataLoader.preloadAllScripts(id, this.config.solutions);
                this.dataLoader.preloadAllSolutionHtml(id, this.config.solutions);
            } else {
                this.hideSolutionSelector();
            }

            // 활성 풀이의 solutionPhases 적용
            this.applyActiveSolution();

            // HTML 렌더링
            const problemHtml = await this.dataLoader.loadProblemHtml(id);
            this.ui.renderProblemContent(problemHtml, this.config.level, this.isContestMode);

            // Contest 모드: 스크립트 로드 지연 (버튼 클릭 시 로드)
            if (!this.isContestMode) {
                const solNum = this.config.solutions ? this.activeSolution : null;
                await this.dataLoader.loadScript(id, solNum);
                await this.waitForP5();
            }

        } catch (error) {
            console.error('Failed to load problem:', error);
            this.ui.renderError(id, error.message);
        }
    }

    waitForP5() {
        return new Promise((resolve, reject) => {
            const TIMEOUT_MS = 5000;

            const timeout = setTimeout(() => {
                reject(new Error('p5 초기화 타임아웃'));
            }, TIMEOUT_MS);

            sketchContext.onReady(() => {
                clearTimeout(timeout);
                this.setupP5();
                resolve();
            });
        });
    }

    setupP5() {
        // 저장된 테마 복원
        const savedTheme = sessionStorage.getItem('euclide-theme');
        if (savedTheme && THEMES[savedTheme]) {
            applyTheme(sketchContext.p5Instance, savedTheme);
            const sel = document.getElementById('theme-select');
            if (sel) sel.value = savedTheme;
        }

        // UI 렌더링
        this.ui.renderControls(this.config);

        // 페이즈 전환 시 스크롤 콜백
        sketchContext.animator.onPhaseChange = (phaseNum) => {
            if (sketchContext.currentMode === 'solution') {
                this.ui.scrollToPhase(phaseNum);

                // 마지막 phase 도달 시 문제 조회 기록 저장
                const solutionPhaseCount = this.config.solutionPhases?.length || 0;
                if (phaseNum === solutionPhaseCount) {
                    this.saveProblemView();
                }
            }
        };

        // 캔버스 표시 및 애니메이션 시작
        const canvasWrapper = document.getElementById('canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.style.opacity = '1';
            canvasWrapper.style.visibility = 'visible';
        }
        this.setMode('problem');
    }

    // --- Control Logics ---

    setMode(mode) {
        const animator = sketchContext.animator;
        const phaseMap = sketchContext.phaseMap;
        if (!animator || !phaseMap) return false;

        const targetPhaseMap = mode === 'problem' ? phaseMap.problem : phaseMap.solution;
        if (!targetPhaseMap || Object.keys(targetPhaseMap).length === 0) {
            return false;
        }

        sketchContext.currentMode = mode;
        this.ui.setActiveModeButton(mode);

        // Phase 버튼 업데이트
        const count = Object.keys(targetPhaseMap).length;
        this.ui.renderPhaseButtons(count);
        this.ui.setActivePhaseButton('all');

        // 텍스트 패널 업데이트
        this.updateTextPanel(mode, 'all');

        // 애니메이션 초기화
        animator.reset();

        const currentPhases = this._getSortedPhases(targetPhaseMap);

        if (mode === 'problem') {
            animator.playSequence(currentPhases);
        } else {
            // Solution 모드: Problem 완료 상태 + Solution 재생
            const problemPhases = this._getSortedPhases(phaseMap.problem);
            problemPhases.forEach(p => animator.applyPhaseObjects(p));
            animator.playSequence(currentPhases);
        }

        return true;
    }

    setPhase(phase) {
        const animator = sketchContext.animator;
        const phaseMap = sketchContext.phaseMap;
        const currentMode = sketchContext.currentMode;
        if (!animator || !phaseMap) return;

        const targetPhaseMap = currentMode === 'problem' ? phaseMap.problem : phaseMap.solution;
        const currentPhases = this._getSortedPhases(targetPhaseMap);
        const problemPhases = this._getSortedPhases(phaseMap.problem);

        this.updateTextPanel(currentMode, phase);
        this.ui.setActivePhaseButton(phase);

        if (phase === 'all') {
            animator.reset();
            if (currentMode === 'solution') {
                problemPhases.forEach(p => animator.applyPhaseObjects(p));
            }
            animator.playSequence(currentPhases);
        } else {
            // 특정 Phase 부터 재생
            const index = phase - 1;
            const allPhases = currentMode === 'solution'
                ? [...problemPhases, ...currentPhases]
                : currentPhases;

            const startIndex = currentMode === 'solution'
                ? problemPhases.length + index
                : index;

            animator.playFrom(allPhases, startIndex);
        }
    }

    togglePause() {
        const animator = sketchContext.animator;
        if (animator) {
            animator.isPaused = !animator.isPaused;
            return animator.isPaused;
        }
        return false;
    }

    togglePlayPause() {
        const p = sketchContext.p5Instance;
        const animator = sketchContext.animator;
        if (!p) return;

        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            if (animator) {
                animator.lastFrameTime = performance.now();  // 시간 리셋
                animator.isPaused = false;
            }
            p.loop();
        } else {
            if (animator) animator.isPaused = true;
            p.noLoop();
        }
        this.ui.setPlayPauseState(this.isPlaying);
    }

    resetAnimation() {
        const animator = sketchContext.animator;
        const phaseMap = sketchContext.phaseMap;
        const currentMode = sketchContext.currentMode;
        if (!animator || !phaseMap) return;

        const targetPhaseMap = currentMode === 'problem' ? phaseMap.problem : phaseMap.solution;
        if (!targetPhaseMap) return;

        const problemPhases = this._getSortedPhases(phaseMap.problem);
        const currentPhases = this._getSortedPhases(targetPhaseMap);

        // solution 모드: problem + solution 전체
        // problem 모드: problem 전체
        const allPhases = currentMode === 'solution'
            ? [...problemPhases, ...currentPhases]
            : currentPhases;

        animator.reset();
        animator.playSequence(allPhases);
    }

    async updateTextPanel(mode, phase) {
        if (mode === 'problem') {
            this.ui.toggleSolutionPanel(false);
        } else {
            // Solution 텍스트 로드 (Lazy Loading)
            const solNum = this.config.solutions ? this.activeSolution : null;
            const html = await this.dataLoader.loadSolutionHtml(this.problemId, solNum);
            if (html) {
                this.ui.renderSolutionContent(html);
                this.ui.toggleSolutionPanel(true);
                const targetPhase = (phase === 'all' || !phase) ? 1 : phase;
                this.ui.scrollToPhase(targetPhase);
            }
        }
    }

    // --- Solution 전환 ---

    applyActiveSolution() {
        if (!this.config.solutions) return;
        const sol = this.config.solutions.find(s => s.id === this.activeSolution);
        if (sol) {
            this.config.solutionPhases = sol.solutionPhases;
        }
    }

    showSolutionSelector(solutions) {
        const select = document.getElementById('solution-select');
        if (!select) return;
        select.innerHTML = solutions.map(s =>
            `<option value="${s.id}"${s.id === this.activeSolution ? ' selected' : ''}>풀이 ${s.id}: ${s.title}</option>`
        ).join('');
        select.style.display = '';
    }

    hideSolutionSelector() {
        const select = document.getElementById('solution-select');
        if (select) select.style.display = 'none';
    }

    async switchSolution(solNum) {
        if (solNum === this.activeSolution) return;
        this.activeSolution = solNum;

        // 1. 기존 p5 인스턴스 제거
        const oldP5 = sketchContext.p5Instance;
        if (oldP5) oldP5.remove();

        // 2. controls 제거 (p5.remove()가 canvas를 제거하지만 안전을 위해)
        const controls = document.getElementById('controls-container');
        if (controls) controls.remove();

        // 3. sketchContext 리셋
        sketchContext.reset();

        // 4. 활성 풀이의 solutionPhases 적용
        this.applyActiveSolution();

        // 5. 새 sketch 로드 및 실행
        await this.dataLoader.loadScript(this.problemId, solNum);
        await this.waitForP5();
    }

    // --- Helpers ---

    _getSortedPhases(map) {
        if (!map) return [];
        return Object.keys(map)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => map[key]);
    }

    async onCanvasReveal() {
        if (!this.scriptLoaded) {
            // 최초 펼치기: 스크립트 로드
            await this.dataLoader.loadScript(this.problemId);
            await this.waitForP5();
            this.scriptLoaded = true;
        } else {
            // 재펼치기: 애니메이션 재개
            sketchContext.p5Instance.loop();
        }
    }

    onCanvasHide() {
        // 접기: 애니메이션 멈춤
        if (sketchContext.p5Instance) {
            sketchContext.p5Instance.noLoop();
        }
    }

    async saveProblemView() {
        // 로그인 상태 확인
        if (typeof window.supabaseClient === 'undefined') return;

        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) return;

            const userId = session.user.id;
            const problemId = parseInt(this.problemId);

            await window.supabaseClient.from('problem_views').upsert({
                user_id: userId,
                problem_id: problemId,
                viewed_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,problem_id'
            });

            console.log(`Problem ${problemId} view saved`);
        } catch (error) {
            console.error('Failed to save problem view:', error);
        }
    }

    async loadBookmarkStatus() {
        if (typeof window.supabaseClient === 'undefined') return;

        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) return;

            const { data } = await window.supabaseClient
                .from('problem_bookmarks')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('problem_id', this.problemId)
                .maybeSingle();

            this.isBookmarked = !!data;
            this.updateBookmarkUI();
            this.showBookmarkButton();
        } catch (error) {
            console.error('북마크 상태 조회 실패:', error);
        }
    }

    async toggleBookmark() {
        if (typeof window.supabaseClient === 'undefined') return;

        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                if (typeof window.signInWithGoogle === 'function') {
                    window.signInWithGoogle();
                }
                return;
            }

            if (this.isBookmarked) {
                await window.supabaseClient
                    .from('problem_bookmarks')
                    .delete()
                    .eq('user_id', session.user.id)
                    .eq('problem_id', this.problemId);
                this.isBookmarked = false;
            } else {
                await window.supabaseClient
                    .from('problem_bookmarks')
                    .insert({ user_id: session.user.id, problem_id: this.problemId });
                this.isBookmarked = true;
            }

            this.updateBookmarkUI();
        } catch (error) {
            console.error('북마크 토글 실패:', error);
        }
    }

    updateBookmarkUI() {
        const btn = document.getElementById('bookmark-btn');
        if (!btn) return;

        const iconName = this.isBookmarked ? 'bookmark-check' : 'bookmark';
        btn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        btn.classList.toggle('active', this.isBookmarked);

        if (window.lucide) window.lucide.createIcons();
    }

    showBookmarkButton() {
        const btn = document.getElementById('bookmark-btn');
        if (btn) btn.style.display = '';
    }

    hideBookmarkButton() {
        const btn = document.getElementById('bookmark-btn');
        if (btn) btn.style.display = 'none';
    }
}

// === Application Instance ===
const app = new EuclideApp();

// === 전역 함수 래퍼 ===
window.setPhase = function(phase) {
    app.setPhase(phase);
};

window.togglePause = function() {
    return app.togglePause();
};

window.resetAnimation = function() {
    app.resetAnimation();
};

window.setMode = function(mode) {
    return app.setMode(mode);
};

window.getCurrentMode = function() {
    return sketchContext.currentMode;
};

window.changeTheme = function(themeName) {
    const p = sketchContext.p5Instance;
    if (p && THEMES[themeName]) {
        applyTheme(p, themeName);
        sessionStorage.setItem('euclide-theme', themeName);
        p.redraw();
    }
};

window.rotateCanvas = function() {
    const animator = sketchContext.animator;
    if (animator) {
        animator.rotateBy(1);
    }
};

window.toggleBookmark = function() {
    app.toggleBookmark();
};

window.navigatePrev = function() {
    app.navigate(-1);
};

window.navigateNext = function() {
    app.navigate(1);
};

window.changeSolution = function(solNum) {
    app.switchSolution(parseInt(solNum));
};

// === Auto-start ===
window.EuclideApp = app;

if (typeof window !== 'undefined') {
    if (window.lucide) window.lucide.createIcons();
    app.init();
}

// CONFIG 함수들도 re-export (외부에서 URL 변경 가능)
export { EuclideApp, app, CONFIG, setBaseUrl, useProductionUrl, useLocalUrl };
