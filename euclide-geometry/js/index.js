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
    if (width < 640) return 4;
    if (width < 1024) return 6;
    return 9;
}

window.addEventListener('resize', () => {
    const newItemsPerPage = getItemsPerPage();
    if (newItemsPerPage !== itemsPerPage) {
        itemsPerPage = newItemsPerPage;
        currentPage = 1;
        renderProblemList(filteredProblems);
    }
});

// 문제 목록 로드
const workerUrl = '.';
fetch(`${workerUrl}/problems/index.json?_t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
        allProblems = data.problems;
        renderStats(data.stats);
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

    grid.innerHTML = pageProblems.map(problem => {
        const cleanProblemHtml = (problem.problemHtml || '').replace(/\n/g, '').replace(/\r/g, '');
        return `
            <a href="${problem.url}" class="problem-card">
                <div class="problem-description">
                    <span class="problem-tag level">Level ${problem.level}</span>${cleanProblemHtml}
                </div>
            </a>
        `;
    }).join('');

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
