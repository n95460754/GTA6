/* =====================================================================
   17b. TRUE 3D CHASE-CAMERA RENDERER (software 3D on Canvas 2D, ES5)
   A real perspective camera sits behind the player / vehicle. Every
   building, car, pedestrian, palm and pickup is a lit, fogged 3D solid.
   Pipeline per frame:
     1. camera basis (yaw + pitch) -> world points to camera space
     2. near-plane clipping (Sutherland-Hodgman) + perspective divide
     3. back-face culling, flat shading (sun + night), distance fog
     4. painter's algorithm: ground layer first, then objects far->near
   No WebGL: runs on the same CPU-only Canvas 2D path as the 2D pipes.
   ===================================================================== */
var C3 = { x: 0, y: 0, z: 60, yaw: 0, pitch: 0.2, f: 500, near: 4, far: 1700, ready: false,
  cy: 1, sy: 0, cp: 1, sp: 0, hz: 0 };
var r3objs = [], r3night = 0, r3fog = [40, 20, 70], r3sun = 1;
var colorCache = {};

/* ---- color helpers (parse once, cache) ---- */
function rgbOf(c) {
  var v = colorCache[c], m;
  if (v) { return v; }
  if (c.charAt(0) === '#') {
    if (c.length === 4) { v = [parseInt(c.charAt(1) + c.charAt(1), 16), parseInt(c.charAt(2) + c.charAt(2), 16), parseInt(c.charAt(3) + c.charAt(3), 16)]; }
    else { v = [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  } else if ((m = c.match(/(\d+)\D+(\d+)\D+(\d+)/))) { v = [+m[1], +m[2], +m[3]]; }
  else { v = [255, 0, 255]; }
  colorCache[c] = v; return v;
}
/* shade (light factor) + fog by distance -> css color */
function shadeCol(rgb, light, d, alpha) {
  var t = clamp((d - C3.far * 0.45) / (C3.far * 0.55), 0, 1), l = light * r3sun;
  var r = rgb[0] * l * (1 - t) + r3fog[0] * t, g = rgb[1] * l * (1 - t) + r3fog[1] * t, b = rgb[2] * l * (1 - t) + r3fog[2] * t;
  r = r > 255 ? 255 : Math.round(r); g = g > 255 ? 255 : Math.round(g); b = b > 255 ? 255 : Math.round(b);
  return alpha !== undefined && alpha < 1 ? 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')' : 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ---- camera ---- */
function updateCamera3D(dt) {
  var c = player.car, P = playerPos(), head = c ? c.a : player.a;
  var k = 1 - Math.exp(-dt * (c ? 3.5 : 5));
  if (!C3.ready) { C3.yaw = head; }
  C3.yaw = wrapA(C3.yaw + wrapA(head - C3.yaw) * k);
  var dist3 = c ? (c.type === 'tank' ? 175 : 125) + Math.min(70, Math.abs(c.v) * 0.12) : 78;
  var h = c ? (c.type === 'tank' ? 72 : 52) : 40;
  var tx = P.x - Math.cos(C3.yaw) * dist3, ty = P.y - Math.sin(C3.yaw) * dist3;
  /* never put the lens inside a wall: pull in along the ray */
  var fr = rayFrac(P.x, P.y, tx, ty);
  if (fr < 1) { fr = Math.max(0.12, fr - 0.06); tx = P.x + (tx - P.x) * fr; ty = P.y + (ty - P.y) * fr; }
  var kp = 1 - Math.exp(-dt * 9);
  if (!C3.ready) { C3.x = tx; C3.y = ty; C3.ready = true; } else { C3.x += (tx - C3.x) * kp; C3.y += (ty - C3.y) * kp; }
  C3.z += ((h + (c ? c.z * 0.8 : 0)) - C3.z) * kp;
  C3.pitch = c ? 0.19 : 0.17;
}
function camBasis() {
  var sh = G.shake > 0 ? G.shake * 0.02 : 0;
  var yaw = C3.yaw + (sh ? rnd(-sh, sh) : 0), pit = C3.pitch + (sh ? rnd(-sh, sh) : 0);
  C3.cy = Math.cos(yaw); C3.sy = Math.sin(yaw); C3.cp = Math.cos(pit); C3.sp = Math.sin(pit);
  C3.f = Math.max(VW * 0.62, VH * 0.75);
  C3.far = gfx.fps && gfx.fps < 40 ? 1200 : 1700;
  C3.hz = VH * 0.5 - C3.f * Math.tan(pit);       // screen y of the horizon
}
/* world -> camera space. out = [right, up, forward] */
var tmpC = [0, 0, 0];
function toCam(x, y, z, out) {
  var dx = x - C3.x, dy = y - C3.y, dz = z - C3.z;
  out[0] = -dx * C3.sy + dy * C3.cy;
  out[1] = dx * C3.cy * C3.sp + dy * C3.sy * C3.sp + dz * C3.cp;
  out[2] = dx * C3.cy * C3.cp + dy * C3.sy * C3.cp - dz * C3.sp;
  return out;
}
/* Public projector used by HUD (name tags, mission arrow, crosshair). */
function w2s3(x, y, z) {
  toCam(x, y, z, tmpC);
  if (tmpC[2] < C3.near) { return null; }
  return { x: VW / 2 + tmpC[0] / tmpC[2] * C3.f, y: VH / 2 - tmpC[1] / tmpC[2] * C3.f, d: tmpC[2] };
}
/* Project a world polygon (flat xyz array) with near clipping. Returns flat screen array or null. */
function projPoly(w) {
  var n = w.length / 3, i, cam = [], a, b, t, out = [], near = C3.near;
  for (i = 0; i < n; i++) { cam.push(toCam(w[i * 3], w[i * 3 + 1], w[i * 3 + 2], [0, 0, 0])); }
  for (i = 0; i < n; i++) {
    a = cam[i]; b = cam[(i + 1) % n];
    if (a[2] >= near) { out.push(a); }
    if ((a[2] >= near) !== (b[2] >= near)) {
      t = (near - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near]);
    }
  }
  if (out.length < 3) { return null; }
  var s = [], f = C3.f, hw = VW / 2, hh = VH / 2, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, sx, sy;
  for (i = 0; i < out.length; i++) {
    sx = hw + out[i][0] / out[i][2] * f; sy = hh - out[i][1] / out[i][2] * f;
    s.push(sx, sy);
    if (sx < minx) { minx = sx; } if (sx > maxx) { maxx = sx; } if (sy < miny) { miny = sy; } if (sy > maxy) { maxy = sy; }
  }
  if (maxx < 0 || minx > VW || maxy < 0 || miny > VH) { return null; }   // off-screen
  return s;
}
function fillPoly(s, col, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(s[0], s[1]);
  for (var i = 2; i < s.length; i += 2) { ctx.lineTo(s[i], s[i + 1]); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}
/* ground polygon drawn immediately (painter layer 0) */
function ground(w, rgb, light) {
  var s = projPoly(w); if (!s) { return; }
  var cx = 0, cy = 0, n = w.length / 3, i;
  for (i = 0; i < n; i++) { cx += w[i * 3]; cy += w[i * 3 + 1]; }
  fillPoly(s, shadeCol(rgb, light || 1, dist(cx / n, cy / n, C3.x, C3.y)));
}
function gRect(x0, y0, x1, y1, rgb, light, z) {
  z = z || 0; ground([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], rgb, light);
}

/* ---- 3D solids: oriented boxes queued as depth-sorted objects ---- */
function newObj(x, y, z) {
  toCam(x, y, z, tmpC);
  var o = { d: Math.sqrt((x - C3.x) * (x - C3.x) + (y - C3.y) * (y - C3.y) + (z - C3.z) * (z - C3.z)), p: [], circ: null, lines: null };
  r3objs.push(o); return o;
}
/* Oriented box: centre (cx,cy), heading a, half-length hl, half-width hw, z0..z1.
   opts: { roof: color, neon: color, floors: bool, alpha } */
function box(o, cx, cy, a, hl, hw, z0, z1, col, opts) {
  var ca = Math.cos(a), sa = Math.sin(a), i, rgb = rgbOf(col);
  var X = [cx + ca * hl - sa * hw, cx + ca * hl + sa * hw, cx - ca * hl + sa * hw, cx - ca * hl - sa * hw];
  var Y = [cy + sa * hl + ca * hw, cy + sa * hl - ca * hw, cy - sa * hl - ca * hw, cy - sa * hl + ca * hw];
  var alpha = opts && opts.alpha, d = o.d;
  for (i = 0; i < 4; i++) {
    var j = (i + 1) % 4, mx = (X[i] + X[j]) / 2, my = (Y[i] + Y[j]) / 2;
    var nx = mx - cx, ny = my - cy;                                  // outward normal (box is convex)
    if (nx * (C3.x - mx) + ny * (C3.y - my) <= 0) { continue; }      // back-face cull
    var nl = Math.sqrt(nx * nx + ny * ny) || 1;
    var light = 0.62 + 0.3 * ((nx / nl) * 0.55 + (ny / nl) * -0.83);  // sun from the north-east
    var s = projPoly([X[i], Y[i], z0, X[j], Y[j], z0, X[j], Y[j], z1, X[i], Y[i], z1]);
    if (!s) { continue; }
    var face = { s: s, c: shadeCol(rgb, light, d, alpha), st: null };
    if (opts && opts.floors && d < 900 && z1 - z0 > 60) {            // neon floor bands / windows
      face.lines = []; var fl = Math.min(9, Math.floor((z1 - z0) / 36)), k;
      for (k = 1; k <= fl; k++) {
        var zz = z0 + (z1 - z0) * k / (fl + 1), p1 = w2s3(X[i], Y[i], zz), p2 = w2s3(X[j], Y[j], zz);
        if (p1 && p2) { face.lines.push(p1.x, p1.y, p2.x, p2.y); }
      }
      face.lc = opts.neon || 'rgba(255,230,170,0.55)';
    }
    o.p.push(face);
  }
  if (C3.z > z1) {                                                     // roof
    var r = projPoly([X[0], Y[0], z1, X[1], Y[1], z1, X[2], Y[2], z1, X[3], Y[3], z1]);
    if (r) { o.p.push({ s: r, c: shadeCol(opts && opts.roof ? rgbOf(opts.roof) : rgb, 1.08, d, alpha), st: opts && opts.neon && d < 1100 ? opts.neon : null }); }
  }
}
function drawObj(o) {
  var i, f, k;
  for (i = 0; i < o.p.length; i++) {
    f = o.p[i]; fillPoly(f.s, f.c, f.st, 2);
    if (f.lines && f.lines.length) {
      ctx.strokeStyle = f.lc; ctx.globalAlpha = 0.35 + r3night * 0.55; ctx.lineWidth = 1.2; ctx.beginPath();
      for (k = 0; k < f.lines.length; k += 4) { ctx.moveTo(f.lines[k], f.lines[k + 1]); ctx.lineTo(f.lines[k + 2], f.lines[k + 3]); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  if (o.circ) {
    var c = o.circ; ctx.globalAlpha = c.a; ctx.fillStyle = c.c;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, PI2, false); ctx.fill(); ctx.globalAlpha = 1;
  }
}

/* ---- entity builders ---- */
function car3D(c, P) {
  var o = newObj(c.x, c.y, c.z + 8), T = CAR_TYPES[c.type] || CAR_TYPES.sedan;
  var hl = c.w / 2, hw = c.h / 2, z = c.z, col = c.dead ? '#2a2422' : c.color, blink = Math.floor(G.t * 8) % 2;
  if (c.type === 'tank') {
    box(o, c.x, c.y, c.a, hl, hw, z, z + 14, c.dead ? '#2a2a2a' : col, null);
    box(o, c.x, c.y, c.turretA, 14, 12, z + 14, z + 24, c.dead ? '#222' : '#4a5530', null);
    box(o, c.x + Math.cos(c.turretA) * 30, c.y + Math.sin(c.turretA) * 30, c.turretA, 18, 2.5, z + 17, z + 21, '#2b2b22', null);
    return o;
  }
  var bodyH = c.type === 'fbi' ? 15 : 11;
  box(o, c.x, c.y, c.a, hl, hw, z + 2, z + bodyH, col, null);
  /* cabin + glass */
  box(o, c.x - Math.cos(c.a) * hl * 0.12, c.y - Math.sin(c.a) * hl * 0.12, c.a, hl * 0.5, hw * 0.86, z + bodyH, z + bodyH + 8,
    c.dead ? '#111' : '#28466e', { roof: c.dead ? '#222' : col });
  if (!c.dead && c.type === 'police') {
    box(o, c.x, c.y, c.a, 3, hw * 0.7, z + bodyH + 8, z + bodyH + 11, blink ? '#ff1f3d' : '#1f6dff', null);
  }
  if (!c.dead && r3night > 0.35) {   /* headlight glow */
    var h = w2s3(c.x + Math.cos(c.a) * (hl + 2), c.y + Math.sin(c.a) * (hl + 2), z + 6);
    if (h) { o.circ = { x: h.x, y: h.y, r: Math.max(2, 900 / h.d), c: '#fff6c0', a: 0.55 }; }
  }
  return o;
}
function ped3D(x, y, a, skin, shirt, dead, weap) {
  if (dead) {
    var od = newObj(x, y, 0); od.d += 2000; // flat decals draw first
    var s = projPoly([x - 9, y - 9, 0.5, x + 9, y - 9, 0.5, x + 9, y + 9, 0.5, x - 9, y + 9, 0.5]);
    if (s) { od.p.push({ s: s, c: 'rgba(150,10,30,0.8)' }); }
    return;
  }
  var o = newObj(x, y, 10), sw = Math.sin(G.t * 10 + x) * 1.5;
  box(o, x, y, a, 2.2, 3.4, 0, 7, '#1d1d28', null);                 // legs
  box(o, x + Math.cos(a) * sw * 0.2, y + Math.sin(a) * sw * 0.2, a, 2.6, 4, 7, 15, shirt, null);   // torso
  box(o, x, y, a, 2.2, 2.2, 15, 19.5, skin, { roof: '#2a1a10' });  // head + hair
  if (weap) { box(o, x + Math.cos(a) * 5, y + Math.sin(a) * 5, a, weap === 3 ? 8 : 4, 1, 10, 12, '#111', null); }
}
function palm3D(p) {
  var o = newObj(p.x, p.y, 40), H = 70 * p.s, R = 22 * p.s, j, top = H;
  box(o, p.x, p.y, 0, 2.5, 2.5, 0, H, '#6b4a2b', null);
  if (C3.z < top + 30 || true) {
    for (j = 0; j < 6; j++) {
      var a = j * PI2 / 6 + p.x, ex = p.x + Math.cos(a) * R, ey = p.y + Math.sin(a) * R;
      var s = projPoly([p.x, p.y, top + 2, p.x + Math.cos(a - 0.35) * R * 0.6, p.y + Math.sin(a - 0.35) * R * 0.6, top + 1, ex, ey, top - 7,
        p.x + Math.cos(a + 0.35) * R * 0.6, p.y + Math.sin(a + 0.35) * R * 0.6, top + 1]);
      if (s) { o.p.push({ s: s, c: shadeCol(rgbOf(p.mangrove ? '#2f5a2a' : '#1f9e57'), 0.8 + (j % 2) * 0.25, o.d) }); }
    }
  }
}

/* ---- sky ---- */
function sky3D() {
  var hz = clamp(C3.hz, -VH, VH * 2), dk = r3night;
  var g = ctx.createLinearGradient ? ctx.createLinearGradient(0, hz - VH * 0.7, 0, hz + 4) : null;
  var top = dk > 0.5 ? '#0a0322' : '#3a1a6e', mid = dk > 0.5 ? '#3a0f4a' : '#ff5fa2', low = dk > 0.5 ? '#7a2a5a' : '#ffb36b';
  if (g) { g.addColorStop(0, top); g.addColorStop(0.65, mid); g.addColorStop(1, low); ctx.fillStyle = g; } else { ctx.fillStyle = mid; }
  ctx.fillRect(0, 0, VW, Math.max(0, hz + 4));
  /* the sun / moon on the horizon, fixed to the west */
  var sp = w2s3(C3.x - 100000, C3.y + 20000, 9000);
  if (sp) { ctx.fillStyle = dk > 0.5 ? 'rgba(230,230,255,0.85)' : 'rgba(255,240,180,0.9)'; ctx.beginPath(); ctx.arc(sp.x, sp.y, VH * 0.06, 0, PI2, false); ctx.fill(); }
  ctx.fillStyle = 'rgb(' + r3fog[0] + ',' + r3fog[1] + ',' + r3fog[2] + ')';
  ctx.fillRect(0, Math.max(0, hz), VW, VH - Math.max(0, hz));
}

/* ---- the frame ---- */
function renderWorld3D() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  camBasis();
  r3night = darkness(); r3sun = 1.12 - r3night * 0.42;
  r3fog = r3night > 0.5 ? [52, 18, 70] : [255, 150, 140];
  r3fog = [Math.round(255 * (1 - r3night) + 40 * r3night), Math.round(150 * (1 - r3night) + 16 * r3night), Math.round(140 * (1 - r3night) + 72 * r3night)];
  sky3D();
  var R = C3.far, x0 = C3.x - R, y0 = C3.y - R, x1 = C3.x + R, y1 = C3.y + R, i, j, e, bx, by;
  /* ---- ground layer ---- */
  gRect(x0 - 200, y0 - 200, x1 + 200, y1 + 200, rgbOf('#0a5a82'), 1);                           // ocean
  gRect(WORLD + ROADH, -ROADH, WORLD + 170, WORLD + ROADH, rgbOf('#e9d29a'), 1);                 // beach sand
  gRect(-ROADH, -ROADH, WORLD + ROADH, WORLD + ROADH, rgbOf('#2a2933'), 1);                      // asphalt
  for (by = Math.max(0, Math.floor(y0 / CELL)); by <= Math.min(NB - 1, Math.floor(y1 / CELL)); by++) {
    for (bx = Math.max(0, Math.floor(x0 / CELL)); bx <= Math.min(NB - 1, Math.floor(x1 / CELL)); bx++) {
      var zc = ZONE_COL[blockZone[by * NB + bx]], qx = bx * CELL + ROADH, qy = by * CELL + ROADH, S = CELL - ROADH * 2;
      gRect(qx, qy, qx + S, qy + S, rgbOf(zc.s), 1);
      gRect(qx + 14, qy + 14, qx + S - 14, qy + S - 14, rgbOf(zc.g), 1);
    }
  }
  /* centre lines (dashed) near the camera */
  var yl = rgbOf('#d8c85a'), k;
  for (k = 0; k <= NB; k++) {
    var rx = k * CELL, ry = k * CELL;
    for (j = 0; j < NB; j++) {
      var a0 = j * CELL + ROADH, a1 = (j + 1) * CELL - ROADH, m;
      if (Math.abs(rx - C3.x) < 900 && Math.abs(j * CELL + 200 - C3.y) < 900) { for (m = a0; m < a1; m += 40) { gRect(rx - 1.5, m, rx + 1.5, m + 20, yl, 1); } }
      if (Math.abs(ry - C3.y) < 900 && Math.abs(j * CELL + 200 - C3.x) < 900) { for (m = a0; m < a1; m += 40) { gRect(m, ry - 1.5, m + 20, ry + 1.5, yl, 1); } }
    }
  }
  for (i = 0; i < ponds.length; i++) {
    e = ponds[i]; if (dist(e.x, e.y, C3.x, C3.y) > R) { continue; }
    var pw = [], q; for (q = 0; q < 10; q++) { pw.push(e.x + Math.cos(q * PI2 / 10) * e.r, e.y + Math.sin(q * PI2 / 10) * e.r, 0); }
    ground(pw, rgbOf('#1d4a4a'), 1);
  }
  for (i = 0; i < scorch.length; i++) { e = scorch[i]; if (dist(e.x, e.y, C3.x, C3.y) < R) { gRect(e.x - e.r * 0.7, e.y - e.r * 0.7, e.x + e.r * 0.7, e.y + e.r * 0.7, [12, 8, 10], 1); } }
  for (i = 0; i < spikes.length; i++) {
    e = spikes[i];
    if (e.horiz) { gRect(e.x - 4, e.y - 36, e.x + 4, e.y + 36, rgbOf('#b0b0b0'), 1, 0.5); } else { gRect(e.x - 36, e.y - 4, e.x + 36, e.y + 4, rgbOf('#b0b0b0'), 1, 0.5); }
  }
  /* ---- solids ---- */
  r3objs.length = 0;
  for (i = 0; i < buildings.length; i++) {
    e = buildings[i];
    var cxb = e.x + e.w / 2, cyb = e.y + e.h / 2;
    if (Math.abs(cxb - C3.x) > R || Math.abs(cyb - C3.y) > R) { continue; }
    toCam(cxb, cyb, 0, tmpC); if (tmpC[2] < -Math.max(e.w, e.h)) { continue; }   // behind the camera
    var bo = newObj(cxb, cyb, Math.min(e.ht, 120) * 0.5);
    box(bo, cxb, cyb, 0, e.w / 2, e.h / 2, 0, e.ht, e.c, { roof: e.roof, neon: e.neon, floors: true });
  }
  for (i = 0; i < palms.length; i++) { e = palms[i]; if (Math.abs(e.x - C3.x) < R * 0.7 && Math.abs(e.y - C3.y) < R * 0.7) { toCam(e.x, e.y, 0, tmpC); if (tmpC[2] > -30) { palm3D(e); } } }
  for (i = 0; i < cars.length; i++) { e = cars[i]; if (Math.abs(e.x - C3.x) < R && Math.abs(e.y - C3.y) < R) { toCam(e.x, e.y, 0, tmpC); if (tmpC[2] > -40) { car3D(e); } } }
  for (i = 0; i < peds.length; i++) { e = peds[i]; if (Math.abs(e.x - C3.x) < 1000 && Math.abs(e.y - C3.y) < 1000) { toCam(e.x, e.y, 0, tmpC); if (tmpC[2] > -20) { ped3D(e.x, e.y, e.a, e.color, e.shirt, e.dead, 0); } } }
  if (!player.car) { ped3D(player.x, player.y, player.a, '#c68642', CHARS[player.ch].color, false, player.weap); }
  for (i in MP.players) {
    if (!MP.players.hasOwnProperty(i)) { continue; }
    e = MP.players[i];
    if (e.car && CAR_TYPES[e.car]) { var T = CAR_TYPES[e.car]; car3D({ x: e.x, y: e.y, a: e.a, w: T.w, h: T.h, type: e.car, color: e.color, z: 0, dead: false, turretA: e.turretA || e.a }); }
    else { ped3D(e.x, e.y, e.a, '#c68642', CHARS[e.ch || 0].color, false, e.weap); }
  }
  for (i = 0; i < pickups.length; i++) { e = pickups[i]; var po = newObj(e.x, e.y, 4); box(po, e.x, e.y, G.t * 2, 6, 4, 2 + Math.sin(G.t * 5 + i) * 2, 7 + Math.sin(G.t * 5 + i) * 2, '#2ee59d', null); }
  if (G.mission) {
    var tg = missionTarget(G.mission.def);
    if (tg) { var mo = newObj(tg.x, tg.y, 60); box(mo, tg.x, tg.y, G.t * 0.8, 22, 22, 0, 160, '#ffe600', { alpha: 0.28 + Math.sin(G.t * 5) * 0.08 }); }
  }
  for (i = 0; i < rockets.length; i++) { e = rockets[i]; var ro = newObj(e.x, e.y, 12); box(ro, e.x, e.y, e.a, 6, 1.6, 10, 13, e.kind === 'shell' ? '#ffe600' : '#dddddd', null); }
  var lim = gfx.low ? 90 : PMAX;
  for (i = 0; i < lim; i++) {
    e = parts[i]; if (!e.on) { continue; }
    var pz = e.type === 3 ? e.z * 0.5 + 2 : (e.type === 1 ? 12 + (e.max - e.life) * 22 : 8 + (e.max - e.life) * 10);
    var sp2 = w2s3(e.x, e.y, pz); if (!sp2) { continue; }
    var f = e.life / e.max, sz = e.type === 0 ? e.size * f : e.size;
    var pob = { d: sp2.d, p: [], circ: { x: sp2.x, y: sp2.y, r: Math.max(0.6, sz * C3.f / sp2.d * 0.7), c: e.c, a: e.type === 1 ? f * 0.55 : (e.type === 4 ? f : Math.min(1, f * 1.5)) } };
    r3objs.push(pob);
  }
  r3objs.sort(function (p, q) { return q.d - p.d; });
  for (i = 0; i < r3objs.length; i++) { drawObj(r3objs[i]); }
  /* tracers on top */
  for (i = 0; i < tracers.length; i++) {
    e = tracers[i]; var t1 = w2s3(e.x1, e.y1, 11), t2 = w2s3(e.x2, e.y2, 11);
    if (t1 && t2) { ctx.strokeStyle = e.c; ctx.globalAlpha = Math.min(1, e.t * 14); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  /* crosshair where the gun points */
  if (!player.car || player.weap > 0) {
    var ax = player.car ? player.car.a : player.aim, cpos = player.car || player;
    var ch = w2s3(cpos.x + Math.cos(ax) * 220, cpos.y + Math.sin(ax) * 220, 12);
    if (ch) { ctx.strokeStyle = 'rgba(255,63,164,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ch.x, ch.y, 7, 0, PI2, false); ctx.moveTo(ch.x - 11, ch.y); ctx.lineTo(ch.x - 4, ch.y); ctx.moveTo(ch.x + 4, ch.y); ctx.lineTo(ch.x + 11, ch.y); ctx.stroke(); }
  }
}
