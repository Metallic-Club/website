import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (url === '/') url = '/index.html';
    if (root === path.resolve('.') && (url.startsWith('/art/') || url === '/favicon.svg')) url = '/public' + url;
    const file = path.resolve(root, '.' + url);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Metallic: http://127.0.0.1:4173'));
