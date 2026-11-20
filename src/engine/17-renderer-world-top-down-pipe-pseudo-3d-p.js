/* =====================================================================
   17. RENDERER: WORLD (top-down pipe + pseudo-3D perspective extrusion)
   ===================================================================== */
var minimapCanvas = null;
function buildMinimap() {
  minimapCanvas = document.createElement('canvas');
  minimapCanvas.width = 120; minimapCanvas.height = 120;
  var m = minimapCanvas.getContext && minimapCanvas.getContext('2d'); if (!m) { minimapCanvas = null; return; }
  var s = 120 / WORLD, bx, by, i;
  m.fillStyle = '#0a6b8f'; m.fillRect(0, 0, 120, 120);
  m.fillStyle = '#333'; m.fillRect(0, 0, 120, 120);
  for (by = 0; by < NB; by++) { for (bx = 0; bx < NB; bx++) {
    m.fillStyle = ZONE_COL[blockZone[by * NB + bx]].g; m.fillRect((bx * CELL + 40) * s, (by * CELL + 40) * s, 320 * s, 320 * s);
  } }
  m.fillStyle = 'rgba(255,63,164,0.8)';
  for (i = 0; i < buildings.length; i++) { var b = buildings[i]; if (b.neon) { m.fillRect(b.x * s, b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s)); } }
}

function drawGround(vx0, vy0, vx1, vy1) {
  var bx, by, i, z;
  /* ocean */
  ctx.fillStyle = '#0a5a82'; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  if (!gfx.low) {
    ctx.fillStyle = 'rgba(120,230,255,0.18)';
    var off = (G.t * 18) % 60;
    for (i = Math.floor(vy0 / 60) * 60; i < vy1; i += 60) { ctx.fillRect(Math.max(vx0, WORLD + 160), i + off, 40, 2); ctx.fillRect(Math.max(vx0, WORLD + 230), i + off + 30, 30, 2); }
  }
  /* beach sand strip east of Ocean Drive */
  ctx.fillStyle = '#e9d29a'; ctx.fillRect(WORLD + ROADH, -ROADH, 130, WORLD + ROADH * 2);
  /* asphalt base for the county */
  ctx.fillStyle = gfx.low ? '#2c2c34' : '#24232c'; ctx.fillRect(-ROADH, -ROADH, WORLD + ROADH * 2, WORLD + ROADH * 2);
  var b0x = Math.max(0, Math.floor(vx0 / CELL)), b1x = Math.min(NB - 1, Math.floor(vx1 / CELL));
  var b0y = Math.max(0, Math.floor(vy0 / CELL)), b1y = Math.min(NB - 1, Math.floor(vy1 / CELL));
  for (by = b0y; by <= b1y; by++) {
    for (bx = b0x; bx <= b1x; bx++) {
      z = ZONE_COL[blockZone[by * NB + bx]];
      var x0 = bx * CELL + ROADH, y0 = by * CELL + ROADH, S = CELL - ROADH * 2;
      ctx.fillStyle = z.s; ctx.fillRect(x0, y0, S, S);                       // sidewalk
      ctx.fillStyle = z.g; ctx.fillRect(x0 + 14, y0 + 14, S - 28, S - 28);   // lot
      if (!gfx.low) { ctx.strokeStyle = z.edge; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y0 + 1, S - 2, S - 2); }
    }
  }
  /* swamp ponds */
  for (i = 0; i < ponds.length; i++) {
    var p = ponds[i]; if (p.x + p.r < vx0 || p.x - p.r > vx1 || p.y + p.r < vy0 || p.y - p.r > vy1) { continue; }
    ctx.fillStyle = '#1d4a4a'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, PI2, false); ctx.fill();
    if (!gfx.low) { ctx.fillStyle = 'rgba(46,229,157,0.25)'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.2, p.r * 0.3, 0, PI2, false); ctx.fill(); }
  }
  /* lane markings: dashed centre lines, skipped through intersections */
  ctx.fillStyle = gfx.low ? '#77756a' : '#d8c85a';
  var step = gfx.low ? 80 : 40, rx, ry, k;
  for (k = Math.max(0, Math.floor(vx0 / CELL)); k <= Math.min(NB, Math.ceil(vx1 / CELL)); k++) {
    rx = k * CELL;
    for (ry = Math.floor(vy0 / step) * step; ry < vy1; ry += step) { var m1 = ((ry % CELL) + CELL) % CELL; if (m1 > ROADH && m1 < CELL - ROADH - 20 && ry >= 0 && ry <= WORLD) { ctx.fillRect(rx - 1.5, ry, 3, 20); } }
  }
  for (k = Math.max(0, Math.floor(vy0 / CELL)); k <= Math.min(NB, Math.ceil(vy1 / CELL)); k++) {
    ry = k * CELL;
    for (rx = Math.floor(vx0 / step) * step; rx < vx1; rx += step) { var m2 = ((rx % CELL) + CELL) % CELL; if (m2 > ROADH && m2 < CELL - ROADH - 20 && rx >= 0 && rx <= WORLD) { ctx.fillRect(rx, ry - 1.5, 20, 3); } }
  }
  /* zebra crossings (perspective pipe only) */
  if (!gfx.low) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (bx = Math.max(0, Math.floor(vx0 / CELL)); bx <= Math.min(NB, Math.ceil(vx1 / CELL)); bx++) {
      for (by = Math.max(0, Math.floor(vy0 / CELL)); by <= Math.min(NB, Math.ceil(vy1 / CELL)); by++) {
        var cx = bx * CELL, cy = by * CELL;
        for (i = -30; i <= 24; i += 12) { ctx.fillRect(cx + i, cy - ROADH - 6, 6, 10); ctx.fillRect(cx - ROADH - 6, cy + i, 10, 6); }
      }
    }
  }
}

/* Pseudo-3D projection: a point at height h is displaced away from the
   camera by (p - cam) * h / (CAMH - h). Buildings therefore lean outward
   with proximity & angular displacement from the camera like a real lens. */
function proj(px, py, h) { var k = h / (CAMH - h); return { x: px + (px - cam.x) * k, y: py + (py - cam.y) * k }; }

var visB = [];
function drawBuildings(vx0, vy0, vx1, vy1) {
  var i, b, n = 0, margin = gfx.low ? 10 : 320;
  visB.length = 0;
  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];
    if (b.x + b.w < vx0 - margin || b.x > vx1 + margin || b.y + b.h < vy0 - margin || b.y > vy1 + margin) { continue; }
    if (!gfx.low) { b.d = dist(b.x + b.w / 2, b.y + b.h / 2, cam.x, cam.y); }
    visB.push(b); n++;
  }
  if (gfx.low) {
    /* CLASSIC TOP-DOWN PIPE: flat roofs, hard edges, no extrusion */
    for (i = 0; i < n; i++) {
      b = visB[i];
      ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(0,0,0,' + clamp(0.5 - b.ht / 900, 0.05, 0.45) + ')'; ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      if (b.neon) { ctx.strokeStyle = b.neon; ctx.lineWidth = 2; ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6); }
    }
    return;
  }
  visB.sort(function (p, q) { return q.d - p.d; });
  var night = darkness();
  for (i = 0; i < n; i++) {
    b = visB[i];
    var h = Math.min(b.ht, CAMH * 0.62), x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
    var r00 = proj(x0, y0, h), r10 = proj(x1, y0, h), r11 = proj(x1, y1, h), r01 = proj(x0, y1, h);
    /* walls facing the camera */
    if (cam.y < y0) { wall(x0, y0, x1, y0, r00, r10, b, 0.55, h, night); }
    if (cam.y > y1) { wall(x0, y1, x1, y1, r01, r11, b, 0.75, h, night); }
    if (cam.x < x0) { wall(x0, y0, x0, y1, r00, r01, b, 0.45, h, night); }
    if (cam.x > x1) { wall(x1, y0, x1, y1, r10, r11, b, 0.65, h, night); }
    /* roof */
    ctx.fillStyle = b.roof;
    ctx.beginPath(); ctx.moveTo(r00.x, r00.y); ctx.lineTo(r10.x, r10.y); ctx.lineTo(r11.x, r11.y); ctx.lineTo(r01.x, r01.y); ctx.closePath(); ctx.fill();
    if (b.neon) {
      ctx.strokeStyle = b.neon; ctx.globalAlpha = 0.25 + night * 0.35; ctx.lineWidth = 8; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.stroke();
      /* rooftop helipad / AC unit */
      var cxr = (r00.x + r11.x) / 2, cyr = (r00.y + r11.y) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(cxr - 12, cyr - 12, 24, 24);
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}
function wall(ax, ay, bx, by, ra, rb, b, shade, h, night) {
  ctx.fillStyle = b.c;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(rb.x, rb.y); ctx.lineTo(ra.x, ra.y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,' + (1 - shade) + ')'; ctx.fill();
  /* floor lines / lit windows (neon at night) */
  var floors = Math.min(8, Math.floor(h / 40)), f;
  if (floors > 0) {
    ctx.strokeStyle = b.neon ? b.neon : 'rgba(255,240,200,0.5)'; ctx.globalAlpha = 0.15 + night * 0.5; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (f = 1; f <= floors; f++) {
      var t = f / (floors + 1);
      ctx.moveTo(ax + (ra.x - ax) * t, ay + (ra.y - ay) * t); ctx.lineTo(bx + (rb.x - bx) * t, by + (rb.y - by) * t);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
}
function drawPalms(vx0, vy0, vx1, vy1) {
  var i, p, j;
  for (i = 0; i < palms.length; i++) {
    p = palms[i]; if (p.x < vx0 - 80 || p.x > vx1 + 80 || p.y < vy0 - 80 || p.y > vy1 + 80) { continue; }
    var top = gfx.low ? { x: p.x, y: p.y } : proj(p.x, p.y, 70 * p.s), R = 22 * p.s;
    if (!gfx.low) { ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(top.x, top.y); ctx.stroke(); }
    ctx.fillStyle = p.mangrove ? '#2f5a2a' : '#1f9e57';
    if (gfx.low) { ctx.beginPath(); ctx.arc(top.x, top.y, R * 0.8, 0, PI2, false); ctx.fill(); continue; }
    for (j = 0; j < 6; j++) {
      var a = j * PI2 / 6 + p.x;
      ctx.beginPath(); ctx.moveTo(top.x, top.y);
      ctx.lineTo(top.x + Math.cos(a - 0.25) * R, top.y + Math.sin(a - 0.25) * R);
      ctx.lineTo(top.x + Math.cos(a) * R * 1.25, top.y + Math.sin(a) * R * 1.25);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffb13b'; ctx.beginPath(); ctx.arc(top.x, top.y, 3, 0, PI2, false); ctx.fill();
  }
}
function drawCar(c) {
  var s = 1 + c.z / 260, w = c.w, h = c.h, blink = Math.floor(G.t * 8) % 2;
  ctx.save(); ctx.translate(c.x + 4 + c.z * 0.5, c.y + 5 + c.z * 0.5); ctx.rotate(c.a);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.scale(s, s);
  if (c.type === 'tank') {
    ctx.fillStyle = '#2b2b22'; ctx.fillRect(-w / 2, -h / 2, w, 9); ctx.fillRect(-w / 2, h / 2 - 9, w, 9);
    ctx.fillStyle = c.dead ? '#2a2a2a' : c.color; ctx.fillRect(-w / 2 + 4, -h / 2 + 7, w - 8, h - 14);
    ctx.rotate(wrapA(c.turretA - c.a));
    ctx.fillStyle = c.dead ? '#222' : '#4a5530'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, PI2, false); ctx.fill();
    ctx.fillRect(0, -3, 40, 6); ctx.fillStyle = '#1d1d17'; ctx.fillRect(36, -4, 6, 8);
    ctx.restore(); return;
  }
  ctx.fillStyle = c.dead ? '#2a2422' : c.color; ctx.fillRect(-w / 2, -h / 2, w, h);
  if (!gfx.low) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.3); }
  ctx.fillStyle = c.dead ? '#111' : 'rgba(40,70,110,0.95)';
  ctx.fillRect(w * 0.08, -h * 0.4, w * 0.2, h * 0.8); ctx.fillRect(-w * 0.36, -h * 0.38, w * 0.14, h * 0.76);
  if (!c.dead) {
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(w / 2 - 3, -h / 2 + 2, 3, 4); ctx.fillRect(w / 2 - 3, h / 2 - 6, 3, 4);
    ctx.fillStyle = '#ff2040'; ctx.fillRect(-w / 2, -h / 2 + 2, 2, 4); ctx.fillRect(-w / 2, h / 2 - 6, 2, 4);
    if (c.type === 'police') {
      ctx.fillStyle = '#1b2a6b'; ctx.fillRect(-w * 0.15, -h / 2, w * 0.3, h);
      ctx.fillStyle = blink ? '#ff1f3d' : '#1f6dff'; ctx.fillRect(-3, -h * 0.4, 6, h * 0.4);
      ctx.fillStyle = blink ? '#1f6dff' : '#ff1f3d'; ctx.fillRect(-3, 0, 6, h * 0.4);
    } else if (c.type === 'fbi') {
      ctx.fillStyle = blink ? '#1f6dff' : '#ffffff'; ctx.fillRect(w / 2 - 6, -4, 3, 8);
    } else if (c.type === 'sport') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-w / 2, -2, w, 4);
    }
  }
  if (c.popped) { ctx.fillStyle = '#ffe600'; ctx.fillRect(-w / 2 + 4, h / 2 - 1, 6, 2); }
  ctx.restore();
}
function drawPed(p, col, shirt, isPlayer) {
  if (p.dead) {
    ctx.fillStyle = 'rgba(160,10,30,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, PI2, false); ctx.fill();
    ctx.fillStyle = shirt; ctx.fillRect(p.x - 5, p.y - 3, 10, 6); return;
  }
  var a = isPlayer ? player.a : p.a, sw = Math.sin(G.t * 12 + p.x) * 3;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(2, 2, 7, 0, PI2, false); ctx.fill();
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-3 + sw, -5, 5, 3); ctx.fillRect(-3 - sw, 2, 5, 3);
  ctx.fillStyle = shirt; ctx.fillRect(-4, -6, 8, 12);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(1, 0, 4, 0, PI2, false); ctx.fill();
  if (isPlayer) {
    if (player.weap > 0) { ctx.fillStyle = '#111'; ctx.fillRect(4, 3, player.weap === 3 ? 16 : 9, 3); }
    if (player.punchT > 0) { ctx.fillStyle = col; ctx.fillRect(4, -2, 9, 4); }
  }
  ctx.restore();
}
function darkness() { return (Math.cos(G.tod * PI2) + 1) / 2; }

function drawMarker(tg) {
  var pulse = 0.5 + Math.sin(G.t * 5) * 0.5;
  ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(tg.x, tg.y, 30 + pulse * 10, 0, PI2, false); ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,0,' + (0.15 + pulse * 0.15) + ')'; ctx.beginPath(); ctx.arc(tg.x, tg.y, 40, 0, PI2, false); ctx.fill();
  if (!gfx.low) {
    var top = proj(tg.x, tg.y, 120);
    ctx.strokeStyle = 'rgba(255,230,0,0.4)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(tg.x, tg.y); ctx.lineTo(top.x, top.y); ctx.stroke();
  }
}

function renderWorld() {
  var z = cam.zoom, sx = G.shake > 0 ? rnd(-1, 1) * G.shake * 10 : 0, sy = G.shake > 0 ? rnd(-1, 1) * G.shake * 10 : 0;
  ctx.setTransform(RS * z, 0, 0, RS * z, RS * (VW / 2 - cam.x * z + sx), RS * (VH / 2 - cam.y * z + sy));
  var hw = VW / 2 / z, hh = VH / 2 / z, vx0 = cam.x - hw, vy0 = cam.y - hh, vx1 = cam.x + hw, vy1 = cam.y + hh, i, e;
  drawGround(vx0, vy0, vx1, vy1);
  /* scorch marks grid */
  ctx.fillStyle = 'rgba(10,6,8,0.55)';
  for (i = 0; i < scorch.length; i++) { e = scorch[i]; if (e.x > vx0 - 70 && e.x < vx1 + 70 && e.y > vy0 - 70 && e.y < vy1 + 70) { ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, PI2, false); ctx.fill(); } }
  /* spikes */
  for (i = 0; i < spikes.length; i++) {
    e = spikes[i]; ctx.fillStyle = '#888';
    if (e.horiz) { ctx.fillRect(e.x - 4, e.y - 36, 8, 72); } else { ctx.fillRect(e.x - 36, e.y - 4, 72, 8); }
    ctx.fillStyle = '#ffe600'; for (var k = -32; k <= 32; k += 8) { if (e.horiz) { ctx.fillRect(e.x - 2, e.y + k, 4, 3); } else { ctx.fillRect(e.x + k, e.y - 2, 3, 4); } }
  }
  /* cash bundles */
  for (i = 0; i < pickups.length; i++) {
    e = pickups[i]; var bob = Math.sin(G.t * 6 + i) * 2;
    ctx.fillStyle = '#2ee59d'; ctx.fillRect(e.x - 6, e.y - 4 + bob, 12, 8); ctx.fillStyle = '#0f6b3f'; ctx.fillRect(e.x - 2, e.y - 4 + bob, 4, 8);
  }
  if (G.mission) { var tg = missionTarget(G.mission.def); if (tg) { drawMarker(tg); } }
  for (i = 0; i < peds.length; i++) { e = peds[i]; if (e.x > vx0 - 20 && e.x < vx1 + 20 && e.y > vy0 - 20 && e.y < vy1 + 20) { drawPed(e, e.color, e.shirt, false); } }
  if (!player.car) { drawPed(player, '#c68642', CHARS[player.ch].color, true); }
  for (i = 0; i < cars.length; i++) { e = cars[i]; if (e.z <= 5 && e.x > vx0 - 60 && e.x < vx1 + 60 && e.y > vy0 - 60 && e.y < vy1 + 60) { drawCar(e); } }
  drawBuildings(vx0, vy0, vx1, vy1);
  drawPalms(vx0, vy0, vx1, vy1);
  for (i = 0; i < cars.length; i++) { e = cars[i]; if (e.z > 5) { drawCar(e); } }   // airborne cars above roofs
  /* rockets */
  for (i = 0; i < rockets.length; i++) {
    e = rockets[i]; ctx.fillStyle = e.kind === 'shell' ? '#ffe600' : '#ddd';
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a); ctx.fillRect(-6, -2, 12, 4); ctx.fillStyle = '#ff8a1f'; ctx.fillRect(-10, -2, 4, 4); ctx.restore();
  }
  /* particles */
  var lim = gfx.low ? 90 : PMAX;
  for (i = 0; i < lim; i++) {
    e = parts[i]; if (!e.on) { continue; }
    var f = e.life / e.max;
    ctx.globalAlpha = e.type === 1 ? f * 0.6 : (e.type === 4 ? f : Math.min(1, f * 1.5));
    ctx.fillStyle = e.c;
    var sz = e.type === 0 ? e.size * f : e.size;
    if (e.type === 3) { ctx.fillRect(e.x - sz / 2, e.y - sz / 2 - e.z * 0.5, sz, sz); }
    else { ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(0.5, sz), 0, PI2, false); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  /* tracers (pistol = precision laser line) */
  for (i = 0; i < tracers.length; i++) {
    e = tracers[i]; ctx.strokeStyle = e.c; ctx.lineWidth = 1.5; ctx.globalAlpha = Math.min(1, e.t * 14);
    ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  /* aim laser for pistol on foot */
  if (!player.car && player.weap === 1 && !usingTouch) {
    ctx.strokeStyle = 'rgba(255,63,164,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + Math.cos(player.aim) * 160, player.y + Math.sin(player.aim) * 160); ctx.stroke();
  }
}

