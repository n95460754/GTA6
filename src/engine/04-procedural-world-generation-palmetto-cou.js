/* =====================================================================
   4. PROCEDURAL WORLD GENERATION (Palmetto County, 4000x4000)
   ===================================================================== */
function zoneOf(bx, by) {
  if (bx >= 9) { return 'beach'; }
  if (bx <= 2 && by >= 7) { return 'swamp'; }
  if (by <= 0) { return 'docks'; }
  if (bx >= 3 && bx <= 6 && by >= 3 && by <= 6) { return 'strip'; }
  return 'suburb';
}
var ZONE_COL = {
  strip:  { g: '#2a0f3d', s: '#5a2a7a', edge: '#ff3fa4' },
  suburb: { g: '#2f5e3d', s: '#8d8379', edge: '#c9b8a6' },
  beach:  { g: '#e6c98a', s: '#d8b877', edge: '#fff1c1' },
  swamp:  { g: '#23402a', s: '#4a5a3a', edge: '#6f8a4e' },
  docks:  { g: '#4b4b57', s: '#6b6b78', edge: '#ffb13b' }
};
var NEON = ['#ff3fa4', '#3ff6ff', '#9b5cff', '#ff8a1f', '#ffe600', '#2ee59d'];

function addBuilding(x, y, w, h, ht, c, roof, neon, bi) {
  var b = { x: x, y: y, w: w, h: h, ht: ht, c: c, roof: roof, neon: neon };
  buildings.push(b);
  blockB[bi].push(b);
}

function genWorld() {
  var bx, by, i, j;
  for (i = 0; i < NB * NB; i++) { blockB.push([]); }
  for (by = 0; by < NB; by++) {
    for (bx = 0; bx < NB; bx++) {
      var bi = by * NB + bx, z = zoneOf(bx, by);
      var ox = bx * CELL + 60, oy = by * CELL + 60, S = 280;
      blockZone[bi] = z;
      if (z === 'strip') {
        /* 2x2 lots of neon towers with random heights */
        for (j = 0; j < 4; j++) {
          if (srnd() < 0.15) { continue; }
          var lx = ox + (j % 2) * 145, ly = oy + Math.floor(j / 2) * 145;
          var ht = srndr(160, 430), nc = NEON[Math.floor(srnd() * NEON.length)];
          var shade = Math.floor(srndr(30, 70));
          addBuilding(lx, ly, srndr(100, 135), srndr(100, 135), ht,
            'rgb(' + (shade + 30) + ',' + shade + ',' + (shade + 60) + ')', '#1c1030', nc, bi);
        }
      } else if (z === 'suburb') {
        for (j = 0; j < 4; j++) {
          var hx = ox + (j % 2) * 150 + 15, hy = oy + Math.floor(j / 2) * 150 + 15;
          if (srnd() < 0.2) { palms.push({ x: hx + 50, y: hy + 50, s: srndr(0.8, 1.2) }); continue; }
          var pastel = pick2(['#f7c6d9', '#c6f0f7', '#f7eac6', '#d9c6f7', '#c6f7d4']);
          addBuilding(hx, hy, srndr(80, 110), srndr(80, 110), srndr(40, 75), pastel, pick2(['#b8556e', '#5577b8', '#b88955', '#7a55b8']), null, bi);
          palms.push({ x: hx - 4, y: hy + 120, s: srndr(0.7, 1.1) });
        }
      } else if (z === 'docks') {
        for (j = 0; j < 6; j++) {
          var cx = ox + (j % 2) * 150, cy = oy + Math.floor(j / 2) * 95 + 5;
          addBuilding(cx, cy, 125, 40, 38, pick2(['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad']), '#333', null, bi);
        }
      } else if (z === 'beach') {
        if (srnd() < 0.6) { addBuilding(ox + 110, oy + 110, 50, 50, 30, '#ffb3d1', '#ff3fa4', '#3ff6ff', bi); }
        for (j = 0; j < 7; j++) { palms.push({ x: ox + srndr(0, S), y: oy + srndr(0, S), s: srndr(0.8, 1.3) }); }
      } else { /* swamp */
        for (j = 0; j < 3; j++) { ponds.push({ x: ox + srndr(40, S - 40), y: oy + srndr(40, S - 40), r: srndr(35, 70), bi: bi }); }
        if (srnd() < 0.5) { addBuilding(ox + 20, oy + 200, 60, 45, 28, '#6b5a3a', '#3e3424', null, bi); }
        for (j = 0; j < 5; j++) { palms.push({ x: ox + srndr(0, S), y: oy + srndr(0, S), s: srndr(0.6, 1.0), mangrove: true }); }
      }
    }
  }
  buildMinimap();
}
function pick2(arr) { return arr[Math.floor(srnd() * arr.length)]; }

/* Spatial queries ------------------------------------------------------ */
function isRoad(x, y) {
  if (x < -ROADH || y < -ROADH || x > WORLD + ROADH || y > WORLD + ROADH) { return false; }
  var mx = ((x % CELL) + CELL) % CELL, my = ((y % CELL) + CELL) % CELL;
  return mx < ROADH || mx > CELL - ROADH || my < ROADH || my > CELL - ROADH;
}
function blockList(x, y) {
  var bx = Math.floor(x / CELL), by = Math.floor(y / CELL);
  if (bx < 0 || by < 0 || bx >= NB || by >= NB) { return null; }
  return blockB[by * NB + bx];
}
function inBuilding(x, y) {
  var L = blockList(x, y), i, b;
  if (!L) { return null; }
  for (i = 0; i < L.length; i++) { b = L[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { return b; } }
  return null;
}
function inPond(x, y) {
  for (var i = 0; i < ponds.length; i++) { var p = ponds[i]; var dx = x - p.x, dy = y - p.y; if (dx * dx + dy * dy < p.r * p.r) { return true; } }
  return false;
}
/* Circle vs building push-out. Entities only need their own block,
   because buildings are inset 60u from block edges (> max radius). */
function pushOut(e, r, z) {
  var L = blockList(e.x, e.y), hit = false, i, b;
  if (L) {
    for (i = 0; i < L.length; i++) {
      b = L[i];
      if (z && z > b.ht) { continue; }          // airborne over a low roof
      var nx = clamp(e.x, b.x, b.x + b.w), ny = clamp(e.y, b.y, b.y + b.h);
      var dx = e.x - nx, dy = e.y - ny, d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.0001) { var d = Math.sqrt(d2); e.x += dx / d * (r - d); e.y += dy / d * (r - d); }
        else {
          var l = e.x - b.x, rr = b.x + b.w - e.x, t = e.y - b.y, bt = b.y + b.h - e.y, m = Math.min(l, rr, t, bt);
          if (m === l) { e.x = b.x - r; } else if (m === rr) { e.x = b.x + b.w + r; } else if (m === t) { e.y = b.y - r; } else { e.y = b.y + b.h + r; }
        }
      }
    }
  }
  /* World boundaries (ocean / county line). */
  if (e.x < -30) { e.x = -30; hit = true; } if (e.x > WORLD + 30) { e.x = WORLD + 30; hit = true; }
  if (e.y < -30) { e.y = -30; hit = true; } if (e.y > WORLD + 30) { e.y = WORLD + 30; hit = true; }
  return hit;
}
/* Coarse ray march against buildings. Returns travelled fraction 0..1. */
function rayFrac(x1, y1, x2, y2) {
  var d = dist(x1, y1, x2, y2), n = Math.max(1, Math.ceil(d / 10)), i;
  for (i = 1; i <= n; i++) {
    var f = i / n;
    if (inBuilding(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f)) { return (i - 1) / n; }
  }
  return 1;
}
function los(x1, y1, x2, y2) { return rayFrac(x1, y1, x2, y2) >= 1; }

