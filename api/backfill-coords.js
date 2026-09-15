import { deny, jsonError, noStore, rows, updateCell } from './_lib.js';
import { isAuthorized } from './_auth.js';

const ROME_VIEWBOX = '12.39,41.94,12.57,41.79';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function queryFromMaps(maps, name) {
  try {
    const u = new URL(String(maps || ''));
    const q = u.searchParams.get('query');
    if (q) return q;
  } catch {}
  return `${name || ''}, Roma`.trim();
}

async function geocode(q) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'it');
  url.searchParams.set('viewbox', ROME_VIEWBOX);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('q', q);

  const r = await fetch(url, {
    headers: {
      'User-Agent': 'AxanteLeadMask/1.0 (business lead map)',
      'Accept-Language': 'it,en;q=0.8',
    },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`geocoder_${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) throw new Error('not_found');
  const lat = Number(data[0].lat);
  const lon = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('invalid_coords');
  return { lat, lon };
}

export default async function handler(req, res) {
  noStore(res);
  if (!isAuthorized(req)) return deny(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed');
  }

  const offset = Math.max(0, Number(req.query?.offset || 0) | 0);
  const limit = Math.min(35, Math.max(1, Number(req.query?.limit || 25) | 0));
  const dry = String(req.query?.dry || '') === '1';

  try {
    const values = await rows();
    const dataRows = values.slice(1).map((row, i) => ({ row, sheetRow: i + 2 })).filter(x => x.row?.[0] && x.row?.[1]);
    const batch = dataRows.slice(offset, offset + limit);

    if (!dry && offset === 0) {
      await Promise.all([updateCell(1, 'E', 'Lat'), updateCell(1, 'F', 'Lon')]);
    }

    let saved = 0;
    const failed = [];
    const results = [];
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const [name, maps] = item.row;
      try {
        const { lat, lon } = await geocode(queryFromMaps(maps, name));
        results.push({ row: item.sheetRow, name: String(name), lat, lon });
        if (!dry) {
          await Promise.all([
            updateCell(item.sheetRow, 'E', lat),
            updateCell(item.sheetRow, 'F', lon),
          ]);
        }
        saved++;
      } catch (e) {
        failed.push({ row: item.sheetRow, name: String(name), error: String(e?.message || e) });
      }
      if (i < batch.length - 1) await sleep(1100);
    }

    return res.status(200).json({
      ok: true,
      dry,
      offset,
      processed: batch.length,
      saved,
      failed,
      results,
      nextOffset: offset + batch.length,
      total: dataRows.length,
      done: offset + batch.length >= dataRows.length,
    });
  } catch (e) {
    console.error('backfill_coords_error', e?.message || e);
    return jsonError(res, 500, 'backfill_failed');
  }
}
