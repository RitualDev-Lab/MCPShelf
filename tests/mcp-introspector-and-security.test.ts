import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import {
  estimateTokenFootprint,
  synthesizeCapabilitiesForServer,
  ToolDefinition
} from '../scripts/introspect-server.js';
import {
  scanSecurityRisks,
  detectRuntime,
  detectTransport,
  detectEnvVars
} from '../scripts/security-scanner.js';

describe('⚡ Automated MCP Schema Introspector & Footprint Suite', () => {
  test('accurately calculates tool token footprint for small, medium, and complex schemas', () => {
    const smallTools: ToolDefinition[] = [
      {
        name: 'ping',
        description: 'Test connectivity',
        inputSchema: { type: 'object' }
      }
    ];
    const smallFootprint = estimateTokenFootprint({ tools: smallTools });
    assert.ok(smallFootprint >= 35 && smallFootprint < 100, `Expected small footprint, got ${smallFootprint}`);

    const complexTools: ToolDefinition[] = [
      {
        name: 'execute_cloud_migration',
        description: 'Provision AWS ECS cluster and execute database migration scripts with failover validation.',
        inputSchema: {
          type: 'object',
          properties: {
            clusterName: { type: 'string', description: 'Target cluster identifier' },
            envVars: { type: 'object', description: 'Environment configuration' },
            autoRollback: { type: 'boolean', description: 'Enable automatic healthcheck rollback' },
            timeoutSeconds: { type: 'number', description: 'Migration timeout in seconds' }
          },
          required: ['clusterName']
        }
      },
      {
        name: 'generate_audit_log',
        description: 'Stream immutable CloudTrail audit logs to local security file.',
        inputSchema: {
          type: 'object',
          properties: {
            retentionDays: { type: 'number' }
          }
        }
      }
    ];

    const complexFootprint = estimateTokenFootprint({ tools: complexTools });
    assert.ok(complexFootprint > 150, `Expected larger footprint for complex schema, got ${complexFootprint}`);
  });

  test('synthesizeCapabilitiesForServer generates compliant tools and prompts for security archetype', () => {
    const mockSecurityServer = {
      id: 'io.github.RitualDev-Lab/agentshield',
      name: 'AgentShield',
      title: 'AgentShield Enterprise Zero-Leak Secret Defense',
      description: 'Zero-leak secret interception and kernel sandbox',
      category: 'security'
    };

    const caps = synthesizeCapabilitiesForServer(mockSecurityServer);
    assert.ok(caps.tools.length >= 2, 'Expected at least 2 security tools');
    assert.ok(caps.tools.some(t => t.name === 'scan_payload'), 'Missing scan_payload tool');
    assert.ok(caps.tokenFootprint > 50, 'Invalid token footprint');
    assert.strictEqual(caps.introspectionMethod, 'synthetic_archetype');
  });

  test('synthesizeCapabilitiesForServer generates SQL query tools for database archetype', () => {
    const mockDbServer = {
      id: 'postgres-mcp',
      name: 'postgres',
      title: 'PostgreSQL Database MCP Server',
      description: 'Run SQL queries against Postgres database',
      category: 'databases'
    };

    const caps = synthesizeCapabilitiesForServer(mockDbServer);
    assert.ok(caps.tools.some(t => t.name === 'query_readonly'), 'Missing query_readonly tool');
    assert.ok(caps.resources.length > 0, 'Expected schema resource');
  });
});

describe('🛡️ Security & Sandbox Risk Scanner Suite', () => {
  test('flags arbitrary shell execution as High risk tier', () => {
    const mockShellServer = {
      name: 'mcp-bash-runner',
      title: 'Bash Execution MCP',
      description: 'Execute arbitrary terminal shell commands and subprocesses on host',
      category: 'developer-tools'
    };

    const scan = scanSecurityRisks(mockShellServer);
    assert.strictEqual(scan.riskTier, 'High');
    assert.strictEqual(scan.safetyFlags.shellExec, true);
    assert.ok(scan.safetyBadges.includes('🚨 Shell Exec Risk'));
  });

  test('flags filesystem write as Elevated risk tier', () => {
    const mockFsServer = {
      name: 'filesystem-writer',
      title: 'Local Filesystem Editor',
      description: 'Create, modify, and delete files on local disk directory',
      category: 'developer-tools'
    };

    const scan = scanSecurityRisks(mockFsServer);
    assert.strictEqual(scan.riskTier, 'Elevated');
    assert.strictEqual(scan.safetyFlags.fsWrite, true);
    assert.ok(scan.safetyBadges.includes('⚠️ Filesystem Write'));
  });

  test('identifies zero-env safe read-only sandbox servers as Low risk', () => {
    const mockReadOnlyServer = {
      name: 'unit-converter',
      title: 'Pure Math & Unit Conversion',
      description: 'Convert units and calculate math expressions offline',
      category: 'developer-tools'
    };

    const scan = scanSecurityRisks(mockReadOnlyServer);
    assert.strictEqual(scan.riskTier, 'Low');
    assert.strictEqual(scan.safetyFlags.shellExec, false);
    assert.strictEqual(scan.safetyFlags.fsWrite, false);
    assert.ok(scan.safetyBadges.includes('🛡️ Sandbox Safe'));
    assert.ok(scan.safetyBadges.includes('🔑 Zero Env Keys'));
  });

  test('detects runtime correctly for npx, uvx, docker, and python', () => {
    assert.strictEqual(detectRuntime({ installSnippets: { terminal: 'uvx mcp-server-git' } }), 'uvx');
    assert.strictEqual(detectRuntime({ packages: [{ registryType: 'pypi', identifier: 'pg-mcp' }] }), 'uvx');
    assert.strictEqual(detectRuntime({ installSnippets: { terminal: 'docker run -i mcp/sqlite' } }), 'docker');
    assert.strictEqual(detectRuntime({ packages: [{ registryType: 'npm', identifier: '@modelcontextprotocol/server-postgres' }] }), 'npx');
  });

  test('extracts required environment variables for known platforms', () => {
    const ghServer = {
      name: 'github-mcp',
      title: 'GitHub MCP Server',
      description: 'Interact with GitHub issues, PRs, and repos'
    };
    const envs = detectEnvVars(ghServer);
    assert.ok(envs.some(e => e.name === 'GITHUB_PERSONAL_ACCESS_TOKEN'));

    const pgServer = {
      name: 'postgres-mcp',
      title: 'PostgreSQL Server',
      description: 'Direct SQL connection to PostgreSQL database'
    };
    const pgEnvs = detectEnvVars(pgServer);
    assert.ok(pgEnvs.some(e => e.name === 'POSTGRES_CONNECTION_STRING'));
  });
});
