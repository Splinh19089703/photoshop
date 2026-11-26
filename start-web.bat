@echo off
title PhotoCraft WebAssembly Launcher
echo =======================================================
echo          PhotoCraft WebAssembly Launcher
echo =======================================================
echo.
echo Dang khoi dong Web Server tai http://localhost:8080 ...
start "" http://localhost:8080
cd /d "%~dp0release-bin\photocraft-web-0.9.0"
node -e "const http = require('http'); const fs = require('fs'); const path = require('path'); const types = {'.html':'text/html','.js':'application/javascript','.wasm':'application/wasm','.css':'text/css','.png':'image/png'}; http.createServer((req, res) => { let p = path.join(process.cwd(), req.url === '/' ? 'index.html' : req.url); if (fs.existsSync(p) && fs.statSync(p).isFile()) { res.writeHead(200, {'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp'}); fs.createReadStream(p).pipe(res); } else { res.writeHead(404); res.end('Not found'); } }).listen(8080, () => console.log('PhotoCraft Wasm running at http://localhost:8080'));"
pause
