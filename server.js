const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Configure Port and MIME Type Mapping
const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.js': 'application/javascript',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.html': 'text/html',
    '.css': 'text/css'
};

// CORS Headers Helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
}

// 2. Initialize the Server
const server = http.createServer((req, res) => {
  // Always attach CORS headers to all incoming responses
  setCorsHeaders(res);

  // Handle pre-flight OPTIONS requests (required for CORS compliance)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' });
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  const safeUrl = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${safeUrl}`);
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // 3. Check if the static asset exists on disk
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${safeUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set standard response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle HTTP Range Requests for efficient media streaming
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`
        });
        res.end();
        return;
      }

      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Content-Length': chunkSize
      });

      if (req.method === 'HEAD') {
        res.end();
      } else {
        const fileStream = fs.createReadStream(filePath, { start, end });
        fileStream.pipe(res);
      }
    } else {
      // Normal full file stream (Eloquent JS Ch. 20 read-stream pattern)
      res.writeHead(200, {
        'Content-Length': stats.size
      });

      if (req.method === 'HEAD') {
        res.end();
      } else {
        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (streamErr) => {
          console.error('Stream read failure:', streamErr);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          }
        });

        fileStream.pipe(res);
      }
    }

    console.log(`[${new Date().toISOString()}] ${req.method} ${safeUrl} -> ${range ? '206' : '200'} (${contentType})`);
  });
});

// 5. Start Listening on targeted port
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Node.js Media Server actively listening!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📂 Serving directory: ${PUBLIC_DIR}`);
  console.log(`===============================================`);
});