/**
 * Unified REST API Gateway for MCPShelf & DevShelf
 *
 * Exposes full REST API endpoints for:
 * - Discovering 419+ MCP Servers (MCPShelf)
 * - Discovering 577+ Open-Source Developer Tools (DevShelf)
 * - Programmatic Developer Submissions for both platforms
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DodoWebhookProcessor, SPONSORS_FILE } from './dodo-webhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 4000;

// Data Paths
const MCPSHELF_CATALOG = path.resolve(__dirname, '..', 'data', 'catalog.json');
const DEVSHELF_TOOLS = path.resolve(__dirname, '..', 'data', 'devshelf-tools.json');
const SUBMISSIONS_FILE = path.resolve(__dirname, '..', 'data', 'submissions.json');

export interface ServerRecord {
  id: string;
  name?: string;
  title: string;
  description: string;
  category: string;
  repositoryUrl?: string;
  websiteUrl?: string;
  trustScore: number;
  securityRating?: string;
  estimatedInstalls?: number;
  installSnippets?: {
    claude?: any;
    cursor?: any;
    windsurf?: any;
    terminal?: string;
  };
}

export interface DevToolRecord {
  id: string;
  name: string;
  repo?: string;
  url?: string;
  category: string;
  shelfCategory?: string;
  description: string;
  language?: string;
  license?: string;
  featured?: boolean;
  statusTags?: string[];
}

export interface SubmissionPayload {
  target: 'mcpshelf' | 'devshelf';
  apiKey?: string;
  item: {
    name: string;
    title?: string;
    description: string;
    repositoryUrl?: string;
    websiteUrl?: string;
    category?: string;
    packageIdentifier?: string;
    transportType?: 'stdio' | 'sse' | 'http';
    envVars?: Array<{ name: string; description?: string }>;
    license?: string;
  };
}

export function loadMcpCatalog(): ServerRecord[] {
  try {
    if (fs.existsSync(MCPSHELF_CATALOG)) {
      return JSON.parse(fs.readFileSync(MCPSHELF_CATALOG, 'utf-8'));
    }
  } catch (err) {}
  return [];
}

export function loadDevShelfTools(): DevToolRecord[] {
  try {
    if (fs.existsSync(DEVSHELF_TOOLS)) {
      return JSON.parse(fs.readFileSync(DEVSHELF_TOOLS, 'utf-8'));
    }
  } catch (err) {}
  return [];
}

export function validateSubmission(payload: SubmissionPayload): { valid: boolean; error?: string; trustScore?: number } {
  if (!payload.target || !['mcpshelf', 'devshelf'].includes(payload.target)) {
    return { valid: false, error: 'target must be either "mcpshelf" or "devshelf"' };
  }

  const item = payload.item;
  if (!item || !item.name || !item.description) {
    return { valid: false, error: 'item.name and item.description are required' };
  }

  if (payload.target === 'mcpshelf') {
    if (!item.category) item.category = 'developer-tools';
    let trustScore = 7.5;
    if (item.repositoryUrl) trustScore += 1.5;
    if (item.packageIdentifier) trustScore += 0.8;
    trustScore = Math.min(10.0, Math.round(trustScore * 10) / 10);
    return { valid: true, trustScore };
  }

  if (payload.target === 'devshelf') {
    if (!item.websiteUrl && !item.repositoryUrl) {
      return { valid: false, error: 'DevShelf requires websiteUrl or repositoryUrl' };
    }
    return { valid: true, trustScore: 9.0 };
  }

  return { valid: false, error: 'Unknown validation state' };
}

export function createApiServer() {
  const mcpCatalog = loadMcpCatalog();
  const devTools = loadDevShelfTools();
  const dodoProcessor = new DodoWebhookProcessor();

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.searchParams;

    // Helper JSON response
    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data, null, 2));
    };

    // 1. Health check & Registry Stats
    if (pathname === '/api/v1/health' && req.method === 'GET') {
      return sendJson(200, {
        status: 'healthy',
        service: 'MCPShelf & DevShelf Unified REST Gateway',
        version: '1.0.0',
        platforms: ['mcpshelf', 'devshelf'],
        stats: {
          mcpServers: mcpCatalog.length,
          devTools: devTools.length,
          categories: ['security', 'databases', 'developer-tools', 'monetization', 'ai-agents', 'cloud-infra', 'productivity', 'web-automation']
        },
        endpoints: {
          mcpServers: 'GET /api/v1/servers',
          mcpServerDetail: 'GET /api/v1/servers/:id',
          devTools: 'GET /api/v1/tools',
          devToolDetail: 'GET /api/v1/tools/:id',
          sponsors: 'GET /api/v1/sponsors',
          dodoWebhook: 'POST /api/v1/webhooks/dodo',
          submitUnified: 'POST /api/v1/submit',
          submitMcp: 'POST /api/v1/mcpshelf/submit',
          submitDevTool: 'POST /api/v1/devshelf/submit'
        }
      });
    }

    // 2. Query MCP Servers (MCPShelf)
    if (pathname === '/api/v1/servers' && req.method === 'GET') {
      const q = (query.get('q') || '').toLowerCase().trim();
      const category = (query.get('category') || '').toLowerCase().trim();
      const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 20));
      const offset = Math.max(0, Number(query.get('offset')) || 0);

      let filtered = mcpCatalog;
      if (category && category !== 'all') {
        filtered = filtered.filter(s => s.category?.toLowerCase() === category);
      }
      if (q) {
        filtered = filtered.filter(s =>
          `${s.id} ${s.title} ${s.description}`.toLowerCase().includes(q)
        );
      }

      const paginated = filtered.slice(offset, offset + limit);
      return sendJson(200, {
        total: filtered.length,
        offset,
        limit,
        count: paginated.length,
        servers: paginated
      });
    }

    // 3. Get Single MCP Server by ID
    if (pathname.startsWith('/api/v1/servers/') && req.method === 'GET') {
      const id = decodeURIComponent(pathname.replace('/api/v1/servers/', '')).toLowerCase().trim();
      const target = mcpCatalog.find(s => s.id.toLowerCase() === id || s.id.toLowerCase().endsWith(`/${id}`));

      if (!target) {
        return sendJson(404, { error: `MCP server not found for identifier "${id}"` });
      }
      return sendJson(200, target);
    }

    // 4. Query Dev Tools (DevShelf)
    if (pathname === '/api/v1/tools' && req.method === 'GET') {
      const q = (query.get('q') || '').toLowerCase().trim();
      const category = (query.get('category') || '').toLowerCase().trim();
      const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 20));
      const offset = Math.max(0, Number(query.get('offset')) || 0);

      let filtered = devTools;
      if (category && category !== 'all') {
        filtered = filtered.filter(t => (t.shelfCategory?.toLowerCase() === category || t.category?.toLowerCase() === category));
      }
      if (q) {
        filtered = filtered.filter(t =>
          `${t.name} ${t.description} ${t.language || ''}`.toLowerCase().includes(q)
        );
      }

      const paginated = filtered.slice(offset, offset + limit);
      return sendJson(200, {
        total: filtered.length,
        offset,
        limit,
        count: paginated.length,
        tools: paginated
      });
    }

    // 5. Get Single Dev Tool by ID or Name
    if (pathname.startsWith('/api/v1/tools/') && req.method === 'GET') {
      const toolId = decodeURIComponent(pathname.replace('/api/v1/tools/', '')).toLowerCase().trim();
      const target = devTools.find(t => t.id === toolId || t.name.toLowerCase() === toolId);

      if (!target) {
        return sendJson(404, { error: `DevShelf tool not found for identifier "${toolId}"` });
      }
      return sendJson(200, target);
    }

    // 6. Unified Developer Submissions (POST /api/v1/submit or dedicated endpoints)
    const isSubmitEndpoint =
      (pathname === '/api/v1/submit' ||
       pathname === '/api/v1/mcpshelf/submit' ||
       pathname === '/api/v1/devshelf/submit') &&
      req.method === 'POST';

    if (isSubmitEndpoint) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as SubmissionPayload;

          // Override target if route is explicit
          if (pathname === '/api/v1/mcpshelf/submit') payload.target = 'mcpshelf';
          if (pathname === '/api/v1/devshelf/submit') payload.target = 'devshelf';

          const validation = validateSubmission(payload);
          if (!validation.valid) {
            return sendJson(400, { success: false, error: validation.error });
          }

          const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const submissionRecord = {
            id: submissionId,
            target: payload.target,
            submittedAt: new Date().toISOString(),
            status: 'queued',
            trustScore: validation.trustScore,
            item: payload.item
          };

          // Save submission to data/submissions.json
          let existing: any[] = [];
          if (fs.existsSync(SUBMISSIONS_FILE)) {
            try { existing = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8')); } catch {}
          }
          existing.push(submissionRecord);
          fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(existing, null, 2));

          return sendJson(201, {
            success: true,
            submissionId,
            target: payload.target,
            status: 'queued',
            trustScore: validation.trustScore,
            message: `Successfully validated and queued for ${payload.target}. It will be included in the registry upon automated CI verification.`
          });
        } catch (err: any) {
          return sendJson(400, { success: false, error: `Invalid JSON body: ${err.message}` });
        }
      });
      return;
    }

    // 7. Sponsors & Placement Boosts (GET /api/v1/sponsors or /api/v1/boosts)
    if ((pathname === '/api/v1/sponsors' || pathname === '/api/v1/boosts') && req.method === 'GET') {
      const sponsorsData = dodoProcessor.loadSponsors();
      return sendJson(200, sponsorsData);
    }

    // 8. Automated Dodo Payments Webhook (POST /api/v1/webhooks/dodo)
    if (pathname === '/api/v1/webhooks/dodo' && req.method === 'POST') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', async () => {
        const sigHeader =
          (req.headers['webhook-signature'] as string) ||
          (req.headers['x-dodo-signature'] as string) ||
          (req.headers['signature'] as string);

        const result = await dodoProcessor.handleWebhook(rawBody, sigHeader);
        return sendJson(result.statusCode, result);
      });
      return;
    }

    return sendJson(404, {
      error: 'Route not found',
      validEndpoints: [
        'GET /api/v1/health',
        'GET /api/v1/servers',
        'GET /api/v1/servers/:id',
        'GET /api/v1/tools',
        'GET /api/v1/tools/:id',
        'GET /api/v1/sponsors',
        'POST /api/v1/webhooks/dodo',
        'POST /api/v1/submit',
        'POST /api/v1/mcpshelf/submit',
        'POST /api/v1/devshelf/submit'
      ]
    });
  });

  return server;
}

export function startApiServer(port = PORT) {
  const server = createApiServer();
  server.listen(port, () => {
    console.log(`\n🚀 [MCPShelf & DevShelf API Gateway] Live on http://localhost:${port}`);
    console.log(`   Health:  http://localhost:${port}/api/v1/health`);
    console.log(`   Servers:  http://localhost:${port}/api/v1/servers`);
    console.log(`   Tools:    http://localhost:${port}/api/v1/tools`);
    console.log(`   Sponsors: http://localhost:${port}/api/v1/sponsors`);
    console.log(`   Webhooks: http://localhost:${port}/api/v1/webhooks/dodo`);
    console.log(`   Submit:   http://localhost:${port}/api/v1/submit\n`);
  });
  return server;
}

if (process.argv[1]?.endsWith('rest-api.ts')) {
  startApiServer();
}
