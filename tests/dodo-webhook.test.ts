import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { fileURLToPath } from 'node:url';
import { DodoWebhookProcessor } from '../scripts/dodo-webhook.js';
import { createApiServer } from '../scripts/rest-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_SECRET = 'whsec_test_secret_key_ritualdev_2026';
const TEST_SPONSORS_FILE = path.resolve(__dirname, 'temp-test-sponsors.json');

function computeDodoSignature(payload: string, secret: string = TEST_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function makeHttpRequest(
  port: number,
  path: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          ...headers,
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('⚡ Automated Dodo Payments Webhook Suite', () => {
  let processor: DodoWebhookProcessor;

  before(() => {
    // Setup clean test sponsors file
    const initialData = {
      boostTiers: {
        spotlight: { name: 'Spotlight', priceUSD: 19, badge: 'Promoted', searchMultiplier: 2.0, perks: [] },
        hero: { name: 'Hero', priceUSD: 49, badge: 'Featured Hero', searchMultiplier: 4.0, perks: [] },
        partner: { name: 'Partner', priceUSD: 99, badge: 'Verified Partner', searchMultiplier: 5.0, perks: [] }
      },
      activeBoosts: [
        {
          serverId: 'io.github.RitualDev-Lab/agentshield',
          tier: 'hero' as const,
          badge: 'Official Security Partner',
          customCallout: 'Zero-Leak Secret Redaction',
          startedAt: '2026-11-01T00:00:00Z',
          expiresAt: '2027-12-31T23:59:59Z',
          verifiedStatus: 'audit-passed'
        }
      ]
    };
    fs.writeFileSync(TEST_SPONSORS_FILE, JSON.stringify(initialData, null, 2), 'utf-8');

    processor = new DodoWebhookProcessor({
      sponsorsPath: TEST_SPONSORS_FILE,
      webhookSecret: TEST_SECRET
    });
  });

  after(() => {
    // Cleanup temporary files
    if (fs.existsSync(TEST_SPONSORS_FILE)) {
      try { fs.unlinkSync(TEST_SPONSORS_FILE); } catch {}
    }
  });

  it('fails closed when webhook secret is not configured', async () => {
    const unconfigured = new DodoWebhookProcessor({
      sponsorsPath: TEST_SPONSORS_FILE,
      webhookSecret: ''
    });

    const payload = JSON.stringify({ type: 'payment.succeeded', data: {} });
    const result = await unconfigured.handleWebhook(payload, 'any_signature');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 500);
    assert.match(result.error || '', /fail closed/i);
  });

  it('rejects webhooks with missing signature header', async () => {
    const payload = JSON.stringify({ type: 'payment.succeeded', data: {} });
    const result = await processor.handleWebhook(payload, undefined);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 401);
    assert.match(result.error || '', /missing webhook signature/i);
  });

  it('rejects tampered webhook payloads or invalid signatures', async () => {
    const payload = JSON.stringify({
      id: 'evt_tamper_1',
      type: 'payment.succeeded',
      data: { metadata: { serverId: 'io.github.RitualDev-Lab/skillprism' } }
    });
    const fakeSignature = computeDodoSignature(payload, 'wrong_secret');

    const result = await processor.handleWebhook(payload, fakeSignature);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 401);
    assert.match(result.error || '', /invalid dodo payments signature/i);
  });

  it('rejects requests with missing serverId in metadata', async () => {
    const payload = JSON.stringify({
      id: 'evt_no_server_1',
      type: 'payment.succeeded',
      data: { product_id: 'pdt_hero_mcp', metadata: {} }
    });
    const sig = computeDodoSignature(payload);

    const result = await processor.handleWebhook(payload, sig);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 422);
    assert.match(result.error || '', /missing required "serverid"/i);
  });

  it('successfully fulfills payment.succeeded and updates sponsors.json', async () => {
    const payloadObj = {
      id: 'evt_pay_success_101',
      type: 'payment.succeeded',
      data: {
        payment_id: 'pay_998877',
        status: 'succeeded',
        product_id: 'pdt_hero_mcp',
        amount: 4900,
        customer: { email: 'dev@test.org' },
        metadata: {
          serverId: 'io.github.RitualDev-Lab/skillprism',
          tier: 'hero',
          customCallout: 'Self-improving AI skill graph and tool verifier'
        }
      }
    };
    const payload = JSON.stringify(payloadObj);
    const sig = computeDodoSignature(payload);

    const result = await processor.handleWebhook(payload, sig);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.serverId, 'io.github.RitualDev-Lab/skillprism');
    assert.strictEqual(result.tier, 'hero');

    // Verify written file
    const fileData = JSON.parse(fs.readFileSync(TEST_SPONSORS_FILE, 'utf-8'));
    const boosted = fileData.activeBoosts.find((b: any) => b.serverId === 'io.github.RitualDev-Lab/skillprism');
    assert.ok(boosted, 'Server should be found in activeBoosts');
    assert.strictEqual(boosted.tier, 'hero');
    assert.strictEqual(boosted.badge, 'Featured Hero');
    assert.strictEqual(boosted.customCallout, 'Self-improving AI skill graph and tool verifier');
  });

  it('rejects duplicate webhook events (replay attack protection)', async () => {
    const payloadObj = {
      id: 'evt_pay_success_101', // Same ID as previous test
      type: 'payment.succeeded',
      data: {
        payment_id: 'pay_998877',
        metadata: { serverId: 'io.github.RitualDev-Lab/skillprism' }
      }
    };
    const payload = JSON.stringify(payloadObj);
    const sig = computeDodoSignature(payload);

    const result = await processor.handleWebhook(payload, sig);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 409);
    assert.match(result.error || '', /duplicate webhook event/i);
  });

  it('successfully deactivates boost on subscription.cancelled', async () => {
    const payloadObj = {
      id: 'evt_cancel_102',
      type: 'subscription.cancelled',
      data: {
        subscription_id: 'sub_334455',
        metadata: { serverId: 'io.github.RitualDev-Lab/skillprism' }
      }
    };
    const payload = JSON.stringify(payloadObj);
    const sig = computeDodoSignature(payload);

    const result = await processor.handleWebhook(payload, sig);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.statusCode, 200);

    const fileData = JSON.parse(fs.readFileSync(TEST_SPONSORS_FILE, 'utf-8'));
    const found = fileData.activeBoosts.find((b: any) => b.serverId === 'io.github.RitualDev-Lab/skillprism');
    assert.strictEqual(found, undefined, 'Server should no longer be in activeBoosts');
  });
});

describe('🌐 REST API Gateway Dodo Webhook Integration', () => {
  let server: http.Server;
  const PORT = 4095;

  before(async () => {
    process.env.DODO_WEBHOOK_SECRET = TEST_SECRET;
    server = createApiServer();
    await new Promise<void>(resolve => server.listen(PORT, resolve));
  });

  after(async () => {
    delete process.env.DODO_WEBHOOK_SECRET;
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('GET /api/v1/sponsors returns boost tiers and active boosts', async () => {
    const res = await makeHttpRequest(PORT, '/api/v1/sponsors', 'GET');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.boostTiers);
    assert.ok(Array.isArray(res.body.activeBoosts));
  });

  it('POST /api/v1/webhooks/dodo enforces signature and returns 401 on missing signature', async () => {
    const res = await makeHttpRequest(
      PORT,
      '/api/v1/webhooks/dodo',
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ type: 'payment.succeeded' })
    );

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.error, /missing webhook signature/i);
  });
});
