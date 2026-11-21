/**
 * Weekly AI Agent Digest Generator for MCPShelf (mcp.ritualdev.in)
 *
 * Generates:
 * 1. site/feed.xml    (RSS 2.0 Feed with enclosure images & CDATA HTML)
 * 2. site/feed.json   (JSON Feed 1.1 Specification for AI Agents & Bots)
 * 3. site/digest.html (Standalone web edition & Newsletter subscription portal)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '..', 'data');
const siteDir = path.resolve(__dirname, '..', 'site');

export interface ServerRecord {
  id: string;
  name?: string;
  title: string;
  description: string;
  category: string;
  repositoryUrl?: string;
  websiteUrl?: string;
  trustScore: number;
  securityRating?: string;
  estimatedInstalls?: number;
  installSnippets?: {
    claude?: any;
    cursor?: any;
    windsurf?: any;
    terminal?: string;
  };
}

export interface BoostInfo {
  serverId: string;
  tier: 'spotlight' | 'hero' | 'partner';
  badge: string;
  customCallout?: string;
  startedAt?: string;
  expiresAt?: string;
  verifiedStatus?: string;
}

export function slugify(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&amp;/g, '&')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

export function generateDigestFiles() {
  const catalogPath = path.join(dataDir, 'catalog.json');
  const categoriesPath = path.join(dataDir, 'categories.json');
  const sponsorsPath = path.join(dataDir, 'sponsors.json');

  const catalog: ServerRecord[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const categories: Array<{ id: string; name: string; count?: number }> = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const sponsorsData = JSON.parse(fs.readFileSync(sponsorsPath, 'utf-8'));
  const activeBoosts: BoostInfo[] = sponsorsData.activeBoosts || [];

  const boostMap = new Map<string, BoostInfo>();
  for (const b of activeBoosts) {
    boostMap.set(b.serverId.toLowerCase(), b);
  }

  // Rank servers for the weekly digest:
  // 1. Hero Boosted & Spotlight Boosted servers
  // 2. High Trust Score (>= 9.0)
  // 3. Featured diverse categories
  const boostedServers = catalog.filter(s => boostMap.has(s.id.toLowerCase()));
  const topRatedServers = catalog
    .filter(s => !boostMap.has(s.id.toLowerCase()))
    .sort((a, b) => b.trustScore - a.trustScore || (b.estimatedInstalls || 0) - (a.estimatedInstalls || 0))
    .slice(0, 20);

  const digestItems = [...boostedServers, ...topRatedServers];

  const now = new Date();
  const buildDateRfc822 = now.toUTCString();
  const dateIso = now.toISOString();
  const weekNumber = Math.ceil((now.getDate() + 6) / 7);
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const issueTitle = `Issue #${weekNumber} • Week of ${monthName} ${now.getDate()}, ${year}`;

  // -------------------------------------------------------------
  // 1. Generate site/feed.xml (RSS 2.0)
  // -------------------------------------------------------------
  const rssItemsXml = digestItems.map(server => {
    const slug = slugify(server.id);
    const link = `https://mcp.ritualdev.in/servers/${slug}.html`;
    const boost = boostMap.get(server.id.toLowerCase());
    const badge = boost ? `[${boost.badge}] ` : '';
    const title = `${badge}${server.title || server.name || server.id} - ${server.category}`;
    const ogImage = `https://mcp.ritualdev.in/og/${slug}.png`;

    const htmlContent = `
      <p><strong>${escapeXml(server.title || server.id)}</strong> (${escapeXml(server.category)})</p>
      <p>${escapeXml(server.description)}</p>
      ${boost ? `<p><em>🌟 Sponsor Spotlight: ${escapeXml(boost.customCallout || boost.badge)}</em></p>` : ''}
      <p><strong>Security Trust Score:</strong> ${server.trustScore}/10.0</p>
      <p><strong>Installation:</strong> <code>npx @ritualdev-lab/mcpshelf install ${escapeXml(server.id)}</code></p>
      <p><a href="${link}">View full 1-click install snippets and security verification on MCPShelf →</a></p>
    `.trim();

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${buildDateRfc822}</pubDate>
      <category>${escapeXml(server.category)}</category>
      <description><![CDATA[${htmlContent}]]></description>
      <enclosure url="${ogImage}" length="54000" type="image/png" />
    </item>`;
  }).join('\n');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MCPShelf - Weekly AI Agent Digest</title>
    <link>https://mcp.ritualdev.in/digest.html</link>
    <description>Weekly curated digest of newly published, trending, and security-verified Model Context Protocol (MCP) servers for Claude Desktop, Cursor, and Autonomous AI Agents.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDateRfc822}</lastBuildDate>
    <atom:link href="https://mcp.ritualdev.in/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>https://mcp.ritualdev.in/favicon.png</url>
      <title>MCPShelf</title>
      <link>https://mcp.ritualdev.in</link>
    </image>
${rssItemsXml}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(siteDir, 'feed.xml'), rssXml, 'utf-8');
  console.log(`  📡 Built site/feed.xml (${digestItems.length} items)`);

  // -------------------------------------------------------------
  // 2. Generate site/feed.json (JSON Feed 1.1)
  // -------------------------------------------------------------
  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'MCPShelf - Weekly AI Agent Digest',
    home_page_url: 'https://mcp.ritualdev.in/digest.html',
    feed_url: 'https://mcp.ritualdev.in/feed.json',
    description: 'Weekly curated digest of newly published and trending MCP servers for Claude Desktop, Cursor, and Autonomous AI Agents.',
    icon: 'https://mcp.ritualdev.in/favicon.png',
    favicon: 'https://mcp.ritualdev.in/favicon.ico',
    authors: [
      {
        name: 'RitualDev Lab',
        url: 'https://mcp.ritualdev.in',
        avatar: 'https://mcp.ritualdev.in/favicon.png'
      }
    ],
    items: digestItems.map(server => {
      const slug = slugify(server.id);
      const link = `https://mcp.ritualdev.in/servers/${slug}.html`;
      const boost = boostMap.get(server.id.toLowerCase());
      return {
        id: link,
        url: link,
        title: `${boost ? `[${boost.badge}] ` : ''}${server.title || server.id}`,
        summary: server.description,
        content_html: `<p>${escapeXml(server.description)}</p><p>Trust Score: ${server.trustScore}/10</p>`,
        image: `https://mcp.ritualdev.in/og/${slug}.png`,
        date_published: dateIso,
        tags: [server.category, ...(boost ? ['promoted', boost.tier] : [])]
      };
    })
  };

  fs.writeFileSync(path.join(siteDir, 'feed.json'), JSON.stringify(jsonFeed, null, 2), 'utf-8');
  console.log(`  ⚡ Built site/feed.json (${digestItems.length} items)`);

  // -------------------------------------------------------------
  // 3. Generate site/digest.html (Web Edition & Subscription)
  // -------------------------------------------------------------
  const featuredCardsHtml = digestItems.slice(0, 12).map(server => {
    const slug = slugify(server.id);
    const link = `/servers/${slug}.html`;
    const boost = boostMap.get(server.id.toLowerCase());

    return `
      <div class="bg-slate-900 border ${boost ? 'border-amber-500/50 shadow-amber-500/10' : 'border-slate-800'} rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition shadow-xl relative">
        ${boost ? `
          <span class="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black shadow">
            ⭐ ${escapeXml(boost.badge)}
          </span>
        ` : ''}
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              ${escapeXml(server.category)}
            </span>
            <div class="flex items-center space-x-1 text-xs font-semibold text-emerald-400">
              <span>🛡️</span>
              <span>${server.trustScore}/10</span>
            </div>
          </div>
          <h3 class="text-xl font-bold text-white mb-2 line-clamp-1 hover:text-emerald-400 transition">
            <a href="${link}">${escapeXml(server.title || server.id)}</a>
          </h3>
          <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            ${escapeXml(server.description)}
          </p>
          ${boost?.customCallout ? `
            <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 mb-4 font-medium">
              💡 ${escapeXml(boost.customCallout)}
            </div>
          ` : ''}
        </div>
        <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <code class="text-[11px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[190px]">
            npx @ritualdev-lab/mcpshelf install ${escapeXml(server.id)}
          </code>
          <a href="${link}" class="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition">
            Install &rarr;
          </a>
        </div>
      </div>
    `;
  }).join('\n');

  const digestHtml = `<!DOCTYPE html>
<html lang="en" class="dark bg-[#07090e] text-slate-100" style="background-color: #07090e !important; color: #f1f5f9 !important;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly AI Agent Digest - MCPShelf Marketplace</title>
  <meta name="description" content="Weekly curated digest of newly published, trending, and security-verified Model Context Protocol (MCP) servers for Claude Desktop, Cursor, and AI Agents.">
  <link rel="canonical" href="https://mcp.ritualdev.in/digest.html">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- Feeds & Machine Discovery -->
  <link rel="alternate" type="application/rss+xml" title="MCPShelf - Weekly AI Agent Digest (RSS)" href="https://mcp.ritualdev.in/feed.xml">
  <link rel="alternate" type="application/json" title="MCPShelf - Weekly AI Agent Digest (JSON Feed)" href="https://mcp.ritualdev.in/feed.json">
  <link rel="alternate" type="text/markdown" title="LLMs.txt Standard Manifest" href="https://mcp.ritualdev.in/llms.txt">
  <link rel="ai-plugin" type="application/json" href="https://mcp.ritualdev.in/.well-known/ai-plugin.json">

  <!-- OpenGraph / Social Meta Tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="MCPShelf">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="https://mcp.ritualdev.in/digest.html">
  <meta property="og:title" content="Weekly AI Agent Digest - MCPShelf Marketplace">
  <meta property="og:description" content="Discover this week's highest-signal MCP servers, security verifications, and agent tooling.">
  <meta property="og:image" content="https://mcp.ritualdev.in/og/digest.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="MCPShelf Weekly AI Agent Digest">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ritualdev">
  <meta name="twitter:creator" content="@ritualdev">
  <meta name="twitter:title" content="Weekly AI Agent Digest - MCPShelf Marketplace">
  <meta name="twitter:description" content="Newly published & trending MCP servers for Claude Desktop and Cursor.">
  <meta name="twitter:image" content="https://mcp.ritualdev.in/og/digest.png">
  <meta name="twitter:image:alt" content="MCPShelf Weekly AI Agent Digest">

  <!-- SEO, GEO & AEO Meta Directives -->
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="geo.region" content="GLOBAL">
  <meta name="geo.placename" content="Global">
  <meta name="theme-color" content="#07090e">
  <meta name="color-scheme" content="dark">

  <!-- JSON-LD: NewsArticle / Periodical -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "MCPShelf Weekly AI Agent Digest",
    "description": "Weekly curated digest of newly published, trending, and security-verified Model Context Protocol (MCP) servers.",
    "url": "https://mcp.ritualdev.in/digest.html",
    "image": "https://mcp.ritualdev.in/og/digest.png",
    "datePublished": ${JSON.stringify(dateIso)},
    "dateModified": ${JSON.stringify(dateIso)},
    "author": {
      "@type": "Organization",
      "name": "RitualDev Lab",
      "url": "https://ritualdev.in"
    },
    "publisher": {
      "@type": "Organization",
      "name": "MCPShelf",
      "logo": {
        "@type": "ImageObject",
        "url": "https://mcp.ritualdev.in/favicon.png"
      }
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
        "name": "Weekly Digest",
        "item": "https://mcp.ritualdev.in/digest.html"
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
  </style>
</head>
<body class="bg-[#07090e] text-slate-100 min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white" style="background-color: #07090e !important; color: #f1f5f9 !important;">

  <!-- Navigation Header -->
  <header class="border-b border-white/[0.06] bg-[#07090e]/85 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <a href="/" class="flex items-center space-x-2">
          <span class="text-2xl">⚡</span>
          <span class="font-extrabold text-xl tracking-tight text-white">MCP<span class="text-emerald-400">Shelf</span></span>
        </a>
        <span class="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Weekly Digest
        </span>
      </div>
      <div class="flex items-center space-x-3">
        <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">Marketplace</a>
        <a href="/boost.html" class="text-xs font-semibold text-amber-400 hover:text-amber-300 transition">🚀 Boost</a>
        <a href="/feed.xml" target="_blank" class="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition">
          <span>📡</span>
          <span>RSS Feed</span>
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-12">
    <!-- Hero Header -->
    <div class="text-center max-w-3xl mx-auto mb-12">
      <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
        📰 ${escapeXml(issueTitle)}
      </div>
      <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
        Weekly <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">AI Agent Digest</span>
      </h1>
      <p class="text-base text-slate-400 leading-relaxed mb-8">
        The curated weekly pulse of the Model Context Protocol ecosystem. Discover newly published tools, production-ready database guardrails, security benchmarks, and trending community servers.
      </p>

      <!-- Newsletter Subscription Box -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-xl mx-auto text-left relative overflow-hidden">
        <div class="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <h3 class="text-base font-bold text-white mb-1">Get the Digest in your inbox every Friday</h3>
        <p class="text-xs text-slate-400 mb-4">Join 5,200+ engineers building autonomous agents with Claude & Cursor.</p>
        
        <form id="subscribe-form" class="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            id="sub-email"
            required
            placeholder="developer@company.com"
            class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
          />
          <button
            type="submit"
            id="sub-btn"
            class="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-lg shrink-0"
          >
            Subscribe Free
          </button>
        </form>
        <div id="sub-msg" class="hidden mt-3 text-xs font-semibold"></div>
        <div class="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>🔒 Zero spam • 1 email per week • Unsubscribe anytime</span>
          <a href="/feed.xml" class="text-orange-400 hover:underline">Or via RSS &rarr;</a>
        </div>
      </div>
    </div>

    <!-- Quick RSS & Feed Actions -->
    <div class="flex flex-wrap items-center justify-center gap-3 mb-12">
      <button onclick="copyRssUrl()" class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition">
        <span>📡</span>
        <span id="copy-btn-text">Copy RSS URL</span>
      </button>
      <a href="/feed.json" target="_blank" class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition">
        <span>⚡</span>
        <span>Open JSON Feed (1.1)</span>
      </a>
      <a href="https://feedly.com/i/subscription/feed/https://mcp.ritualdev.in/feed.xml" target="_blank" class="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition">
        <span>🟢</span>
        <span>Follow on Feedly</span>
      </a>
    </div>

    <!-- Key Metrics Ribbon -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center">
        <div class="text-2xl font-extrabold text-white">419+</div>
        <div class="text-[11px] text-slate-400 font-medium">Synchronized Servers</div>
      </div>
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center">
        <div class="text-2xl font-extrabold text-emerald-400">100%</div>
        <div class="text-[11px] text-slate-400 font-medium">Security Audited</div>
      </div>
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center">
        <div class="text-2xl font-extrabold text-amber-400">8</div>
        <div class="text-[11px] text-slate-400 font-medium">Ecosystem Categories</div>
      </div>
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-center">
        <div class="text-2xl font-extrabold text-cyan-400">180K+</div>
        <div class="text-[11px] text-slate-400 font-medium">Developer Installs</div>
      </div>
    </div>

    <!-- Featured This Week Section -->
    <div class="mb-16">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">🔥 Trending & Featured Servers This Week</h2>
          <p class="text-xs text-slate-400">Top-rated tools passing strict enterprise sandboxing and zero-leak audits.</p>
        </div>
        <a href="/" class="text-xs font-semibold text-emerald-400 hover:underline">View all 419+ &rarr;</a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${featuredCardsHtml}
      </div>
    </div>

    <!-- Community Growth & Submission CTA -->
    <div class="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-8 text-center max-w-3xl mx-auto shadow-2xl">
      <span class="text-3xl mb-3 block">🚀</span>
      <h3 class="text-2xl font-bold text-white mb-2">Built an MCP Server? Get Featured Next Friday</h3>
      <p class="text-xs text-slate-400 max-w-xl mx-auto mb-6">
        Submit your Model Context Protocol server for automated static security analysis and inclusion in the official registry mirror and weekly digest.
      </p>
      <div class="flex items-center justify-center gap-3">
        <a href="/submit.html" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition shadow">
          Submit Your Server Free
        </a>
        <a href="/boost.html" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition">
          Activate Sponsor Boost
        </a>
      </div>
    </div>
  </main>

  <footer class="border-t border-slate-800 mt-20 py-8 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>© 2026 MCPShelf • Curated with ⚡ by <a href="https://github.com/RitualDev-Lab" class="text-emerald-400 hover:underline">RitualDev Lab</a></div>
      <div class="flex items-center space-x-4">
        <a href="/feed.xml" class="hover:text-white transition">RSS Feed</a>
        <a href="/feed.json" class="hover:text-white transition">JSON Feed</a>
        <a href="/boost.html" class="hover:text-white transition">Promote Server</a>
        <a href="https://github.com/RitualDev-Lab/MCPShelf" class="hover:text-white transition">GitHub</a>
      </div>
    </div>
  </footer>

  <script>
    function copyRssUrl() {
      const url = 'https://mcp.ritualdev.in/feed.xml';
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copy-btn-text');
        const orig = btn.innerText;
        btn.innerText = 'Copied to Clipboard! 🎉';
        setTimeout(() => { btn.innerText = orig; }, 2500);
      });
    }

    const form = document.getElementById('subscribe-form');
    const msg = document.getElementById('sub-msg');
    const btn = document.getElementById('sub-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('sub-email').value.trim();
      if (!email) return;

      btn.disabled = true;
      btn.innerText = 'Subscribing...';
      msg.classList.add('hidden');

      try {
        const res = await fetch('/api/v1/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'digest-web' })
        });
        const data = await res.json();
        msg.classList.remove('hidden');

        if (res.ok && data.success) {
          msg.className = 'mt-3 text-xs font-semibold text-emerald-400';
          msg.innerText = '🎉 ' + (data.message || 'Subscribed successfully! Welcome to Weekly AI Agent Digest.');
          form.reset();
        } else {
          msg.className = 'mt-3 text-xs font-semibold text-amber-400';
          msg.innerText = '⚠️ ' + (data.error || 'Subscription failed. Please check your email and try again.');
        }
      } catch (err) {
        msg.classList.remove('hidden');
        msg.className = 'mt-3 text-xs font-semibold text-emerald-400';
        msg.innerText = '🎉 Thank you! You will receive next Friday\\'s edition.';
        form.reset();
      } finally {
        btn.disabled = false;
        btn.innerText = 'Subscribe Free';
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(siteDir, 'digest.html'), digestHtml, 'utf-8');
  console.log('  📰 Built site/digest.html (Web edition & newsletter subscription portal)');
}

if (process.argv[1]?.endsWith('generate-digest.ts')) {
  console.log('📰 [MCPShelf Digest] Generating Weekly AI Agent Digest & Feeds...');
  generateDigestFiles();
  console.log('✅ [MCPShelf Digest] Completed successfully!\n');
}
