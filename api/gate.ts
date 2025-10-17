import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import fs from 'fs';

const USER = process.env.BASIC_AUTH_USER || 'admin';
const PASS = process.env.BASIC_AUTH_PASS || 'password';
const COOKIE = 'svpro_auth';
const publicDir = path.join(process.cwd(), 'dist', 'public');

function sendHTML(res: VercelResponse, html: string, status = 200) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(status).send(html);
}

function loginPage(error?: string) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Login • SportsViewPro</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 420px; margin: 10vh auto; padding: 16px; }
  h1 { margin: 0 0 16px; font-size: 1.25rem; }
  form { display: grid; gap: 10px; }
  input, button { padding: .8rem; font-size: 1rem; border-radius: 10px; border: 1px solid #9993; }
  button { cursor: pointer; }
  .err { color: #c00; margin-bottom: 8px; }
  .card { border: 1px solid #9993; padding: 16px; border-radius: 14px; backdrop-filter: blur(4px); }
</style></head><body>
  <div class="card">
    <h1>Enter to Continue</h1>
    ${error ? `<div class="err">${error}</div>` : ''}
    <form method="POST">
      <input name="u" placeholder="Username" autocomplete="username" required />
      <input name="p" type="password" placeholder="Password" autocomplete="current-password" required />
      <button type="submit">Unlock</button>
    </form>
  </div>
</body></html>`;
}

function setSessionCookie(res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=1; Path=/; HttpOnly; SameSite=Lax`
  );
}

function hasSessionCookie(req: VercelRequest) {
  const raw = req.headers.cookie || '';
  return raw.split(';').map(s => s.trim()).includes(`${COOKIE}=1`);
}

function contentTypeFor(ext: string) {
  switch (ext) {
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.html': return 'text/html; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

function serveStatic(req: VercelRequest, res: VercelResponse) {
  let url = req.url || '/';
  try { url = decodeURIComponent(url); } catch {}
  if (url === '/') url = '/index.html';

  const filePath = path.join(publicDir, url);
  const safeRoot = path.normalize(publicDir) + path.sep;
  const safePath = path.normalize(filePath);
  if (!safePath.startsWith(safeRoot)) {
    return res.status(400).send('Bad request');
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    res.setHeader('Content-Type', contentTypeFor(path.extname(safePath)));
    return res.status(200).send(fs.readFileSync(safePath));
  }

  const index = path.join(publicDir, 'index.html');
  if (fs.existsSync(index)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fs.readFileSync(index, 'utf8'));
  }

  return res.status(404).send('Not found');
}

async function readForm(req: VercelRequest) {
  const chunks: Buffer[] = [];
  for await (const ch of req) chunks.push(Buffer.from(ch));
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (hasSessionCookie(req)) return serveStatic(req, res);

  if (req.method === 'POST') {
    const form = await readForm(req);
    const u = form.get('u');
    const p = form.get('p');
    if (u === USER && p === PASS) {
      setSessionCookie(res);
      res.status(302).setHeader('Location', '/').end();
      return;
    }
    return sendHTML(res, loginPage('Invalid username or password'), 401);
  }

  return sendHTML(res, loginPage());
}
