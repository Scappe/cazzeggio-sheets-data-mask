import { deny, isAuthorized, jsonError, noStore } from './_lib.js';

const ROME_VIEWBOX = '12.39,41.94,12.57,41.79';

export default async function handler(req, res) {
  noStore(res);
  if (!isAuthorized(req)) return deny(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed');
  }

  const q = String(req.query?.q || '').trim();
  if (!q) return jsonError(res, 400, 'q_required');

  try {
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
    if (!r.ok) return jsonError(res, 502, 'geocoder_unavailable');
    const data = await r.json();
    if (!Array.isArray(data) || !data.length) return jsonError(res, 404, 'not_found');

    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return jsonError(res, 404, 'not_found');
    return res.status(200).json({ lat, lon });
  } catch (e) {
    console.error('geocode_api_error', e?.message || e);
    return jsonError(res, 500, 'geocode_failed');
  }
}
