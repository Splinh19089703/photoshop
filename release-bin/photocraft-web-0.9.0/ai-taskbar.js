/**
 * PhotoCraft Contextual AI Taskbar (Adobe Photoshop 2024 Parity)
 * With OmniRouter / OpenRouter, Google Gemini, and Key Rotation (SPLSEO Pattern)
 */

(function () {
  console.log('[PhotoCraft AI] Initializing Photoshop Contextual AI Taskbar with AIRouter...');

  // 1. Top Quick Toggle Badge in Header
  const topBadge = document.createElement('div');
  topBadge.className = 'ai-top-badge';
  topBadge.id = 'aiTopBadge';
  topBadge.innerHTML = `<span class="ai-sparkle">✨</span><span>AI Tools</span>`;
  topBadge.title = 'Bật / Tắt Thanh AI Contextual Taskbar';
  document.body.appendChild(topBadge);

  // 2. Create Floating Taskbar Elements
  const container = document.createElement('div');
  container.className = 'ai-taskbar-wrapper';
  container.id = 'aiTaskbarWrapper';

  container.innerHTML = `
    <!-- Preset Prompt Chips (Collapsible) -->
    <div class="ai-chips-popup ai-hidden" id="aiChipsPopup">
      <span style="color:#71717a; font-weight:700;">Gợi ý:</span>
      <button class="ai-mini-chip" data-p="A glowing magical lotus floating on dark water, bioluminescent, 8k cinematic">🪷 Hoa sen phát sáng</button>
      <button class="ai-mini-chip" data-p="Sleek modern cyberpunk supercar, neon reflections, 8k hyperrealistic">🏎️ Siêu xe neon</button>
      <button class="ai-mini-chip" data-p="A cute golden retriever puppy sitting gracefully on a velvet couch, studio light, 8k">🐶 Chú chó nhỏ</button>
      <button class="ai-mini-chip" data-p="Fluffy cinematic cumulus clouds with golden sunset rays, volumetric light">☁️ Mây hoàng hôn</button>
    </div>

    <!-- Main Contextual Taskbar -->
    <div class="ai-taskbar" id="aiTaskbar">
      <div class="ai-drag-handle" title="Kéo để di chuyển">⋮⋮</div>
      
      <div class="ai-brand-badge">
        <span class="ai-sparkle">✨</span>
        <span>Photoshop AI</span>
      </div>

      <span class="ai-status-pill" id="aiStatusPill" title="Nhà cung cấp AI đang kích hoạt">OmniRouter</span>

      <div class="ai-divider"></div>

      <!-- Main Action Buttons -->
      <div class="ai-main-actions" id="aiMainActions">
        <!-- Button Generative Fill -->
        <button class="ai-btn primary" id="btnGenFill" title="Vẽ thêm vật thể vào vùng chọn">
          <span>🪄 Generative Fill</span>
        </button>

        <!-- Button Remove Background -->
        <button class="ai-btn" id="btnRemoveBg" title="Tách nền vật thể tự động">
          <span>✂️ Tách Nền</span>
        </button>

        <!-- Button Text to Image -->
        <button class="ai-btn" id="btnText2Img" title="Sinh ảnh mới từ văn bản">
          <span>🎨 Sinh Ảnh</span>
        </button>

        <!-- Button AI Copilot -->
        <button class="ai-btn" id="btnCopilot" title="Trợ lý tự động căn chỉnh màu & ánh sáng">
          <span>🤖 Trợ Lý Copilot</span>
        </button>

        <!-- Button Settings -->
        <button class="ai-btn" id="btnOpenSettings" title="Cài đặt API & Xoay Key (OmniRouter / Gemini)">
          <span>⚙️ Cài Đặt API</span>
        </button>
      </div>

      <!-- Inline Prompt Bar (Shown during Generative Fill / Text to Image) -->
      <div class="ai-prompt-box ai-hidden" id="aiPromptBox">
        <input type="text" class="ai-prompt-input" id="aiPromptInput" placeholder="Mô tả đối tượng bạn muốn AI vẽ thêm..." />
        <button class="ai-btn primary" id="btnDoGenerate">
          <span id="genBtnText">Tạo Ngay</span>
        </button>
        <button class="ai-btn" id="btnClosePrompt" title="Hủy bỏ">✕</button>
      </div>
    </div>
  `;

  // 3. Result Preview Card (Floating above taskbar)
  const resultCard = document.createElement('div');
  resultCard.className = 'ai-result-card ai-hidden';
  resultCard.id = 'aiResultCard';
  resultCard.innerHTML = `
    <img class="ai-result-thumb" id="aiResultThumb" src="" alt="AI Output" draggable="true" title="Kéo và thả trực tiếp vào Canvas PhotoCraft để chèn Layer" />
    <div class="ai-result-info">
      <div class="ai-result-title">✨ AI Đã Vẽ Xong!</div>
      <div class="ai-result-hint" id="aiResultHint">Ảnh đã được chép sẵn vào Clipboard. Bạn chỉ cần nhấn <b>Ctrl + V</b> trên bàn phím để dán vào Canvas, hoặc kéo thả ảnh sang.</div>
      <div class="ai-result-actions">
        <button class="ai-btn-action" id="btnCopyAgain">📋 Copy lại (Ctrl+V)</button>
        <button class="ai-btn-action" style="background:#4b5563;" id="btnDownload">💾 Tải về máy</button>
      </div>
    </div>
    <button class="ai-btn-close" id="btnCloseResult" title="Đóng">✕</button>
  `;

  // 4. AI Copilot Drawer (Floating on right side)
  const copilotDrawer = document.createElement('div');
  copilotDrawer.className = 'ai-copilot-drawer ai-hidden';
  copilotDrawer.id = 'aiCopilotDrawer';
  copilotDrawer.innerHTML = `
    <div class="ai-copilot-header">
      <h4>🤖 Trợ Lý Photoshop AI</h4>
      <button class="ai-btn-close" id="btnCloseCopilot" title="Đóng">✕</button>
    </div>
    <div class="ai-copilot-body">
      <p style="font-size:11px; color:#a1a1aa; margin:0 0 4px 0;">Nhấp để tự động điều chỉnh ánh sáng, màu sắc và độ nét của ảnh:</p>
      <button class="ai-quick-btn" data-cmd="Tăng tương phản và chiều sâu màu">⚡ Tăng Tương Phản (Curves)</button>
      <button class="ai-quick-btn" data-cmd="Tăng độ rực rỡ và tươi tắn">🌈 Tăng Rực Màu (Vibrance)</button>
      <button class="ai-quick-btn" data-cmd="Áp dụng tone màu ấm hoàng hôn">🌅 Tone Màu Ấm (Warm Filter)</button>
      <button class="ai-quick-btn" data-cmd="Làm sắc nét từng chi tiết ảnh">🔍 Làm Nét Chi Tiết (Unsharp Mask)</button>
      <button class="ai-quick-btn" data-cmd="Chuyển sang ảnh đen trắng tương phản cao">🖤 Đen Trắng Cổ Điển</button>
      <button class="ai-quick-btn" data-cmd="Làm mờ xóa phông">🌫️ Xóa Phông Mờ Ảo</button>
      
      <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
        <input type="text" id="copilotCustomInput" placeholder="Yêu cầu khác bằng tiếng Việt..." style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.4); border:1px solid #3f3f46; color:#fff; border-radius:6px; padding:6px 10px; font-size:12px; margin-bottom:8px; outline:none;" />
        <button class="ai-btn primary" id="btnSendCopilotCustom" style="width:100%; justify-content:center;">Áp Dụng Lệnh</button>
      </div>
      <div id="copilotStatusMsg" style="font-size:11px; color:#38bdf8; min-height:16px;"></div>
    </div>
  `;

  // 5. Settings Modal (OmniRouter, Gemini, Key Rotation)
  const settingsModal = document.createElement('div');
  settingsModal.className = 'ai-modal-backdrop ai-hidden';
  settingsModal.id = 'aiSettingsModal';
  settingsModal.innerHTML = `
    <div class="ai-modal">
      <div class="ai-modal-header">
        <h3>⚙️ Cấu Hình AI Router & Xoay Key (Chuẩn SPLSEO)</h3>
        <button class="ai-btn-close" id="btnCloseSettings">✕</button>
      </div>
      <div class="ai-modal-body">
        <!-- Provider Selection -->
        <div class="ai-form-group">
          <label class="ai-form-label">
            <span>Nhà Cung Cấp AI (Provider)</span>
            <span style="color:#c084fc;">Đang chọn: <b id="lblCurrentProvider">OmniRouter</b></span>
          </label>
          <select class="ai-form-select" id="selAiProvider">
            <option value="omnirouter">🚀 OmniRouter Hệ Thống (SPLSEO 139.99.89.215)</option>
            <option value="openrouter">🌐 OpenRouter Official (openrouter.ai)</option>
            <option value="gemini">💎 Google Gemini (Đã có sẵn Key SPLSEO)</option>
            <option value="pollinations">🎁 Pollinations FLUX (Miễn phí 100% - Không cần key)</option>
            <option value="custom">🛠️ Custom Router / OpenAI Proxy</option>
          </select>
        </div>

        <!-- Base URL -->
        <div class="ai-form-group" id="grpBaseUrl">
          <label class="ai-form-label">
            <span>API Base URL</span>
            <span style="font-size:10px; color:#71717a;">Mặc định hoặc proxy OmniRouter riêng</span>
          </label>
          <input type="text" class="ai-form-input" id="txtBaseUrl" placeholder="http://139.99.89.215:20128/v1" />
        </div>

        <!-- Image Model -->
        <div class="ai-form-group" id="grpImageModel">
          <label class="ai-form-label">
            <span>Mô Hình Tạo Ảnh (Image Model)</span>
            <span style="font-size:10px; color:#71717a;">Nhấp chọn nhanh hoặc tự gõ</span>
          </label>
          <input type="text" class="ai-form-input" id="txtImageModel" placeholder="nvidia/black-forest-labs/flux.1-schnell" />
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
            <button type="button" class="ai-mini-chip chip-model" data-m="nvidia/black-forest-labs/flux.1-schnell">Omni FLUX (Khuyên dùng)</button>
            <button type="button" class="ai-mini-chip chip-model" data-m="black-forest-labs/flux-schnell">OpenRouter FLUX</button>
            <button type="button" class="ai-mini-chip chip-model" data-m="stabilityai/stable-diffusion-xl-base-1.0">SDXL</button>
            <button type="button" class="ai-mini-chip chip-model" data-m="gemini-2.5-flash-image">Gemini Flash Image</button>
            <button type="button" class="ai-mini-chip chip-model" data-m="dall-e-3">DALL-E 3</button>
          </div>
        </div>

        <!-- Keys Management with Rotation -->
        <div class="ai-form-group">
          <label class="ai-form-label">
            <span>Danh Sách API Keys (Tự động xoay tua Round-Robin)</span>
            <span id="lblKeyCount" style="color:#4ade80; font-size:11px;">0 keys đang hoạt động</span>
          </label>
          
          <div class="ai-key-list" id="aiKeyListContainer">
            <!-- Populated dynamically -->
          </div>

          <div style="margin-top:8px;">
            <textarea class="ai-form-textarea" id="txtNewKeys" rows="2" placeholder="Dán API Keys vào đây (mỗi key 1 dòng hoặc cách nhau bằng dấu phẩy) để tự động xoay tua..."></textarea>
            <button type="button" class="ai-btn primary" id="btnAddKeys" style="margin-top:6px; width:100%; justify-content:center;">
              <span>+ Thêm Keys Vào Danh Sách Xoay</span>
            </button>
          </div>
        </div>

        <!-- Fallback Info -->
        <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); border-radius:8px; padding:10px 12px; font-size:11px; color:#93c5fd; line-height:1.4;">
          💡 <b>Cơ chế Xoay Key & Fallback:</b> Hệ thống tự động xoay Round-Robin giữa các API Key đang bật. Nếu 1 key gặp lỗi Rate Limit (429) hoặc Hết Quota (401/403), hệ thống tự động đánh dấu nghỉ (cooldown) và chuyển sang key tiếp theo ngay lập tức!
        </div>
      </div>

      <div class="ai-modal-footer">
        <button class="ai-btn" id="btnCancelSettings">Đóng</button>
        <button class="ai-btn primary" id="btnSaveSettings">💾 Lưu Cài Đặt</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  document.body.appendChild(resultCard);
  document.body.appendChild(copilotDrawer);
  document.body.appendChild(settingsModal);

  // -------------------------------------------------------------------------
  // State & Config Management
  // -------------------------------------------------------------------------
  let currentAiConfig = null;

  async function loadAiConfig() {
    try {
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        currentAiConfig = await res.json();
        updateTaskbarStatusPill();
      }
    } catch (e) {
      console.warn('[PhotoCraft AI] Could not load AI config:', e.message);
    }
  }

  function updateTaskbarStatusPill() {
    if (!currentAiConfig) return;
    const pill = document.getElementById('aiStatusPill');
    const p = currentAiConfig.activeProvider;
    const pData = currentAiConfig.providers[p];
    const keyCount = (pData && pData.keys) ? pData.keys.filter(k => k.active).length : 0;
    
    let label = 'OmniRouter';
    if (p === 'openrouter') label = 'OpenRouter';
    else if (p === 'gemini') label = 'Gemini';
    else if (p === 'custom') label = 'Custom';
    else if (p === 'pollinations') label = 'Free FLUX';

    pill.textContent = keyCount > 1 ? `${label} (${keyCount} keys xoay)` : label;
    pill.title = `Nhà cung cấp: ${label} | Model: ${pData?.imageModel || 'Default'}`;
  }

  function renderSettingsModal() {
    if (!currentAiConfig) return;
    const sel = document.getElementById('selAiProvider');
    const txtBaseUrl = document.getElementById('txtBaseUrl');
    const txtImageModel = document.getElementById('txtImageModel');
    const lblProvider = document.getElementById('lblCurrentProvider');
    const keyList = document.getElementById('aiKeyListContainer');
    const lblKeyCount = document.getElementById('lblKeyCount');

    const curP = sel.value || currentAiConfig.activeProvider || 'omnirouter';
    sel.value = curP;
    lblProvider.textContent = sel.options[sel.selectedIndex].text;

    const pData = currentAiConfig.providers[curP] || {};
    txtBaseUrl.value = pData.baseUrl || '';
    txtImageModel.value = pData.imageModel || pData.model || '';

    const grpKeys = document.getElementById('txtNewKeys').parentElement;
    const grpBaseUrl = document.getElementById('grpBaseUrl');

    if (curP === 'pollinations') {
      grpBaseUrl.style.display = 'none';
      grpKeys.style.display = 'none';
      lblKeyCount.textContent = 'Miễn phí';
      keyList.innerHTML = `<div style="text-align:center; padding:16px; font-size:12px; color:#4ade80; background:rgba(74,222,128,0.06); border-radius:8px;">✨ Pollinations FLUX hoạt động trực tiếp qua Node.js an toàn, hoàn toàn miễn phí 100% và không cần cấu hình API Key!</div>`;
      return;
    } else {
      grpBaseUrl.style.display = 'block';
      grpKeys.style.display = 'block';
    }

    // Render keys
    const keys = pData.keys || [];
    const activeKeys = keys.filter(k => k.active);
    lblKeyCount.textContent = `${activeKeys.length}/${keys.length} keys đang bật`;

    if (keys.length === 0) {
      keyList.innerHTML = `<div style="text-align:center; padding:12px; font-size:12px; color:#71717a;">Chưa có API key nào cho ${sel.options[sel.selectedIndex].text}. Vui lòng dán key vào ô bên dưới.</div>`;
    } else {
      keyList.innerHTML = keys.map(k => {
        let badge = `<span class="ai-key-badge-active">🟢 Sẵn sàng</span>`;
        if (k.inCooldown) {
          badge = `<span class="ai-key-badge-cooldown">⏳ Nghỉ ${k.cooldownSeconds}s</span>`;
        } else if (!k.active) {
          badge = `<span class="ai-key-badge-err">⚪ Đang tắt</span>`;
        }

        return `
          <div class="ai-key-item" data-id="${k.id}">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <div style="font-weight:600; color:#fff;">${k.label} &bull; <code>${k.maskedKey}</code></div>
              <div style="font-size:10px; color:#a1a1aa;">Đã dùng: ${k.usage || 0} lần ${k.lastError ? `&bull; <span style="color:#f87171;">${k.lastError}</span>` : ''}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${badge}
              <button class="ai-btn btn-toggle-key" style="padding:2px 8px; font-size:11px;" data-id="${k.id}" data-active="${k.active}">${k.active ? 'Tắt' : 'Bật'}</button>
              <button class="ai-btn btn-del-key" style="padding:2px 8px; font-size:11px; color:#f87171;" data-id="${k.id}">Xóa</button>
            </div>
          </div>
        `;
      }).join('');

      // Wire up toggle and delete buttons
      keyList.querySelectorAll('.btn-toggle-key').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const keyId = btn.dataset.id;
          const newActive = btn.dataset.active !== 'true';
          const res = await fetch('/api/ai/keys/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: curP, keyId, active: newActive })
          });
          if (res.ok) {
            const data = await res.json();
            currentAiConfig = data.config;
            renderSettingsModal();
            updateTaskbarStatusPill();
          }
        });
      });

      keyList.querySelectorAll('.btn-del-key').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const keyId = btn.dataset.id;
          if (confirm('Bạn có chắc muốn xóa key này?')) {
            const res = await fetch('/api/ai/keys/remove', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: curP, keyId })
            });
            if (res.ok) {
              const data = await res.json();
              currentAiConfig = data.config;
              renderSettingsModal();
              updateTaskbarStatusPill();
            }
          }
        });
      });
    }
  }

  // -------------------------------------------------------------------------
  // Header Quick Toggle & Dragging
  // -------------------------------------------------------------------------
  topBadge.addEventListener('click', () => {
    container.classList.toggle('ai-hidden');
  });

  const dragHandle = container.querySelector('.ai-drag-handle');
  let isDragging = false, dragOffX = 0, dragOffY = 0;

  dragHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = container.getBoundingClientRect();
    dragOffX = e.clientX - rect.left;
    dragOffY = e.clientY - rect.top;
    container.style.transform = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    container.style.left = `${e.clientX - dragOffX}px`;
    container.style.top = `${e.clientY - dragOffY}px`;
    container.style.bottom = 'auto';
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  // -------------------------------------------------------------------------
  // UI Transitions & Action Handlers
  // -------------------------------------------------------------------------
  const mainActions = document.getElementById('aiMainActions');
  const promptBox = document.getElementById('aiPromptBox');
  const promptInput = document.getElementById('aiPromptInput');
  const chipsPopup = document.getElementById('aiChipsPopup');
  const btnDoGenerate = document.getElementById('btnDoGenerate');
  const genBtnText = document.getElementById('genBtnText');

  let activeMode = 'genfill';
  let latestImageBlob = null;

  function openPromptBar(mode, placeholderText) {
    activeMode = mode;
    promptInput.placeholder = placeholderText;
    mainActions.classList.add('ai-hidden');
    promptBox.classList.remove('ai-hidden');
    chipsPopup.classList.remove('ai-hidden');
    promptInput.focus();
  }

  function closePromptBar() {
    promptBox.classList.add('ai-hidden');
    chipsPopup.classList.add('ai-hidden');
    mainActions.classList.remove('ai-hidden');
  }

  document.getElementById('btnGenFill').addEventListener('click', () => {
    openPromptBar('genfill', 'Generative Fill: mô tả đối tượng cần vẽ thêm...');
  });

  document.getElementById('btnText2Img').addEventListener('click', () => {
    openPromptBar('text2img', 'Sinh ảnh AI: mô tả bức tranh bạn muốn tạo...');
  });

  document.getElementById('btnClosePrompt').addEventListener('click', closePromptBar);

  document.querySelectorAll('.ai-mini-chip[data-p]').forEach(btn => {
    btn.addEventListener('click', () => {
      promptInput.value = btn.dataset.p;
      promptInput.focus();
    });
  });

  // Settings Modal Triggers
  document.getElementById('btnOpenSettings').addEventListener('click', () => {
    settingsModal.classList.remove('ai-hidden');
    renderSettingsModal();
  });
  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    settingsModal.classList.add('ai-hidden');
  });
  document.getElementById('btnCancelSettings').addEventListener('click', () => {
    settingsModal.classList.add('ai-hidden');
  });

  document.getElementById('selAiProvider').addEventListener('change', () => {
    renderSettingsModal();
  });

  // Quick preset model chips in settings
  document.querySelectorAll('.chip-model').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('txtImageModel').value = chip.dataset.m;
    });
  });

  // Add keys button
  document.getElementById('btnAddKeys').addEventListener('click', async () => {
    const rawKeys = document.getElementById('txtNewKeys').value.trim();
    if (!rawKeys) return alert('Vui lòng dán ít nhất 1 API key.');

    const curP = document.getElementById('selAiProvider').value;
    try {
      const res = await fetch('/api/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: curP, keys: rawKeys })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('txtNewKeys').value = '';
        currentAiConfig = data.config;
        renderSettingsModal();
        updateTaskbarStatusPill();
        alert(`✅ Đã thêm ${data.addedCount} key mới vào danh sách xoay tua!`);
      } else {
        alert('Lỗi thêm key: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi mạng: ' + e.message);
    }
  });

  // Save Settings Button
  document.getElementById('btnSaveSettings').addEventListener('click', async () => {
    if (!currentAiConfig) return;
    const curP = document.getElementById('selAiProvider').value;
    const baseUrl = document.getElementById('txtBaseUrl').value.trim();
    const imageModel = document.getElementById('txtImageModel').value.trim();

    currentAiConfig.activeProvider = curP;
    if (currentAiConfig.providers[curP]) {
      if (baseUrl) currentAiConfig.providers[curP].baseUrl = baseUrl;
      if (imageModel) currentAiConfig.providers[curP].imageModel = imageModel;
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentAiConfig)
      });
      const data = await res.json();
      if (data.success) {
        currentAiConfig = data.config;
        updateTaskbarStatusPill();
        settingsModal.classList.add('ai-hidden');
        alert('✅ Đã lưu cấu hình AI Router thành công!');
      }
    } catch (e) {
      alert('Lỗi lưu cấu hình: ' + e.message);
    }
  });

  // Toggle Copilot
  document.getElementById('btnCopilot').addEventListener('click', () => {
    copilotDrawer.classList.toggle('ai-hidden');
  });
  document.getElementById('btnCloseCopilot').addEventListener('click', () => {
    copilotDrawer.classList.add('ai-hidden');
  });

  // -------------------------------------------------------------------------
  // AI Generation Execution (via AIRouter & Key Rotation)
  // -------------------------------------------------------------------------
  async function executeGeneration(prompt) {
    if (!prompt) {
      prompt = 'A glowing magical lotus floating on dark water, bioluminescent, 8k cinematic';
      promptInput.value = prompt;
    }

    genBtnText.innerHTML = '<span class="ai-spinner"></span> Đang tạo...';
    btnDoGenerate.disabled = true;

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: 768, height: 768, placeInDoc: false })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Convert returned base64 into Blob
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      latestImageBlob = blob;

      // 1. Copy directly to user's system clipboard for instant Ctrl+V
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          console.log('[PhotoCraft AI] Successfully copied image to clipboard!');
        } catch (clipErr) {
          console.warn('Clipboard write fallback:', clipErr);
        }
      }

      // 2. Display floating result card with Provider & Key Info
      const objectUrl = URL.createObjectURL(blob);
      const thumb = document.getElementById('aiResultThumb');
      thumb.src = objectUrl;
      
      const hint = document.getElementById('aiResultHint');
      hint.innerHTML = `Nguồn: <b>${data.provider.toUpperCase()}</b> &bull; Key: <b>${data.keyUsed}</b><br/>Ảnh đã chép vào Clipboard. Bấm <b>Ctrl + V</b> trên bàn phím để dán vào Canvas hoặc kéo ảnh sang!`;
      
      resultCard.classList.remove('ai-hidden');

      // 3. Setup drag and drop onto PhotoCraft canvas
      thumb.ondragstart = (ev) => {
        const file = new File([blob], 'ai_layer.png', { type: 'image/png' });
        ev.dataTransfer.setData('DownloadURL', `image/png:ai_layer.png:${objectUrl}`);
        try {
          ev.dataTransfer.items.add(file);
        } catch (e) {}
      };

    } catch (err) {
      alert(`⚠️ Lỗi tạo ảnh: ${err.message}\n\n👉 Bạn hãy bấm nút "⚙️ Cài Đặt API" trên thanh taskbar để kiểm tra key OmniRouter / Gemini hoặc chọn nhà cung cấp khác nhé!`);
    } finally {
      genBtnText.textContent = 'Tạo Ngay';
      btnDoGenerate.disabled = false;
      closePromptBar();
    }
  }

  btnDoGenerate.addEventListener('click', () => {
    executeGeneration(promptInput.value.trim());
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeGeneration(promptInput.value.trim());
    } else if (e.key === 'Escape') {
      closePromptBar();
    }
  });

  // Remove Background Action
  document.getElementById('btnRemoveBg').addEventListener('click', async () => {
    const btn = document.getElementById('btnRemoveBg');
    const origText = btn.innerHTML;
    btn.innerHTML = '<span class="ai-spinner"></span> Đang tách...';
    btn.disabled = true;

    try {
      openPromptBar('genfill', 'Tách nền AI: nhập mô tả chủ thể cần giữ lại...');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  });

  // Result Card Actions
  document.getElementById('btnCopyAgain').addEventListener('click', async () => {
    if (latestImageBlob) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': latestImageBlob })
        ]);
        alert('Đã chép vào Clipboard! Bạn hãy nhấp vào Canvas rồi nhấn Ctrl+V để dán.');
      } catch (e) {
        alert('Vui lòng cấp quyền Clipboard cho trình duyệt để copy.');
      }
    }
  });

  document.getElementById('btnDownload').addEventListener('click', () => {
    if (latestImageBlob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(latestImageBlob);
      a.download = `PhotoCraft_AI_${Date.now()}.png`;
      a.click();
    }
  });

  document.getElementById('btnCloseResult').addEventListener('click', () => {
    resultCard.classList.add('ai-hidden');
  });

  // Copilot Preset Execution
  const statusMsg = document.getElementById('copilotStatusMsg');
  async function runCopilotCommand(prompt) {
    statusMsg.textContent = `Đang xử lý: "${prompt}"...`;
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.success) {
        statusMsg.textContent = `✅ Đã áp dụng: ${data.executed.map(x => x.description).join(', ')}`;
      } else {
        statusMsg.textContent = `⚠️ Lỗi: ${data.error}`;
      }
    } catch (e) {
      statusMsg.textContent = `Lỗi kết nối AI Copilot: ${e.message}`;
    }
  }

  document.querySelectorAll('.ai-copilot-body .ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      runCopilotCommand(btn.dataset.cmd);
    });
  });

  document.getElementById('btnSendCopilotCustom').addEventListener('click', () => {
    const val = document.getElementById('copilotCustomInput').value.trim();
    if (val) {
      runCopilotCommand(val);
      document.getElementById('copilotCustomInput').value = '';
    }
  });

  // Initialize Config on Load
  loadAiConfig();
  console.log('[PhotoCraft AI] Contextual AI Taskbar with Key Rotation Ready!');
})();
