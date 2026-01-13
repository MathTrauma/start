/**
 * 결제 검증 Cloudflare Worker
 *
 * 포트원 V2 결제 검증 및 Supabase 저장
 */

// CORS 헤더
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// JSON 응답 헬퍼
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}

// 에러 응답 헬퍼
function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
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

// 결제 검증 핸들러
async function handleVerifyPayment(request, env) {
    try {
        const body = await request.json();
        const { paymentId, userId } = body;

        if (!paymentId) {
            return errorResponse('paymentId가 필요합니다');
        }

        if (!userId) {
            return errorResponse('userId가 필요합니다');
        }

        // 1. 포트원에서 결제 정보 조회
        const paymentData = await getPortOnePayment(paymentId, env);
        console.log('포트원 결제 정보:', JSON.stringify(paymentData));

        // 2. 결제 금액 검증
        const expectedAmount = 9900;
        if (paymentData.amount.total !== expectedAmount) {
            return errorResponse(
                `결제 금액 불일치: 예상 ${expectedAmount}원, 실제 ${paymentData.amount.total}원`
            );
        }

        // 3. 결제 상태 확인
        if (paymentData.status !== 'PAID') {
            return errorResponse(`결제 미완료: ${paymentData.status}`);
        }

        // 4. Supabase에 저장
        const savedPayment = await savePaymentToSupabase(
            {
                id: paymentData.id,
                orderName: paymentData.orderName,
                totalAmount: paymentData.amount.total,
                paidAt: paymentData.paidAt,
                status: paymentData.status,
            },
            userId,
            env
        );

        return jsonResponse({
            success: true,
            message: '결제가 확인되었습니다',
            payment: savedPayment,
        });

    } catch (error) {
        console.error('결제 검증 오류:', error);
        return errorResponse(error.message, 500);
    }
}

// 사용자 구매 상태 확인
async function handleCheckAccess(request, env) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return errorResponse('userId가 필요합니다');
        }

        const response = await fetch(
            `${env.SUPABASE_URL}/rest/v1/user_purchases?user_id=eq.${userId}&select=*`,
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
            });
        }

        const purchase = purchases[0];
        const now = new Date();
        const expiresAt = new Date(purchase.expires_at);
        const hasAccess = purchase.has_full_access && expiresAt > now;

        return jsonResponse({
            hasAccess,
            expiresAt: purchase.expires_at,
            message: hasAccess ? '이용권이 유효합니다' : '이용권이 만료되었습니다',
        });

    } catch (error) {
        console.error('접근 권한 확인 오류:', error);
        return errorResponse(error.message, 500);
    }
}

// 메인 핸들러
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 라우팅
        if (path === '/verify' && request.method === 'POST') {
            return handleVerifyPayment(request, env);
        }

        if (path === '/check-access' && request.method === 'GET') {
            return handleCheckAccess(request, env);
        }

        if (path === '/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },
};
