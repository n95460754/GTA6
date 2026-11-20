/* =====================================================================
   8. COMBAT: HITSCAN, PROJECTILES, EXPLOSIONS
   ===================================================================== */
/* Analytic ray vs circle tests against cars, peds and player; buildings by ray march. */
function hitscan(x, y, ang, range, dmg, owner, ownerCar, color) {
  var cx = Math.cos(ang), cy = Math.sin(ang), bestT = range * rayFrac(x, y, x + cx * range, y + cy * range);
  var best = null, kind = '', i, e, t, px, py, r;
  for (i = 0; i < cars.length; i++) {
    e = cars[i]; if (e === ownerCar) { continue; }
    px = e.x - x; py = e.y - y; t = px * cx + py * cy; if (t < 0 || t > bestT) { continue; }
    r = e.r; if (Math.abs(px * cy - py * cx) < r) { bestT = t; best = e; kind = 'car'; }
  }
  for (i = 0; i < peds.length; i++) {
    e = peds[i]; if (e.dead) { continue; }
    px = e.x - x; py = e.y - y; t = px * cx + py * cy; if (t < 0 || t > bestT) { continue; }
    if (Math.abs(px * cy - py * cx) < 9) { bestT = t; best = e; kind = 'ped'; }
  }
  if (owner !== 'player' && !player.car) {
    px = player.x - x; py = player.y - y; t = px * cx + py * cy;
    if (t > 0 && t < bestT && Math.abs(px * cy - py * cx) < 10) { bestT = t; best = player; kind = 'player'; }
  }
  if (owner === 'player' && MP.on) {          /* PvP: remote players on the ray */
    var mt = mpRayHit(x, y, cx, cy, bestT, dmg);
    if (mt >= 0) { bestT = mt; best = null; kind = 'net'; }
  }
  var ex = x + cx * bestT, ey = y + cy * bestT;
  if (owner === 'player') { mpEmit({ t: 'shot', x1: Math.round(x), y1: Math.round(y), x2: Math.round(ex), y2: Math.round(ey) }); }
  if (tracers.length < 40) { tracers.push({ x1: x, y1: y, x2: ex, y2: ey, t: 0.07, c: color || '#ffe600' }); }
  if (kind === 'car') { best.damage(dmg * 0.6, owner); sparks(ex, ey, 3); if (best.ai === 'civ') { fleeCar(best, x, y); } if (best === player.car) { hurtPlayer(dmg * 0.15); } }
  else if (kind === 'ped') { best.hp -= dmg; if (best.hp <= 0) { best.kill(owner, ang); } else { best.state = 'flee'; best.t = 6; best.fx = x; best.fy = y; } }
  else if (kind === 'player') { hurtPlayer(dmg); addP(ex, ey, 0, 0, 0.3, 4, '#c8102e', 0); }
  else if (bestT < range) { sparks(ex, ey, 2); }
  noise(x, y, 450);
  if (owner === 'player') { crime(1); }
}
function fireRocket(x, y, a, owner, ownerCar, kind) {
  if (rockets.length >= 16) { return; }
  rockets.push({ x: x, y: y, a: a, v: kind === 'shell' ? 650 : 520, t: 0, owner: owner, car: ownerCar, kind: kind });
}
function explode(x, y, owner) {
  var R = 150, i, e, d, f;
  if (owner === 'player') { mpEmit({ t: 'boom', x: Math.round(x), y: Math.round(y) }); }
  for (i = 0; i < cars.length; i++) {
    e = cars[i]; d = dist(x, y, e.x, e.y);
    if (d < R) {
      f = 1 - d / R;
      e.damage(150 * f / (e.type === 'tank' ? 4 : 1), owner);
      e.vz += 300 * f / Math.sqrt(e.mass); e.z = Math.max(e.z, 1);
      e.spin += rnd(-5, 5) * f; e.v *= 0.4;
      if (d > 1) { e.x += (e.x - x) / d * 18 * f; e.y += (e.y - y) / d * 18 * f; }
    }
  }
  for (i = 0; i < peds.length; i++) {
    e = peds[i]; if (e.dead) { continue; } d = dist(x, y, e.x, e.y);
    if (d < R * 0.8) { e.kill(owner, Math.atan2(e.y - y, e.x - x)); }
    else if (d < 500) { e.state = 'flee'; e.t = 7; e.fx = x; e.fy = y; }
  }
  d = dist(x, y, player.x, player.y);
  if (d < R) { hurtPlayer(player.car ? 25 * (1 - d / R) : 95 * (1 - d / R)); }
  var nf = gfx.low ? 6 : 18, ns = gfx.low ? 3 : 10;
  for (i = 0; i < nf; i++) { var a = rnd(0, PI2), s = rnd(40, 260); addP(x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.3, 0.9), rnd(6, 14), pick(['#ffe600', '#ff8a1f', '#ff3b1f', '#ffffff']), 0); }
  for (i = 0; i < ns; i++) { addP(x + rnd(-30, 30), y + rnd(-30, 30), rnd(-30, 30), rnd(-40, 10), rnd(1.2, 2.4), rnd(10, 22), '#3a3344', 1); }
  debris(x, y, gfx.low ? 3 : 8, '#555');
  addP(x, y, 0, 0, 0.15, 90, '#fff6c0', 4);
  scorch.push({ x: x, y: y, r: rnd(45, 65) }); if (scorch.length > 40) { scorch.shift(); }
  G.shake = Math.min(1, G.shake + 0.6);
  noise(x, y, 650);
  if (owner === 'player') { crime(15); feedTrigger('EXPLOSION'); G.score += 25; }
}
function hurtPlayer(d) {
  if (G.over > 0) { return; }
  var ab = Math.min(player.armor, d * 0.7);
  player.armor -= ab; player.hp -= (d - ab);
  if (player.hp <= 0) { player.hp = 0; die(); }
}
/* Gunshots / explosions make traffic flee and pedestrians scatter. */
function noise(x, y, r) {
  var i, e;
  for (i = 0; i < cars.length; i++) { e = cars[i]; if (e.ai === 'civ' && dist(x, y, e.x, e.y) < r) { fleeCar(e, x, y); } }
  for (i = 0; i < peds.length; i++) { e = peds[i]; if (!e.dead && dist(x, y, e.x, e.y) < r * 0.8) { e.state = 'flee'; e.t = 6; e.fx = x; e.fy = y; } }
}
function fleeCar(c, x, y) { c.mode = 'flee'; c.modeT = 7; }

/* Player weapon fire */
function playerFire(pressed) {
  if (player.fireCd > 0 || G.over > 0) { return; }
  var c = player.car, w = WEAPONS[player.weap], x, y, a = player.aim;
  if (c && c.type === 'tank') {
    if (!pressed) { return; }
    var ta = c.turretA; fireRocket(c.x + Math.cos(ta) * 44, c.y + Math.sin(ta) * 44, ta, 'player', c, 'shell');
    player.fireCd = 0.9; addP(c.x + Math.cos(ta) * 46, c.y + Math.sin(ta) * 46, 0, 0, 0.08, 18, '#fff6c0', 4); return;
  }
  if (!w.auto && !pressed) { return; }
  if (player.weap > 0 && player.ammo[player.weap] <= 0) { notify('SYSTEM', 'Out of ammo. Press Q for the weapon wheel.', '#ffe600'); player.fireCd = 0.6; return; }
  if (c) { a = c.a; x = c.x + Math.cos(a) * (c.w * 0.6); y = c.y + Math.sin(a) * (c.w * 0.6); if (player.weap === 0) { return; } }
  else { x = player.x + Math.cos(a) * 10; y = player.y + Math.sin(a) * 10; player.a = a; }
  player.fireCd = w.cd;
  var mul = player.ch === 1 ? 1.25 : 1;
  if (player.weap === 0) {          /* MELEE: short collision check + pushback, no ammo */
    player.punchT = 0.15;
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i]; if (p.dead) { continue; }
      if (dist(x, y, p.x, p.y) < w.range) {
        p.hp -= w.dmg * mul; p.x += Math.cos(a) * 14; p.y += Math.sin(a) * 14;
        if (p.hp <= 0) { p.kill('player', a); } else { p.state = 'flee'; p.t = 5; p.fx = x; p.fy = y; crime(2); }
        break;
      }
    }
    return;
  }
  player.ammo[player.weap]--;
  if (player.weap === 3) {          /* RPG: physical projectile */
    fireRocket(x, y, a, 'player', c, 'rpg'); addP(x, y, 0, 0, 0.08, 16, '#fff6c0', 4); return;
  }
  /* PISTOL (precise laser trace) / SMG (spread) */
  addP(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 0, 0, 0.05, player.weap === 1 ? 9 : 7, '#fff6c0', 4);
  hitscan(x, y, a + rnd(-w.spread, w.spread), w.range, w.dmg * mul, 'player', c, player.weap === 1 ? '#ff3fa4' : '#ffe600');
}

