import * as fs from 'node:fs';
import * as path from 'node:path';

function slugify(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function main() {
  console.log('🌐 [MCPShelf SEO/GEO/AEO Engine] Generating rich sitemaps, robots.txt, RFC llms.txt & AI plugins...');

  const dataDir = path.resolve(process.cwd(), 'data');
  const siteDir = path.resolve(process.cwd(), 'site');
  const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf-8'));
  const categories = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf-8'));

  // Ensure directories exist
  const wellKnownDir = path.join(siteDir, '.well-known');
  if (!fs.existsSync(wellKnownDir)) {
    fs.mkdirSync(wellKnownDir, { recursive: true });
  }

  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD for sitemap lastmod

  // ---------------------------------------------------------------------------
  // 1. Robots.txt (Optimized for Search Engines + AI Generative Agents)
  // ---------------------------------------------------------------------------
  const robotsTxt = `# ==============================================================================
# MCPShelf Robots Policy - Optimized for Web Search & AI Answer Engines (AEO/GEO)
# ==============================================================================

User-agent: *
Allow: /

# Explicit AI Agent & LLM Search Crawlers
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: YandexBot
Allow: /

# Discovery Standards & Sitemaps
Sitemap: https://mcp.ritualdev.in/sitemap.xml
Sitemap: https://mcp.ritualdev.in/feed.xml
LLMs-Txt: https://mcp.ritualdev.in/llms.txt
LLMs-Full-Txt: https://mcp.ritualdev.in/llms-full.txt
`;
  fs.writeFileSync(path.join(siteDir, 'robots.txt'), robotsTxt);
  console.log('  🤖 Wrote site/robots.txt (Universal search + AI engine allowances)');

  // ---------------------------------------------------------------------------
  // 2. site/llms.txt (RFC-standard machine discovery for LLMs and AI Agents)
  // ---------------------------------------------------------------------------
  let llmsTxt = `# MCPShelf - The Open Model Context Protocol (MCP) Registry & AI Agent Stack Builder
> Discover, audit, and install 400+ verified Model Context Protocol (MCP) servers into Claude Desktop, Cursor, Windsurf, and Zed.

## Platform Overview
- **Name**: MCPShelf
- **Canonical URL**: https://mcp.ritualdev.in
- **Repository**: https://github.com/RitualDev-Lab/MCPShelf
- **Organization**: RitualDev Lab (https://ritualdev.in)
- **Catalog Size**: ${catalog.length}+ verified production MCP servers
- **Categories**: ${categories.length} curated categories
- **Security Auditing**: 0.0 to 10.0 Trust Score with automated JSON schema validation and permission sandboxing
- **Stack Builder**: Multi-server bundle configuration generator for Claude, Cursor, Windsurf, and Zed

## Machine-Readable Resources
- **Full Catalog Context**: https://mcp.ritualdev.in/llms-full.txt (unabridged machine context of all servers)
- **RSS 2.0 Weekly Digest**: https://mcp.ritualdev.in/feed.xml
- **JSON Feed 1.1**: https://mcp.ritualdev.in/feed.json
- **Web Edition Digest**: https://mcp.ritualdev.in/digest.html
- **REST API Health**: https://mcp.ritualdev.in/api/v1/health
- **REST API Server Search**: https://mcp.ritualdev.in/api/v1/servers?q={keyword}
- **Developer Server Submission**: https://mcp.ritualdev.in/api/v1/submit

## Supported Clients & Quick Install Syntax
- **Claude Desktop** (\`claude_desktop_config.json\` under \`mcpServers\`):
  \`\`\`json
  {
    "mcpServers": {
      "<server-id>": {
        "command": "npx",
        "args": ["-y", "<package-identifier>"]
      }
    }
  }
  \`\`\`
- **Cursor IDE** (Settings > Features > MCP Servers):
  Transport: stdio / command: \`npx -y <package-identifier>\`
- **Windsurf** (\`~/.codeium/windsurf/mcp_config.json\`)
- **Zed Editor** (\`~/.config/zed/settings.json\` under \`context_servers\`)
- **Interactive Terminal Explorer**:
  \`npx @ritualdev-lab/mcpshelf explore\`

## Categories & Top Audited Servers
`;

  for (const cat of categories) {
    const catServers = catalog.filter((s: any) => s.category?.toLowerCase() === cat.id.toLowerCase() || s.category?.toLowerCase() === cat.name.toLowerCase());
    llmsTxt += `\n### ${cat.icon || '📁'} ${cat.name} (${catServers.length} tools)\n`;
    llmsTxt += `${cat.description}\n\n`;

    const sample = catServers.slice(0, 5);
    for (const s of sample) {
      const slug = slugify(s.id);
      llmsTxt += `- [${s.title}](https://mcp.ritualdev.in/servers/${slug}.html): ${s.description} (Score: ${s.trustScore}/10, Transport: ${s.transportType})\n`;
    }
  }

  llmsTxt += `\n## Full Catalog Ingestion
For full, unabridged schemas, install configs, and permission details for all ${catalog.length} servers, query https://mcp.ritualdev.in/llms-full.txt\n`;

  fs.writeFileSync(path.join(siteDir, 'llms.txt'), llmsTxt);
  fs.writeFileSync(path.join(wellKnownDir, 'llms.txt'), llmsTxt);
  console.log('  📄 Wrote site/llms.txt and site/.well-known/llms.txt');

  // ---------------------------------------------------------------------------
  // 3. site/llms-full.txt (Comprehensive context ingestion for AI search engines)
  // ---------------------------------------------------------------------------
  let llmsFullTxt = `# MCPShelf Complete Catalog & Architectural Manifest
Canonical Registry: https://mcp.ritualdev.in
Total Verified Servers: ${catalog.length}
Generated At: ${new Date().toISOString()}

================================================================================
INDEX OF ALL PRODUCTION MCP SERVERS
================================================================================
`;

  for (let i = 0; i < catalog.length; i++) {
    const s = catalog[i];
    const slug = slugify(s.id);
    llmsFullTxt += `\n--- [${i + 1}/${catalog.length}] ${s.title} ---
ID: ${s.id}
Package: ${s.packageIdentifier || 'N/A'}
Category: ${s.category}
Trust Score: ${s.trustScore}/10 (${s.securityRating})
Transport: ${s.transportType}
Author: ${s.author}
Repository: ${s.repositoryUrl || 'N/A'}
URL: https://mcp.ritualdev.in/servers/${slug}.html
Description: ${s.description}
Claude Desktop Snippet:
${s.installSnippets?.claudeDesktop || 'N/A'}
Direct Terminal Run:
${s.installSnippets?.terminal || `npx -y ${s.packageIdentifier || s.id}`}
`;
  }

  fs.writeFileSync(path.join(siteDir, 'llms-full.txt'), llmsFullTxt);
  console.log(`  📚 Wrote site/llms-full.txt (${catalog.length} servers in full detail)`);

  // ---------------------------------------------------------------------------
  // 4. site/.well-known/ai-plugin.json (Standard AI Plugin Manifest)
  // ---------------------------------------------------------------------------
  const aiPluginJson = {
    schema_version: 'v1',
    name_for_model: 'mcpshelf_registry',
    name_for_human: 'MCPShelf MCP Registry & Directory',
    description_for_model: 'Search, audit, and generate multi-server configurations for 400+ Model Context Protocol (MCP) servers. Provides client configs for Claude Desktop, Cursor, Windsurf, and Zed.',
    description_for_human: 'Discover and 1-click install 400+ verified Model Context Protocol (MCP) servers.',
    auth: {
      type: 'none'
    },
    api: {
      type: 'openapi',
      url: 'https://mcp.ritualdev.in/openapi.json'
    },
    logo_url: 'https://mcp.ritualdev.in/favicon.png',
    contact_email: 'founder@ritualdev.in',
    legal_info_url: 'https://mcp.ritualdev.in'
  };
  fs.writeFileSync(path.join(wellKnownDir, 'ai-plugin.json'), JSON.stringify(aiPluginJson, null, 2));
  console.log('  🔌 Wrote site/.well-known/ai-plugin.json');

  // ---------------------------------------------------------------------------
  // 5. Rich Image-Annotated XML Sitemap (site/sitemap.xml)
  // ---------------------------------------------------------------------------
  interface SitemapItem {
    loc: string;
    lastmod: string;
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: string;
    imageTitle?: string;
    imageCaption?: string;
    imageLoc?: string;
  }

  const sitemapItems: SitemapItem[] = [
    {
      loc: 'https://mcp.ritualdev.in/',
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '1.0',
      imageLoc: 'https://mcp.ritualdev.in/og/default.png',
      imageTitle: 'MCPShelf - Next-Gen Model Context Protocol Registry',
      imageCaption: 'Discover, audit, and install 400+ verified MCP servers with 1-click stack builder'
    },
    {
      loc: 'https://mcp.ritualdev.in/digest.html',
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.9',
      imageLoc: 'https://mcp.ritualdev.in/og/digest.png',
      imageTitle: 'MCPShelf Weekly AI Agent Digest',
      imageCaption: 'The weekly newsletter covering newly published and trending Model Context Protocol servers'
    },
    {
      loc: 'https://mcp.ritualdev.in/boost.html',
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.9',
      imageLoc: 'https://mcp.ritualdev.in/og/boost.png',
      imageTitle: 'Boost Your MCP Server - MCPShelf Marketplace',
      imageCaption: 'Self-serve developer boosting and sponsorship tiers for AI agent creators'
    },
    {
      loc: 'https://mcp.ritualdev.in/submit.html',
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.9',
      imageLoc: 'https://mcp.ritualdev.in/og/submit.png',
      imageTitle: 'Submit an MCP Server - MCPShelf',
      imageCaption: 'Submit your open-source Model Context Protocol server for indexing and trust rating'
    },
    {
      loc: 'https://mcp.ritualdev.in/feed.xml',
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8'
    },
    {
      loc: 'https://mcp.ritualdev.in/feed.json',
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8'
    }
  ];

  // Category filter deep links
  for (const cat of categories) {
    sitemapItems.push({
      loc: `https://mcp.ritualdev.in/?cat=${encodeURIComponent(cat.id)}`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '0.85',
      imageLoc: 'https://mcp.ritualdev.in/og/default.png',
      imageTitle: `${cat.name} MCP Servers - MCPShelf`,
      imageCaption: cat.description
    });
  }

  // All 419+ Individual Server Detail Pages
  for (const s of catalog) {
    const slug = slugify(s.id);
    sitemapItems.push({
      loc: `https://mcp.ritualdev.in/servers/${slug}.html`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: s.trustScore >= 9.5 ? '0.85' : '0.80',
      imageLoc: `https://mcp.ritualdev.in/og/${slug}.png`,
      imageTitle: `${escapeXml(s.title)} MCP Server`,
      imageCaption: escapeXml(s.description?.slice(0, 160) || '')
    });
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapItems.map(item => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>${item.imageLoc ? `
    <image:image>
      <image:loc>${item.imageLoc}</image:loc>
      <image:title>${item.imageTitle || ''}</image:title>
      <image:caption>${item.imageCaption || ''}</image:caption>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), sitemapXml);
  console.log(`  🗺️ Generated site/sitemap.xml with ${sitemapItems.length} indexed URLs & Google image annotations`);
  console.log('✅ [MCPShelf SEO/GEO/AEO Engine] SEO build completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
