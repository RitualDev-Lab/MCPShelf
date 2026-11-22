import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { processSubmissionData } from '../scripts/process-submission.ts';

describe('🤖 No-Code Submission Pipeline Suite', () => {
  it('parses form issue body and generates verified server entry', () => {
    const catalogPath = path.resolve(process.cwd(), 'data', 'catalog.json');
    const catalogBefore = fs.readFileSync(catalogPath, 'utf8');

    try {
      const mockIssueBody = `
### Server Identifier / Package Name
io.github.test-org/ai-memory-guard

### Human-Readable Title
AI Memory Guard & Semantic Context Isolator

### Detailed Description
Provides high-performance persistent vector memory isolation and prompt sanitization tools for autonomous AI agents.

### Category
Security & Privacy

### Source Code Repository URL
https://github.com/test-org/ai-memory-guard

### Official server.json Manifest
\`\`\`json
{
  "name": "io.github.test-org/ai-memory-guard",
  "version": "1.2.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@test-org/ai-memory-guard",
      "version": "1.2.0"
    }
  ]
}
\`\`\`
      `.trim();

      const { server, slug } = processSubmissionData(mockIssueBody);

      assert.strictEqual(server.id, 'io.github.test-org/ai-memory-guard');
      assert.strictEqual(server.title, 'AI Memory Guard & Semantic Context Isolator');
      assert.strictEqual(server.category, 'security');
      assert.strictEqual(server.packageIdentifier, '@test-org/ai-memory-guard');
      assert.strictEqual(server.version, '1.2.0');
      assert.ok(server.trustScore >= 8.0, `Expected trust score >= 8.0, got ${server.trustScore}`);
      assert.ok(server.riskTier === 'Low' || server.riskTier === 'Moderate');
      assert.ok(server.installSnippets.terminal.includes('npx -y @test-org/ai-memory-guard'));
      assert.strictEqual(slug, 'io-github-test-org-ai-memory-guard');
    } finally {
      // Revert test mutations
      fs.writeFileSync(catalogPath, catalogBefore, 'utf8');

      const submissionsPath = path.resolve(process.cwd(), 'data', 'submissions.json');
      if (fs.existsSync(submissionsPath)) {
        try {
          const subs = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
          const filtered = subs.filter((s: any) => s.serverId !== 'io.github.test-org/ai-memory-guard');
          fs.writeFileSync(submissionsPath, JSON.stringify(filtered, null, 2) + '\n', 'utf8');
        } catch {
          // Ignore
        }
      }
    }
  });
});
