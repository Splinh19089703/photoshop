/**
 * PhotoCraft AI Studio Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statusDot = document.getElementById('statusDot');
  const docStatusText = document.getElementById('docStatusText');
  const canvasTitle = document.getElementById('canvasTitle');
  const previewImg = document.getElementById('previewImg');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const selectionBox = document.getElementById('selectionBox');
  const canvasLoader = document.getElementById('canvasLoader');
  const canvasLoaderText = document.getElementById('canvasLoaderText');
  const toast = document.getElementById('toast');

  // Coordinates
  const fillX = document.getElementById('fillX');
  const fillY = document.getElementById('fillY');
  const fillW = document.getElementById('fillW');
  const fillH = document.getElementById('fillH');

  let currentDocMeta = { width: 1024, height: 768, name: 'Untitled' };
  let isSelecting = false;
  let startX = 0, startY = 0;
  let selectedStyle = 'photorealistic';

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.borderColor = isError ? '#ef4444' : '#10b981';
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  function showLoader(text = 'Đang xử lý AI...') {
    canvasLoaderText.textContent = text;
    canvasLoader.classList.remove('hidden');
  }

  function hideLoader() {
    canvasLoader.classList.add('hidden');
  }

  // -------------------------------------------------------------------------
  // Status & Canvas Refresh
  // -------------------------------------------------------------------------
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (data.connected) {
        statusDot.className = 'status-dot connected';
        if (data.activeDoc) {
          currentDocMeta = data.activeDoc;
          docStatusText.textContent = `${data.activeDoc.name || 'PhotoCraft Canvas'} (${data.activeDoc.width}×${data.activeDoc.height}) - ${data.activeDoc.layers ? data.activeDoc.layers.length : 1} Layers`;
          canvasTitle.textContent = `${data.activeDoc.name} (${data.activeDoc.width} × ${data.activeDoc.height} px)`;
        } else {
          docStatusText.textContent = 'PhotoCraft Engine Đã Sẵn Sàng (Chưa mở file)';
        }
      } else {
        statusDot.className = 'status-dot';
        docStatusText.textContent = 'Mất kết nối với PhotoCraft Engine';
      }
    } catch (e) {
      statusDot.className = 'status-dot';
      docStatusText.textContent = 'Không kết nối được Server';
    }
  }

  async function refreshCanvasPreview() {
    try {
      const res = await fetch('/api/preview');
      const data = await res.json();
      if (data.success && data.base64) {
        previewImg.src = `data:${data.mime || 'image/png'};base64,${data.base64}`;
      }
    } catch (e) {
      console.warn('Preview fetch error:', e.message);
    }
  }

  // Initial load
  fetchStatus();
  refreshCanvasPreview();
  setInterval(fetchStatus, 4000);

  document.getElementById('btnRefresh').addEventListener('click', () => {
    fetchStatus();
    refreshCanvasPreview();
    showToast('Đã làm mới Canvas!');
  });

  // -------------------------------------------------------------------------
  // Interactive Selection Box for Generative Fill
  // -------------------------------------------------------------------------
  previewImg.addEventListener('mousedown', (e) => {
    const rect = previewImg.getBoundingClientRect();
    const scaleX = currentDocMeta.width / rect.width;
    const scaleY = currentDocMeta.height / rect.height;

    startX = (e.clientX - rect.left) * scaleX;
    startY = (e.clientY - rect.top) * scaleY;
    isSelecting = true;

    selectionBox.classList.remove('hidden');
    updateSelectionVisual(e.clientX - rect.left, e.clientY - rect.top, 0, 0);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    const rect = previewImg.getBoundingClientRect();
    const scaleX = currentDocMeta.width / rect.width;
    const scaleY = currentDocMeta.height / rect.height;

    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const curDocX = currentX * scaleX;
    const curDocY = currentY * scaleY;

    const docX = Math.round(Math.min(startX, curDocX));
    const docY = Math.round(Math.min(startY, curDocY));
    const docW = Math.round(Math.abs(curDocX - startX));
    const docH = Math.round(Math.abs(curDocY - startY));

    // Update visual box in CSS pixels
    const visX = Math.min((startX / scaleX), currentX);
    const visY = Math.min((startY / scaleY), currentY);
    const visW = Math.abs(currentX - (startX / scaleX));
    const visH = Math.abs(currentY - (startY / scaleY));

    updateSelectionVisual(visX, visY, visW, visH);

    // Update input boxes
    fillX.value = docX;
    fillY.value = docY;
    fillW.value = Math.max(32, docW);
    fillH.value = Math.max(32, docH);
  });

  window.addEventListener('mouseup', () => {
    if (isSelecting) {
      isSelecting = false;
    }
  });

  function updateSelectionVisual(left, top, width, height) {
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  document.getElementById('btnSelectAll').addEventListener('click', () => {
    fillX.value = 0;
    fillY.value = 0;
    fillW.value = currentDocMeta.width;
    fillH.value = currentDocMeta.height;
    selectionBox.classList.remove('hidden');
    selectionBox.style.left = '0px';
    selectionBox.style.top = '0px';
    selectionBox.style.width = '100%';
    selectionBox.style.height = '100%';
    showToast('Đã chọn toàn bộ khung ảnh');
  });

  // Preset chips
  document.querySelectorAll('.preset-chips .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('chip-t2i')) {
        document.getElementById('t2iPrompt').value = btn.dataset.prompt;
        showToast('Đã chọn mẫu prompt!');
      } else {
        document.getElementById('fillPrompt').value = btn.dataset.prompt;
      }
    });
  });

  // -------------------------------------------------------------------------
  // Tabs Navigation
  // -------------------------------------------------------------------------
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // -------------------------------------------------------------------------
  // Action 1: Generative Fill (Inpainting)
  // -------------------------------------------------------------------------
  document.getElementById('btnExecuteFill').addEventListener('click', async () => {
    const prompt = document.getElementById('fillPrompt').value.trim();
    if (!prompt) {
      return showToast('Vui lòng nhập mô tả (Prompt) để AI điền hình!', true);
    }

    const x = parseInt(fillX.value, 10);
    const y = parseInt(fillY.value, 10);
    const w = parseInt(fillW.value, 10);
    const h = parseInt(fillH.value, 10);

    showLoader(`Đang tạo Generative Fill: "${prompt.slice(0, 30)}..."`);
    try {
      const res = await fetch('/api/generative-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          targetX: x,
          targetY: y,
          targetWidth: w,
          targetHeight: h
        })
      });
      const data = await res.json();
      hideLoader();

      if (data.success) {
        showToast('✨ Đã điền AI thành công vào PhotoCraft!');
        selectionBox.classList.add('hidden');
        await refreshCanvasPreview();
      } else {
        showToast(`Lỗi: ${data.error}`, true);
      }
    } catch (err) {
      hideLoader();
      showToast(`Lỗi kết nối: ${err.message}`, true);
    }
  });

  // -------------------------------------------------------------------------
  // Action 2: Remove Background (AI Cutout)
  // -------------------------------------------------------------------------
  document.getElementById('btnExecuteRemoveBg').addEventListener('click', async () => {
    showLoader('Đang phân tích và tách nền trong suốt...');
    try {
      const res = await fetch('/api/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      hideLoader();

      if (data.success) {
        showToast('✂️ Đã tách nền thành công! Đã chèn layer trong suốt.');
        await refreshCanvasPreview();
      } else {
        showToast(`Lỗi tách nền: ${data.error}`, true);
      }
    } catch (err) {
      hideLoader();
      showToast(`Lỗi kết nối: ${err.message}`, true);
    }
  });

  // -------------------------------------------------------------------------
  // Action 3: Generative Expand
  // -------------------------------------------------------------------------
  document.getElementById('btnExecuteExpand').addEventListener('click', async () => {
    const expandMargin = parseInt(document.querySelector('input[name="expandSize"]:checked').value, 10);
    const direction = document.getElementById('expandDirection').value;
    const prompt = document.getElementById('expandPrompt').value;

    showLoader(`Đang mở rộng canvas (+${expandMargin}px) & vẽ bối cảnh AI...`);
    try {
      const res = await fetch('/api/generative-expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expandMargin, direction, prompt })
      });
      const data = await res.json();
      hideLoader();

      if (data.success) {
        showToast(`🌅 Đã mở rộng canvas thành [${data.newDimensions[0]}x${data.newDimensions[1]}]!`);
        await fetchStatus();
        await refreshCanvasPreview();
      } else {
        showToast(`Lỗi mở rộng: ${data.error}`, true);
      }
    } catch (err) {
      hideLoader();
      showToast(`Lỗi kết nối: ${err.message}`, true);
    }
  });

  // -------------------------------------------------------------------------
  // Action 4: Text-to-Image
  // -------------------------------------------------------------------------
  document.querySelectorAll('.style-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.style-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedStyle = card.dataset.style;
    });
  });

  document.getElementById('btnExecuteText2Img').addEventListener('click', async () => {
    let prompt = document.getElementById('t2iPrompt').value.trim();
    if (!prompt) {
      prompt = 'A majestic cyberpunk samurai standing in neon rain, cinematic lighting, ultra-detailed 8k';
      document.getElementById('t2iPrompt').value = prompt;
    }

    const ratio = document.querySelector('input[name="t2iRatio"]:checked').value.split('x');
    const width = parseInt(ratio[0], 10);
    const height = parseInt(ratio[1], 10);

    const styleModifiers = {
      photorealistic: '8k photo, ultra-detailed, photorealistic, professional lighting, sharp focus',
      cinematic: 'cinematic still, 35mm film photograph, dramatic lighting, depth of field',
      anime: 'masterpiece anime artwork, vibrant colors, makoto shinkai aesthetic',
      '3d-render': 'octane render 3d artwork, raytracing, unreal engine 5, clean topology'
    };

    const finalPrompt = `${prompt}, ${styleModifiers[selectedStyle] || ''}`;

    showLoader('Đang tạo ảnh bằng mô hình FLUX AI...');
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, width, height, placeInDoc: true })
      });
      const data = await res.json();
      hideLoader();

      if (data.success) {
        showToast('🎨 Đã sinh ảnh và đưa vào PhotoCraft thành công!');
        await refreshCanvasPreview();
      } else {
        showToast(`Lỗi sinh ảnh: ${data.error}`, true);
      }
    } catch (err) {
      hideLoader();
      showToast(`Lỗi kết nối: ${err.message}`, true);
    }
  });

  // -------------------------------------------------------------------------
  // Action 5: AI Copilot
  // -------------------------------------------------------------------------
  const copilotLog = document.getElementById('copilotLog');
  const copilotInput = document.getElementById('copilotInput');

  function addLog(text, type = 'info') {
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    copilotLog.appendChild(item);
    copilotLog.scrollTop = copilotLog.scrollHeight;
  }

  async function sendCopilot(prompt) {
    if (!prompt) return;
    addLog(`Yêu cầu: "${prompt}"`, 'info');
    showLoader(`AI Copilot đang xử lý: "${prompt}"...`);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      hideLoader();

      if (data.success && data.executed) {
        data.executed.forEach(step => {
          if (step.success) {
            addLog(`✅ Đã thực thi: ${step.description}`, 'success');
          } else {
            addLog(`⚠️ Lỗi ${step.command}: ${step.error}`, 'error');
          }
        });
        showToast('⚡ AI Copilot đã hoàn tất điều chỉnh!');
        await refreshCanvasPreview();
      } else {
        addLog(`❌ Thất bại: ${data.error}`, 'error');
      }
    } catch (err) {
      hideLoader();
      addLog(`❌ Lỗi mạng: ${err.message}`, 'error');
    }
  }

  document.getElementById('btnCopilotSend').addEventListener('click', () => {
    const val = copilotInput.value.trim();
    if (val) {
      sendCopilot(val);
      copilotInput.value = '';
    }
  });

  copilotInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = copilotInput.value.trim();
      if (val) {
        sendCopilot(val);
        copilotInput.value = '';
      }
    }
  });

  document.querySelectorAll('.copilot-presets .btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      sendCopilot(btn.dataset.cmd);
    });
  });

  // -------------------------------------------------------------------------
  // Action 6: Settings (OmniRouter, Gemini, Key Rotation)
  // -------------------------------------------------------------------------
  let dashAiConfig = null;

  async function loadDashboardAiConfig() {
    try {
      const res = await fetch('/api/ai/config');
      if (res.ok) {
        dashAiConfig = await res.json();
        renderDashboardSettings();
      }
    } catch (e) {
      console.warn('Could not load AI config:', e);
    }
  }

  function renderDashboardSettings() {
    if (!dashAiConfig) return;
    const sel = document.getElementById('selDashboardProvider');
    const txtBaseUrl = document.getElementById('txtDashBaseUrl');
    const txtImageModel = document.getElementById('txtDashImageModel');
    const keyContainer = document.getElementById('dashKeyList');

    const curP = sel.value || dashAiConfig.activeProvider || 'omnirouter';
    sel.value = curP;

    const pData = dashAiConfig.providers[curP] || {};
    txtBaseUrl.value = pData.baseUrl || '';
    txtImageModel.value = pData.imageModel || pData.model || '';

    const grpKeys = document.getElementById('txtDashNewKeys').parentElement;
    const grpBaseUrl = document.getElementById('grpDashBaseUrl');

    if (curP === 'pollinations') {
      grpBaseUrl.style.display = 'none';
      grpKeys.style.display = 'none';
      keyContainer.innerHTML = '<div style="color:#4ade80; text-align:center; padding:8px; font-size:12px;">✨ Pollinations FLUX Engine hoàn toàn miễn phí, không cần API Key!</div>';
      return;
    } else {
      grpBaseUrl.style.display = 'block';
      grpKeys.style.display = 'block';
    }

    const keys = pData.keys || [];
    if (keys.length === 0) {
      keyContainer.innerHTML = `<div style="color:#71717a; text-align:center; padding:6px;">Chưa có key nào cho ${sel.options[sel.selectedIndex].text}. Dán key vào ô dưới để thêm.</div>`;
    } else {
      keyContainer.innerHTML = keys.map(k => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px;">
          <div><b>${k.label}</b> <code>${k.maskedKey}</code> <span style="font-size:10px; color:${k.active ? '#4ade80' : '#f87171'};">${k.active ? '🟢 Bật' : '⚪ Tắt'}</span></div>
          <button class="btn btn-ghost btn-xs btn-del-dash-key" data-id="${k.id}" style="color:#f87171;">Xóa</button>
        </div>
      `).join('');

      keyContainer.querySelectorAll('.btn-del-dash-key').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Xóa key này?')) {
            const res = await fetch('/api/ai/keys/remove', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: curP, keyId: btn.dataset.id })
            });
            if (res.ok) {
              const d = await res.json();
              dashAiConfig = d.config;
              renderDashboardSettings();
            }
          }
        });
      });
    }
  }

  document.getElementById('selDashboardProvider').addEventListener('change', () => {
    renderDashboardSettings();
  });

  document.getElementById('btnAddDashKeys').addEventListener('click', async () => {
    const raw = document.getElementById('txtDashNewKeys').value.trim();
    if (!raw) return showToast('Vui lòng dán ít nhất 1 key.', true);
    const curP = document.getElementById('selDashboardProvider').value;

    const res = await fetch('/api/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: curP, keys: raw })
    });
    if (res.ok) {
      const d = await res.json();
      document.getElementById('txtDashNewKeys').value = '';
      dashAiConfig = d.config;
      renderDashboardSettings();
      showToast(`✅ Đã thêm ${d.addedCount} key mới vào danh sách xoay tua!`);
    }
  });

  document.getElementById('btnSaveSettings').addEventListener('click', async () => {
    if (!dashAiConfig) return;
    const curP = document.getElementById('selDashboardProvider').value;
    const baseUrl = document.getElementById('txtDashBaseUrl').value.trim();
    const imageModel = document.getElementById('txtDashImageModel').value.trim();

    dashAiConfig.activeProvider = curP;
    if (dashAiConfig.providers[curP]) {
      if (baseUrl) dashAiConfig.providers[curP].baseUrl = baseUrl;
      if (imageModel) dashAiConfig.providers[curP].imageModel = imageModel;
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashAiConfig)
      });
      const data = await res.json();
      if (data.success) {
        dashAiConfig = data.config;
        showToast('✅ Đã lưu cấu hình AI Router & Xoay Key thành công!');
      }
    } catch (e) {
      showToast(`Lỗi lưu cài đặt: ${e.message}`, true);
    }
  });

  loadDashboardAiConfig();

  // -------------------------------------------------------------------------
  // Modals & Header Actions
  // -------------------------------------------------------------------------
  const newDocModal = document.getElementById('newDocModal');
  document.getElementById('btnNewDoc').addEventListener('click', () => {
    newDocModal.classList.remove('hidden');
  });
  document.getElementById('btnCancelNewDoc').addEventListener('click', () => {
    newDocModal.classList.add('hidden');
  });

  document.getElementById('btnConfirmNewDoc').addEventListener('click', async () => {
    const name = document.getElementById('newDocName').value || 'Artwork';
    const width = parseInt(document.getElementById('newDocW').value, 10) || 1024;
    const height = parseInt(document.getElementById('newDocH').value, 10) || 768;
    const background = document.getElementById('newDocBg').value;

    showLoader('Đang tạo tài liệu mới...');
    try {
      const res = await fetch('/api/new-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, width, height, background })
      });
      const data = await res.json();
      hideLoader();
      newDocModal.classList.add('hidden');

      if (data.success) {
        showToast(`✨ Đã tạo tài liệu "${name}" (${width}×${height})`);
        await fetchStatus();
        await refreshCanvasPreview();
      }
    } catch (err) {
      hideLoader();
      showToast(`Lỗi tạo: ${err.message}`, true);
    }
  });

  // Launch Full Web Editor (Wasm Photoshop)
  document.getElementById('btnLaunchEditor')?.addEventListener('click', () => {
    window.open('/editor/', '_blank');
    showToast('🚀 Đang mở giao diện PhotoCraft Web Editor trên tab mới...');
  });

  // Launch Desktop GUI
  document.getElementById('btnLaunchDesktop')?.addEventListener('click', async () => {
    try {
      await fetch('/api/launch-desktop', { method: 'POST' });
      showToast('🚀 Đang khởi động photocraft.exe (hoặc bạn có thể nhấp đúp file start-desktop.bat)');
    } catch (e) {
      showToast('Không thể mở PhotoCraft GUI', true);
    }
  });

  // Export PSD/PNG
  document.getElementById('btnExport').addEventListener('click', async () => {
    showLoader('Đang xuất tệp PSD...');
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'psd', filename: `PhotoCraft_AI_${Date.now()}` })
      });
      const data = await res.json();
      hideLoader();
      if (data.success) {
        showToast(`💾 Đã xuất tệp: workspace/${data.savePath}`);
      }
    } catch (e) {
      hideLoader();
      showToast(`Lỗi xuất: ${e.message}`, true);
    }
  });
});
