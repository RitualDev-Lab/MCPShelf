# MCPShelf Trust Score & Security Audit Rubric 🛡️

MCPShelf enforces an independent, automated **Trust & Safety Scoring Rubric (0.0 to 10.0)** for every Model Context Protocol (MCP) server indexed on **[mcp.ritualdev.in](https://mcp.ritualdev.in)**.

Because MCP servers execute locally and can request filesystem access, subprocess execution, or network communication, blind installation creates supply-chain and prompt injection vulnerabilities. The MCPShelf Trust Score guarantees that developers, AI coding assistants (Claude Desktop, Cursor, Windsurf, Zed), and enterprise platforms have 100% transparency into the provenance, permissions, and security posture of every server.

---

## 📊 The 5-Factor Scoring Formula

Every server's Trust Score is calculated across 5 weighted dimensions, plus penalties for suspicious or minimal-metadata entries:

$$\text{Trust Score} = \text{Baseline} + F_{\text{Provenance}} + F_{\text{Package}} + F_{\text{Sandbox}} + F_{\text{Docs}} + F_{\text{Security}} - \sum \text{Penalties}$$

Bounded strictly between **1.5 (Minimum Caution)** and **10.0 (Enterprise Verified)**.

### 1. Code Provenance & Open Source Integrity (Max +2.5 pts)
Assesses source code availability, version control hygiene, and maintainer identity.
- **+1.2 pts**: Verified, accessible public repository on GitHub or GitLab.
- **+0.5 pt**: Active standalone repository with release tags and issue tracking.
- **+0.4 pt**: Canonical organization/author match between registry namespace and repository owner.
- **+0.4 pt**: Verified maintainer identity and cryptographic signing.
- *Penalty (-1.5 pts)*: Missing, 404, or unresolvable repository link.

### 2. Distribution & Package Verification (Max +2.0 pts)
Verifies binary provenance through official package managers (npm or PyPI).
- **+1.2 pts**: Published, installable package on npm (`@scope/package`) or PyPI (`pip install package`).
- **+0.8 pt**: Scoped or namespaced package under verified organization or author domain.
- *Penalty (-1.0 pt)*: No published package (requires manual git clone or unvetted scripts).

### 3. Permission Sandboxing & Transport Safety (Max +2.0 pts)
Evaluates runtime privilege requirements and local blast radius.
- **+1.0 pt**: Standard `stdio` JSON-RPC transport (sandboxed stdin/stdout isolation without exposed network ports).
- **+0.5 pt**: Explicitly declared environment variables without requiring root/sudo privileges.
- **+0.5 pt**: Compatible with OS sandboxing primitives (macOS AppContainer, Linux Landlock, AgentShield proxy).
- *Penalty (-1.0 pt)*: Server requests unconstrained root filesystem read/write (`/`) or raw shell spawns without guardrails.

### 4. Documentation, Schema & Protocol Compliance (Max +1.5 pts)
Assesses protocol schema adherence and developer transparency.
- **+0.8 pt**: Comprehensive description (>40 characters) detailing exact tools, resources, and prompt templates.
- **+0.4 pt**: Official website, interactive documentation, or live demo URL.
- **+0.3 pt**: Valid official MCP Server Schema (`2025-12-11/server.schema.json`) compliance.
- *Penalty (-1.0 pt)*: Generic, placeholder, or truncated title (e.g., `"mcp"` or `"test"`).

### 5. Automated Static Security & Supply-Chain Audit (Max +2.0 pts)
Independent security analysis conducted during the nightly ingestion pipeline.
- **+1.0 pt**: Clean automated AST linting — zero hardcoded credentials, API keys, or plaintext auth tokens.
- **+0.5 pt**: Dependency supply-chain vulnerability check against GitHub Advisory Database (GHSA) and OSV.
- **+0.5 pt**: Official RitualDev Verified Flagship Server (e.g. `AgentShield`, `DBShield`, `FinePrint`, `MCPShelf`, `DevShelf`).

---

## 🏷️ Rating Tiers & Visual Badges

| Score Range | Security Rating | Meaning & Actionable Guidance |
| :---: | :---: | :--- |
| **9.0 – 10.0** | 🛡️ **Very High (Enterprise Verified)** | Full open-source audit, published package, sandboxed stdio, zero CVEs. 1-click safe to install in production agents. |
| **7.5 – 8.9** | ✅ **High (Audited Open Source)** | Verified public repository and published package. Standard local developer usage recommended. |
| **5.5 – 7.4** | ⚠️ **Moderate (Community Scraped)** | Basic registry entry with partial metadata. Review permissions before granting filesystem or network access. |
| **1.5 – 5.4** | 🛑 **Caution (Minimal Metadata)** | Unverified or missing repository, placeholder package, or unvetted scripts. Exercise caution. |

---

## 🛠️ Inspecting Audit Reports in the CLI

Developers can inspect the exact multi-factor audit breakdown for any server directly from their terminal:

```bash
# Run security audit on any server
npx @ritualdev-lab/mcpshelf audit io.github.RitualDev-Lab/mcpshelf
```

Example Output:
```text
🛡️  Security Audit Report for MCPShelf Model Context Protocol Registry, Search & Security Auditor
   Identifier: io.github.RitualDev-Lab/mcpshelf (v1.3.0)
   Trust Score: 9.8/10 (Very High)
   Source Repository: https://github.com/RitualDev-Lab/MCPShelf
   Package: @ritualdev-lab/mcpshelf (stdio transport)
   Audit Breakdown:
   • Code Provenance: 2.0 / 2.0
   • Package Distribution: 1.5 / 1.5
   • Permission Sandboxing: 1.5 / 1.5
   • Documentation & Schema: 1.0 / 1.0
   • Automated Security Scan: 2.0 / 2.0
   Recommendation: VERIFIED SAFE
```

---

## 🚀 How Creators Can Improve Their Trust Score

1. **Publish to npm or PyPI**: Ensure your package is installable via `npx -y <pkg>` or `uvx <pkg>`.
2. **Provide a Public Git Repository**: Link your GitHub repository in your `server.json` manifest.
3. **Detail Your Tools and Prompts**: Provide a description longer than 50 characters explaining the server's purpose.
4. **Use stdio Transport**: Avoid opening raw unauthenticated TCP sockets unless strictly required.
5. **Zero Hardcoded Secrets**: Use environment variable references (e.g., `process.env.API_KEY`) rather than static tokens.

Submit or update your server manifest at **[mcp.ritualdev.in/submit.html](https://mcp.ritualdev.in/submit.html)** or via `POST https://mcp.ritualdev.in/api/v1/submit`.
