/**
 * e-MajorMath Worker
 * R2 버킷에서 파일 서빙 + rate limiting (모두 무료)
 */

const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 60;
const PREFIX = '/e-MajorMath';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === 'www.mathtrauma.com') {
      const canonical = new URL(url);
      canonical.hostname = 'mathtrauma.com';
      return Response.redirect(canonical.toString(), 301);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCORSHeaders() });
    }

    const rawPath = url.pathname;
    const path = rawPath.startsWith(PREFIX)
      ? (rawPath.slice(PREFIX.length) || '/')
      : rawPath;

    if (path === '/' || path === '') {
      return Response.redirect(`${url.origin}${PREFIX}/calculus/2019-2-final.html`, 302);
    }

    const filePath = path.slice(1);

    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `ratelimit:majormath:${clientIP}`;

    try {
      if (env.RATE_LIMIT_KV) {
        const { allowed } = await checkRateLimit(env.RATE_LIMIT_KV, rateLimitKey);
        if (!allowed) {
          return new Response(getChallengeHTML(), {
            status: 429,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '60' }
          });
        }
      }

      const botScore = request.cf?.botManagement?.score || 100;
      if (botScore < 30) {
        return new Response('봇으로 감지되었습니다.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      const object = await env.BUCKET.get(filePath);

      if (object === null) {
        return new Response('File not found', {
          status: 404,
          headers: getCORSHeaders()
        });
      }

      return new Response(object.body, {
        headers: {
          ...getCORSHeaders(),
          'Content-Type': getContentType(filePath),
          'Cache-Control': getCacheControl(filePath),
          'ETag': object.httpEtag
        }
      });

    } catch (error) {
      console.error('Error fetching from R2:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: getCORSHeaders()
      });
    }
  }
};

async function checkRateLimit(kv, key) {
  const now = Date.now();
  const data = await kv.get(key, { type: 'json' });

  if (!data || now > data.resetTime) {
    await kv.put(key, JSON.stringify({ count: 1, resetTime: now + RATE_LIMIT_WINDOW }), { expirationTtl: 60 });
    return { allowed: true };
  }

  if (data.count >= RATE_LIMIT_MAX) {
    return { allowed: false };
  }

  data.count++;
  await kv.put(key, JSON.stringify(data), { expirationTtl: 60 });
  return { allowed: true };
}

function getChallengeHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>보안 확인</title>
<style>
body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#667eea,#764ba2)}
.box{background:#fff;padding:3rem;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;max-width:400px}
h1{color:#333;margin-bottom:1rem}p{color:#666;margin-bottom:2rem;line-height:1.6}
.btn{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:1rem 2rem;border-radius:8px;font-size:1rem;cursor:pointer}
</style></head><body>
<div class="box"><h1>보안 확인</h1><p>짧은 시간에 너무 많은 요청이 감지되었습니다.<br>잠시 후 다시 시도해주세요.</p>
<button class="btn" onclick="location.reload()">다시 시도</button></div></body></html>`;
}

function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    'js': 'application/javascript', 'json': 'application/json',
    'css': 'text/css', 'html': 'text/html; charset=utf-8',
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml', 'txt': 'text/plain',
    'pdf': 'application/pdf',
    'woff2': 'font/woff2', 'woff': 'font/woff'
  };
  return types[ext] || 'application/octet-stream';
}

function getCacheControl(path) {
  const ext = path.split('.').pop().toLowerCase();
  if (ext === 'html') return 'public, max-age=300';
  if (ext === 'css' || ext === 'js') return 'public, max-age=300';
  if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) return 'public, max-age=86400';
  if (ext === 'pdf') return 'public, max-age=86400';
  return 'public, max-age=3600';
}
