import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import * as http from 'node:http';
import { createApiServer } from '../scripts/rest-api.ts';

describe('Unified REST API Suite (MCPShelf & DevShelf)', () => {
  let server: http.Server;
  const TEST_PORT = 4999;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  before(async () => {
    server = createApiServer();
    await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('GET /api/v1/health returns health and stats for both platforms', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.ok(body.stats.mcpServers >= 350, 'Should have 350+ MCP servers');
    assert.ok(body.stats.devTools > 500, 'Should have 500+ DevShelf tools');
  });

  test('GET /api/v1/servers searches MCPShelf servers', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/servers?q=agentshield`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.servers.length >= 1);
    assert.strictEqual(body.servers[0].id, 'io.github.RitualDev-Lab/agentshield');
  });

  test('GET /api/v1/servers/:id retrieves server with install config', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/servers/io.github.RitualDev-Lab/dbshield`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, 'io.github.RitualDev-Lab/dbshield');
    assert.ok(body.installSnippets.terminal.includes('@ritualdev-lab/dbshield'));
  });

  test('GET /api/v1/tools searches DevShelf tools', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/tools?q=ripgrep`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.tools.length >= 1);
    assert.strictEqual(body.tools[0].name.toLowerCase(), 'ripgrep');
  });

  test('POST /api/v1/submit validates and queues an MCP server', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'mcpshelf',
        item: {
          name: 'test-mcp-server',
          description: 'A test MCP server for verification',
          category: 'developer-tools',
          repositoryUrl: 'https://github.com/example/test-mcp',
          packageIdentifier: '@example/test-mcp'
        }
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.target, 'mcpshelf');
    assert.ok(body.submissionId.startsWith('sub_'));
  });

  test('POST /api/v1/submit validates and queues a DevShelf tool', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'devshelf',
        item: {
          name: 'SuperDevTool',
          description: 'Free open source development tool',
          repositoryUrl: 'https://github.com/example/super-dev-tool',
          category: 'cli-tools'
        }
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.target, 'devshelf');
    assert.ok(body.submissionId.startsWith('sub_'));
  });
});
