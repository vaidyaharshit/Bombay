// The 12 Chronicles — Fast Local Static Server
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

const server = http.createServer((req, res) => {
  try {
    let rawPath = decodeURI(req.url.split('?')[0]);
    let safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }

    let filePath = path.join(__dirname, safePath);

    function resolveFile(candidatePath, callback) {
      fs.stat(candidatePath, (err, stats) => {
        if (!err && stats.isFile()) {
          callback(candidatePath, stats);
          return;
        }

        // Try clean URL with .html
        const withHtml = candidatePath + '.html';
        fs.stat(withHtml, (err2, stats2) => {
          if (!err2 && stats2.isFile()) {
            callback(withHtml, stats2);
            return;
          }

          // Try public directory fallback
          const publicFallback = path.join(__dirname, 'public', safePath);
          fs.stat(publicFallback, (err3, stats3) => {
            if (!err3 && stats3.isFile()) {
              callback(publicFallback, stats3);
              return;
            }
            callback(null, null);
          });
        });
      });
    }

    resolveFile(filePath, (resolvedPath, stats) => {
      if (!resolvedPath || !stats) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end(`404 Not Found: ${req.url}`);
        return;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const commonHeaders = {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes'
      };

      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
        if (!match) {
          res.writeHead(416, { ...commonHeaders, 'Content-Range': `bytes */${stats.size}` });
          res.end();
          return;
        }

        let start;
        let end;

        if (!match[1] && match[2]) {
          const suffixLength = parseInt(match[2], 10);
          start = Math.max(stats.size - suffixLength, 0);
          end = stats.size - 1;
        } else {
          start = match[1] ? parseInt(match[1], 10) : 0;
          end = match[2] ? parseInt(match[2], 10) : stats.size - 1;
        }

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
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('500 Internal Server Error: ' + e.message);
  }
});

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`The 12 Chronicles server is live at: http://localhost:${port}/`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${err.port || PORT} is busy, trying port ${(err.port || PORT) + 1}...`);
    startServer((err.port || PORT) + 1);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);

