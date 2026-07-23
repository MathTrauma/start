// bfcache 복원 시 시청 기록 갱신
window.addEventListener('pageshow', (event) => {
    if (event.persisted && currentUserId) {
        loadViewedProblems(currentUserId).then(() => {
            if (filteredProblems.length > 0) renderProblemList(filteredProblems);
        });
    }
});

// Lucide 초기화
lucide.createIcons();

// 유료 사용자 여부
let isPaidUser = false;
let currentUserId = null;
let viewedProblems = new Set();  // 시청 완료 문제
let bookmarkedProblems = new Set();  // 북마크된 문제

// 인증 초기화
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

initAuth(async (session) => {
    if (session) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        currentUserId = session.user.id;
        // 유료 사용자 여부 확인 및 시청 기록, 북마크 조회
        await Promise.all([
            checkPaidStatus(currentUserId),
            loadViewedProblems(currentUserId),
            loadBookmarks(currentUserId)
        ]);
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        currentUserId = null;
        isPaidUser = false;
        viewedProblems.clear();
        bookmarkedProblems.clear();
    }
    // 상태 변경 시 문제 목록 다시 렌더링
    if (filteredProblems.length > 0) {
        renderProblemList(filteredProblems);
    }
});

// 유료 사용자 여부 확인 (JWT 인증 사용)
async function checkPaidStatus(userId) {
    try {
        // admin 역할은 자동 허용
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profile?.role === 'admin') {
            isPaidUser = true;
            return;
        }

        // 세션에서 토큰 가져오기
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            isPaidUser = false;
            return;
        }

        // POST로 변경, Authorization 헤더 추가
        const response = await fetch(
            'https://payment-worker.painfultrauma.workers.dev/check-access',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
            }
        );
        const data = await response.json();
        isPaidUser = data.hasAccess === true;
    } catch (error) {
        console.error('구독 상태 확인 실패:', error);
        isPaidUser = false;
    }
}

// 시청 완료 문제 조회
async function loadViewedProblems(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('problem_views')
            .select('problem_id')
            .eq('user_id', userId);

        if (error) throw error;

        viewedProblems.clear();
        if (data) {
            data.forEach(row => viewedProblems.add(String(row.problem_id).padStart(3, '0')));
        }
    } catch (error) {
        console.error('시청 기록 조회 실패:', error);
        viewedProblems.clear();
    }
}

// === 로컬 개발용 시청 기록 ===
// Supabase 로그인이 어려운 로컬 환경에서 '시청 완료' 체크 표시를 테스트하기 위한 임시 저장소.
// localhost/127.0.0.1 에서만 동작하며, 뷰어(viewer-app.js)가 문제를 열 때 함께 기록한다.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const DEV_VIEWED_KEY = 'euclide-dev-viewed';

function mergeDevViewedProblems() {
    if (!IS_LOCAL) return;
    try {
        const ids = JSON.parse(localStorage.getItem(DEV_VIEWED_KEY) || '[]');
        ids.forEach(id => viewedProblems.add(String(id).padStart(3, '0')));
    } catch { /* 무시 */ }
}

if (IS_LOCAL) {
    // 콘솔에서 직접 조작: devMarkViewed('365', '370') / devClearViewed()
    window.devMarkViewed = (...ids) => {
        const flat = ids.flat().map(String);
        const saved = new Set(JSON.parse(localStorage.getItem(DEV_VIEWED_KEY) || '[]'));
        flat.forEach(id => saved.add(id));
        localStorage.setItem(DEV_VIEWED_KEY, JSON.stringify([...saved]));
        if (filteredProblems.length > 0) renderProblemList(filteredProblems);
        return [...saved];
    };
    window.devClearViewed = () => {
        localStorage.removeItem(DEV_VIEWED_KEY);
        viewedProblems.clear();
        if (filteredProblems.length > 0) renderProblemList(filteredProblems);
    };
}

// 북마크된 문제 조회
async function loadBookmarks(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('problem_bookmarks')
            .select('problem_id')
            .eq('user_id', userId);

        if (error) throw error;

        bookmarkedProblems.clear();
        if (data) {
            data.forEach(row => bookmarkedProblems.add(String(row.problem_id).padStart(3, '0')));
        }
    } catch (error) {
        console.error('북마크 조회 실패:', error);
        bookmarkedProblems.clear();
    }
}

// 문제 접근 가능 여부 확인
// 무료 여부는 index.json 의 free 플래그가 유일한 출처 (Worker 와 동일한 데이터).
function canAccessProblem(problem) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
    if (isPaidUser) return true;
    return problem.free === true;
}


// 프리미엄 모달 로드
let premiumModalLoaded = false;
async function loadPremiumModal() {
    if (premiumModalLoaded) return;
    try {
        const response = await fetch('/components/premium-modal.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        premiumModalLoaded = true;
        lucide.createIcons();
    } catch (error) {
        console.error('프리미엄 모달 로드 실패:', error);
    }
}

window.openPremiumModal = async function() {
    await loadPremiumModal();
    const modal = document.getElementById('premium-modal');
    if (modal) modal.classList.add('active');
};

window.closePremiumModal = function() {
    const modal = document.getElementById('premium-modal');
    if (modal) modal.classList.remove('active');
};

// 잠금 문제 클릭 시 처리
window.handleLockedProblemClick = function() {
    if (!currentUserId) {
        // 로그인 안 됨 → 로그인 모달
        openLoginModal();
    } else {
        // 로그인 됨 → 프리미엄 안내 모달
        openPremiumModal();
    }
};

let allProblems = [];
let filteredProblems = [];
let currentPage = 1;
let itemsPerPage = 9;

// 레벨 기억/온보딩 설정
const LEVEL_STORAGE_KEY = 'euclide-level';           // 'all' = 모든 레벨
const LEVEL_ONBOARDING_KEY = 'euclide-level-onboarding-done-v2'; // v2: 레벨 체계 개편 안내로 갱신
const DEFAULT_LEVEL = 'contest1-1';

// 저장된 레벨 읽기 (없으면 null)
function getSavedLevel() {
    const saved = localStorage.getItem(LEVEL_STORAGE_KEY);
    if (saved === null) return null;
    return saved === 'all' ? '' : saved;
}

// URL에서 상태 읽기 (level: null이면 URL에 레벨 파라미터 없음)
function getStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        page: parseInt(params.get('page')) || 1,
        level: params.get('level'),
        category: params.get('category') || ''
    };
}

// URL에 상태 저장 (history.replaceState 사용)
function saveStateToURL(page, level, category) {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page);
    if (level) params.set('level', level);
    if (category) params.set('category', category);

    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    history.replaceState({ page, level, category }, '', newURL);
}

function getItemsPerPage() {
    const height = window.innerHeight;

    // 컬럼 수: 실제 렌더된 grid 열 수를 읽음 (CSS auto-fill이 단일 진실 소스)
    let cols = 1;
    const grid = document.getElementById('problem-grid');
    if (grid) {
        const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
        cols = Math.max(1, tracks);
    }

    // 행 수 계산 (높이 기준)
    const navHeight = 60;
    const paginationHeight = 80;
    const cardHeight = 145 + 20; // 카드 높이 + gap
    const availableHeight = height - navHeight - paginationHeight - 40; // 여유 공간
    const rows = Math.max(1, Math.floor(availableHeight / cardHeight));

    return cols * rows;
}

window.addEventListener('resize', () => {
    const newItemsPerPage = getItemsPerPage();
    if (newItemsPerPage !== itemsPerPage) {
        itemsPerPage = newItemsPerPage;
        currentPage = 1;
        renderProblemList(filteredProblems);
    }
});

const indexJsonUrl = `./problems/index.json?_t=${Date.now()}`;
fetch(indexJsonUrl)
    .then(res => res.json())
    .then(data => {
        // 드롭다운 순서와 동일한 정렬. mid2 → Level1~4 → 영재고(9) → 기본정리(0, 마지막)
        const LEVEL_ORDER = { mid2: 10, mid3: 20, 'contest1-1': 30, 'contest1-2': 40, contest2: 50, gifted: 60, 0: 99 };
        allProblems = data.problems.sort((a, b) => {
            const oa = LEVEL_ORDER[a.level] ?? 999;
            const ob = LEVEL_ORDER[b.level] ?? 999;
            if (oa !== ob) return oa - ob;
            return String(a.id).localeCompare(String(b.id));
        });
        renderCategories(data.categories);
        setupFilters();

        // URL에서 상태 복원 (레벨 우선순위: URL > 저장된 레벨 > 기본 Level 2)
        const state = getStateFromURL();
        const levelFilter = document.getElementById('level-filter');
        const categoryFilter = document.getElementById('category-filter');

        if (state.level === null) {
            state.level = getSavedLevel() ?? DEFAULT_LEVEL;
        }

        levelFilter.value = state.level;
        if (state.category) categoryFilter.value = state.category;

        // 필터 적용 (페이지는 아래서 설정)
        let filtered = allProblems;
        if (state.level) filtered = filtered.filter(p => p.level == state.level);
        if (state.category === 'bookmark') {
            filtered = filtered.filter(p => bookmarkedProblems.has(p.id));
        } else if (state.category) {
            filtered = filtered.filter(p => p.categories && p.categories.includes(state.category));
        }

        currentPage = state.page;
        renderProblemList(filtered);

        // 초기 상태를 history에 저장 (뒤로가기 시 복원용)
        history.replaceState({ page: state.page, level: state.level, category: state.category }, '');
    })
    .catch(error => {
        console.error('Failed to load problems:', error);
        document.getElementById('problem-grid').innerHTML = `
            <p style="color: #ccc; text-align: center;">
                문제 목록을 불러올 수 없습니다.
            </p>
        `;
    });

function renderStats(stats) {
    const container = document.getElementById('stats-container');
    container.innerHTML = `
        <h2>통계</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-number">${stats.total}</span>
                <span>전체 문제</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.byLevel['1'] || 0}</span>
                <span>Level 1</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.byLevel['2'] || 0}</span>
                <span>Level 2</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.byLevel['3'] || 0}</span>
                <span>Level 3</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.byLevel['4'] || 0}</span>
                <span>Level 4</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${stats.byLevel['9'] || 0}</span>
                <span>영재고</span>
            </div>
        </div>
    `;
}

function renderCategories(categories) {
    const select = document.getElementById('category-filter');
    // categories는 이제 { "닮음": ["001", "005", "006"], ... } 형태
    Object.keys(categories).forEach(catName => {
        const option = document.createElement('option');
        option.value = catName;
        option.textContent = `${catName} (${categories[catName].length})`;
        select.appendChild(option);
    });

    // 마지막에 '다시보기' 옵션 추가
    const bookmarkOption = document.createElement('option');
    bookmarkOption.value = 'bookmark';
    bookmarkOption.textContent = '⭐ 다시보기';
    select.appendChild(bookmarkOption);
}

function renderProblemList(problems) {
    filteredProblems = problems;
    const grid = document.getElementById('problem-grid');
    const pagination = document.getElementById('pagination');

    if (problems.length === 0) {
        grid.innerHTML = '<p style="color: #ccc; text-align: center;">검색 결과가 없습니다.</p>';
        pagination.innerHTML = '';
        return;
    }

    itemsPerPage = getItemsPerPage();
    const totalPages = Math.ceil(problems.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProblems = problems.slice(startIndex, endIndex);

    mergeDevViewedProblems();  // 로컬 개발용 시청 기록 반영 (배포 환경에서는 no-op)

    // 먼저 skeleton 카드 렌더링
    grid.innerHTML = pageProblems.map(problem => {
        const LEVEL_LABELS = { mid2: '중2', mid3: '중3', 'contest1-1': '경시 1차-1', 'contest1-2': '경시 1차-2', contest2: '경시2차', gifted: '영재고', 0: '기본정리' };
        const levelLabel = LEVEL_LABELS[problem.level] ?? `Level ${problem.level}`;
        const isLocked = !canAccessProblem(problem);
        const isViewed = viewedProblems.has(problem.id);
        const cardClasses = ['problem-card'];
        if (isLocked) cardClasses.push('locked');
        if (isViewed) cardClasses.push('viewed');
        const lockIcon = isLocked ? `
            <div class="lock-overlay">
                <div class="lock-glass">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>
            </div>
        ` : '';
        // 시청 완료 표시 — 우측 상단 원형 체크
        const viewedCheck = isViewed ? `
            <div class="viewed-check" title="시청 완료" aria-label="시청 완료">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m8 12 3 3 5-6"/>
                </svg>
            </div>
        ` : '';
        return `
            <a href="${isLocked ? '#' : problem.url}" class="${cardClasses.join(' ')}" data-problem-id="${problem.id}" ${isLocked ? 'onclick="event.preventDefault(); handleLockedProblemClick();"' : ''}>
                ${lockIcon}
                ${viewedCheck}
                <div class="problem-description">
                    <span class="problem-tag level level-${problem.level}">${levelLabel}</span>
                    <span class="problem-text skeleton">로딩 중...</span>
                </div>
            </a>
        `;
    }).join('');

    // 각 카드의 problem.html을 비동기로 로드
    pageProblems.forEach(problem => {
        // index.json이 폴더별 정확한 경로를 채워줌 (레거시·mid2 모두)
        const problemHtmlUrl = problem.htmlUrl || `./problems/${problem.id.padStart(3, '0')}/problem.html`;
        fetch(problemHtmlUrl, { redirect: 'error' })
            .then(res => res.ok ? res.text() : Promise.reject('Not found'))
            .then(html => {
                const card = grid.querySelector(`[data-problem-id="${problem.id}"]`);
                if (card) {
                    const textEl = card.querySelector('.problem-text');
                    if (textEl) {
                        textEl.classList.remove('skeleton');
                        textEl.innerHTML = html.replace(/\n/g, '').replace(/\r/g, '');
                        if (window.renderMathInElement) {
                            renderMathInElement(textEl, {
                                delimiters: [
                                    { left: '$$', right: '$$', display: true },
                                    { left: '$', right: '$', display: false }
                                ],
                                throwOnError: false
                            });
                        }
                    }
                }
            })
            .catch(() => {
                const card = grid.querySelector(`[data-problem-id="${problem.id}"]`);
                if (card) {
                    const textEl = card.querySelector('.problem-text');
                    if (textEl) {
                        textEl.classList.remove('skeleton');
                        textEl.textContent = problem.title || '유료 회원 전용';
                    }
                }
            });
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = `<button data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

    const range = 1;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
            html += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
            html += `<span class="page-info">…</span>`;
        }
    }

    html += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    pagination.innerHTML = html;
}

function setupPaginationListeners() {
    const pagination = document.getElementById('pagination');
    pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-page]');
        if (btn && !btn.disabled) {
            const page = parseInt(btn.dataset.page, 10);
            goToPage(page);
        }
    });
}

function goToPage(page, saveToHistory = true) {
    const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProblemList(filteredProblems);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (saveToHistory) {
        const levelFilter = document.getElementById('level-filter');
        const categoryFilter = document.getElementById('category-filter');
        saveStateToURL(page, levelFilter?.value || '', categoryFilter?.value || '');
    }
}

function setupFilters() {
    const levelFilter = document.getElementById('level-filter');
    const categoryFilter = document.getElementById('category-filter');

    function applyFilters(saveToHistory = true) {
        const level = levelFilter.value;
        const category = categoryFilter.value;

        let filtered = allProblems;

        if (level) {
            filtered = filtered.filter(p => p.level == level);
        }

        if (category === 'bookmark') {
            // 북마크 필터: 북마크된 문제만 표시
            filtered = filtered.filter(p => bookmarkedProblems.has(p.id));
        } else if (category) {
            filtered = filtered.filter(p => p.categories && p.categories.includes(category));
        }

        currentPage = 1;
        renderProblemList(filtered);

        if (saveToHistory) {
            saveStateToURL(1, level, category);
        }
    }

    levelFilter.addEventListener('change', () => {
        // 선택 레벨 기억 ('' = 모든 레벨은 'all'로 저장)
        localStorage.setItem(LEVEL_STORAGE_KEY, levelFilter.value || 'all');
        applyFilters(true);
    });
    categoryFilter.addEventListener('change', () => applyFilters(true));

    // 외부에서 호출할 수 있도록 window에 등록
    window.applyFiltersFromState = applyFilters;
}

// 최초 진입 시 레벨 안내 코치마크 (레벨 선택창 클릭/변경 또는 X 버튼으로 영구 종료)
function setupLevelOnboarding() {
    if (localStorage.getItem(LEVEL_ONBOARDING_KEY)) return;

    const levelFilter = document.getElementById('level-filter');
    if (!levelFilter) return;

    levelFilter.classList.add('level-pulse');

    const popup = document.createElement('div');
    popup.className = 'level-onboarding';
    popup.innerHTML = `
        <button class="level-onboarding-close" aria-label="안내 닫기">&times;</button>
        <p>
            내신(학교 시험) 대비라면 학년에 맞는 <strong>중2 · 중3</strong> 레벨을 선택해 보세요.
        </p>
    `;
    document.body.appendChild(popup);

    // 팝업을 레벨 선택창 바로 아래에 배치, 화살표가 선택창 중앙을 가리키도록
    function position() {
        const rect = levelFilter.getBoundingClientRect();
        const width = popup.offsetWidth;
        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
        popup.style.top = `${rect.bottom + 14}px`;
        popup.style.left = `${left}px`;
        popup.style.setProperty('--arrow-left', `${rect.left + rect.width / 2 - left}px`);
    }
    position();
    window.addEventListener('resize', position);

    function dismiss() {
        localStorage.setItem(LEVEL_ONBOARDING_KEY, '1');
        levelFilter.classList.remove('level-pulse');
        levelFilter.removeEventListener('pointerdown', dismiss);
        levelFilter.removeEventListener('change', dismiss);
        window.removeEventListener('resize', position);
        popup.remove();
    }

    popup.querySelector('.level-onboarding-close').addEventListener('click', dismiss);
    levelFilter.addEventListener('pointerdown', dismiss);
    levelFilter.addEventListener('change', dismiss);
}

setupLevelOnboarding();

// 페이지네이션 이벤트 리스너 초기화
setupPaginationListeners();

// 브라우저 뒤로가기/앞으로가기 처리
window.addEventListener('popstate', (event) => {
    const state = event.state || getStateFromURL();
    const levelFilter = document.getElementById('level-filter');
    const categoryFilter = document.getElementById('category-filter');

    if (levelFilter) levelFilter.value = state.level || '';
    if (categoryFilter) categoryFilter.value = state.category || '';

    let filtered = allProblems;
    if (state.level) filtered = filtered.filter(p => p.level == state.level);
    if (state.category === 'bookmark') {
        filtered = filtered.filter(p => bookmarkedProblems.has(p.id));
    } else if (state.category) {
        filtered = filtered.filter(p => p.categories && p.categories.includes(state.category));
    }

    currentPage = state.page || 1;
    renderProblemList(filtered);
});
