"""MCPShelf Python MCP Server - stdio JSON-RPC transport."""

import sys
import json
import urllib.request

CATALOG_URL = "https://mcp.ritualdev.in/data.json"
_cached_catalog = None

def get_catalog():
    global _cached_catalog
    if _cached_catalog is not None:
        return _cached_catalog
    try:
        req = urllib.request.Request(CATALOG_URL, headers={"User-Agent": "mcpshelf-python/1.0.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            _cached_catalog = json.loads(resp.read().decode("utf-8"))
            return _cached_catalog
    except Exception:
        return []

TOOLS = [
    {
        "name": "search_mcp_servers",
        "description": "Search 400+ verified Model Context Protocol (MCP) servers by keywords or category.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search terms (e.g. postgres, secret, billing)"},
                "category": {"type": "string", "description": "Optional category filter"},
                "limit": {"type": "number", "description": "Maximum results to return"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "audit_mcp_security",
        "description": "Retrieve security trust score and verification report for an MCP server.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "serverId": {"type": "string", "description": "The unique server ID"}
            },
            "required": ["serverId"]
        }
    }
]

def handle_call(name, args):
    catalog = get_catalog()
    if name == "search_mcp_servers":
        q = (args.get("query") or "").lower().strip()
        cat = args.get("category") or "all"
        limit = int(args.get("limit") or 5)
        matches = [
            s for s in catalog
            if (cat == "all" or s.get("category") == cat) and
               (q in s.get("id", "").lower() or q in s.get("title", "").lower() or q in s.get("description", "").lower())
        ]
        results = [
            {
                "id": s.get("id"),
                "title": s.get("title"),
                "description": s.get("description"),
                "trustScore": s.get("trustScore"),
                "install": s.get("installSnippets", {}).get("terminal", "")
            }
            for s in matches[:limit]
        ]
        return {"content": [{"type": "text", "text": json.dumps({"count": len(results), "results": results}, indent=2)}]}

    if name == "audit_mcp_security":
        target = next((s for s in catalog if args.get("serverId", "").lower() in s.get("id", "").lower()), None)
        if not target:
            return {"isError": True, "content": [{"type": "text", "text": "Server not found"}]}
        audit = {
            "serverId": target.get("id"),
            "trustScore": target.get("trustScore"),
            "rating": target.get("securityRating"),
            "repository": target.get("repositoryUrl"),
            "status": "SAFE TO INSTALL" if target.get("trustScore", 0) >= 8.0 else "REVIEW PERMISSIONS"
        }
        return {"content": [{"type": "text", "text": json.dumps(audit, indent=2)}]}

    return {"isError": True, "content": [{"type": "text", "text": f"Unknown tool: {name}"}]}

def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            method = req.get("method")
            params = req.get("params") or {}

            if method == "initialize":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "io.github.RitualDev-Lab/mcpshelf-python", "version": "1.0.0"}
                    }
                }
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
            elif method == "tools/list":
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"tools": TOOLS}
                }
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
            elif method == "tools/call":
                call_res = handle_call(params.get("name"), params.get("arguments") or {})
                res = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": call_res
                }
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
            elif method == "notifications/initialized":
                pass
            else:
                res = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "Method not found"}}
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
        except Exception as e:
            res = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(e)}}
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
