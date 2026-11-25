# Security Policy & Vulnerability Disclosure

RitualDev Lab takes the integrity of the **MCPShelf** Model Context Protocol directory (`mcp.ritualdev.in`) and static security scoring pipeline seriously.

## Supported Versions

| Version | Supported | Minimum Runtime | Response Target |
| :--- | :---: | :---: | :---: |
| **1.3.x** | Active | Node.js >= 20.0.0 | Critical & High: < 24 Hours |
| < 1.3.0 | End-of-Life | Node.js >= 18.0.0 | Upgrade to latest 1.3.x |

## Reporting a Vulnerability or Malicious Listing

Please **do not** open public GitHub issues for undisclosed vulnerabilities, malicious MCP servers, or compromised package identifiers.

- **GitHub Private Security Advisory (Preferred)**: [Report a Security Advisory](https://github.com/RitualDev-Lab/MCPShelf/security/advisories/new)
- **Email**: `security@ritualdev.in` with subject `[SECURITY VULNERABILITY] MCPShelf`

## Directory Security Guarantees

- Static catalog builds scan MCP server manifests for capability risk (Filesystem, Network, Process execution) before generating `site/api/v1/servers.json` and `site/feed.xml`.
- **Trust & Control Mapping Portal**: [https://ritualdev.in/trust](https://ritualdev.in/trust)
