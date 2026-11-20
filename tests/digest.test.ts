import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';
import { generateDigestFiles } from '../scripts/generate-digest.js';
import { createApiServer } from '../scripts/rest-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteDir = path.resolve(__dirname, '..', 'site');

function makeHttpRequest(
  port: number,
  path: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('📰 Weekly AI Agent Digest & Feed Generation Suite', () => {
  before(() => {
    generateDigestFiles();
  });

  it('generates a valid RSS 2.0 XML feed at site/feed.xml', () => {
    const feedXmlPath = path.join(siteDir, 'feed.xml');
    assert.ok(fs.existsSync(feedXmlPath), 'site/feed.xml must exist');

    const xml = fs.readFileSync(feedXmlPath, 'utf-8');
    assert.match(xml, /<rss version="2\.0"/, 'Must be valid RSS 2.0');
    assert.match(xml, /<channel>/, 'Must contain <channel>');
    assert.match(xml, /<title>MCPShelf - Weekly AI Agent Digest<\/title>/, 'Must have correct title');
    assert.match(xml, /<atom:link href="https:\/\/mcp\.ritualdev\.in\/feed\.xml"/, 'Must contain atom self-link');

    // Count items
    const itemCount = (xml.match(/<item>/g) || []).length;
    assert.ok(itemCount >= 10, `Feed should contain at least 10 curated items, found: ${itemCount}`);

    // Check item structure
    assert.match(xml, /<guid isPermaLink="true">https:\/\/mcp\.ritualdev\.in\/servers\//, 'Items must have permalink GUID');
    assert.match(xml, /<enclosure url="https:\/\/mcp\.ritualdev\.in\/og\//, 'Items must have 1200x630 preview image enclosure');
  });

  it('generates a valid JSON Feed 1.1 at site/feed.json', () => {
    const feedJsonPath = path.join(siteDir, 'feed.json');
    assert.ok(fs.existsSync(feedJsonPath), 'site/feed.json must exist');

    const json = JSON.parse(fs.readFileSync(feedJsonPath, 'utf-8'));
    assert.strictEqual(json.version, 'https://jsonfeed.org/version/1.1');
    assert.strictEqual(json.title, 'MCPShelf - Weekly AI Agent Digest');
    assert.ok(Array.isArray(json.items), 'items must be an array');
    assert.ok(json.items.length >= 10, 'must have at least 10 items');

    const first = json.items[0];
    assert.ok(first.id, 'item must have id');
    assert.ok(first.url, 'item must have url');
    assert.ok(first.title, 'item must have title');
    assert.ok(first.image, 'item must have image URL');
  });

  it('generates the standalone web edition at site/digest.html', () => {
    const digestHtmlPath = path.join(siteDir, 'digest.html');
    assert.ok(fs.existsSync(digestHtmlPath), 'site/digest.html must exist');

    const html = fs.readFileSync(digestHtmlPath, 'utf-8');
    assert.match(html, /<title>Weekly AI Agent Digest - MCPShelf Marketplace<\/title>/);
    assert.match(html, /id="subscribe-form"/, 'Must include interactive newsletter subscription form');
    assert.match(html, /rel="alternate" type="application\/rss\+xml"/, 'Must link to RSS feed');
    assert.match(html, /rel="alternate" type="application\/json"/, 'Must link to JSON feed');
    assert.match(html, /copyRssUrl\(\)/, 'Must include copy RSS utility');
  });
});

describe('🌐 REST API Digest & Subscription Suite', () => {
  let server: http.Server;
  const PORT = 4096;

  before(async () => {
    server = createApiServer();
    await new Promise<void>(resolve => server.listen(PORT, resolve));
  });

  after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('GET /api/v1/digest returns JSON feed with items', async () => {
    const res = await makeHttpRequest(PORT, '/api/v1/digest', 'GET');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.title, 'MCPShelf - Weekly AI Agent Digest');
    assert.ok(Array.isArray(res.body.items));
  });

  it('POST /api/v1/subscribe rejects invalid email address', async () => {
    const res = await makeHttpRequest(
      PORT,
      '/api/v1/subscribe',
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: 'not-an-email' })
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error, /valid email address is required/i);
  });

  it('POST /api/v1/subscribe successfully enrolls valid email', async () => {
    const testEmail = `agent_${Date.now()}@testbench.ai`;
    const res = await makeHttpRequest(
      PORT,
      '/api/v1/subscribe',
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: testEmail, source: 'unit-test' })
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /successfully subscribed/i);
  });

  it('POST /api/v1/subscribe handles duplicate subscription gracefully', async () => {
    const testEmail = 'developer@ritualdev.in';
    const res = await makeHttpRequest(
      PORT,
      '/api/v1/subscribe',
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: testEmail })
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /already subscribed/i);
  });
});
