// The 12 Chronicles — Production & Local Server Router
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

// Explicit static references ensure @vercel/nft bundler includes all HTML files
const STATIC_PAGE_FILES = {
  'index.html': path.join(__dirname, 'index.html'),
  'auth.html': path.join(__dirname, 'auth.html'),
  'admin.html': path.join(__dirname, 'admin.html'),
  'expenses.html': path.join(__dirname, 'expenses.html'),
  'explore.html': path.join(__dirname, 'explore.html'),
  'hall-of-fame.html': path.join(__dirname, 'hall-of-fame.html'),
  'memories.html': path.join(__dirname, 'memories.html'),
  'planner.html': path.join(__dirname, 'planner.html'),
  'schedule.html': path.join(__dirname, 'schedule.html'),
  'squad.html': path.join(__dirname, 'squad.html')
};

// Route mapping for both clean paths and direct .html paths
const PAGE_ROUTES = {
  '/': 'index.html',
  '/index': 'index.html',
  '/index.html': 'index.html',
  '/auth': 'auth.html',
  '/auth.html': 'auth.html',
  '/admin': 'admin.html',
  '/admin.html': 'admin.html',
  '/expenses': 'expenses.html',
  '/expenses.html': 'expenses.html',
  '/explore': 'explore.html',
  '/explore.html': 'explore.html',
  '/hall-of-fame': 'hall-of-fame.html',
  '/hall-of-fame.html': 'hall-of-fame.html',
  '/memories': 'memories.html',
  '/memories.html': 'memories.html',
  '/planner': 'planner.html',
  '/planner.html': 'planner.html',
  '/schedule': 'schedule.html',
  '/schedule.html': 'schedule.html',
  '/squad': 'squad.html',
  '/squad.html': 'squad.html'
};

function checkCandidates(relativePath) {
  const clean = relativePath.replace(/^[\\\/]+/, '');
  const candidates = [
    path.join(__dirname, clean),
    path.join(process.cwd(), clean),
    path.join(__dirname, 'public', clean),
    path.join(process.cwd(), 'public', clean)
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (e) {
      /* ignore file access error */
    }
  }
  return null;
}

function resolveFilePath(reqUrl) {
  let pathname = '/';
  try {
    const parsed = new URL(reqUrl, 'http://localhost');
    pathname = decodeURI(parsed.pathname);
  } catch (e) {
    pathname = decodeURI((reqUrl || '/').split('?')[0]);
  }

  // Normalize path
  pathname = path.posix.normalize(pathname).replace(/\\/g, '/');
  if (pathname === '.' || pathname === '') pathname = '/';

  // 1. Check known page routes (e.g. /auth, /auth.html, /, /admin, etc.)
  const lower = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (PAGE_ROUTES[lower]) {
    const pageName = PAGE_ROUTES[lower];
    if (STATIC_PAGE_FILES[pageName] && fs.existsSync(STATIC_PAGE_FILES[pageName])) {
      return STATIC_PAGE_FILES[pageName];
    }
    const found = checkCandidates(pageName);
    if (found) return found;
  }

  // 2. Direct static file lookup
  const cleanRel = pathname.replace(/^\/+/, '');
  let resolved = checkCandidates(cleanRel);
  if (resolved) return resolved;

  // 3. Clean URL fallback (e.g. /css/style -> /css/style.css or custom clean paths)
  if (!path.extname(cleanRel)) {
    resolved = checkCandidates(cleanRel + '.html');
    if (resolved) return resolved;
  }

  return null;
}

function handleRequest(req, res) {
  try {
    const resolvedPath = resolveFilePath(req.url);

    if (!resolvedPath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(`404 Not Found: ${req.url}`);
      return;
    }

    const stats = fs.statSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const commonHeaders = {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes'
    };

    // For HTML files, inject Vercel / local environment variables dynamically into <head>
    if (ext === '.html') {
      let content = fs.readFileSync(resolvedPath, 'utf8');
      const supabaseUrl = process.env.SUPABASE_URL || "https://taadgybxbhgsschluqla.supabase.co";
      const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_JI0xqclzW7eTAXXnKZ5raQ_LfNXm8JE";
      const envScript = `<script>window.CHRONICLES_ENV = Object.assign(window.CHRONICLES_ENV || {}, { SUPABASE_URL: ${JSON.stringify(supabaseUrl)}, SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(supabaseKey)}, SUPABASE_ANON_KEY: ${JSON.stringify(supabaseKey)} });</script>`;

      if (content.includes('</head>')) {
        content = content.replace('</head>', `${envScript}\n</head>`);
      } else {
        content = envScript + content;
      }

      const buffer = Buffer.from(content, 'utf8');
      res.writeHead(200, {
        ...commonHeaders,
        'Content-Length': buffer.length
      });
      res.end(buffer);
      return;
    }

    const rangeHeader = req.headers && req.headers.range;
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        res.writeHead(416, { ...commonHeaders, 'Content-Range': `bytes */${stats.size}` });
        res.end();
        return;
      }

      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : stats.size - 1;

      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= stats.size) end = stats.size - 1;

      if (start > end || start >= stats.size) {
        res.writeHead(416, { ...commonHeaders, 'Content-Range': `bytes */${stats.size}` });
        res.end();
        return;
      }

      res.writeHead(206, {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Content-Length': end - start + 1
      });

      fs.createReadStream(resolvedPath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      ...commonHeaders,
      'Content-Length': stats.size
    });

    fs.createReadStream(resolvedPath).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('500 Internal Server Error: ' + e.message);
  }
}

const server = http.createServer(handleRequest);

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`The 12 Chronicles server is live at: http://localhost:${port}/`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = (err.port || PORT) + 1;
    console.log(`Port ${err.port || PORT} is busy, trying port ${nextPort}...`);
    startServer(nextPort);
  } else {
    console.error('Server error:', err);
  }
});

// If executed directly (e.g. node server.js locally), start the server
if (require.main === module) {
  startServer(PORT);
}

// Export the server and handler for Vercel Serverless Function runtime compatibility
module.exports = server;
module.exports.default = handleRequest;
