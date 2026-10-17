const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartSchedule — Local Visual Asset Library</title>
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --border-focus: #ea580c;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-subtle: #94a3b8;
      --fptu-orange: #ea580c;
      --fptu-orange-hover: #c2410c;
      --fptu-orange-soft: #fff7ed;
      --fptu-orange-border: #fed7aa;
      --radius: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.5;
      padding-bottom: 60px;
    }

    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 40;
      backdrop-filter: blur(12px);
      background-color: rgba(255, 255, 255, 0.94);
    }

    .header-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-title h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-main);
    }

    .brand-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: var(--fptu-orange-soft);
      color: var(--fptu-orange);
      border: 1px solid var(--fptu-orange-border);
      padding: 3px 8px;
      border-radius: 9999px;
    }

    .stats-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .stat-pill {
      background: #f1f5f9;
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 600;
      color: var(--text-main);
    }

    .stat-pill strong {
      color: var(--fptu-orange);
    }

    /* Controls Bar */
    .controls-wrapper {
      max-width: 1360px;
      margin: 24px auto 0;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .search-row {
      display: flex;
      gap: 12px;
    }

    .search-input {
      flex: 1;
      padding: 12px 16px;
      font-size: 14.5px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.12);
    }

    .filter-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .filter-btn:hover {
      background: #f1f5f9;
      color: var(--text-main);
    }

    .filter-btn.active {
      background: var(--fptu-orange);
      color: #ffffff;
      border-color: var(--fptu-orange);
    }

    /* Grid */
    .grid-wrapper {
      max-width: 1360px;
      margin: 24px auto;
      padding: 0 24px;
    }

    .asset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .asset-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
    }

    .asset-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 24px -6px rgba(15, 23, 42, 0.08);
      border-color: var(--fptu-orange-border);
    }

    .thumb-box {
      width: 100%;
      height: 190px;
      background-color: #f1f5f9;
      background-image: 
        linear-gradient(45deg, #e2e8f0 25%, transparent 25%), 
        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #e2e8f0 75%), 
        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid var(--border);
    }

    .thumb-img {
      max-width: 90%;
      max-height: 85%;
      object-fit: contain;
      transition: transform 0.25s ease;
    }

    .asset-card:hover .thumb-img {
      transform: scale(1.04);
    }

    .thumb-badge-format {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      padding: 3px 6px;
      border-radius: 4px;
      backdrop-filter: blur(4px);
    }

    .thumb-badge-size {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.9);
      color: var(--text-main);
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }

    .card-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 10px;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }

    .card-use-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      color: var(--fptu-orange);
      background: var(--fptu-orange-soft);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--fptu-orange-border);
      width: fit-content;
    }

    .color-swatches {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-top: 2px;
    }

    .swatch {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: help;
    }

    .card-footer-info {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Modal */
    .modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .modal-backdrop.open {
      display: flex;
    }

    .modal-card {
      background: var(--surface);
      border-radius: 16px;
      max-width: 820px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      font-size: 18px;
      font-weight: 700;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--text-muted);
      cursor: pointer;
      line-height: 1;
    }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .modal-preview-box {
      width: 100%;
      height: 320px;
      background: #f1f5f9;
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 16px;
    }

    .modal-preview-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }

    .info-table th {
      text-align: left;
      width: 160px;
      color: var(--text-muted);
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }

    .info-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-main);
    }

    .code-snippet {
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      overflow-x: auto;
      position: relative;
    }

    .copy-btn {
      background: var(--fptu-orange);
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s;
    }

    .copy-btn:hover {
      background: var(--fptu-orange-hover);
    }

    .copy-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
      display: none;
      z-index: 200;
    }
  </style>
</head>
<body>

  <header>
    <div class="header-inner">
      <div class="brand-title">
        <h1>SmartSchedule Asset Library</h1>
        <span class="brand-badge">Academic SaaS</span>
      </div>
      <div class="stats-bar">
        <div class="stat-pill">Total: <strong id="total-count">${catalog.summary.totalAssets}</strong> assets</div>
        <div class="stat-pill">Footprint: <strong>${catalog.summary.totalSizeFormatted}</strong></div>
        <div class="stat-pill">Format: <strong>28 SVG · 5 WebP</strong></div>
      </div>
    </div>
  </header>

  <div class="controls-wrapper">
    <div class="search-row">
      <input 
        type="text" 
        id="search-input" 
        class="search-input" 
        placeholder="Search assets by name, tag, or usage (e.g., 'wave', 'empty state', 'calendar', 'orange')..."
      />
    </div>
    <div class="filter-tabs">
      <button class="filter-btn active" data-cat="all">All (${catalog.summary.totalAssets})</button>
      <button class="filter-btn" data-cat="backgrounds">Backgrounds (${catalog.summary.categories.backgrounds})</button>
      <button class="filter-btn" data-cat="textures">Textures (${catalog.summary.categories.textures})</button>
      <button class="filter-btn" data-cat="illustrations">Illustrations (${catalog.summary.categories.illustrations})</button>
      <button class="filter-btn" data-cat="photography">Photography (${catalog.summary.categories.photography})</button>
    </div>
  </div>

  <div class="grid-wrapper">
    <div class="asset-grid" id="asset-grid">
      <!-- Injected via JavaScript -->
    </div>
  </div>

  <!-- Detail Modal -->
  <div class="modal-backdrop" id="modal">
    <div class="modal-card">
      <div class="modal-header">
        <h2 id="modal-title">Asset Detail</h2>
        <button class="modal-close" id="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-preview-box">
          <img id="modal-img" src="" alt="Asset Preview" />
        </div>
        <table class="info-table">
          <tr>
            <th>Category</th>
            <td id="modal-cat"></td>
          </tr>
          <tr>
            <th>Relative Path</th>
            <td><code id="modal-path"></code></td>
          </tr>
          <tr>
            <th>Dimensions & Size</th>
            <td id="modal-size"></td>
          </tr>
          <tr>
            <th>Suggested Use</th>
            <td id="modal-use"></td>
          </tr>
          <tr>
            <th>Palette</th>
            <td id="modal-palette"></td>
          </tr>
          <tr>
            <th>Source & License</th>
            <td id="modal-license"></td>
          </tr>
        </table>
        <div>
          <h3 style="font-size: 13.5px; font-weight: 700; margin-bottom: 8px;">Integration Snippet</h3>
          <pre class="code-snippet" id="modal-snippet"></pre>
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="copy-btn" id="btn-copy-path">Copy Path</button>
          <button class="copy-btn" id="btn-copy-snippet" style="background: #334155;">Copy Code</button>
        </div>
      </div>
    </div>
  </div>

  <div class="copy-toast" id="toast">Copied to clipboard!</div>

  <script>
    const ASSETS = ${JSON.stringify(catalog.assets)};

    let currentFilter = 'all';
    let searchQuery = '';

    const grid = document.getElementById('asset-grid');
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');

    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-close');
    const toast = document.getElementById('toast');

    let selectedAsset = null;

    function showToast(msg) {
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }

    function renderGrid() {
      const filtered = ASSETS.filter(item => {
        const matchCat = (currentFilter === 'all') || (item.category === currentFilter);
        const q = searchQuery.toLowerCase().trim();
        const matchSearch = !q || 
          item.name.toLowerCase().includes(q) || 
          item.tags.some(t => t.toLowerCase().includes(q)) ||
          item.suggestedUse.toLowerCase().includes(q) ||
          item.format.toLowerCase().includes(q);
        return matchCat && matchSearch;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #64748b;">No assets match your query.</div>';
        return;
      }

      grid.innerHTML = filtered.map(item => \`
        <div class="asset-card" onclick="openModal('\${item.id}')">
          <div class="thumb-box">
            <span class="thumb-badge-format">\${item.format}</span>
            <span class="thumb-badge-size">\${item.sizeFormatted}</span>
            <img class="thumb-img" src="\${item.thumbnail}" alt="\${item.name}" loading="lazy" />
          </div>
          <div class="card-body">
            <h3 class="card-title">\${item.name}</h3>
            <span class="card-use-badge">\${item.suggestedUse.split(',')[0]}</span>
            <div class="color-swatches">
              \${item.dominantColors.map(c => \`<span class="swatch" style="background: \${c}" title="\${c}"></span>\`).join('')}
            </div>
            <div class="card-footer-info">
              <span>\${item.category}</span>
              <span>\${item.source.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function openModal(id) {
      const item = ASSETS.find(a => a.id === id);
      if (!item) return;
      selectedAsset = item;

      document.getElementById('modal-title').textContent = item.name;
      document.getElementById('modal-img').src = item.file;
      document.getElementById('modal-cat').textContent = item.category.toUpperCase();
      document.getElementById('modal-path').textContent = item.file;
      document.getElementById('modal-size').textContent = \`\${item.dimensions} — \${item.sizeFormatted} (\${item.sizeBytes} bytes)\`;
      document.getElementById('modal-use').textContent = item.suggestedUse;

      document.getElementById('modal-palette').innerHTML = item.dominantColors.map(c => \`
        <span style="display:inline-flex; align-items:center; gap:4px; margin-right:8px; font-size:12px; font-family:monospace;">
          <span class="swatch" style="background:\${c}; display:inline-block;"></span> \${c}
        </span>
      \`).join('');

      document.getElementById('modal-license').innerHTML = \`
        <strong>\${item.source}</strong> — \${item.license}
        \${item.attributionText ? \`<br><span style="color:#64748b; font-size:11px;">Attribution: \${item.attributionText}</span>\` : ''}
      \`;

      const code = item.format === 'svg'
        ? \`// Copy to frontend/src/assets/ui/\nimport \${item.id.replace(/-/g, '_')} from '@/assets/ui/\${item.file.split('/').pop()}';\`
        : \`// Copy to frontend/src/assets/ui/\nimport \${item.id.replace(/-/g, '_')} from '@/assets/ui/\${item.file.split('/').pop()}';\n<img src={\${item.id.replace(/-/g, '_')}} alt="\${item.name}" loading="lazy" />\`;
      document.getElementById('modal-snippet').textContent = code;

      modal.classList.add('open');
    }

    modalClose.onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };

    document.getElementById('btn-copy-path').onclick = () => {
      if (selectedAsset) {
        navigator.clipboard.writeText(selectedAsset.file).then(() => showToast('File path copied!'));
      }
    };

    document.getElementById('btn-copy-snippet').onclick = () => {
      if (selectedAsset) {
        const snippet = document.getElementById('modal-snippet').textContent;
        navigator.clipboard.writeText(snippet).then(() => showToast('Import snippet copied!'));
      }
    };

    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      renderGrid();
    };

    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.cat;
        renderGrid();
      };
    });

    renderGrid();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'preview.html'), htmlContent.trim(), 'utf8');
console.log(`Successfully generated ${path.join(ROOT, 'preview.html')}`);
