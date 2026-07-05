/**
 * Analysis 공통 사이드바
 * 사용법: 각 페이지 <body> 어디에든 <script src="/e-MajorMath/Analysis/_sidebar.js"></script>
 *        현재 페이지의 url.pathname과 일치하는 항목이 자동으로 .current 처리됨.
 *
 * 항목 추가/변경 시 이 파일의 ITEMS 배열만 수정하면 모든 페이지에 반영된다.
 */
(function () {
  const HOME = { href: '/e-MajorMath/', label: '← 전공수학' };
  const ITEMS = [
    { href: '/e-MajorMath/Analysis/0-intro/',           label: '도입' },
    { href: '/e-MajorMath/Analysis/1-completeness/',    label: '완비성 공리' },
  ];

  // ── 스타일 주입 (1회) ──
  if (!document.getElementById('_anal_sidebar_css')) {
    const css = `
      .menu-toggle {
        position: fixed; top: 14px; left: 14px; z-index: 30;
        width: 38px; height: 38px;
        border: 1px solid #ddd; background: #fff; border-radius: 6px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      }
      .menu-toggle:hover { background: #f5f5f8; }
      .menu-toggle span { display: block; width: 18px; height: 2px; background: #555; position: relative; }
      .menu-toggle span::before, .menu-toggle span::after {
        content: ''; position: absolute; left: 0; width: 18px; height: 2px; background: #555;
      }
      .menu-toggle span::before { top: -6px; }
      .menu-toggle span::after  { top:  6px; }

      .sidebar {
        position: fixed; top: 0; left: 0;
        width: 240px; height: 100vh;
        background: #f8f8f9; border-right: 1px solid #e5e5e5;
        padding: 28px 18px; overflow-y: auto;
        transform: translateX(-100%);
        transition: transform 0.22s ease;
        z-index: 40;
        box-shadow: 2px 0 8px rgba(0,0,0,0.04);
        font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
      }
      .sidebar.open { transform: translateX(0); }
      .sidebar-backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.18);
        opacity: 0; pointer-events: none;
        transition: opacity 0.22s ease;
        z-index: 35;
      }
      .sidebar-backdrop.open { opacity: 1; pointer-events: auto; }

      .sidebar-home {
        display: block; padding: 8px 12px; margin-bottom: 18px;
        font-size: 13px; color: #4338ca; text-decoration: none;
        border-radius: 5px;
      }
      .sidebar-home:hover { background: #e8eaff; }

      .sidebar-title {
        font-size: 11px; font-weight: 700; letter-spacing: 1px;
        color: #999; text-transform: uppercase;
        margin: 10px 0 10px 4px;
      }
      .sidebar-list { list-style: none; margin: 0; padding: 0; }
      .sidebar-list li { margin-bottom: 2px; }
      .sidebar-list a {
        display: block; padding: 8px 12px; border-radius: 5px;
        font-size: 13.5px; color: #555; text-decoration: none; line-height: 1.4;
      }
      .sidebar-list a:hover { background: #ececef; color: #222; }
      .sidebar-list a.current { background: #e8eaff; color: #4338ca; font-weight: 600; }
    `;
    const style = document.createElement('style');
    style.id = '_anal_sidebar_css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── HTML 주입 ──
  const here = window.location.pathname.replace(/\/$/, '');
  const norm = p => p.replace(/\/$/, '').replace(/\/index\.html$/, '');
  const isCurrent = href => norm(href) === norm(here);

  const itemsHTML = ITEMS.map(it => {
    const cls = isCurrent(it.href) ? ' class="current"' : '';
    return `<li><a href="${it.href}"${cls}>${it.label}</a></li>`;
  }).join('');

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button class="menu-toggle" id="analMenuToggle" aria-label="메뉴 열기"><span></span></button>
    <div class="sidebar-backdrop" id="analSidebarBackdrop"></div>
    <aside class="sidebar" id="analSidebar">
      <a href="${HOME.href}" class="sidebar-home">${HOME.label}</a>
      <div class="sidebar-title">Analysis</div>
      <ul class="sidebar-list">${itemsHTML}</ul>
    </aside>
  `;
  // body 맨 앞에 삽입
  while (wrap.firstChild) document.body.insertBefore(wrap.firstChild, document.body.firstChild);

  // ── 토글 ──
  const btn = document.getElementById('analMenuToggle');
  const sb  = document.getElementById('analSidebar');
  const bd  = document.getElementById('analSidebarBackdrop');
  const close = () => { sb.classList.remove('open'); bd.classList.remove('open'); };
  btn.addEventListener('click', () => {
    const open = sb.classList.toggle('open');
    bd.classList.toggle('open', open);
  });
  bd.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
