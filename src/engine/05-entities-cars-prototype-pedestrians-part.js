/* =====================================================================
   5. ENTITIES: CARS (prototype), PEDESTRIANS, PARTICLES
   ===================================================================== */
function Car(type, x, y, a) {
  var T = CAR_TYPES[type];
  this.type = type; this.T = T; this.x = x; this.y = y; this.a = a || 0; this.v = 0;
  this.z = 0; this.vz = 0; this.spin = 0; this.hp = T.hp; this.w = T.w; this.h = T.h;
  this.r = (T.w + T.h) / 4; this.mass = T.mass; this.accelMul = 1; this.maxMul = 1; this.popped = false;
  this.color = T.colors[Math.floor(Math.random() * T.colors.length)];
  this.ai = 'civ'; this.role = ''; this.slot = 0; this.mode = 'cruise'; this.modeT = 0; this.cruise = rnd(120, 175);
  this.dir = 0; this.nx = 0; this.ny = 0; this.tnx = 0; this.tny = 0; this.wpx = -1; this.wpy = -1;
  this.thr = 0; this.str = 0; this.hb = false; this.stuckT = 0; this.revT = 0;
  this.fireCd = rnd(0.8, 2); this.turretA = this.a; this.burnT = -1; this.dead = false; this.deadT = 0;
}
/* Arcade vehicle physics with sub-stepping for fast (TURBO) cars. */
Car.prototype.drive = function (dt) {
  var T = this.T, perk = (this === player.car && player.ch === 1) ? 1.15 : 1;
  var acc = T.accel * this.accelMul * perk, max = T.max * this.maxMul * (this.popped ? 0.45 : 1) * perk;
  var grounded = this.z < 2;
  if (this.dead) { this.thr = 0; this.str = 0; }
  if (grounded) {
    if (this.thr > 0) { this.v += acc * this.thr * dt; }
    else if (this.thr < 0) { if (this.v > 0) { this.v -= T.brake * dt; } else { this.v -= acc * 0.6 * dt; } }
    var drag = this.hb ? 2.0 : 0.55; if (this.thr === 0) { drag += 0.9; }
    if (inPond(this.x, this.y)) { drag += 2.5; }
    this.v -= this.v * drag * dt;
  }
  if (this.v > max) { this.v = max; } if (this.v < -max * 0.4) { this.v = -max * 0.4; }
  var grip = clamp(Math.abs(this.v) / 90, 0, 1) * (this.v < 0 ? -1 : 1);
  if (grounded) { this.a += this.str * T.turn * perk * (this.hb ? 1.5 : 1) * grip * dt; }
  this.a = wrapA(this.a + this.spin * dt);
  this.spin -= this.spin * 2.5 * dt;
  /* sub-steps keep 4x TURBO cars from tunnelling through walls */
  var steps = Math.max(1, Math.ceil(Math.abs(this.v) * dt / 12)), s, sdt = dt / steps, vb = this.v;
  for (s = 0; s < steps; s++) {
    this.x += Math.cos(this.a) * this.v * sdt;
    this.y += Math.sin(this.a) * this.v * sdt;
    if (pushOut(this, this.r, this.z)) {
      if (Math.abs(vb) > 90) { this.damage(Math.abs(vb) * 0.05, null); sparks(this.x, this.y, 4); }
      this.v = -this.v * 0.25; break;
    }
  }
  /* vertical (air time after explosions / ramps). Uses global gravity multiplier. */
  if (this.z > 0 || this.vz !== 0) {
    this.vz -= GRAVITY * G.gravMul * dt; this.z += this.vz * dt;
    if (this.z <= 0) {
      this.z = 0;
      if (this.vz < -150) { this.vz = -this.vz * 0.35; this.damage(6, null); debris(this.x, this.y, 4, this.color); }
      else { this.vz = 0; }
    }
  }
  /* burning wreck countdown -> explosion */
  if (this.burnT > 0) {
    this.burnT -= dt;
    if (Math.random() < 0.6) { addP(this.x + rnd(-8, 8), this.y + rnd(-6, 6), rnd(-20, 20), rnd(-30, -5), rnd(0.3, 0.7), rnd(4, 8), pick(['#ff8a1f', '#ffe600', '#ff3b1f']), 0); }
    if (this.burnT <= 0) { this.burnT = -1; explode(this.x, this.y, this.killer || null); }
  }
  if (this.dead) { this.deadT += dt; }
};
Car.prototype.damage = function (d, by) {
  if (this.dead) { return; }
  this.hp -= d;
  if (by === 'player' && this.role) { crime(3); }
  if (this.hp <= 0) {
    this.hp = 0; this.dead = true; this.burnT = 2.2; this.killer = by;
    if (by === 'player') { crime(this.role ? 25 : 10); G.score += 50; }
  }
};

function Ped(x, y) {
  this.x = x; this.y = y; this.a = rnd(0, PI2); this.hp = 30; this.state = 'walk';
  this.t = rnd(1, 4); this.sp = rnd(28, 48); this.dead = false; this.deadT = 0; this.fx = 0; this.fy = 0;
  this.color = pick(['#ffd1a6', '#c68642', '#8d5524', '#f1c27d', '#e0ac69']);
  this.shirt = pick(['#ff3fa4', '#3ff6ff', '#ffe600', '#ffffff', '#2ee59d', '#ff8a1f', '#9b5cff']);
}
function pedBlocked(x, y, allowRoad) {
  return !!inBuilding(x, y) || (!allowRoad && isRoad(x, y)) || x < 0 || y < 0 || x > WORLD || y > WORLD;
}
Ped.prototype.update = function (dt) {
  if (this.dead) { this.deadT += dt; return; }
  var sp = this.sp;
  if (this.state === 'flee') {
    sp = 135; this.t -= dt;
    this.a = Math.atan2(this.y - this.fy, this.x - this.fx) + Math.sin(G.t * 3 + this.x) * 0.4;
    if (this.t <= 0) { this.state = 'walk'; this.t = rnd(2, 4); }
  } else {
    this.t -= dt;
    if (this.t <= 0) { this.a += rnd(-1.3, 1.3); this.t = rnd(2, 5); }
  }
  var nx = this.x + Math.cos(this.a) * sp * dt, ny = this.y + Math.sin(this.a) * sp * dt;
  if (pedBlocked(nx, ny, this.state === 'flee')) { this.a += PI * 0.5 + rnd(0, PI); }
  else { this.x = nx; this.y = ny; }
};
Ped.prototype.kill = function (by, ang) {
  if (this.dead) { return; }
  this.dead = true; this.hp = 0;
  /* ragdoll particle burst */
  for (var i = 0; i < (gfx.low ? 5 : 12); i++) {
    var a = (ang === undefined ? rnd(0, PI2) : ang + rnd(-0.8, 0.8)), s = rnd(60, 220);
    addP(this.x, this.y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.4, 0.9), rnd(2, 4), i % 3 ? '#c8102e' : this.shirt, 3);
  }
  /* physical cash drop */
  if (pickups.length < 40) { pickups.push({ x: this.x + rnd(-6, 6), y: this.y + rnd(-6, 6), amt: rndi(20, 260), t: 0 }); }
  if (by === 'player') { crime(12); G.score += 10; }
  noise(this.x, this.y, 300);
};

/* Particle pool --------------------------------------------------------
   types: 0 fire/spark (shrink+fade), 1 smoke (grow+fade), 3 debris (z physics), 4 flash */
var pCursor = 0;
function addP(x, y, vx, vy, life, size, c, type) {
  var lim = gfx.low ? 90 : PMAX, i, p = null;
  for (i = 0; i < lim; i++) { var q = parts[(pCursor + i) % lim]; if (!q.on) { p = q; pCursor = (pCursor + i + 1) % lim; break; } }
  if (!p) { p = parts[pCursor % lim]; pCursor = (pCursor + 1) % lim; }
  p.on = true; p.x = x; p.y = y; p.z = 0; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.c = c; p.type = type;
  p.vz = type === 3 ? rnd(120, 320) : 0;
}
function sparks(x, y, n) { for (var i = 0; i < n; i++) { addP(x, y, rnd(-150, 150), rnd(-150, 150), rnd(0.1, 0.3), 2, '#ffe600', 0); } }
function debris(x, y, n, c) { for (var i = 0; i < n; i++) { addP(x, y, rnd(-120, 120), rnd(-120, 120), rnd(1.2, 2.4), rnd(2, 4), c, 3); } }

