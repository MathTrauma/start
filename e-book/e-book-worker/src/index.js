/**
 * e-book-worker — R2 버킷(e-book)의 파일을 공개 서빙.
 * 인증/유무료 없음(전부 공개). PDF range 요청 지원.
 * 라우트: mathtrauma.com/e-book/*  →  R2 'e-book' 버킷
 */

const PREFIX = '/e-book';

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
};

function contentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    let key = url.pathname;
    if (key.startsWith(PREFIX)) key = key.slice(PREFIX.length); // /e-book prefix 제거
    key = key.replace(/^\/+/, '');
    if (key === '' || key.endsWith('/')) key += 'index.html';    // 디렉토리 → index.html
    key = decodeURIComponent(key);

    try {
      // Range 요청(PDF 부분 로드) 지원
      const rangeHeader = request.headers.get('range');
      let object;
      if (rangeHeader) {
        const m = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (m) {
          const offset = parseInt(m[1], 10);
          const length = m[2] ? (parseInt(m[2], 10) - offset + 1) : undefined;
          object = await env.E_BOOK_BUCKET.get(key, { range: { offset, length } });
        } else {
          object = await env.E_BOOK_BUCKET.get(key);
        }
      } else {
        object = await env.E_BOOK_BUCKET.get(key);
      }

      if (!object) {
        return new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Content-Type', contentType(key));
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=3600');

      // Range 응답
      if (rangeHeader && object.range) {
        const start = object.range.offset || 0;
        const len = object.range.length || (object.size - start);
        headers.set('Content-Range', `bytes ${start}-${start + len - 1}/${object.size}`);
        return new Response(request.method === 'HEAD' ? null : object.body, { status: 206, headers });
      }

      return new Response(request.method === 'HEAD' ? null : object.body, { headers });
    } catch (err) {
      return new Response('Error: ' + err.message, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  },
};
