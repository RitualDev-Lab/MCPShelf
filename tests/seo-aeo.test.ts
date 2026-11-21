import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('MCPShelf SEO, AEO & Deployment Suite', () => {
  const siteDir = path.resolve(process.cwd(), 'site');

  it('site/CNAME is configured for mcp.ritualdev.in', () => {
    const cname = fs.readFileSync(path.join(siteDir, 'CNAME'), 'utf-8').trim();
    assert.strictEqual(cname, 'mcp.ritualdev.in');
  });

  it('site/sitemap.xml contains 400+ indexed URLs with Google image annotations and lastmod', () => {
    const sitemap = fs.readFileSync(path.join(siteDir, 'sitemap.xml'), 'utf-8');
    const matches = sitemap.match(/<loc>/g) || [];
    assert.ok(matches.length >= 400, `Expected at least 400 URLs in sitemap, got ${matches.length}`);
    assert.ok(sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), 'Expected image namespace in sitemap');
    assert.ok(sitemap.includes('<image:image>'), 'Expected image annotations in sitemap');
    assert.ok(sitemap.includes('<lastmod>'), 'Expected lastmod timestamps in sitemap');
    assert.ok(sitemap.includes('<priority>1.0</priority>'), 'Expected home priority in sitemap');
    // Strict XML entity verification to prevent Google Search Console parsing errors
    const unescapedAmpersands = sitemap.match(/&(?!(amp|lt|gt|quot|apos);)/g);
    assert.strictEqual(unescapedAmpersands, null, 'sitemap.xml must contain 0 unescaped ampersands');
  });

  it('site/feed.xml contains valid XML entities and 0 unescaped ampersands', () => {
    const feed = fs.readFileSync(path.join(siteDir, 'feed.xml'), 'utf-8');
    const unescapedAmpersands = feed.match(/&(?!(amp|lt|gt|quot|apos);)/g);
    assert.strictEqual(unescapedAmpersands, null, 'feed.xml must contain 0 unescaped ampersands');
    assert.strictEqual(feed.includes('&rarr;'), false, 'feed.xml must not contain non-XML entity &rarr;');
  });

  it('site/robots.txt allows web engines and generative AI agents (GEO/AEO)', () => {
    const robots = fs.readFileSync(path.join(siteDir, 'robots.txt'), 'utf-8');
    assert.ok(robots.includes('User-agent: *'), 'Expected global user-agent allowance');
    assert.ok(robots.includes('User-agent: Googlebot'), 'Expected Googlebot');
    assert.ok(robots.includes('User-agent: GPTBot'), 'Expected GPTBot for ChatGPT/SearchGPT');
    assert.ok(robots.includes('User-agent: ClaudeBot'), 'Expected ClaudeBot');
    assert.ok(robots.includes('User-agent: PerplexityBot'), 'Expected PerplexityBot');
    assert.ok(robots.includes('Sitemap: https://mcp.ritualdev.in/sitemap.xml'));
    assert.ok(robots.includes('LLMs-Txt: https://mcp.ritualdev.in/llms.txt'));
    assert.ok(robots.includes('LLMs-Full-Txt: https://mcp.ritualdev.in/llms-full.txt'));
  });

  it('site/llms.txt and site/llms-full.txt provide structured machine discovery', () => {
    const llmsTxt = fs.readFileSync(path.join(siteDir, 'llms.txt'), 'utf-8');
    assert.ok(llmsTxt.includes('# MCPShelf'));
    assert.ok(llmsTxt.includes('https://mcp.ritualdev.in/servers/'));

    const llmsFullTxt = fs.readFileSync(path.join(siteDir, 'llms-full.txt'), 'utf-8');
    assert.ok(llmsFullTxt.includes('INDEX OF ALL PRODUCTION MCP SERVERS'));
    assert.ok(llmsFullTxt.includes('Claude Desktop Snippet:'));

    // Check .well-known standard
    assert.ok(fs.existsSync(path.join(siteDir, '.well-known', 'llms.txt')));
    assert.ok(fs.existsSync(path.join(siteDir, '.well-known', 'ai-plugin.json')));
  });

  it('site/index.html includes search input, keyboard shortcut, and JSON-LD schemas', () => {
    const indexHtml = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes('id="searchInput"'));
    assert.ok(indexHtml.includes('id="categoryFilters"'));
    assert.ok(indexHtml.includes('id="installModal"'));

    // Verify Structured Data JSON-LD Schemas (SEO & AEO)
    assert.ok(indexHtml.includes('"@type": "WebSite"'), 'Missing WebSite JSON-LD');
    assert.ok(indexHtml.includes('"@type": "SearchAction"'), 'Missing SearchAction for Google Sitelinks Searchbox');
    assert.ok(indexHtml.includes('"@type": "Organization"'), 'Missing Organization JSON-LD');
    assert.ok(indexHtml.includes('"@type": "FAQPage"'), 'Missing FAQPage JSON-LD');

    // Verify Semantic Content Sections (GEO & User Accessibility)
    assert.ok(indexHtml.includes('id="compatibility"'), 'Missing compatibility matrix section');
    assert.ok(indexHtml.includes('id="architecture"'), 'Missing architectural guide section');
    assert.ok(indexHtml.includes('id="faq"'), 'Missing FAQ accordion section');
  });

  it('server detail pages include SoftwareApplication, BreadcrumbList, and FAQPage JSON-LD', () => {
    const serverFiles = fs.readdirSync(path.join(siteDir, 'servers')).filter(f => f.endsWith('.html'));
    assert.ok(serverFiles.length > 0, 'No server detail pages found');

    const samplePage = fs.readFileSync(path.join(siteDir, 'servers', serverFiles[0]), 'utf-8');
    assert.ok(samplePage.includes('"@type": "SoftwareApplication"'), 'Missing SoftwareApplication schema');
    assert.ok(samplePage.includes('"@type": "BreadcrumbList"'), 'Missing BreadcrumbList schema');
    assert.ok(samplePage.includes('"@type": "FAQPage"'), 'Missing FAQPage schema for AEO');
    assert.ok(samplePage.includes('aria-label="Breadcrumb"'), 'Missing semantic breadcrumb nav');
    assert.ok(samplePage.includes('id="btn-tab-claude"'), 'Missing multi-client tab buttons');
    assert.ok(samplePage.includes('name="geo.region"'), 'Missing GEO meta tag');
    assert.ok(samplePage.includes('property="og:site_name"'), 'Missing og:site_name meta tag');
  });

  it('all JSON-LD script blocks across main pages and server samples parse as valid JSON', () => {
    const pagesToTest = [
      path.join(siteDir, 'index.html'),
      path.join(siteDir, 'boost.html'),
      path.join(siteDir, 'submit.html'),
      path.join(siteDir, 'digest.html')
    ];

    const serverFiles = fs.readdirSync(path.join(siteDir, 'servers')).filter(f => f.endsWith('.html')).slice(0, 5);
    for (const sf of serverFiles) {
      pagesToTest.push(path.join(siteDir, 'servers', sf));
    }

    for (const pagePath of pagesToTest) {
      const html = fs.readFileSync(pagePath, 'utf-8');
      const ldRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
      let match: RegExpExecArray | null;
      let blockCount = 0;
      while ((match = ldRegex.exec(html)) !== null) {
        blockCount++;
        const jsonContent = match[1].trim();
        assert.doesNotThrow(() => {
          JSON.parse(jsonContent);
        }, `Invalid JSON in ${pagePath} JSON-LD block #${blockCount}`);
      }
      assert.ok(blockCount > 0, `Expected at least 1 JSON-LD block in ${pagePath}`);
    }
  });
});
