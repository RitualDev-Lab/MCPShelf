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

  it('site/sitemap.xml contains 400+ indexed URLs', () => {
    const sitemap = fs.readFileSync(path.join(siteDir, 'sitemap.xml'), 'utf-8');
    const matches = sitemap.match(/<loc>/g) || [];
    assert.ok(matches.length >= 400, `Expected at least 400 URLs in sitemap, got ${matches.length}`);
  });

  it('site/llms.txt provides structured machine discovery for AI agents', () => {
    const llmsTxt = fs.readFileSync(path.join(siteDir, 'llms.txt'), 'utf-8');
    assert.ok(llmsTxt.includes('# MCPShelf'));
    assert.ok(llmsTxt.includes('https://mcp.ritualdev.in/servers/'));
  });

  it('site/index.html includes search input and keyboard shortcut', () => {
    const indexHtml = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes('id="searchInput"'));
    assert.ok(indexHtml.includes('id="categoryFilters"'));
    assert.ok(indexHtml.includes('id="installModal"'));
  });
});
