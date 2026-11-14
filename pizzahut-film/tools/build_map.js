// Builds src/map.js: a dot-grid of Indonesia (from Natural Earth via world-atlas 50m) in stage pixels,
// plus the outline as SVG paths and a few city markers. Run: node tools/build_map.js
const fs = require('fs');
const path = require('path');
const topo = require('topojson-client');
const world = require('world-atlas/countries-50m.json');
const feat = topo.feature(world, world.objects.countries).features.find((f) => f.id === '360');
const LON0 = 94.6, LON1 = 141.4, LAT0 = -11.2, LAT1 = 6.4;
const W = 1760, X0 = (1920 - W) / 2;
const K = W / (LON1 - LON0);
const H = (LAT1 - LAT0) * K, Y0 = 540 - H / 2 + 40;
const px = ([lon, lat]) => [X0 + (lon - LON0) * K, Y0 + (LAT1 - lat) * K];
const polys = feat.geometry.type === 'MultiPolygon' ? feat.geometry.coordinates : [feat.geometry.coordinates];
function inRing(p, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inside = (p) => polys.some((poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h)));
const STEP = 0.27; // degrees
const dots = [];
for (let lat = LAT1; lat >= LAT0; lat -= STEP) {
  for (let lon = LON0; lon <= LON1; lon += STEP) {
    if (inside([lon, lat])) { const [x, y] = px([lon, lat]); dots.push([+x.toFixed(1), +y.toFixed(1)]); }
  }
}
// small islands that the grid misses: drop one dot at each polygon centroid if none landed inside it
for (const poly of polys) {
  const r = poly[0];
  const has = dots.length && r.length > 2;
  let cx = 0, cy = 0; r.forEach(([a, b]) => { cx += a; cy += b; }); cx /= r.length; cy /= r.length;
  const [x, y] = px([cx, cy]);
  const near = dots.some(([dx, dy]) => Math.hypot(dx - x, dy - y) < STEP * K * 0.9);
  if (has && !near) dots.push([+x.toFixed(1), +y.toFixed(1)]);
}
const outline = polys.map((poly) => 'M' + poly[0].map((c) => px(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('');
const cities = [
  ['Sabang', 95.32, 5.89], ['Medan', 98.67, 3.59], ['Padang', 100.35, -0.95], ['Pekanbaru', 101.45, 0.51], ['Palembang', 104.75, -2.98],
  ['Jakarta', 106.85, -6.2], ['Bandung', 107.61, -6.91], ['Semarang', 110.42, -6.97], ['Yogyakarta', 110.37, -7.8], ['Surabaya', 112.75, -7.25],
  ['Denpasar', 115.22, -8.65], ['Mataram', 116.12, -8.58], ['Kupang', 123.6, -10.17], ['Pontianak', 109.33, -0.03], ['Banjarmasin', 114.59, -3.32],
  ['Balikpapan', 116.83, -1.27], ['Samarinda', 117.15, -0.5], ['Makassar', 119.42, -5.14], ['Manado', 124.84, 1.47], ['Palu', 119.87, -0.9],
  ['Kendari', 122.51, -3.97], ['Ternate', 127.38, 0.79], ['Ambon', 128.18, -3.7], ['Sorong', 131.25, -0.88], ['Jayapura', 140.7, -2.53], ['Merauke', 140.4, -8.49],
].map(([n, lon, lat]) => { const [x, y] = px([lon, lat]); return { n, x: +x.toFixed(1), y: +y.toFixed(1) }; });
const out = { dots, outline, cities, box: { x: X0, y: Y0, w: W, h: H } };
fs.writeFileSync(path.join(__dirname, '../src/map.js'), 'window.MAP = ' + JSON.stringify(out) + ';\n');
console.log(`dots ${dots.length}, polys ${polys.length}, box`, out.box);
