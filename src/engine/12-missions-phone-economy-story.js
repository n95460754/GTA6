/* =====================================================================
   12. MISSIONS, PHONE ECONOMY & STORY
   ===================================================================== */
function startMission(m) {
  G.mission = { def: m, done: false };
  notify(m.from, m.text);
  flash('JOB: ' + m.name.toUpperCase(), m.type === 'lose' ? 'Lose the heat' : (m.loc ? LOC[m.loc].name : (m.tx ? 'Marked on GPS' : 'Phone job')));
  if (m.wanted) { setWanted(Math.max(G.wanted, m.wanted)); }
}
function randomJob() {
  var ix = rndi(1, NB - 1), iy = rndi(1, NB - 1), horiz = Math.random() < 0.5;
  var x = ix * CELL + (horiz ? 200 : 0), y = iy * CELL + (horiz ? 0 : 200);
  var deliver = Math.random() < 0.5;
  return { name: deliver ? 'Hot Delivery' : 'Drop-Off', from: pick(['ROSA', 'DEX']), type: deliver ? 'deliver' : 'goto',
    text: deliver ? 'Client wants a car, no questions. Drop it at the GPS mark.' : 'Package needs moving across town. GPS is set.',
    tx: x, ty: y, reward: rndi(20, 80) * 100, trust: 2 };
}
function missionTarget(m) {
  if (m.loc) { return LOC[m.loc]; }
  if (m.tx !== undefined) { return { x: m.tx, y: m.ty }; }
  return null;
}
function completeMission() {
  var m = G.mission.def;
  G.cash += m.reward; G.trust = clamp(G.trust + m.trust, 0, 100); G.jobs++; G.score += 100 + Math.floor(m.reward / 100);
  flash('JOB COMPLETE', '+$' + m.reward + '   TRUST +' + m.trust);
  notify(m.from === 'ROSA' ? 'DEX' : 'ROSA', pick(['That is my partner.', 'Smooth. Too smooth.', 'Money in the bag, babe.', 'Leonida who? Palmetto is ours.']));
  G.mission = null; G.missionDelay = 6;
  if (G.missionIdx < STORY.length) { G.missionIdx++; }
  save();
}
function missionUpdate(dt) {
  if (!G.mission) {
    G.missionDelay -= dt;
    if (G.missionDelay <= 0) { startMission(G.missionIdx < STORY.length ? STORY[G.missionIdx] : randomJob()); }
    return;
  }
  var m = G.mission.def, tg = missionTarget(m), P = playerPos();
  if (m.type === 'goto' && dist(P.x, P.y, tg.x, tg.y) < 55) { completeMission(); }
  else if (m.type === 'deliver' && player.car && !player.car.dead && dist(P.x, P.y, tg.x, tg.y) < 60) {
    var c = player.car; exitCar(); c.ai = 'none'; completeMission();
  }
  else if (m.type === 'lose' && G.wanted === 0) { completeMission(); }
}
function runHeist() {
  if (G.heist.run || G.heist.cd > 0) { return; }
  G.heist.run = true; G.heist.prog = 0;
}
function heistUpdate(dt) {
  var h = G.heist;
  if (h.cd > 0) { h.cd -= dt; }
  if (!h.run) { return; }
  h.prog += dt / 3.5;
  if (h.prog >= 1) {
    h.run = false; h.cd = 45; G.cash += 50000; G.score += 200;
    flash('HACK SUCCESS', '+$50,000 WIRED TO OFFSHORE');
    if (Math.random() < 0.35) { setWanted(Math.max(G.wanted, 2)); notify('ROSA', 'They traced the ping! Investigation opened - 2 stars!'); }
    else { notify('ROSA', 'Clean exit. No trace. I am a genius.'); }
    if (G.mission && G.mission.def.type === 'heist') { completeMission(); }
  }
}
function switchChar() {
  player.ch = 1 - player.ch;
  var c = CHARS[player.ch];
  flash('SWITCH: ' + c.name, c.perk);
  notify(player.ch === 0 ? 'ROSA' : 'DEX', player.ch === 0 ? 'My turn. Watch and learn.' : 'Keys. Now. I drive.');
}

/* Flatline / busted / respawn ----------------------------------------- */
function die() {
  if (G.over > 0) { return; }
  G.over = 3.5; G.overText = 'FLATLINED'; G.overSub = 'Mercy Palms bill: -$' + Math.min(G.cash, 2000);
  G.overAction = function () { G.cash -= Math.min(G.cash, 2000); respawn(LOC.hospital); G.trust = clamp(G.trust - 3, 0, 100); };
}
function busted() {
  if (G.over > 0) { return; }
  G.over = 3.5; G.overText = 'CUFFED'; G.overSub = 'Bail + lawyer: -10% cash, heavy weapons seized';
  G.overAction = function () { G.cash = Math.floor(G.cash * 0.9); player.ammo[2] = 0; player.ammo[3] = 0; respawn(LOC.station); G.trust = clamp(G.trust - 5, 0, 100); };
}
function respawn(loc) {
  if (player.car) { exitCar(); }
  player.x = loc.x; player.y = loc.y + 30; player.hp = 100; player.armor = 0;
  setWanted(0); clearPolice(); G.bustT = 0;
  if (G.mission && G.mission.def.type !== 'heist') { notify(G.mission.def.from, 'Job blown. We will try again.'); G.mission = null; G.missionDelay = 6; }
}

/* Vehicles: enter / exit ---------------------------------------------- */
function exitCar() {
  var c = player.car; if (!c) { return; }
  var side, ox, oy, k;
  for (k = 0; k < 2; k++) {
    side = k === 0 ? -PI / 2 : PI / 2;
    ox = c.x + Math.cos(c.a + side) * (c.h / 2 + 14); oy = c.y + Math.sin(c.a + side) * (c.h / 2 + 14);
    if (!inBuilding(ox, oy)) { break; }
  }
  player.x = ox; player.y = oy; player.a = c.a; c.ai = 'none'; c.thr = 0; c.str = 0; c.hb = false;
  player.car = null;
}
function enterCar() {
  var best = null, bd = 60, i, c;
  for (i = 0; i < cars.length; i++) {
    c = cars[i]; if (c.dead) { continue; }
    var d = dist(player.x, player.y, c.x, c.y);
    if (d < bd + c.r) { bd = d - c.r; best = c; }
  }
  if (!best) { return; }
  if (best.ai === 'civ' || best.ai === 'police') {
    var pd = new Ped(best.x + Math.cos(best.a + PI / 2) * 24, best.y + Math.sin(best.a + PI / 2) * 24);
    pd.state = 'flee'; pd.t = 8; pd.fx = player.x; pd.fy = player.y;
    peds[Math.floor(Math.random() * peds.length)] = pd;
    var copsNear = false;
    for (i = 0; i < cars.length; i++) { if (cars[i].role && cars[i] !== best && dist(cars[i].x, cars[i].y, player.x, player.y) < 450) { copsNear = true; } }
    if (best.role) { crime(30); notify('SCANNER', 'Officer down! Cruiser stolen!', '#3ff6ff'); best.role = ''; }
    else if (copsNear) { crime(10); }
  }
  best.ai = 'player'; best.mode = 'cruise'; player.car = best;
  if (best.type === 'tank') { flash('HEAVY ARMOR', 'Fire = cannon. Turret follows aim.'); }
}

