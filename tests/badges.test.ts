import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  generateVerifiedBadgeSvg,
  generateTrustScoreBadgeSvg,
  generateProtocolBadgeSvg,
  generateZeroLeakBadgeSvg,
  generateMcpReadyBadgeSvg,
  generateAllBadges,
  slugify,
} from '../scripts/generate-badges.ts';

describe('🏷️ Embeddable SVG Badges Suite', () => {
  it('generates valid XML and escapings for verified badge', () => {
    const svg = generateVerifiedBadgeSvg('Test <Special> & Server', 9.2);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('⚡ MCPShelf'));
    assert.ok(svg.includes('★ 9.2/10'));
    assert.ok(svg.includes('Test &lt;Special&gt; &amp; Server'));
  });

  it('generates color-coded trust score badges for low, moderate, and high risk', () => {
    const lowSvg = generateTrustScoreBadgeSvg(9.5, 'Low');
    assert.ok(lowSvg.includes('🛡️ Trust Score'));
    assert.ok(lowSvg.includes('9.5/10'));
    assert.ok(lowSvg.includes('#10b981')); // Emerald

    const modSvg = generateTrustScoreBadgeSvg(7.2, 'Moderate');
    assert.ok(modSvg.includes('7.2/10'));
    assert.ok(modSvg.includes('#f59e0b')); // Amber

    const highSvg = generateTrustScoreBadgeSvg(4.5, 'High');
    assert.ok(highSvg.includes('4.5/10'));
    assert.ok(highSvg.includes('#f43f5e')); // Rose
  });

  it('generates protocol and zero-leak badges with accessible labels', () => {
    const protoSvg = generateProtocolBadgeSvg();
    assert.ok(protoSvg.includes('Protocol Ready'));
    assert.ok(protoSvg.includes('role="img"'));

    const zeroLeakSvg = generateZeroLeakBadgeSvg();
    assert.ok(zeroLeakSvg.includes('Audited Protocol'));

    const mcpReadySvg = generateMcpReadyBadgeSvg();
    assert.ok(mcpReadySvg.includes('Claude &amp; Cursor Ready'));
  });

  it('slugify handles special characters and reverse domain IDs predictably', () => {
    assert.strictEqual(slugify('io.github.RitualDev-Lab/agentshield'), 'io-github-ritualdev-lab-agentshield');
    assert.strictEqual(slugify('@ritualdev-lab/mcpshelf'), '-ritualdev-lab-mcpshelf');
  });

  it('generateAllBadges creates badge files for every catalog server', () => {
    const { count, outDir } = generateAllBadges();
    assert.ok(count > 800, `Expected > 800 badges, found ${count}`);
    assert.ok(fs.existsSync(path.join(outDir, 'verified.svg')));
    assert.ok(fs.existsSync(path.join(outDir, 'trust-score.svg')));
    assert.ok(fs.existsSync(path.join(outDir, 'verified', 'io-github-ritualdev-lab-agentshield.svg')));
    assert.ok(fs.existsSync(path.join(outDir, 'trust', 'io-github-ritualdev-lab-agentshield.svg')));
  });
});
