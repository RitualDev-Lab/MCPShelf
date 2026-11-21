/**
 * MCPShelf Security & Sandbox Risk Scanner
 * Scans MCP server metadata, packages, and schemas for high-privilege capabilities:
 * - Arbitrary shell execution
 * - Filesystem write/read
 * - Outbound network calls
 * - Credential & secret access
 * Assigns risk tiers and safety badges.
 */

export interface SafetyFlags {
  shellExec: boolean;
  fsWrite: boolean;
  fsRead: boolean;
  networkOutbound: boolean;
  credentialAccess: boolean;
}

export type RiskTier = 'Low' | 'Moderate' | 'Elevated' | 'High';

export interface SecurityAnalysis {
  safetyFlags: SafetyFlags;
  riskTier: RiskTier;
  safetyBadges: string[];
  runtime: 'npx' | 'uvx' | 'docker' | 'python' | 'binary';
  transportType: 'stdio' | 'sse' | 'streamable-http';
  envVars: Array<{ name: string; required: boolean; description?: string }>;
}

export function detectRuntime(server: any): 'npx' | 'uvx' | 'docker' | 'python' | 'binary' {
  const pkg = server.packages?.[0];
  const pkgId = (pkg?.identifier || server.packageIdentifier || server.name || '').toLowerCase();
  const installText = JSON.stringify(server.installSnippets || {}).toLowerCase();
  
  if (pkg?.registryType === 'pypi' || installText.includes('uvx') || pkgId.startsWith('pypi:')) {
    return 'uvx';
  }
  if (installText.includes('docker') || pkgId.includes('docker')) {
    return 'docker';
  }
  if (pkg?.registryType === 'python' || installText.includes('python -m') || installText.includes('pip install')) {
    return 'python';
  }
  if (pkg?.registryType === 'npm' || installText.includes('npx') || pkgId.includes('/') || pkgId.startsWith('@')) {
    return 'npx';
  }
  return 'npx';
}

export function detectTransport(server: any): 'stdio' | 'sse' | 'streamable-http' {
  const rawTransport = (server.transportType || server.packages?.[0]?.transport?.type || 'stdio').toLowerCase();
  if (rawTransport.includes('sse')) return 'sse';
  if (rawTransport.includes('http') || rawTransport.includes('stream')) return 'streamable-http';
  return 'stdio';
}

export function detectEnvVars(server: any): Array<{ name: string; required: boolean; description?: string }> {
  const vars: Array<{ name: string; required: boolean; description?: string }> = [];
  const seen = new Set<string>();

  // 1. Check explicit packages environmentVariables if available
  if (server.packages?.[0]?.environmentVariables && Array.isArray(server.packages[0].environmentVariables)) {
    for (const ev of server.packages[0].environmentVariables) {
      if (ev.name && !seen.has(ev.name)) {
        seen.add(ev.name);
        vars.push({
          name: ev.name,
          required: ev.required !== false,
          description: ev.description || `${ev.name} access credential`
        });
      }
    }
  }

  // 2. Heuristics based on server name, title, and description
  const text = `${server.name} ${server.title || ''} ${server.description || ''}`.toLowerCase();

  const knownEnvRules: Array<{ regex: RegExp; envName: string; desc: string; required: boolean }> = [
    { regex: /\bgithub\b/i, envName: 'GITHUB_PERSONAL_ACCESS_TOKEN', desc: 'GitHub Fine-Grained Personal Access Token', required: true },
    { regex: /\bgitlab\b/i, envName: 'GITLAB_TOKEN', desc: 'GitLab API Personal Access Token', required: true },
    { regex: /\bpostgres(ql)?\b/i, envName: 'POSTGRES_CONNECTION_STRING', desc: 'PostgreSQL connection URI (postgresql://user:pass@host/db)', required: true },
    { regex: /\bmysql\b/i, envName: 'MYSQL_CONNECTION_STRING', desc: 'MySQL database connection URI', required: true },
    { regex: /\bmongo(db)?\b/i, envName: 'MONGODB_URI', desc: 'MongoDB Atlas / local connection string', required: true },
    { regex: /\bslack\b/i, envName: 'SLACK_BOT_TOKEN', desc: 'Slack Bot User OAuth Token (xoxb-...)', required: true },
    { regex: /\blinear\b/i, envName: 'LINEAR_API_KEY', desc: 'Linear Personal API Token', required: true },
    { regex: /\bnotion\b/i, envName: 'NOTION_API_KEY', desc: 'Notion Internal Integration Token', required: true },
    { regex: /\bjira\b/i, envName: 'JIRA_API_TOKEN', desc: 'Atlassian Jira API Token', required: true },
    { regex: /\baws\b|s3\b/i, envName: 'AWS_ACCESS_KEY_ID', desc: 'AWS Access Key ID', required: true },
    { regex: /\bstripe\b/i, envName: 'STRIPE_SECRET_KEY', desc: 'Stripe Secret Key (sk_test_... or sk_live_...)', required: true },
    { regex: /\bopenai\b/i, envName: 'OPENAI_API_KEY', desc: 'OpenAI Platform API Key', required: true },
    { regex: /\banthropic\b/i, envName: 'ANTHROPIC_API_KEY', desc: 'Anthropic Claude API Key', required: true },
    { regex: /\bbrave\b.*search/i, envName: 'BRAVE_SEARCH_API_KEY', desc: 'Brave Search REST API Key', required: true },
    { regex: /\btavily\b/i, envName: 'TAVILY_API_KEY', desc: 'Tavily AI Search Engine Key', required: true },
    { regex: /\bagentshield\b/i, envName: 'AGENTSHIELD_KEY', desc: 'AgentShield Zero-Leak Telemetry Key (Optional)', required: false },
    { regex: /\bpromptshield\b/i, envName: 'PROMPTSHIELD_API_KEY', desc: 'PromptShield Guardrail Token (Optional)', required: false }
  ];

  for (const rule of knownEnvRules) {
    if (rule.regex.test(text) && !seen.has(rule.envName)) {
      seen.add(rule.envName);
      vars.push({
        name: rule.envName,
        required: rule.required,
        description: rule.desc
      });
    }
  }

  return vars;
}

export function scanSecurityRisks(server: any): SecurityAnalysis {
  const text = `${server.name} ${server.title || ''} ${server.description || ''} ${JSON.stringify(server.capabilities || {})}`.toLowerCase();
  const transport = detectTransport(server);
  const runtime = detectRuntime(server);
  const envVars = detectEnvVars(server);

  // 1. Shell / Command Execution Risk
  const shellExec = /\b(exec|shell|bash|cmd|terminal|spawn|subprocess|run-command|powershell|sh)\b/i.test(text);

  // 2. Filesystem Write / Modify Risk
  const fsWrite = /\b(write|create|delete|remove|modify|upload|edit|unlink|touch|rmdir)\b.*\b(file|directory|folder|disk|path|fs)\b/i.test(text) ||
                  /\b(file-writer|fs-write|filesystem-write)\b/i.test(text);

  // 3. Filesystem Read Risk
  const fsRead = /\b(read|list|inspect|search|find|cat)\b.*\b(file|directory|folder|disk|path|fs|repo)\b/i.test(text) ||
                 /\b(filesystem|file-reader)\b/i.test(text) || fsWrite;

  // 4. Outbound Network Call Risk
  const networkOutbound = /\b(http|fetch|curl|browser|puppeteer|playwright|scrape|crawler|api|webhook|oauth|rest|remote)\b/i.test(text) ||
                          transport === 'sse' || transport === 'streamable-http';

  // 5. Credential / Secret Access Risk
  const credentialAccess = envVars.length > 0 || /\b(token|credential|api-key|secret|password|auth|jwt)\b/i.test(text);

  const safetyFlags: SafetyFlags = {
    shellExec,
    fsWrite,
    fsRead,
    networkOutbound,
    credentialAccess
  };

  // Determine Risk Tier
  let riskTier: RiskTier = 'Low';
  if (shellExec) {
    riskTier = 'High';
  } else if (fsWrite) {
    riskTier = 'Elevated';
  } else if (networkOutbound || credentialAccess || fsRead) {
    riskTier = 'Moderate';
  } else {
    riskTier = 'Low';
  }

  // Generate Human & Agent Badges
  const badges: string[] = [];

  // Transport Badge
  if (transport === 'stdio') badges.push('⚡ Stdio');
  else if (transport === 'sse') badges.push('🌐 SSE');
  else badges.push('📡 Streamable-HTTP');

  // Runtime Badge
  if (runtime === 'npx') badges.push('📦 npx');
  else if (runtime === 'uvx') badges.push('🐍 uvx');
  else if (runtime === 'docker') badges.push('🐳 Docker');
  else if (runtime === 'python') badges.push('🐍 Python');
  else badges.push('⚙️ Binary');

  // Security & Sandbox Badges
  if (riskTier === 'High') {
    badges.push('🚨 Shell Exec Risk');
  } else if (riskTier === 'Elevated') {
    badges.push('⚠️ Filesystem Write');
  } else if (riskTier === 'Moderate') {
    if (networkOutbound) badges.push('🌐 Outbound Network');
    if (fsRead && !fsWrite) badges.push('📖 Read-Only FS');
  } else {
    badges.push('🛡️ Sandbox Safe');
  }

  // Credential Badge
  if (envVars.length === 0) {
    badges.push('🔑 Zero Env Keys');
  } else {
    badges.push(`🔑 ${envVars.length} Required Env`);
  }

  return {
    safetyFlags,
    riskTier,
    safetyBadges: badges,
    runtime,
    transportType: transport,
    envVars
  };
}
