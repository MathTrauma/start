window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (typeof initAuth === 'function') {
        initAuth((session) => {
            if (session) {
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'flex';
                console.log('사용자:', session.user.email);
            } else {
                loginBtn.style.display = 'flex';
                logoutBtn.style.display = 'none';
            }
        });
    }

    window.navigateToEtcVisual = function() {
        location.href = 'etc-visual/1-reorganize/1-tangram.html';
    };
});
