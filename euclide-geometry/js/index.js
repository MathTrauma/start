// Lucide 초기화
lucide.createIcons();

// 인증 초기화
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

initAuth((session) => {
    if (session) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
    }
});

let allProblems = [];
let filteredProblems = [];
let currentPage = 1;
let itemsPerPage = 9;

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
const workerUrl = isLocal ? '.' : 'https://euclide-worker.painfultrauma.workers.dev';
fetch(`${workerUrl}/problems/index.json?_t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
        allProblems = data.problems;
        renderCategories(data.categories);
        renderProblemList(allProblems);
        setupFilters();
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
        const levelLabel = problem.level == 9 ? '영재고' : `Level ${problem.level}`;
        return `
            <a href="${problem.url}" class="problem-card" data-problem-id="${problem.id}">
                <div class="problem-description">
                    <span class="problem-tag level">${levelLabel}</span>
                    <span class="problem-text skeleton">로딩 중...</span>
                </div>
            </a>
        `;
    }).join('');

    // 각 카드의 problem.html을 비동기로 로드
    pageProblems.forEach(problem => {
        const paddedId = problem.id.padStart(3, '0');
        fetch(`${workerUrl}/problems/${paddedId}/problem.html`)
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
                        textEl.textContent = problem.title || '문제 로드 실패';
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

function goToPage(page) {
    const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProblemList(filteredProblems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupFilters() {
    const levelFilter = document.getElementById('level-filter');
    const categoryFilter = document.getElementById('category-filter');

    function applyFilters() {
        const level = levelFilter.value;
        const category = categoryFilter.value;

        let filtered = allProblems;

        if (level) {
            filtered = filtered.filter(p => p.level == level);
        }

        if (category) {
            filtered = filtered.filter(p => p.categories && p.categories.includes(category));
        }

        currentPage = 1;
        renderProblemList(filtered);
    }

    levelFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
}

// 페이지네이션 이벤트 리스너 초기화
setupPaginationListeners();
