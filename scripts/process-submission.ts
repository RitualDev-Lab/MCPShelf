import fs from 'node:fs';
import path from 'node:path';
import { scanSecurityRisks } from './security-scanner.js';
import { synthesizeCapabilitiesForServer, estimateTokenFootprint } from './introspect-server.js';
import { slugify } from './generate-badges.js';

interface RawSubmission {
  serverId?: string;
  title?: string;
  description?: string;
  category?: string;
  repository?: string;
  websiteUrl?: string;
  serverJson?: string;
}

function parseFormBody(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = body.split('\n');
  let currentKey = '';
  let currentVal: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentKey) {
        sections[currentKey.toLowerCase()] = currentVal.join('\n').trim();
      }
      currentKey = line.replace(/^###\s+/, '').trim();
      currentVal = [];
    } else {
      currentVal.push(line);
    }
  }
  if (currentKey) {
    sections[currentKey.toLowerCase()] = currentVal.join('\n').trim();
  }
  return sections;
}

function extractEmbeddedJson(text: string): Record<string, any> | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {
      // Ignore
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeCategory(cat: string): string {
  const c = (cat || '').toLowerCase();
  if (c.includes('sec') || c.includes('priv') || c.includes('guard')) return 'security';
  if (c.includes('data') || c.includes('sql') || c.includes('stor')) return 'databases';
  if (c.includes('bill') || c.includes('monet') || c.includes('pay')) return 'monetization';
  if (c.includes('agent') || c.includes('orchestr') || c.includes('llm') || c.includes('ai')) return 'ai-agents';
  if (c.includes('cloud') || c.includes('devops') || c.includes('infra')) return 'cloud-infra';
  if (c.includes('prod') || c.includes('auto') || c.includes('collab')) return 'productivity';
  if (c.includes('web') || c.includes('scrap') || c.includes('brows')) return 'web-automation';
  return 'developer-tools';
}

export function processSubmissionData(issueBody: string): { server: any; slug: string } {
  const form = parseFormBody(issueBody);

  const rawServerId = form['server identifier / package name'] || form['server_id'] || form['identifier'] || '';
  const rawTitle = form['human-readable title'] || form['title'] || form['server name'] || '';
  const rawDesc = form['detailed description'] || form['description'] || '';
  const rawCategory = form['category'] || 'developer-tools';
  const rawRepo = form['source code repository url'] || form['repository'] || form['repo'] || '';
  const rawServerJson = form['official server.json manifest'] || form['server_json'] || '';

  const parsedJson = rawServerJson ? extractEmbeddedJson(rawServerJson) : null;

  const serverId = (rawServerId || parsedJson?.name || rawTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-')).trim();
  const title = (rawTitle || parsedJson?.title || serverId).trim();
  const description = (rawDesc || parsedJson?.description || 'Model Context Protocol Server for autonomous AI workflows.').trim();
  const category = normalizeCategory(rawCategory || parsedJson?.category);
  const repositoryUrl = (rawRepo || parsedJson?.repositoryUrl || '').trim();

  const author = repositoryUrl.includes('github.com/')
    ? repositoryUrl.replace(/^https?:\/\/github\.com\//, '').split('/')[0]
    : 'Community';

  // Package identifier & version
  let packageId = '';
  let version = '1.0.0';
  if (parsedJson?.packages && Array.isArray(parsedJson.packages) && parsedJson.packages.length > 0) {
    packageId = parsedJson.packages[0].identifier || '';
    version = parsedJson.packages[0].version || '1.0.0';
  } else if (parsedJson?.version) {
    version = parsedJson.version;
  }
  if (!packageId) {
    packageId = serverId.startsWith('@') ? serverId : (serverId.includes('/') ? serverId.split('/').pop()! : serverId);
  }

  // Security and capability scanning
  const partialServer = {
    id: serverId,
    name: serverId,
    title,
    description,
    category,
    author,
    repositoryUrl,
    packageIdentifier: packageId
  };

  const secScan = scanSecurityRisks(partialServer);
  const caps = synthesizeCapabilitiesForServer(partialServer);
  const footprint = estimateTokenFootprint(caps.tools);

  // Trust score evaluation based on rubric
  let codeProvenance = repositoryUrl.startsWith('https://github.com/') ? 2.5 : 1.5;
  let packageVerification = packageId.includes('/') ? 2.0 : 1.5;
  let permissionSandboxing = secScan.riskTier === 'Low' ? 2.0 : (secScan.riskTier === 'Moderate' ? 1.5 : 1.0);
  let documentationCompliance = description.length > 50 ? 1.5 : 1.0;
  let securityAudit = 2.0;

  const totalScore = Math.min(10.0, Math.round((codeProvenance + packageVerification + permissionSandboxing + documentationCompliance + securityAudit) * 10) / 10);

  const shortName = (serverId.split('/').pop() || 'server').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const runtimeCmd = secScan.runtime === 'uvx' ? 'uvx' : (secScan.runtime === 'docker' ? 'docker' : (secScan.runtime === 'python' ? 'python' : 'npx'));
  const runtimeArgs = runtimeCmd === 'npx' ? ['-y', packageId] : [packageId];

  const defaultEnvObj: Record<string, string> = {};
  for (const ev of secScan.envVars) {
    defaultEnvObj[ev.name] = `<INSERT_${ev.name}>`;
  }

  const installSnippets = {
    claudeDesktop: JSON.stringify({
      mcpServers: {
        [shortName]: {
          command: runtimeCmd,
          args: runtimeArgs,
          ...(Object.keys(defaultEnvObj).length > 0 ? { env: defaultEnvObj } : {})
        }
      }
    }, null, 2),
    cursorMcp: JSON.stringify({
      command: runtimeCmd,
      args: runtimeArgs,
      ...(Object.keys(defaultEnvObj).length > 0 ? { env: defaultEnvObj } : {})
    }, null, 2),
    windsurf: JSON.stringify({
      mcpServers: {
        [shortName]: {
          command: runtimeCmd,
          args: runtimeArgs,
          ...(Object.keys(defaultEnvObj).length > 0 ? { env: defaultEnvObj } : {})
        }
      }
    }, null, 2),
    terminal: runtimeCmd === 'npx' ? `npx -y ${packageId}` : (runtimeCmd === 'uvx' ? `uvx ${packageId}` : `${runtimeCmd} ${packageId}`)
  };

  const finalServer = {
    id: serverId,
    name: serverId,
    title,
    description,
    version,
    category,
    author,
    repositoryUrl,
    websiteUrl: parsedJson?.websiteUrl || '',
    isOfficialLatest: true,
    publishedAt: new Date().toISOString(),
    trustScore: totalScore,
    securityRating: secScan.riskTier === 'Low' ? 'High' : (secScan.riskTier === 'Moderate' ? 'Moderate' : 'Under Review'),
    riskTier: secScan.riskTier,
    safetyBadges: secScan.safetyBadges,
    safetyFlags: secScan.safetyFlags,
    envVars: secScan.envVars,
    capabilities: caps,
    tokenFootprint: footprint,
    trustBreakdown: {
      codeProvenance,
      packageVerification,
      permissionSandboxing,
      documentationCompliance,
      securityAudit
    },
    reviewsCount: 1,
    averageRating: 5.0,
    estimatedInstalls: 10,
    transportType: secScan.transportType,
    runtime: secScan.runtime,
    packageIdentifier: packageId,
    installSnippets
  };

  const slug = slugify(serverId);

  // Upsert into data/catalog.json
  const catalogPath = path.resolve(process.cwd(), 'data', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const existingIdx = catalog.findIndex((s: any) => s.id === serverId || s.name === serverId);
  if (existingIdx >= 0) {
    catalog[existingIdx] = { ...catalog[existingIdx], ...finalServer };
    console.log(`🔄 Updated existing server entry for ${serverId}`);
  } else {
    catalog.push(finalServer);
    console.log(`✨ Added new server entry for ${serverId}`);
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  // Audit log into data/submissions.json
  const submissionsPath = path.resolve(process.cwd(), 'data', 'submissions.json');
  let submissions: any[] = [];
  if (fs.existsSync(submissionsPath)) {
    try {
      submissions = JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
    } catch {
      submissions = [];
    }
  }

  submissions.push({
    id: `sub_${Date.now()}`,
    serverId,
    title,
    submittedAt: new Date().toISOString(),
    status: 'pending_pr',
    trustScore: totalScore,
    slug
  });

  fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2) + '\n', 'utf8');

  return { server: finalServer, slug };
}

// Execution
async function main() {
  const issueBody = process.env.ISSUE_BODY || '';
  if (!issueBody) {
    console.warn('⚠️ No ISSUE_BODY provided. Exiting.');
    return;
  }

  console.log('🤖 [MCPShelf Pipeline] Processing community submission from issue...');
  const { server, slug } = processSubmissionData(issueBody);

  console.log(`✅ Successfully processed submission for ${server.title} (${server.id})!`);
  console.log(`Slug: ${slug}`);

  // Set GitHub Actions output if in GHA environment
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `server_slug=${slug}\nserver_title=${server.title}\n`);
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('process-submission')) {
  main().catch(err => {
    console.error('Submission error:', err);
    process.exit(1);
  });
}
