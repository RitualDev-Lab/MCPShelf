/**
 * Unified Developer Submission API Engine for MCPShelf & DevShelf
 * Endpoint: POST /api/v1/submit
 *
 * Allows developers and autonomous AI agents to programmatically validate,
 * audit, and submit MCP servers and developer tools to both registries.
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PORT = process.env.PORT || 4000;

interface SubmissionPayload {
  target: 'mcpshelf' | 'devshelf';
  apiKey?: string;
  item: {
    name: string;
    title?: string;
    description: string;
    repositoryUrl?: string;
    websiteUrl?: string;
    category: string;
    packageIdentifier?: string;
    transportType?: 'stdio' | 'sse' | 'http';
    envVars?: Array<{ name: string; description?: string }>;
  };
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
    let trustScore = 4.0;
    if (item.repositoryUrl && item.repositoryUrl.startsWith('https://github.com/')) trustScore += 2.2;
    if (item.packageIdentifier) {
      trustScore += 1.8;
      if (item.packageIdentifier.includes('/')) trustScore += 0.8;
    }
    if (item.description && item.description.length > 40) trustScore += 0.7;
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

export function startApiServer() {
  const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/v1/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', service: 'RitualDev Submission Gateway' }));
      return;
    }

    if (req.url === '/api/v1/submit' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as SubmissionPayload;
          const validation = validateSubmission(payload);

          if (!validation.valid) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: validation.error }));
            return;
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

          // Save submission
          const submissionsFile = path.resolve(process.cwd(), 'data', 'submissions.json');
          let existing: any[] = [];
          if (fs.existsSync(submissionsFile)) {
            try { existing = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8')); } catch {}
          }
          existing.push(submissionRecord);
          fs.writeFileSync(submissionsFile, JSON.stringify(existing, null, 2));

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            submissionId,
            target: payload.target,
            status: 'queued',
            trustScore: validation.trustScore,
            message: `Successfully validated and queued for ${payload.target}. It will be included in the next automated sync.`
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found. Use POST /api/v1/submit' }));
  });

  server.listen(PORT, () => {
    console.log(`🚀 [Submission API] Listening on http://localhost:${PORT}/api/v1/submit`);
  });

  return server;
}

if (process.argv[1]?.endsWith('developer-submission-api.ts')) {
  startApiServer();
}
