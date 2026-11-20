/* =====================================================================
   9. TRAFFIC AI (road-graph lane following + flee state)
   ===================================================================== */
function validDirs(ix, iy, from) {
  var out = [], d;
  for (d = 0; d < 4; d++) {
    var tx = ix + DX[d], ty = iy + DY[d];
    if (tx < 0 || ty < 0 || tx > NB || ty > NB) { continue; }
    if (from >= 0 && d === (from + 2) % 4) { continue; }
    out.push(d);
  }
  if (!out.length) { out.push((from + 2) % 4); }
  return out;
}
function routeFrom(c, ix, iy, from) {
  c.nx = ix; c.ny = iy; c.dir = pick(validDirs(ix, iy, from)); c.tnx = ix + DX[c.dir]; c.tny = iy + DY[c.dir];
}
function placeOnRoad(c, ix, iy) {
  routeFrom(c, ix, iy, -1);
  c.x = ix * CELL + (-DY[c.dir]) * 20 + DX[c.dir] * 50; c.y = iy * CELL + DX[c.dir] * 20 + DY[c.dir] * 50; c.a = DANG[c.dir];
}
function seek(c, tx, ty, throttleSpeed) {
  var diff = wrapA(Math.atan2(ty - c.y, tx - c.x) - c.a);
  c.str = clamp(diff * 2.6, -1, 1);
  var want = throttleSpeed * (Math.abs(diff) > 0.6 ? 0.55 : 1);
  c.thr = c.v < want ? 1 : 0;
  return diff;
}
function unstick(c, dt) {
  if (c.revT > 0) { c.revT -= dt; c.thr = -1; c.str = -c.str; return true; }
  if (Math.abs(c.v) < 15 && c.thr > 0) { c.stuckT += dt; } else { c.stuckT = 0; }
  if (c.stuckT > 1.3) { c.stuckT = 0; c.revT = 0.9; c.str = rnd(-1, 1) > 0 ? 1 : -1; }
  return false;
}
function civAI(c, dt) {
  if (c.dead) { return; }
  if (c.mode === 'flee') { c.modeT -= dt; if (c.modeT <= 0) { c.mode = 'cruise'; } }
  var dx = DX[c.dir], dy = DY[c.dir], rx = -dy, ry = dx;
  var tx = c.tnx * CELL + rx * 20, ty = c.tny * CELL + ry * 20;
  /* passed the node along travel axis -> pick next direction at the intersection */
  if ((tx - c.x) * dx + (ty - c.y) * dy < 12) { routeFrom(c, c.tnx, c.tny, c.dir); return; }
  seek(c, tx, ty, c.mode === 'flee' ? 330 : c.cruise);
  if (unstick(c, dt)) { return; }
  if (c.mode !== 'flee') {
    /* brake for cars / player in front */
    var fx = Math.cos(c.a), fy = Math.sin(c.a), i, o;
    for (i = 0; i < cars.length; i++) {
      o = cars[i]; if (o === c) { continue; }
      var ox = o.x - c.x, oy = o.y - c.y, d = Math.abs(ox) + Math.abs(oy);
      if (d < 75 && (ox * fx + oy * fy) > d * 0.6) { c.thr = c.v > 20 ? -1 : 0; break; }
    }
    if (!player.car) { var px = player.x - c.x, py = player.y - c.y, pd = Math.abs(px) + Math.abs(py); if (pd < 60 && (px * fx + py * fy) > pd * 0.6) { c.thr = c.v > 10 ? -1 : 0; } }
  }
}

