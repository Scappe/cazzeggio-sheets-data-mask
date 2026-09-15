import crypto from 'node:crypto';

export const SHEET_ID = process.env.SHEET_ID || process.env.GOOGLE_SHEET_ID || '1R5m6-tF96Fptt01QU5B_yDesKnuYLJBFLTbLFOIWqsQ';
export const SHEET_NAME = process.env.SHEET_NAME || 'Foglio1';

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
}

function configuredSecret() {
  return (
    process.env.LEAD_MASK_KEY ||
    process.env.MASK_KEY ||
    process.env.ACCESS_KEY ||
    process.env.APP_KEY ||
    process.env.AUTH_KEY ||
    process.env.SECRET_KEY ||
    process.env.DATA_MASK_KEY ||
    ''
  );
}

export function requestKey(req) {
  const q = typeof req.query?.k === 'string' ? req.query.k : '';
  const b = typeof req.body?.k === 'string' ? req.body.k : '';
  return q || b;
}

export function isAuthorized(req) {
  const expected = configuredSecret();
  const supplied = requestKey(req);
  if (!expected || !supplied) return false;
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(supplied));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function deny(res) {
  noStore(res);
  return res.status(403).json({ error: 'forbidden' });
}

function envJsonCredentials() {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    '';
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.client_email && parsed.private_key) return parsed;
  } catch {}
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    if (parsed.client_email && parsed.private_key) return parsed;
  } catch {}
  return null;
}

function credentials() {
  const fromJson = envJsonCredentials();
  if (fromJson) return { email: fromJson.client_email, privateKey: fromJson.private_key };

  const email =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    '';
  const privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
    ''
  ).replace(/\\n/g, '\n');
  if (!email || !privateKey) return null;
  return { email, privateKey };
}

const tokenCache = { token: '', exp: 0 };

function b64url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function googleAccessToken() {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN;
  if (tokenCache.token && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;

  const c = credentials();
  if (!c) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: c.email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), c.privateKey);
  const assertion = `${unsigned}.${b64url(signature)}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!r.ok) throw new Error(`google_token_${r.status}`);
  const j = await r.json();
  tokenCache.token = j.access_token;
  tokenCache.exp = Date.now() + (Number(j.expires_in || 3600) * 1000);
  return tokenCache.token;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

async function publicRead() {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&range=A:F`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`sheet_public_${r.status}`);
  return parseCsv(await r.text());
}

async function apiRead() {
  const token = await googleAccessToken();
  if (!token) return publicRead();
  const range = `'${SHEET_NAME.replace(/'/g, "''")}'!A:F`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(range)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!r.ok) throw new Error(`sheet_read_${r.status}`);
  const j = await r.json();
  return j.values || [];
}

export async function rows() {
  return apiRead();
}

export function normalizeBool(value) {
  const s = String(value ?? '').trim().toLowerCase();
  return ['si', 'sì', 'yes', 'true', '1', 'x'].includes(s);
}

export async function updateCell(rowNumber, columnLetter, value) {
  const token = await googleAccessToken();
  if (!token) throw new Error('sheet_write_credentials_missing');
  const range = `'${SHEET_NAME.replace(/'/g, "''")}'!${columnLetter}${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  });
  if (!r.ok) throw new Error(`sheet_write_${r.status}`);
  return r.json();
}

export async function findRowByMaps(maps) {
  const values = await rows();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i]?.[1] || '').trim() === String(maps || '').trim()) return i + 1;
  }
  return null;
}

export function jsonError(res, status, code) {
  noStore(res);
  return res.status(status).json({ error: code });
}
