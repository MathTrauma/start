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

// 각 레벨별 첫 번째 문제인지 확인
function isFirstProblemOfLevel(problem, problems) {
    const sameLevel = problems.filter(p => p.level === problem.level);
    sameLevel.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return sameLevel.length > 0 && sameLevel[0].id === problem.id;
}

// 문제 접근 가능 여부 확인
function canAccessProblem(problem) {
    if (isPaidUser) return true;
    return isFirstProblemOfLevel(problem, allProblems);
}

// 무료 문제 목록
const FREE_PROBLEMS = ['100', '150', '200', '300', '350', '400', '900'];

// 인증 토큰 가져오기
async function getAuthToken() {
    if (typeof supabaseClient === 'undefined') return null;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session?.access_token || null;
    } catch {
        return null;
    }
}

// 인증된 fetch (유료 문제용)
async function authFetch(url, problemId) {
    const isFree = FREE_PROBLEMS.includes(problemId);
    const headers = {};

    if (!isFree) {
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return fetch(url, { headers });
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

// URL에서 상태 읽기
function getStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        page: parseInt(params.get('page')) || 1,
        level: params.get('level') || '',
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
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 컬럼 수 계산 (너비 기준)
    let cols;
    if (width < 640) cols = 1;
    else if (width < 1024) cols = 2;
    else cols = 3;

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

// 환경 감지 및 URL 설정
const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const workerUrl = 'https://euclide-worker.painfultrauma.workers.dev';
const indexJsonUrl = isLocal
    ? `./problems/index.json?_t=${Date.now()}`
    : `${workerUrl}/problems/index.json?_t=${Date.now()}`;
fetch(indexJsonUrl)
    .then(res => res.json())
    .then(data => {
        // level 0은 마지막으로 정렬 (기본정리)
        allProblems = data.problems.sort((a, b) => {
            const levelA = a.level === 0 ? 999 : a.level;
            const levelB = b.level === 0 ? 999 : b.level;
            if (levelA !== levelB) return levelA - levelB;
            return parseInt(a.id) - parseInt(b.id);
        });
        renderCategories(data.categories);
        setupFilters();

        // URL에서 상태 복원
        const state = getStateFromURL();
        const levelFilter = document.getElementById('level-filter');
        const categoryFilter = document.getElementById('category-filter');

        if (state.level) levelFilter.value = state.level;
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

    // 먼저 skeleton 카드 렌더링
    grid.innerHTML = pageProblems.map(problem => {
        const levelLabel = problem.level == 9 ? '영재고' : problem.level == 0 ? '기본정리' : `Level ${problem.level}`;
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
        return `
            <a href="${isLocked ? '#' : problem.url}" class="${cardClasses.join(' ')}" data-problem-id="${problem.id}" ${isLocked ? 'onclick="event.preventDefault(); handleLockedProblemClick();"' : ''}>
                ${lockIcon}
                <div class="problem-description">
                    <span class="problem-tag level">${levelLabel}</span>
                    <span class="problem-text skeleton">로딩 중...</span>
                </div>
            </a>
        `;
    }).join('');

    // 각 카드의 problem.html을 비동기로 로드 (Vercel에서 직접 서빙)
    pageProblems.forEach(problem => {
        const paddedId = problem.id.padStart(3, '0');
        fetch(`./problems/${paddedId}/problem.html`)
            .then(res => res.ok ? res.text() : Promise.reject('Not found'))
            .then(html => {
                const card = grid.querySelector(`[data-problem-id="${problem.id}"]`);
                if (card) {
                    const textEl = card.querySelector('.problem-text');
                    if (textEl) {
                        textEl.classList.remove('skeleton');
                        textEl.innerHTML = html.replace(/\n/g, '').replace(/\r/g, '');
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

    levelFilter.addEventListener('change', () => applyFilters(true));
    categoryFilter.addEventListener('change', () => applyFilters(true));

    // 외부에서 호출할 수 있도록 window에 등록
    window.applyFiltersFromState = applyFilters;
}

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
