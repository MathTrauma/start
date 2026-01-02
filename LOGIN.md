작성일: 2026-01-01 프로젝트: Euclide-Geometry (MathTrauma) 

## 1. Google Cloud Console 설정 (OAuth Client) 

**목표:** Google 로그인 권한을 얻고 Client ID/Secret 발급 
* **접속:** [Google Cloud Console](https://console.cloud.google.com/) > Google Auth Platform 

* **메뉴:** [Clients] (구 Credentials) 
* **설정 항목:** 
* **Application type:** Web application 
* **Authorized JavaScript origins:** 
    https://www.mathtrauma.com (로컬 테스트 시 http://localhost:3000 포함) 
    
* **Authorized redirect URIs:** 
Supabase에서 제공하는 Callback URL 입력 (예: https://[PROJECT_ID].supabase.co/auth/v1/callback) 

---

## 2. Supabase 설정 (Backend) 

**목표:** 백엔드 코드 없이 인증 시스템 구축 
* **접속:** [Supabase Dashboard](https://supabase.com/dashboard) 
* **Google Provider 활성화:** 
* 메뉴: Authentication > Providers > Google 
* 입력: Google Cloud에서 받은 Client ID, Client Secret 붙여넣기 

* **URL 설정 (배포용):** 
* 메뉴: Authentication > URL Configuration 
* **Site URL:** https://www.mathtrauma.com 
* **Redirect Allow List:** https://www.mathtrauma.com/** 추가 

---

## 3. 프로젝트 API 키 확인 

**위치:** Supabase > Project Settings > Configuration > API 
* **Project URL:** https://bdunrluoivhgypwangcx.supabase.co (예시) 
* **API Key:** anon public 키 복사 (주의: service_role 키 사용 금지) 

---

## 4. 클라이언트 코드 (index.html) 
**설명:** CDN 방식을 사용하여 별도 설치 없이 브라우저에서 바로 실행

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>MathTrauma Login</title>
    <script src="[https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2)"></script>
</head>
<body>
    <button id="login-btn">Google 로그인</button>

    <script>
        // 1. Supabase 초기화
        const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
        const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
        const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // 2. 로그인 함수
        async function signInWithGoogle() {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // 로그인 후 돌아올 실제 도메인 주소
                    redirectTo: '[https://www.mathtrauma.com](https://www.mathtrauma.com)'
                },
            });
            if (error) console.error('Error:', error.message);
        }

        document.getElementById('login-btn').addEventListener('click', signInWithGoogle);
    </script>
</body>
</html>
```