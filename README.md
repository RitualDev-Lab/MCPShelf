# MCPShelf ⚡
> The Open Model Context Protocol (MCP) Registry, Marketplace & Security Directory

[![CI](https://github.com/RitualDev-Lab/MCPShelf/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/RitualDev-Lab/MCPShelf/actions/workflows/ci.yml)
[![Live Registry](https://img.shields.io/badge/Live_Registry-mcp.ritualdev.in-22c55e.svg?style=flat-square&logo=googlechrome&logoColor=white)](https://mcp.ritualdev.in)
[![npm](https://img.shields.io/npm/v/@ritualdev-lab/mcpshelf.svg?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@ritualdev-lab/mcpshelf)
[![PyPI](https://img.shields.io/pypi/v/mcpshelf.svg?style=flat-square&color=3775A9&logo=pypi&logoColor=white)](https://pypi.org/project/mcpshelf/)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg?style=flat-square)](tests/)
[![Trust Rubric](https://img.shields.io/badge/Trust_Rubric-5--Factor_Audited-emerald.svg?style=flat-square)](TRUST_SCORE.md)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg?style=flat-square)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP_Protocol-v1.1.0-6366f1.svg?style=flat-square)](https://modelcontextprotocol.io)

**MCPShelf** is an open-source, decentralized registry and web marketplace for **Model Context Protocol (MCP)** servers. Hosted live at **[mcp.ritualdev.in](https://mcp.ritualdev.in)**, it mirrors the official Model Context Protocol registry while providing instant fuzzy search, 1-click install snippets, verified multi-factor security audit scores, community ratings, and a self-serve creator boosting platform.

---

## 🌟 Key Features

- **⚡ 400+ Verified MCP Servers**: Continuously deduplicated and synchronized with [`registry.modelcontextprotocol.io`](https://registry.modelcontextprotocol.io) nightly via automated GitHub Actions.
- **🛡️ 5-Factor Security Audit Scores & Trust Rubric**: Granular trust ratings (1.5 to 10.0) evaluating Code Provenance, Package Distribution, Permission Sandboxing, Documentation Compliance, and Automated AST Auditing. Read the full [Trust Scoring Rubric](TRUST_SCORE.md).
- **🖱️ 1-Click Install Formats**: Instant copy-paste JSON configurations for:
  - **Anthropic Claude Desktop** (`claude_desktop_config.json`)
  - **Cursor IDE** (`~/.cursor/mcp.json`)
  - **Windsurf** (`~/.codeium/windsurf/mcp_config.json`)
  - **Zed Editor** (`~/.config/zed/settings.json`)
  - **VS Code / Roo Code** (`~/.vscode/mcpSettings.json`)
  - **Terminal / CLI** (`npx -y ...`, `uvx ...`)
- **🚀 Creator Self-Serve Boosting ("LinkedIn / X Promoted Spots")**:
  - Transparent promoted placements with `rel="sponsored"` compliance.
  - Self-serve checkout powered by Dodo Payments & Stripe (via [`@ritualdev-lab/mcp-monetize`](https://www.npmjs.com/package/@ritualdev-lab/mcp-monetize)).
  - Tiers: **Category Spotlight** ($19/mo), **Homepage Hero** ($49/mo), and **Enterprise Partner** ($99/mo).
- **🤖 AEO / GEO & AI Search Native**: Machine discovery manifests (`/llms.txt`, `/sitemap.xml`, `/robots.txt`) optimized for AI search engines like Perplexity, ChatGPT, and Claude.

---

## 🚀 1-Click Quickstart Example

Install the **AgentShield** security firewall into Claude Desktop:

```json
{
  "mcpServers": {
    "agentshield": {
      "command": "npx",
      "args": ["-y", "@ritualdev-lab/agentshield"]
    }
  }
}
```

Or install **DBShield** database guardrail into Cursor:

```json
{
  "mcpServers": {
    "dbshield": {
      "command": "npx",
      "args": ["-y", "@ritualdev-lab/dbshield"],
      "env": {
        "DBSHIELD_DIALECT": "sqlite"
      }
    }
  }
}
```

---

## 💰 Self-Serve Creator Boosting Tiers

To promote your MCP server to thousands of AI developers building with Claude and Cursor:

| Tier | Price | Placement & Visibility Perks |
| :--- | :---: | :--- |
| **🚀 Category Spotlight** | **\$19 / mo** | • Pinned to top 3 slots in its category<br>• Transparent "Promoted" badge<br>• 2x search relevance multiplier |
| **⚡ Homepage Hero Boost** | **\$49 / mo** | • Featured in the Homepage Hero Spotlight Grid<br>• Highlighted card across all search queries<br>• Featured in weekly newsletter to 5,000+ AI developers |
| **🛡️ Enterprise Verified Partner** | **\$99 / mo** | • Gold Verification Shield checkmark<br>• Dedicated Security Audit report badge<br>• Featured in curated Enterprise AI Agent stack |

Visit **[mcp.ritualdev.in/boost.html](https://mcp.ritualdev.in/boost.html)** to activate instant boosting.

### ⚡ Automated Webhook Integration (Dodo Payments)

MCPShelf includes an automated webhook fulfillment engine for instant, self-serve boosting upon checkout:

- **Webhook Endpoint**: `POST https://mcp.ritualdev.in/api/v1/webhooks/dodo`
- **Supported Events**:
  - `payment.succeeded`: Automatically activates server placement boost in `data/sponsors.json`.
  - `subscription.active` / `subscription.renewed`: Enforces recurring monthly boost visibility.
  - `subscription.cancelled` / `payment.refunded`: Deactivates boost immediately upon cancellation.
- **Enterprise Security**:
  - **Fail Closed**: Strictly rejects unverified webhooks if `DODO_WEBHOOK_SECRET` is unset.
  - **Cryptographic HMAC-SHA256**: Validates header signatures with constant-time equality checks (`timingSafeEqual`).
  - **Replay Attack Protection**: Deduplicates events by event ID and rejects stale timestamps (>300s).
  - **Atomic File Persistence**: Updates `data/sponsors.json` via atomic rename to eliminate race conditions.

---

## 📰 Weekly AI Agent Digest & RSS / JSON Feeds

Stay ahead of the Model Context Protocol ecosystem with the curated **Weekly AI Agent Digest**, delivered every Friday morning to 5,200+ engineers building autonomous agents:

- **Web Portal & Newsletter**: [mcp.ritualdev.in/digest.html](https://mcp.ritualdev.in/digest.html)
- **RSS 2.0 Feed** (with 1200x630 preview card enclosures): `https://mcp.ritualdev.in/feed.xml`
- **JSON Feed 1.1** (Agent-ready machine consumable feed): `https://mcp.ritualdev.in/feed.json`
- **Programmatic Feed API**: `GET https://mcp.ritualdev.in/api/v1/digest`
- **Subscriber Ingestion API**: `POST https://mcp.ritualdev.in/api/v1/subscribe`

```bash
# Subscribe programmatically to the weekly digest
curl -X POST https://mcp.ritualdev.in/api/v1/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com", "source": "terminal"}'
```

---

## 📦 Multi-Language Ecosystem & CLI

### NPM CLI & Direct Execution
MCPShelf is available directly via npm:
```bash
# Connect as official Model Context Protocol (MCP) server
npx @ritualdev-lab/mcpshelf mcp

# Launch interactive keyboard-driven terminal explorer (TUI)
npx @ritualdev-lab/mcpshelf explore

# Instant search across all verified MCP servers
npx @ritualdev-lab/mcpshelf search <query>

# Generate 1-click install snippets for Claude, Cursor, Windsurf, Zed, or VS Code
npx @ritualdev-lab/mcpshelf install <server-id> [--client=claude|cursor|windsurf|zed|vscode|terminal]

# Run trust & multi-factor security compliance audit (see TRUST_SCORE.md)
npx @ritualdev-lab/mcpshelf audit <server-id>
```

### MCPShelf MCP Server (Query the Registry inside Claude / Cursor / VS Code)
You can connect the MCPShelf registry directly into Claude Desktop, Cursor, or VS Code so your AI assistant can discover and install MCP servers on the fly:

```json
{
  "mcpServers": {
    "mcpshelf": {
      "command": "npx",
      "args": ["-y", "@ritualdev-lab/mcpshelf", "mcp"]
    }
  }
}
```

### Python SDK & PyPI Package
```bash
pip install mcpshelf

# Search servers via Python CLI
mcpshelf search database

# Run local MCP server over stdio
python -m mcpshelf.server
# or
mcpshelf mcp
```

---

## 🔌 Unified Developer Submission API (MCPShelf & DevShelf)

Developers and agent frameworks can programmatically submit MCP servers and developer tools to both **MCPShelf** and **DevShelf** using the unified ingestion API or CLI.

### Option 1: Via CLI
```bash
# Submit to MCPShelf
npx @ritualdev-lab/mcpshelf submit ./server.json --target=mcpshelf

# Submit to DevShelf
npx @ritualdev-lab/mcpshelf submit ./tool.json --target=devshelf
```

### Option 2: Via REST API (`POST /api/v1/submit`)
```bash
curl -X POST https://mcp.ritualdev.in/api/v1/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <OPTIONAL_API_KEY>" \
  -d '{
    "target": "mcpshelf",
    "server": {
      "id": "io.github.example/my-server",
      "name": "My MCP Server",
      "description": "Enterprise database and cache proxy",
      "category": "databases",
      "homepage": "https://example.com",
      "packages": [
        { "registry": "npm", "name": "my-mcp-server", "version": "1.0.0" }
      ],
      "remotes": [
        { "type": "git", "url": "https://github.com/example/my-server" }
      ]
    }
  }'
```

---

## 🌐 Custom Domain & Cloudflare Setup

To route `mcp.ritualdev.in` to MCPShelf on GitHub Pages:
1. Log in to your **Cloudflare Dashboard** and select domain `ritualdev.in`.
2. Go to **DNS** > **Records** > **Add Record**:
   - **Type**: `CNAME`
   - **Name**: `mcp`
   - **Target**: `ritualdev-lab.github.io`
   - **Proxy Status**: *DNS Only (Gray Cloud)* or *Proxied (Orange Cloud)*.
3. If using **Proxied (Orange Cloud)**:
   - Ensure **SSL/TLS Encryption Mode** is set to **Full** or **Full (Strict)** to avoid SSL redirect loops with GitHub Pages.
4. GitHub Pages is already pre-configured with `mcp.ritualdev.in` and SSL certificate approval.

---

## 🛠️ Local Development & Contributing

### Requirements
- Node.js >= 20.0.0
- npm / pnpm

### Setup
```bash
# Clone the repository
git clone https://github.com/RitualDev-Lab/MCPShelf.git
cd MCPShelf

# Install dependencies
npm install

# Synchronize latest servers from official MCP registry
npm run sync

# Build static site and SEO manifests
npm run build:site
npm run build:seo

# Run automated integrity test suite
npm test

# Preview locally at http://localhost:3000
npm run dev
```

---

## 📜 License & Governance

MCPShelf is open-source software licensed under the [Apache-2.0 License](LICENSE). Maintained by [RitualDev Lab](https://github.com/RitualDev-Lab).
