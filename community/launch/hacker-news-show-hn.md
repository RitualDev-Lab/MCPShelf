# 🚀 Hacker News Show HN Launch Kit for MCPShelf

> **Goal:** Frontpage Show HN placement, driving high developer dwell time, viral GitHub stars, and attracting MCP server maintainers.

---

## 📌 Submission Details

- **Title Option 1 (Recommended - Engineering & Value):**  
  `Show HN: MCPShelf – Open registry for Model Context Protocol servers with 1-click install`
- **Title Option 2 (Problem-First):**  
  `Show HN: We audited 400+ MCP servers for Cursor and Claude Desktop to stop context bloat`
- **Title Option 3 (Security & Trust):**  
  `Show HN: MCPShelf – Open-source MCP registry with security scanning and token footprinting`
- **URL:** `https://mcp.ritualdev.in`
- **Source Code:** `https://github.com/RitualDev-Lab/MCPShelf`

---

## 📝 First Comment (Post Body to submit immediately after submission)

```markdown
Hey HN! 👋

I'm the creator of MCPShelf (https://mcp.ritualdev.in).

Since Anthropic open-sourced the Model Context Protocol (MCP) late last year, the ecosystem has exploded. Thousands of developers are building servers that let Claude Desktop, Cursor, Windsurf, Cline, and Zed interact with local databases, GitHub, Docker, Slack, and cloud APIs.

However, the current developer experience has three big pain points:
1. **Config Spaghetti:** To use an MCP server, you have to manually find the npm/pypi package, format an artisanal JSON snippet with `mcpServers`, guess whether it requires `uvx` or `npx -y`, and configure client-specific paths.
2. **Context Window Bloat:** Many MCP servers expose 30+ tools with massive JSON schemas. Loading 3 unvetted servers can secretly burn 15,000 tokens of your model's context window on tool descriptions alone before you even write a single prompt!
3. **Security Blind Spots:** When an MCP server runs on `stdio`, it executes with full user privileges on your workstation. There was no easy way to know if a server runs arbitrary shell commands, writes to disk, or makes unauthorized outbound network requests.

So we built MCPShelf: an open-source, community-driven registry of **400+ verified Model Context Protocol servers** with automated security audits and 1-click install workflows.

### 🛠️ Key Technical Capabilities:
- **1-Click AI Client Configs & Deep Links:** Get copy-ready configs or 1-click URI deep links (`cursor://anysphere.cursor-deeplink/mcp/install?...` and VS Code URIs) tailored for Cursor, Claude Desktop, Windsurf, Cline, and Zed Editor.
- **Context Token Footprint Calculator:** Every server detail page shows the exact estimated token cost of its exposed tools so you don't unknowingly inflate your API bills or throttle your context window.
- **AST Privilege & Sandbox Scanner:** We scan server manifests and packages for high-risk capabilities (arbitrary shell execution, filesystem write, credential exfiltration) and assign transparent risk tiers (Low, Moderate, High).
- **Public Trust Score Rubric:** Every server receives an objective rating based on our published rubric: Code Provenance (2.5), Package Verification (2.0), Sandboxing (2.0), Documentation (1.5), and Security Audit (2.0).
- **Embeddable SVG Badges:** Server creators can embed dynamic vector badges directly in their GitHub READMEs (e.g. `[![Verified on MCPShelf](https://mcp.ritualdev.in/api/v1/badges/verified/<slug>.svg)](...)`).
- **Terminal Explorer CLI:** Prefer staying in your terminal? Run:
  ```bash
  npx @ritualdev-lab/mcpshelf
  # Or interactive terminal UI:
  npx @ritualdev-lab/mcpshelf explore
  ```
- **100% Privacy & Zero Cookies:** The site is completely static, fast, and does not use any tracking cookies or third-party ad pixels.

Everything is open-source under Apache-2.0 on GitHub:
https://github.com/RitualDev-Lab/MCPShelf

We'd love your feedback! If you're building an MCP server or integrating AI agents into your development workflow, how can we make discovery, auditing, and configuration even smoother?
```
