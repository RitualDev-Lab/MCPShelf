import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { validateSubmission } from '../scripts/developer-submission-api.js';

describe('Developer Submission API Gateway Suite', () => {
  it('rejects invalid target name', () => {
    const res = validateSubmission({ target: 'invalid' as any, item: { name: 'test', description: 'test', category: 'tools' } });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('target must be either'));
  });

  it('validates and scores a valid MCPShelf submission', () => {
    const res = validateSubmission({
      target: 'mcpshelf',
      item: {
        name: 'io.github.example/sample-mcp',
        description: 'Production-ready database MCP server with connection pooling and schema introspection',
        category: 'databases',
        repositoryUrl: 'https://github.com/example/sample-mcp',
        packageIdentifier: '@example/sample-mcp'
      }
    });
    assert.strictEqual(res.valid, true);
    assert.ok(res.trustScore && res.trustScore >= 9.0);
  });

  it('validates a valid DevShelf tool submission', () => {
    const res = validateSubmission({
      target: 'devshelf',
      item: {
        name: 'SuperDev CLI',
        description: 'Blazing fast terminal developer tool',
        category: 'cli-tools',
        websiteUrl: 'https://superdev.tools'
      }
    });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.trustScore, 9.0);
  });
});
