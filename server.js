const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.VTUGATE_BASE_URL || 'https://api.vtugate.com';
const API_KEY = process.env.VTUGATE_API_KEY;

if (!API_KEY) {
  console.warn('WARNING: VTUGATE_API_KEY is not set. Add it to .env before starting.');
}

function requireKey(res) {
  if (!API_KEY) {
    res.status(500).json({ status: false, message: 'VTUGATE API key is not configured on the server.' });
    return false;
  }
  return true;
}

// Small in-memory guard for a single demo server. Use a real rate limiter in production.
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const item = hits.get(ip) || { start: now, count: 0 };
  if (now - item.start >= 60_000) { item.start = now; item.count = 0; }
  item.count += 1;
  hits.set(ip, item);
  if (item.count > 30) return res.status(429).json({ status: false, message: 'Too many requests. Try again shortly.' });
  next();
}

async function vtugatePost(path, params) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) body.set(key, String(value));

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${API_KEY}`
    },
    body
  });

  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { status: false, message: 'VTUGATE returned an invalid response.' }; }
  return { httpStatus: response.status, data };
}

app.get('/health', (_req, res) => res.json({ status: true, app: 'ASDATA', vtugateConfigured: Boolean(API_KEY) }));

app.post('/api/data-plans', rateLimit, async (req, res) => {
  if (!requireKey(res)) return;
  const serviceId = req.body.service_id;
  if (serviceId === undefined || serviceId === null || String(serviceId).trim() === '') {
    return res.status(400).json({ status: false, message: 'service_id is required.' });
  }
  try {
    const result = await vtugatePost('/api/v1/fetchdataplans', { service_id: serviceId });
    res.status(result.httpStatus).json(result.data);
  } catch (err) {
    res.status(502).json({ status: false, message: 'Could not reach VTUGATE.' });
  }
});

app.post('/api/buy-data', rateLimit, async (req, res) => {
  if (!requireKey(res)) return;
  const { service_id, phone_number, amount, plan_code } = req.body;
  if ([service_id, phone_number, amount, plan_code].some(v => v === undefined || v === null || String(v).trim() === '')) {
    return res.status(400).json({ status: false, message: 'service_id, phone_number, amount and plan_code are required.' });
  }
  if (!/^0\d{10}$/.test(String(phone_number))) {
    return res.status(400).json({ status: false, message: 'phone_number must be an 11-digit Nigerian number.' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ status: false, message: 'amount must be a positive number.' });
  }
  try {
    const result = await vtugatePost('/api/v1/buydata', {
      service_id,
      phone_number,
      amount: numericAmount,
      plan_code
    });
    res.status(result.httpStatus).json(result.data);
  } catch (err) {
    res.status(502).json({ status: false, message: 'Could not reach VTUGATE.' });
  }
});

app.use((_req, res) => res.status(404).json({ status: false, message: 'Route not found.' }));

app.listen(PORT, () => console.log(`ASDATA backend listening on port ${PORT}`));
