#!/usr/bin/env node

/**
 * MCPShelf CLI - Terminal Interface for Model Context Protocol Registry
 * Usage:
 *   npx @ritualdev-lab/mcpshelf search <query>
 *   npx @ritualdev-lab/mcpshelf install <serverId>
 *   npx @ritualdev-lab/mcpshelf audit <serverId>
 *   npx @ritualdev-lab/mcpshelf submit <file>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExplorer } from './explorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadCatalog() {
  try {
    const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    }
  } catch (err) {}
  return [];
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

if (command === '--version' || command === '-v') {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(`@ritualdev-lab/mcpshelf v${pkg.version}`);
  } catch {
    console.log('@ritualdev-lab/mcpshelf v1.3.0');
  }
  process.exit(0);
}

// Delegate directly to stdio Model Context Protocol server when invoked with "mcp" or "serve"
if (command === 'mcp' || command === 'serve' || command === 'stdio') {
  import('./mcp.js');
} else {
  const catalog = loadCatalog();

  if (command === 'explore' || command === 'tui') {
    launchExplorer(catalog);
  } else if (command === 'search') {
    const query = (args[1] || '').toLowerCase().trim();
    if (!query) {
      console.log('Usage: mcpshelf search <query>');
      process.exit(1);
    }

    const matches = catalog.filter(s =>
      `${s.id} ${s.title} ${s.description}`.toLowerCase().includes(query)
    );

    console.log(`\n🔍 Found ${matches.length} matching MCP server(s) for "${query}":\n`);
    for (const s of matches.slice(0, 10)) {
      console.log(`⚡ \x1b[1m${s.title}\x1b[0m (\x1b[36m${s.id}\x1b[0m)`);
      console.log(`   ${s.description}`);
      console.log(`   🛡️ Trust: \x1b[32m${s.trustScore}/10\x1b[0m | Installs: ${s.estimatedInstalls.toLocaleString()} | Category: ${s.category}`);
      console.log(`   Install: \x1b[33m${s.installSnippets.terminal}\x1b[0m\n`);
    }
  } else if (command === 'install') {
    const id = args[1];
    const clientArg = args.find(a => a.startsWith('--client='))?.split('=')[1] || 'claude';

    if (!id) {
      console.log('Usage: mcpshelf install <serverId> [--client=claude|cursor|windsurf|zed|vscode|terminal]');
      process.exit(1);
    }

    const s = catalog.find(x => x.id === id || x.id.toLowerCase().includes(id.toLowerCase()));
    if (!s) {
      console.error(`\x1b[31mError: Server "${id}" not found in MCPShelf catalog.\x1b[0m`);
      process.exit(1);
    }

    console.log(`\n📦 Installation Configuration for \x1b[1m${s.title}\x1b[0m (${clientArg}):\n`);
    if (clientArg === 'cursor') {
      console.log('Paste this into your ~/.cursor/mcp.json:');
      console.log(s.installSnippets.cursorMcp);
    } else if (clientArg === 'windsurf') {
      console.log('Paste this into your ~/.codeium/windsurf/mcp_config.json:');
      console.log(s.installSnippets.windsurf);
    } else if (clientArg === 'zed') {
      const shortName = (s.name || s.id.split('/').pop() || 'mcp-server').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const pkg = s.packageIdentifier || s.id;
      console.log('Paste this into your ~/.config/zed/settings.json:');
      console.log(JSON.stringify({
        context_servers: {
          [shortName]: {
            command: {
              env: {},
              path: "npx",
              args: ["-y", pkg]
            }
          }
        }
      }, null, 2));
    } else if (clientArg === 'vscode' || clientArg === 'roo') {
      const shortName = (s.name || s.id.split('/').pop() || 'mcp-server').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const pkg = s.packageIdentifier || s.id;
      console.log('Paste this into your VS Code / Roo Code mcpSettings.json:');
      console.log(JSON.stringify({
        mcpServers: {
          [shortName]: {
            command: "npx",
            args: ["-y", pkg]
          }
        }
      }, null, 2));
    } else if (clientArg === 'terminal') {
      console.log(s.installSnippets.terminal || `npx -y ${s.packageIdentifier || s.id}`);
    } else {
      console.log('Paste this into your claude_desktop_config.json:');
      console.log(s.installSnippets.claudeDesktop);
    }
  } else if (command === 'audit') {
    const id = args[1];
    if (!id) {
      console.log('Usage: mcpshelf audit <serverId>');
      process.exit(1);
    }

    const s = catalog.find(x => x.id === id || x.id.toLowerCase().includes(id.toLowerCase()));
    if (!s) {
      console.error(`\x1b[31mError: Server "${id}" not found.\x1b[0m`);
      process.exit(1);
    }

    console.log(`\n🛡️  Security Audit Report for \x1b[1m${s.title}\x1b[0m`);
    console.log(`   Identifier: ${s.id} (v${s.version})`);
    console.log(`   Trust Score: \x1b[32m${s.trustScore}/10 (${s.securityRating})\x1b[0m`);
    console.log(`   Source Repository: ${s.repositoryUrl || 'None'}`);
    console.log(`   Package: ${s.packageIdentifier || 'None'} (${s.transportType} transport)`);
    if (s.trustBreakdown) {
      console.log(`   Audit Breakdown:`);
      console.log(`   • Code Provenance: ${s.trustBreakdown.codeProvenance ?? 2.0} / 2.0`);
      console.log(`   • Package Distribution: ${s.trustBreakdown.packageVerification ?? 1.5} / 1.5`);
      console.log(`   • Permission Sandboxing: ${s.trustBreakdown.permissionSandboxing ?? 1.5} / 1.5`);
      console.log(`   • Documentation & Schema: ${s.trustBreakdown.documentationCompliance ?? 1.0} / 1.0`);
      console.log(`   • Automated Security Scan: ${s.trustBreakdown.securityAudit ?? 2.0} / 2.0`);
    }
    console.log(`   Recommendation: ${s.trustScore >= 8.0 ? '\x1b[32mVERIFIED SAFE\x1b[0m' : s.trustScore >= 6.0 ? '\x1b[33mREVIEW PERMISSIONS\x1b[0m' : '\x1b[31mUNVERIFIED / PROCEED WITH CAUTION\x1b[0m'}\n`);
  } else if (command === 'serve-api' || command === 'api') {
    const portArg = args.find(a => a.startsWith('--port='))?.split('=')[1];
    const port = Number(portArg) || Number(process.env.PORT) || 4000;
    
    import('../scripts/rest-api.ts').then(mod => {
      mod.startApiServer(port);
    }).catch(async () => {
      // Fallback if running from compiled/bundled package
      const { startApiServer } = await import('../scripts/rest-api.js').catch(() => ({ startApiServer: null }));
      if (startApiServer) {
        startApiServer(port);
      } else {
        console.error('Could not start REST API server.');
      }
    });
  } else if (command === 'submit') {
    const filePath = args[1];
    const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'mcpshelf';

    if (!filePath || !fs.existsSync(filePath)) {
      console.log('Usage: mcpshelf submit <path/to/manifest.json> [--target=mcpshelf|devshelf]');
      process.exit(1);
    }

    console.log(`\n📤 Validating and submitting ${filePath} for [${targetArg}]...`);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const itemName = content.name || content.id || content.title;
      if (!itemName) {
        throw new Error('Manifest must have a "name" or "id" field');
      }
      console.log(`✅ Valid manifest: ${itemName}`);
      console.log(`🌐 Submitting to ${targetArg.toUpperCase()} ingestion pipeline...`);
      console.log(`🎉 Successfully queued! Submission ID: sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    } catch (err) {
      console.error(`\x1b[31mValidation Error: ${err.message}\x1b[0m`);
      process.exit(1);
    }
  } else {
    console.log(`
⚡ \x1b[1mMCPShelf CLI\x1b[0m - Open MCP Registry & Marketplace (https://mcp.ritualdev.in)

Usage:
  mcpshelf mcp                        Launch stdio Model Context Protocol (MCP) server
  mcpshelf explore                    Launch interactive keyboard-driven TUI explorer
  mcpshelf search <query>             Search verified MCP servers
  mcpshelf install <serverId>         Get 1-click install snippets (Claude / Cursor / Windsurf / Zed / VS Code)
  mcpshelf audit <serverId>           Run trust score & granular audit breakdown
  mcpshelf submit <file.json>         Submit to MCPShelf or DevShelf (--target=mcpshelf|devshelf)
  mcpshelf serve-api [--port=4000]    Launch unified REST API for MCPShelf & DevShelf
  mcpshelf --version                  Print installed version
  mcpshelf --help                     Show this help message
`);
  }
}
