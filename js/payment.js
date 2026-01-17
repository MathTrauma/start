// PortOne V2 결제 설정
const PORTONE_STORE_ID = 'store-c5f2423a-b1d3-4c1e-8ea3-7faa53da830e';
const PORTONE_CHANNEL_KEY = 'channel-key-adf6c40d-e1ce-478e-9098-530294eae1de';
const PAYMENT_WORKER_URL = 'https://payment-worker.painfultrauma.workers.dev';

/**
 * 고유 주문 ID 생성
 */
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `order_${timestamp}_${random}`;
}

/**
 * 결제 검증 요청 (Cloudflare Worker)
 */
async function verifyPayment(paymentId, userId) {
    const response = await fetch(`${PAYMENT_WORKER_URL}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, userId }),
    });

    return response.json();
}

/**
 * PortOne V2 결제 실행
 */
async function requestPayment() {
    // 로그인 확인
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        alert('결제를 진행하려면 먼저 로그인해주세요.');
        return;
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const orderId = generateOrderId();

    try {
        // PortOne V2 결제 요청
        const response = await PortOne.requestPayment({
            storeId: PORTONE_STORE_ID,
            channelKey: PORTONE_CHANNEL_KEY,
            paymentId: orderId,
            orderName: 'MathMore Basic',
            totalAmount: 9900,
            currency: 'KRW',
            payMethod: 'CARD',
            customer: {
                email: userEmail,
            },
        });

        // 결제 실패 처리
        if (response.code) {
            if (response.code === 'FAILURE_TYPE_PG') {
                alert(`결제 실패: ${response.message}`);
            } else if (response.code !== 'USER_CANCEL') {
                alert(`결제 오류: ${response.message}`);
            }
            return;
        }

        // 결제 성공 - 서버 검증
        const verifyResult = await verifyPayment(response.paymentId, userId);

        if (verifyResult.success) {
            alert('결제가 완료되었습니다! 이용권이 활성화되었습니다.');
            window.location.reload();
        } else {
            alert(`결제 검증 실패: ${verifyResult.error}`);
        }

    } catch (error) {
        console.error('결제 오류:', error);
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}
