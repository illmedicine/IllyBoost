#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const selfsigned = require('selfsigned');

const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.join(projectRoot, 'backend');
const frontendDir = path.join(projectRoot, 'frontend');
const certDir = path.join(backendDir, 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

console.log('1) Building frontend (installing deps if needed)');
try {
  cp.execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
  cp.execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Failed to build frontend:', e.message);
  process.exit(1);
}

console.log('2) Generating self-signed certificate for localhost');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
fs.writeFileSync(keyPath, pems.private);
fs.writeFileSync(certPath, pems.cert);
console.log('Wrote cert:', certPath);
console.log('Wrote key:', keyPath);

console.log('3) Starting backend with TLS');
// ensure backend deps
try {
  cp.execSync('npm install', { cwd: backendDir, stdio: 'inherit' });
} catch (e) {
  console.error('Failed to install backend deps:', e.message);
  process.exit(1);
}

const backendEnv = Object.assign({}, process.env, {
  SSL_KEY_PATH: keyPath,
  SSL_CERT_PATH: certPath,
  PORT: process.env.PORT || '3001'
});

const backend = cp.spawn(process.execPath, ['server.js'], { cwd: backendDir, env: backendEnv, stdio: 'inherit' });

backend.on('exit', (code) => {
  console.log('Backend exited with code', code);
  process.exit(code);
});

// serve the built frontend directory over HTTPS
const distDir = path.join(frontendDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('Frontend build not found at', distDir);
  process.exit(1);
}

const https = require('https');
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const cert = fs.readFileSync(certPath);
const key = fs.readFileSync(keyPath);
const frontendPort = process.env.FRONTEND_PORT || 5173;

const server = https.createServer({ key, cert }, (req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(distDir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(res);
    } else {
      // fallback to index.html for SPA routing
      res.setHeader('Content-Type', 'text/html');
      fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
    }
  } catch (e) {
    res.statusCode = 500;
    res.end('Server error');
  }
});

server.listen(frontendPort, () => {
  console.log(`Secure frontend preview available at https://localhost:${frontendPort}`);
  console.log(`Backend (HTTPS) is expected at https://localhost:${backendEnv.PORT}`);
  console.log('Note: your browser will warn for self-signed certificates; proceed to accept the certificate.');
});
