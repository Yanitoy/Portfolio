// CatPhotoApp+ interactions
(function () {
  const root = document.documentElement;
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme toggle with persistence
  const THEME_KEY = 'catapp-theme';
  const toggleBtn = document.getElementById('theme-toggle');
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark') root.setAttribute('data-theme', 'dark');
  updateToggleIcon();
  toggleBtn?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'light');
      toggleBtn.setAttribute('aria-pressed', 'false');
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem(THEME_KEY, 'dark');
      toggleBtn.setAttribute('aria-pressed', 'true');
    }
    updateToggleIcon();
  });
  function updateToggleIcon() {
    if (!toggleBtn) return;
    const isDark = root.getAttribute('data-theme') === 'dark';
    toggleBtn.textContent = isDark ? '☀' : '☾';
    toggleBtn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  }

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const lbClose = lightbox?.querySelector('.lightbox-close');
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('.lightbox-trigger');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    const caption = a.getAttribute('data-caption') || '';
    if (href && lbImg && lightbox) {
      lbImg.src = href;
      lbCaption.textContent = caption;
      lightbox.setAttribute('aria-hidden', 'false');
    }
  });
  lbClose?.addEventListener('click', () => lightbox.setAttribute('aria-hidden', 'true'));
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox?.getAttribute('aria-hidden') === 'false') {
      lightbox.setAttribute('aria-hidden', 'true');
    }
  });

  // Live preview for URL input
  const urlInput = document.getElementById('catphotourl');
  const preview = document.getElementById('preview');
  const help = document.getElementById('url-help');

  function isLikelyImage(url) {
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);
  }

  function renderPreview(url) {
    if (!preview) return;
    preview.textContent = '';
    const img = new Image();
    img.alt = 'Preview of your cat photo URL';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = url;
    const onError = () => {
      preview.textContent = '';
      const p = document.createElement('p');
      p.style.margin = '0.5rem';
      p.textContent = 'Could not load that image URL. Please check and try again.';
      preview.appendChild(p);
    };
    img.addEventListener('error', onError, { once: true });
    img.addEventListener('load', () => {
      preview.textContent = '';
      preview.appendChild(img);
    }, { once: true });
  }

  urlInput?.addEventListener('input', () => {
    const val = urlInput.value.trim();
    if (!val) { preview.textContent = ''; return; }
    try {
      const u = new URL(val);
      help.textContent = isLikelyImage(u.href) ? 'Looks good. Preview below.' : 'URL added. If it is an image, a preview will appear.';
      renderPreview(u.href);
      urlInput.setCustomValidity('');
    } catch {
      help.textContent = 'Please enter a valid URL (https://...)';
      urlInput.setCustomValidity('Invalid URL');
    }
  });

  // Prevent submission if URL invalid
  const form = urlInput?.closest('form');
  form?.addEventListener('submit', (e) => {
    if (!urlInput.checkValidity()) {
      e.preventDefault();
      urlInput.reportValidity();
    }
  });

  // ===== Supabase Storage upload (client-side) =====
  // Config derived from your project. Replace bucket if needed.
  const SUPABASE_URL = 'https://stfxthnppyreptjpbusi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0Znh0aG5wcHlyZXB0anBidXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNzI5NjIsImV4cCI6MjA3Njk0ODk2Mn0.K06iOt82IKRKjOeY5x96dq5HKOtoHx0QehKmPJtYWrE';
  const BUCKET = 'cats';

  const sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const fileInput = document.getElementById('cat-file');
  const uploadBtn = document.getElementById('upload-btn');
  const prog = document.getElementById('up-progress');
  const msg = document.getElementById('upload-msg');
  const upPrev = document.getElementById('up-preview');
  const compressChk = document.getElementById('compress');
  const uploadsGrid = document.getElementById('uploads-grid');
  const refreshUploadsBtn = document.getElementById('refresh-uploads');
  const uploadsStatus = document.getElementById('uploads-status');
  const copyRow = document.getElementById('copy-row');
  const copyBtn = document.getElementById('copy-link');
  const finalSizeEl = document.getElementById('final-size');
  let lastPublicUrl = '';

  function uuid() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function previewFile(file) {
    if (!file) return;
    upPrev.textContent = '';
    const img = document.createElement('img');
    img.alt = 'Upload preview';
    img.src = URL.createObjectURL(file);
    upPrev.appendChild(img);
  }

  async function compressImage(file, { maxDim = 1600, quality = 0.85, type = 'image/jpeg' } = {}) {
    // Skip if not requested
    if (!compressChk?.checked) return file;
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file; // fallback if decoding fails
    let { width, height } = bitmap;
    let scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function drawAndBlob(q) {
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return new Promise(res => canvas.toBlob(res, type, q));
    }

    // Iteratively reduce quality/size to approach target size.
    const TARGET = 600 * 1024; // 600KB
    let q = quality;
    let blob = await drawAndBlob(q);
    let tries = 0;
    while (blob && blob.size > TARGET && tries < 8) {
      // First reduce quality, then scale if needed
      if (q > 0.5) {
        q -= 0.1;
      } else {
        scale *= 0.85; // downscale a bit
      }
      blob = await drawAndBlob(q);
      tries++;
    }
    if (!blob) return file;
    return blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type, lastModified: Date.now() }) : file;
  }

  async function verifyBucket() {
    if (!sb) return false;
    // Try listing 1 file in the bucket to verify existence/permissions
    const { error } = await sb.storage.from(BUCKET).list('', { limit: 1 });
    if (!error) return true;
    const text = (error.message || String(error)).toLowerCase();
    if (error.status === 404 || text.includes('not found') || text.includes('bucket')) {
      msg.innerHTML = `Storage bucket "${BUCKET}" not found or not accessible.<br>Fix: In Supabase → Storage, create a public bucket named <strong>${BUCKET}</strong> and add the two RLS policies, then reload.`;
      return false;
    }
    // Other errors (e.g., policy) — surface a helpful hint
    msg.textContent = `Cannot access bucket: ${error.message || error}`;
    return false;
  }

  uploadBtn?.addEventListener('click', async () => {
    if (!sb) {
      msg.textContent = 'Upload library not ready. Please reload.';
      return;
    }
    if (!(await verifyBucket())) return;
    let f = fileInput?.files?.[0];
    if (!f) { msg.textContent = 'Choose an image first.'; return; }
    if (!/^image\//.test(f.type)) { msg.textContent = 'Only image files are allowed.'; return; }
    const MAX = 600 * 1024; // 600KB
    if (f.size > MAX && !(compressChk?.checked)) { msg.textContent = 'Image must be ≤ 600KB (enable compression to auto-reduce).'; return; }

    previewFile(f);
    // Optional compression
    if (compressChk?.checked) {
      msg.textContent = 'Compressing…';
      try { f = await compressImage(f); } catch {}
    }
    if (f.size > MAX) { msg.textContent = 'Still larger than 600KB after compression. Try a smaller image.'; return; }
    // Reset copy link UI + show final size
    lastPublicUrl = '';
    if (copyBtn) { copyBtn.disabled = true; copyBtn.textContent = 'Copy link'; }
    if (copyRow) copyRow.style.display = 'none';
    if (finalSizeEl) finalSizeEl.textContent = `Final size: ${formatBytes(f.size)}`;
    msg.textContent = 'Uploading…';
    prog.value = 25;
    const today = new Date().toISOString().slice(0,10);
    const safeName = f.name.replace(/[^a-z0-9_.-]/gi, '_');
    const path = `${today}/${uuid()}-${safeName}`;

    try {
      const { data, error } = await sb.storage.from(BUCKET).upload(path, f, {
        cacheControl: '31536000',
        upsert: false,
        contentType: f.type,
      });
      if (error) throw error;
      prog.value = 90;
      // For public buckets, generate a permanent public URL
      const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
      prog.value = 100;
      msg.innerHTML = `Uploaded! Public link: <a href="${pub.publicUrl}" target="_blank" rel="noopener">view</a>`;
      lastPublicUrl = pub.publicUrl;
      if (copyBtn) { copyBtn.disabled = false; }
      if (copyRow) { copyRow.style.display = 'flex'; }
      // Attempt to refresh recent uploads after a successful upload
      try { await loadRecentUploads(); } catch {}
    } catch (err) {
      console.error(err);
      msg.textContent = `Upload failed: ${err.message || err}`;
      prog.value = 0;
    }
  });

  // Copy link to clipboard
  copyBtn?.addEventListener('click', async () => {
    if (!lastPublicUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lastPublicUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = lastPublicUrl; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
    } catch (e) {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
    }
  });

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
  }

  // ===== Recent uploads gallery =====
  async function listAllPaths(limitTotal = 24) {
    const out = [];
    const { data: roots, error } = await sb.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'name', order: 'desc' } });
    if (error) throw error;
    for (const entry of roots) {
      if (out.length >= limitTotal) break;
      const isFile = !!entry.id; // heuristic: folders usually have null id/metadata
      if (isFile) {
        out.push({ path: entry.name, updated_at: entry.updated_at || entry.created_at });
        continue;
      }
      const { data: files, error: e2 } = await sb.storage.from(BUCKET).list(entry.name, { limit: 200, sortBy: { column: 'updated_at', order: 'desc' } });
      if (e2) continue;
      for (const f of files) {
        out.push({ path: `${entry.name}/${f.name}`, updated_at: f.updated_at || f.created_at });
        if (out.length >= limitTotal) break;
      }
    }
    out.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    return out.slice(0, limitTotal);
  }

  async function loadRecentUploads() {
    if (!sb || !uploadsGrid) return;
    uploadsStatus.textContent = 'Loading uploads…';
    const ok = await verifyBucket();
    if (!ok) { uploadsStatus.textContent = 'Bucket not accessible.'; return; }
    try {
      const paths = await listAllPaths(24);
      if (!paths.length) { uploadsGrid.innerHTML = ''; uploadsStatus.textContent = 'No uploads yet.'; return; }
      // Map to public URLs (bucket is public)
      const signedList = paths.map(p => {
        const { data } = sb.storage.from(BUCKET).getPublicUrl(p.path);
        return { url: data.publicUrl };
      });
      uploadsGrid.innerHTML = signedList.map((s) => {
        const url = s.url;
        return `<a class="card lightbox-trigger" role="listitem" href="${url}" data-caption="User upload">
                  <img src="${url}" alt="User uploaded cat photo" loading="lazy" />
                  <span class="card-caption">User upload</span>
                </a>`;
      }).join('');
      uploadsStatus.textContent = `Showing ${signedList.length} recent uploads.`;
    } catch (err) {
      console.error(err);
      uploadsStatus.textContent = `Failed to load uploads: ${err.message || err}`;
    }
  }

  refreshUploadsBtn?.addEventListener('click', loadRecentUploads);
  // Auto-load when section exists
  if (uploadsGrid) {
    // defer a tick so Supabase client is ready
    setTimeout(loadRecentUploads, 0);
  }
})();
