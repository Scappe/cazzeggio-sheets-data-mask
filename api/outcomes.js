import { deny, findRowByMaps, isAuthorized, jsonError, noStore, rows, updateCell } from './_lib.js';

const ALLOWED = new Set(['interested', 'not_interested', 'callback']);

export default async function handler(req, res) {
  noStore(res);
  if (!isAuthorized(req)) return deny(res);

  try {
    if (req.method === 'GET') {
      const values = await rows();
      const outcomes = {};
      for (let i = 1; i < values.length; i++) {
        const maps = String(values[i]?.[1] || '').trim();
        const outcome = String(values[i]?.[3] || '').trim();
        if (!maps || !ALLOWED.has(outcome)) continue;
        outcomes[maps] = { outcome };
      }
      return res.status(200).json({ outcomes });
    }

    if (req.method === 'POST') {
      const maps = String(req.body?.maps || '').trim();
      const raw = req.body?.outcome;
      const outcome = raw == null || raw === '' ? '' : String(raw).trim();
      if (!maps) return jsonError(res, 400, 'maps_required');
      if (outcome && !ALLOWED.has(outcome)) return jsonError(res, 400, 'invalid_outcome');
      const row = await findRowByMaps(maps);
      if (!row) return jsonError(res, 404, 'lead_not_found');
      await updateCell(row, 'D', outcome);
      return res.status(200).json({ ok: true, outcome: outcome || null });
    }

    res.setHeader('Allow', 'GET, POST');
    return jsonError(res, 405, 'method_not_allowed');
  } catch (e) {
    console.error('outcomes_api_error', e?.message || e);
    return jsonError(res, 500, 'outcomes_failed');
  }
}
