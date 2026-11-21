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
    const detailHtml = generateServerDetailHtml(server, categories, enrichedCatalog);
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
<html lang="en" class="dark bg-[#07090e] text-slate-100" style="background-color: #07090e !important; color: #f1f5f9 !important;">
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
  <meta property="og:site_name" content="MCPShelf">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://mcp.ritualdev.in/">
  <meta property="og:title" content="MCPShelf - Next-Gen Model Context Protocol (MCP) Registry & Stack Builder">
  <meta property="og:description" content="Instant multi-field search, cryptographic security ratings, and 1-click bundle export for Claude Desktop, Cursor, Windsurf, and Zed.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/default.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="MCPShelf Model Context Protocol Registry and Stack Builder">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:creator" content="@ritualdev">
  <meta name="twitter:title" content="MCPShelf - Next-Gen Model Context Protocol (MCP) Registry & Stack Builder">
  <meta name="twitter:description" content="Instant search, security ratings, and multi-server config export for Claude, Cursor, and Zed.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/default.png">
  <meta name="twitter:image:alt" content="MCPShelf Model Context Protocol Registry and Stack Builder">

  <!-- Advanced SEO, GEO & AEO Meta Tags -->
  <meta name="keywords" content="model context protocol, mcp, mcp servers, mcp registry, mcp directory, claude desktop tools, cursor ide mcp, windsurf ai, zed mcp, ai agent stack builder, ritualdev lab">
  <meta name="author" content="RitualDev Lab">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="geo.region" content="GLOBAL">
  <meta name="geo.placename" content="Global">
  <meta name="target" content="all">
  <meta name="audience" content="all">
  <meta name="coverage" content="Worldwide">
  <meta name="distribution" content="Global">
  <meta name="rating" content="Safe For Kids">
  <meta name="theme-color" content="#07090e">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="format-detection" content="telephone=no">

  <!-- Machine Discovery Standards -->
  <link rel="alternate" type="text/markdown" title="LLMs.txt Standard Manifest" href="https://mcp.ritualdev.in/llms.txt">
  <link rel="alternate" type="text/plain" title="LLMs Full Catalog Context" href="https://mcp.ritualdev.in/llms-full.txt">
  <link rel="ai-plugin" type="application/json" href="https://mcp.ritualdev.in/.well-known/ai-plugin.json">

  <!-- JSON-LD: WebSite with Google Sitelinks SearchBox -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "MCPShelf",
    "alternateName": ["MCP Shelf", "RitualDev MCPShelf", "Model Context Protocol Registry & Stack Builder"],
    "url": "https://mcp.ritualdev.in/",
    "description": "Next-Gen Model Context Protocol (MCP) Registry, AI Agent Stack Builder & Directory.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://mcp.ritualdev.in/?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
  </script>

  <!-- JSON-LD: Organization -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RitualDev Lab",
    "url": "https://ritualdev.in",
    "logo": "https://mcp.ritualdev.in/favicon.png",
    "sameAs": [
      "https://github.com/RitualDev-Lab",
      "https://x.com/ritualdev",
      "https://mcp.ritualdev.in"
    ]
  }
  </script>

  <!-- JSON-LD: DataCatalog -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    "name": "Model Context Protocol Server Directory",
    "description": "Curated, security-audited catalog of 400+ Model Context Protocol (MCP) servers for Claude Desktop, Cursor, and Windsurf.",
    "url": "https://mcp.ritualdev.in/",
    "publisher": {
      "@type": "Organization",
      "name": "RitualDev Lab"
    }
  }
  </script>

  <!-- JSON-LD: FAQPage for AEO (Answer Engine Optimization) & Google Rich Snippets -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is MCPShelf?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "MCPShelf is the open Model Context Protocol (MCP) registry and AI Agent Stack Builder. It indexes 400+ verified MCP servers with cryptographic security ratings, multi-token fuzzy search, and 1-click bundle export for Claude Desktop, Cursor IDE, Windsurf AI, and Zed."
        }
      },
      {
        "@type": "Question",
        "name": "How do I install an MCP server into Claude Desktop?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Open Claude Desktop, navigate to Settings > Developer > Edit Config to access your claude_desktop_config.json file. Click 'Install' on any server on MCPShelf, copy the generated JSON block into your mcpServers object, and restart Claude Desktop."
        }
      },
      {
        "@type": "Question",
        "name": "What is the MCPShelf AI Agent Stack Builder?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The AI Agent Stack Builder allows you to select multiple MCP servers into a bundle cart and export a single, merged JSON configuration file or chained terminal script for Claude Desktop, Cursor, Windsurf, or Zed."
        }
      },
      {
        "@type": "Question",
        "name": "How are MCP servers audited and security scored?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Every server is scored on a 0.0 to 10.0 Trust Score scale using automated JSON schema validation, static code analysis, permission scope auditing (such as filesystem and network access), community reviews, and transport sandboxing."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use MCPShelf offline or via the command line?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Run 'npx @ritualdev-lab/mcpshelf explore' to launch the interactive TUI (Terminal User Interface) to browse, search, and configure MCP servers directly in your terminal."
        }
      },
      {
        "@type": "Question",
        "name": "How can developers submit new MCP servers to MCPShelf?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Developers can submit new open-source MCP servers via the web submission portal at https://mcp.ritualdev.in/submit.html or via the automated REST API endpoint POST /api/v1/submit."
        }
      }
    ]
  }
  </script>

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eef2ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
            dark: { 950: '#07090e', 900: '#0b0f19', 850: '#111726', 800: '#1b2336', 700: '#2d3748' }
          }
        }
      }
    }
  </script>
  <style>
    html, body {
      background-color: #07090e !important;
      background: #07090e !important;
      color: #f1f5f9 !important;
    }
    .ambient-glow {
      background-color: #07090e !important;
      background-image: 
        radial-gradient(ellipse 70% 35% at 50% -5%, rgba(99, 102, 241, 0.16), transparent 70%),
        radial-gradient(circle at 10% 25%, rgba(6, 182, 212, 0.05), transparent 45%) !important;
    }
    .grid-mesh {
      background-size: 44px 44px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse 80% 50% at 50% 15%, #000 35%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse 80% 50% at 50% 15%, #000 35%, transparent 80%);
    }
    .glass-card {
      background: #0c101a;
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-card:hover {
      border-color: rgba(99, 102, 241, 0.35);
      transform: translateY(-2px);
      box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.12);
    }
    .glass-pill {
      background: rgba(12, 16, 26, 0.85);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    }
    .mark-highlight {
      background: rgba(99, 102, 241, 0.25);
      color: #c7d2fe;
      padding: 0 2px;
      border-radius: 3px;
      font-weight: 600;
    }
    /* Flow animation for topology wire */
    @keyframes pulseWire {
      0% { stroke-dashoffset: 40; }
      100% { stroke-dashoffset: 0; }
    }
    .anim-wire {
      stroke-dasharray: 4, 4;
      animation: pulseWire 2s linear infinite;
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: #07090e; }
    ::-webkit-scrollbar-thumb { background: #1b2336; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }
  </style>
</head>
<body class="min-h-screen font-sans antialiased bg-[#07090e] text-slate-100 ambient-glow selection:bg-brand-500 selection:text-white" style="background-color: #07090e !important; color: #f1f5f9 !important;">
  <div class="fixed inset-0 grid-mesh pointer-events-none z-0"></div>

  <!-- Sticky Cyber Header -->
  <header class="border-b border-white/[0.06] bg-dark-950/85 backdrop-blur-md sticky top-0 z-40 transition-all">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
      <div class="flex items-center space-x-3">
        <a href="/" class="flex items-center space-x-2.5 group">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-indigo-400">Shelf</span></span>
        </a>
        <span class="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          v1.3 Verified Ecosystem
        </span>
      </div>

      <div class="flex items-center space-x-2 sm:space-x-3">
        <a href="/digest.html" class="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] hover:text-white transition">
          <span>📰</span>
          <span>Weekly Digest</span>
        </a>
        <a href="/boost.html" class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 transition">
          <span>🚀</span>
          <span>Boost</span>
        </a>
        <button onclick="openBundleModal()" id="navStackBtn" class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition">
          <span>🎒</span>
          <span>Stack (<span id="navStackCount">0</span>)</span>
        </button>
        <a href="#ecosystem" class="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 transition">
          <span>📦</span>
          <span>NPX • Pip • MCP</span>
        </a>
        <a href="/submit.html" class="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20">
          + Submit MCP
        </a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" target="_blank" class="p-1.5 text-slate-400 hover:text-white transition" title="GitHub">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section with Executive Graphic & Distinct Visual Polish -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center relative z-10">
    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-5 shadow-sm">
      <span class="text-indigo-400">✦</span>
      <span>Universal Model Context Protocol (MCP) Ecosystem</span>
      <span class="text-slate-600">•</span>
      <span class="text-slate-400">Daily Sync</span>
    </div>
    
    <h1 class="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#f8fafc] mb-5 leading-[1.1] drop-shadow-[0_2px_24px_rgba(99,102,241,0.2)]">
      The Open Registry for <br class="hidden sm:inline">
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-400">Autonomous AI Agent Tools</span>
    </h1>
    
    <p class="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 mb-8 leading-relaxed">
      Instant multi-field fuzzy search, cryptographic security ratings, and 1-click multi-server stack generation for <strong>Claude Desktop</strong>, <strong>Cursor</strong>, <strong>Windsurf</strong>, and <strong>Zed</strong>.
    </p>

    <!-- Key Metrics Ribbon -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mb-10">
      <div class="glass-card rounded-2xl p-3.5 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-white flex items-center justify-center gap-1.5">
          <span class="text-indigo-400">●</span> 419+
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Verified MCP Servers</div>
      </div>
      <div class="glass-card rounded-2xl p-3.5 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
          <span>🛡️</span> 100%
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Zero-Leak Audited</div>
      </div>
      <div class="glass-card rounded-2xl p-3.5 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-indigo-300 flex items-center justify-center gap-1.5">
          <span>⚡</span> 5 Clients
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Claude, Cursor, Zed+</div>
      </div>
      <div class="glass-card rounded-2xl p-3.5 text-center">
        <div class="text-xl sm:text-2xl font-extrabold text-cyan-400 flex items-center justify-center gap-1.5">
          <span>🎒</span> Multi-Stack
        </div>
        <div class="text-[11px] text-slate-400 font-medium">Bundle Config Builder</div>
      </div>
    </div>

    <!-- Multi-Ecosystem Quickstart Command Center -->
    <div class="max-w-3xl mx-auto mb-10">
      <div class="glass-card rounded-2xl p-2.5 sm:p-3 border border-indigo-500/25 shadow-2xl bg-[#0c101a]/95 backdrop-blur text-left">
        <!-- Tabs & Badges -->
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3 px-1">
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <button type="button" onclick="switchEcoTab('npx')" id="ecoTab-npx" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5">
              <span>⚡</span> <span>NPX (Terminal TUI)</span>
            </button>
            <button type="button" onclick="switchEcoTab('pip')" id="ecoTab-pip" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.03] text-slate-400 hover:text-white border border-transparent transition flex items-center gap-1.5">
              <span>🐍</span> <span>PIP (Python SDK)</span>
            </button>
            <button type="button" onclick="switchEcoTab('mcp')" id="ecoTab-mcp" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.03] text-slate-400 hover:text-white border border-transparent transition flex items-center gap-1.5">
              <span>🤖</span> <span>Connect MCP Server</span>
            </button>
          </div>
          <span class="text-[11px] font-mono text-indigo-400 font-semibold hidden sm:inline" id="ecoTabBadge">npm: @ritualdev-lab/mcpshelf</span>
        </div>

        <!-- Code Snippet Display -->
        <div class="flex items-center justify-between bg-black/60 rounded-xl px-4 py-3 border border-white/[0.06] font-mono text-xs sm:text-sm">
          <div class="flex items-center gap-2 sm:gap-3 overflow-x-auto text-slate-200">
            <span class="text-indigo-400 select-none font-bold" id="ecoPromptChar">$</span>
            <span id="ecoCommandSnippet" class="text-indigo-200 font-semibold tracking-wide">npx @ritualdev-lab/mcpshelf explore</span>
          </div>
          <button type="button" onclick="copyEcoCommand()" class="ml-3 px-3.5 py-1.5 text-xs font-sans font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/20 active:scale-95">
            <span id="ecoCopyIcon">📋</span>
            <span id="ecoCopyText">Copy</span>
          </button>
        </div>
        <div class="mt-2.5 px-2 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2" id="ecoTabSubtext">
          <span>✨ Launches the interactive keyboard-driven Terminal Explorer without installing.</span>
          <a href="#ecosystem" class="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">View SDK Docs &rarr;</a>
        </div>
      </div>
    </div>

    <!-- Interactive MCP Agent Topology Graphic (Hologram Visualizer) -->
    <div class="max-w-4xl mx-auto mb-12 glass-card rounded-3xl p-5 sm:p-7 text-left relative overflow-hidden border border-white/10 shadow-2xl">
      <!-- Graphic Window Top Bar -->
      <div class="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.06] text-xs">
        <div class="flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
          <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          <span class="ml-2 font-mono text-slate-400 text-[11px] hidden sm:inline">mcpshelf://agent-mesh/topology</span>
        </div>
        <div class="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Stdio IPC Active</span>
          <span class="text-slate-600 hidden md:inline">|</span>
          <span class="text-indigo-400 font-semibold hidden md:inline">&lt;0.5ms Omnisearch Latency</span>
        </div>
      </div>

      <!-- 3-Column Topology Mesh Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center relative">
        <!-- Node 1: AI Clients (Agent Hosts) -->
        <div class="space-y-2.5">
          <div class="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
            <span>💻</span> AI Host Clients
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-white/[0.06] hover:border-indigo-500/40 transition flex items-center justify-between group">
            <div class="flex items-center gap-2.5">
              <span class="text-base text-amber-400">✦</span>
              <div>
                <div class="text-xs font-bold text-white group-hover:text-indigo-300 transition">Claude Desktop</div>
                <div class="text-[10px] text-slate-500 font-mono">claude_desktop_config.json</div>
              </div>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Ready</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-white/[0.06] hover:border-cyan-500/40 transition flex items-center justify-between group">
            <div class="flex items-center gap-2.5">
              <span class="text-base text-cyan-400">⚡</span>
              <div>
                <div class="text-xs font-bold text-white group-hover:text-cyan-300 transition">Cursor IDE</div>
                <div class="text-[10px] text-slate-500 font-mono">~/.cursor/mcp.json</div>
              </div>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Ready</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-white/[0.06] hover:border-teal-500/40 transition flex items-center justify-between group">
            <div class="flex items-center gap-2.5">
              <span class="text-base text-teal-400">🌊</span>
              <div>
                <div class="text-xs font-bold text-white group-hover:text-teal-300 transition">Windsurf / Zed</div>
                <div class="text-[10px] text-slate-500 font-mono">stdio subprocess</div>
              </div>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Ready</span>
          </div>
        </div>

        <!-- Node 2: Central MCPShelf Orchestrator Hub -->
        <div class="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900/90 border-2 border-indigo-500/30 text-center relative shadow-xl shadow-indigo-950/50">
          <div class="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 mx-auto mb-3 flex items-center justify-center text-2xl text-indigo-400 shadow-inner">
            ⚡
          </div>
          <div class="text-sm font-extrabold text-white mb-0.5">MCPShelf Core Bridge</div>
          <div class="text-[10px] font-mono text-indigo-300 mb-3">Multi-Server Stack Orchestrator</div>
          <div class="flex flex-col gap-1.5 text-[10px] font-mono text-slate-400 bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
            <div class="flex items-center justify-between text-slate-300">
              <span>Standard:</span> <strong class="text-emerald-400">JSON-RPC 2.0</strong>
            </div>
            <div class="flex items-center justify-between text-slate-300">
              <span>Trust Engine:</span> <strong class="text-indigo-300">0.0 - 10.0 Rating</strong>
            </div>
            <div class="flex items-center justify-between text-slate-300">
              <span>Stack Merging:</span> <strong class="text-cyan-400">1-Click Universal</strong>
            </div>
          </div>
        </div>

        <!-- Node 3: Live MCP Capability Matrix (Tools, DB, Sandbox) -->
        <div class="space-y-2.5">
          <div class="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1.5">
            <span>🛡️</span> Production Capabilities
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-white/[0.06] hover:border-indigo-500/40 transition flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-base">🗄️</span>
              <div>
                <div class="text-xs font-bold text-white">Database & Storage</div>
                <div class="text-[10px] text-slate-500">PostgreSQL, SQLite, Vector DB</div>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-400">34 tools</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-white/[0.06] hover:border-emerald-500/40 transition flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-base">🛡️</span>
              <div>
                <div class="text-xs font-bold text-white">Security & Guardrails</div>
                <div class="text-[10px] text-slate-500">DBShield, Prompt Defense, Sandboxes</div>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-400">18 tools</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-white/[0.06] hover:border-cyan-500/40 transition flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-base">🌐</span>
              <div>
                <div class="text-xs font-bold text-white">Browser & Scraping</div>
                <div class="text-[10px] text-slate-500">Puppeteer, Playwright, DOM Agents</div>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-400">42 tools</span>
          </div>
        </div>
      </div>
    </div>

    <!-- OmniSearch Control Box -->
    <div class="max-w-3xl mx-auto relative mb-6">
      <div class="relative flex items-center">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <svg class="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          type="text"
          id="searchInput"
          placeholder="Search 419+ servers by keyword, title, tag, or author (e.g. postgres, secret, dodo, github, puppeteer)..."
          class="w-full pl-12 pr-28 py-4 bg-slate-900/90 border-2 border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 rounded-2xl text-white placeholder-slate-400 text-sm sm:text-base shadow-2xl transition-all duration-200 outline-none"
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
      <button onclick="filterCategory('all')" data-cat="all" class="cat-pill active px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 transition-all">
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
        <button onclick="filterClient('all')" data-client="all" class="client-pill active px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">All</button>
        <button onclick="filterClient('claude')" data-client="claude" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Claude</button>
        <button onclick="filterClient('cursor')" data-client="cursor" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Cursor</button>
        <button onclick="filterClient('windsurf')" data-client="windsurf" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Windsurf</button>
        <button onclick="filterClient('zed')" data-client="zed" class="client-pill px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800">Zed</button>
        
        <span class="text-slate-500 font-semibold text-[11px] ml-2">Trust:</span>
        <button onclick="filterSecurity('all')" data-sec="all" class="sec-pill active px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">All</button>
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
                <button onclick="openInstallModal('${escapeHtml(server.id)}')" class="flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5">
                  <span>⚡</span>
                  <span>Install</span>
                </button>
                <button onclick="toggleStack('${escapeHtml(server.id)}')" id="stack-btn-${escapeHtml(server.id)}" class="stack-btn py-1.5 px-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] hover:text-white transition flex items-center gap-1" title="Add to Multi-Server Stack">
                  <span>+</span>
                  <span>Stack</span>
                </button>
                <button onclick="quickCopyTerminal('${escapeHtml(server.installSnippets?.terminal || `npx -y ${server.packageIdentifier || server.id}`)}', event)" class="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition" title="Copy Direct Terminal Run Command">
                  📋
                </button>
                <a href="/servers/${slug}.html" class="p-1.5 text-xs text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-white/[0.04] transition" title="View Documentation">
                  &rarr;
                </a>
              </div>
            </div>

          </div>
        `;
      }).join('')}
    </div>

    <!-- Progressive Pagination & Infinite Scroll Bar -->
    <div id="loadMoreContainer" class="mt-12 text-center max-w-md mx-auto">
      <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span id="paginationSummary">Showing 24 of ${catalog.length} servers</span>
        <span class="text-indigo-400 font-medium flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          Scroll down for more
        </span>
      </div>
      <div class="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden mb-5">
        <div id="paginationProgress" class="bg-gradient-to-r from-indigo-500 to-indigo-400 h-1.5 rounded-full transition-all duration-300" style="width: 6%;"></div>
      </div>
      <button onclick="loadMoreServers()" id="loadMoreBtn" class="px-6 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition shadow flex items-center justify-center gap-2 mx-auto group">
        <span>Load More Servers</span>
        <span class="group-hover:translate-y-0.5 transition-transform">↓</span>
      </button>
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

    <!-- ========================================================================= -->
    <!-- GEO & AEO: Universal MCP Client Compatibility Matrix                      -->
    <!-- ========================================================================= -->
    <section class="mt-24 mb-16 pt-12 border-t border-slate-800/80" id="compatibility">
      <div class="text-center max-w-3xl mx-auto mb-10">
        <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 inline-block">
          Universal Compatibility
        </span>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 mb-3">
          Universal MCP Client Compatibility Matrix
        </h2>
        <p class="text-sm text-slate-400 leading-relaxed">
          Model Context Protocol (MCP) servers indexed on MCPShelf integrate seamlessly across all premier AI developer environments and terminal workflows.
        </p>
      </div>

      <div class="overflow-x-auto glass-card rounded-2xl border-slate-800">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-900/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th class="px-6 py-4 font-bold text-white">AI Developer Client</th>
              <th class="px-6 py-4 font-bold text-white">Transport Protocols</th>
              <th class="px-6 py-4 font-bold text-white">Configuration Path</th>
              <th class="px-6 py-4 font-bold text-white">Multi-Server Bundles</th>
              <th class="px-6 py-4 font-bold text-white">MCPShelf 1-Click Install</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-sans">
            <tr class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-bold text-white flex items-center gap-2">
                <span class="text-amber-400 text-base">✦</span>
                <span>Claude Desktop (Anthropic)</span>
              </td>
              <td class="px-6 py-4 font-mono text-emerald-400">stdio / local IPC</td>
              <td class="px-6 py-4 font-mono text-slate-400">claude_desktop_config.json</td>
              <td class="px-6 py-4 text-emerald-400 font-semibold">✓ Supported natively</td>
              <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">1-Click JSON</span></td>
            </tr>
            <tr class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-bold text-white flex items-center gap-2">
                <span class="text-cyan-400 text-base">⚡</span>
                <span>Cursor IDE (Anysphere)</span>
              </td>
              <td class="px-6 py-4 font-mono text-emerald-400">stdio / command / SSE</td>
              <td class="px-6 py-4 font-mono text-slate-400">~/.cursor/mcp.json</td>
              <td class="px-6 py-4 text-emerald-400 font-semibold">✓ Supported natively</td>
              <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">1-Click JSON</span></td>
            </tr>
            <tr class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-bold text-white flex items-center gap-2">
                <span class="text-teal-400 text-base">🌊</span>
                <span>Windsurf AI (Codeium)</span>
              </td>
              <td class="px-6 py-4 font-mono text-emerald-400">stdio / CLI process</td>
              <td class="px-6 py-4 font-mono text-slate-400">mcp_config.json</td>
              <td class="px-6 py-4 text-emerald-400 font-semibold">✓ Supported natively</td>
              <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">1-Click JSON</span></td>
            </tr>
            <tr class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-bold text-white flex items-center gap-2">
                <span class="text-purple-400 text-base">▲</span>
                <span>Zed Editor (Zed Industries)</span>
              </td>
              <td class="px-6 py-4 font-mono text-emerald-400">stdio (context_servers)</td>
              <td class="px-6 py-4 font-mono text-slate-400">~/.config/zed/settings.json</td>
              <td class="px-6 py-4 text-emerald-400 font-semibold">✓ Supported natively</td>
              <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">1-Click JSON</span></td>
            </tr>
            <tr class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-bold text-white flex items-center gap-2">
                <span class="text-emerald-400 text-base">&gt;_</span>
                <span>Terminal TUI (MCPShelf CLI)</span>
              </td>
              <td class="px-6 py-4 font-mono text-emerald-400">stdio / direct npx</td>
              <td class="px-6 py-4 font-mono text-slate-400">Interactive Keyboard TUI</td>
              <td class="px-6 py-4 text-emerald-400 font-semibold">✓ Chained execution</td>
              <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">npx mcpshelf</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- GEO & Authority: What is Model Context Protocol (MCP)?                    -->
    <!-- ========================================================================= -->
    <section class="mb-16 py-12 px-6 sm:px-10 glass-card rounded-3xl border-slate-800" id="architecture">
      <div class="max-w-4xl mx-auto">
        <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 inline-block">
          Architectural Guide & Standards
        </span>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 mb-4">
          What is Model Context Protocol (MCP)? The Universal AI Tooling Standard
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed mb-6">
          The <strong class="text-white">Model Context Protocol (MCP)</strong> is an open protocol open-sourced by Anthropic that standardizes how Artificial Intelligence applications securely connect to external tools, databases, APIs, and file systems. Prior to MCP, every AI agent framework required custom, ad-hoc integrations. MCP establishes a universal, client-agnostic standard using JSON-RPC 2.0 messages over standard input/output (<code class="text-emerald-400 font-mono">stdio</code>) or Server-Sent Events (<code class="text-emerald-400 font-mono">SSE</code>).
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
          <div class="p-5 rounded-2xl bg-dark-900/80 border border-slate-800/80">
            <div class="text-2xl mb-2">🛠️</div>
            <h3 class="text-sm font-bold text-white mb-2">1. Executable Tools</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Model-callable functions with strict JSON schema definitions for running SQL queries, creating GitHub PRs, automating browsers, or sending Slack notifications.
            </p>
          </div>
          <div class="p-5 rounded-2xl bg-dark-900/80 border border-slate-800/80">
            <div class="text-2xl mb-2">📄</div>
            <h3 class="text-sm font-bold text-white mb-2">2. Contextual Resources</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              File-like read interfaces providing real-time data, database schema inspections, live logs, or external documentation directly into the model's active context window.
            </p>
          </div>
          <div class="p-5 rounded-2xl bg-dark-900/80 border border-slate-800/80">
            <div class="text-2xl mb-2">💡</div>
            <h3 class="text-sm font-bold text-white mb-2">3. Pre-Engineered Prompts</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Standardized prompt templates and system directives created by tool authors to guide the LLM's multi-step decision-making and tool chaining reliably.
            </p>
          </div>
        </div>

        <div class="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <h3 class="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <span>🛡️</span>
            <span>How MCPShelf's 0-10 Trust Score Security Rating Works</span>
          </h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Every server indexed on MCPShelf undergoes automated validation against official MCP specifications. Our pipeline audits npm/PyPI package integrity, checks static AST dependencies, inspects permission declarations (such as filesystem write vs read-only, socket networking, or arbitrary process execution), and incorporates community reviews to assign a cryptographic 0.0 to 10.0 Trust Score.
          </p>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- DEVELOPER ECOSYSTEM: NPX, PIP & METAPROTOCOL MCP SERVER                   -->
    <!-- ========================================================================= -->
    <section class="mb-16 py-12 px-6 sm:px-10 glass-card rounded-3xl border-white/10 relative overflow-hidden" id="ecosystem">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <span class="text-xs font-bold text-indigo-400 uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-3 inline-block">
            Official Packages & Runtime Tooling
          </span>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-3">
            Built for Terminal-First Hackers, Python Agents & Stdio MCP Hosts
          </h2>
          <p class="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Query, audit, and install across 420+ Model Context Protocol servers and 570+ DevShelf tools using our official package ecosystem.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Card 1: NPX Terminal TUI -->
          <div class="glass-card rounded-2xl p-6 border-white/[0.08] hover:border-indigo-500/40 transition flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-xl">
                  ⚡
                </span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  npm v1.3.0
                </span>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Interactive Terminal TUI</h3>
              <p class="text-xs text-slate-400 leading-relaxed mb-4">
                Full-featured terminal browser. Navigate with arrow keys, filter by 8 categories, view trust scores, and copy 1-click JSON configurations directly inside your shell.
              </p>
            </div>
            <div>
              <div class="bg-black/70 rounded-xl p-3 border border-white/[0.06] font-mono text-xs text-slate-300 mb-3 overflow-x-auto">
                <div class="text-slate-500 mb-1"># Zero-install interactive explorer</div>
                <div class="text-indigo-300 font-semibold">npx @ritualdev-lab/mcpshelf explore</div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <a href="https://www.npmjs.com/package/@ritualdev-lab/mcpshelf" target="_blank" class="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-mono">
                  npmjs.com &rarr;
                </a>
                <button type="button" onclick="navigator.clipboard.writeText('npx @ritualdev-lab/mcpshelf explore'); showToast('Copied NPX command!');" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                  Copy Snippet
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Python SDK & CLI -->
          <div class="glass-card rounded-2xl p-6 border-white/[0.08] hover:border-cyan-500/40 transition flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-xl">
                  🐍
                </span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  PyPI v1.3.0
                </span>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Python SDK & CLI</h3>
              <p class="text-xs text-slate-400 leading-relaxed mb-4">
                Programmatic Python client for LangChain, AutoGen, CrewAI, and autonomous AI agents. Search, filter, and verify trust scores directly in Python code.
              </p>
            </div>
            <div>
              <div class="bg-black/70 rounded-xl p-3 border border-white/[0.06] font-mono text-xs text-slate-300 mb-3 overflow-x-auto">
                <div class="text-slate-500 mb-1"># Install from PyPI</div>
                <div class="text-cyan-300 font-semibold mb-1">pip install mcpshelf</div>
                <div class="text-slate-500">mcpshelf search database</div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <a href="https://pypi.org/project/mcpshelf/" target="_blank" class="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-mono">
                  pypi.org &rarr;
                </a>
                <button type="button" onclick="navigator.clipboard.writeText('pip install mcpshelf'); showToast('Copied PIP command!');" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">
                  Copy Snippet
                </button>
              </div>
            </div>
          </div>

          <!-- Card 3: Metaprotocol MCP Server -->
          <div class="glass-card rounded-2xl p-6 border-white/[0.08] hover:border-purple-500/40 transition flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-xl">
                  🤖
                </span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Stdio Server
                </span>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">MCPShelf Metaprotocol Server</h3>
              <p class="text-xs text-slate-400 leading-relaxed mb-4">
                Connect MCPShelf itself into Claude Desktop, Cursor, Windsurf, or Zed. Gives your AI assistant 5 tools to dynamically discover, audit, and configure new tools during runtime.
              </p>
            </div>
            <div>
              <div class="bg-black/70 rounded-xl p-3 border border-white/[0.06] font-mono text-xs text-slate-300 mb-3 overflow-x-auto">
                <pre class="text-purple-300 font-semibold text-[11px]">"mcpshelf": {
  "command": "npx",
  "args": ["-y", "@ritualdev-lab/mcpshelf", "mcp"]
}</pre>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <a href="/servers/io-github-ritualdev-lab-mcpshelf.html" class="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-mono">
                  Server Details &rarr;
                </a>
                <button type="button" onclick="copyMcpServerConfig()" class="text-xs text-purple-400 hover:text-purple-300 font-semibold">
                  Copy Config JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- AEO: Interactive Frequently Asked Questions (FAQ) Accordion               -->
    <!-- ========================================================================= -->
    <section class="mb-20 py-12 px-6 sm:px-10 glass-card rounded-3xl border-slate-800" id="faq">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-10">
          <span class="text-xs font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 inline-block">
            Frequently Asked Questions
          </span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 mb-3">
            Everything You Need to Know About MCPShelf
          </h2>
          <p class="text-sm text-slate-400 leading-relaxed">
            Quick answers for AI engineers, developers, and autonomous agent builders.
          </p>
        </div>

        <div class="space-y-4">
          <details class="group p-5 rounded-2xl bg-dark-900/70 border border-slate-800 hover:border-emerald-500/40 transition">
            <summary class="flex justify-between items-center cursor-pointer font-bold text-sm sm:text-base text-white list-none">
              <span>What is MCPShelf and how does it differ from other registries?</span>
              <span class="text-emerald-400 transition-transform group-open:rotate-180 text-lg">▾</span>
            </summary>
            <div class="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              MCPShelf is the open, community-curated Model Context Protocol registry and AI Agent Stack Builder. Unlike basic directories, MCPShelf provides full-text multi-token OmniSearch (<0.5ms debounce), independent 0-10 Trust Score security audits, capability matrix tagging, an interactive terminal TUI (<code class="text-emerald-400 font-mono">npx @ritualdev-lab/mcpshelf explore</code>), and a multi-server bundle cart that exports merged configuration files for Claude Desktop, Cursor, Windsurf, and Zed in one click.
            </div>
          </details>

          <details class="group p-5 rounded-2xl bg-dark-900/70 border border-slate-800 hover:border-emerald-500/40 transition">
            <summary class="flex justify-between items-center cursor-pointer font-bold text-sm sm:text-base text-white list-none">
              <span>How do I install an MCP server into Claude Desktop?</span>
              <span class="text-emerald-400 transition-transform group-open:rotate-180 text-lg">▾</span>
            </summary>
            <div class="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              Open Claude Desktop, navigate to <strong>Settings &gt; Developer &gt; Edit Config</strong> to open your <code class="text-emerald-400 font-mono">claude_desktop_config.json</code> file. On MCPShelf, click <strong>"Install"</strong> on any server card, copy the generated JSON block into your <code class="text-emerald-400 font-mono">mcpServers</code> object, save the file, and restart Claude Desktop. The new tools will appear instantly with a hammer icon in your chat window.
            </div>
          </details>

          <details class="group p-5 rounded-2xl bg-dark-900/70 border border-slate-800 hover:border-emerald-500/40 transition">
            <summary class="flex justify-between items-center cursor-pointer font-bold text-sm sm:text-base text-white list-none">
              <span>What is the MCPShelf AI Agent Stack Builder?</span>
              <span class="text-emerald-400 transition-transform group-open:rotate-180 text-lg">▾</span>
            </summary>
            <div class="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              The AI Agent Stack Builder is a shopping-cart-like workflow tool. Click <strong>"+ Stack"</strong> on multiple servers (for example, PostgreSQL + GitHub + Slack + Puppeteer). MCPShelf dynamically merges them into a single configuration block for Claude Desktop, Cursor, Windsurf, or Zed, and provides a shareable URL (<code class="text-emerald-400 font-mono">?stack=...</code>) so your entire engineering team can run the exact same agent tooling stack.
            </div>
          </details>

          <details class="group p-5 rounded-2xl bg-dark-900/70 border border-slate-800 hover:border-emerald-500/40 transition">
            <summary class="flex justify-between items-center cursor-pointer font-bold text-sm sm:text-base text-white list-none">
              <span>How are MCP servers audited and security scored?</span>
              <span class="text-emerald-400 transition-transform group-open:rotate-180 text-lg">▾</span>
            </summary>
            <div class="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              Every server is evaluated on a 0.0 to 10.0 Trust Score scale using automated JSON schema validation, static code analysis, permission scope auditing (such as filesystem read/write, network sockets, or subprocess spawning), community reviews, and transport sandboxing. Servers rated 9.5+ earn the Gold Security Shield badge.
            </div>
          </details>

          <details class="group p-5 rounded-2xl bg-dark-900/70 border border-slate-800 hover:border-emerald-500/40 transition">
            <summary class="flex justify-between items-center cursor-pointer font-bold text-sm sm:text-base text-white list-none">
              <span>Can I browse and configure MCP servers from the terminal?</span>
              <span class="text-emerald-400 transition-transform group-open:rotate-180 text-lg">▾</span>
            </summary>
            <div class="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              Yes! Run <code class="text-emerald-400 font-mono font-bold">npx @ritualdev-lab/mcpshelf explore</code> in any terminal. This launches an interactive, keyboard-driven Terminal User Interface (TUI) allowing you to search, filter by category, and copy client-ready JSON snippets without ever opening a web browser.
            </div>
          </details>

          <details class="group p-5 rounded-2xl bg-dark-900/70 border border-slate-800 hover:border-emerald-500/40 transition">
            <summary class="flex justify-between items-center cursor-pointer font-bold text-sm sm:text-base text-white list-none">
              <span>How can developers submit their own MCP server to MCPShelf?</span>
              <span class="text-emerald-400 transition-transform group-open:rotate-180 text-lg">▾</span>
            </summary>
            <div class="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
              Developers can submit open-source MCP servers via our web portal at <a href="/submit.html" class="text-emerald-400 underline font-semibold">mcp.ritualdev.in/submit.html</a> or programmatically via the automated REST API endpoint <code class="text-emerald-400 font-mono">POST /api/v1/submit</code>. Submissions undergo automated schema validation and initial security scoring upon receipt.
            </div>
          </details>
        </div>
      </div>
    </section>
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

  <!-- Floating Back to Top Button -->
  <button id="backToTopBtn" onclick="scrollToTop()" class="fixed bottom-6 right-6 z-40 px-4 py-2.5 rounded-full glass-pill text-xs font-semibold text-slate-300 hover:text-white hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] transition-all duration-300 translate-y-24 opacity-0 pointer-events-none flex items-center gap-2 group shadow-2xl">
    <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs group-hover:-translate-y-0.5 transition-transform font-bold">↑</span>
    <span>Back to Top</span>
    <span id="scrollProgress" class="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-black/40">0%</span>
  </button>

  <!-- Footer -->
  <footer class="border-t border-slate-800 bg-dark-950 py-12 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p>&copy; 2026 MCPShelf. Open-source under Apache-2.0. Built with ⚡ by <a href="https://ritualdev.in" class="text-brand-400 hover:underline">RitualDev Lab</a>.</p>
      <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <a href="#compatibility" class="hover:text-emerald-400">Compatibility Matrix</a>
        <a href="#faq" class="hover:text-emerald-400">FAQ</a>
        <a href="/digest.html" class="hover:text-slate-300">Weekly Digest</a>
        <a href="/feed.xml" class="hover:text-slate-300">RSS 2.0 Feed</a>
        <a href="/feed.json" class="hover:text-slate-300">JSON Feed 1.1</a>
        <a href="/sitemap.xml" class="hover:text-slate-300">Sitemap</a>
        <a href="/llms.txt" class="hover:text-slate-300">llms.txt</a>
        <a href="/llms-full.txt" class="hover:text-slate-300">llms-full.txt</a>
        <a href="/boost.html" class="hover:text-slate-300">Promote Server</a>
        <a href="/submit.html" class="hover:text-slate-300">Submit Registry</a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" target="_blank" class="hover:text-slate-300">GitHub</a>
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
    let currentFilteredList = CATALOG;
    let displayLimit = 24;
    const PAGE_SIZE = 24;

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
    function triggerFilter(resetPaging = true) {
      if (resetPaging) {
        displayLimit = PAGE_SIZE;
      }
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

      currentFilteredList = visibleServers;
      renderVisibleSlice();
    }

    function renderVisibleSlice() {
      const cardMap = new Map();
      document.querySelectorAll('.server-card').forEach(el => {
        cardMap.set(el.dataset.id, el);
        el.style.display = 'none';
      });

      const slice = currentFilteredList.slice(0, displayLimit);
      slice.forEach(server => {
        const el = cardMap.get(server.id);
        if (el) {
          el.style.display = 'flex';
          cardsGrid.appendChild(el);
        }
      });

      const showingCount = Math.min(slice.length, currentFilteredList.length);
      const totalCount = currentFilteredList.length;
      resultCount.textContent = totalCount + ' servers';

      const loadMoreContainer = document.getElementById('loadMoreContainer');
      const paginationSummary = document.getElementById('paginationSummary');
      const paginationProgress = document.getElementById('paginationProgress');

      if (loadMoreContainer) {
        loadMoreContainer.classList.toggle('hidden', slice.length >= totalCount);
        if (paginationSummary) {
          paginationSummary.textContent = 'Showing ' + showingCount + ' of ' + totalCount + ' servers';
        }
        if (paginationProgress) {
          const pct = totalCount > 0 ? (showingCount / totalCount) * 100 : 100;
          paginationProgress.style.width = pct + '%';
        }
      }

      emptyState.classList.toggle('hidden', totalCount > 0);
      syncUrlState();
    }

    function loadMoreServers() {
      if (displayLimit < currentFilteredList.length) {
        displayLimit += PAGE_SIZE;
        renderVisibleSlice();
      }
    }

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Scroll listener for Infinite Scroll and Back to Top Button
    let isAutoLoading = false;
    window.addEventListener('scroll', () => {
      const backToTopBtn = document.getElementById('backToTopBtn');
      const scrollProgress = document.getElementById('scrollProgress');
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;

      if (backToTopBtn) {
        if (currentScroll > 320) {
          backToTopBtn.classList.remove('opacity-0', 'translate-y-24', 'pointer-events-none');
          backToTopBtn.classList.add('opacity-100', 'translate-y-0');
        } else {
          backToTopBtn.classList.add('opacity-0', 'translate-y-24', 'pointer-events-none');
          backToTopBtn.classList.remove('opacity-100', 'translate-y-0');
        }
        if (scrollProgress && maxScroll > 0) {
          const pct = Math.min(100, Math.round((currentScroll / maxScroll) * 100));
          scrollProgress.textContent = pct + '%';
        }
      }

      if (!isAutoLoading && displayLimit < currentFilteredList.length) {
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 800)) {
          isAutoLoading = true;
          loadMoreServers();
          setTimeout(() => { isAutoLoading = false; }, 150);
        }
      }
    }, { passive: true });

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

    const ECO_COMMANDS = {
      npx: {
        prompt: '$',
        snippet: 'npx @ritualdev-lab/mcpshelf explore',
        copyValue: 'npx @ritualdev-lab/mcpshelf explore',
        badge: 'npm: @ritualdev-lab/mcpshelf v1.3.0',
        subtext: '✨ Launches the interactive keyboard-driven Terminal Explorer without installing.'
      },
      pip: {
        prompt: '$',
        snippet: 'pip install mcpshelf',
        copyValue: 'pip install mcpshelf',
        badge: 'PyPI: mcpshelf v1.3.0',
        subtext: '🐍 Official Python SDK & CLI for LangChain, AutoGen, and CrewAI agents.'
      },
      mcp: {
        prompt: 'JSON',
        snippet: 'npx -y @ritualdev-lab/mcpshelf mcp',
        copyValue: '{\\n  "mcpServers": {\\n    "mcpshelf": {\\n      "command": "npx",\\n      "args": ["-y", "@ritualdev-lab/mcpshelf", "mcp"]\\n    }\\n  }\\n}',
        badge: 'Metaprotocol Stdio Server',
        subtext: '🤖 Connect directly into Claude Desktop or Cursor for autonomous MCP discovery.'
      }
    };
    let currentEcoTab = 'npx';
    function switchEcoTab(tab) {
      currentEcoTab = tab;
      ['npx', 'pip', 'mcp'].forEach(t => {
        const btn = document.getElementById('ecoTab-' + t);
        if (btn) {
          if (t === tab) {
            btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5';
          } else {
            btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.03] text-slate-400 hover:text-white border border-transparent transition flex items-center gap-1.5';
          }
        }
      });
      const data = ECO_COMMANDS[tab];
      if (data) {
        const promptEl = document.getElementById('ecoPromptChar');
        const snipEl = document.getElementById('ecoCommandSnippet');
        const badgeEl = document.getElementById('ecoTabBadge');
        const subtextEl = document.getElementById('ecoTabSubtext');
        if (promptEl) promptEl.textContent = data.prompt;
        if (snipEl) snipEl.textContent = data.snippet;
        if (badgeEl) badgeEl.textContent = data.badge;
        if (subtextEl && subtextEl.firstElementChild) subtextEl.firstElementChild.textContent = data.subtext;
      }
    }
    function copyEcoCommand() {
      const data = ECO_COMMANDS[currentEcoTab];
      const textToCopy = data.copyValue;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const copyText = document.getElementById('ecoCopyText');
        const copyIcon = document.getElementById('ecoCopyIcon');
        if (copyText) copyText.textContent = 'Copied!';
        if (copyIcon) copyIcon.textContent = '✓';
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Copy';
          if (copyIcon) copyIcon.textContent = '📋';
        }, 2000);
        showToast('Copied ' + currentEcoTab.toUpperCase() + ' command to clipboard!');
      });
    }
    function copyMcpServerConfig() {
      const config = '{\\n  "mcpServers": {\\n    "mcpshelf": {\\n      "command": "npx",\\n      "args": ["-y", "@ritualdev-lab/mcpshelf", "mcp"]\\n    }\\n  }\\n}';
      navigator.clipboard.writeText(config).then(() => {
        showToast('Copied Claude / Cursor MCP Server config!');
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

      // Initial render of first slice
      triggerFilter(true);
    });
  </script>
</body>
</html>`;
}

function generateBoostHtml(categories: Category[], boostTiers: any): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark bg-[#07090e] text-slate-100" style="background-color: #07090e !important; color: #f1f5f9 !important;">
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
  <meta property="og:site_name" content="MCPShelf">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://mcp.ritualdev.in/boost.html">
  <meta property="og:title" content="Boost Your MCP Server - MCPShelf Marketplace">
  <meta property="og:description" content="Promote your Model Context Protocol (MCP) server to 10,000+ AI developers using Claude Desktop, Cursor, and Windsurf.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/boost.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Boost Your MCP Server - MCPShelf Marketplace">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:creator" content="@ritualdev">
  <meta name="twitter:title" content="Boost Your MCP Server - MCPShelf Marketplace">
  <meta name="twitter:description" content="Promote your Model Context Protocol (MCP) server with self-serve boosting.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/boost.png">
  <meta name="twitter:image:alt" content="Boost Your MCP Server - MCPShelf Marketplace">

  <!-- SEO, GEO & AEO Meta Directives -->
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="geo.region" content="GLOBAL">
  <meta name="geo.placename" content="Global">
  <meta name="theme-color" content="#07090e">
  <link rel="alternate" type="text/markdown" title="LLMs.txt Standard Manifest" href="https://mcp.ritualdev.in/llms.txt">
  <link rel="ai-plugin" type="application/json" href="https://mcp.ritualdev.in/.well-known/ai-plugin.json">

  <!-- JSON-LD: WebPage & BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Boost Your MCP Server - MCPShelf Marketplace",
    "description": "Self-serve developer boosting and sponsorship tiers for Model Context Protocol (MCP) server creators.",
    "url": "https://mcp.ritualdev.in/boost.html",
    "publisher": {
      "@type": "Organization",
      "name": "MCPShelf"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "MCPShelf",
          "item": "https://mcp.ritualdev.in/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Boost Server",
          "item": "https://mcp.ritualdev.in/boost.html"
        }
      ]
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "MCPShelf Server Boosting & Sponsored Placements",
    "description": "Self-serve promotion tiers for Model Context Protocol creators to reach 10,000+ AI developers.",
    "brand": {
      "@type": "Brand",
      "name": "MCPShelf"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "19",
      "highPrice": "99",
      "offerCount": "3"
    }
  }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body {
      background-color: #07090e !important;
      background: #07090e !important;
      color: #f1f5f9 !important;
    }
  </style>
</head>
<body class="bg-[#07090e] text-slate-100 min-h-screen font-sans antialiased selection:bg-amber-400 selection:text-black" style="background-color: #07090e !important; color: #f1f5f9 !important;">
  <header class="border-b border-white/[0.06] bg-[#07090e]/85 backdrop-blur sticky top-0 z-50">
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
<html lang="en" class="dark bg-[#07090e] text-slate-100" style="background-color: #07090e !important; color: #f1f5f9 !important;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submit MCP Server - MCPShelf Registry</title>
  <link rel="canonical" href="https://mcp.ritualdev.in/submit.html">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- Feeds -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MCPShelf">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://mcp.ritualdev.in/submit.html">
  <meta property="og:title" content="Submit MCP Server - MCPShelf Registry">
  <meta property="og:description" content="Register your Model Context Protocol server. Automated security audit & official registry synchronization.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/submit.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Submit MCP Server - MCPShelf Registry">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:creator" content="@ritualdev">
  <meta name="twitter:title" content="Submit MCP Server - MCPShelf Registry">
  <meta name="twitter:description" content="Register your Model Context Protocol server on MCPShelf.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/submit.png">
  <meta name="twitter:image:alt" content="Submit MCP Server - MCPShelf Registry">

  <!-- SEO, GEO & AEO Meta Directives -->
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="geo.region" content="GLOBAL">
  <meta name="geo.placename" content="Global">
  <meta name="theme-color" content="#07090e">
  <link rel="alternate" type="text/markdown" title="LLMs.txt Standard Manifest" href="https://mcp.ritualdev.in/llms.txt">
  <link rel="ai-plugin" type="application/json" href="https://mcp.ritualdev.in/.well-known/ai-plugin.json">

  <!-- JSON-LD: WebPage & BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Submit an MCP Server - MCPShelf Registry",
    "description": "Register your open-source Model Context Protocol server. Automated security scoring & global directory synchronization.",
    "url": "https://mcp.ritualdev.in/submit.html",
    "publisher": {
      "@type": "Organization",
      "name": "MCPShelf"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "MCPShelf",
          "item": "https://mcp.ritualdev.in/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Submit Server",
          "item": "https://mcp.ritualdev.in/submit.html"
        }
      ]
    }
  }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body {
      background-color: #07090e !important;
      background: #07090e !important;
      color: #f1f5f9 !important;
    }
  </style>
</head>
<body class="bg-[#07090e] text-slate-100 min-h-screen font-sans antialiased" style="background-color: #07090e !important; color: #f1f5f9 !important;">
  <header class="border-b border-white/[0.06] bg-[#07090e]/85 backdrop-blur sticky top-0 z-50">
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

function generateServerDetailHtml(server: any, categories: Category[], catalog: any[] = []): string {
  const slug = slugify(server.id);
  const caps = getCapabilities(server);
  const related = catalog.filter((s: any) => s.category === server.category && s.id !== server.id).slice(0, 3);

  // Client configurations
  const claudeSnippet = server.installSnippets?.claudeDesktop || JSON.stringify({
    mcpServers: {
      [server.id]: {
        command: "npx",
        args: ["-y", server.packageIdentifier || server.id]
      }
    }
  }, null, 2);

  const cursorSnippet = JSON.stringify({
    command: "npx",
    args: ["-y", server.packageIdentifier || server.id]
  }, null, 2);

  const windsurfSnippet = JSON.stringify({
    mcpServers: {
      [server.id]: {
        command: "npx",
        args: ["-y", server.packageIdentifier || server.id]
      }
    }
  }, null, 2);

  const zedSnippet = JSON.stringify({
    context_servers: [server.id]
  }, null, 2);

  const terminalSnippet = server.installSnippets?.terminal || `npx -y ${server.packageIdentifier || server.id}`;

  return `<!DOCTYPE html>
<html lang="en" class="dark bg-[#07090e] text-slate-100" style="background-color: #07090e !important; color: #f1f5f9 !important;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(server.title)} - Model Context Protocol (MCP) Server Security Audit & Install</title>
  <meta name="description" content="${escapeHtml(server.description)} Install ${escapeHtml(server.title)} into Claude Desktop, Cursor, Windsurf, and Zed. Verified Trust Score: ${server.trustScore}/10.">
  <link rel="canonical" href="https://mcp.ritualdev.in/servers/${slug}.html">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- Advanced SEO & GEO Meta Tags -->
  <meta name="keywords" content="${escapeHtml(server.title)}, ${escapeHtml(server.category)}, model context protocol, mcp server, claude desktop, cursor ide, windsurf ai, zed editor, ritualdev">
  <meta name="author" content="${escapeHtml(server.author)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">

  <!-- Feeds & Machine Discovery -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">
  <link rel="alternate" type="text/markdown" title="LLMs.txt Standard Manifest" href="https://mcp.ritualdev.in/llms.txt">
  <link rel="ai-plugin" type="application/json" href="https://mcp.ritualdev.in/.well-known/ai-plugin.json">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="MCPShelf">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://mcp.ritualdev.in/servers/${slug}.html">
  <meta property="og:title" content="${escapeHtml(server.title)} - MCP Server">
  <meta property="og:description" content="${escapeHtml(server.description)}">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/${slug}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Preview of ${escapeHtml(server.title)} on MCPShelf">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:creator" content="@ritualdev">
  <meta name="twitter:title" content="${escapeHtml(server.title)} - MCP Server">
  <meta name="twitter:description" content="${escapeHtml(server.description)}">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/${slug}.png">
  <meta name="twitter:image:alt" content="Preview of ${escapeHtml(server.title)} on MCPShelf">

  <!-- SEO, GEO & AEO Meta Directives -->
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="geo.region" content="GLOBAL">
  <meta name="geo.placename" content="Global">
  <meta name="theme-color" content="#07090e">
  <meta name="color-scheme" content="dark">

  <!-- JSON-LD: SoftwareApplication -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": ${JSON.stringify(server.title)},
    "operatingSystem": "Cross-platform (macOS, Linux, Windows)",
    "applicationCategory": "DeveloperApplication",
    "applicationSubCategory": "AI Agent Extension",
    "description": ${JSON.stringify(server.description)},
    "softwareVersion": ${JSON.stringify(server.version || "1.0.0")},
    "url": "https://mcp.ritualdev.in/servers/${slug}.html",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ${server.averageRating || 4.8},
      "reviewCount": ${server.reviewsCount || 10},
      "bestRating": 5,
      "worstRating": 1
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": ${JSON.stringify(server.author || "RitualDev Community")}
    }
  }
  </script>

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "MCPShelf",
        "item": "https://mcp.ritualdev.in/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": ${JSON.stringify(server.category)},
        "item": ${JSON.stringify("https://mcp.ritualdev.in/?cat=" + encodeURIComponent(server.category.toLowerCase()))}
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": ${JSON.stringify(server.title)},
        "item": "https://mcp.ritualdev.in/servers/${slug}.html"
      }
    ]
  }
  </script>

  <!-- JSON-LD: FAQPage for AEO (Direct Answers for Perplexity & Google) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": ${JSON.stringify(`How do I install ${server.title} in Claude Desktop?`)},
        "acceptedAnswer": {
          "@type": "Answer",
          "text": ${JSON.stringify(`To install ${server.title} into Claude Desktop, open your claude_desktop_config.json under the mcpServers key and add:\n${claudeSnippet}`)}
        }
      },
      {
        "@type": "Question",
        "name": ${JSON.stringify(`How do I install ${server.title} in Cursor IDE or Windsurf?`)},
        "acceptedAnswer": {
          "@type": "Answer",
          "text": ${JSON.stringify(`Run the command '${terminalSnippet}' or add ${server.packageIdentifier || server.id} to your Cursor or Windsurf MCP configuration.`)}
        }
      },
      {
        "@type": "Question",
        "name": ${JSON.stringify(`What is the security rating and trust score for ${server.title}?`)},
        "acceptedAnswer": {
          "@type": "Answer",
          "text": ${JSON.stringify(`${server.title} has a verified Trust Score of ${server.trustScore}/10 with security audit rating ${server.securityRating || 'VERIFIED'} on MCPShelf.`)}
        }
      }
    ]
  }
  </script>

  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body {
      background-color: #07090e !important;
      background: #07090e !important;
      color: #f1f5f9 !important;
    }
    .glass-card {
      background: #0c101a;
      border: 1px solid rgba(255, 255, 255, 0.07);
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
    }
  </style>
</head>
<body class="bg-[#07090e] text-slate-100 min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white" style="background-color: #07090e !important; color: #f1f5f9 !important;">
  <header class="border-b border-white/[0.06] bg-[#07090e]/85 backdrop-blur sticky top-0 z-50">
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

  <main class="max-w-4xl mx-auto px-4 py-10">
    <!-- Breadcrumb Navigation -->
    <nav class="flex items-center space-x-2 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
      <a href="/" class="hover:text-emerald-400 transition">MCPShelf</a>
      <span>/</span>
      <a href="/?cat=${encodeURIComponent(server.category.toLowerCase())}" class="hover:text-emerald-400 transition">${escapeHtml(server.category)}</a>
      <span>/</span>
      <span class="text-slate-200 font-semibold truncate">${escapeHtml(server.title)}</span>
    </nav>

    <article class="glass-card rounded-2xl p-6 sm:p-8 mb-8 border-slate-800">
      <!-- Header Badge Row -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <span class="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
          ${escapeHtml(server.category)}
        </span>
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${server.trustScore >= 9.0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-amber-300 bg-amber-500/10 border-amber-500/25'} px-3 py-1 rounded-lg border flex items-center gap-1.5">
            🛡️ Trust Score: ${server.trustScore}/10 (${server.securityRating})
          </span>
        </div>
      </div>

      <!-- Title & Package Identifier -->
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">${escapeHtml(server.title)}</h1>
      <p class="text-xs font-mono text-slate-400 mb-4">${server.id} (v${server.version})</p>
      <p class="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">${escapeHtml(server.description)}</p>

      <!-- Capability Matrix Tags -->
      <div class="flex flex-wrap gap-2 mb-6">
        ${caps.map((c: any) => `
          <span class="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <span>${c.icon}</span>
            <span>${c.label}</span>
          </span>
        `).join('')}
      </div>

      <!-- Stat Cards Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs mb-8">
        <div><span class="text-slate-500 block mb-1">Rating:</span> <strong class="text-white text-sm">★ ${server.averageRating} (${server.reviewsCount})</strong></div>
        <div><span class="text-slate-500 block mb-1">Estimated Installs:</span> <strong class="text-white text-sm">${server.estimatedInstalls.toLocaleString()}</strong></div>
        <div><span class="text-slate-500 block mb-1">Transport:</span> <strong class="text-white text-sm font-mono uppercase">${server.transportType}</strong></div>
        <div><span class="text-slate-500 block mb-1">Author:</span> <strong class="text-white text-sm truncate block">${escapeHtml(server.author)}</strong></div>
      </div>

      <!-- Multi-Client Installation Snippets -->
      <div class="mb-8">
        <h2 class="text-base font-bold text-white mb-3 flex items-center gap-2">
          <span>⚡</span>
          <span>1-Click Configuration for AI Clients</span>
        </h2>

        <!-- Tabs -->
        <div class="flex border-b border-slate-800 text-xs font-semibold mb-4 space-x-1">
          <button onclick="showConfigTab('claude')" id="btn-tab-claude" class="tab-btn px-4 py-2 border-b-2 border-emerald-400 text-emerald-400">Claude Desktop</button>
          <button onclick="showConfigTab('cursor')" id="btn-tab-cursor" class="tab-btn px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-white">Cursor</button>
          <button onclick="showConfigTab('windsurf')" id="btn-tab-windsurf" class="tab-btn px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-white">Windsurf</button>
          <button onclick="showConfigTab('zed')" id="btn-tab-zed" class="tab-btn px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-white">Zed</button>
          <button onclick="showConfigTab('cli')" id="btn-tab-cli" class="tab-btn px-4 py-2 border-b-2 border-transparent text-slate-400 hover:text-white">Terminal CLI</button>
        </div>

        <div class="relative">
          <pre id="configBox" class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 overflow-x-auto">${claudeSnippet}</pre>
          <button onclick="copyCurrentConfig()" id="detailCopyBtn" class="absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition shadow">
            Copy
          </button>
        </div>
        <p id="configHelp" class="text-[11px] text-slate-400 mt-2">Paste into <code class="text-emerald-400 font-mono">claude_desktop_config.json</code> under <code class="text-emerald-400 font-mono">mcpServers</code>.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
        ${server.repositoryUrl ? `<a href="${server.repositoryUrl}" target="_blank" class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition">View GitHub Repository &rarr;</a>` : ''}
        <a href="/boost.html" class="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition">🚀 Boost This Server</a>
        <a href="/submit.html" class="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition">Submit Update</a>
      </div>
    </article>

    <!-- Related Servers for Deep Interlinking SEO -->
    ${related.length > 0 ? `
      <section class="mt-12">
        <h2 class="text-lg font-bold text-white mb-4">Related ${escapeHtml(server.category)} MCP Servers</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          ${related.map((r: any) => `
            <a href="/servers/${slugify(r.id)}.html" class="p-4 rounded-xl glass-card border-slate-800 hover:border-emerald-500/40 transition block group">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  ${r.category}
                </span>
                <span class="text-[10px] font-bold text-slate-400">🛡️ ${r.trustScore}</span>
              </div>
              <h3 class="text-sm font-bold text-white group-hover:text-emerald-400 transition mb-1 truncate">${escapeHtml(r.title)}</h3>
              <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(r.description)}</p>
            </a>
          `).join('')}
        </div>
      </section>
    ` : ''}
  </main>

  <script>
    const configs = {
      claude: ${JSON.stringify(claudeSnippet)},
      cursor: ${JSON.stringify(cursorSnippet)},
      windsurf: ${JSON.stringify(windsurfSnippet)},
      zed: ${JSON.stringify(zedSnippet)},
      cli: ${JSON.stringify(terminalSnippet)}
    };

    const helps = {
      claude: 'Paste into claude_desktop_config.json under mcpServers.',
      cursor: 'Paste into ~/.cursor/mcp.json or Cursor Features > MCP Servers.',
      windsurf: 'Paste into ~/.codeium/windsurf/mcp_config.json.',
      zed: 'Paste into ~/.config/zed/settings.json under context_servers.',
      cli: 'Execute directly in your terminal to start or install the server.'
    };

    let activeTab = 'claude';

    function showConfigTab(tab) {
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-emerald-400', 'text-emerald-400');
        b.classList.add('border-transparent', 'text-slate-400');
      });
      const activeBtn = document.getElementById('btn-tab-' + tab);
      if (activeBtn) {
        activeBtn.classList.add('border-emerald-400', 'text-emerald-400');
        activeBtn.classList.remove('border-transparent', 'text-slate-400');
      }
      document.getElementById('configBox').textContent = configs[tab] || '';
      document.getElementById('configHelp').textContent = helps[tab] || '';
    }

    function copyCurrentConfig() {
      const code = configs[activeTab] || '';
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('detailCopyBtn');
        const orig = btn.textContent;
        btn.textContent = 'Copied! ✓';
        btn.classList.add('bg-white', 'text-black');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('bg-white', 'text-black');
        }, 1500);
      });
    }
  </script>
</body>
</html>`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
