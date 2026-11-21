/* =====================================================================
   15. UPDATE LOOP
   ===================================================================== */
var cam = { x: player.x, y: player.y, zoom: 1, lx: 0, ly: 0 };
function screenToWorld(x, y) { return { x: (x - VW / 2) / cam.zoom + cam.x, y: (y - VH / 2) / cam.zoom + cam.y }; }

function readInput() {
  var ts = usingTouch ? touchState() : null;
  var I = {
    /* in 3D the arrow keys look around; WASD moves */
    up: keys[87] || (!gfx.p3d && keys[38]), down: keys[83] || (!gfx.p3d && keys[40]),
    left: keys[65] || (!gfx.p3d && keys[37]), right: keys[68] || (!gfx.p3d && keys[39]),
    fire: keys[74] || keys[17] || mouse.down, fireHit: keysHit[74] || keysHit[17] || mouse.hit,
    hb: keys[32], sprint: keys[16], act: keysHit[69] || keysHit[70] || touchHits.act
  };
  if (ts) {
    I.up = I.up || ts.up || ts.gas; I.down = I.down || ts.down || ts.brake; I.left = I.left || ts.left; I.right = I.right || ts.right;
    I.fire = I.fire || ts.fire; I.fireHit = I.fireHit || ts.fireHit; I.hb = I.hb || (ts.brake && ts.gas);
  }
  return applyGamepad(I);
}
function handleHotkeys() {
  if (keysHit[81]) { if (G.wheel) { selectWeapon(G.wheelSel); G.wheel = false; } else { G.wheel = true; G.wheelSel = player.weap; } }
  if (keysHit[80]) { togglePhone(); }
  if (keysHit[67]) { switchChar(); }
  if (keysHit[71]) { cycleGfx(); }
  if (keysHit[27]) { G.phone = false; G.wheel = false; G.pad = false; }
  for (var i = 0; i < 4; i++) {
    if (keysHit[49 + i]) { if (G.phone) { phoneKey(i); } else if (G.wheel) { G.wheelSel = i; } else { selectWeapon(i); } }
  }
  if (G.wheel) { if (keysHit[38] || keysHit[87]) { G.wheelSel = 0; } if (keysHit[39] || keysHit[68]) { G.wheelSel = 1; } if (keysHit[40] || keysHit[83]) { G.wheelSel = 2; } if (keysHit[37] || keysHit[65]) { G.wheelSel = 3; } }
}

function updatePlayer(dt, I) {
  var c = player.car;
  if (player.fireCd > 0) { player.fireCd -= dt; }
  if (player.punchT > 0) { player.punchT -= dt; }
  /* aim: mouse on desktop, facing direction on touch */
  var mouseAim = !gfx.p3d && !usingTouch && (G.t - mouse.moved < 4) && !(G.t - pad.aimT < 3);
  var stickAim = !gfx.p3d && G.t - pad.aimT < 3;
  var mw = screenToWorld(mouse.x, mouse.y), ox = c ? c.x : player.x, oy = c ? c.y : player.y;
  if (I.act && !G.wheel) { if (c) { exitCar(); } else { enterCar(); } c = player.car; }
  if (c) {
    c.thr = I.up ? 1 : (I.down ? -1 : 0);
    /* steering ramps in/out instead of snapping -> smooth arcs on keyboard & touch */
    var wantStr = I.padSteer ? clamp(I.padSteer * 1.2, -1, 1) : ((I.right ? 1 : 0) - (I.left ? 1 : 0));
    if (I.padGas > 0.15 || I.padBrake > 0.15) { c.thr = I.padGas > 0.15 ? I.padGas : -I.padBrake; }
    c.str += (wantStr - c.str) * (1 - Math.exp(-dt * (wantStr === 0 ? 14 : 9)));
    c.hb = !!I.hb;
    if (c.type === 'tank') {
      var want = gfx.p3d ? C3.yaw : (stickAim ? Math.atan2(pad.aimY, pad.aimX) : (mouseAim ? Math.atan2(mw.y - oy, mw.x - ox) : c.a));
      c.turretA = wrapA(c.turretA + clamp(wrapA(want - c.turretA), -2.5 * dt, 2.5 * dt));
    }
    player.x = c.x; player.y = c.y; player.aim = c.a;
    /* spike strips */
    for (var s = 0; s < spikes.length; s++) {
      if (!c.popped && dist(c.x, c.y, spikes[s].x, spikes[s].y) < 34) { c.popped = true; flash('TIRES SHREDDED', 'Steal another ride!'); sparks(c.x, c.y, 10); }
    }
    if (c.dead && c.burnT > 0 && c.burnT < 1.2) { notify('DEX', 'Car is on fire! GET OUT!'); }
  } else {
    var mx = (I.right ? 1 : 0) - (I.left ? 1 : 0), my = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    var sp = I.sprint ? 210 : 135;
    if (I.padMoveX || I.padMoveY) { mx = I.padMoveX; my = I.padMoveY; sp *= Math.min(1, Math.sqrt(mx * mx + my * my)); }
    if (gfx.p3d) {
      /* 3D chase camera: left/right turn the hero, up/down walk along the view */
      var turn = mx + (G.t - pad.aimT < 0.2 ? pad.aimX : 0);
      player.a = wrapA(player.a + turn * 3.0 * dt);
      var fwd = -my, kv = 1 - Math.exp(-dt * 14);
      player.vx += (Math.cos(player.a) * fwd * sp * (fwd < 0 ? 0.6 : 1) - player.vx) * kv;
      player.vy += (Math.sin(player.a) * fwd * sp * (fwd < 0 ? 0.6 : 1) - player.vy) * kv;
      mx = 0; my = 0;
    } else if (mx || my) {
      var l = Math.sqrt(mx * mx + my * my), ka = 1 - Math.exp(-dt * 14);
      player.vx += (mx / l * sp - player.vx) * ka; player.vy += (my / l * sp - player.vy) * ka;
      player.a += wrapA(Math.atan2(my, mx) - player.a) * Math.min(1, dt * 16);
    } else { var kd = 1 - Math.exp(-dt * 18); player.vx -= player.vx * kd; player.vy -= player.vy * kd; }
    if (gfx.p3d && !(I.up || I.down || I.padMoveY)) { var kd3 = 1 - Math.exp(-dt * 18); player.vx -= player.vx * kd3; player.vy -= player.vy * kd3; }
    player.x += player.vx * dt; player.y += player.vy * dt;
    pushOut(player, 8, 0);
    player.aim = stickAim ? Math.atan2(pad.aimY, pad.aimX) : (mouseAim ? Math.atan2(mw.y - player.y, mw.x - player.x) : player.a);
    if (mouseAim || stickAim) { player.a = player.aim; }
    if (gfx.p3d) { player.aim = wrapA(player.a + C3.look); }        /* shoot where the camera looks */
  }
  if (!G.phone || usingTouch) { if ((I.fire || I.fireHit) && !G.wheel) { playerFire(I.fireHit); } }
  /* cash pickups */
  for (var i = pickups.length - 1; i >= 0; i--) {
    var p = pickups[i]; p.t += dt;
    if (dist(p.x, p.y, player.x, player.y) < (c ? 30 : 18)) { G.cash += p.amt; addP(p.x, p.y, 0, -40, 0.6, 3, '#2ee59d', 0); pickups.splice(i, 1); }
    else if (p.t > 60) { pickups.splice(i, 1); }
  }
}

function collideCars(dt) {
  var i, j, a, b, n = cars.length;
  for (i = 0; i < n; i++) {
    a = cars[i];
    for (j = i + 1; j < n; j++) {
      b = cars[j];
      var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr || Math.abs(a.z - b.z) > 30) { continue; }
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d >= rr || d < 0.001) { continue; }
      var nx = dx / d, ny = dy / d, over = rr - d, tm = a.mass + b.mass;
      a.x -= nx * over * (b.mass / tm); a.y -= ny * over * (b.mass / tm);
      b.x += nx * over * (a.mass / tm); b.y += ny * over * (a.mass / tm);
      var avx = Math.cos(a.a) * a.v, avy = Math.sin(a.a) * a.v, bvx = Math.cos(b.a) * b.v, bvy = Math.sin(b.a) * b.v;
      var rel = (avx - bvx) * nx + (avy - bvy) * ny;
      if (rel <= 0) { continue; }
      var imp = 1.6 * rel / tm;
      avx -= imp * b.mass * nx; avy -= imp * b.mass * ny; bvx += imp * a.mass * nx; bvy += imp * a.mass * ny;
      a.v = avx * Math.cos(a.a) + avy * Math.sin(a.a); b.v = bvx * Math.cos(b.a) + bvy * Math.sin(b.a);
      a.spin += (Math.random() - 0.5) * rel * 0.02 * b.mass / a.mass; b.spin += (Math.random() - 0.5) * rel * 0.02 * a.mass / b.mass;
      if (rel > 70) {
        var pa = a === player.car ? 'player' : null, pb = b === player.car ? 'player' : null;
        a.damage(rel * 0.06 * b.mass / a.mass, pb); b.damage(rel * 0.06 * a.mass / b.mass, pa);
        sparks((a.x + b.x) / 2, (a.y + b.y) / 2, 5);
        if (a.ai === 'civ') { fleeCar(a); } if (b.ai === 'civ') { fleeCar(b); }
        if ((a === player.car || b === player.car) && (a.role === 'fbi' || b.role === 'fbi')) { G.shake = Math.min(1, G.shake + 0.3); }
      }
    }
  }
  /* cars vs pedestrians and player on foot */
  for (i = 0; i < n; i++) {
    a = cars[i]; var sp = Math.abs(a.v);
    if (sp < 45 || a.z > 20) { continue; }
    for (j = 0; j < peds.length; j++) {
      b = peds[j]; if (b.dead) { continue; }
      if (Math.abs(b.x - a.x) < a.r + 8 && Math.abs(b.y - a.y) < a.r + 8 && dist(a.x, a.y, b.x, b.y) < a.r + 6) {
        b.kill(a === player.car ? 'player' : null, a.a); a.v *= 0.85;
      }
    }
    if (!player.car && a.ai !== 'player' && dist(a.x, a.y, player.x, player.y) < a.r + 8) {
      hurtPlayer(sp * 0.07); player.x += Math.cos(a.a) * 20; player.y += Math.sin(a.a) * 20; a.v *= 0.5;
    }
  }
}

function updateRockets(dt) {
  for (var i = rockets.length - 1; i >= 0; i--) {
    var r = rockets[i], boom = false, j;
    r.t += dt; r.x += Math.cos(r.a) * r.v * dt; r.y += Math.sin(r.a) * r.v * dt;
    if (Math.random() < (gfx.low ? 0.3 : 0.8)) { addP(r.x, r.y, rnd(-10, 10), rnd(-10, 10), rnd(0.4, 0.9), rnd(3, 6), '#9a93a8', 1); }
    if (r.t > 2.4 || inBuilding(r.x, r.y) || r.x < -50 || r.y < -50 || r.x > WORLD + 50 || r.y > WORLD + 50) { boom = true; }
    for (j = 0; j < cars.length && !boom; j++) { if (cars[j] !== r.car && dist(r.x, r.y, cars[j].x, cars[j].y) < cars[j].r + 4) { boom = true; } }
    for (j = 0; j < peds.length && !boom; j++) { if (!peds[j].dead && dist(r.x, r.y, peds[j].x, peds[j].y) < 10) { boom = true; } }
    if (!boom && r.owner !== 'player' && !player.car && dist(r.x, r.y, player.x, player.y) < 14) { boom = true; }
    if (!boom && r.owner === 'player' && mpNearRemote(r.x, r.y, 18)) { boom = true; }
    if (boom) { rockets.splice(i, 1); explode(r.x, r.y, r.owner); }
  }
}
function updateParticles(dt) {
  var lim = gfx.low ? 90 : PMAX, i, p;
  for (i = 0; i < lim; i++) {
    p = parts[i]; if (!p.on) { continue; }
    p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 3) {      /* debris obeys global gravity (LOWGRAVITY floats it) */
      p.vz -= GRAVITY * G.gravMul * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.4; p.vx *= 0.6; p.vy *= 0.6; }
      p.life += dt * (G.gravMul < 1 ? 0.7 : 0);
    } else if (p.type === 1) { p.size += dt * 14; p.vx *= 0.98; p.vy *= 0.98; }
    else { p.vx *= 0.92; p.vy *= 0.92; }
  }
  for (i = tracers.length - 1; i >= 0; i--) { tracers[i].t -= dt; if (tracers[i].t <= 0) { tracers.splice(i, 1); } }
  for (i = spikes.length - 1; i >= 0; i--) { spikes[i].t -= dt; if (spikes[i].t <= 0) { spikes.splice(i, 1); } }
}
function updateUI(dt) {
  var i;
  for (i = toasts.length - 1; i >= 0; i--) { toasts[i].t -= dt; if (toasts[i].t <= 0) { toasts.splice(i, 1); } }
  if (flashMsg.t > 0) { flashMsg.t -= dt; }
  if (feed.cd > 0) { feed.cd -= dt; }
  if (feed.t > 0) {
    feed.t -= dt; feed.lineT -= dt; feed.viewers += Math.floor(rnd(0, 120) * (1 + G.wanted));
    if (feed.lineT <= 0) { feed.lineT = rnd(0.5, 1.1); feed.lines.push(pick(FEED_LINES)); if (feed.lines.length > 5) { feed.lines.shift(); } }
  } else if (G.wanted >= 3 && Math.random() < dt * 0.05) { feedTrigger('PURSUIT'); }
  G.chatterT -= dt;
  if (G.chatterT <= 0) { G.chatterT = rnd(45, 80); var c = pick(CHATTER); notify(c[0], c[1]); }
  if (G.hintT > 0) { G.hintT -= dt; }
}

function update(rdt) {
  pollGamepad();
  /* keyboard look: arrow keys orbit the 3D camera */
  if (gfx.p3d && !G.wheel && !G.console && (keys[37] || keys[39] || keys[38] || keys[40])) {
    lookDrag(((keys[39] ? 1 : 0) - (keys[37] ? 1 : 0)) * 240 * rdt, ((keys[40] ? 1 : 0) - (keys[38] ? 1 : 0)) * 160 * rdt);
  }
  var I = readInput(), dt = rdt * G.timeScale, i;
  handleHotkeys();
  G.timeScale = G.wheel ? 0.2 : 1;            /* weapon wheel slows time by 80% */
  if (G.over > 0) {
    G.over -= rdt;
    if (G.over <= 0 && G.overAction) { G.overAction(); G.overAction = null; }
    I = { up: false, down: false, left: false, right: false, fire: false, fireHit: false, hb: false, act: false };
  }
  G.t += dt;
  G.tod = (G.tod + dt / 480) % 1;
  G.shake = Math.max(0, G.shake - rdt * 1.5);
  if (G.over <= 0) { updatePlayer(dt, I); }
  for (i = 0; i < cars.length; i++) {
    var c = cars[i];
    if (c.ai === 'civ') { civAI(c, dt); } else if (c.ai === 'police') { policeAI(c, dt); }
    else if (c.ai === 'none') { c.thr = 0; c.str = 0; c.hb = true; }
    c.drive(dt);
  }
  if (player.car) { player.x = player.car.x; player.y = player.car.y; }
  collideCars(dt);
  for (i = 0; i < peds.length; i++) { peds[i].update(dt); }
  updateRockets(dt); updateParticles(dt);
  mpUpdate(rdt);
  policeDirector(dt); population(dt); missionUpdate(dt); heistUpdate(dt); updateUI(rdt);
  keysHit = {}; touchHits = {}; mouse.hit = false;
}

