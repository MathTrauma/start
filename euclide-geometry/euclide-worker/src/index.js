/**
 * Euclide Geometry Worker
 * Serves files from R2 bucket with CORS support
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading slash

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

    try {
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
