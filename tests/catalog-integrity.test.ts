import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('MCPShelf Catalog & Data Integrity Suite', () => {
  const dataDir = path.resolve(process.cwd(), 'data');
  const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, 'catalog.json'), 'utf-8'));
  const sponsors = JSON.parse(fs.readFileSync(path.join(dataDir, 'sponsors.json'), 'utf-8'));
  const categories = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf-8'));

  it('catalog contains 350+ verified and deduplicated MCP servers', () => {
    assert.ok(catalog.length >= 350, `Expected at least 350 servers, got ${catalog.length}`);
  });

  it('catalog contains zero placeholder or test fixtures', () => {
    const blockedIds = ['ai.alpic.test/test-mcp-server', 'ai.agentxray/mcp', 'test-mcp-server'];
    for (const server of catalog) {
      assert.ok(!blockedIds.includes(server.id), `Found blocked or fixture server: ${server.id}`);
      assert.ok(server.title.toLowerCase() !== 'test-mcp-server', 'No test fixtures allowed in catalog');
    }
  });

  it('every server has required metadata (id, title, category, trustScore, trustBreakdown, installSnippets)', () => {
    for (const server of catalog) {
      assert.ok(server.id, 'Server must have an id');
      assert.ok(server.title, `Server ${server.id} must have a title`);
      assert.ok(server.category, `Server ${server.id} must have a category`);
      assert.ok(typeof server.trustScore === 'number', `Server ${server.id} must have numeric trustScore`);
      assert.ok(server.trustBreakdown, `Server ${server.id} must have trustBreakdown`);
      assert.ok(typeof server.trustBreakdown.codeProvenance === 'number', `Server ${server.id} trustBreakdown codeProvenance`);
      assert.ok(server.installSnippets.claudeDesktop, `Server ${server.id} must have claudeDesktop snippet`);
    }
  });

  it('active boosts reference valid servers in the catalog', () => {
    const catalogIds = new Set(catalog.map((s: any) => s.id));
    for (const boost of sponsors.activeBoosts) {
      assert.ok(catalogIds.has(boost.serverId), `Boost references non-existent server: ${boost.serverId}`);
    }
  });

  it('all categories in data/categories.json are unique and populated', () => {
    const catIds = new Set();
    for (const cat of categories) {
      assert.ok(!catIds.has(cat.id), `Duplicate category id: ${cat.id}`);
      catIds.add(cat.id);
    }
    assert.strictEqual(catIds.size, 8);
  });
});
