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

    const video2 = document.getElementById('hero-video-2');
    if (video2) video2.load();

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function typeWriter(element, text, speed) {
        return new Promise(resolve => {
            let i = 0;
            element.textContent = '';
            function type() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else {
                    element.classList.add('done');
                    resolve();
                }
            }
            type();
        });
    }

    const line1 = document.getElementById('hero-line-1');
    const line2 = document.getElementById('hero-line-2');
    const line3 = document.getElementById('hero-line-3');
    const line3b = document.getElementById('hero-line-3b');

    if (line1 && line2 && line3 && line3b) {
        (async () => {
            await typeWriter(line1, line1.dataset.text, 150);
            await delay(400);
            await typeWriter(line2, line2.dataset.text, 80);
            await delay(300);
            await typeWriter(line3, line3.dataset.text, 100);
            await delay(3000);
            await typeWriter(line3b, line3b.dataset.text, 100);
        })();
    }
});
