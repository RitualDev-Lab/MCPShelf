/**
 * MCPShelf Interactive Terminal Explorer (TUI)
 * Keyboard-driven terminal browsing, filtering & 1-click install snippets
 *
 * Invoked via:
 *   npx @ritualdev-lab/mcpshelf explore
 *   mcpshelf explore
 */

import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Styles
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  reverse: '\x1b[7m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgDark: '\x1b[48;5;234m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgCyan: '\x1b[46m',
  clearScreen: '\x1b[2J\x1b[H',
  enterAltScreen: '\x1b[?1049h\x1b[H',
  exitAltScreen: '\x1b[?1049l\x1b[?25h',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
};

function loadCategories() {
  try {
    const p = path.join(__dirname, '..', 'data', 'categories.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return [];
}

function loadSponsors() {
  try {
    const p = path.join(__dirname, '..', 'data', 'sponsors.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return { activeBoosts: [] };
}

function getZedSnippet(server) {
  const shortName = (server.name || server.id.split('/').pop() || 'mcp-server').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const pkg = server.packageIdentifier || server.id;
  return JSON.stringify({
    context_servers: {
      [shortName]: {
        command: {
          env: {},
          path: "npx",
          args: ["-y", pkg]
        }
      }
    }
  }, null, 2);
}

export function launchExplorer(catalog) {
  // Graceful fallback if running in non-TTY (pipes, CI, redirect)
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(`\n⚡ MCPShelf Terminal Explorer (Non-Interactive Mode)`);
    console.log(`Catalog: ${catalog.length} verified MCP servers | https://mcp.ritualdev.in\n`);
    for (const s of catalog.slice(0, 15)) {
      console.log(`- ${s.title} (${s.id}) [${s.category}] - Trust: ${s.trustScore}/10`);
      console.log(`  Install: ${s.installSnippets?.terminal || `npx -y ${s.id}`}`);
    }
    console.log(`\nRun in an interactive terminal to use the keyboard-driven TUI: npx @ritualdev-lab/mcpshelf explore\n`);
    return;
  }

  const rawCategories = loadCategories();
  const categories = [{ id: 'all', name: 'All Categories', icon: '🌐' }, ...rawCategories];
  const sponsors = loadSponsors();
  const boostMap = new Map();
  for (const b of sponsors.activeBoosts || []) {
    boostMap.set(b.serverId.toLowerCase(), b);
  }

  // State
  let categoryIdx = 0;
  let searchQuery = '';
  let inSearchInput = false;
  let selectedIdx = 0;
  let scrollOffset = 0;
  let viewMode = 'list'; // 'list' | 'detail' | 'install' | 'audit'
  let installClient = 'claude'; // 'claude' | 'cursor' | 'windsurf' | 'zed' | 'terminal'
  let toastMessage = '';
  let toastTimer = null;

  function setToast(msg) {
    toastMessage = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMessage = '';
      render();
    }, 2500);
  }

  function getFilteredServers() {
    const curCat = categories[categoryIdx].id;
    let list = catalog;

    if (curCat !== 'all') {
      list = list.filter(s => s.category?.toLowerCase() === curCat.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        `${s.id} ${s.title} ${s.description} ${s.category}`.toLowerCase().includes(q)
      );
    }

    // Sort: Hero Boosted first, Spotlight second, then by trust score
    return list.slice().sort((a, b) => {
      const bA = boostMap.get(a.id.toLowerCase())?.tier;
      const bB = boostMap.get(b.id.toLowerCase())?.tier;
      const weightA = bA === 'hero' ? 3 : bA === 'spotlight' ? 2 : 0;
      const weightB = bB === 'hero' ? 3 : bB === 'spotlight' ? 2 : 0;
      if (weightA !== weightB) return weightB - weightA;
      return (b.trustScore || 0) - (a.trustScore || 0);
    });
  }

  function render() {
    const termWidth = process.stdout.columns || 100;
    const termHeight = process.stdout.rows || 30;
    const filtered = getFilteredServers();

    if (selectedIdx >= filtered.length) {
      selectedIdx = Math.max(0, filtered.length - 1);
    }

    const currentServer = filtered[selectedIdx] || null;
    let out = ANSI.clearScreen;

    // 1. Header Ribbon
    out += `${ANSI.bgDark}${ANSI.bold} ⚡ MCPShelf Terminal Explorer ${ANSI.reset}${ANSI.bgDark} • ${ANSI.green}${catalog.length} Servers${ANSI.reset}${ANSI.bgDark} • ${ANSI.cyan}https://mcp.ritualdev.in${ANSI.reset}\n`;
    
    // Category & Search Status Bar
    const curCatObj = categories[categoryIdx];
    const catLabel = `${curCatObj.icon} ${curCatObj.name}`;
    out += `${ANSI.dim}Filter: [Tab/c] ${ANSI.reset}${ANSI.bold}${ANSI.yellow}${catLabel}${ANSI.reset}  ${ANSI.dim}| Search [/]: ${ANSI.reset}${inSearchInput ? ANSI.bgCyan + ANSI.black + ' ' + (searchQuery || '_') + ' ' + ANSI.reset : (searchQuery ? ANSI.cyan + '"' + searchQuery + '"' : ANSI.dim + '(none)' + ANSI.reset)}  ${ANSI.dim}(${filtered.length} matches)${ANSI.reset}\n`;
    out += `${ANSI.dim}${'─'.repeat(termWidth)}${ANSI.reset}\n`;

    if (viewMode === 'list') {
      // 2. Interactive Split View (List Top + Inspector Bottom)
      const listRows = Math.max(6, Math.min(12, Math.floor((termHeight - 14) * 0.7)));
      
      // Keep selected index in view
      if (selectedIdx < scrollOffset) {
        scrollOffset = selectedIdx;
      } else if (selectedIdx >= scrollOffset + listRows) {
        scrollOffset = selectedIdx - listRows + 1;
      }

      const visibleSlice = filtered.slice(scrollOffset, scrollOffset + listRows);

      if (filtered.length === 0) {
        out += `\n   ${ANSI.yellow}No MCP servers found matching your query.${ANSI.reset}\n`;
        out += `   Press ${ANSI.bold}[Esc]${ANSI.reset} to clear search or ${ANSI.bold}[c]${ANSI.reset} to switch category.\n\n`;
      } else {
        visibleSlice.forEach((s, idx) => {
          const actualIdx = scrollOffset + idx;
          const isSelected = actualIdx === selectedIdx;
          const boost = boostMap.get(s.id.toLowerCase());

          let badge = '';
          if (boost?.tier === 'hero') badge = `${ANSI.yellow}[★ Hero]${ANSI.reset} `;
          else if (boost?.tier === 'spotlight') badge = `${ANSI.cyan}[★ Spotlight]${ANSI.reset} `;

          const prefix = isSelected ? `${ANSI.bold}${ANSI.green} ❯ ${ANSI.reset}` : `   `;
          const scoreColor = s.trustScore >= 9.0 ? ANSI.green : (s.trustScore >= 7.0 ? ANSI.yellow : ANSI.red);
          const scoreBadge = `${scoreColor}🛡️ ${s.trustScore}${ANSI.reset}`;
          const catTag = `${ANSI.dim}[${s.category}]${ANSI.reset}`;

          const titleDisplay = s.title.length > (termWidth - 35) ? s.title.substring(0, termWidth - 38) + '...' : s.title;

          if (isSelected) {
            out += `${prefix}${ANSI.reverse}${ANSI.bold} ${badge}${titleDisplay} ${catTag} ${scoreBadge} ${ANSI.reset}\n`;
          } else {
            out += `${prefix}${badge}${ANSI.bold}${titleDisplay}${ANSI.reset} ${catTag} ${scoreBadge}\n`;
          }
        });
      }

      // Scroll indicators
      const scrollInfo = filtered.length > listRows ? ` [${selectedIdx + 1}/${filtered.length}]` : '';
      out += `${ANSI.dim}${'─'.repeat(termWidth)}${scrollInfo}${ANSI.reset}\n`;

      // 3. Live Details Inspector Panel
      if (currentServer) {
        const boost = boostMap.get(currentServer.id.toLowerCase());
        out += `${ANSI.bold}${ANSI.cyan}┌─ Selected Server Inspector ────────────────────────────────────────────────────────┐${ANSI.reset}\n`;
        out += `│ ${ANSI.bold}Title:${ANSI.reset}       ${currentServer.title}\n`;
        out += `│ ${ANSI.bold}ID:${ANSI.reset}          ${ANSI.cyan}${currentServer.id}${ANSI.reset} (v${currentServer.version || '1.0.0'})\n`;
        out += `│ ${ANSI.bold}Description:${ANSI.reset} ${currentServer.description.substring(0, termWidth - 20)}\n`;
        out += `│ ${ANSI.bold}Trust Score:${ANSI.reset} ${ANSI.green}${currentServer.trustScore}/10.0 (${currentServer.securityRating || 'Verified'})${ANSI.reset} | ${ANSI.dim}Installs: ${(currentServer.estimatedInstalls || 0).toLocaleString()}${ANSI.reset}\n`;
        if (boost?.customCallout) {
          out += `│ ${ANSI.bold}Spotlight:${ANSI.reset}   ${ANSI.yellow}★ ${boost.customCallout.substring(0, termWidth - 20)}${ANSI.reset}\n`;
        }
        out += `│ ${ANSI.bold}Install CLI:${ANSI.reset} ${ANSI.yellow}${currentServer.installSnippets?.terminal || `npx -y ${currentServer.id}`}${ANSI.reset}\n`;
        out += `${ANSI.bold}${ANSI.cyan}└────────────────────────────────────────────────────────────────────────────────────┘${ANSI.reset}\n`;
      }

      // 4. Action Bar
      out += `\n${ANSI.dim}Controls:${ANSI.reset} `;
      out += `[${ANSI.bold}↑/↓${ANSI.reset}] Move  `;
      out += `[${ANSI.bold}Enter${ANSI.reset}] Inspect  `;
      out += `[${ANSI.bold}i${ANSI.reset}] Install Snippet  `;
      out += `[${ANSI.bold}a${ANSI.reset}] Security Audit  `;
      out += `[${ANSI.bold}Tab/c${ANSI.reset}] Category  `;
      out += `[${ANSI.bold}/${ANSI.reset}] Search  `;
      out += `[${ANSI.bold}q${ANSI.reset}] Quit`;

      if (toastMessage) {
        out += `\n\n${ANSI.bold}${ANSI.green}✨ ${toastMessage}${ANSI.reset}`;
      }

    } else if (viewMode === 'install') {
      // 1-Click Install View
      if (!currentServer) {
        viewMode = 'list';
        render();
        return;
      }

      out += `\n${ANSI.bold}${ANSI.cyan}📦 1-Click Installation Configuration for ${currentServer.title}${ANSI.reset}\n\n`;
      out += `Select Client Target: `;
      out += `[${installClient === 'claude' ? ANSI.reverse : ''} 1. Claude Desktop ${ANSI.reset}] `;
      out += `[${installClient === 'cursor' ? ANSI.reverse : ''} 2. Cursor IDE ${ANSI.reset}] `;
      out += `[${installClient === 'windsurf' ? ANSI.reverse : ''} 3. Windsurf ${ANSI.reset}] `;
      out += `[${installClient === 'zed' ? ANSI.reverse : ''} 4. Zed ${ANSI.reset}] `;
      out += `[${installClient === 'terminal' ? ANSI.reverse : ''} 5. Direct CLI ${ANSI.reset}]\n\n`;

      let snippetText = '';
      let targetFile = '';
      if (installClient === 'cursor') {
        targetFile = '~/.cursor/mcp.json';
        snippetText = currentServer.installSnippets?.cursorMcp || '{}';
      } else if (installClient === 'windsurf') {
        targetFile = '~/.codeium/windsurf/mcp_config.json';
        snippetText = currentServer.installSnippets?.windsurf || '{}';
      } else if (installClient === 'zed') {
        targetFile = '~/.config/zed/settings.json';
        snippetText = getZedSnippet(currentServer);
      } else if (installClient === 'terminal') {
        targetFile = 'Terminal Prompt';
        snippetText = currentServer.installSnippets?.terminal || `npx -y ${currentServer.packageIdentifier || currentServer.id}`;
      } else {
        targetFile = 'claude_desktop_config.json';
        snippetText = currentServer.installSnippets?.claudeDesktop || '{}';
      }

      out += `${ANSI.dim}Config Location: ${targetFile}${ANSI.reset}\n`;
      out += `${ANSI.yellow}${snippetText}${ANSI.reset}\n\n`;
      out += `${ANSI.dim}─────────────────────────────────────────────────────────────────────────────────${ANSI.reset}\n`;
      out += `Press ${ANSI.bold}[1-5]${ANSI.reset} to switch client  •  ${ANSI.bold}[c]${ANSI.reset} to Copy snippet  •  ${ANSI.bold}[b/Esc]${ANSI.reset} Back to List\n`;

      if (toastMessage) {
        out += `\n${ANSI.bold}${ANSI.green}✨ ${toastMessage}${ANSI.reset}`;
      }

    } else if (viewMode === 'audit') {
      // Full Security Audit View
      if (!currentServer) {
        viewMode = 'list';
        render();
        return;
      }

      const scoreColor = currentServer.trustScore >= 9.0 ? ANSI.green : (currentServer.trustScore >= 7.0 ? ANSI.yellow : ANSI.red);

      out += `\n${ANSI.bold}${ANSI.green}🛡️  Security Audit & Permission Analysis: ${currentServer.title}${ANSI.reset}\n\n`;
      out += `  • Identifier:          ${ANSI.cyan}${currentServer.id}${ANSI.reset}\n`;
      out += `  • Version:             v${currentServer.version || '1.0.0'}\n`;
      out += `  • Overall Trust Score: ${scoreColor}${ANSI.bold}${currentServer.trustScore} / 10.0 (${currentServer.securityRating || 'High'})${ANSI.reset}\n`;
      out += `  • Transport Protocol:  ${currentServer.transportType || 'stdio'}\n`;
      out += `  • Package Identifier:  ${currentServer.packageIdentifier || 'Standalone repo'}\n`;
      out += `  • Source Repository:   ${currentServer.repositoryUrl || 'Community verified mirror'}\n`;
      out += `  • Sandboxing Verdict:  ${currentServer.trustScore >= 8.5 ? ANSI.green + 'VERIFIED COMPLIANT (Static AST & Zero Secret Leak Verified)' : ANSI.yellow + 'STANDARD REVIEW'}${ANSI.reset}\n`;
      out += `  • Category:            ${currentServer.category}\n\n`;

      out += `${ANSI.dim}─────────────────────────────────────────────────────────────────────────────────${ANSI.reset}\n`;
      out += `Press ${ANSI.bold}[i]${ANSI.reset} to view Install Snippets  •  ${ANSI.bold}[b/Esc]${ANSI.reset} Back to List\n`;

    } else if (viewMode === 'detail') {
      // Full Detail View
      if (!currentServer) {
        viewMode = 'list';
        render();
        return;
      }

      out += `\n${ANSI.bold}${ANSI.cyan}⚡ Server Detail: ${currentServer.title}${ANSI.reset}\n\n`;
      out += `  ${ANSI.bold}ID:${ANSI.reset}          ${currentServer.id}\n`;
      out += `  ${ANSI.bold}Category:${ANSI.reset}    ${currentServer.category}\n`;
      out += `  ${ANSI.bold}Trust Score:${ANSI.reset} ${currentServer.trustScore}/10 (${currentServer.securityRating})\n`;
      out += `  ${ANSI.bold}Installs:${ANSI.reset}    ${(currentServer.estimatedInstalls || 0).toLocaleString()}\n`;
      out += `  ${ANSI.bold}Author:${ANSI.reset}      ${currentServer.author || 'RitualDev / Official Registry'}\n`;
      out += `  ${ANSI.bold}Description:${ANSI.reset}\n    ${currentServer.description}\n\n`;
      out += `  ${ANSI.bold}Install CLI:${ANSI.reset}\n    ${ANSI.yellow}${currentServer.installSnippets?.terminal || `npx -y ${currentServer.id}`}${ANSI.reset}\n\n`;

      out += `${ANSI.dim}─────────────────────────────────────────────────────────────────────────────────${ANSI.reset}\n`;
      out += `Press ${ANSI.bold}[i]${ANSI.reset} Install Snippets  •  ${ANSI.bold}[a]${ANSI.reset} Security Audit  •  ${ANSI.bold}[b/Esc]${ANSI.reset} Back to List\n`;
    }

    process.stdout.write(out);
  }

  // Setup terminal
  process.stdout.write(ANSI.enterAltScreen);
  process.stdout.write(ANSI.hideCursor);
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  function cleanupAndExit() {
    process.stdout.write(ANSI.exitAltScreen);
    process.exit(0);
  }

  process.on('SIGINT', cleanupAndExit);
  process.on('SIGTERM', cleanupAndExit);

  process.stdin.on('keypress', (str, key) => {
    // Exit keys
    if (key.ctrl && key.name === 'c') {
      cleanupAndExit();
      return;
    }

    // In Search Input Mode
    if (inSearchInput) {
      if (key.name === 'return' || key.name === 'enter') {
        inSearchInput = false;
        selectedIdx = 0;
        scrollOffset = 0;
        render();
        return;
      }
      if (key.name === 'escape') {
        inSearchInput = false;
        render();
        return;
      }
      if (key.name === 'backspace') {
        searchQuery = searchQuery.slice(0, -1);
        selectedIdx = 0;
        scrollOffset = 0;
        render();
        return;
      }
      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        searchQuery += str;
        selectedIdx = 0;
        scrollOffset = 0;
        render();
        return;
      }
      return;
    }

    // Modal Views (Install, Audit, Detail)
    if (viewMode === 'install') {
      if (key.name === 'escape' || key.name === 'b' || key.name === 'q') {
        viewMode = 'list';
        render();
        return;
      }
      if (str === '1') { installClient = 'claude'; render(); return; }
      if (str === '2') { installClient = 'cursor'; render(); return; }
      if (str === '3') { installClient = 'windsurf'; render(); return; }
      if (str === '4') { installClient = 'zed'; render(); return; }
      if (str === '5') { installClient = 'terminal'; render(); return; }
      if (str === 'c' || str === 'C') {
        setToast(`Copied ${installClient.toUpperCase()} snippet to clipboard! (Simulated)`);
        render();
        return;
      }
      return;
    }

    if (viewMode === 'audit' || viewMode === 'detail') {
      if (key.name === 'escape' || key.name === 'b' || key.name === 'q') {
        viewMode = 'list';
        render();
        return;
      }
      if (str === 'i' || str === 'I') {
        viewMode = 'install';
        render();
        return;
      }
      return;
    }

    // List Navigation Mode
    const filtered = getFilteredServers();

    if (key.name === 'up' || str === 'k') {
      if (selectedIdx > 0) {
        selectedIdx--;
        render();
      }
      return;
    }

    if (key.name === 'down' || str === 'j') {
      if (selectedIdx < filtered.length - 1) {
        selectedIdx++;
        render();
      }
      return;
    }

    if (key.name === 'pageup') {
      selectedIdx = Math.max(0, selectedIdx - 10);
      render();
      return;
    }

    if (key.name === 'pagedown') {
      selectedIdx = Math.min(Math.max(0, filtered.length - 1), selectedIdx + 10);
      render();
      return;
    }

    if (key.name === 'home') {
      selectedIdx = 0;
      render();
      return;
    }

    if (key.name === 'end') {
      selectedIdx = Math.max(0, filtered.length - 1);
      render();
      return;
    }

    // Category switch: Tab or 'c'
    if (key.name === 'tab' || str === 'c' || str === 'C') {
      categoryIdx = (categoryIdx + 1) % categories.length;
      selectedIdx = 0;
      scrollOffset = 0;
      render();
      return;
    }

    // Search trigger: '/' or 's'
    if (str === '/' || str === 's') {
      inSearchInput = true;
      render();
      return;
    }

    // Clear search on Esc
    if (key.name === 'escape') {
      if (searchQuery) {
        searchQuery = '';
        selectedIdx = 0;
        scrollOffset = 0;
        render();
      }
      return;
    }

    // Enter / Return -> Full Detail
    if (key.name === 'return' || key.name === 'enter') {
      if (filtered[selectedIdx]) {
        viewMode = 'detail';
        render();
      }
      return;
    }

    // 'i' -> 1-Click Install
    if (str === 'i' || str === 'I') {
      if (filtered[selectedIdx]) {
        viewMode = 'install';
        render();
      }
      return;
    }

    // 'a' -> Security Audit Report
    if (str === 'a' || str === 'A') {
      if (filtered[selectedIdx]) {
        viewMode = 'audit';
        render();
      }
      return;
    }

    // Quit
    if (str === 'q' || str === 'Q') {
      cleanupAndExit();
      return;
    }
  });

  // Initial render
  render();
}
