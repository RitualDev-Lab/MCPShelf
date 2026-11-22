# 📢 Reddit Multi-Subreddit Community Launch Pack

Target communities: `r/ClaudeAI`, `r/LocalLLaMA`, `r/cursor`, `r/artificial`, `r/webdev`

---

## 1. r/ClaudeAI

**Title:** I built an open registry of 400+ Model Context Protocol (MCP) servers with 1-click Claude Desktop configs & security audits

**Body:**
```markdown
Hey r/ClaudeAI! 👋

Like many of you, I've been experimenting heavily with Claude Desktop's MCP features. Having Claude connect to PostgreSQL, Docker, Git repos, and local file systems transforms it into an autonomous engineering assistant.

However, setting up servers was getting tedious:
- Tracking down valid package names across scattered GitHub repos
- Formatting `claude_desktop_config.json` manually and missing commas
- Wondering if an unvetted stdio server might run risky shell scripts or leak API keys

To fix this, we created **MCPShelf** (https://mcp.ritualdev.in): an open-source catalog of 400+ verified MCP servers.

**What it does:**
1. **1-Click Claude Desktop Configs:** Pick any server and click "Copy" for Claude Desktop. It automatically populates the `mcpServers` object with proper `npx` or `uvx` arguments and placeholder env vars.
2. **Token Footprint Warnings:** Did you know some servers expose 20+ tools that consume 5,000 to 10,000 tokens of your context window before you even ask a question? We estimate tool token costs upfront so you don't waste your prompt limits.
3. **Security & Sandbox Ratings:** Transparent trust scores and risk flags (Low / Moderate / High) highlighting whether a server requests filesystem write or shell access.
4. **Terminal CLI:** You can browse and install right from your terminal:
   `npx @ritualdev-lab/mcpshelf explore`

It's completely free, open-source, and has zero ads/cookies:
- Web: https://mcp.ritualdev.in
- GitHub: https://github.com/RitualDev-Lab/MCPShelf

What are your favorite MCP servers right now? Drop them below and we'll make sure they're audited and indexed!
```

---

## 2. r/cursor

**Title:** We built an open MCP registry with 1-click deep links for Cursor IDE (`cursor://`) & token footprint analyzer

**Body:**
```markdown
Hey Cursor devs! 🚀

Cursor's Model Context Protocol support is a game changer for agentic workflows. But managing multiple MCP servers across `.cursor/mcp.json` often leads to context bloat and trial-and-error configurations.

We built **MCPShelf** (https://mcp.ritualdev.in) to make MCP discovery and setup instant:

- **1-Click Deep Links:** Click `Install in Cursor` and it launches Cursor directly via protocol URI (`cursor://anysphere.cursor-deeplink/mcp/install?...`) with the command and arguments pre-configured.
- **Context Footprint Analyzer:** See exactly how many tokens a server's tools will consume from your Cursor chat context window.
- **Multi-Server Config Bundler:** Choose multiple servers and export a single, clean `.cursor/mcp.json` file.
- **400+ Audited Servers:** Covering Git, Postgres, SQLite, Kubernetes, Slack, Linear, Puppeteer, and more.

Check it out:
- Directory: https://mcp.ritualdev.in
- Repo: https://github.com/RitualDev-Lab/MCPShelf

Feedback and new server suggestions are very welcome!
```

---

## 3. r/LocalLLaMA

**Title:** Open MCP Registry for Local AI: 400+ servers with stdio/SSE sandboxing, zero-telemetry, and Ollama/vLLM tools

**Body:**
```markdown
Hey everyone! 🦙

For those of us building local-first agentic stacks (Ollama, LM Studio, vLLM, open-webui), the Model Context Protocol (MCP) provides a standardized way to give local models tool-calling capabilities.

We've open-sourced **MCPShelf** (https://mcp.ritualdev.in), a privacy-focused registry of 400+ MCP servers.

**Local-first features:**
- **Zero-Telemetry & 100% Static:** No tracking, no third-party cookies, no walled gardens.
- **Security & Sandbox Flags:** Clear labeling of read-only vs write-capable vs shell-executing servers so you don't run dangerous stdio binaries on your local machine.
- **Machine Discovery:** Machine-readable `llms.txt`, RSS feeds, and REST API (`https://mcp.ritualdev.in/api/v1/servers`) so your local agents can discover tools programmatically.
- **Fast CLI:** Query the catalog offline or from your shell via `npx @ritualdev-lab/mcpshelf`.

GitHub: https://github.com/RitualDev-Lab/MCPShelf
Site: https://mcp.ritualdev.in

Enjoy!
```
