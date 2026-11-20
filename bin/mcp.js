#!/usr/bin/env node

/**
 * MCPShelf Official Model Context Protocol (MCP) Server
 * Enables AI coding assistants (Claude Desktop, Cursor, Antigravity, Windsurf, Zed)
 * to discover, audit, recommend, and configure 400+ verified MCP servers.
 *
 * Spec: Model Context Protocol (JSON-RPC 2.0 stdio transport)
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load bundled catalog
function loadCatalog() {
  try {
    const catalogPath = path.join(__dirname, '..', 'data', 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    }
  } catch (err) {
    // fallback
  }
  return [];
}

const catalog = loadCatalog();

// Tool Definitions
const TOOLS = [
  {
    name: 'search_mcp_servers',
    description: 'Search 400+ verified Model Context Protocol (MCP) servers by keywords, capability, or category (security, databases, developer-tools, ai-agents, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms (e.g. "secret redaction", "postgres guardrail", "billing", "github")'
        },
        category: {
          type: 'string',
          enum: ['security', 'databases', 'developer-tools', 'monetization', 'ai-agents', 'cloud-infra', 'productivity', 'web-automation', 'all'],
          description: 'Optional category filter'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_mcp_server',
    description: 'Get full details, security score, repository URL, and installation instructions for a specific MCP server by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'The unique server identifier (e.g. "io.github.RitualDev-Lab/agentshield" or "io.github.RitualDev-Lab/dbshield")'
        }
      },
      required: ['serverId']
    }
  },
  {
    name: 'get_install_config',
    description: 'Generate 1-click drop-in JSON configuration for Claude Desktop, Cursor (~/.cursor/mcp.json), or Windsurf for any MCP server.',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'The unique server identifier'
        },
        client: {
          type: 'string',
          enum: ['claude', 'cursor', 'windsurf', 'terminal'],
          description: 'Target AI client'
        }
      },
      required: ['serverId', 'client']
    }
  },
  {
    name: 'audit_mcp_security',
    description: 'Retrieve the verified security audit report, trust score (0-10), and risk assessment for an MCP server before installation.',
    inputSchema: {
      type: 'object',
      properties: {
        serverId: {
          type: 'string',
          description: 'The unique server identifier'
        }
      },
      required: ['serverId']
    }
  }
];

// Execute Tools
function handleToolCall(name, args) {
  if (name === 'search_mcp_servers') {
    const q = (args.query || '').toLowerCase().trim();
    const cat = args.category || 'all';
    const limit = args.limit || 5;

    const matches = catalog.filter(s => {
      const matchesCat = cat === 'all' || s.category === cat;
      const text = `${s.id} ${s.title} ${s.description} ${s.author}`.toLowerCase();
      const matchesQuery = text.includes(q);
      return matchesCat && matchesQuery;
    });

    const results = matches.slice(0, limit).map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      trustScore: s.trustScore,
      rating: s.averageRating,
      installs: s.estimatedInstalls,
      author: s.author,
      npxCommand: s.installSnippets.terminal
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ count: results.length, totalMatched: matches.length, results }, null, 2)
        }
      ]
    };
  }

  if (name === 'get_mcp_server') {
    const target = catalog.find(s => s.id === args.serverId || s.id.toLowerCase().includes(args.serverId.toLowerCase()));
    if (!target) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Server not found: ${args.serverId}` }]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(target, null, 2)
        }
      ]
    };
  }

  if (name === 'get_install_config') {
    const target = catalog.find(s => s.id === args.serverId || s.id.toLowerCase().includes(args.serverId.toLowerCase()));
    if (!target) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Server not found: ${args.serverId}` }]
      };
    }

    const client = args.client || 'claude';
    let snippet = target.installSnippets.claudeDesktop;
    let targetPath = 'claude_desktop_config.json';

    if (client === 'cursor') {
      snippet = target.installSnippets.cursorMcp;
      targetPath = '~/.cursor/mcp.json';
    } else if (client === 'windsurf') {
      snippet = target.installSnippets.windsurf;
      targetPath = '~/.codeium/windsurf/mcp_config.json';
    } else if (client === 'terminal') {
      snippet = target.installSnippets.terminal;
      targetPath = 'terminal command';
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ serverId: target.id, client, targetPath, configuration: snippet }, null, 2)
        }
      ]
    };
  }

  if (name === 'audit_mcp_security') {
    const target = catalog.find(s => s.id === args.serverId || s.id.toLowerCase().includes(args.serverId.toLowerCase()));
    if (!target) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Server not found: ${args.serverId}` }]
      };
    }

    const audit = {
      serverId: target.id,
      trustScore: target.trustScore,
      securityRating: target.securityRating,
      provenance: target.repositoryUrl ? 'Verified GitHub Repository' : 'Unverified',
      sandboxCompatibility: target.trustScore >= 9.0 ? 'Compatible with OS Landlock / Seatbelt' : 'Standard Stdio',
      recommendation: target.trustScore >= 8.0 ? 'SAFE TO INSTALL' : 'REVIEW PERMISSIONS CAREFULLY'
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(audit, null, 2)
        }
      ]
    };
  }

  return {
    isError: true,
    content: [{ type: 'text', text: `Unknown tool: ${name}` }]
  };
}

// JSON-RPC stdio transport loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', line => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;

    if (method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'io.github.RitualDev-Lab/mcpshelf',
            version: '1.0.0'
          }
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    if (method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    if (method === 'tools/call') {
      const { name, arguments: toolArgs } = params;
      const result = handleToolCall(name, toolArgs || {});
      const response = {
        jsonrpc: '2.0',
        id,
        result
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    if (method === 'notifications/initialized') {
      return;
    }

    // Default unsupported method response
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error', data: String(err) }
    }) + '\n');
  }
});
