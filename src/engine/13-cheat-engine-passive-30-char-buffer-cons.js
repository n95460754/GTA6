/* =====================================================================
   13. CHEAT ENGINE (passive 30-char buffer + console + touch pad)
   ===================================================================== */
var cheatBuf = '';
var CHEATS = {
  MEDSUPPLY: { label: 'FULL HEALTH & ARMOR', fn: function () { player.hp = 100; player.armor = 100; } },
  HEAVYMETAL:  { label: 'BATTLE TANK DELIVERED', fn: function () {
    var a = player.car ? player.car.a : player.a, P = playerPos();
    var t = new Car('tank', P.x + Math.cos(a) * 90, P.y + Math.sin(a) * 90, a); t.ai = 'none'; t.turretA = a; pushOut(t, t.r, 0); cars.push(t); } },
  TOOLBOX:     { label: 'PISTOL + MICRO SMG + RPG, MAX AMMO', fn: function () {
    for (var i = 1; i < 4; i++) { player.owned[i] = true; player.ammo[i] = WEAPONS[i].max; } player.weap = 3; } },
  NITROUS:     { label: 'TURBO: ACCEL x3, TOP SPEED x4', fn: function () {
    if (!player.car) { notify('SYSTEM', 'Get in a vehicle first, then re-enter the code.', '#ffe600'); return false; }
    player.car.accelMul *= 3; player.car.maxMul *= 4; } },
  BLANKSLATE: { label: 'WANTED LEVEL CLEARED', fn: function () { setWanted(0); clearPolice(); } },
  MAXHEAT:     { label: 'FIVE STAR FUGITIVE', fn: function () { setWanted(5); G.heat = STAR_AT[5]; } },
  LOWGRAVITY:  { label: 'GRAVITY x0.15', fn: function () { G.gravMul = G.gravMul < 1 ? 1 : 0.15; if (G.gravMul === 1) { flash('GRAVITY RESTORED', ''); return false; } } },
  MONEYRAIN:   { label: '+$250,000', fn: function () { G.cash += 250000; } }
};
function runCheat(code) {
  code = ('' + code).toUpperCase().replace(/[^A-Z]/g, '');
  var c = CHEATS[code];
  if (!c) { return false; }
  var r = c.fn();
  if (r !== false) { flash('CHEAT ACTIVATED', c.label); }
  G.score = Math.max(0, G.score - 10);
  return true;
}
/* Returns true when the key is part of a code being typed, so the
   game swallows its hotkey meaning (E would exit the car, G switch gfx...). */
function cheatKey(ch) {
  cheatBuf = (cheatBuf + ch).slice(-30);
  var k, n, typing = false;
  for (k in CHEATS) {
    if (!CHEATS.hasOwnProperty(k)) { continue; }
    if (cheatBuf.length >= k.length && cheatBuf.substr(cheatBuf.length - k.length) === k) { runCheat(k); cheatBuf = ''; return true; }
    for (n = Math.min(k.length - 1, cheatBuf.length); n >= 2; n--) {
      if (cheatBuf.substr(cheatBuf.length - n) === k.substr(0, n)) { typing = true; break; }
    }
  }
  return typing;
}
function conExec() {
  var txt = G.conText; G.conText = '';
  G.conLog.push('> ' + txt); if (G.conLog.length > 5) { G.conLog.shift(); }
  var w = txt.toUpperCase().replace(/^\s+|\s+$/g, '');
  if (w === 'HELP') { var names = []; for (var k in CHEATS) { if (CHEATS.hasOwnProperty(k)) { names.push(k); } } G.conLog.push(names.join(' ')); }
  else if (w === 'FPS') { G.conLog.push('FPS ' + gfx.fps + ' pipe=' + (gfx.low ? 'TOPDOWN' : 'PERSPECTIVE') + ' mode=' + gfx.mode); }
  else if (!runCheat(w)) { G.conLog.push('Unknown code. Type HELP.'); }
  while (G.conLog.length > 5) { G.conLog.shift(); }
}

