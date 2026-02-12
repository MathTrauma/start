/**
 * data-loader.js
 * 문제 데이터 로딩 및 캐싱을 담당합니다.
 */

import { LIB_BASE } from './env.js';
const { CONFIG } = await import(LIB_BASE + 'config.js');

// 무료 문제 목록
const FREE_PROBLEMS = ['100', '200', '300', '400', '900'];

export class DataLoader {
    constructor() {
        this.cache = new Map();
        this.solutionHtmlCache = new Map();
        this.scriptTextCache = new Map();
    }

    /** * URL 생성 헬퍼 */
    _getUrl(endpoint) {
        return CONFIG.API.getUrl(endpoint);
    }

    /** * 인증 토큰 가져오기 */
    async _getAuthToken() {
        if (typeof window.supabaseClient === 'undefined') return null;
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            return session?.access_token || null;
        } catch {
            return null;
        }
    }

    /** * 인증된 fetch (유료 문제용) */
    async _authFetch(url, problemId) {
        const isFree = FREE_PROBLEMS.includes(problemId);
        const headers = {};

        if (!isFree) {
            const token = await this._getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return fetch(url, { headers });
    }

    async loadConfig(problemId) {
        if (this.cache.has(problemId)) {
            return this.cache.get(problemId);
        }

        try {
            const url = this._getUrl(CONFIG.API.ENDPOINTS.CONFIG(problemId));
            const response = await this._authFetch(url, problemId);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Config load failed: ${response.status}`);
            }

            const config = await response.json();
            this.cache.set(problemId, config);
            return config;
        } catch (error) {
            console.error('DataLoader Error:', error);
            throw error;
        }
    }

    async loadProblemHtml(problemId) {
        try {
            // problem.html은 Vercel에서 직접 서빙 (인증 불필요)
            const url = `./problems/${problemId}/problem.html`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Problem HTML load failed: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('DataLoader Error:', error);
            throw error;
        }
    }

    async loadSolutionHtml(problemId, solNum) {
        const cacheKey = solNum ? `${problemId}-${solNum}` : problemId;
        if (this.solutionHtmlCache.has(cacheKey)) {
            return this.solutionHtmlCache.get(cacheKey);
        }

        try {
            const url = this._getUrl(CONFIG.API.ENDPOINTS.SOLUTION_HTML(problemId, solNum));
            const response = await this._authFetch(url, problemId);
            if (!response.ok) {
                console.warn(`Solution HTML not found for ${problemId} (sol ${solNum})`);
                return null;
            }
            const html = await response.text();
            this.solutionHtmlCache.set(cacheKey, html);
            return html;
        } catch (error) {
            console.error('DataLoader Error:', error);
            return null;
        }
    }

    _getLibBaseUrl() {
        return LIB_BASE.replace(/\/$/, '');
    }

    _transformScript(scriptText) {
        const libBaseUrl = this._getLibBaseUrl();
        scriptText = scriptText.replace(
            /from\s+['"]\.\.\/\.\.\/lib\//g,
            `from '${libBaseUrl}/`
        );
        scriptText = scriptText.replace(
            /from\s+['"]\.\/([^'"]+)['"]/g,
            `from '${libBaseUrl}/$1'`
        );
        return scriptText;
    }

    _executeScript(scriptText) {
        const blob = new Blob([scriptText], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = blobUrl;
            script.onload = () => {
                URL.revokeObjectURL(blobUrl);
                resolve();
            };
            script.onerror = (e) => {
                URL.revokeObjectURL(blobUrl);
                reject(new Error('스크립트 실행 실패'));
            };
            document.body.appendChild(script);
        });
    }

    async loadScript(problemId, solNum) {
        const cacheKey = solNum ? `${problemId}-${solNum}` : problemId;
        let scriptText = this.scriptTextCache.get(cacheKey);

        if (!scriptText) {
            const url = this._getUrl(CONFIG.API.ENDPOINTS.SKETCH(problemId, solNum));
            const response = await this._authFetch(url, problemId);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '스크립트 로드 실패');
            }
            scriptText = await response.text();
            this.scriptTextCache.set(cacheKey, scriptText);
        }

        scriptText = this._transformScript(scriptText);
        return this._executeScript(scriptText);
    }

    async preloadAllScripts(problemId, solutions) {
        const fetches = solutions.map(async (sol) => {
            const cacheKey = `${problemId}-${sol.id}`;
            if (this.scriptTextCache.has(cacheKey)) return;
            const url = this._getUrl(CONFIG.API.ENDPOINTS.SKETCH(problemId, sol.id));
            const response = await this._authFetch(url, problemId);
            if (response.ok) {
                const text = await response.text();
                this.scriptTextCache.set(cacheKey, text);
            }
        });
        await Promise.all(fetches);
    }

    async preloadAllSolutionHtml(problemId, solutions) {
        const fetches = solutions.map(async (sol) => {
            const cacheKey = `${problemId}-${sol.id}`;
            if (this.solutionHtmlCache.has(cacheKey)) return;
            const url = this._getUrl(CONFIG.API.ENDPOINTS.SOLUTION_HTML(problemId, sol.id));
            const response = await this._authFetch(url, problemId);
            if (response.ok) {
                const html = await response.text();
                this.solutionHtmlCache.set(cacheKey, html);
            }
        });
        await Promise.all(fetches);
    }

    /** * 문제 인덱스 로드 */
    async loadIndex() {
        try {
            const url = this._getUrl(CONFIG.API.ENDPOINTS.INDEX);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Index load failed: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('DataLoader Error:', error);
            throw error;
        }
    }
}
