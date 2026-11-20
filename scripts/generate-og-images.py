#!/usr/bin/env python3
"""
MCPShelf Dynamic OpenGraph Card Generator (1200x630)
Generates high-definition, brand-aligned social preview cards for:
- Homepage (site/og/default.png)
- Boost Page (site/og/boost.png)
- Submit Page (site/og/submit.png)
- 419+ Individual Server Detail Pages (site/og/{slug}.png)
"""

import os
import re
import json
import time
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
SITE_DIR = ROOT_DIR / "site"
OG_DIR = SITE_DIR / "og"

W, H = 1200, 630

# Load Windows system fonts
FONT_DIR = Path("C:/Windows/Fonts")
font_title = ImageFont.truetype(str(FONT_DIR / "segoeuib.ttf"), 44)
font_brand = ImageFont.truetype(str(FONT_DIR / "segoeuib.ttf"), 26)
font_meta = ImageFont.truetype(str(FONT_DIR / "segoeui.ttf"), 20)
font_desc = ImageFont.truetype(str(FONT_DIR / "segoeui.ttf"), 24)
font_code = ImageFont.truetype(str(FONT_DIR / "consolab.ttf"), 22)
font_pill = ImageFont.truetype(str(FONT_DIR / "segoeuib.ttf"), 16)

def slugify(text: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]", "-", text).lower()

def create_base_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), (2, 6, 23)) # slate-950
    draw = ImageDraw.Draw(img)

    # Ambient radial highlights
    draw.ellipse([800, -100, 1300, 400], fill=(15, 30, 60))
    draw.ellipse([-100, 300, 400, 800], fill=(10, 40, 30))

    # Inner glassmorphism card
    draw.rounded_rectangle([30, 30, W - 30, H - 30], radius=24, fill=(15, 23, 42), outline=(51, 65, 85), width=2)

    # Header Brand
    draw.text((70, 65), "MCP", fill=(255, 255, 255), font=font_brand)
    draw.text((128, 65), "Shelf", fill=(52, 211, 153), font=font_brand)
    draw.text((195, 65), "⚡", fill=(251, 191, 36), font=font_brand)
    draw.text((230, 68), "• The Open MCP Registry", fill=(148, 163, 184), font=font_meta)

    return img, draw

def generate_server_card(server: dict, out_path: Path):
    img, draw = create_base_canvas()

    # Category pill
    category = (server.get("category") or "developer-tools").upper().replace("-", " ")
    pill_w = max(110, len(category) * 11 + 30)
    pill_x = 1130 - pill_w
    draw.rounded_rectangle([pill_x, 60, 1130, 95], radius=8, fill=(6, 78, 59), outline=(16, 185, 129), width=1)
    draw.text((pill_x + 16, 68), category, fill=(110, 231, 183), font=font_pill)

    # Title (max 2 lines)
    title = server.get("title") or server.get("name") or server.get("id")
    title_lines = textwrap.wrap(title, width=38)[:2]
    y = 145
    for line in title_lines:
        draw.text((70, y), line, fill=(255, 255, 255), font=font_title)
        y += 58

    # Description (max 2 lines)
    desc = server.get("description") or "Model Context Protocol server for AI coding agents."
    desc_lines = textwrap.wrap(desc, width=65)[:2]
    y += 10
    for line in desc_lines:
        draw.text((70, y), line, fill=(148, 163, 184), font=font_desc)
        y += 36

    # Metrics Row
    y += 20
    score = server.get("trustScore", 9.0)
    draw.rounded_rectangle([70, y, 320, y + 44], radius=10, fill=(4, 47, 46), outline=(20, 184, 166), width=1)
    draw.text((85, y + 10), f"🛡️ Trust: {score}/10 Score", fill=(45, 212, 191), font=font_meta)

    draw.rounded_rectangle([335, y, 540, y + 44], radius=10, fill=(30, 58, 138), outline=(59, 130, 246), width=1)
    draw.text((350, y + 10), f"✓ {server.get('securityRating', 'Verified')}", fill=(147, 197, 253), font=font_meta)

    draw.rounded_rectangle([555, y, 860, y + 44], radius=10, fill=(30, 41, 59), outline=(71, 85, 105), width=1)
    draw.text((570, y + 10), "Claude • Cursor • Windsurf • Zed", fill=(203, 213, 225), font=font_meta)

    # Console Command Box
    y += 68
    draw.rounded_rectangle([70, y, 1130, y + 62], radius=12, fill=(2, 6, 23), outline=(51, 65, 85), width=1)
    install_cmd = server.get("installSnippets", {}).get("terminal") or f"npx -y {server.get('packageIdentifier') or server.get('id')}"
    if len(install_cmd) > 65:
        install_cmd = install_cmd[:62] + "..."
    draw.text((95, y + 18), f"$ {install_cmd}", fill=(52, 211, 153), font=font_code)
    draw.text((940, y + 20), "mcp.ritualdev.in", fill=(148, 163, 184), font=font_meta)

    img.save(out_path, format="PNG", optimize=True)

def generate_static_card(title: str, subtitle: str, badge: str, cmd: str, out_path: Path):
    img, draw = create_base_canvas()

    # Pill
    pill_w = max(110, len(badge) * 11 + 30)
    pill_x = 1130 - pill_w
    draw.rounded_rectangle([pill_x, 60, 1130, 95], radius=8, fill=(120, 53, 15), outline=(245, 158, 11), width=1)
    draw.text((pill_x + 16, 68), badge, fill=(253, 230, 138), font=font_pill)

    # Title
    title_lines = textwrap.wrap(title, width=36)[:2]
    y = 150
    for line in title_lines:
        draw.text((70, y), line, fill=(255, 255, 255), font=font_title)
        y += 58

    # Subtitle
    sub_lines = textwrap.wrap(subtitle, width=65)[:2]
    y += 15
    for line in sub_lines:
        draw.text((70, y), line, fill=(148, 163, 184), font=font_desc)
        y += 36

    # Feature Row
    y += 24
    draw.rounded_rectangle([70, y, 350, y + 44], radius=10, fill=(4, 47, 46), outline=(20, 184, 166), width=1)
    draw.text((85, y + 10), "⚡ 419+ Verified Servers", fill=(45, 212, 191), font=font_meta)

    draw.rounded_rectangle([365, y, 660, y + 44], radius=10, fill=(30, 58, 138), outline=(59, 130, 246), width=1)
    draw.text((380, y + 10), "🛡️ Security Trust Audits", fill=(147, 197, 253), font=font_meta)

    draw.rounded_rectangle([675, y, 980, y + 44], radius=10, fill=(30, 41, 59), outline=(71, 85, 105), width=1)
    draw.text((690, y + 10), "1-Click Configs for AI Agents", fill=(203, 213, 225), font=font_meta)

    # Terminal box
    y += 68
    draw.rounded_rectangle([70, y, 1130, y + 62], radius=12, fill=(2, 6, 23), outline=(51, 65, 85), width=1)
    draw.text((95, y + 18), f"$ {cmd}", fill=(52, 211, 153), font=font_code)
    draw.text((940, y + 20), "mcp.ritualdev.in", fill=(148, 163, 184), font=font_meta)

    img.save(out_path, format="PNG", optimize=True)

def main():
    start_time = time.time()
    OG_DIR.mkdir(parents=True, exist_ok=True)

    print("🎨 [MCPShelf OG] Generating Dynamic OpenGraph Preview Cards (1200x630)...")

    # 1. Default Homepage Card
    generate_static_card(
        title="MCPShelf - The Open Model Context Protocol Marketplace",
        subtitle="Discover, audit, and 1-click install 419+ verified MCP servers into Claude Desktop, Cursor, and Windsurf.",
        badge="REGISTRY & MARKETPLACE",
        cmd="npx @ritualdev-lab/mcpshelf search",
        out_path=OG_DIR / "default.png"
    )
    print("  ✓ Generated site/og/default.png")

    # 2. Boost Page Card
    generate_static_card(
        title="Promote Your MCP Server to 10,000+ AI Developers",
        subtitle="Self-serve creator boosting platform with Category Spotlight and Homepage Hero sponsored placements.",
        badge="CREATOR BOOSTING",
        cmd="open https://mcp.ritualdev.in/boost.html",
        out_path=OG_DIR / "boost.png"
    )
    print("  ✓ Generated site/og/boost.png")

    # 3. Submit Page Card
    generate_static_card(
        title="Submit Your MCP Server to MCPShelf & Official Registry",
        subtitle="Free instant automated security audit, schema validation, and synchronized catalog distribution.",
        badge="DEVELOPER INGESTION",
        cmd="npx @ritualdev-lab/mcpshelf submit server.json",
        out_path=OG_DIR / "submit.png"
    )
    print("  ✓ Generated site/og/submit.png")

    # 4. Server-Specific Cards
    catalog_path = DATA_DIR / "catalog.json"
    if not catalog_path.exists():
        print("❌ data/catalog.json not found!")
        return

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    print(f"  ⚡ Rendering {len(catalog)} server-specific OpenGraph cards...")
    count = 0
    for server in catalog:
        slug = slugify(server.get("id", ""))
        out_path = OG_DIR / f"{slug}.png"
        generate_server_card(server, out_path)
        count += 1
        if count % 100 == 0:
            print(f"    ... rendered {count}/{len(catalog)} cards")

    elapsed = time.time() - start_time
    print(f"✨ [MCPShelf OG] Successfully generated {count + 3} OpenGraph preview cards in {elapsed:.2f}s!")

if __name__ == "__main__":
    main()
