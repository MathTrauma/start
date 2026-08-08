// Supabase Configuration
// Central configuration for Supabase credentials

// 전역 변수로 설정 (일반 스크립트 및 ES module 모두에서 사용 가능)
window.SUPABASE_URL = 'https://bdunrluoivhgypwangcx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdW5ybHVvaXZoZ3lwd2FuZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjc1NTksImV4cCI6MjA4Mjg0MzU1OX0.JBkLVuR8RyOmwMl6_-KPIgsYBy1_qoG90v5j_vt0mSQ';

// Payment Configuration
window.PORTONE_STORE_ID = 'store-c5f2423a-b1d3-4c1e-8ea3-7faa53da830e';
window.PAYMENT_CHANNEL_KEYS = {
    KCP: 'channel-key-b612f825-8eef-4f9d-92f1-e71ec778d162',
    KAKAO: 'channel-key-f70ac506-2add-42cb-90db-478eef9f5717',
};
window.PAYMENT_WORKER_URL = 'https://payment-worker.painfultrauma.workers.dev';
