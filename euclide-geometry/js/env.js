const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
export const R2_URL = 'https://euclide-worker.painfultrauma.workers.dev';
export const LIB_BASE = isLocal
    ? new URL('../lib/', import.meta.url).href
    : `${R2_URL}/lib/`;
export const IS_LOCAL = isLocal;
