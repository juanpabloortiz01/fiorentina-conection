import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.INSTANCE_NAME || '';
const PORT = parseInt(process.env.PORT || '3000', 10);

if (!API_URL || !API_KEY || !INSTANCE) {
  console.warn('⚠️ Alerta: Faltan variables de entorno en el archivo .env');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

async function fetchFromEvolution(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'apikey': API_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // Set standard CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname === '/api/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      apiUrl: API_URL,
      instanceName: INSTANCE
    }));
    return;
  }

  if (pathname === '/api/status' && req.method === 'GET') {
    try {
      const { status, data } = await fetchFromEvolution(`/instance/connectionState/${INSTANCE}`);
      const state = data?.instance?.state || 'unknown';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: status >= 200 && status < 300,
        state,
        raw: data
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message, state: 'error' }));
    }
    return;
  }

  if (pathname === '/api/connect' && req.method === 'GET') {
    try {
      const { status, data } = await fetchFromEvolution(`/instance/connect/${INSTANCE}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: status >= 200 && status < 300,
        base64: data?.base64 || null,
        code: data?.code || null,
        pairingCode: data?.pairingCode || null,
        raw: data
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/disconnect' && req.method === 'POST') {
    try {
      const { status, data } = await fetchFromEvolution(`/instance/logout/${INSTANCE}`, {
        method: 'DELETE'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: status >= 200 && status < 300,
        data
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/restart' && req.method === 'POST') {
    try {
      const { status, data } = await fetchFromEvolution(`/instance/restart/${INSTANCE}`, {
        method: 'POST'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: status >= 200 && status < 300,
        data
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🖤 Evolution API QR Portal (Minimalist)`);
  console.log(`🌐 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`📱 Instancia conectada: ${INSTANCE}`);
  console.log(`========================================\n`);
});
