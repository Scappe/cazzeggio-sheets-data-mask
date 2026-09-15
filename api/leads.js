import { deny, findRowByMaps, jsonError, noStore, normalizeBool, rows, updateCell } from './_lib.js';
import { isAuthorized } from './_auth.js';

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
      const values = await rows();
      const leads = [];
      for (let i = 1; i < values.length; i++) {
        const [name, maps, contacted, , rawLat, rawLon] = values[i] || [];
        if (!name || !maps) continue;
        const lat = coord(rawLat);
        const lon = coord(rawLon);
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
