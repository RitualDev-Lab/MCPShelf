import sys
import os
import json
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def load_local_or_remote(filename: str, remote_url: str):
    local_path = DATA_DIR / filename
    if local_path.exists():
        try:
            return json.loads(local_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    try:
        req = urllib.request.Request(remote_url, headers={"User-Agent": "mcpshelf-python/1.3.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return []

def get_servers():
    return load_local_or_remote("catalog.json", "https://mcp.ritualdev.in/data/catalog.json")

def get_tools():
    return load_local_or_remote("devshelf-tools.json", "https://mcp.ritualdev.in/data/devshelf-tools.json")

def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print("""
⚡ MCPShelf Python CLI - Open Model Context Protocol Registry (https://mcp.ritualdev.in)

Usage:
    mcpshelf mcp              Run official stdio Model Context Protocol (MCP) server
    mcpshelf list             List trending and top-rated MCP servers
    mcpshelf search <query>   Search servers by keyword, category, or author
    mcpshelf tools <query>    Search 570+ verified DevShelf developer tools
    mcpshelf audit <id>       Inspect security trust rating and permission report
    mcpshelf get <id>         Output full JSON manifest and client install configs
    mcpshelf --version        Show version
""")
        return

    cmd = args[0].lower()

    if cmd in ("-v", "--version", "version"):
        print("mcpshelf v1.3.0")
        return

    if cmd in ("mcp", "serve", "stdio"):
        from mcpshelf.server import main as run_server
        run_server()
        return

    if cmd == "list":CPShelf Python CLI - Open Registry for MCP Servers & Dev Tools (https://mcp.ritualdev.in)

Usage:
  mcpshelf explore              Interactive terminal browser & installer
  mcpshelf search <query>       Search 419+ verified MCP servers
  mcpshelf tools <query>        Search 577+ free open-source dev tools (DevShelf)
  mcpshelf get <serverId>       Inspect metadata & install configs
  mcpshelf audit <serverId>     Run trust score & security check
  mcpshelf-mcp                  Run stdio MCP server for AI agents
""")
        return

    cmd = args[0]

    if cmd == "explore":
        catalog = get_servers()
        print(f"\n⚡ MCPShelf Terminal Explorer ({len(catalog)} Verified Servers)")
        print("=" * 70)
        for idx, s in enumerate(catalog[:15], 1):
            boost = "[★ Spotlight] " if s.get("trustScore", 0) >= 9.8 else ""
            print(f"{idx:2d}. {boost}{s.get('title')} [{s.get('category')}]")
            print(f"    ID: {s.get('id')} | Trust: {s.get('trustScore')}/10 | Installs: {s.get('estimatedInstalls', 0):,}")
            print(f"    Install: {s.get('installSnippets', {}).get('terminal', '')}\n")
        print("=" * 70)
        print("Tip: Use 'mcpshelf get <id>' for full JSON config or run 'npx @ritualdev-lab/mcpshelf explore' for keyboard-driven TUI.\n")

    elif cmd == "search":
        if len(args) < 2:
            print("Usage: mcpshelf search <query>")
            return
        q = args[1].lower().strip()
        catalog = get_servers()
        matches = [
            s for s in catalog
            if q in s.get("id", "").lower() or q in s.get("title", "").lower() or q in s.get("description", "").lower()
        ]
        print(f"\n🔍 Found {len(matches)} matching MCP server(s) for '{q}':\n")
        for s in matches[:10]:
            print(f"⚡ {s.get('title')} ({s.get('id')})")
            print(f"   {s.get('description')}")
            print(f"   🛡️ Trust: {s.get('trustScore')}/10 | Category: {s.get('category')} | Installs: {s.get('estimatedInstalls', 0):,}")
            print(f"   Install: {s.get('installSnippets', {}).get('terminal', '')}\n")

    elif cmd == "tools":
        if len(args) < 2:
            print("Usage: mcpshelf tools <query>")
            return
        q = args[1].lower().strip()
        tools = get_tools()
        matches = [
            t for t in tools
            if q in t.get("name", "").lower() or q in t.get("description", "").lower()
        ]
        print(f"\n🛠️ Found {len(matches)} matching DevShelf tool(s) for '{q}':\n")
        for t in matches[:10]:
            print(f"⚡ {t.get('name')} [{t.get('category')}]")
            print(f"   {t.get('description')}")
            print(f"   Repo: {t.get('repo') or t.get('url')} | License: {t.get('license', 'Open Source')}\n")

    elif cmd == "audit":
        if len(args) < 2:
            print("Usage: mcpshelf audit <serverId>")
            return
        id_query = args[1].lower().strip()
        catalog = get_servers()
        s = next((x for x in catalog if id_query in x.get("id", "").lower()), None)
        if not s:
            print(f"Server '{args[1]}' not found.")
            return
        print(f"\n🛡️  Security Audit Report for {s.get('title')}")
        print(f"   Identifier: {s.get('id')} (v{s.get('version')})")
        print(f"   Trust Score: {s.get('trustScore')}/10 ({s.get('securityRating')})")
        print(f"   Repository: {s.get('repositoryUrl', 'None')}")
        print(f"   Status: {'SAFE TO INSTALL' if s.get('trustScore', 0) >= 8.0 else 'REVIEW PERMISSIONS'}\n")

    elif cmd == "get":
        if len(args) < 2:
            print("Usage: mcpshelf get <serverId>")
            return
        id_query = args[1].lower().strip()
        catalog = get_servers()
        s = next((x for x in catalog if id_query in x.get("id", "").lower()), None)
        if not s:
            print(f"Server '{args[1]}' not found.")
            return
        print(json.dumps(s, indent=2))

if __name__ == "__main__":
    main()
