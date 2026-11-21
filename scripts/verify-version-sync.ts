/**
 * Automated Version Synchronization Guardrail
 * Ensures package.json, server.json, pyproject.toml, and SDKs stay locked in sync.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

function main() {
  const rootDir = process.cwd();

  // 1. Root package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const rootVersion = pkg.version;

  console.log(`🔍 [Version Sync Guardrail] Checking consistency against root version v${rootVersion}...`);

  const errors: string[] = [];

  // 2. server.json
  const serverJsonPath = path.join(rootDir, 'server.json');
  if (fs.existsSync(serverJsonPath)) {
    const serverJson = JSON.parse(fs.readFileSync(serverJsonPath, 'utf-8'));
    if (serverJson.version !== rootVersion) {
      errors.push(`server.json version "${serverJson.version}" does not match root version "${rootVersion}"`);
    }
    for (const p of serverJson.packages || []) {
      if (p.version !== rootVersion) {
        errors.push(`server.json package "${p.identifier}" version "${p.version}" does not match root version "${rootVersion}"`);
      }
    }
  } else {
    errors.push('server.json missing');
  }

  // 3. Python pyproject.toml
  const pyprojectPath = path.join(rootDir, 'sdks', 'python', 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf-8');
    const match = pyprojectContent.match(/version\s*=\s*["']([^"']+)["']/);
    if (!match || match[1] !== rootVersion) {
      errors.push(`pyproject.toml version "${match ? match[1] : 'missing'}" does not match root version "${rootVersion}"`);
    }
  } else {
    errors.push('sdks/python/pyproject.toml missing');
  }

  // 4. Python SDK __init__.py
  const initPyPath = path.join(rootDir, 'sdks', 'python', 'src', 'mcpshelf', '__init__.py');
  if (fs.existsSync(initPyPath)) {
    const initContent = fs.readFileSync(initPyPath, 'utf-8');
    const match = initContent.match(/__version__\s*=\s*["']([^"']+)["']/);
    if (!match || match[1] !== rootVersion) {
      errors.push(`sdks/python/__init__.py __version__ "${match ? match[1] : 'missing'}" does not match root version "${rootVersion}"`);
    }
  } else {
    errors.push('sdks/python/src/mcpshelf/__init__.py missing');
  }

  if (errors.length > 0) {
    console.error('❌ [Version Sync Guardrail] Detected version mismatches:');
    for (const err of errors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✅ [Version Sync Guardrail] All package manifests and SDKs are perfectly synchronized at v${rootVersion}!`);
}

main();
