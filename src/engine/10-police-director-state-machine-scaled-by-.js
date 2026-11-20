/* =====================================================================
   10. POLICE DIRECTOR (state machine scaled by heat index)
   ===================================================================== */
function playerPos() {
  var c = player.car;
  if (c) { return { x: c.x, y: c.y, vx: Math.cos(c.a) * c.v, vy: Math.sin(c.a) * c.v, a: c.a }; }
  return { x: player.x, y: player.y, vx: player.vx, vy: player.vy, a: player.a };
}
/* Cognitive pathing: if a building blocks the direct line, route through
   the road grid one intersection at a time toward the target. */
function navTarget(c, tx, ty) {
  if (los(c.x, c.y, tx, ty)) { c.wpx = -1; return { x: tx, y: ty }; }
  if (c.wpx < 0 || dist(c.x, c.y, c.wpx * CELL, c.wpy * CELL) < 45) {
    var ix = clamp(Math.round(c.x / CELL), 0, NB), iy = clamp(Math.round(c.y / CELL), 0, NB);
    var gx = tx - ix * CELL, gy = ty - iy * CELL;
    if (dist(c.x, c.y, ix * CELL, iy * CELL) > 60) { c.wpx = ix; c.wpy = iy; }
    else if (Math.abs(gx) > Math.abs(gy)) { c.wpx = clamp(ix + (gx > 0 ? 1 : -1), 0, NB); c.wpy = iy; }
    else { c.wpx = ix; c.wpy = clamp(iy + (gy > 0 ? 1 : -1), 0, NB); }
  }
  return { x: c.wpx * CELL, y: c.wpy * CELL };
}
function policeAI(c, dt) {
  if (c.dead) { return; }
  var P = playerPos(), d = dist(c.x, c.y, P.x, P.y), tx = P.x, ty = P.y, speed = c.T.max, t, side;
  if (G.wanted === 0) { c.ai = 'civ'; c.mode = 'cruise'; routeFrom(c, clamp(Math.round(c.x / CELL), 0, NB), clamp(Math.round(c.y / CELL), 0, NB), -1); return; }
  if (c.role === 'cop') {
    if (G.wanted === 1) {                      /* 1 star: tail at a safe distance, no shooting */
      speed = d > 280 ? c.T.max * 0.8 : (d < 170 ? 0 : Math.max(60, Math.sqrt(P.vx * P.vx + P.vy * P.vy)));
    } else if (c.slot < 3) {                   /* 2+ stars: boxing formation ahead / left / right */
      side = [0, -1, 1][c.slot];
      tx = P.x + Math.cos(P.a) * (side === 0 ? 120 : 30) + Math.cos(P.a + PI / 2) * side * 70;
      ty = P.y + Math.sin(P.a) * (side === 0 ? 120 : 30) + Math.sin(P.a + PI / 2) * side * 70;
      if (d > 300) { tx = P.x; ty = P.y; }
    }
    if (G.wanted >= 3) {                       /* 3+ stars: shooting intervals */
      c.fireCd -= dt;
      if (c.fireCd <= 0 && d < 420 && los(c.x, c.y, P.x, P.y)) {
        c.fireCd = rnd(0.9, 1.6);
        hitscan(c.x, c.y, Math.atan2(P.y - c.y, P.x - c.x) + rnd(-0.12, 0.12), 460, 6, 'police', c, '#3ff6ff');
      }
    }
  } else if (c.role === 'fbi') {               /* 4 stars: heavy ramming with intercept prediction */
    tx = P.x + P.vx * 0.5; ty = P.y + P.vy * 0.5; c.accelMul = 1.3;
  } else if (c.role === 'tank') {              /* 5 stars: blockade ring + shells */
    var ang = c.slot * PI + G.t * 0.05;
    tx = P.x + Math.cos(ang) * 320; ty = P.y + Math.sin(ang) * 320;
    if (dist(c.x, c.y, tx, ty) < 70) { speed = 0; }
    var want = Math.atan2(P.y - c.y, P.x - c.x), td = wrapA(want - c.turretA);
    c.turretA = wrapA(c.turretA + clamp(td, -1.4 * dt, 1.4 * dt));
    c.fireCd -= dt;
    if (c.fireCd <= 0 && d < 520 && Math.abs(td) < 0.15 && los(c.x, c.y, P.x, P.y)) {
      c.fireCd = 3.2; fireRocket(c.x + Math.cos(c.turretA) * 44, c.y + Math.sin(c.turretA) * 44, c.turretA, 'police', c, 'shell');
    }
  }
  t = navTarget(c, tx, ty);
  seek(c, t.x, t.y, speed);
  if (speed === 0 && c.v > 5) { c.thr = -1; }
  unstick(c, dt);
}
function spawnPolice(role, slot) {
  var P = playerPos(), tries, a, x, y;
  for (tries = 0; tries < 8; tries++) {
    a = rnd(0, PI2); x = P.x + Math.cos(a) * rnd(700, 950); y = P.y + Math.sin(a) * rnd(700, 950);
    x = clamp(x, 0, WORLD); y = clamp(y, 0, WORLD);
    /* snap onto the nearest road line */
    if (Math.abs(x - Math.round(x / CELL) * CELL) < Math.abs(y - Math.round(y / CELL) * CELL)) { x = Math.round(x / CELL) * CELL; }
    else { y = Math.round(y / CELL) * CELL; }
    if (!inBuilding(x, y)) { break; }
  }
  var c = new Car(role === 'cop' ? 'police' : role, x, y, Math.atan2(P.y - y, P.x - x));
  c.ai = 'police'; c.role = role; c.slot = slot; c.turretA = c.a;
  cars.push(c);
}
function policeDirector(dt) {
  var P = playerPos(), i, c, counts = { cop: 0, fbi: 0, tank: 0 }, seen = false;
  for (i = cars.length - 1; i >= 0; i--) {
    c = cars[i];
    if (!c.role || c === player.car) { continue; }
    var d = dist(c.x, c.y, P.x, P.y);
    if (c.dead && c.deadT > 25 || d > 1900) { cars.splice(i, 1); continue; }
    if (c.dead || c.ai !== 'police') { continue; }
    counts[c.role]++;
    if (d < 750 && los(c.x, c.y, P.x, P.y)) { seen = true; }
    /* BUSTED check: cop parked next to a slow player */
    if (d < 75 && Math.abs(c.v) < 50 && (!player.car || Math.abs(player.car.v) < 20)) { G.bustT += dt; }
  }
  if (G.wanted === 0) { G.bustT = 0; return; }
  if (seen) { G.lastSeen = G.t; }
  G.bustT = Math.max(0, G.bustT - dt * 0.5);
  if (G.bustT > (player.ch === 0 ? 3.5 : 2.5)) { busted(); return; }
  /* heat decay when out of sight */
  var evade = player.ch === 0 ? 8 : 12;
  if (G.t - G.lastSeen > evade) {
    setWanted(G.wanted - 1); G.heat = STAR_AT[G.wanted];
    notify('SCANNER', G.wanted ? 'Units losing visual. Heat dropping.' : 'All units stand down. You are clear.', '#3ff6ff');
    if (G.wanted === 0) { return; }
  }
  /* deploy units according to the star table */
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = 1.1;
    if (counts.cop < DEPLOY.cops[G.wanted]) { spawnPolice('cop', counts.cop); }
    else if (counts.fbi < DEPLOY.fbi[G.wanted]) { spawnPolice('fbi', counts.fbi); }
    else if (counts.tank < DEPLOY.tanks[G.wanted]) { spawnPolice('tank', counts.tank); }
  }
  /* 3+ stars: spike strips on road tiles ahead of a driving player */
  G.spikeT -= dt;
  if (G.wanted >= 3 && player.car && G.spikeT <= 0) {
    G.spikeT = rnd(7, 11);
    var sx = P.x + Math.cos(P.a) * 280, sy = P.y + Math.sin(P.a) * 280;
    if (isRoad(sx, sy) && !inBuilding(sx, sy)) {
      var horiz = Math.abs(Math.cos(P.a)) > Math.abs(Math.sin(P.a));
      spikes.push({ x: sx, y: sy, horiz: horiz, t: 22 }); if (spikes.length > 6) { spikes.shift(); }
      notify('SCANNER', 'Spike strip deployed ahead!', '#3ff6ff');
    }
  }
}

