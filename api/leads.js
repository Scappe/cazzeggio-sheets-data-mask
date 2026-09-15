import { SHEET_ID, SHEET_NAME, deny, findRowByMaps, jsonError, noStore, normalizeBool, rows, updateCell } from './_lib.js';
import { isAuthorized } from './_auth.js';

function parseCsv(text) {
  const out = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); out.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); out.push(row); }
  return out;
}

async function coordinateRows() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&range=E:F`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return [];
    return parseCsv(await r.text());
  } catch {
    return [];
  }
}

function coord(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  noStore(res);
  if (!isAuthorized(req)) return deny(res);

  try {
    if (req.method === 'GET') {
      const [values, coords] = await Promise.all([rows(), coordinateRows()]);
      const leads = [];
      for (let i = 1; i < values.length; i++) {
        const [name, maps, contacted] = values[i] || [];
        if (!name || !maps) continue;
        const lat = coord(coords[i]?.[0]);
        const lon = coord(coords[i]?.[1]);
        leads.push({
          name: String(name).trim(),
          maps: String(maps).trim(),
          contacted: normalizeBool(contacted),
          ...(lat !== null && lon !== null ? { lat, lon } : {}),
        });
      }
      return res.status(200).json({ leads, updatedAt: new Date().toISOString() });
    }

    if (req.method === 'POST') {
      const maps = String(req.body?.maps || '').trim();
      const contacted = Boolean(req.body?.contacted);
      if (!maps) return jsonError(res, 400, 'maps_required');
      const row = await findRowByMaps(maps);
      if (!row) return jsonError(res, 404, 'lead_not_found');
      await updateCell(row, 'C', contacted ? 'Si' : 'No');
      return res.status(200).json({ ok: true, contacted });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed');
  } catch (e) {
    console.error('leads_api_error', e?.message || e);
    return jsonError(res, 500, 'leads_failed');
  }
}
