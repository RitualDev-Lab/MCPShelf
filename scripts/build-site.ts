import * as fs from 'node:fs';
import * as path from 'node:path';

interface EnrichedServer {
  id: string;
  name: string;
  title: string;
  description: string;
  version: string;
  category: string;
  author: string;
  repositoryUrl: string;
  websiteUrl?: string;
  isOfficialLatest: boolean;
  publishedAt: string;
  trustScore: number;
  securityRating: 'Very High' | 'High' | 'Moderate' | 'Caution';
  reviewsCount: number;
  averageRating: number;
  estimatedInstalls: number;
  transportType: string;
  packageIdentifier?: string;
  installSnippets: {
    claudeDesktop: string;
    cursorMcp: string;
    windsurf: string;
    terminal: string;
  };
}

interface BoostInfo {
  serverId: string;
  tier: string;
  badge: string;
  customCallout: string;
  startedAt: string;
  expiresAt: string;
  verifiedStatus: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

async function main() {
  console.log('🏗️ [MCPShelf SSG] Building static web platform for mcp.ritualdev.in...');

  const dataDir = path.resolve(process.cwd(), 'data');
  const siteDir = path.resolve(process.cwd(), 'site');
  const serversDir = path.join(siteDir, 'servers');

  if (!fs.existsSync(serversDir)) {
    fs.mkdirSync(serversDir, { recursive: true });
  }

  // Load catalog, categories, sponsors
  const catalog: EnrichedServer[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf-8'));
  const categories: Category[] = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf-8'));
  const sponsorsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'sponsors.json'), 'utf-8'));
  const activeBoosts: BoostInfo[] = sponsorsData.activeBoosts || [];

  // Write CNAME
  fs.writeFileSync(path.join(siteDir, 'CNAME'), 'mcp.ritualdev.in\n');
  console.log('  🌐 Wrote site/CNAME (mcp.ritualdev.in)');

  // Write site/data.json
  const boostMap = new Map<string, BoostInfo>();
  for (const b of activeBoosts) {
    boostMap.set(b.serverId, b);
  }

  const enrichedCatalog = catalog.map(s => ({
    ...s,
    boost: boostMap.get(s.id) || null
  }));

  fs.writeFileSync(path.join(siteDir, 'data.json'), JSON.stringify(enrichedCatalog, null, 2));
  console.log(`  💾 Wrote site/data.json (${enrichedCatalog.length} servers)`);

  // Build Homepage (index.html)
  const indexHtml = generateIndexHtml(enrichedCatalog, categories, activeBoosts);
  fs.writeFileSync(path.join(siteDir, 'index.html'), indexHtml);
  console.log('  📄 Built site/index.html');

  // Build Boost Page (boost.html)
  const boostHtml = generateBoostHtml(categories, sponsorsData.boostTiers);
  fs.writeFileSync(path.join(siteDir, 'boost.html'), boostHtml);
  console.log('  🚀 Built site/boost.html');

  // Build Submit Page (submit.html)
  const submitHtml = generateSubmitHtml(categories);
  fs.writeFileSync(path.join(siteDir, 'submit.html'), submitHtml);
  console.log('  ✍️ Built site/submit.html');

  // Build Server Detail Pages
  let pageCount = 0;
  for (const server of enrichedCatalog) {
    const slug = slugify(server.id);
    const detailHtml = generateServerDetailHtml(server, categories);
    fs.writeFileSync(path.join(serversDir, `${slug}.html`), detailHtml);
    pageCount++;
  }
  console.log(`  📑 Built ${pageCount} individual server detail pages in site/servers/*.html`);

  console.log('✅ [MCPShelf SSG] Build complete!');
}

function generateIndexHtml(catalog: any[], categories: Category[], activeBoosts: BoostInfo[]): string {
  const heroBoosts = catalog.filter(c => c.boost?.tier === 'hero' || c.boost?.tier === 'spotlight');

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCPShelf - Open MCP Registry, Marketplace & Security Directory</title>
  <meta name="description" content="Discover, install, and audit 400+ Model Context Protocol (MCP) servers for Claude Desktop, Cursor, and Windsurf. Verified security ratings, 1-click install snippets, and creator boosting.">
  <link rel="canonical" href="https://mcp.ritualdev.in/">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mcp.ritualdev.in/">
  <meta property="og:title" content="MCPShelf - Open MCP Registry, Marketplace & Security Directory">
  <meta property="og:description" content="Discover, install, and audit 400+ Model Context Protocol (MCP) servers for Claude Desktop, Cursor, and Windsurf.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/default.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:title" content="MCPShelf - Open MCP Registry, Marketplace & Security Directory">
  <meta name="twitter:description" content="Discover, install, and audit 400+ Model Context Protocol (MCP) servers with 1-click install snippets.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/default.png">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
            dark: { 800: '#0f172a', 900: '#020617', card: '#1e293b' }
          }
        }
      }
    }
  </script>
  <style>
    .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .hero-glow { background: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.15), transparent 70%); }
  </style>
</head>
<body class="bg-dark-900 text-slate-100 min-h-screen font-sans antialiased hero-glow selection:bg-brand-500 selection:text-black">

  <!-- Header -->
  <header class="border-b border-slate-800 bg-dark-900/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <a href="/" class="flex items-center space-x-2">
          <span class="text-2xl">⚡</span>
          <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-brand-500">Shelf</span></span>
        </a>
        <span class="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
          Official Registry Mirror
        </span>
      </div>
      <div class="flex items-center space-x-3">
        <a href="/boost.html" class="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-400 transition">
          <span>🚀</span>
          <span>Boost Server</span>
        </a>
        <a href="/submit.html" class="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
          + Submit MCP
        </a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" target="_blank" class="text-slate-400 hover:text-white transition">
          <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
    <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
      🚀 419+ Verified MCP Servers Synced with Official Model Context Protocol Registry
    </div>
    <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
      The Open Marketplace for <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">AI Coding Agents</span>
    </h1>
    <p class="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 mb-8">
      Discover, audit, and 1-click install verified MCP servers into Claude Desktop, Cursor, and Windsurf with real-time security scores.
    </p>

    <!-- Search Input -->
    <div class="max-w-2xl mx-auto relative mb-6">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>
      <input type="text" id="searchInput" placeholder="Search 419+ servers by name, author, keyword (e.g. secret, postgres, dodo, github)..." class="w-full pl-11 pr-12 py-3.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm shadow-xl transition">
      <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
        <kbd class="px-2 py-0.5 text-xs text-slate-400 bg-slate-700/50 rounded border border-slate-600">/</kbd>
      </div>
    </div>

    <!-- Category Filter Pills -->
    <div class="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto mb-8" id="categoryFilters">
      <button onclick="filterCategory('all')" class="cat-pill active px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-black shadow transition">
        All Categories (${catalog.length})
      </button>
      ${categories.map(cat => `
        <button onclick="filterCategory('${cat.id}')" class="cat-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
          ${cat.icon} ${cat.name}
        </button>
      `).join('')}
    </div>
  </section>

  <!-- Featured / Promoted Hero Spotlight -->
  ${heroBoosts.length > 0 ? `
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <span class="text-amber-400 font-bold text-sm tracking-wide uppercase flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          Promoted Featured Spotlights
        </span>
        <span class="text-xs text-slate-500 font-normal">Sponsored Placements</span>
      </div>
      <a href="/boost.html" class="text-xs text-amber-400/80 hover:text-amber-300 transition">Promote your server &rarr;</a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${heroBoosts.map(item => `
        <div class="glass-card rounded-2xl p-5 border-amber-500/30 hover:border-amber-400/60 transition shadow-lg relative flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ${item.boost?.badge || 'Promoted'}
              </span>
              <span class="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                🛡️ ${item.trustScore}/10 Trust
              </span>
            </div>
            <h3 class="text-lg font-bold text-white mb-1">
              <a href="/servers/${slugify(item.id)}.html" class="hover:text-brand-400 transition">${escapeHtml(item.title)}</a>
            </h3>
            <p class="text-xs text-slate-400 mb-3 line-clamp-2">${escapeHtml(item.boost?.customCallout || item.description)}</p>
          </div>
          <div class="pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">${item.estimatedInstalls.toLocaleString()} installs</span>
            <button onclick="openInstallModal('${escapeHtml(item.id)}')" class="px-3 py-1 text-xs font-bold rounded-lg bg-brand-500 hover:bg-brand-400 text-black transition">
              ⚡ 1-Click Install
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  </section>
  ` : ''}

  <!-- Main Catalog Grid -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-white flex items-center gap-2">
        <span>Verified MCP Servers</span>
        <span id="resultCount" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
          ${catalog.length} servers
        </span>
      </h2>
      <div class="text-xs text-slate-400 flex items-center gap-2">
        <span>Sort by:</span>
        <select id="sortSelect" onchange="sortCards()" class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500">
          <option value="trust">Highest Trust Score</option>
          <option value="installs">Most Installs</option>
          <option value="rating">Top Rated</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>
    </div>

    <!-- Cards Grid -->
    <div id="cardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${catalog.map(server => `
        <div class="server-card glass-card rounded-2xl p-5 hover:border-slate-600 transition flex flex-col justify-between"
             data-name="${escapeHtml(server.name.toLowerCase())}"
             data-title="${escapeHtml(server.title.toLowerCase())}"
             data-category="${server.category}"
             data-author="${escapeHtml(server.author.toLowerCase())}"
             data-trust="${server.trustScore}"
             data-installs="${server.estimatedInstalls}"
             data-rating="${server.averageRating}"
             data-id="${server.id}">
          <div>
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                ${server.category}
              </span>
              <span class="text-xs font-bold ${server.trustScore >= 9.0 ? 'text-emerald-400' : 'text-slate-300'} flex items-center gap-1">
                🛡️ ${server.trustScore}/10
              </span>
            </div>
            <h3 class="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <a href="/servers/${slugify(server.id)}.html" class="hover:text-brand-400 transition">${escapeHtml(server.title)}</a>
              ${server.name.startsWith('io.github.RitualDev-Lab/') ? '<span title="RitualDev Lab Verified" class="text-brand-400 text-xs">✓</span>' : ''}
            </h3>
            <p class="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">${escapeHtml(server.description)}</p>
          </div>
          
          <div>
            <div class="text-[11px] text-slate-400 flex items-center justify-between mb-3">
              <span>★ ${server.averageRating} (${server.reviewsCount})</span>
              <span>${server.estimatedInstalls.toLocaleString()} installs</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="openInstallModal('${escapeHtml(server.id)}')" class="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-brand-500/50 transition">
                ⚡ Install
              </button>
              <a href="/servers/${slugify(server.id)}.html" class="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition">
                Details &rarr;
              </a>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </main>

  <!-- 1-Click Install Modal -->
  <div id="installModal" class="fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="glass-card max-w-xl w-full rounded-2xl p-6 border-slate-700 shadow-2xl relative">
      <button onclick="closeInstallModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg">&times;</button>
      <h3 id="modalTitle" class="text-xl font-bold text-white mb-1">Install MCP Server</h3>
      <p id="modalSubtitle" class="text-xs text-slate-400 mb-4">Choose your AI agent client to copy configuration</p>

      <!-- Client Tabs -->
      <div class="flex border-b border-slate-700 mb-4 text-xs font-semibold overflow-x-auto">
        <button onclick="switchTab('claude')" id="tab-claude" class="tab-btn active px-4 py-2 border-b-2 border-brand-500 text-brand-400">Claude Desktop</button>
        <button onclick="switchTab('cursor')" id="tab-cursor" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">Cursor</button>
        <button onclick="switchTab('windsurf')" id="tab-windsurf" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">Windsurf</button>
        <button onclick="switchTab('zed')" id="tab-zed" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">Zed</button>
        <button onclick="switchTab('terminal')" id="tab-terminal" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">CLI (npx / uvx)</button>
      </div>

      <!-- Config Code Box -->
      <div class="relative mb-4">
        <pre id="modalCode" class="bg-dark-900 border border-slate-800 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto max-h-60"></pre>
        <button onclick="copySnippet()" id="copyBtn" class="absolute top-2.5 right-2.5 px-3 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition">
          Copy
        </button>
      </div>

      <div class="text-[11px] text-slate-400 flex items-center justify-between">
        <span id="tabPath">File: ~/Library/Application Support/Claude/claude_desktop_config.json</span>
        <a id="modalDocsLink" href="#" target="_blank" class="text-brand-400 hover:underline">View Repo &rarr;</a>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-dark-900 py-10 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p>&copy; 2026 MCPShelf. Open-source under Apache-2.0. Built by <a href="https://ritualdev.in" class="text-brand-400 hover:underline">RitualDev Lab</a>.</p>
      <div class="flex items-center space-x-4">
        <a href="/boost.html" class="hover:text-slate-300">Boost Server</a>
        <a href="/submit.html" class="hover:text-slate-300">Submit Registry</a>
        <a href="/llms.txt" class="hover:text-slate-300">llms.txt</a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" class="hover:text-slate-300">GitHub</a>
      </div>
    </div>
  </footer>

  <!-- Client-Side Search & Modal Scripts -->
  <script>
    let activeCategory = 'all';
    let serversData = [];
    let currentServer = null;
    let currentTab = 'claude';

    fetch('/data.json')
      .then(r => r.json())
      .then(d => { serversData = d; });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterCards);

    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    function filterCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.cat-pill').forEach(b => {
        b.classList.remove('active', 'bg-brand-500', 'text-black');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      event.target.classList.add('active', 'bg-brand-500', 'text-black');
      event.target.classList.remove('bg-slate-800', 'text-slate-300');
      filterCards();
    }

    function filterCards() {
      const q = searchInput.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.server-card');
      let visible = 0;

      cards.forEach(card => {
        const name = card.dataset.name;
        const title = card.dataset.title;
        const author = card.dataset.author;
        const cat = card.dataset.category;

        const matchesQuery = !q || name.includes(q) || title.includes(q) || author.includes(q);
        const matchesCategory = activeCategory === 'all' || cat === activeCategory;

        if (matchesQuery && matchesCategory) {
          card.style.display = 'flex';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });

      document.getElementById('resultCount').textContent = visible + ' servers';
    }

    function sortCards() {
      const criteria = document.getElementById('sortSelect').value;
      const grid = document.getElementById('cardsGrid');
      const cards = Array.from(grid.getElementsByClassName('server-card'));

      cards.sort((a, b) => {
        if (criteria === 'trust') return parseFloat(b.dataset.trust) - parseFloat(a.dataset.trust);
        if (criteria === 'installs') return parseInt(b.dataset.installs) - parseInt(a.dataset.installs);
        if (criteria === 'rating') return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
        if (criteria === 'alphabetical') return a.dataset.title.localeCompare(b.dataset.title);
        return 0;
      });

      cards.forEach(card => grid.appendChild(card));
    }

    function openInstallModal(id) {
      const s = serversData.find(x => x.id === id);
      if (!s) return;
      currentServer = s;
      document.getElementById('modalTitle').textContent = s.title;
      document.getElementById('modalDocsLink').href = s.repositoryUrl || '#';
      switchTab('claude');
      document.getElementById('installModal').classList.remove('hidden');
    }

    function closeInstallModal() {
      document.getElementById('installModal').classList.add('hidden');
    }

    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-b-2', 'border-brand-500', 'text-brand-400');
        b.classList.add('text-slate-400');
      });
      document.getElementById('tab-' + tab).classList.add('border-b-2', 'border-brand-500', 'text-brand-400');
      document.getElementById('tab-' + tab).classList.remove('text-slate-400');

      const codeBox = document.getElementById('modalCode');
      const pathBox = document.getElementById('tabPath');

      if (!currentServer) return;
      if (tab === 'claude') {
        codeBox.textContent = currentServer.installSnippets.claudeDesktop;
        pathBox.textContent = 'Paste into: claude_desktop_config.json';
      } else if (tab === 'cursor') {
        codeBox.textContent = currentServer.installSnippets.cursorMcp;
        pathBox.textContent = 'Paste into: ~/.cursor/mcp.json';
      } else if (tab === 'windsurf') {
        codeBox.textContent = currentServer.installSnippets.windsurf;
        pathBox.textContent = 'Paste into: ~/.codeium/windsurf/mcp_config.json';
      } else if (tab === 'zed') {
        const sid = currentServer.name || currentServer.id.split('/').pop();
        const zedObj = {
          "context_servers": {
            [sid]: {
              "command": "npx",
              "args": ["-y", currentServer.packageIdentifier || currentServer.id]
            }
          }
        };
        codeBox.textContent = JSON.stringify(zedObj, null, 2);
        pathBox.textContent = 'Paste into: ~/.config/zed/settings.json';
      } else {
        codeBox.textContent = currentServer.installSnippets.terminal;
        pathBox.textContent = 'Run directly in your terminal';
      }
    }

    function showToast(msg) {
      let toast = document.getElementById('toastNotification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.className = 'fixed bottom-5 right-5 z-50 bg-emerald-500 text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-4';
        document.body.appendChild(toast);
      }
      toast.innerHTML = '<span>⚡</span> <span>' + msg + '</span>';
      toast.classList.remove('opacity-0', 'translate-y-4');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
      }, 2500);
    }

    function copySnippet() {
      const text = document.getElementById('modalCode').textContent;
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'Copied!';
      btn.classList.add('bg-brand-500', 'text-black');
      showToast('Copied ' + currentTab.toUpperCase() + ' snippet to clipboard!');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('bg-brand-500', 'text-black');
      }, 1800);
    }
  </script>
</body>
</html>`;
}

function generateBoostHtml(categories: Category[], boostTiers: any): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boost Your MCP Server - MCPShelf Marketplace</title>
  <meta name="description" content="Promote your Model Context Protocol (MCP) server to 10,000+ AI developers using Claude Desktop, Cursor, and Windsurf. Self-serve boosting via Dodo Payments & Stripe.">
  <link rel="canonical" href="https://mcp.ritualdev.in/boost.html">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mcp.ritualdev.in/boost.html">
  <meta property="og:title" content="Boost Your MCP Server - MCPShelf Marketplace">
  <meta property="og:description" content="Promote your Model Context Protocol (MCP) server to 10,000+ AI developers using Claude Desktop, Cursor, and Windsurf.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/boost.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:title" content="Boost Your MCP Server - MCPShelf Marketplace">
  <meta name="twitter:description" content="Promote your Model Context Protocol (MCP) server with self-serve boosting.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/boost.png">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-amber-400 selection:text-black">
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center space-x-2">
        <span class="text-2xl">⚡</span>
        <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-emerald-400">Shelf</span></span>
      </a>
      <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">&larr; Back to Marketplace</a>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-16 text-center">
    <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
      🚀 Self-Serve Creator Monetization & Placement
    </div>
    <h1 class="text-4xl sm:text-5xl font-extrabold text-white mb-4">
      Boost Your MCP Server to <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Thousands of AI Engineers</span>
    </h1>
    <p class="max-w-2xl mx-auto text-base text-slate-400 mb-12">
      Get your tools into the hands of developers actively building with Claude Desktop, Cursor, and autonomous agents. Transparent sponsored ranking that complies with all security audits.
    </p>

    <!-- Pricing / Boost Tiers -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mb-16">
      
      <!-- Tier 1: Spotlight -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Starter Boost</span>
          <h3 class="text-2xl font-bold text-white mt-1 mb-2">${boostTiers.spotlight.name}</h3>
          <div class="flex items-baseline gap-1 mb-4">
            <span class="text-4xl font-extrabold text-white">$19</span>
            <span class="text-xs text-slate-400">/ month</span>
          </div>
          <ul class="text-xs text-slate-300 space-y-2.5 mb-6">
            ${boostTiers.spotlight.perks.map((p: string) => `<li class="flex items-start gap-2"><span class="text-emerald-400">✓</span><span>${p}</span></li>`).join('')}
          </ul>
        </div>
        <a href="https://checkout.dodopayments.com/buy/pdt_spotlight_mcp?quantity=1" target="_blank" class="w-full py-2.5 rounded-xl font-bold text-xs text-center bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition">
          Activate Spotlight ($19)
        </a>
      </div>

      <!-- Tier 2: Hero (Highlighted) -->
      <div class="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative">
        <span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-black shadow">
          Most Popular
        </span>
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Maximum Reach</span>
          <h3 class="text-2xl font-bold text-white mt-1 mb-2">${boostTiers.hero.name}</h3>
          <div class="flex items-baseline gap-1 mb-4">
            <span class="text-4xl font-extrabold text-white">$49</span>
            <span class="text-xs text-slate-400">/ month</span>
          </div>
          <ul class="text-xs text-slate-300 space-y-2.5 mb-6">
            ${boostTiers.hero.perks.map((p: string) => `<li class="flex items-start gap-2"><span class="text-amber-400">✓</span><span>${p}</span></li>`).join('')}
          </ul>
        </div>
        <a href="https://checkout.dodopayments.com/buy/pdt_hero_mcp?quantity=1" target="_blank" class="w-full py-2.5 rounded-xl font-bold text-xs text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black transition shadow-lg">
          Claim Homepage Hero ($49)
        </a>
      </div>

      <!-- Tier 3: Partner -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-purple-400">Enterprise</span>
          <h3 class="text-2xl font-bold text-white mt-1 mb-2">${boostTiers.partner.name}</h3>
          <div class="flex items-baseline gap-1 mb-4">
            <span class="text-4xl font-extrabold text-white">$99</span>
            <span class="text-xs text-slate-400">/ month</span>
          </div>
          <ul class="text-xs text-slate-300 space-y-2.5 mb-6">
            ${boostTiers.partner.perks.map((p: string) => `<li class="flex items-start gap-2"><span class="text-purple-400">✓</span><span>${p}</span></li>`).join('')}
          </ul>
        </div>
        <a href="https://checkout.dodopayments.com/buy/pdt_partner_mcp?quantity=1" target="_blank" class="w-full py-2.5 rounded-xl font-bold text-xs text-center bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition">
          Partner Activation ($99)
        </a>
      </div>

    </div>

    <!-- Assurance -->
    <div class="max-w-2xl mx-auto p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
      🛡️ <strong>Zero Hidden Bias Policy</strong>: Promoted servers are clearly labeled with visible "Promoted" badges and <code>rel="sponsored"</code> HTML tags. Boosting never alters trust scores or security audit results.
    </div>
  </main>
</body>
</html>`;
}

function generateSubmitHtml(categories: Category[]): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submit MCP Server - MCPShelf Registry</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mcp.ritualdev.in/submit.html">
  <meta property="og:title" content="Submit MCP Server - MCPShelf Registry">
  <meta property="og:description" content="Register your Model Context Protocol server. Automated security audit & official registry synchronization.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/submit.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:title" content="Submit MCP Server - MCPShelf Registry">
  <meta name="twitter:description" content="Register your Model Context Protocol server on MCPShelf.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/submit.png">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased">
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center space-x-2">
        <span class="text-2xl">⚡</span>
        <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-emerald-400">Shelf</span></span>
      </a>
      <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">&larr; Back to Marketplace</a>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-12">
    <h1 class="text-3xl font-extrabold text-white mb-2">Submit Your MCP Server</h1>
    <p class="text-sm text-slate-400 mb-8">Register your Model Context Protocol server. Submissions are synchronized with both MCPShelf and the official MCP Registry.</p>

    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Server Name (Namespace / Identifier)</label>
          <input type="text" placeholder="e.g. io.github.my-org/my-mcp-server" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Title & One-line Description</label>
          <input type="text" placeholder="e.g. PostgreSQL Query Guardrail & Sandboxing Engine" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">GitHub Repository URL</label>
          <input type="url" placeholder="https://github.com/my-org/my-mcp-server" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Category</label>
          <select class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">server.json Manifest</label>
          <textarea rows="6" placeholder="Paste your official server.json here..." class="w-full px-3 py-2 bg-slate-950 font-mono border border-slate-700 rounded-lg text-xs text-emerald-400"></textarea>
        </div>
        <button class="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition">
          Submit via GitHub Pull Request &rarr;
        </button>
      </div>
    </div>
  </main>
</body>
</html>`;
}

function generateServerDetailHtml(server: any, categories: Category[]): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(server.title)} - MCP Server Security Audit & 1-Click Install</title>
  <meta name="description" content="${escapeHtml(server.description)}">
  <link rel="canonical" href="https://mcp.ritualdev.in/servers/${slugify(server.id)}.html">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- OpenGraph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mcp.ritualdev.in/servers/${slugify(server.id)}.html">
  <meta property="og:title" content="${escapeHtml(server.title)} - MCP Server">
  <meta property="og:description" content="${escapeHtml(server.description)}">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/${slugify(server.id)}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:title" content="${escapeHtml(server.title)} - MCP Server">
  <meta name="twitter:description" content="${escapeHtml(server.description)}">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/${slugify(server.id)}.png">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased">
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center space-x-2">
        <span class="text-2xl">⚡</span>
        <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-emerald-400">Shelf</span></span>
      </a>
      <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">&larr; Back to Directory</a>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 py-12">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-bold px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-400">
          ${server.category}
        </span>
        <span class="text-xs font-bold text-emerald-400 flex items-center gap-1">
          🛡️ Trust Score: ${server.trustScore}/10 (${server.securityRating})
        </span>
      </div>

      <h1 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(server.title)}</h1>
      <p class="text-xs font-mono text-slate-400 mb-4">${server.id} (v${server.version})</p>
      <p class="text-sm text-slate-300 leading-relaxed mb-6">${escapeHtml(server.description)}</p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs mb-6">
        <div><span class="text-slate-500 block">Rating:</span> <strong class="text-white">★ ${server.averageRating} (${server.reviewsCount})</strong></div>
        <div><span class="text-slate-500 block">Estimated Installs:</span> <strong class="text-white">${server.estimatedInstalls.toLocaleString()}</strong></div>
        <div><span class="text-slate-500 block">Transport:</span> <strong class="text-white">${server.transportType}</strong></div>
        <div><span class="text-slate-500 block">Author:</span> <strong class="text-white">${escapeHtml(server.author)}</strong></div>
      </div>

      <h3 class="text-sm font-bold text-white mb-2">1-Click Claude Desktop Configuration</h3>
      <pre class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto mb-4">${server.installSnippets.claudeDesktop}</pre>

      <div class="flex items-center gap-3">
        ${server.repositoryUrl ? `<a href="${server.repositoryUrl}" target="_blank" class="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition">View GitHub Repository &rarr;</a>` : ''}
        <a href="/boost.html" class="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition">🚀 Boost This Server</a>
      </div>
    </div>
  </main>
</body>
</html>`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
