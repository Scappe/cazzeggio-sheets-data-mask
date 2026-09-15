import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  '</head>',
  '<style>[hidden]{display:none!important}</style></head>'
);

html = html.replace(
  "L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);",
  "L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}).addTo(map);"
);

html = html.replace(
  "async function gc(x){if(geo.has(x.maps))return geo.get(x.maps);",
  "async function gc(x){if(Number.isFinite(x.lat)&&Number.isFinite(x.lon))return{lat:x.lat,lon:x.lon};if(geo.has(x.maps))return geo.get(x.maps);"
);

html = html.replace(
  "fetch('/api/geocode?k='+encodeURIComponent(K)+'&q='+encodeURIComponent(z))",
  "fetch('/api/geocode?k='+encodeURIComponent(K)+'&q='+encodeURIComponent(z)+'&maps='+encodeURIComponent(x.maps))"
);

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', html);
console.log('Built optimized static frontend');
