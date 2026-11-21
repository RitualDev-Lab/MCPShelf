/**
 * Versioned Registry Publisher & DevShelf Cross-Sync Engine
 * - Publishes static v1/servers.json and v1/registry.json with semantic tags
 * - Cross-syncs verified MCP servers directly into DevShelf's MCP & AI tool catalog
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanSecurityRisks } from './security-scanner.js';
import { synthesizeCapabilitiesForServer } from './introspect-server.js';

export interface VersionedRegistryManifest {
  $schema: string;
  version: string;
  apiVersion: string;
  updatedAt: string;
  totalServers: number;
  categories: string[];
  semanticTags: string[];
  servers: any[];
}

export function generateVersionedRegistry(catalog: any[], version = '1.3.0'): VersionedRegistryManifest {
  const semanticTags = [
    'model-context-protocol',
    'mcp-servers',
    'ai-agents',
    'claude-desktop',
    'cursor-ide',
    'windsurf-ide',
    'zed-editor',
    'cline-vscode',
    'stdio-transport',
    'sse-transport',
    'zero-paywall',
    'ritualdev'
  ];

  const enriched = catalog.map(server => {
    const sec = scanSecurityRisks(server);
    const caps = server.capabilities || synthesizeCapabilitiesForServer(server);

    return {
      id: server.id,
      name: server.name,
      title: server.title,
      description: server.description,
      version: server.version || '1.0.0',
      category: server.category,
      author: server.author || (server.name ? server.name.split('/')[0] : 'Community'),
      repositoryUrl: server.repositoryUrl,
      websiteUrl: server.websiteUrl || '',
      isOfficialLatest: Boolean(server.isOfficialLatest),
      publishedAt: server.publishedAt,
      trustScore: server.trustScore,
      securityRating: server.securityRating || sec.riskTier,
      runtime: sec.runtime,
      transportType: sec.transportType,
      envVars: sec.envVars,
      safetyFlags: sec.safetyFlags,
      safetyBadges: sec.safetyBadges,
      capabilities: {
        toolsCount: caps.tools.length,
        promptsCount: caps.prompts.length,
        resourcesCount: caps.resources.length,
        tokenFootprint: caps.tokenFootprint,
        tools: caps.tools,
        prompts: caps.prompts,
        resources: caps.resources
      },
      installSnippets: server.installSnippets
    };
  });

  const categories = Array.from(new Set(catalog.map(s => s.category))).filter(Boolean) as string[];

  return {
    $schema: 'https://mcp.ritualdev.in/schemas/v1-registry.json',
    version,
    apiVersion: 'v1',
    updatedAt: new Date().toISOString(),
    totalServers: enriched.length,
    categories,
    semanticTags,
    servers: enriched
  };
}

export function transformMcpToDevShelf(server: any): any {
  const sec = scanSecurityRisks(server);
  const runtime = sec.runtime;
  const transport = sec.transportType;
  const slug = (server.id || server.name).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

  const statusTags = [
    'Model Context Protocol',
    `Transport: ${transport}`,
    `Runtime: ${runtime}`,
    'Zero Paywall'
  ];

  if (server.trustScore >= 8.5) {
    statusTags.push('High Trust Audited');
  }

  const binCmd = runtime === 'uvx' ? 'uvx' : 'npx -y';
  const pkgId = server.packageIdentifier || server.id;

  return {
    name: server.title || server.name,
    repo: server.repositoryUrl || `https://github.com/${server.author || 'modelcontextprotocol'}/${server.name.split('/').pop()}`,
    category: 'AI Coding & MCP',
    description: server.description,
    language: runtime === 'uvx' ? 'Python / uvx' : 'TypeScript / Node.js',
    license: 'Open Source / FOSS',
    featured: server.trustScore >= 9.0,
    mcpCommand: `${binCmd} ${pkgId}`,
    goodFirstIssues: server.repositoryUrl ? `${server.repositoryUrl.replace(/\/$/, '')}/issues` : undefined,
    statusTags,
    shelfCategory: 'ai-tools',
    id: slug,
    sourceOrigin: 'MCPShelf Registry'
  };
}

export async function publishRegistryAndSync() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const siteDir = path.resolve(process.cwd(), 'site');
  const catalogPath = path.join(dataDir, 'catalog.json');

  if (!fs.existsSync(catalogPath)) {
    console.error('Catalog not found at:', catalogPath);
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  console.log(`📦 [Cross-Sync] Processing ${catalog.length} MCP servers...`);

  // 1. Generate versioned static registry
  const v1Registry = generateVersionedRegistry(catalog);

  // Write site/v1/servers.json & site/v1/registry.json
  const v1Dir = path.join(siteDir, 'v1');
  if (!fs.existsSync(v1Dir)) fs.mkdirSync(v1Dir, { recursive: true });

  fs.writeFileSync(path.join(v1Dir, 'servers.json'), JSON.stringify(v1Registry, null, 2), 'utf8');
  fs.writeFileSync(path.join(v1Dir, 'registry.json'), JSON.stringify(v1Registry, null, 2), 'utf8');

  // Also write site/api/v1/servers.json & site/api/v1/registry.json
  const apiV1Dir = path.join(siteDir, 'api/v1');
  if (!fs.existsSync(apiV1Dir)) fs.mkdirSync(apiV1Dir, { recursive: true });

  fs.writeFileSync(path.join(apiV1Dir, 'servers.json'), JSON.stringify(v1Registry, null, 2), 'utf8');
  fs.writeFileSync(path.join(apiV1Dir, 'registry.json'), JSON.stringify(v1Registry, null, 2), 'utf8');

  console.log(`✅ [Versioned Registry] Published site/v1/servers.json & site/api/v1/servers.json (${v1Registry.totalServers} servers)`);

  // 2. Cross-Sync with DevShelf
  // Select top verified servers
  const verifiedServers = catalog.filter((s: any) => s.trustScore >= 7.0 && s.repositoryUrl);
  const devShelfEntries = verifiedServers.map(transformMcpToDevShelf);

  const exportPath = path.join(dataDir, 'devshelf-mcp-sync.json');
  fs.writeFileSync(exportPath, JSON.stringify(devShelfEntries, null, 2), 'utf8');
  console.log(`✅ [DevShelf Sync] Prepared ${devShelfEntries.length} verified MCP tools in data/devshelf-mcp-sync.json`);

  // Cross-repo sync check: if DevShelf exists as peer directory, update shelf/ai-tools.json or devshelf-tools.json
  const peerDevShelfAiShelf = path.resolve(process.cwd(), '../DevShelf/shelf/ai-tools.json');
  if (fs.existsSync(peerDevShelfAiShelf)) {
    try {
      const currentAiTools = JSON.parse(fs.readFileSync(peerDevShelfAiShelf, 'utf8'));
      const existingIds = new Set(currentAiTools.map((t: any) => t.id || t.name.toLowerCase()));
      let added = 0;

      // Filter RitualDev and top tier official servers for direct inclusion
      for (const entry of devShelfEntries) {
        if (!existingIds.has(entry.id) && (entry.featured || entry.repo?.includes('RitualDev-Lab'))) {
          currentAiTools.push(entry);
          existingIds.add(entry.id);
          added++;
        }
      }

      if (added > 0) {
        fs.writeFileSync(peerDevShelfAiShelf, JSON.stringify(currentAiTools, null, 2), 'utf8');
        console.log(`🔗 [Peer Cross-Sync] Automatically synced ${added} top verified MCP tools into DevShelf shelf/ai-tools.json!`);
      }
    } catch (e: any) {
      console.warn(`  ⚠️ Could not auto-merge into peer DevShelf: ${e.message}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('sync-to-devshelf.ts')) {
  publishRegistryAndSync().catch(console.error);
}
