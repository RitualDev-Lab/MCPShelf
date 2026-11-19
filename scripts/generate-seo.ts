import * as fs from 'node:fs';
import * as path from 'node:path';

function slugify(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

async function main() {
  console.log('🌐 [MCPShelf SEO] Generating sitemaps, robots.txt, and llms.txt...');

  const dataDir = path.resolve(process.cwd(), 'data');
  const siteDir = path.resolve(process.cwd(), 'site');
  const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf-8'));

  // Robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://mcp.ritualdev.in/sitemap.xml
`;
  fs.writeFileSync(path.join(siteDir, 'robots.txt'), robotsTxt);

  // llms.txt (RFC-standard machine discovery for LLMs and AI coding agents)
  let llmsTxt = `# MCPShelf - The Open Model Context Protocol (MCP) Registry & Directory
> Discover, audit, and install 400+ Model Context Protocol servers into Claude Desktop, Cursor, and Windsurf.

## Overview
MCPShelf (https://mcp.ritualdev.in) is the community mirror and marketplace for Model Context Protocol servers.

## Top Verified MCP Servers
`;
  for (const s of catalog.slice(0, 50)) {
    llmsTxt += `- [${s.title}](https://mcp.ritualdev.in/servers/${slugify(s.id)}.html): ${s.description} (Category: ${s.category}, Trust Score: ${s.trustScore}/10)\n`;
  }
  fs.writeFileSync(path.join(siteDir, 'llms.txt'), llmsTxt);

  // Sitemap.xml
  const urls: string[] = [
    'https://mcp.ritualdev.in/',
    'https://mcp.ritualdev.in/boost.html',
    'https://mcp.ritualdev.in/submit.html'
  ];

  for (const s of catalog) {
    urls.push(`https://mcp.ritualdev.in/servers/${slugify(s.id)}.html`);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u}</loc>
    <changefreq>daily</changefreq>
    <priority>${u.endsWith('.html') && !u.endsWith('boost.html') ? '0.8' : '1.0'}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), sitemapXml);
  console.log(`  🗺️ Generated site/sitemap.xml with ${urls.length} indexed URLs`);
  console.log('  🤖 Generated site/llms.txt and site/robots.txt');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
