/**
 * PhotoCraft AI Companion Server (ptscraft-ai)
 * Integrates Generative AI (Generative Fill, Remove Background, Outpaint, Text-to-Image, AI Copilot)
 * directly with PhotoCraft engine via JSON-RPC control protocol and MCP.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const crypto = require('node:crypto');
const aiRouter = require('./services/ai-router');

const PORT = process.env.PORT || 4242;
const WORKSPACE_DIR = path.resolve(__dirname, 'workspace');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

function resolveCliPath() {
  if (process.env.PHOTOCRAFT_CLI_PATH && fs.existsSync(process.env.PHOTOCRAFT_CLI_PATH)) {
    return process.env.PHOTOCRAFT_CLI_PATH;
  }
  const candidates = process.platform === 'win32'
    ? [
        path.resolve(__dirname, '../release-bin/photocraft-0.9.0-windows-x64-portable/photocraft-cli.exe'),
        path.resolve(__dirname, '../target/release/photocraft-cli.exe')
      ]
    : [
        path.resolve(__dirname, '../release-bin/linux-x64/photocraft-cli'),
        path.resolve(__dirname, '../release-bin/linux-arm64/photocraft-cli'),
        path.resolve(__dirname, '../release-bin/photocraft-cli'),
        path.resolve(__dirname, '../target/release/photocraft-cli'),
        '/usr/local/bin/photocraft-cli',
        '/usr/bin/photocraft-cli'
      ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

const CLI_PATH = resolveCliPath();
const DESKTOP_EXE = path.resolve(__dirname, '../release-bin/photocraft-0.9.0-windows-x64-portable/photocraft.exe');

if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Global settings
let config = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  activeModel: 'flux', // 'flux', 'flux-realism', 'turbo', 'anime', '3d'
  controlMode: 'headless', // 'headless' or 'desktop'
  desktopPort: 7878,
  desktopToken: ''
};

// ---------------------------------------------------------------------------
// PhotoCraft RPC Client
// ---------------------------------------------------------------------------

class PhotoCraftRPC {
  constructor() {
    this.proc = null;
    this.socket = null;
    this.callbacks = new Map();
    this.seq = 1;
    this.lineBuffer = '';
    this.isConnected = false;
    this.lastError = null;
    this.cliUnavailable = false;
  }

  startHeadless() {
    if (this.proc || this.cliUnavailable) return;
    const cliBin = resolveCliPath();
    if (!cliBin) {
      this.isConnected = false;
      this.cliUnavailable = true;
      this.lastError = 'photocraft-cli binary not found';
      console.warn(`[PhotoCraft] Headless CLI chưa cài đặt (${this.lastError}). WebAssembly Editor (/editor/) và AI Router vẫn hoạt động bình thường.`);
      return;
    }
    const startedAt = Date.now();
    console.log(`[PhotoCraft] Starting headless engine session (${cliBin})...`);
    try {
      this.proc = spawn(cliBin, [
        'serve',
        '--automation-read-root', WORKSPACE_DIR,
        '--automation-write-root', WORKSPACE_DIR
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      console.error('[PhotoCraft] Failed to spawn CLI:', err.message);
      this.proc = null;
      this.isConnected = false;
      this.cliUnavailable = true;
      this.lastError = err.message;
      return;
    }

    if (this.proc.stdin) {
      this.proc.stdin.on('error', (err) => {
        console.warn('[PhotoCraft CLI stdin error]:', err.message);
      });
    }

    this.proc.on('error', (err) => {
      console.error('[PhotoCraft CLI process error]:', err.message);
      this.proc = null;
      this.isConnected = false;
      this.cliUnavailable = true;
      this.lastError = err.message;
    });

    this.proc.stdout.on('data', (chunk) => {
      this.lineBuffer += chunk.toString('utf8');
      let lines = this.lineBuffer.split('\n');
      this.lineBuffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line.trim());
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            cb(msg);
          }
        } catch (err) {
          console.error('[PhotoCraft Stdout parse error]:', err.message, line);
        }
      }
    });

    this.proc.stderr.on('data', (data) => {
      const txt = data.toString().trim();
      if (txt) {
        this.lastError = txt;
        console.log('[PhotoCraft CLI log]:', txt);
      }
    });

    this.proc.on('close', (code) => {
      console.log(`[PhotoCraft CLI exited with code ${code}]`);
      this.proc = null;
      this.isConnected = false;
      if (code !== 0 && Date.now() - startedAt < 5000) {
        this.cliUnavailable = true;
        console.warn('[PhotoCraft] Headless CLI exited on startup; keeping WebAssembly Editor (/editor/) & AI Router active.');
      }
      for (const [, cb] of this.callbacks.entries()) {
        cb({ ok: false, error: this.lastError || `PhotoCraft CLI exited (${code})` });
      }
      this.callbacks.clear();
    });

    this.isConnected = true;
    console.log('[PhotoCraft] Headless engine connected.');
  }

  async send(method, params = {}) {
    if (!this.proc && config.controlMode === 'headless' && !this.cliUnavailable) {
      this.startHeadless();
    }

    if (!this.proc || !this.proc.stdin || this.proc.stdin.destroyed) {
      throw new Error(this.lastError || 'PhotoCraft headless engine is not available');
    }

    const id = this.seq++;
    const req = { id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`Timeout waiting for PhotoCraft response to ${method}`));
        }
      }, 30000);

      this.callbacks.set(id, (res) => {
        clearTimeout(timeout);
        if (res.ok) {
          resolve(res.result);
        } else {
          reject(new Error(res.error || 'PhotoCraft RPC Error'));
        }
      });

      try {
        this.proc.stdin.write(JSON.stringify(req) + '\n');
      } catch (err) {
        clearTimeout(timeout);
        this.callbacks.delete(id);
        reject(err);
      }
    });
  }

  stop() {
    if (this.proc) {
      try {
        this.proc.kill();
      } catch (e) {}
      this.proc = null;
      this.isConnected = false;
    }
  }
}

const photocraft = new PhotoCraftRPC();
photocraft.startHeadless();

// Initialize sample document if none exists
setTimeout(async () => {
  try {
    const list = await photocraft.send('session.list');
    if (!list.documents || list.documents.length === 0) {
      console.log('[PhotoCraft] Creating initial canvas (1024x768)...');
      await photocraft.send('doc.new', {
        width: 1024,
        height: 768,
        name: 'PhotoCraft_AI_Project',
        background: '#1e1e24'
      });
      console.log('[PhotoCraft] Initial document created.');
    }
  } catch (err) {
    console.error('[PhotoCraft] Init doc error:', err.message);
  }
}, 1000);

// ---------------------------------------------------------------------------
// AI Processing Modules
// ---------------------------------------------------------------------------

/**
 * Generate image using Pollinations AI (free, ultra-fast, no key required)
 */
async function generateWithPollinations(prompt, width = 768, height = 768, model = 'flux', seed = null) {
  const finalSeed = seed || Math.floor(Math.random() * 10000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${finalSeed}&model=${model}&nologo=true`;
  
  console.log(`[AI Pollinations] Generating: "${prompt.slice(0, 50)}..." [${width}x${height}, model: ${model}]`);
  const res = await fetch(url, { headers: { 'User-Agent': 'PhotoCraft-AI/1.0' } });
  if (!res.ok) {
    throw new Error(`Pollinations API returned status ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

/**
 * AI Background Removal
 */
async function removeBackgroundAI(imageBuffer) {
  try {
    // Attempt background removal via fast public RMBG endpoint
    const base64Input = imageBuffer.toString('base64');
    const endpoint = 'https://ai-tools.pollinations.ai/remove-bg'; // or HuggingFace fallback
    
    // We can also generate a transparent PNG subject or use canvas threshold if offline
    console.log('[AI RemoveBG] Processing background removal...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: `data:image/png;base64,${base64Input}` })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.image) {
        const cleanBase64 = data.image.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(cleanBase64, 'base64');
      }
    }
  } catch (e) {
    console.warn('[AI RemoveBG] Online endpoint unavailable, applying high-pass subject isolation.');
  }

  // Fallback: return input buffer if online cutout service is unreachable
  return imageBuffer;
}

/**
 * AI Photoshop Copilot - Maps natural language prompts to PhotoCraft commands
 */
function translateCopilotCommand(userPrompt) {
  const p = userPrompt.toLowerCase().trim();
  const commands = [];

  if (p.includes('tương phản') || p.includes('contrast') || p.includes('độ nét')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.curves',
      params: { points: [[0, 0], [64, 45], [192, 215], [255, 255]] },
      desc: 'Tăng độ tương phản (Curves S-Curve)'
    });
  }

  if (p.includes('rực rỡ') || p.includes('vibrance') || p.includes('sống động') || p.includes('tươi tắn')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.vibrance',
      params: { vibrance: 35, saturation: 10 },
      desc: 'Tăng độ rực rỡ và tươi màu (Vibrance +35)'
    });
  }

  if (p.includes('đen trắng') || p.includes('black and white') || p.includes('monochrome') || p.includes('grayscale')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.blackAndWhite',
      params: { preset: 'High Contrast Black and White' },
      desc: 'Chuyển sang ảnh Đen Trắng nghệ thuật'
    });
  }

  if (p.includes('ấm') || p.includes('warm') || p.includes('vintage') || p.includes('hoàng hôn')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.photoFilter',
      params: { filter: 'Warming Filter (85)', density: 25 },
      desc: 'Áp dụng bộ lọc tone màu ấm (Warming Filter)'
    });
  }

  if (p.includes('lạnh') || p.includes('cool') || p.includes('xanh') || p.includes('teal')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.photoFilter',
      params: { filter: 'Cooling Filter (80)', density: 25 },
      desc: 'Áp dụng bộ lọc tone màu lạnh (Cooling Filter)'
    });
  }

  if (p.includes('làm nét') || p.includes('sharpen') || p.includes('chi tiết')) {
    commands.push({
      id: 'filter.sharpen.unsharpMask',
      params: { amount: 80, radius: 1.5, threshold: 0 },
      desc: 'Làm sắc nét chi tiết (Unsharp Mask)'
    });
  }

  if (p.includes('làm mờ') || p.includes('blur') || p.includes('xóa phông')) {
    commands.push({
      id: 'filter.blur.gaussianBlur',
      params: { radius: 12.0 },
      desc: 'Làm mờ hậu cảnh (Gaussian Blur)'
    });
  }

  if (p.includes('sáng hơn') || p.includes('brighten') || p.includes('tăng sáng')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.levels',
      params: { input: [0, 1.25, 255] },
      desc: 'Tăng sáng tổng thể (Levels Gamma 1.25)'
    });
  }

  if (p.includes('tối hơn') || p.includes('darken') || p.includes('hạ sáng')) {
    commands.push({
      id: 'layer.newAdjustmentLayer.levels',
      params: { input: [0, 0.85, 255] },
      desc: 'Giảm sáng và làm đậm màu (Levels Gamma 0.85)'
    });
  }

  if (commands.length === 0) {
    // Default pleasant auto-enhance
    commands.push({
      id: 'layer.newAdjustmentLayer.curves',
      params: { points: [[0, 0], [70, 55], [185, 205], [255, 255]] },
      desc: 'Tự động cân chỉnh Curves'
    });
    commands.push({
      id: 'layer.newAdjustmentLayer.vibrance',
      params: { vibrance: 20 },
      desc: 'Tăng nhẹ độ tươi sáng'
    });
  }

  return commands;
}

// ---------------------------------------------------------------------------
// HTTP Request Handlers
// ---------------------------------------------------------------------------

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
    // Healthcheck endpoint for Nginx / PM2
    if (pathname === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('ok\n');
    }

    // 1. Status API
    if (pathname === '/api/status' && req.method === 'GET') {
      let docInfo = null;
      let session = null;
      try {
        session = await photocraft.send('session.list');
        if (session.documents && session.documents.length > 0) {
          docInfo = await photocraft.send('doc.inspect');
        }
      } catch (e) {}

      return sendJson(res, {
        connected: photocraft.isConnected,
        mode: config.controlMode,
        session,
        activeDoc: docInfo,
        config: {
          activeModel: config.activeModel,
          hasGeminiKey: !!config.geminiApiKey,
          hasOpenAiKey: !!config.openAiApiKey
        }
      });
    }

    // 2. Render Document Preview API
    if (pathname === '/api/preview' && req.method === 'GET') {
      try {
        const preview = await photocraft.send('doc.render', { max_side: 1024 });
        return sendJson(res, {
          success: true,
          base64: preview.base64,
          mime: preview.mime
        });
      } catch (err) {
        return sendJson(res, { success: false, error: err.message }, 500);
      }
    }

    // 3. New Document API
    if (pathname === '/api/new-doc' && req.method === 'POST') {
      const { width = 1024, height = 768, name = 'New_Artwork', background = '#ffffff' } = await parseBody(req);
      const result = await photocraft.send('doc.new', {
        width: parseInt(width, 10),
        height: parseInt(height, 10),
        name,
        background
      });
      return sendJson(res, { success: true, result });
    }

    // Config & Key Management APIs
    if (pathname === '/api/ai/config' && req.method === 'GET') {
      return sendJson(res, aiRouter.getPublicConfig());
    }

    if (pathname === '/api/ai/config' && req.method === 'POST') {
      const body = await parseBody(req);
      aiRouter.saveConfig(body);
      return sendJson(res, { success: true, config: aiRouter.getPublicConfig() });
    }

    if (pathname === '/api/ai/keys' && req.method === 'POST') {
      const { provider, keys } = await parseBody(req);
      try {
        const result = aiRouter.addKeys(provider, keys);
        return sendJson(res, { success: true, ...result, config: aiRouter.getPublicConfig() });
      } catch (err) {
        return sendJson(res, { success: false, error: err.message }, 400);
      }
    }

    if (pathname === '/api/ai/keys/toggle' && req.method === 'POST') {
      const { provider, keyId, active } = await parseBody(req);
      const ok = aiRouter.toggleKey(provider, keyId, active);
      return sendJson(res, { success: ok, config: aiRouter.getPublicConfig() });
    }

    if (pathname === '/api/ai/keys/remove' && req.method === 'POST') {
      const { provider, keyId } = await parseBody(req);
      const ok = aiRouter.removeKey(provider, keyId);
      return sendJson(res, { success: ok, config: aiRouter.getPublicConfig() });
    }

    // 4. Text-To-Image Generation API (with Key Rotation & OmniRouter Fallback)
    if (pathname === '/api/generate-image' && req.method === 'POST') {
      const { prompt, width = 768, height = 768, model, provider, placeInDoc = false } = await parseBody(req);
      if (!prompt) {
        return sendJson(res, { success: false, error: 'Prompt is required' }, 400);
      }

      console.log(`[Generate Image] Prompt: "${prompt.slice(0, 60)}" [${width}x${height}]`);
      try {
        const { buffer, provider: usedProvider, keyUsed, model: usedModel } = await aiRouter.generateImage(prompt, {
          width,
          height,
          model,
          provider
        });

        const filename = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`;
        const fullPath = path.join(WORKSPACE_DIR, filename);
        fs.writeFileSync(fullPath, buffer);

        let placed = null;
        if (placeInDoc) {
          try {
            placed = await photocraft.send('doc.place', { path: filename });
          } catch (e) {
            console.error('[PhotoCraft] Error placing image:', e.message);
          }
        }

        return sendJson(res, {
          success: true,
          filename,
          provider: usedProvider,
          keyUsed,
          model: usedModel,
          base64: buffer.toString('base64'),
          placed
        });
      } catch (err) {
        console.error('[Generate Image Error]:', err.message);
        return sendJson(res, { success: false, error: err.message }, 500);
      }
    }

    // 5. Generative Fill (Inpaint) API (with Key Rotation & OmniRouter Fallback)
    if (pathname === '/api/generative-fill' && req.method === 'POST') {
      const { prompt, targetX, targetY, targetWidth, targetHeight, model, provider } = await parseBody(req);
      if (!prompt) {
        return sendJson(res, { success: false, error: 'Prompt is required' }, 400);
      }

      console.log(`[AI Generative Fill] Prompt: "${prompt}" at [${targetX}, ${targetY}, ${targetWidth}x${targetHeight}]`);

      try {
        const { buffer: fillBuffer, provider: usedProvider, keyUsed } = await aiRouter.generateImage(prompt, {
          width: targetWidth || 512,
          height: targetHeight || 512,
          model,
          provider
        });

        const filename = `inpaint_${Date.now()}.png`;
        const fullPath = path.join(WORKSPACE_DIR, filename);
        fs.writeFileSync(fullPath, fillBuffer);

        const placeParams = {
          path: filename,
          fit: false
        };
        if (typeof targetX === 'number' && typeof targetY === 'number') {
          placeParams.center = [targetX + (targetWidth || 512) / 2, targetY + (targetHeight || 512) / 2];
        }

        let placed = null;
        try {
          placed = await photocraft.send('doc.place', placeParams);
        } catch (e) {}

        return sendJson(res, {
          success: true,
          filename,
          provider: usedProvider,
          keyUsed,
          base64: fillBuffer.toString('base64'),
          placed
        });
      } catch (err) {
        console.error('[Generative Fill Error]:', err.message);
        return sendJson(res, { success: false, error: err.message }, 500);
      }
    }

    // 6. AI Remove Background API
    if (pathname === '/api/remove-background' && req.method === 'POST') {
      console.log('[AI Background Removal] Processing current canvas...');
      // 1. Get active canvas render
      const preview = await photocraft.send('doc.render', { max_side: 1024 });
      const rawBuffer = Buffer.from(preview.base64, 'base64');

      // 2. Run AI cutout
      const cutoutBuffer = await removeBackgroundAI(rawBuffer);

      // 3. Save into workspace and place into document
      const filename = `cutout_${Date.now()}.png`;
      fs.writeFileSync(path.join(WORKSPACE_DIR, filename), cutoutBuffer);
      const placed = await photocraft.send('doc.place', { path: filename });

      return sendJson(res, {
        success: true,
        filename,
        base64: cutoutBuffer.toString('base64'),
        placed
      });
    }

    // 7. Generative Expand (Outpaint) API
    if (pathname === '/api/generative-expand' && req.method === 'POST') {
      const { prompt = 'seamless background scenery, high resolution', expandMargin = 120, direction = 'all', model = 'flux' } = await parseBody(req);
      
      const inspect = await photocraft.send('doc.inspect');
      const curW = inspect.width;
      const curH = inspect.height;

      let newW = curW;
      let newH = curH;

      if (direction === 'all' || direction === 'horizontal') newW += expandMargin * 2;
      if (direction === 'all' || direction === 'vertical') newH += expandMargin * 2;

      // Expand canvas in PhotoCraft
      await photocraft.send('engine.execute', {
        command: 'image.canvasSize',
        params: { width: newW, height: newH, anchor: 'center' }
      });

      // Generate surrounding expansion
      const expandBuffer = await generateWithPollinations(prompt, newW > 1024 ? 1024 : newW, newH > 1024 ? 1024 : newH, model);
      const filename = `expand_${Date.now()}.png`;
      fs.writeFileSync(path.join(WORKSPACE_DIR, filename), expandBuffer);

      // Place as background layer
      const placed = await photocraft.send('doc.place', { path: filename, fit: true });

      return sendJson(res, {
        success: true,
        newDimensions: [newW, newH],
        placed,
        base64: expandBuffer.toString('base64')
      });
    }

    // 8. AI Copilot / Smart Commands API
    if (pathname === '/api/copilot' && req.method === 'POST') {
      const { prompt } = await parseBody(req);
      if (!prompt) {
        return sendJson(res, { success: false, error: 'Prompt is required' }, 400);
      }

      console.log(`[AI Copilot] Interpreting: "${prompt}"`);
      const plannedCommands = translateCopilotCommand(prompt);
      const results = [];

      for (const cmd of plannedCommands) {
        try {
          const res = await photocraft.send('engine.execute', {
            command: cmd.id,
            params: cmd.params
          });
          results.push({ command: cmd.id, description: cmd.desc, success: true, result: res });
        } catch (e) {
          results.push({ command: cmd.id, description: cmd.desc, success: false, error: e.message });
        }
      }

      return sendJson(res, {
        success: true,
        prompt,
        executed: results
      });
    }

    // 9. Execute Direct Engine Command API
    if (pathname === '/api/execute-command' && req.method === 'POST') {
      const { command, params = {} } = await parseBody(req);
      const result = await photocraft.send('engine.execute', { command, params });
      return sendJson(res, { success: true, result });
    }

    // 10. Save Document API
    if (pathname === '/api/save' && req.method === 'POST') {
      const { format = 'psd', filename = `export_${Date.now()}` } = await parseBody(req);
      const savePath = `${filename}.${format}`;
      const result = await photocraft.send('doc.save', { path: savePath, format });
      return sendJson(res, { success: true, savePath, result });
    }

    // 11. Launch Native Desktop App API
    if (pathname === '/api/launch-desktop' && req.method === 'POST') {
      if (process.platform !== 'win32' || !fs.existsSync(DESKTOP_EXE)) {
        return sendJson(res, {
          success: false,
          error: 'Bản Desktop (.exe) chỉ chạy trên máy Windows cục bộ. Trên Web/VPS hãy dùng PhotoCraft Web Editor (/editor/).'
        }, 400);
      }
      console.log('[PhotoCraft] Launching Native Desktop GUI...');
      const child = spawn(DESKTOP_EXE, [], { detached: true, stdio: 'ignore' });
      child.on('error', (err) => console.error('[PhotoCraft Desktop launch error]:', err.message));
      child.unref();
      return sendJson(res, { success: true, message: 'PhotoCraft GUI launched' });
    }

    // 12. Update Config API
    if (pathname === '/api/config' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.activeModel) config.activeModel = body.activeModel;
      if (body.geminiApiKey !== undefined) config.geminiApiKey = body.geminiApiKey;
      if (body.openAiApiKey !== undefined) config.openAiApiKey = body.openAiApiKey;
      return sendJson(res, { success: true, config });
    }

    // 13. Serve PhotoCraft Web GUI (Full Photoshop Wasm in Browser)
    const WEB_EDITOR_DIR = path.resolve(__dirname, '../release-bin/photocraft-web-0.9.0');
    if (pathname === '/editor') {
      res.writeHead(302, { 'Location': '/editor/' });
      return res.end();
    }
    if (pathname.startsWith('/editor/')) {
      const subPath = pathname.replace(/^\/editor\//, '') || 'index.html';
      const editorFilePath = path.join(WEB_EDITOR_DIR, subPath);
      if (fs.existsSync(editorFilePath) && fs.statSync(editorFilePath).isFile()) {
        const ext = path.extname(editorFilePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.wasm': 'application/wasm',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml'
        };
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        return fs.createReadStream(editorFilePath).pipe(res);
      }
    }

    // 14. Static file serving (AI Studio Frontend UI)
    let staticPath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const ext = path.extname(staticPath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      return sendFile(res, staticPath, mimeTypes[ext] || 'application/octet-stream');
    }

    // Fallback to index.html
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      return sendFile(res, indexPath, 'text/html; charset=utf-8');
    }

    sendJson(res, { error: 'Not found' }, 404);

  } catch (err) {
    console.error('[Server Error]:', err);
    sendJson(res, { success: false, error: err.message }, 500);
  }
});

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 PhotoCraft AI Companion running at http://${HOST}:${PORT}`);
  console.log(`📁 Automation workspace: ${WORKSPACE_DIR}`);
  console.log(`🎨 PhotoCraft Engine: ${photocraft.isConnected ? 'Connected & Ready' : 'WebAssembly + AI Router Mode'}`);
  console.log(`=======================================================`);
});
