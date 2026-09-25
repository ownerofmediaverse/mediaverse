/* ============================================================
   MEDIAVERSE AI DETECTION ENGINE v3.3  (FINAL FIXED)
   ------------------------------------------------
   Features:
     - Two-tier voting: 1 strong signal OR 2+ weak signals
     - Stock-image source whitelist (Unsplash, Pexels, etc.)
     - Skip text-only posts (unless Text Studio used)
     - Force cleanup of stale badges on boot
     - Detailed debug logging
     - Icon-only badge (no "AI Generated" text visible)
     - Full author name (no ellipsis)
     - Clean toast message (no pattern, no %)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MVAIDetector = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* =========================================================
     CONFIG
  ========================================================= */
  const CONFIG = {
    api: {
      provider: '',        // 'sightengine' | 'hive' | 'custom' | ''
      key: '',             // "USER_ID:SECRET"
      endpoint: '',
      minScore: 0.60,
      timeout: 12000,
      cacheTTL: 1000 * 60 * 60 * 24
    },

    thresholds: {
      strongSignal: 0.70,
      weakSignal: 0.80,
      minWeakVotes: 2,
      finalMin: 0.75
    },

    stockSources: [
      /unsplash\.com/i,
      /pexels\.com/i,
      /pixabay\.com/i,
      /pravatar\.cc/i,
      /cloudinary\.com/i,
      /imgur\.com/i,
      /giphy\.com/i,
      /tenor\.com/i,
      /wikimedia\.org/i,
      /githubusercontent\.com/i
    ],

    autoScan: true,
    badgeEnabled: true,
    consoleDebug: true,

    softwareTags: [
      'midjourney','dall·e','dall-e','dalle','openai',
      'stable diffusion','stablediffusion','sd-webui','automatic1111',
      'comfyui','invokeai','forge','fooocus','novelai','krea ai',
      'adobe firefly','firefly','generative fill','photoshop generative',
      'leonardo.ai','leonardo ai','playground ai','playgroundai',
      'nightcafe','dreamstudio','stability ai','sdxl','sd3','flux',
      'runwayml','runway ml','pika labs','kling ai','sora',
      'luma ai','dream machine','gen-2','gen-3',
      'bing image creator','microsoft designer','copilot design',
      'imagen','google imagen','ideogram','recraft'
    ],

    filenamePatterns: [
      /dall[-_ ]?e/i,
      /midjourney[-_ ]/i,
      /stable[-_ ]?diffusion/i,
      /sdxl[-_ ]/i,
      /comfyui[-_ ]/i,
      /firefly[-_ ]/i,
      /generated[-_ ]?(image|photo|art|video)/i,
      /ai[-_ ]?generated/i,
      /leonardo[-_ ]?ai/i,
      /nightcafe[-_ ]/i,
      /runwayml/i,
      /pika[-_ ]?labs/i,
      /kling[-_ ]?ai/i,
      /sora[-_ ]?video/i,
      /luma[-_ ]?ai/i,
      /flux[-_ ]?[0-9]/i
    ],

    urlPatterns: [
      /oaidalleapiprodscus/i,
      /replicate\.delivery/i,
      /stabilityai/i,
      /firefly\.adobe/i,
      /leonardo\.ai/i,
      /runway\.ml/i,
      /sora\.com/i,
      /pika\.art/i,
      /klingai/i,
      /lumalabs/i
    ]
  };

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    ready: false,
    cache: new Map(),
    apiCallsUsed: 0,
    apiCallsFailed: 0,
    stats: { total: 0, ai: 0, human: 0, stock: 0, empty: 0 }
  };

  /* =========================================================
     UTILITIES
  ========================================================= */
  function log(...args) {
    if (CONFIG.consoleDebug) console.log('%c[MV-AID]', 'color:#00e5ff;font-weight:bold;', ...args);
  }
  function warn(...args) {
    if (CONFIG.consoleDebug) console.warn('[MV-AID]', ...args);
  }

  function readBytes(file, start, end) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload  = () => resolve(new Uint8Array(fr.result));
      fr.onerror = reject;
      fr.readAsArrayBuffer(file.slice(start, Math.min(end, file.size)));
    });
  }

  function bytesToText(bytes) {
    let s = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      for (let j = 0; j < sub.length; j++) {
        const c = sub[j];
        s += (c >= 32 && c < 127) ? String.fromCharCode(c) : (c === 0 ? '\0' : ' ');
      }
    }
    return s;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload  = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function hashKey(str) {
    let h = 0;
    str = String(str || '');
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return 'k' + Math.abs(h).toString(36);
  }

  function isStockSource(url) {
    if (!url) return false;
    return CONFIG.stockSources.some(p => p.test(url));
  }

  /* =========================================================
     LAYER 1 — C2PA (STRONG)
  ========================================================= */
  async function detectC2PA(file) {
    try {
      const buf = await readBytes(file, 0, Math.min(file.size, 262144));
      const txt = bytesToText(buf);

      if (!/(c2pa|jumbf|cai:|contentauth)/i.test(txt)) return null;

      if (/OpenAI|openai\.com|dall/i.test(txt))
        return { found: true, source: 'C2PA · OpenAI', confidence: 0.98, layer: 'c2pa', strength: 'strong' };
      if (/Adobe\s*Firefly|firefly/i.test(txt))
        return { found: true, source: 'C2PA · Adobe Firefly', confidence: 0.98, layer: 'c2pa', strength: 'strong' };
      if (/Microsoft\s*Designer|Bing\s*Image/i.test(txt))
        return { found: true, source: 'C2PA · Microsoft Designer', confidence: 0.98, layer: 'c2pa', strength: 'strong' };
      if (/Google\s*Imagen|Gemini/i.test(txt))
        return { found: true, source: 'C2PA · Google Imagen', confidence: 0.96, layer: 'c2pa', strength: 'strong' };

      return { found: true, source: 'C2PA signed content', confidence: 0.92, layer: 'c2pa', strength: 'strong' };
    } catch (e) {}
    return null;
  }

  /* =========================================================
     LAYER 2 — EXIF / XMP (STRONG)
  ========================================================= */
  async function detectEXIF(file) {
    try {
      const buf = await readBytes(file, 0, Math.min(file.size, 262144));
      const txt = bytesToText(buf);

      const sw = txt.match(/Software\0*([^\0]{3,80})/i)
             || txt.match(/<xmp:CreatorTool[^>]*>([^<]+)</i)
             || txt.match(/"Software"\s*:\s*"([^"]+)"/i);

      if (sw) {
        const swVal = sw[1].trim().toLowerCase();
        for (const tag of CONFIG.softwareTags) {
          if (swVal.includes(tag)) {
            return { found: true, source: 'EXIF Software · ' + sw[1].trim(), confidence: 0.92, layer: 'exif', strength: 'strong' };
          }
        }
      }

      const desc = txt.match(/<dc:description[^>]*>([^<]{5,200})</i)
                || txt.match(/ImageDescription\0*([^\0]{5,200})/i);

      if (desc) {
        const d = desc[1].toLowerCase();
        for (const tag of CONFIG.softwareTags) {
          if (d.includes(tag))
            return { found: true, source: 'EXIF Description', confidence: 0.85, layer: 'exif', strength: 'strong' };
        }
      }
    } catch (e) {}
    return null;
  }

  /* =========================================================
     LAYER 3 — PNG chunks (STRONG)
  ========================================================= */
  async function detectPNGChunks(file) {
    if (!/image\/png/i.test(file.type) && !/\.png$/i.test(file.name)) return null;
    try {
      const buf = await readBytes(file, 0, Math.min(file.size, 65536));
      const txt = bytesToText(buf);

      if (/parameters/i.test(txt) && /Steps:\s*\d/i.test(txt)) {
        const model = txt.match(/Model:\s*([^\n,]{2,60})/i);
        return {
          found: true,
          source: 'PNG · Stable Diffusion' + (model ? ' · ' + model[1].trim() : ''),
          confidence: 0.99,
          layer: 'png',
          strength: 'strong'
        };
      }
      if (/prompt/i.test(txt) && /(negative prompt|negative_prompt)/i.test(txt)) {
        return { found: true, source: 'PNG · AI prompt metadata', confidence: 0.97, layer: 'png', strength: 'strong' };
      }
      if (/ComfyUI|A1111|Automatic1111|Forge/i.test(txt)) {
        return { found: true, source: 'PNG · ComfyUI / A1111', confidence: 0.98, layer: 'png', strength: 'strong' };
      }
    } catch (e) {}
    return null;
  }

  /* =========================================================
     LAYER 4 — Video metadata (STRONG)
  ========================================================= */
  async function detectVideoMetadata(file) {
    if (!file || !/video\//i.test(file.type)) return null;
    try {
      const buf = await readBytes(file, 0, Math.min(file.size, 1048576));
      const txt = bytesToText(buf);

      const videoSignatures = [
        ['Sora', 0.98],
        ['RunwayML', 0.96],
        ['Runway ML', 0.96],
        ['Pika Labs', 0.96],
        ['Kling AI', 0.96],
        ['Luma AI', 0.96],
        ['Dream Machine', 0.96],
        ['Gen-2', 0.92],
        ['Gen-3', 0.94],
        ['Veo 3', 0.94],
        ['Veo 2', 0.92],
        ['Stable Video', 0.93],
        ['SV3D', 0.92]
      ];
      for (const [tag, conf] of videoSignatures) {
        if (txt.includes(tag))
          return { found: true, source: 'Video · ' + tag, confidence: conf, layer: 'video', strength: 'strong' };
      }

      const enc = txt.match(/Encoder\s*[:=]\s*([^\n\0]{2,60})/i);
      if (enc) {
        const e = enc[1].toLowerCase();
        for (const tag of CONFIG.softwareTags) {
          if (e.includes(tag))
            return { found: true, source: 'Video encoder · ' + tag, confidence: 0.85, layer: 'video', strength: 'strong' };
        }
      }
    } catch (e) {}
    return null;
  }

  /* =========================================================
     LAYER 5 — Filename / URL (WEAK)
  ========================================================= */
  function detectFilename(fileName, url) {
    const name = String(fileName || url || '');
    if (!name) return null;

    for (const p of CONFIG.filenamePatterns) {
      if (p.test(name))
        return { found: true, source: 'Filename pattern', confidence: 0.82, layer: 'filename', strength: 'weak' };
    }
    for (const p of CONFIG.urlPatterns) {
      if (p.test(name))
        return { found: true, source: 'URL signature', confidence: 0.90, layer: 'url', strength: 'weak' };
    }
    return null;
  }

  /* =========================================================
     LAYER 6 — Sightengine API (STRONG)
  ========================================================= */
  async function detectSightengine(file) {
    const parts = (CONFIG.api.key || '').split(':');
    if (parts.length < 2) return null;

    try {
      const body = new FormData();
      body.append('media', file);
      body.append('models', 'genai');

      const url = 'https://api.sightengine.com/1.0/check.json'
                + '?models=genai'
                + '&api_user=' + encodeURIComponent(parts[0])
                + '&api_secret=' + encodeURIComponent(parts[1]);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CONFIG.api.timeout);

      const res = await fetch(url, { method: 'POST', body, signal: ctrl.signal });
      clearTimeout(timer);
      state.apiCallsUsed++;

      if (!res.ok) { state.apiCallsFailed++; return null; }
      const j = await res.json();

      const score = Number(j?.type?.ai_generated || 0);
      log('Sightengine score:', score);

      if (score >= CONFIG.api.minScore) {
        return {
          found: true,
          source: 'Sightengine API',
          confidence: Math.min(0.99, score),
          layer: 'api',
          strength: 'strong'
        };
      }
      return null;
    } catch (e) {
      warn('Sightengine error:', e.message);
      state.apiCallsFailed++;
      return null;
    }
  }

  async function detectHive(file) {
    if (!CONFIG.api.key) return null;
    try {
      const body = new FormData();
      body.append('media', file);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CONFIG.api.timeout);

      const res = await fetch('https://api.thehive.ai/api/v2/task/sync', {
        method: 'POST',
        headers: { 'Authorization': 'token ' + CONFIG.api.key },
        body,
        signal: ctrl.signal
      });
      clearTimeout(timer);
      state.apiCallsUsed++;

      if (!res.ok) { state.apiCallsFailed++; return null; }
      const j = await res.json();
      const classes = j?.status?.[0]?.response?.output?.[0]?.classes || [];
      const aiClass = classes.find(c => /ai_?generated|synthetic|generated/i.test(c.class));
      const score = Number(aiClass?.score || 0);

      if (score >= CONFIG.api.minScore) {
        return { found: true, source: 'Hive AI API', confidence: Math.min(0.99, score), layer: 'api', strength: 'strong' };
      }
      return null;
    } catch (e) {
      warn('Hive error:', e.message);
      state.apiCallsFailed++;
      return null;
    }
  }

  async function detectCustomAPI(file) {
    if (!CONFIG.api.endpoint) return null;
    try {
      const b64 = await fileToBase64(file);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CONFIG.api.timeout);

      const res = await fetch(CONFIG.api.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.api.key || '' },
        body: JSON.stringify({ image: b64, filename: file.name, type: file.type }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      state.apiCallsUsed++;

      if (!res.ok) { state.apiCallsFailed++; return null; }
      const j = await res.json();
      const score = Number(j?.score || (j?.ai ? 0.9 : 0));

      if (j?.ai === true || score >= CONFIG.api.minScore) {
        return { found: true, source: j?.source || 'Custom API', confidence: Math.min(0.99, score || 0.9), layer: 'api', strength: 'strong' };
      }
      return null;
    } catch (e) {
      warn('Custom API error:', e.message);
      state.apiCallsFailed++;
      return null;
    }
  }

  /* =========================================================
     MAIN DETECT — Two-Tier Voting
  ========================================================= */
  async function detect(file, url, fallbackFlag) {
    if (fallbackFlag === true) {
      log('Detected via composer flag');
      return { found: true, source: 'Composer flag', confidence: 1.0, layer: 'flag', strength: 'strong' };
    }

    if (isStockSource(url)) {
      log('Skipped — stock source:', (url || '').slice(0, 60));
      return { found: false, source: 'Stock image source', confidence: 1.0, layer: 'stock' };
    }

    const key = file ? hashKey(file.name + '|' + file.size + '|' + file.lastModified) : hashKey(url || '');
    if (state.cache.has(key)) {
      const cached = state.cache.get(key);
      if (Date.now() - cached.at < CONFIG.api.cacheTTL) return cached.result;
      state.cache.delete(key);
    }

    const strong = [];
    const weak = [];

    const nameRes = detectFilename(file?.name, url);
    if (nameRes) weak.push(nameRes);

    if (file) {
      if (CONFIG.api.provider === 'sightengine' && CONFIG.api.key) {
        const r = await detectSightengine(file);
        if (r) strong.push(r);
      } else if (CONFIG.api.provider === 'hive' && CONFIG.api.key) {
        const r = await detectHive(file);
        if (r) strong.push(r);
      } else if (CONFIG.api.provider === 'custom') {
        const r = await detectCustomAPI(file);
        if (r) strong.push(r);
      }

      const meta = await Promise.all([
        detectC2PA(file),
        detectEXIF(file),
        detectPNGChunks(file),
        detectVideoMetadata(file)
      ]);
      meta.filter(Boolean).forEach(r => strong.push(r));
    }

    let result = { found: false, source: 'No AI signatures', confidence: 0, layer: 'none' };

    if (strong.length > 0) {
      result = strong.sort((a, b) => b.confidence - a.confidence)[0];
      log('AI ✓ (strong signal):', result.source, result.confidence.toFixed(2));
    } else if (weak.length >= CONFIG.thresholds.minWeakVotes) {
      result = weak.sort((a, b) => b.confidence - a.confidence)[0];
      log('AI ✓ (weak x' + weak.length + '):', result.source, result.confidence.toFixed(2));
    } else if (weak.length === 1 && weak[0].confidence >= CONFIG.thresholds.weakSignal) {
      result = weak[0];
      log('AI ✓ (weak high-conf):', result.source, result.confidence.toFixed(2));
    } else {
      log('Not AI:', (url || file?.name || 'unknown').slice(0, 60));
    }

    if (result.found && result.confidence < CONFIG.thresholds.finalMin) {
      result = { found: false, source: 'Below threshold', confidence: result.confidence, layer: 'none' };
    }

    state.cache.set(key, { at: Date.now(), result });
    return result;
  }

  /* =========================================================
     BADGE UI
  ========================================================= */
  function confidenceClass(c) {
    if (c >= 0.9) return 'conf-high';
    if (c >= 0.75) return 'conf-med';
    return 'conf-low';
  }

  function renderBadge(post, result) {
    if (!CONFIG.badgeEnabled || !post) return;

    const existing = post.querySelector(':scope > .post-head .mv-ai-badge');
    if (existing) existing.remove();

    if (!result || !result.found || result.confidence < CONFIG.thresholds.finalMin) {
      post.removeAttribute('data-ai');
      return;
    }

    post.dataset.ai = 'true';

    const strong = post.querySelector(':scope > .post-head .post-author strong');
    if (!strong) return;

    /* ⭐ Wrap author name — full visible (no ellipsis) */
    if (!strong.querySelector(':scope > .mv-author-name')) {
      const walker = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT, null);
      const firstTextNode = walker.nextNode();
      if (firstTextNode && firstTextNode.textContent.trim()) {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'mv-author-name';
        nameSpan.textContent = firstTextNode.textContent;
        firstTextNode.replaceWith(nameSpan);
      }
    }

    const badge = document.createElement('span');
    badge.className = 'mv-ai-badge ' + confidenceClass(result.confidence);
    badge.title = 'AI Generated Content';
    badge.setAttribute('aria-label', 'AI Generated');
    /* ⭐ শুধু icon — কোনো text নেই */
    badge.innerHTML = '<i class="fa-solid fa-robot"></i>';
    strong.appendChild(badge);

    bindBadgeClick(post);
  }

  /* =========================================================
     AI TOAST — badge click → top toast
  ========================================================= */
  let _aiToastEl = null;
  let _aiToastTimer = null;

  function ensureAiToast() {
    if (_aiToastEl && document.body.contains(_aiToastEl)) return _aiToastEl;
    _aiToastEl = document.createElement('div');
    _aiToastEl.className = 'mv-ai-toast';
    _aiToastEl.innerHTML = '<i class="fa-solid fa-robot"></i><span class="mv-ai-toast-text"></span>';
    document.body.appendChild(_aiToastEl);
    return _aiToastEl;
  }

  function showAiToast(message) {
    const el = ensureAiToast();
    el.querySelector('.mv-ai-toast-text').innerHTML = message;
    clearTimeout(_aiToastTimer);
    void el.offsetWidth;
    el.classList.add('show');
    _aiToastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function detectPostMediaType(post) {
    if (!post) return 'content';

    const data = post._mvData || {};

    if (Array.isArray(data.media) && data.media.length) {
      const types = data.media.map(m => m && m.type).filter(Boolean);
      const hasVideo = types.includes('video');
      const hasImage = types.includes('image');
      if (hasVideo && hasImage) return 'mixed';
      if (hasVideo) return 'video';
      if (hasImage) return 'image';
    }

    const hasVideo = !!post.querySelector('.video-shell, .post-media-grid .pm-item video');
    const hasImage = !!post.querySelector('.post-media, .post-media-grid .pm-item img');

    if (hasVideo && hasImage) return 'mixed';
    if (hasVideo) return 'video';
    if (hasImage) return 'image';

    if (post.querySelector('.post-text')) return 'text';

    return 'content';
  }

  function buildAiMessage(post) {
    const type = detectPostMediaType(post);

    let subject = 'content';
    if (type === 'image')      subject = 'image';
    else if (type === 'video') subject = 'video';
    else if (type === 'text')  subject = 'text';
    else if (type === 'mixed') subject = 'media';

    const article = subject === 'image' ? 'This image'
                  : subject === 'video' ? 'This video'
                  : subject === 'text'  ? 'This text'
                  : subject === 'media' ? 'This media'
                  : 'This content';

    const verb = subject === 'video' ? 'was' : 'is';

    /* ⭐ শুধু main message — কোনো source/pattern/% নেই */
    return `<b>${article} ${verb} AI generated</b>`;
  }

  function bindBadgeClick(post) {
    if (!post || post._mvAIDClickBound) return;
    post._mvAIDClickBound = true;

    post.addEventListener('click', function(e) {
      const badge = e.target.closest('.mv-ai-badge');
      if (!badge) return;
      if (!post.contains(badge)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      showAiToast(buildAiMessage(post));
    }, true);
  }

  /* =========================================================
     POST SCANNER
  ========================================================= */
  async function scanPost(post) {
    if (!post || !post.classList || !post.classList.contains('post')) return;
    if (post._mvAIDScanned === 2) return;
    post._mvAIDScanned = 1;

    const data = post._mvData || {};

    /* Composer flag → instant AI */
    if (data.isAI === true || data._isTextImage === true) {
      renderBadge(post, { found: true, source: 'Composer flag', confidence: 1.0, layer: 'flag' });
      post._mvAIDScanned = 2;
      state.stats.total++;
      state.stats.ai++;
      return;
    }

    /* Collect media candidates */
    const candidates = [];

    if (Array.isArray(data.media)) {
      data.media.forEach(m => m && m.url && candidates.push({ url: m.url, type: m.type, file: m.file || null }));
    }

    post.querySelectorAll('img.post-media').forEach(img => {
      if (img.src && candidates.every(c => c.url !== img.src)) {
        candidates.push({ url: img.src, type: 'image' });
      }
    });
    post.querySelectorAll('.post-media-grid .pm-item img').forEach(img => {
      if (img.src && candidates.every(c => c.url !== img.src)) {
        candidates.push({ url: img.src, type: 'image' });
      }
    });
    post.querySelectorAll('.video-shell video, .post-media-grid .pm-item video').forEach(v => {
      const src = v.currentSrc || v.src;
      if (src && candidates.every(c => c.url !== src)) {
        candidates.push({ url: src, type: 'video' });
      }
    });

    /* No media: check Text Studio usage */
    if (!candidates.length) {
      if (data.textStyle && (
          (data.textStyle.effect && data.textStyle.effect !== 'none') ||
          (data.textStyle.fontId && data.textStyle.fontId !== 'space') ||
          (data.textStyle.color && String(data.textStyle.color).toLowerCase() !== '#ffffff') ||
          data.textStyle.bold || data.textStyle.italic || data.textStyle.underline
      )) {
        renderBadge(post, {
          found: true,
          source: 'Text Studio style',
          confidence: 0.85,
          layer: 'text'
        });
        post._mvAIDScanned = 2;
        state.stats.total++;
        state.stats.ai++;
        return;
      }
      state.stats.empty++;
      post._mvAIDScanned = 2;
      renderBadge(post, { found: false });
      return;
    }

    /* Stock image → skip */
    const nonStock = candidates.filter(c => !isStockSource(c.url));
    if (!nonStock.length) {
      state.stats.stock++;
      post._mvAIDScanned = 2;
      renderBadge(post, { found: false });
      log('Post skipped (all stock):', post.dataset.postId);
      return;
    }

    /* Detect on each non-stock candidate */
    for (const c of nonStock) {
      const res = await detect(c.file, c.url, false);
      if (res && res.found && res.confidence >= CONFIG.thresholds.finalMin) {
        renderBadge(post, res);
        post._mvAIDScanned = 2;
        state.stats.total++;
        state.stats.ai++;
        return;
      }
    }

    /* No AI detected */
    state.stats.total++;
    state.stats.human++;
    post._mvAIDScanned = 2;
    renderBadge(post, { found: false });
  }

  /* =========================================================
     FORCE CLEANUP
  ========================================================= */
  function clearAllBadges() {
    document.querySelectorAll('.mv-ai-badge').forEach(b => b.remove());
    document.querySelectorAll('.post[data-ai]').forEach(p => p.removeAttribute('data-ai'));
    document.querySelectorAll('#postsContainer > .post').forEach(p => {
      p._mvAIDScanned = 0;
      p._mvAIDClickBound = false;
    });
    log('All badges cleared');
  }

  /* =========================================================
     CSS OVERRIDES (inject once)
  ========================================================= */
  function injectStyles() {
    if (document.getElementById('mv-ai-badge-overrides')) return;

    const st = document.createElement('style');
    st.id = 'mv-ai-badge-overrides';
    st.textContent = `
      /* ⭐ Author name — full display, badge wrap করে নিচে যাবে */
      .post-author strong{
        flex-wrap: wrap !important;
        gap: 5px !important;
        overflow: visible !important;
      }
      .post-author strong .mv-author-name{
        overflow: visible !important;
        text-overflow: clip !important;
        white-space: normal !important;
        flex: 0 1 auto !important;
        word-break: break-word;
        max-width: none !important;
      }

      /* ⭐ Badge — শুধু icon, ছোট round button */
      .mv-ai-badge{
        padding: 6px !important;
        border-radius: 50% !important;
        gap: 0 !important;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        min-height: 26px !important;
        justify-content: center !important;
        align-items: center !important;
      }
      .mv-ai-badge i{
        font-size: 13px !important;
        margin: 0 !important;
        line-height: 1 !important;
      }
      .mv-ai-badge .mv-ai-text{
        display: none !important;
      }
      /* Shine effect slow */
      .mv-ai-badge::after{
        animation-duration: 4.5s !important;
      }

      /* Mobile responsive */
      @media (max-width: 520px){
        .mv-ai-badge{
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          min-height: 24px !important;
          padding: 5px !important;
        }
        .mv-ai-badge i{ font-size: 12px !important; }
      }
    `;
    document.head.appendChild(st);
  }

  /* =========================================================
     OBSERVER + HOOKS
  ========================================================= */
  function installObserver() {
    const container = document.getElementById('postsContainer');
    if (!container || container._mvAIDObserver) return;

    container._mvAIDObserver = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('post')) {
            setTimeout(() => scanPost(n), 150);
          }
          if (n.querySelectorAll) {
            n.querySelectorAll('.post').forEach(p => setTimeout(() => scanPost(p), 150));
          }
        });
      });
    });

    container._mvAIDObserver.observe(container, { childList: true, subtree: false });
    log('Observer installed');
  }

  function installHooks() {
    if (typeof window.createPostFromComposer === 'function' && !window.createPostFromComposer._mvAIDHooked) {
      const _orig = window.createPostFromComposer;
      window.createPostFromComposer = async function (snap) {
        const r = await _orig.apply(this, arguments);
        const newest = document.querySelector('#postsContainer .post');
        if (newest) {
          newest._mvData = newest._mvData || {};
          if (snap && (snap.isAI || snap._isTextImage)) {
            if (snap.isAI) newest._mvData.isAI = true;
            if (snap._isTextImage) newest._mvData._isTextImage = true;
          }
          setTimeout(() => scanPost(newest), 120);
        }
        return r;
      };
      window.createPostFromComposer._mvAIDHooked = true;
      log('createPostFromComposer hooked');
    }

    if (typeof window.applyEditToPost === 'function' && !window.applyEditToPost._mvAIDHooked) {
      const _orig = window.applyEditToPost;
      window.applyEditToPost = function (post) {
        const r = _orig.apply(this, arguments);
        if (post) {
          post._mvAIDScanned = 0;
          post._mvAIDClickBound = false;
          setTimeout(() => scanPost(post), 150);
        }
        return r;
      };
      window.applyEditToPost._mvAIDHooked = true;
      log('applyEditToPost hooked');
    }
  }

  /* =========================================================
     PUBLIC API
  ========================================================= */
  function scanAll() {
    document.querySelectorAll('#postsContainer > .post').forEach(p => {
      if (p._mvAIDScanned !== 2) scanPost(p);
    });
  }

  function setAPI(provider, key, endpoint) {
    CONFIG.api.provider = provider || '';
    CONFIG.api.key = key || '';
    if (endpoint) CONFIG.api.endpoint = endpoint;
    log('API configured:', provider, '| key length:', (key || '').length);
  }

  function clearAPIConfig() {
    CONFIG.api.provider = '';
    CONFIG.api.key = '';
    CONFIG.api.endpoint = '';
    log('API cleared — metadata-only mode');
  }

  function getStats() {
    return {
      ...state.stats,
      cacheSize: state.cache.size,
      apiCallsUsed: state.apiCallsUsed,
      apiCallsFailed: state.apiCallsFailed,
      apiConfigured: !!(CONFIG.api.provider && CONFIG.api.key),
      provider: CONFIG.api.provider || 'metadata-only'
    };
  }

  function inspect(post) {
    if (typeof post === 'string') post = document.querySelector(post);
    if (!post) return null;
    return {
      postId: post.dataset.postId || '(no id)',
      isAI: post.dataset.ai === 'true',
      hasBadge: !!post.querySelector('.mv-ai-badge'),
      badgeDetail: post.querySelector('.mv-ai-badge')?.dataset.detail || null,
      mediaType: detectPostMediaType(post),
      scanned: post._mvAIDScanned || 0,
      mvData: post._mvData ? {
        isAI: post._mvData.isAI,
        _isTextImage: post._mvData._isTextImage,
        mediaCount: (post._mvData.media || []).length
      } : null
    };
  }

  function debugPost(post) {
    if (typeof post === 'string') post = document.querySelector(post);
    if (!post) return console.warn('Post not found');
    post._mvAIDScanned = 0;
    post._mvAIDClickBound = false;
    post.querySelector('.mv-ai-badge')?.remove();
    scanPost(post);
    return 'Rescanning…';
  }

  /* =========================================================
     BOOT
  ========================================================= */
  function boot() {
    injectStyles();
    clearAllBadges();
    installObserver();
    installHooks();

    if (CONFIG.autoScan) {
      scanAll();
      setTimeout(scanAll, 900);
      setTimeout(scanAll, 2400);
      setTimeout(scanAll, 5500);
    }

    /* সব existing post এ click binding apply */
    setTimeout(() => {
      document.querySelectorAll('#postsContainer > .post').forEach(bindBadgeClick);
    }, 500);

    state.ready = true;

    log('%cEngine v3.3 READY ✓', 'color:#35e69a;font-weight:bold;',
        '| Mode:', CONFIG.api.provider || 'metadata-only');
    log('Commands: MVAIDetector.getStats() · inspect(".post") · debugPost(".post") · showAiToast("msg")');
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 350));
    } else {
      setTimeout(boot, 350);
    }
  }

  return {
    config: CONFIG,
    state,
    detect,
    scanPost,
    scanAll,
    setAPI,
    clearAPIConfig,
    getStats,
    inspect,
    debugPost,
    clearAllBadges,
    renderBadge,
    showAiToast,
    bindBadgeClick,
    version: '3.3.0'
  };
});