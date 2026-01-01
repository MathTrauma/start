/**
 * Euclide Geometry Worker
 * Serves files from R2 bucket with origin check, rate limiting, and bot protection
 */

// Rate limiting: 60 requests per minute per IP
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms
const RATE_LIMIT_MAX = 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Handle root path
    if (path === '' || path === '/') {
      return new Response('Euclide Geometry API', {
        headers: getCORSHeaders()
      });
    }

    // Step 1: Origin/Referer check - mathtrauma.com만 허용
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    const allowedDomains = ['mathtrauma.com', 'www.mathtrauma.com', 'localhost', '127.0.0.1'];

    const isAllowedOrigin = origin && allowedDomains.some(domain => origin.includes(domain));
    const isAllowedReferer = referer && allowedDomains.some(domain => referer.includes(domain));

    if (!isAllowedOrigin && !isAllowedReferer) {
      return new Response('직접 접근은 허용되지 않습니다.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Step 2: Rate limiting using Cloudflare Durable Objects or KV
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `ratelimit:${clientIP}`;

    try {
      // KV를 사용한 rate limiting (env.RATE_LIMIT_KV 필요)
      if (env.RATE_LIMIT_KV) {
        const { allowed, remaining } = await checkRateLimit(env.RATE_LIMIT_KV, rateLimitKey);

        if (!allowed) {
          // Rate limit 초과 시 Turnstile challenge 필요
          return new Response(getChallengeHTML(), {
            status: 429,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Retry-After': '60'
            }
          });
        }
      }

      // Step 3: Cloudflare Bot Management (자동 봇 감지)
      const botScore = request.cf?.botManagement?.score || 100;

      // 봇 점수가 30 이하면 봇으로 간주 (0=확실한 봇, 100=확실한 사람)
      if (botScore < 30) {
        return new Response('봇으로 감지되었습니다.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      // Get file from R2
      const object = await env.EUCLIDE_BUCKET.get(path);

      if (object === null) {
        return new Response('File not found', {
          status: 404,
          headers: getCORSHeaders()
        });
      }

      // Determine content type
      const contentType = getContentType(path);

      // Return file with appropriate headers
      const headers = {
        ...getCORSHeaders(),
        'Content-Type': contentType,
        'Cache-Control': getCacheControl(path),
        'ETag': object.httpEtag
      };

      return new Response(object.body, { headers });

    } catch (error) {
      console.error('Error fetching from R2:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: getCORSHeaders()
      });
    }
  }
};

// Rate limiting with KV
async function checkRateLimit(kv, key) {
  const now = Date.now();
  const data = await kv.get(key, { type: 'json' });

  if (!data) {
    await kv.put(key, JSON.stringify({ count: 1, resetTime: now + RATE_LIMIT_WINDOW }), {
      expirationTtl: 60
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (now > data.resetTime) {
    await kv.put(key, JSON.stringify({ count: 1, resetTime: now + RATE_LIMIT_WINDOW }), {
      expirationTtl: 60
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (data.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  data.count++;
  await kv.put(key, JSON.stringify(data), { expirationTtl: 60 });
  return { allowed: true, remaining: RATE_LIMIT_MAX - data.count };
}

// Challenge HTML (Turnstile 사용)
// Note: Turnstile site key must be obtained from Cloudflare dashboard
// Add to wrangler.toml: TURNSTILE_SITE_KEY = "your-key"
function getChallengeHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>보안 확인</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .challenge-box {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { color: #333; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 2rem; line-height: 1.6; }
    .retry-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 1rem;
    }
    .retry-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="challenge-box">
    <h1>🔒 보안 확인</h1>
    <p>짧은 시간에 너무 많은 요청이 감지되었습니다.<br>잠시 후 다시 시도해주세요.</p>
    <p style="font-size: 0.9rem; color: #999;">Rate Limit: 60 requests per minute</p>
    <button class="retry-btn" onclick="window.location.reload()">다시 시도</button>
  </div>
</body>
</html>`;
}

// CORS headers
function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders()
  });
}

// Content type detection
function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const types = {
    'js': 'application/javascript',
    'json': 'application/json',
    'css': 'text/css',
    'html': 'text/html',
    'tex': 'text/plain',
    'md': 'text/markdown',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'txt': 'text/plain'
  };
  return types[ext] || 'application/octet-stream';
}

// Cache control based on file type
function getCacheControl(path) {
  // Versioned library files - cache for 1 year
  if (path.match(/lib\/.*\.v\d+\.\d+\.\d+\.(js|css)$/)) {
    return 'public, max-age=31536000, immutable';
  }

  // Library files without version - cache for 1 hour
  if (path.startsWith('lib/')) {
    return 'public, max-age=3600';
  }

  // Problem files - cache for 5 minutes
  if (path.startsWith('problems/')) {
    return 'public, max-age=300';
  }

  // Default - cache for 1 hour
  return 'public, max-age=3600';
}
