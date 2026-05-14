#!/usr/bin/env node
/**
 * Integration test: sends correctly-signed webhook payloads to the local API.
 * Requires the API to be running: cd apps/api && npm run start:dev
 *
 * Usage:
 *   node apps/api/scripts/test-webhooks.js
 *   node apps/api/scripts/test-webhooks.js --gateway momo
 *   node apps/api/scripts/test-webhooks.js --gateway zalopay
 *   node apps/api/scripts/test-webhooks.js --gateway sepay
 *
 * Env vars read from .env.local if present (falls back to test values):
 *   MOMO_ACCESS_KEY, MOMO_SECRET_KEY, ZALOPAY_KEY2, SEPAY_WEBHOOK_SECRET
 */

const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Load env ──────────────────────────────────────────────────────────────────
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  }
}

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ORDER_ID = `RENT-test1234-${Date.now()}`;

const MOMO_ACCESS_KEY     = process.env.MOMO_ACCESS_KEY     || 'F8BBA842ECF85';
const MOMO_SECRET_KEY     = process.env.MOMO_SECRET_KEY     || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
const ZALOPAY_KEY2        = process.env.ZALOPAY_KEY2        || 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';
const SEPAY_WEBHOOK_SECRET = process.env.SEPAY_WEBHOOK_SECRET || 'sepay-dev-secret';

// ── HTTP helper ───────────────────────────────────────────────────────────────
function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(BASE_URL + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── MoMo ─────────────────────────────────────────────────────────────────────
async function testMomo() {
  console.log('\n── MoMo ─────────────────────────────────────────────────');

  function buildBody(resultCode) {
    const b = {
      partnerCode: 'MOMOBKUN20180529',
      accessKey: MOMO_ACCESS_KEY,
      requestId: ORDER_ID,
      orderId: ORDER_ID,
      orderInfo: `Thanh toán hóa đơn Thủ Đức - Phòng 101`,
      orderType: 'momo_wallet',
      transId: 4053131830,
      resultCode,
      message: resultCode === 0 ? 'Successful.' : 'Failed.',
      payType: 'wallet',
      responseTime: Date.now(),
      extraData: '',
      amount: 1_547_500,
    };
    const raw = `accessKey=${b.accessKey}&amount=${b.amount}&extraData=${b.extraData}&message=${b.message}&orderId=${b.orderId}&orderInfo=${b.orderInfo}&orderType=${b.orderType}&partnerCode=${b.partnerCode}&payType=${b.payType}&requestId=${b.requestId}&responseTime=${b.responseTime}&resultCode=${b.resultCode}&transId=${b.transId}`;
    b.signature = crypto.createHmac('sha256', MOMO_SECRET_KEY).update(raw).digest('hex');
    return b;
  }

  // Success
  let res = await post('/webhooks/momo', buildBody(0));
  console.log(`  [success]  POST /webhooks/momo → HTTP ${res.status} (expected 204)`);

  // Failure
  res = await post('/webhooks/momo', buildBody(99));
  console.log(`  [failure]  POST /webhooks/momo → HTTP ${res.status} (expected 204)`);

  // Tampered signature → 400
  const tampered = buildBody(0);
  tampered.signature = 'bad-sig';
  res = await post('/webhooks/momo', tampered);
  console.log(`  [bad-sig]  POST /webhooks/momo → HTTP ${res.status} (expected 400)`);
}

// ── ZaloPay ───────────────────────────────────────────────────────────────────
async function testZalopay() {
  console.log('\n── ZaloPay ──────────────────────────────────────────────');

  function buildBody(returnCode) {
    const parsed = {
      app_trans_id: ORDER_ID,
      zp_trans_id: '2604241234567',
      return_code: returnCode,
      return_message: returnCode === 1 ? 'success' : 'fail',
    };
    const rawData = JSON.stringify(parsed);
    const mac = crypto.createHmac('sha256', ZALOPAY_KEY2).update(rawData).digest('hex');
    return { data: rawData, mac };
  }

  // Success
  let res = await post('/webhooks/zalopay', buildBody(1));
  console.log(`  [success]  POST /webhooks/zalopay → HTTP ${res.status}, body:`, res.body);

  // Failure
  res = await post('/webhooks/zalopay', buildBody(2));
  console.log(`  [failure]  POST /webhooks/zalopay → HTTP ${res.status}, body:`, res.body);

  // Bad MAC
  const bad = buildBody(1);
  bad.mac = 'tampered-mac';
  res = await post('/webhooks/zalopay', bad);
  console.log(`  [bad-mac]  POST /webhooks/zalopay → HTTP ${res.status}, body:`, res.body, '(expected return_code: -1)');
}

// ── SePay ─────────────────────────────────────────────────────────────────────
async function testSepay() {
  console.log('\n── SePay ────────────────────────────────────────────────');

  const body = {
    transferAmount: 1_547_500,
    description: `Chuyen khoan ${ORDER_ID} thang 4`,
    referenceCode: 'FT26114999888',
    bankName: 'Vietcombank',
    accountNumber: '1234567890',
  };

  // Valid key + matching orderId
  let res = await post('/webhooks/sepay', body, { 'x-api-key': SEPAY_WEBHOOK_SECRET });
  console.log(`  [success]  POST /webhooks/sepay → HTTP ${res.status}, body:`, res.body);

  // No orderId in description
  res = await post('/webhooks/sepay', { ...body, description: 'Chuyen khoan thang 4' }, { 'x-api-key': SEPAY_WEBHOOK_SECRET });
  console.log(`  [no-match] POST /webhooks/sepay → HTTP ${res.status}, body:`, res.body, '(expected success: true, no reconcile)');

  // Wrong API key
  res = await post('/webhooks/sepay', body, { 'x-api-key': 'wrong-key' });
  console.log(`  [bad-key]  POST /webhooks/sepay → HTTP ${res.status} (expected 400)`);
}

// ── Runner ────────────────────────────────────────────────────────────────────
const target = process.argv.find((a) => a.startsWith('--gateway='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--gateway') + 1];

(async () => {
  console.log(`\nWebhook integration test → ${BASE_URL}`);
  console.log('Make sure the API is running: cd apps/api && npm run start:dev\n');

  try {
    if (!target || target === 'momo')    await testMomo();
    if (!target || target === 'zalopay') await testZalopay();
    if (!target || target === 'sepay')   await testSepay();
    console.log('\n✓ All requests sent. Check API logs for reconcile calls.\n');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('\n✗ Connection refused — is the API running on', BASE_URL, '?\n');
    } else {
      console.error('\n✗', err.message);
    }
    process.exit(1);
  }
})();
