// Supabase 설정 (config.js에서 import - 브라우저 환경에서는 전역으로 설정)
// config.js는 ES 모듈이 아닌 스크립트로 먼저 로드되어야 함
// 또는 직접 정의 (호환성 유지)
const SUPABASE_URL = window.SUPABASE_URL || 'https://bdunrluoivhgypwangcx.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdW5ybHVvaXZoZ3lwd2FuZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjc1NTksImV4cCI6MjA4Mjg0MzU1OX0.JBkLVuR8RyOmwMl6_-KPIgsYBy1_qoG90v5j_vt0mSQ';

// 클라이언트 초기화
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

// CAPTCHA 토큰 저장
let captchaToken = null;

function onCaptchaSuccess(token) {
    captchaToken = token;
}

// 세션 초기화 완료 플래그 (race condition 방지)
let sessionInitialized = false;

/**
 * 로그인 상태 변화를 감지하고 UI를 업데이트하는 공통 함수
 * @param {Function} callback 세션 상태에 따라 호출될 콜백 함수
 */
function initAuth(callback) {
    // 초기 세션 확인
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        sessionInitialized = true;
        if (callback) callback(session);
    }).catch(error => {
        console.error('Session check failed:', error);
        sessionInitialized = true;
        if (callback) callback(null);
    });

    // 상태 변경 구독 (초기화 완료 후에만 콜백 호출)
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        // 초기화 완료 후에만 콜백 호출하여 중복 방지
        if (sessionInitialized) {
            if (callback) callback(session);
        }
    });
}

/**
 * 구글 로그인 실행
 */
async function signInWithGoogle() {
    console.log('로그인 시도 중...');
    try {
        // 현재 페이지 URL 저장 (로그인 후 복귀용)
        localStorage.setItem('authRedirect', window.location.href);

        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/auth/callback.html'
            },
        });
        if (error) throw error;
    } catch (err) {
        console.error('로그인 에러:', err.message);
        alert('로그인 중 오류가 발생했습니다.');
    }
}

/**
 * 카카오 로그인 실행
 */
async function signInWithKakao() {
    console.log('카카오 로그인 시도 중...');
    try {
        localStorage.setItem('authRedirect', window.location.href);
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: window.location.origin + '/auth/callback.html'
            },
        });
        if (error) throw error;
    } catch (err) {
        console.error('카카오 로그인 에러:', err.message);
        alert('로그인 중 오류가 발생했습니다.');
    }
}

/**
 * 로그아웃 실행
 */
async function signOut() {
    console.log('로그아웃 시도 중...');
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (err) {
        console.error('로그아웃 에러:', err.message);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

/**
 * 이메일/비밀번호 로그인
 */
async function signInWithEmail(email, password) {
    console.log('이메일 로그인 시도 중...');
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        closeLoginModal();
        return { success: true, data };
    } catch (err) {
        console.error('로그인 에러:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 이메일/비밀번호 회원가입
 */
async function signUpWithEmail(email, password) {
    console.log('회원가입 시도 중...');
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });
        if (error) throw error;
        return { success: true, data, message: '회원가입 완료! 이메일을 확인해주세요.' };
    } catch (err) {
        console.error('회원가입 에러:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Turnstile 스크립트 로드
 */
function loadTurnstileScript() {
    return new Promise((resolve) => {
        if (window.turnstile) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
        script.async = true;
        window.onTurnstileLoad = () => resolve();
        document.head.appendChild(script);
    });
}

/**
 * 로그인 모달 로드
 */
async function loadLoginModal() {
    if (document.getElementById('login-modal')) return;

    try {
        const response = await fetch('/components/login-modal.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        lucide.createIcons();
        //await loadTurnstileScript();
    } catch (err) {
        console.error('모달 로드 실패:', err);
    }
}

/**
 * 로그인 모달 열기
 */
async function openLoginModal() {
    await loadLoginModal();
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Turnstile 위젯 수동 렌더링 (Invisible 모드)
        if (window.turnstile) {
            const container = document.getElementById('captcha-container');
            if (container && !container.hasChildNodes()) {
                turnstile.render(container, {
                    sitekey: '0x4AAAAAACNSRA27Qc3oVZa6',
                    callback: onCaptchaSuccess
                });
            }
        }
    }
}

/**
 * 로그인 모달 닫기
 */
function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * 로그인 폼 제출 처리
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    let email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    // 테스트 계정 자동 변환: mathtrauma -> mathtrauma@mathmore.co
    if (email === 'mathtrauma') {
        email = 'mathtrauma@mathmore.co';
    }

    const result = await signInWithEmail(email, password);
    if (!result.success) {
        errorEl.textContent = result.error;
        errorEl.style.display = 'block';
    }
}

/**
 * 회원가입 폼 제출 처리
 */
async function handleSignupSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    const errorEl = document.getElementById('signup-error');

    if (password !== passwordConfirm) {
        errorEl.textContent = '비밀번호가 일치하지 않습니다.';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
        errorEl.style.display = 'block';
        return;
    }

    const result = await signUpWithEmail(email, password);
    if (result.success) {
        errorEl.style.display = 'none';
        alert(result.message);
        switchToLogin();
    } else {
        errorEl.textContent = result.error;
        errorEl.style.display = 'block';
    }
}

/**
 * 로그인 탭으로 전환
 */
function switchToLogin() {
    document.getElementById('login-form').classList.add('active');
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-signup').classList.remove('active');
}

/**
 * 회원가입 탭으로 전환
 */
function switchToSignup() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('signup-form').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.add('active');
}
