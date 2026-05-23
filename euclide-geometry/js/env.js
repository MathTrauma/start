// Worker/R2가 모든 정적 자원을 같은 오리진에서 서빙 — 상대 경로로 통일
export const LIB_BASE = new URL('../lib/', import.meta.url).href;
