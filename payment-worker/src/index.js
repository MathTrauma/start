/**
 * 결제 검증 Cloudflare Worker
 *
 * 포트원 V2 결제 검증 및 Supabase 저장
 * JWT 인증 필수
 */

// 허용된 도메인 목록
const ALLOWED_ORIGINS = [
    'https://www.mathtrauma.com',
    'https://mathtrauma.com',
    'http://localhost:8000',
];

// Origin 검증
function isAllowedOrigin(origin) {
    if (!origin) return false;
    return ALLOWED_ORIGINS.includes(origin);
}

// CORS 헤더 생성 (동적)
function getCorsHeaders(origin) {
    const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

// JSON 응답 헬퍼
function jsonResponse(data, status = 200, origin = null) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
        },
    });
}

// 에러 응답 헬퍼
function errorResponse(message, status = 400, origin = null) {
    return jsonResponse({ success: false, error: message }, status, origin);
}

// Supabase JWT 토큰 검증
async function verifySupabaseToken(token, env) {
    try {
        const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': env.SUPABASE_ANON_KEY
            }
        });

        if (!response.ok) return null;
        return response.json();
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Authorization 헤더에서 토큰 추출 및 검증
async function authenticateRequest(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: '인증 토큰이 필요합니다', status: 401 };
    }

    const token = authHeader.slice(7);
    const user = await verifySupabaseToken(token, env);

    if (!user) {
        return { error: '유효하지 않은 토큰입니다', status: 401 };
    }

    return { user };
}

// 포트원 결제 조회 API
async function getPortOnePayment(paymentId, env) {
    const response = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
        {
            headers: {
                'Authorization': `PortOne ${env.PORTONE_API_SECRET}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`포트원 API 오류: ${error}`);
    }

    return response.json();
}

// Supabase에 결제 정보 저장
async function savePaymentToSupabase(paymentData, userId, env) {
    const { id: paymentId, orderName, totalAmount, paidAt, status } = paymentData;

    // payments 테이블에 저장
    const paymentRecord = {
        user_id: userId,
        order_id: paymentId,
        payment_key: paymentId,
        amount: totalAmount,
        status: status === 'PAID' ? 'completed' : status.toLowerCase(),
        paid_at: paidAt,
    };

    const paymentResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/payments`,
        {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(paymentRecord),
        }
    );

    if (!paymentResponse.ok) {
        const error = await paymentResponse.text();
        throw new Error(`Supabase payments 저장 오류: ${error}`);
    }

    // 결제 성공 시 user_purchases 업데이트
    if (status === 'PAID') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3); // 3개월 후

        const purchaseRecord = {
            user_id: userId,
            has_full_access: true,
            expires_at: expiresAt.toISOString(),
            purchased_at: paidAt,
        };

        // upsert (있으면 업데이트, 없으면 생성)
        const purchaseResponse = await fetch(
            `${env.SUPABASE_URL}/rest/v1/user_purchases`,
            {
                method: 'POST',
                headers: {
                    'apikey': env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify(purchaseRecord),
            }
        );

        if (!purchaseResponse.ok) {
            const error = await purchaseResponse.text();
            console.error('user_purchases 저장 오류:', error);
            // 결제는 성공했으므로 에러를 던지지 않음
        }
    }

    return paymentRecord;
}

// 결제 검증 핸들러 (JWT 인증 필수)
async function handleVerifyPayment(request, env, origin) {
    try {
        // 1. JWT 인증 필수
        const auth = await authenticateRequest(request, env);
        if (auth.error) {
            return errorResponse(auth.error, auth.status, origin);
        }
        const user = auth.user;

        const body = await request.json();
        const { paymentId } = body;  // userId는 JWT에서 추출

        if (!paymentId) {
            return errorResponse('paymentId가 필요합니다', 400, origin);
        }

        // 2. 포트원에서 결제 정보 조회
        const paymentData = await getPortOnePayment(paymentId, env);
        console.log('포트원 결제 정보:', JSON.stringify(paymentData));

        // 3. 결제 금액 검증
        const expectedAmount = 9900;
        if (paymentData.amount.total !== expectedAmount) {
            return errorResponse(
                `결제 금액 불일치: 예상 ${expectedAmount}원, 실제 ${paymentData.amount.total}원`,
                400,
                origin
            );
        }

        // 4. 결제 상태 확인
        if (paymentData.status !== 'PAID') {
            return errorResponse(`결제 미완료: ${paymentData.status}`, 400, origin);
        }

        // 5. Supabase에 저장 (JWT에서 추출한 user.id 사용)
        const savedPayment = await savePaymentToSupabase(
            {
                id: paymentData.id,
                orderName: paymentData.orderName,
                totalAmount: paymentData.amount.total,
                paidAt: paymentData.paidAt,
                status: paymentData.status,
            },
            user.id,  // JWT에서 추출한 userId
            env
        );

        return jsonResponse({
            success: true,
            message: '결제가 확인되었습니다',
            payment: savedPayment,
        }, 200, origin);

    } catch (error) {
        console.error('결제 검증 오류:', error);
        return errorResponse(error.message, 500, origin);
    }
}

// 사용자 구매 상태 확인 (JWT 인증 필수, POST로 변경)
async function handleCheckAccess(request, env, origin) {
    try {
        // 1. JWT 인증 필수
        const auth = await authenticateRequest(request, env);
        if (auth.error) {
            return errorResponse(auth.error, auth.status, origin);
        }
        const user = auth.user;

        // 2. JWT에서 추출한 userId로 구매 정보 조회
        const response = await fetch(
            `${env.SUPABASE_URL}/rest/v1/user_purchases?user_id=eq.${user.id}&select=*`,
            {
                headers: {
                    'apikey': env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error('구매 정보 조회 실패');
        }

        const purchases = await response.json();

        if (purchases.length === 0) {
            return jsonResponse({
                hasAccess: false,
                message: '구매 내역이 없습니다',
            }, 200, origin);
        }

        const purchase = purchases[0];
        const now = new Date();
        const expiresAt = new Date(purchase.expires_at);
        const hasAccess = purchase.has_full_access && expiresAt > now;

        return jsonResponse({
            hasAccess,
            expiresAt: purchase.expires_at,
            message: hasAccess ? '이용권이 유효합니다' : '이용권이 만료되었습니다',
        }, 200, origin);

    } catch (error) {
        console.error('접근 권한 확인 오류:', error);
        return errorResponse(error.message, 500, origin);
    }
}

// 메인 핸들러
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const origin = request.headers.get('Origin');

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: getCorsHeaders(origin) });
        }

        // Origin 검증 (health 제외)
        if (path !== '/health' && !isAllowedOrigin(origin)) {
            return jsonResponse({ error: 'Forbidden' }, 403, origin);
        }

        // 라우팅
        if (path === '/verify' && request.method === 'POST') {
            return handleVerifyPayment(request, env, origin);
        }

        // check-access를 POST로 변경
        if (path === '/check-access' && request.method === 'POST') {
            return handleCheckAccess(request, env, origin);
        }

        if (path === '/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, 200, origin);
        }

        return jsonResponse({ error: 'Not Found' }, 404, origin);
    },
};
