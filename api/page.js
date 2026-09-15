export default async function handler(req, res) {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const sourceUrl = `${proto}://${host}/index.html?v=${Date.now()}`;
    const r = await fetch(sourceUrl, { cache: 'no-store' });
    if (!r.ok) throw new Error(`index_fetch_${r.status}`);

    let html = await r.text();

    html = html.replace(
      '</head>',
      '<style>[hidden]{display:none!important}</style></head>'
    );

    html = html.replace(
      "L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);",
      "L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}).addTo(map);"
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res.status(200).send(html);
  } catch (e) {
    console.error('page_proxy_error', e?.message || e);
    return res.status(500).send('Errore caricamento pagina');
  }
}
