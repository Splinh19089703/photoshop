/**
 * PhotoCraft AI Router with Key Rotation & OmniRouter Support
 * Follows SPLSEO Multi-Provider Fallback Architecture
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_DIR = path.resolve(__dirname, '../config');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'ai-settings.json');

// Ensure config dir exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Default Configuration (Aligned with SPLSEO; real keys live in gitignored config/ai-settings.json or env vars)
const DEFAULT_CONFIG = {
  activeProvider: 'omnirouter', // 'omnirouter', 'openrouter', 'gemini', 'pollinations', 'custom'
  fallbackOrder: ['omnirouter', 'openrouter', 'gemini', 'pollinations'],
  providers: {
    omnirouter: {
      name: 'OmniRouter (SPLSEO Engine)',
      baseUrl: process.env.OMNIROUTER_BASE_URL || 'http://139.99.89.215:20128/v1',
      model: 'spl',
      imageModel: 'nvidia/black-forest-labs/flux.1-schnell',
      keys: process.env.OMNIROUTER_API_KEY
        ? [
            {
              id: 'omnirouter-env-default',
              key: process.env.OMNIROUTER_API_KEY,
              label: 'OmniRouter Env Key',
              active: true,
              usage: 0,
              cooldownUntil: 0,
              lastError: null
            }
          ]
        : []
    },
    openrouter: {
      name: 'OpenRouter (openrouter.ai)',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'black-forest-labs/flux-schnell',
      imageModel: 'black-forest-labs/flux-schnell',
      keys: process.env.OPENROUTER_API_KEY
        ? [
            {
              id: 'openrouter-env-default',
              key: process.env.OPENROUTER_API_KEY,
              label: 'OpenRouter Env Key',
              active: true,
              usage: 0,
              cooldownUntil: 0,
              lastError: null
            }
          ]
        : []
    },
    gemini: {
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.5-flash',
      imageModel: 'gemini-2.5-flash-image',
      keys: process.env.GEMINI_API_KEY
        ? [
            {
              id: 'gemini-env-default',
              key: process.env.GEMINI_API_KEY,
              label: 'Gemini Env Key',
              active: true,
              usage: 0,
              cooldownUntil: 0,
              lastError: null
            }
          ]
        : []
    },
    custom: {
      name: 'Custom OpenAI-Compatible / Local Router',
      baseUrl: 'http://localhost:11434/v1',
      model: 'dall-e-3',
      imageModel: 'dall-e-3',
      keys: []
    },
    pollinations: {
      name: 'Pollinations FLUX (Free Fallback)',
      model: 'flux',
      imageModel: 'flux',
      keys: []
    }
  }
};

class AIRouter {
  constructor() {
    this.config = this.loadConfig();
    this.rotationIndexes = {}; // provider -> last used key index
  }

  loadConfig() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        // Deep merge with DEFAULT_CONFIG so new providers are always populated
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        merged.providers = { ...DEFAULT_CONFIG.providers };
        if (parsed.providers) {
          for (const k of Object.keys(parsed.providers)) {
            merged.providers[k] = {
              ...(DEFAULT_CONFIG.providers[k] || {}),
              ...parsed.providers[k]
            };
          }
        }
        return merged;
      }
    } catch (e) {
      console.warn('[AIRouter] Error loading settings, using defaults:', e.message);
    }
    this.saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  saveConfig(newConfig) {
    if (newConfig && newConfig !== this.config) {
      if (newConfig.activeProvider) this.config.activeProvider = newConfig.activeProvider;
      if (newConfig.fallbackOrder) this.config.fallbackOrder = newConfig.fallbackOrder;

      if (newConfig.providers) {
        for (const p of Object.keys(newConfig.providers)) {
          if (!this.config.providers[p]) this.config.providers[p] = {};
          const incomingP = newConfig.providers[p];
          if (incomingP.baseUrl !== undefined) this.config.providers[p].baseUrl = incomingP.baseUrl;
          if (incomingP.imageModel !== undefined) this.config.providers[p].imageModel = incomingP.imageModel;
          if (incomingP.model !== undefined) this.config.providers[p].model = incomingP.model;

          // PRESERVE real secret keys!
          if (Array.isArray(incomingP.keys)) {
            const existingKeysMap = new Map((this.config.providers[p].keys || []).map(k => [k.id, k.key]));
            this.config.providers[p].keys = incomingP.keys.map(k => {
              const realKey = k.key || existingKeysMap.get(k.id) || '';
              return {
                id: k.id,
                key: realKey,
                label: k.label || 'API Key',
                active: k.active !== false,
                usage: k.usage || 0,
                cooldownUntil: k.cooldownUntil || 0,
                lastError: k.lastError || null
              };
            }).filter(k => k.key); // discard if key string is missing
          }
        }
      }
    }
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.config, null, 2), 'utf8');
      console.log('[AIRouter] Settings saved to', SETTINGS_FILE);
      return true;
    } catch (e) {
      console.error('[AIRouter] Error saving config:', e.message);
      return false;
    }
  }

  getPublicConfig() {
    // Return sanitized config (masking API keys like sk-or...abcd)
    const sanitized = JSON.parse(JSON.stringify(this.config));
    for (const pKey of Object.keys(sanitized.providers)) {
      const p = sanitized.providers[pKey];
      if (Array.isArray(p.keys)) {
        p.keys = p.keys.map(k => ({
          id: k.id,
          label: k.label || 'API Key',
          active: k.active !== false,
          usage: k.usage || 0,
          inCooldown: k.cooldownUntil > Date.now(),
          cooldownSeconds: Math.max(0, Math.round((k.cooldownUntil - Date.now()) / 1000)),
          lastError: k.lastError || null,
          maskedKey: k.key ? (k.key.length > 10 ? `${k.key.slice(0, 7)}...${k.key.slice(-4)}` : '******') : ''
        }));
      }
    }
    return sanitized;
  }

  addKeys(provider, rawKeysString) {
    if (!this.config.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const lines = rawKeysString.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
    const existing = this.config.providers[provider].keys || [];
    let addedCount = 0;

    for (const key of lines) {
      if (!existing.some(k => k.key === key)) {
        existing.push({
          id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          key,
          label: `Key #${existing.length + 1}`,
          active: true,
          usage: 0,
          cooldownUntil: 0,
          lastError: null
        });
        addedCount++;
      }
    }

    this.config.providers[provider].keys = existing;
    this.saveConfig();
    return { addedCount, totalKeys: existing.length };
  }

  toggleKey(provider, keyId, active) {
    const p = this.config.providers[provider];
    if (!p || !p.keys) return false;
    const k = p.keys.find(x => x.id === keyId);
    if (k) {
      k.active = active !== undefined ? active : !k.active;
      if (k.active) k.cooldownUntil = 0; // reset cooldown if manually enabled
      this.saveConfig();
      return true;
    }
    return false;
  }

  removeKey(provider, keyId) {
    const p = this.config.providers[provider];
    if (!p || !p.keys) return false;
    p.keys = p.keys.filter(x => x.id !== keyId);
    this.saveConfig();
    return true;
  }

  /**
   * Round-Robin Key Selector with Cooldown Filtering
   */
  selectKeyRoundRobin(provider) {
    const p = this.config.providers[provider];
    if (!p || !p.keys || p.keys.length === 0) return null;

    const now = Date.now();
    const availableKeys = p.keys.filter(k => k && k.key && k.key.trim() && k.active !== false && (!k.cooldownUntil || k.cooldownUntil <= now));

    if (availableKeys.length === 0) {
      const soonestKey = p.keys.filter(k => k && k.active !== false).sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0))[0];
      if (soonestKey) {
        console.warn(`[AIRouter] All keys for ${provider} in cooldown. Next key available in ${Math.round((soonestKey.cooldownUntil - now) / 1000)}s`);
      }
      return null;
    }

    if (this.rotationIndexes[provider] === undefined) {
      this.rotationIndexes[provider] = 0;
    } else {
      this.rotationIndexes[provider] = (this.rotationIndexes[provider] + 1) % availableKeys.length;
    }

    const selectedIndex = this.rotationIndexes[provider] % availableKeys.length;
    const key = availableKeys[selectedIndex];
    const keyStr = String(key.key || '');
    console.log(`[AIRouter] 🔄 Xoay tua chọn key cho ${provider}: ${key.label || 'Key'} (${keyStr.slice(0, 6)}...) [Index ${selectedIndex + 1}/${availableKeys.length}]`);
    return key;
  }

  handleKeyError(keyObj, error, provider) {
    if (!keyObj) return;
    const status = error.status || (error.response ? error.response.status : 0);
    const errMsg = error.message || 'Unknown error';

    keyObj.lastError = `[${new Date().toLocaleTimeString()}] HTTP ${status || 'ERR'}: ${errMsg}`;

    if (status === 429 || status === 503) {
      // Rate Limit -> 1 minute cooldown
      console.warn(`[AIRouter] ⚠️ Key ${keyObj.label} (${provider}) Rate Limit (${status}). Cooldown 60s.`);
      keyObj.cooldownUntil = Date.now() + 60 * 1000;
    } else if (status === 401 || status === 403) {
      // Auth or Quota Exceeded -> 30 minutes cooldown
      console.warn(`[AIRouter] ❌ Key ${keyObj.label} (${provider}) Auth/Quota Error (${status}). Cooldown 30 phút.`);
      keyObj.cooldownUntil = Date.now() + 30 * 60 * 1000;
    } else {
      // General network/temporary issue -> 15s cooldown
      keyObj.cooldownUntil = Date.now() + 15 * 1000;
    }

    this.saveConfig();
  }

  recordKeySuccess(keyObj) {
    if (!keyObj) return;
    keyObj.usage = (keyObj.usage || 0) + 1;
    keyObj.cooldownUntil = 0;
    keyObj.lastError = null;
    this.saveConfig();
  }

  /**
   * Main Generation Pipeline with Automatic Key Rotation & Multi-Provider Fallback
   */
  async generateImage(prompt, options = {}) {
    const width = options.width || 768;
    const height = options.height || 768;
    const requestedProvider = options.provider || this.config.activeProvider || 'omnirouter';

    // Build fallback chain starting with requested provider
    const chain = [requestedProvider];
    const defaultOrder = this.config.fallbackOrder || ['omnirouter', 'openrouter', 'gemini', 'pollinations'];
    for (const p of defaultOrder) {
      if (!chain.includes(p)) chain.push(p);
    }

    const errors = [];

    for (const provider of chain) {
      console.log(`[AIRouter] Trying provider: ${provider.toUpperCase()}...`);

      // 1. OmniRouter (SPLSEO 139.99.89.215 / Custom Proxy)
      if (provider === 'omnirouter') {
        const pConfig = this.config.providers.omnirouter || {};
        const keys = (pConfig.keys || []).filter(k => k && k.key && k.key.trim() && k.active !== false);

        if (keys.length === 0) {
          console.warn('[AIRouter] OmniRouter has no active API keys, trying next provider...');
          errors.push('OmniRouter: Không có API key nào được cấu hình');
          continue;
        }

        let anyKeySucceeded = false;
        for (let attempt = 0; attempt < Math.min(keys.length, 3); attempt++) {
          const keyObj = this.selectKeyRoundRobin('omnirouter');
          if (!keyObj) break;

          try {
            const buffer = await this._callOmniRouterImage(keyObj.key, prompt, pConfig, width, height);
            this.recordKeySuccess(keyObj);
            anyKeySucceeded = true;
            return {
              buffer,
              provider: 'omnirouter',
              keyUsed: keyObj.label,
              model: pConfig.imageModel || 'nvidia/black-forest-labs/flux.1-schnell'
            };
          } catch (err) {
            console.error(`[AIRouter] OmniRouter key ${keyObj.label} failed:`, err.message);
            this.handleKeyError(keyObj, err, 'omnirouter');
            errors.push(`OmniRouter (${keyObj.label}): ${err.message}`);
          }
        }
        if (!anyKeySucceeded) {
          console.warn('[AIRouter] All OmniRouter keys failed or on cooldown, falling back to next provider...');
        }
      }

      // 2. OpenRouter Official (openrouter.ai)
      if (provider === 'openrouter') {
        const pConfig = this.config.providers.openrouter || {};
        const keys = (pConfig.keys || []).filter(k => k && k.key && k.key.trim() && k.active !== false);

        if (keys.length === 0) {
          console.warn('[AIRouter] OpenRouter has no active API keys, trying next provider...');
          errors.push('OpenRouter: Không có API key nào được cấu hình');
          continue;
        }

        let anyKeySucceeded = false;
        for (let attempt = 0; attempt < Math.min(keys.length, 3); attempt++) {
          const keyObj = this.selectKeyRoundRobin('openrouter');
          if (!keyObj) break;

          try {
            const buffer = await this._callOpenRouterImage(keyObj.key, prompt, pConfig, width, height);
            this.recordKeySuccess(keyObj);
            anyKeySucceeded = true;
            return {
              buffer,
              provider: 'openrouter',
              keyUsed: keyObj.label,
              model: pConfig.imageModel || pConfig.model
            };
          } catch (err) {
            console.error(`[AIRouter] OpenRouter key ${keyObj.label} failed:`, err.message);
            this.handleKeyError(keyObj, err, 'openrouter');
            errors.push(`OpenRouter (${keyObj.label}): ${err.message}`);
          }
        }
        if (!anyKeySucceeded) {
          console.warn('[AIRouter] All OpenRouter keys failed or on cooldown, falling back to next provider...');
        }
      }

      // 3. Google Gemini
      if (provider === 'gemini') {
        const pConfig = this.config.providers.gemini || {};
        const keys = (pConfig.keys || []).filter(k => k && k.key && k.key.trim() && k.active !== false);

        if (keys.length > 0) {
          for (let attempt = 0; attempt < Math.min(keys.length, 3); attempt++) {
            const keyObj = this.selectKeyRoundRobin('gemini');
            if (!keyObj) break;

            try {
              const buffer = await this._callGeminiImage(keyObj.key, prompt, pConfig, width, height);
              this.recordKeySuccess(keyObj);
              return {
                buffer,
                provider: 'gemini',
                keyUsed: keyObj.label,
                model: pConfig.imageModel || pConfig.model
              };
            } catch (err) {
              console.error(`[AIRouter] Gemini key ${keyObj.label} failed:`, err.message);
              this.handleKeyError(keyObj, err, 'gemini');
              errors.push(`Gemini (${keyObj.label}): ${err.message}`);
            }
          }
        } else {
          errors.push('Gemini: Chưa cấu hình key');
        }
      }

      // 4. Custom OpenAI-compatible / Local router
      if (provider === 'custom') {
        const pConfig = this.config.providers.custom || {};
        const keys = (pConfig.keys || []).filter(k => k.active !== false);
        const keyObj = keys.length > 0 ? this.selectKeyRoundRobin('custom') : { key: '' };

        try {
          const buffer = await this._callOpenAiCompatibleImage(keyObj.key, prompt, pConfig, width, height);
          if (keyObj.key) this.recordKeySuccess(keyObj);
          return {
            buffer,
            provider: 'custom',
            keyUsed: keyObj.label || 'Custom',
            model: pConfig.imageModel
          };
        } catch (err) {
          if (keyObj.key) this.handleKeyError(keyObj, err, 'custom');
          errors.push(`Custom Router: ${err.message}`);
        }
      }

      // 5. Pollinations Fallback (Safe Node-level fetch, bypasses browser CORS/403)
      if (provider === 'pollinations') {
        try {
          console.log('[AIRouter] Falling back to Pollinations FLUX Engine (Node-level with safe headers)...');
          const buffer = await this._callPollinationsSafe(prompt, width, height);
          return {
            buffer,
            provider: 'pollinations',
            keyUsed: 'Free Public Engine',
            model: 'flux'
          };
        } catch (err) {
          errors.push(`Pollinations: ${err.message}`);
        }
      }
    }

    throw new Error(`Tất cả các nguồn AI đều thất bại:\n${errors.join('\n')}`);
  }

  /**
   * OmniRouter Image Generator (POST /v1/images/generations)
   */
  async _callOmniRouterImage(apiKey, prompt, config, width, height) {
    const baseUrl = (config.baseUrl || 'http://139.99.89.215:20128/v1').replace(/\/+$/, '');
    const model = config.imageModel || 'nvidia/black-forest-labs/flux.1-schnell';
    const endpoint = `${baseUrl}/images/generations`;

    console.log(`[AIRouter] OmniRouter Request: model=${model} at ${endpoint}`);

    // Snap to valid FLUX sizes (768, 832, 896, 960, 1024, etc.)
    const validSizes = [768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280];
    const snapToValid = (val) => validSizes.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev, 768);
    const validW = snapToValid(width || 768);
    const validH = snapToValid(height || 768);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35s max timeout for GPU

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          width: validW,
          height: validH,
          n: 1
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`OmniRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const item = data.data && data.data[0];
      if (item) {
        if (item.b64_json) {
          return Buffer.from(item.b64_json, 'base64');
        }
        if (item.url) {
          const imgRes = await fetch(item.url);
          if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
        }
      }
      throw new Error('OmniRouter không trả về dữ liệu ảnh');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * OpenRouter Image Generator (POST /v1/chat/completions with image response)
   */
  async _callOpenRouterImage(apiKey, prompt, config, width, height) {
    const baseUrl = (config.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    const model = config.imageModel || 'black-forest-labs/flux-schnell';
    const endpoint = `${baseUrl}/chat/completions`;

    console.log(`[AIRouter] OpenRouter Request: model=${model} at ${endpoint}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://photocraft.local',
          'X-Title': 'PhotoCraft AI'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: `Generate a high-quality visual artwork based on: ${prompt}. Return the image.`
            }
          ],
          response_format: { type: 'image' }
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const choice = data.choices && data.choices[0];
      if (!choice) throw new Error('OpenRouter response contains no choices');

      const msg = choice.message;
      if (typeof msg.content === 'string') {
        if (msg.content.startsWith('data:image')) {
          const base64Part = msg.content.replace(/^data:image\/\w+;base64,/, '');
          return Buffer.from(base64Part, 'base64');
        }
        if (/^[A-Za-z0-9+/=]+$/.test(msg.content.slice(0, 100)) && msg.content.length > 500) {
          return Buffer.from(msg.content, 'base64');
        }
        const urlMatch = msg.content.match(/https?:\/\/[^\s"'\]\)]+\.(png|jpg|jpeg|webp)/i);
        if (urlMatch) {
          const imgRes = await fetch(urlMatch[0]);
          if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
        }
      }

      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'image_url' && part.image_url && part.image_url.url) {
            const u = part.image_url.url;
            if (u.startsWith('data:image')) {
              return Buffer.from(u.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            }
            const imgRes = await fetch(u);
            if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
          }
          if (part.type === 'image' && part.source && part.source.data) {
            return Buffer.from(part.source.data, 'base64');
          }
        }
      }

      throw new Error('Không tìm thấy dữ liệu ảnh từ kết quả OpenRouter');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Gemini Imagen / Content API
   */
  async _callGeminiImage(apiKey, prompt, config, width, height) {
    const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    const model = config.imageModel || 'gemini-2.5-flash-image';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      // 1. Multimodal generateContent with responseModalities (gemini-2.5-flash-image, etc.)
      if (model.includes('gemini') || model.includes('flash-image') || model.includes('image-preview')) {
        const endpoint = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate a high quality visual illustration: ${prompt}` }] }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
          }),
          signal: controller.signal
        });

        if (res.ok) {
          const data = await res.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              return Buffer.from(part.inlineData.data, 'base64');
            }
          }
        } else {
          const errText = await res.text();
          const err = new Error(`Gemini GenerateContent HTTP ${res.status}: ${errText.slice(0, 150)}`);
          err.status = res.status;
          throw err;
        }
      }

      // 2. Imagen generateImages API (imagen-*)
      const endpoint = `${baseUrl}/models/${model}:generateImages?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: width >= height ? '1:1' : '9:16',
            outputOptions: { mimeType: 'image/png' }
          }
        }),
        signal: controller.signal
      });

      if (res.ok) {
        const data = await res.json();
        const b64 = data.generatedImages?.[0]?.image?.imageBytes;
        if (b64) return Buffer.from(b64, 'base64');
      } else {
        const errText = await res.text();
        const err = new Error(`Gemini Imagen HTTP ${res.status}: ${errText.slice(0, 150)}`);
        err.status = res.status;
        throw err;
      }

      throw new Error('Gemini không trả về ảnh nhúng');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * OpenAI / DALL-E / Custom Image API
   */
  async _callOpenAiCompatibleImage(apiKey, prompt, config, width, height) {
    const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = config.imageModel || 'dall-e-3';
    const endpoint = `${baseUrl}/images/generations`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: `${width}x${height}`,
          response_format: 'b64_json'
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = new Error(`Custom AI HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const item = data.data && data.data[0];
      if (item && item.b64_json) {
        return Buffer.from(item.b64_json, 'base64');
      }
      if (item && item.url) {
        const imgRes = await fetch(item.url);
        if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
      }

      throw new Error('Không nhận được dữ liệu ảnh từ Custom Router');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Pollinations Safe Fetch with Proper Browser Headers
   */
  async _callPollinationsSafe(prompt, width, height) {
    const seed = Math.floor(Math.random() * 10000000);
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Pollinations Safe Engine HTTP ${res.status}`);
      }

      return Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = new AIRouter();
