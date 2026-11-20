import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, '..', 'bin', 'cli.js');

describe('⚡ MCPShelf Terminal Explorer Suite (mcpshelf explore)', () => {
  it('runs mcpshelf explore in non-TTY mode with graceful fallback', () => {
    const output = execSync(`node "${cliPath}" explore`, { encoding: 'utf-8' });
    assert.match(output, /⚡ MCPShelf Terminal Explorer \(Non-Interactive Mode\)/i);
    assert.match(output, /Catalog: \d+ verified MCP servers/i);
    assert.match(output, /AgentShield Enterprise Zero-Leak Secret Defense/i);
    assert.match(output, /Install: npx -y/i);
  });

  it('runs mcpshelf tui as an alias for explore', () => {
    const output = execSync(`node "${cliPath}" tui`, { encoding: 'utf-8' });
    assert.match(output, /⚡ MCPShelf Terminal Explorer/i);
    assert.match(output, /DBShield/i);
  });

  it('supports Zed Editor 1-click install snippet generation', () => {
    const output = execSync(`node "${cliPath}" install io.github.RitualDev-Lab/agentshield --client=zed`, { encoding: 'utf-8' });
    assert.match(output, /Paste this into your ~\/\.config\/zed\/settings\.json/i);
    assert.match(output, /context_servers/i);
    assert.match(output, /@ritualdev-lab\/agentshield/i);
  });

  it('supports direct terminal install snippet generation', () => {
    const output = execSync(`node "${cliPath}" install io.github.RitualDev-Lab/dbshield --client=terminal`, { encoding: 'utf-8' });
    assert.match(output, /npx -y @ritualdev-lab\/dbshield/i);
  });

  it('displays explore command in mcpshelf --help', () => {
    const output = execSync(`node "${cliPath}" --help`, { encoding: 'utf-8' });
    assert.match(output, /mcpshelf explore/i);
    assert.match(output, /Launch interactive keyboard-driven TUI explorer/i);
  });
});
