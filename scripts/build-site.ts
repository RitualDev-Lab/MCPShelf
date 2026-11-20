import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateDigestFiles } from './generate-digest.js';

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

function getCapabilities(server: any): Array<{ icon: string; label: string }> {
  const caps: Array<{ icon: string; label: string }> = [];
  const text = `${server.title || ''} ${server.description || ''} ${server.category || ''} ${server.id || ''}`.toLowerCase();

  if (text.includes('database') || text.includes('sql') || text.includes('storage') || text.includes('postgres') || text.includes('mongo') || text.includes('sqlite') || text.includes('redis') || text.includes('db') || server.category === 'databases') {
    caps.push({ icon: '🗄️', label: 'Database' });
  }
  if (text.includes('file') || text.includes('filesystem') || text.includes('dir') || text.includes('ast') || text.includes('code') || text.includes('git') || text.includes('repo')) {
    caps.push({ icon: '📁', label: 'Filesystem' });
  }
  if (text.includes('web') || text.includes('http') || text.includes('browser') || text.includes('scrape') || text.includes('api') || text.includes('network') || text.includes('fetch') || text.includes('url') || server.category === 'web-automation') {
    caps.push({ icon: '🌐', label: 'Network' });
  }
  if (text.includes('exec') || text.includes('process') || text.includes('terminal') || text.includes('shell') || text.includes('command') || text.includes('docker') || text.includes('cli')) {
    caps.push({ icon: '⚙️', label: 'Process' });
  }
  if (server.trustScore >= 9.0) {
    caps.push({ icon: '🔒', label: 'Sandboxed' });
  }
  return caps;
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

  // Build Weekly AI Agent Digest & RSS/JSON Feeds
  generateDigestFiles();

  console.log('✅ [MCPShelf SSG] Build complete!');
}

function generateIndexHtml(catalog: any[], categories: Category[], activeBoosts: BoostInfo[]): string {
  const heroBoosts = catalog.filter(c => c.boost?.tier === 'hero' || c.boost?.tier === 'spotlight');

  // Category counts
  const categoryCounts: Record<string, number> = { all: catalog.length };
  for (const c of categories) {
    categoryCounts[c.id] = catalog.filter(s => s.category?.toLowerCase() === c.id.toLowerCase()).length;
  }

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCPShelf - Next-Gen Model Context Protocol (MCP) Registry & AI Agent Stack Builder</title>
  <meta name="description" content="The world's most advanced Model Context Protocol directory. Instant full-text fuzzy search, security trust ratings, and 1-click multi-server stack builder for Claude Desktop, Cursor, Windsurf, and Zed.">
  <link rel="canonical" href="https://mcp.ritualdev.in/">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- Feeds -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://mcp.ritualdev.in/">
  <meta property="og:title" content="MCPShelf - Next-Gen Model Context Protocol (MCP) Registry & Stack Builder">
  <meta property="og:description" content="Instant multi-field search, cryptographic security ratings, and 1-click bundle export for Claude Desktop, Cursor, Windsurf, and Zed.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/default.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:title" content="MCPShelf - Next-Gen Model Context Protocol (MCP) Registry & Stack Builder">
  <meta name="twitter:description" content="Instant search, security ratings, and multi-server config export for Claude, Cursor, and Zed.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/default.png">

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#ecfdf5', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857' },
            dark: { 950: '#030712', 900: '#0b0f19', 850: '#111827', 800: '#1f2937', 700: '#374151' }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #030712; color: #f3f4f6; }
    .glass-card {
      background: rgba(17, 24, 39, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-card:hover {
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 10px 30px -10px rgba(16, 185, 129, 0.15);
    }
    .hero-mesh {
      background: radial-gradient(circle at 50% -10%, rgba(16, 185, 129, 0.15), transparent 60%),
                  radial-gradient(circle at 90% 20%, rgba(6, 182, 212, 0.1), transparent 50%),
                  radial-gradient(circle at 10% 40%, rgba(139, 92, 246, 0.08), transparent 50%);
    }
    .mark-highlight {
      background: rgba(16, 185, 129, 0.25);
      color: #6ee7b7;
      padding: 0 2px;
      border-radius: 3px;
      font-weight: 600;
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #030712; }
    ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #374151; }
  </style>
</head>
<body class="min-h-screen font-sans antialiased hero-mesh selection:bg-brand-500 selection:text-black">

  <!-- Sticky Cyber Header -->
  <header class="border-b border-slate-800/80 bg-dark-950/85 backdrop-blur-md sticky top-0 z-40 transition-all">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <a href="/" class="flex items-center space-x-2 group">
          <span class="text-2xl transition-transform group-hover:scale-110">⚡</span>
          <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-brand-500">Shelf</span></span>
        </a>
        <span class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          v1.3 Official Mirror
        </span>
      </div>

      <div class="flex items-center space-x-2 sm:space-x-3">
        <a href="/digest.html" class="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition">
          <span>📰</span>
          <span>Weekly Digest</span>
        </a>
        <a href="/boost.html" class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition">
          <span>🚀</span>
          <span>Boost</span>
        </a>
        <button onclick="openBundleModal()" id="navStackBtn" class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 transition">
          <span>🎒</span>
          <span>Stack (<span id="navStackCount">0</span>)</span>
        </button>
        <button onclick="copyCliExplore()" title="Copy CLI Command" class="hidden md:inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-mono bg-dark-900 border border-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-slate-700 transition">
          <span class="text-emerald-400">&gt;_</span>
          <span>npx mcpshelf</span>
        </button>
        <a href="/submit.html" class="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-lg shadow-emerald-500/15">
          + Submit MCP
        </a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" target="_blank" class="p-1.5 text-slate-400 hover:text-white transition" title="GitHub">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section with Distinct Visual Punch -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 text-emerald-400 border border-emerald-500/25 mb-4 shadow-sm">
      <span>🚀 The Next-Gen Model Context Protocol Registry</span>
      <span class="text-slate-500">•</span>
      <span class="text-slate-300">Synchronized Daily</span>
    </div>
    
    <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
      Build Autonomous Agent Stacks with <br class="hidden sm:inline">
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Production-Ready MCP Tools</span>
    </h1>
    
    <p class="max-w-3xl mx-auto text-base sm:text-lg text-slate-400 mb-8 leading-relaxed">
      Instant multi-field fuzzy search, cryptographic security ratings, and 1-click bundle export for <strong>Claude Desktop</strong>, <strong>Cursor</strong>, <strong>Windsurf</strong>, and <strong>Zed</strong>.
    </p>

    <!-- Key Metrics Ribbon -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8">
      <div class="glass-card rounded-xl p-3 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-white flex items-center justify-center gap-1.5">
          <span class="text-brand-500">●</span> 419+
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Verified MCP Servers</div>
      </div>
      <div class="glass-card rounded-xl p-3 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
          <span>🛡️</span> 100%
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Zero-Leak Audited</div>
      </div>
      <div class="glass-card rounded-xl p-3 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-amber-400 flex items-center justify-center gap-1.5">
          <span>⚡</span> 5 Clients
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Claude, Cursor, Zed+</div>
      </div>
      <div class="glass-card rounded-xl p-3 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-cyan-400 flex items-center justify-center gap-1.5">
          <span>🎒</span> Multi-Stack
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Bundle Config Builder</div>
      </div>
    </div>

    <!-- OmniSearch Control Box -->
    <div class="max-w-3xl mx-auto relative mb-6">
      <div class="relative flex items-center">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <svg class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          type="text"
          id="searchInput"
          placeholder="Search 419+ servers by keyword, title, tag, or author (e.g. postgres, secret, dodo, github, puppeteer)..."
          class="w-full pl-12 pr-28 py-4 bg-slate-900/90 border-2 border-slate-700/80 hover:border-slate-600 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 rounded-2xl text-white placeholder-slate-400 text-sm sm:text-base shadow-2xl transition-all duration-200 outline-none"
        />
        <!-- Clear Button & Keyboard Badge -->
        <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center space-x-2">
          <button id="searchClearBtn" onclick="clearSearch()" class="hidden text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition">
            ✕
          </button>
          <kbd class="hidden sm:inline-flex items-center px-2 py-1 text-[11px] font-mono text-slate-400 bg-slate-800/80 rounded-lg border border-slate-700 shadow-inner">
            / or ⌘K
          </kbd>
        </div>
      </div>
    </div>

    <!-- Category Filter Pills with Dynamic Counts -->
    <div class="flex flex-wrap items-center justify-center gap-2 max-w-5xl mx-auto mb-4" id="categoryFilters">
      <button onclick="filterCategory('all')" data-cat="all" class="cat-pill active px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 text-black shadow-lg shadow-brand-500/20 transition-all">
        🌐 All Categories (<span id="cat-count-all">${catalog.length}</span>)
      </button>
      ${categories.map(cat => `
        <button onclick="filterCategory('${cat.id}')" data-cat="${cat.id}" class="cat-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5">
          <span>${cat.icon}</span>
          <span>${cat.name}</span>
          <span class="text-[10px] text-slate-400 px-1.5 py-0.2 rounded-full bg-slate-800/80" id="cat-count-${cat.id}">${categoryCounts[cat.id] || 0}</span>
        </button>
      `).join('')}
    </div>

    <!-- Secondary Filter & Controls Toolbar -->
    <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 pt-3 pb-2 text-xs text-slate-400 border-t border-slate-800/60">
      
      <!-- Left Filters: Client & Security -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-slate-500 font-semibold text-[11px]">Client:</span>
        <button onclick="filterClient('all')" data-client="all" class="client-pill active px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">All</button>
        <button onclick="filterClient('claude')" data-client="claude" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Claude</button>
        <button onclick="filterClient('cursor')" data-client="cursor" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Cursor</button>
        <button onclick="filterClient('windsurf')" data-client="windsurf" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Windsurf</button>
        <button onclick="filterClient('zed')" data-client="zed" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Zed</button>
        
        <span class="text-slate-500 font-semibold text-[11px] ml-2">Trust:</span>
        <button onclick="filterSecurity('all')" data-sec="all" class="sec-pill active px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">All</button>
        <button onclick="filterSecurity('gold')" data-sec="gold" class="sec-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">🛡️ 9.5+ Gold</button>
      </div>

      <!-- Right Sort & View Controls -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 text-[11px]">Sort:</span>
          <select id="sortSelect" onchange="triggerFilter()" class="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
            <option value="trending">🔥 Promoted & Trending</option>
            <option value="trust">🛡️ Highest Trust Score</option>
            <option value="installs">📈 Most Installs</option>
            <option value="rating">⭐ Top Rated</option>
            <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
          </select>
        </div>

        <!-- View Switcher -->
        <div class="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
          <button onclick="setViewMode('grid')" id="viewGridBtn" class="p-1 rounded text-emerald-400 bg-slate-800" title="Grid View">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </button>
          <button onclick="setViewMode('table')" id="viewTableBtn" class="p-1 rounded text-slate-500 hover:text-white" title="Table View">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Filter Summary Bar -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-bold text-white" id="filterSummaryTitle">All Verified Servers</span>
      <span id="resultCount" class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        ${catalog.length} servers
      </span>
    </div>
    <button onclick="resetAllFilters()" id="resetFiltersBtn" class="hidden text-xs text-amber-400 hover:text-amber-300 font-semibold transition">
      ✕ Reset All Filters
    </button>
  </div>

  <!-- Cards Grid Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
    <div id="cardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${catalog.map(server => {
        const slug = slugify(server.id);
        const boost = server.boost;
        const caps = getCapabilities(server);

        return `
          <div class="server-card glass-card rounded-2xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between relative group"
               id="card-${escapeHtml(server.id)}"
               data-id="${escapeHtml(server.id)}"
               data-title="${escapeHtml(server.title.toLowerCase())}"
               data-desc="${escapeHtml((server.description || '').toLowerCase())}"
               data-cat="${server.category}"
               data-author="${escapeHtml((server.author || '').toLowerCase())}"
               data-pkg="${escapeHtml((server.packageIdentifier || '').toLowerCase())}"
               data-trust="${server.trustScore}"
               data-installs="${server.estimatedInstalls}"
               data-rating="${server.averageRating}"
               data-boost="${boost ? boost.tier : 'none'}">
            
            <div>
              <!-- Card Header -->
              <div class="flex items-center justify-between mb-3 gap-2">
                <span class="text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 truncate">
                  ${server.category}
                </span>

                <div class="flex items-center gap-1.5 shrink-0">
                  ${boost ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black shadow">
                      ⭐ ${escapeHtml(boost.badge || 'Featured')}
                    </span>
                  ` : ''}
                  <span class="text-xs font-bold ${server.trustScore >= 9.0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-amber-300 bg-amber-500/10 border-amber-500/25'} px-2 py-0.5 rounded-lg border flex items-center gap-1">
                    🛡️ ${server.trustScore}/10
                  </span>
                </div>
              </div>

              <!-- Title & Verified Mark -->
              <h3 class="text-base font-bold text-white mb-1.5 flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                <a href="/servers/${slug}.html" class="line-clamp-1">${escapeHtml(server.title)}</a>
                ${server.name?.startsWith('io.github.RitualDev-Lab/') ? '<span title="RitualDev Lab Verified" class="text-emerald-400 text-xs">✓</span>' : ''}
              </h3>

              <!-- Description -->
              <p class="text-xs text-slate-400 mb-3.5 line-clamp-2 leading-relaxed card-desc">
                ${escapeHtml(server.description)}
              </p>

              <!-- Capability Matrix Tags -->
              <div class="flex flex-wrap gap-1.5 mb-4">
                ${caps.map(c => `
                  <span class="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                    <span>${c.icon}</span>
                    <span>${c.label}</span>
                  </span>
                `).join('')}
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="pt-3.5 border-t border-slate-800/80">
              <div class="text-[11px] text-slate-400 flex items-center justify-between mb-3">
                <span class="flex items-center gap-1">★ ${server.averageRating} <span class="text-slate-500">(${server.reviewsCount})</span></span>
                <span class="text-slate-400 font-medium">${server.estimatedInstalls.toLocaleString()} installs</span>
                <span class="font-mono text-[10px] text-slate-500 uppercase">${server.transportType}</span>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="openInstallModal('${escapeHtml(server.id)}')" class="flex-1 py-1.5 px-2.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black transition shadow flex items-center justify-center gap-1">
                  <span>⚡</span>
                  <span>Install</span>
                </button>
                <button onclick="toggleStack('${escapeHtml(server.id)}')" id="stack-btn-${escapeHtml(server.id)}" class="stack-btn py-1.5 px-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition flex items-center gap-1" title="Add to Multi-Server Stack">
                  <span>+</span>
                  <span>Stack</span>
                </button>
                <button onclick="quickCopyTerminal('${escapeHtml(server.installSnippets?.terminal || `npx -y ${server.packageIdentifier || server.id}`)}', event)" class="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition" title="Copy Direct Terminal Run Command">
                  📋
                </button>
                <a href="/servers/${slug}.html" class="p-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition" title="View Documentation">
                  &rarr;
                </a>
              </div>
            </div>

          </div>
        `;
      }).join('')}
    </div>

    <!-- Empty State -->
    <div id="emptyState" class="hidden text-center py-20 glass-card rounded-3xl max-w-xl mx-auto my-12 border-slate-800">
      <span class="text-4xl block mb-3">🔍</span>
      <h3 class="text-xl font-bold text-white mb-2">No MCP Servers Found</h3>
      <p class="text-xs text-slate-400 mb-6 max-w-md mx-auto">
        No tools matched your active search query and filters. Try broader keywords or explore popular tags below.
      </p>
      <div class="flex flex-wrap justify-center gap-2 mb-6">
        <button onclick="quickSearch('security')" class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-emerald-400 border border-slate-700">#security</button>
        <button onclick="quickSearch('postgres')" class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-emerald-400 border border-slate-700">#postgres</button>
        <button onclick="quickSearch('github')" class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-emerald-400 border border-slate-700">#github</button>
        <button onclick="quickSearch('puppeteer')" class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-emerald-400 border border-slate-700">#puppeteer</button>
        <button onclick="quickSearch('dodo')" class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-emerald-400 border border-slate-700">#dodo</button>
        <button onclick="quickSearch('docker')" class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-emerald-400 border border-slate-700">#docker</button>
      </div>
      <a href="/submit.html" class="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition">
        + Submit this MCP Server
      </a>
    </div>
  </main>

  <!-- Floating Multi-Server Stack Builder Drawer -->
  <div id="stackDrawer" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border-2 border-emerald-500/50 rounded-2xl shadow-2xl px-6 py-4 backdrop-blur-2xl flex items-center gap-6 transition-all duration-300 translate-y-32 opacity-0 pointer-events-none max-w-3xl w-[92vw]">
    <div class="flex items-center gap-3 overflow-hidden">
      <span class="text-2xl animate-bounce">🎒</span>
      <div>
        <div class="text-xs font-bold text-white flex items-center gap-2">
          <span>My AI Agent Tool Stack</span>
          <span id="stackCountBadge" class="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-extrabold shadow">0 tools</span>
        </div>
        <div id="stackPreviewNames" class="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md"></div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0 ml-auto">
      <button onclick="openBundleModal()" class="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
        <span>⚡</span>
        <span>Export Config Bundle</span>
      </button>
      <button onclick="clearStack()" class="p-2 text-slate-400 hover:text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition" title="Clear Stack">✕</button>
    </div>
  </div>

  <!-- Multi-Server Bundle Export Modal -->
  <div id="bundleModal" class="fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div class="glass-card max-w-2xl w-full rounded-3xl p-6 sm:p-8 border-slate-700 shadow-2xl relative">
      <button onclick="closeBundleModal()" class="absolute top-5 right-5 text-slate-400 hover:text-white text-xl">&times;</button>
      <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
        <span>🎒</span> Multi-Server Stack Exporter
      </div>
      <h3 class="text-2xl font-bold text-white mb-2">Unified AI Agent Configuration</h3>
      <p class="text-xs text-slate-400 mb-6">
        Export a single merged configuration containing all <span id="bundleToolCount" class="text-emerald-400 font-bold">0</span> selected MCP servers for your target AI editor.
      </p>

      <!-- Client Tabs -->
      <div class="flex border-b border-slate-700 mb-4 text-xs font-semibold overflow-x-auto gap-2">
        <button onclick="switchBundleTab('claude')" id="btab-claude" class="btab-btn active px-4 py-2 border-b-2 border-brand-500 text-brand-400">Claude Desktop</button>
        <button onclick="switchBundleTab('cursor')" id="btab-cursor" class="btab-btn px-4 py-2 text-slate-400 hover:text-white">Cursor IDE</button>
        <button onclick="switchBundleTab('windsurf')" id="btab-windsurf" class="btab-btn px-4 py-2 text-slate-400 hover:text-white">Windsurf</button>
        <button onclick="switchBundleTab('zed')" id="btab-zed" class="btab-btn px-4 py-2 text-slate-400 hover:text-white">Zed Editor</button>
        <button onclick="switchBundleTab('terminal')" id="btab-terminal" class="btab-btn px-4 py-2 text-slate-400 hover:text-white">Chained CLI</button>
      </div>

      <!-- Config Code Box -->
      <div class="relative mb-5">
        <pre id="bundleCode" class="bg-dark-950 border border-slate-800 rounded-2xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto max-h-72"></pre>
        <button onclick="copyBundleSnippet()" id="bundleCopyBtn" class="absolute top-3 right-3 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition shadow">
          Copy All
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span id="bundleTabPath" class="text-slate-400 text-[11px]">Paste into: claude_desktop_config.json</span>
        <div class="flex items-center gap-2">
          <button onclick="downloadBundleJson()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold transition">
            💾 Download .json
          </button>
          <button onclick="copyShareStackUrl()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-semibold transition">
            🔗 Share Stack URL
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Standard 1-Click Install Modal -->
  <div id="installModal" class="fixed inset-0 z-50 hidden bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
    <div class="glass-card max-w-xl w-full rounded-3xl p-6 border-slate-700 shadow-2xl relative">
      <button onclick="closeInstallModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg">&times;</button>
      <h3 id="modalTitle" class="text-xl font-bold text-white mb-1">Install MCP Server</h3>
      <p id="modalSubtitle" class="text-xs text-slate-400 mb-4">Choose your AI client to copy configuration</p>

      <!-- Client Tabs -->
      <div class="flex border-b border-slate-700 mb-4 text-xs font-semibold overflow-x-auto">
        <button onclick="switchTab('claude')" id="tab-claude" class="tab-btn active px-4 py-2 border-b-2 border-brand-500 text-brand-400">Claude Desktop</button>
        <button onclick="switchTab('cursor')" id="tab-cursor" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">Cursor</button>
        <button onclick="switchTab('windsurf')" id="tab-windsurf" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">Windsurf</button>
        <button onclick="switchTab('zed')" id="tab-zed" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">Zed</button>
        <button onclick="switchTab('terminal')" id="tab-terminal" class="tab-btn px-4 py-2 text-slate-400 hover:text-white">CLI</button>
      </div>

      <!-- Config Code Box -->
      <div class="relative mb-4">
        <pre id="modalCode" class="bg-dark-950 border border-slate-800 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto max-h-60"></pre>
        <button onclick="copySnippet()" id="copyBtn" class="absolute top-2.5 right-2.5 px-3 py-1 text-xs font-semibold rounded bg-emerald-500 hover:bg-emerald-400 text-black transition">
          Copy
        </button>
      </div>

      <div class="text-[11px] text-slate-400 flex items-center justify-between">
        <span id="tabPath">File: claude_desktop_config.json</span>
        <a id="modalDocsLink" href="#" target="_blank" class="text-brand-400 hover:underline">View Repository &rarr;</a>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-dark-950 py-12 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p>&copy; 2026 MCPShelf. Open-source under Apache-2.0. Built with ⚡ by <a href="https://ritualdev.in" class="text-brand-400 hover:underline">RitualDev Lab</a>.</p>
      <div class="flex items-center space-x-5">
        <a href="/digest.html" class="hover:text-slate-300">Weekly Digest</a>
        <a href="/feed.xml" class="hover:text-slate-300">RSS 2.0 Feed</a>
        <a href="/feed.json" class="hover:text-slate-300">JSON Feed 1.1</a>
        <a href="/boost.html" class="hover:text-slate-300">Promote Server</a>
        <a href="/submit.html" class="hover:text-slate-300">Submit Registry</a>
        <a href="/llms.txt" class="hover:text-slate-300">llms.txt</a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" class="hover:text-slate-300">GitHub</a>
      </div>
    </div>
  </footer>

  <!-- Embedded In-Memory Catalog for Instant Search -->
  <script>
    const CATALOG = ${JSON.stringify(catalog)};
    let activeCategory = 'all';
    let activeClient = 'all';
    let activeSecurity = 'all';
    let currentViewMode = 'grid';
    let currentServer = null;
    let currentTab = 'claude';
    let currentBundleTab = 'claude';
    const selectedStack = new Set();

    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const cardsGrid = document.getElementById('cardsGrid');
    const emptyState = document.getElementById('emptyState');
    const resultCount = document.getElementById('resultCount');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const stackDrawer = document.getElementById('stackDrawer');
    const stackCountBadge = document.getElementById('stackCountBadge');
    const stackPreviewNames = document.getElementById('stackPreviewNames');
    const navStackCount = document.getElementById('navStackCount');

    // Debounce search
    let searchDebounceTimer = null;
    searchInput.addEventListener('input', () => {
      searchClearBtn.classList.toggle('hidden', !searchInput.value);
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        triggerFilter();
      }, 30);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      if (e.key === 'Escape') {
        if (!document.getElementById('installModal').classList.contains('hidden')) {
          closeInstallModal();
        } else if (!document.getElementById('bundleModal').classList.contains('hidden')) {
          closeBundleModal();
        } else if (searchInput.value) {
          clearSearch();
        }
      }
    });

    function clearSearch() {
      searchInput.value = '';
      searchClearBtn.classList.add('hidden');
      triggerFilter();
      searchInput.focus();
    }

    function quickSearch(tag) {
      searchInput.value = tag;
      searchClearBtn.classList.remove('hidden');
      triggerFilter();
    }

    function filterCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.cat-pill').forEach(b => {
        const isMatch = b.dataset.cat === cat;
        b.classList.toggle('active', isMatch);
        b.classList.toggle('bg-brand-500', isMatch);
        b.classList.toggle('text-black', isMatch);
        b.classList.toggle('bg-slate-900/80', !isMatch);
        b.classList.toggle('text-slate-300', !isMatch);
      });
      triggerFilter();
    }

    function filterClient(client) {
      activeClient = client;
      document.querySelectorAll('.client-pill').forEach(b => {
        const isMatch = b.dataset.client === client;
        b.classList.toggle('active', isMatch);
        b.classList.toggle('bg-emerald-500/10', isMatch);
        b.classList.toggle('text-emerald-400', isMatch);
        b.classList.toggle('border-emerald-500/30', isMatch);
        b.classList.toggle('bg-slate-900', !isMatch);
        b.classList.toggle('text-slate-400', !isMatch);
        b.classList.toggle('border-slate-800', !isMatch);
      });
      triggerFilter();
    }

    function filterSecurity(sec) {
      activeSecurity = sec;
      document.querySelectorAll('.sec-pill').forEach(b => {
        const isMatch = b.dataset.sec === sec;
        b.classList.toggle('active', isMatch);
        b.classList.toggle('bg-emerald-500/10', isMatch);
        b.classList.toggle('text-emerald-400', isMatch);
        b.classList.toggle('border-emerald-500/30', isMatch);
        b.classList.toggle('bg-slate-900', !isMatch);
        b.classList.toggle('text-slate-400', !isMatch);
        b.classList.toggle('border-slate-800', !isMatch);
      });
      triggerFilter();
    }

    function setViewMode(mode) {
      currentViewMode = mode;
      const gridBtn = document.getElementById('viewGridBtn');
      const tableBtn = document.getElementById('viewTableBtn');

      if (mode === 'grid') {
        gridBtn.className = 'p-1 rounded text-emerald-400 bg-slate-800';
        tableBtn.className = 'p-1 rounded text-slate-500 hover:text-white';
        cardsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';
      } else {
        tableBtn.className = 'p-1 rounded text-emerald-400 bg-slate-800';
        gridBtn.className = 'p-1 rounded text-slate-500 hover:text-white';
        cardsGrid.className = 'grid grid-cols-1 gap-3';
      }
    }

    function resetAllFilters() {
      searchInput.value = '';
      searchClearBtn.classList.add('hidden');
      activeCategory = 'all';
      activeClient = 'all';
      activeSecurity = 'all';
      document.getElementById('sortSelect').value = 'trending';

      document.querySelectorAll('.cat-pill').forEach(b => {
        const isAll = b.dataset.cat === 'all';
        b.classList.toggle('active', isAll);
        b.classList.toggle('bg-brand-500', isAll);
        b.classList.toggle('text-black', isAll);
        b.classList.toggle('bg-slate-900/80', !isAll);
        b.classList.toggle('text-slate-300', !isAll);
      });

      filterClient('all');
      filterSecurity('all');
    }

    // Comprehensive Multi-Field Search & Filter Engine
    function triggerFilter() {
      const q = searchInput.value.toLowerCase().trim();
      const sort = document.getElementById('sortSelect').value;
      const tokens = q ? q.split(/\\s+/).filter(Boolean) : [];

      const isFiltered = q || activeCategory !== 'all' || activeClient !== 'all' || activeSecurity !== 'all';
      resetFiltersBtn.classList.toggle('hidden', !isFiltered);

      // Filter catalog
      let visibleServers = CATALOG.filter(server => {
        // Category check
        if (activeCategory !== 'all' && server.category?.toLowerCase() !== activeCategory.toLowerCase()) {
          return false;
        }

        // Security check
        if (activeSecurity === 'gold' && server.trustScore < 9.5) {
          return false;
        }

        // Client check
        if (activeClient !== 'all') {
          if (activeClient === 'zed' && !server.packageIdentifier && !server.id) return false;
        }

        // Full-Text Token search
        if (tokens.length > 0) {
          const searchable = \`\${server.title || ''} \${server.id || ''} \${server.description || ''} \${server.category || ''} \${server.packageIdentifier || ''} \${server.author || ''}\`.toLowerCase();
          for (const t of tokens) {
            if (!searchable.includes(t)) return false;
          }
        }

        return true;
      });

      // Sorting
      visibleServers.sort((a, b) => {
        if (sort === 'trending') {
          const boostWeightA = a.boost?.tier === 'hero' ? 3 : a.boost?.tier === 'spotlight' ? 2 : 0;
          const boostWeightB = b.boost?.tier === 'hero' ? 3 : b.boost?.tier === 'spotlight' ? 2 : 0;
          if (boostWeightA !== boostWeightB) return boostWeightB - boostWeightA;
          return b.trustScore - a.trustScore;
        }
        if (sort === 'trust') return b.trustScore - a.trustScore;
        if (sort === 'installs') return (b.estimatedInstalls || 0) - (a.estimatedInstalls || 0);
        if (sort === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
        if (sort === 'alphabetical') return a.title.localeCompare(b.title);
        return 0;
      });

      // Update Category Dynamic Counts
      const counts = { all: visibleServers.length };
      visibleServers.forEach(s => {
        const cat = s.category?.toLowerCase();
        counts[cat] = (counts[cat] || 0) + 1;
      });

      document.querySelectorAll('.cat-pill').forEach(b => {
        const c = b.dataset.cat;
        const span = document.getElementById('cat-count-' + c);
        if (span) span.textContent = counts[c] || 0;
      });

      // Toggle DOM Cards
      const cardMap = new Map();
      document.querySelectorAll('.server-card').forEach(el => {
        cardMap.set(el.dataset.id, el);
        el.style.display = 'none';
      });

      visibleServers.forEach(server => {
        const el = cardMap.get(server.id);
        if (el) {
          el.style.display = 'flex';
          cardsGrid.appendChild(el); // preserves sorted order
        }
      });

      resultCount.textContent = visibleServers.length + ' servers';
      emptyState.classList.toggle('hidden', visibleServers.length > 0);

      // Sync URL State
      syncUrlState();
    }

    function syncUrlState() {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
      if (activeCategory !== 'all') params.set('cat', activeCategory);
      if (activeClient !== 'all') params.set('client', activeClient);
      if (activeSecurity !== 'all') params.set('sec', activeSecurity);
      const sort = document.getElementById('sortSelect').value;
      if (sort !== 'trending') params.set('sort', sort);
      if (selectedStack.size > 0) params.set('stack', Array.from(selectedStack).join(','));

      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }

    // -------------------------------------------------------------
    // Multi-Server Stack Builder Logic
    // -------------------------------------------------------------
    function toggleStack(id) {
      const server = CATALOG.find(s => s.id === id);
      if (!server) return;

      const btn = document.getElementById('stack-btn-' + id);

      if (selectedStack.has(id)) {
        selectedStack.delete(id);
        if (btn) {
          btn.classList.remove('bg-emerald-500', 'text-black', 'border-emerald-400');
          btn.classList.add('bg-slate-800', 'text-slate-300');
          btn.innerHTML = '<span>+</span> <span>Stack</span>';
        }
        showToast('Removed ' + (server.name || server.title) + ' from Stack');
      } else {
        selectedStack.add(id);
        if (btn) {
          btn.classList.add('bg-emerald-500', 'text-black', 'border-emerald-400');
          btn.classList.remove('bg-slate-800', 'text-slate-300');
          btn.innerHTML = '<span>✓</span> <span>In Stack</span>';
        }
        showToast('Added ' + (server.name || server.title) + ' to Stack! 🎒');
      }

      updateStackUI();
      syncUrlState();
    }

    function clearStack() {
      selectedStack.forEach(id => {
        const btn = document.getElementById('stack-btn-' + id);
        if (btn) {
          btn.classList.remove('bg-emerald-500', 'text-black', 'border-emerald-400');
          btn.classList.add('bg-slate-800', 'text-slate-300');
          btn.innerHTML = '<span>+</span> <span>Stack</span>';
        }
      });
      selectedStack.clear();
      updateStackUI();
      syncUrlState();
      showToast('Cleared Agent Stack');
    }

    function updateStackUI() {
      const count = selectedStack.size;
      stackCountBadge.textContent = count + (count === 1 ? ' tool' : ' tools');
      navStackCount.textContent = count;

      if (count > 0) {
        const names = Array.from(selectedStack).map(id => {
          const s = CATALOG.find(x => x.id === id);
          return s ? (s.name || s.title.split(' ')[0]) : id;
        }).join(', ');
        stackPreviewNames.textContent = names;

        stackDrawer.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
        stackDrawer.classList.add('translate-y-0', 'opacity-100');
      } else {
        stackDrawer.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
        stackDrawer.classList.remove('translate-y-0', 'opacity-100');
      }
    }

    function openBundleModal() {
      if (selectedStack.size === 0) {
        showToast('Add tools to your stack first using "+ Stack" on any card!');
        return;
      }
      document.getElementById('bundleToolCount').textContent = selectedStack.size;
      switchBundleTab('claude');
      document.getElementById('bundleModal').classList.remove('hidden');
    }

    function closeBundleModal() {
      document.getElementById('bundleModal').classList.add('hidden');
    }

    function switchBundleTab(tab) {
      currentBundleTab = tab;
      document.querySelectorAll('.btab-btn').forEach(b => {
        b.classList.remove('border-b-2', 'border-brand-500', 'text-brand-400');
        b.classList.add('text-slate-400');
      });
      document.getElementById('btab-' + tab).classList.add('border-b-2', 'border-brand-500', 'text-brand-400');
      document.getElementById('btab-' + tab).classList.remove('text-slate-400');

      const codeBox = document.getElementById('bundleCode');
      const pathBox = document.getElementById('bundleTabPath');

      const tools = Array.from(selectedStack).map(id => CATALOG.find(s => s.id === id)).filter(Boolean);

      if (tab === 'claude' || tab === 'cursor' || tab === 'windsurf') {
        const mcpServers = {};
        tools.forEach(s => {
          const key = (s.name || s.id.split('/').pop() || 'server').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
          mcpServers[key] = {
            command: "npx",
            args: ["-y", s.packageIdentifier || s.id]
          };
        });

        const fullJson = JSON.stringify({ mcpServers }, null, 2);
        codeBox.textContent = fullJson;

        if (tab === 'claude') pathBox.textContent = 'Paste into: claude_desktop_config.json';
        if (tab === 'cursor') pathBox.textContent = 'Paste into: ~/.cursor/mcp.json';
        if (tab === 'windsurf') pathBox.textContent = 'Paste into: ~/.codeium/windsurf/mcp_config.json';
      } else if (tab === 'zed') {
        const context_servers = {};
        tools.forEach(s => {
          const key = (s.name || s.id.split('/').pop() || 'server').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
          context_servers[key] = {
            command: {
              env: {},
              path: "npx",
              args: ["-y", s.packageIdentifier || s.id]
            }
          };
        });
        codeBox.textContent = JSON.stringify({ context_servers }, null, 2);
        pathBox.textContent = 'Paste into: ~/.config/zed/settings.json';
      } else {
        const cmd = tools.map(s => \`npx -y \${s.packageIdentifier || s.id}\`).join(' & ');
        codeBox.textContent = cmd;
        pathBox.textContent = 'Run concurrently or in separate terminals';
      }
    }

    function copyBundleSnippet() {
      const text = document.getElementById('bundleCode').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('bundleCopyBtn');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('bg-white', 'text-black');
        showToast('Copied unified ' + currentBundleTab.toUpperCase() + ' bundle config! ✨');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('bg-white', 'text-black');
        }, 1800);
      });
    }

    function downloadBundleJson() {
      const text = document.getElementById('bundleCode').textContent;
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`mcpshelf-\${currentBundleTab}-bundle.json\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded ' + a.download);
    }

    function copyShareStackUrl() {
      const url = window.location.origin + '/?stack=' + Array.from(selectedStack).join(',');
      navigator.clipboard.writeText(url).then(() => {
        showToast('Copied shareable Stack Link to clipboard!');
      });
    }

    // -------------------------------------------------------------
    // Single Modal Install & Quick Copy
    // -------------------------------------------------------------
    function openInstallModal(id) {
      const s = CATALOG.find(x => x.id === id);
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
        pathBox.textContent = 'File: claude_desktop_config.json';
      } else if (tab === 'cursor') {
        codeBox.textContent = currentServer.installSnippets.cursorMcp;
        pathBox.textContent = 'File: ~/.cursor/mcp.json';
      } else if (tab === 'windsurf') {
        codeBox.textContent = currentServer.installSnippets.windsurf;
        pathBox.textContent = 'File: ~/.codeium/windsurf/mcp_config.json';
      } else if (tab === 'zed') {
        const sid = (currentServer.name || currentServer.id.split('/').pop() || 'mcp').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        const zedObj = {
          "context_servers": {
            [sid]: {
              "command": {
                "env": {},
                "path": "npx",
                "args": ["-y", currentServer.packageIdentifier || currentServer.id]
              }
            }
          }
        };
        codeBox.textContent = JSON.stringify(zedObj, null, 2);
        pathBox.textContent = 'File: ~/.config/zed/settings.json';
      } else {
        codeBox.textContent = currentServer.installSnippets.terminal || \`npx -y \${currentServer.packageIdentifier || currentServer.id}\`;
        pathBox.textContent = 'Run directly in your terminal prompt';
      }
    }

    function copySnippet() {
      const text = document.getElementById('modalCode').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('bg-brand-500', 'text-black');
        showToast('Copied ' + currentTab.toUpperCase() + ' snippet to clipboard!');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('bg-brand-500', 'text-black');
        }, 1800);
      });
    }

    function quickCopyTerminal(cmd, event) {
      if (event) event.stopPropagation();
      navigator.clipboard.writeText(cmd).then(() => {
        showToast('Copied CLI run command!');
      });
    }

    function copyCliExplore() {
      navigator.clipboard.writeText('npx @ritualdev-lab/mcpshelf explore').then(() => {
        showToast('Copied "npx @ritualdev-lab/mcpshelf explore" to clipboard!');
      });
    }

    function showToast(msg) {
      let toast = document.getElementById('toastNotification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.className = 'fixed bottom-5 right-5 z-50 bg-emerald-500 text-black px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-4';
        document.body.appendChild(toast);
      }
      toast.innerHTML = '<span>⚡</span> <span>' + msg + '</span>';
      toast.classList.remove('opacity-0', 'translate-y-4');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
      }, 2500);
    }

    // Restore URL State upon initial load
    window.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('q');
      const cat = urlParams.get('cat');
      const client = urlParams.get('client');
      const sec = urlParams.get('sec');
      const sort = urlParams.get('sort');
      const stack = urlParams.get('stack');

      if (q) {
        searchInput.value = q;
        searchClearBtn.classList.remove('hidden');
      }
      if (cat) filterCategory(cat);
      if (client) filterClient(client);
      if (sec) filterSecurity(sec);
      if (sort) document.getElementById('sortSelect').value = sort;

      if (stack) {
        stack.split(',').filter(Boolean).forEach(id => {
          const s = CATALOG.find(x => x.id === id || x.id.toLowerCase().includes(id.toLowerCase()));
          if (s) {
            selectedStack.add(s.id);
            const btn = document.getElementById('stack-btn-' + s.id);
            if (btn) {
              btn.classList.add('bg-emerald-500', 'text-black', 'border-emerald-400');
              btn.classList.remove('bg-slate-800', 'text-slate-300');
              btn.innerHTML = '<span>✓</span> <span>In Stack</span>';
            }
          }
        });
        updateStackUI();
      }

      if (q || cat || client || sec || sort) {
        triggerFilter();
      }
    });
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

  <!-- Feeds -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">

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
      <div class="flex items-center space-x-4">
        <a href="/digest.html" class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">📰 Weekly Digest</a>
        <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">&larr; Back to Marketplace</a>
      </div>
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

  <!-- Feeds -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">

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
      <div class="flex items-center space-x-4">
        <a href="/digest.html" class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">📰 Weekly Digest</a>
        <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">&larr; Back to Marketplace</a>
      </div>
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

  <!-- Feeds -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">

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
      <div class="flex items-center space-x-4">
        <a href="/digest.html" class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition">📰 Weekly Digest</a>
        <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">&larr; Back to Directory</a>
      </div>
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
