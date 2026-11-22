import fs from 'node:fs';
import path from 'node:path';

export function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function slugify(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

export function generateVerifiedBadgeSvg(serverTitle = '', score?: number): string {
  const leftWidth = 84;
  const rightText = score !== undefined ? `★ ${score.toFixed(1)}/10` : '✓ Verified';
  const rightWidth = score !== undefined ? 82 : 76;
  const totalWidth = leftWidth + rightWidth;
  const rightCenterX = leftWidth + (rightWidth / 2);
  const safeText = escapeXml(rightText);
  const safeTitle = escapeXml(serverTitle || 'MCP Server');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" role="img" aria-label="MCPShelf Verified: ${safeTitle} (${safeText})">
  <defs>
    <clipPath id="mcpshelf-verified-clip">
      <rect width="${totalWidth}" height="24" rx="5" fill="#fff"/>
    </clipPath>
    <linearGradient id="verified-grad" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#mcpshelf-verified-clip)">
    <rect width="${leftWidth}" height="24" fill="#0b0f19"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#verified-grad)"/>
    <rect width="${totalWidth}" height="24" fill="none" stroke="rgba(16, 185, 129, 0.45)" stroke-width="1.5"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="700">
    <text x="42" y="16.5" fill="#e2e8f0" letter-spacing="-0.2px">⚡ MCPShelf</text>
    <text x="${rightCenterX}" y="16.5" fill="#ffffff" letter-spacing="-0.1px">${safeText}</text>
  </g>
</svg>`;
}

export function generateTrustScoreBadgeSvg(score: number, riskTier = 'Low'): string {
  const leftWidth = 94;
  const rightText = `${score.toFixed(1)}/10`;
  const rightWidth = 56;
  const totalWidth = leftWidth + rightWidth;
  const rightCenterX = leftWidth + (rightWidth / 2);

  let gradStart = '#10b981';
  let gradEnd = '#059669';
  let borderColor = 'rgba(16, 185, 129, 0.45)';

  if (score < 6 || riskTier === 'High') {
    gradStart = '#f43f5e';
    gradEnd = '#e11d48';
    borderColor = 'rgba(244, 63, 94, 0.45)';
  } else if (score < 8 || riskTier === 'Moderate') {
    gradStart = '#f59e0b';
    gradEnd = '#d97706';
    borderColor = 'rgba(245, 158, 11, 0.45)';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" role="img" aria-label="MCPShelf Trust Score: ${score}/10 (${escapeXml(riskTier)} Risk)">
  <defs>
    <clipPath id="mcpshelf-trust-clip">
      <rect width="${totalWidth}" height="24" rx="5" fill="#fff"/>
    </clipPath>
    <linearGradient id="trust-grad-${score.toFixed(0)}" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="${gradStart}"/>
      <stop offset="100%" stop-color="${gradEnd}"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#mcpshelf-trust-clip)">
    <rect width="${leftWidth}" height="24" fill="#0b0f19"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#trust-grad-${score.toFixed(0)})"/>
    <rect width="${totalWidth}" height="24" fill="none" stroke="${borderColor}" stroke-width="1.5"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="700">
    <text x="47" y="16.5" fill="#e2e8f0" letter-spacing="-0.2px">🛡️ Trust Score</text>
    <text x="${rightCenterX}" y="16.5" fill="#ffffff" letter-spacing="-0.1px">${rightText}</text>
  </g>
</svg>`;
}

export function generateProtocolBadgeSvg(): string {
  const leftWidth = 62;
  const rightWidth = 106;
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" role="img" aria-label="Model Context Protocol Ready">
  <defs>
    <clipPath id="mcpshelf-proto-clip">
      <rect width="${totalWidth}" height="24" rx="5" fill="#fff"/>
    </clipPath>
    <linearGradient id="proto-grad" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#mcpshelf-proto-clip)">
    <rect width="${leftWidth}" height="24" fill="#0b0f19"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#proto-grad)"/>
    <rect width="${totalWidth}" height="24" fill="none" stroke="rgba(99, 102, 241, 0.45)" stroke-width="1.5"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="700">
    <text x="31" y="16.5" fill="#e2e8f0">⚡ MCP</text>
    <text x="115" y="16.5" fill="#ffffff">Protocol Ready</text>
  </g>
</svg>`;
}

export function generateZeroLeakBadgeSvg(): string {
  const leftWidth = 88;
  const rightWidth = 96;
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" role="img" aria-label="Zero-Leak Audited MCP Server">
  <defs>
    <clipPath id="mcpshelf-zl-clip">
      <rect width="${totalWidth}" height="24" rx="5" fill="#fff"/>
    </clipPath>
    <linearGradient id="zl-grad" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#mcpshelf-zl-clip)">
    <rect width="${leftWidth}" height="24" fill="#0b0f19"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#zl-grad)"/>
    <rect width="${totalWidth}" height="24" fill="none" stroke="rgba(16, 185, 129, 0.45)" stroke-width="1.5"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="700">
    <text x="44" y="16.5" fill="#e2e8f0">🔒 Zero-Leak</text>
    <text x="136" y="16.5" fill="#ffffff">Audited Protocol</text>
  </g>
</svg>`;
}

export function generateMcpReadyBadgeSvg(): string {
  const leftWidth = 62;
  const rightWidth = 146;
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" role="img" aria-label="Claude and Cursor MCP Compatible">
  <defs>
    <clipPath id="mcpshelf-ready-clip">
      <rect width="${totalWidth}" height="24" rx="5" fill="#fff"/>
    </clipPath>
    <linearGradient id="ready-grad" x1="0" y1="0" x2="0" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#mcpshelf-ready-clip)">
    <rect width="${leftWidth}" height="24" fill="#0b0f19"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#ready-grad)"/>
    <rect width="${totalWidth}" height="24" fill="none" stroke="rgba(139, 92, 246, 0.45)" stroke-width="1.5"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="700">
    <text x="31" y="16.5" fill="#e2e8f0">⚡ MCP</text>
    <text x="135" y="16.5" fill="#ffffff">Claude &amp; Cursor Ready</text>
  </g>
</svg>`;
}

export function generateAllBadges(): { count: number; outDir: string } {
  const catalogPath = path.resolve(process.cwd(), 'data', 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog not found at ${catalogPath}`);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const badgesDir = path.resolve(process.cwd(), 'site', 'api', 'v1', 'badges');
  const verifiedDir = path.join(badgesDir, 'verified');
  const trustDir = path.join(badgesDir, 'trust');

  fs.mkdirSync(verifiedDir, { recursive: true });
  fs.mkdirSync(trustDir, { recursive: true });

  // 1. Generic Badges
  fs.writeFileSync(path.join(badgesDir, 'verified.svg'), generateVerifiedBadgeSvg());
  fs.writeFileSync(path.join(badgesDir, 'trust-score.svg'), generateTrustScoreBadgeSvg(9.5, 'Low'));
  fs.writeFileSync(path.join(badgesDir, 'protocol.svg'), generateProtocolBadgeSvg());
  fs.writeFileSync(path.join(badgesDir, 'zero-leak.svg'), generateZeroLeakBadgeSvg());
  fs.writeFileSync(path.join(badgesDir, 'mcp-ready.svg'), generateMcpReadyBadgeSvg());

  let count = 5;

  // 2. Per-Server Badges
  for (const server of catalog) {
    const slug = slugify(server.id);
    const score = typeof server.trustScore === 'number' ? server.trustScore : 8.0;
    const riskTier = server.riskTier || (score >= 8 ? 'Low' : (score >= 6 ? 'Moderate' : 'High'));

    const verifiedSvg = generateVerifiedBadgeSvg(server.title || server.name, score);
    const trustSvg = generateTrustScoreBadgeSvg(score, riskTier);

    fs.writeFileSync(path.join(verifiedDir, `${slug}.svg`), verifiedSvg);
    fs.writeFileSync(path.join(trustDir, `${slug}.svg`), trustSvg);
    count += 2;
  }

  console.log(`🏷️ [Badges] Generated ${count} dynamic SVG badges in site/api/v1/badges/`);
  return { count, outDir: badgesDir };
}

// Direct execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('generate-badges')) {
  generateAllBadges();
}
