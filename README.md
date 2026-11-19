# MCPShelf ⚡
> The Open Model Context Protocol (MCP) Registry, Marketplace & Security Directory

[![Live Marketplace](https://img.shields.io/badge/Live%20Marketplace-mcp.ritualdev.in-22c55e?style=for-the-badge&logo=google-chrome&logoColor=white)](https://mcp.ritualdev.in)
[![Official Registry Mirror](https://img.shields.io/badge/Official%20Registry-Mirror%20Active-blue?style=for-the-badge)](https://registry.modelcontextprotocol.io)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-yellow.svg?style=for-the-badge)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/RitualDev-Lab/MCPShelf?style=for-the-badge&color=gold)](https://github.com/RitualDev-Lab/MCPShelf/stargazers)

**MCPShelf** is an open-source, decentralized registry and web marketplace for **Model Context Protocol (MCP)** servers. Hosted live at **[mcp.ritualdev.in](https://mcp.ritualdev.in)**, it mirrors the official Model Context Protocol registry while providing instant fuzzy search, 1-click install snippets, verified security audit scores, community ratings, and a self-serve creator boosting platform.

---

## 🌟 Key Features

- **⚡ 419+ Synchronized MCP Servers**: Fully synchronized with [`registry.modelcontextprotocol.io`](https://registry.modelcontextprotocol.io) nightly via automated GitHub Actions.
- **🛡️ Security Audit Scores & Trust Engine**: Independent trust ratings (0-10) assessing supply-chain vulnerabilities, permission checks, and sandbox compatibility.
- **🖱️ 1-Click Install Formats**: Instant copy-paste JSON configurations for:
  - **Anthropic Claude Desktop** (`claude_desktop_config.json`)
  - **Cursor IDE** (`~/.cursor/mcp.json`)
  - **Windsurf** (`~/.codeium/windsurf/mcp_config.json`)
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
