/* =====================================================================
   14b. GAMEPAD (DualShock 4 / DualSense / Xbox, W3C "standard" mapping)
   Works in the PS4/PS5 web browser, desktop browsers, Electron and
   Android WebView where navigator.getGamepads exists. ES5, feature-detected.

   Layout (PlayStation names):
     Left stick / D-pad ... move on foot, steer in car (D-pad also = phone apps)
     R2 ................... gas in car / fire on foot (analog)
     L2 ................... brake & reverse in car
     R1 ................... fire (drive-by in car)
     Right stick .......... aim on foot, turret in tank
     Triangle ............. enter / exit vehicle
     Cross ................ handbrake in car / sprint on foot / confirm in menus
     Circle ............... back / close overlays
     Square ............... switch Rosa <-> Dex
     L1 ................... weapon wheel (pick with right/left stick, release)
     OPTIONS .............. Palmetto OS phone
     SHARE / CREATE ....... toggle graphics pipe
   ===================================================================== */
var pad = { on: false, prev: [], state: null, aimX: 0, aimY: 0, aimT: -10, name: '' };
function padPressed(b, i) { var x = b[i]; return !!x && (typeof x === 'object' ? (x.pressed || x.value > 0.5) : x > 0.5); }
function padValue(b, i) { var x = b[i]; return !x ? 0 : (typeof x === 'object' ? x.value : x); }
function pollGamepad() {
  pad.state = null;
  if (!navigator.getGamepads) { return; }
  var list = navigator.getGamepads(), gp = null, i;
  if (!list) { return; }
  for (i = 0; i < list.length; i++) { if (list[i] && list[i].connected !== false && list[i].buttons && list[i].buttons.length) { gp = list[i]; break; } }
  if (!gp) { return; }
  if (!pad.on) { pad.on = true; pad.name = gp.id || 'gamepad'; usingTouch = false; notify('SYSTEM', 'Controller connected: ' + pad.name.substr(0, 40), '#ffe600'); }
  var b = gp.buttons, ax = gp.axes || [], dz = 0.25, s = {}, hit = {};
  var lx = Math.abs(ax[0] || 0) > dz ? ax[0] : 0, ly = Math.abs(ax[1] || 0) > dz ? ax[1] : 0;
  var rx = Math.abs(ax[2] || 0) > dz ? ax[2] : 0, ry = Math.abs(ax[3] || 0) > dz ? ax[3] : 0;
  for (i = 0; i < 18; i++) { s[i] = padPressed(b, i); hit[i] = s[i] && !pad.prev[i]; pad.prev[i] = s[i]; }
  if (s[0] || s[1] || s[2] || s[3] || lx || ly) { usingTouch = false; }
  pad.state = {
    up: ly < -0.35 || s[12], down: ly > 0.35 || s[13], left: lx < -0.35 || s[14], right: lx > 0.35 || s[15],
    steer: lx || ((s[15] ? 1 : 0) - (s[14] ? 1 : 0)), moveX: lx || ((s[15] ? 1 : 0) - (s[14] ? 1 : 0)), moveY: ly || ((s[13] ? 1 : 0) - (s[12] ? 1 : 0)),
    gas: padValue(b, 7), brake: padValue(b, 6), r1: s[5], r1Hit: hit[5], r2Hit: hit[7],
    act: hit[3], hb: s[0], cross: hit[0], back: hit[1], sw: hit[2], wheel: hit[4], wheelUp: !s[4] && pad.prev.l1Was,
    phone: hit[9], gfx: hit[8], dU: hit[12], dR: hit[15], dD: hit[13], dL: hit[14]
  };
  pad.prev.l1Was = s[4];
  if (rx || ry) { pad.aimX = rx; pad.aimY = ry; pad.aimT = G.t; }
  /* overlay navigation */
  var st = pad.state;
  if (st.phone) { togglePhone(); }
  if (st.gfx) { cycleGfx(); }
  if (st.sw) { switchChar(); }
  if (st.back) { if (G.pad || G.wheel || G.console) { G.pad = false; G.wheel = false; G.console = false; } else if (G.phone) { if (G.page !== 'home') { G.page = 'home'; } else { G.phone = false; } } }
  if (G.phone) {
    if (st.dU) { phoneKey(0); } else if (st.dR) { phoneKey(1); } else if (st.dD) { phoneKey(2); } else if (st.dL) { phoneKey(3); }
    if (st.cross && G.page === 'heist') { runHeist(); }
  }
  /* L1 hold = weapon wheel, pick with right stick (or left stick), release to equip */
  if (st.wheel) { G.wheel = true; G.wheelSel = player.weap; }
  if (G.wheel) {
    var wx = rx || lx, wy = ry || ly;
    if (Math.abs(wx) + Math.abs(wy) > 0.5) { G.wheelSel = (Math.round(wrapA(Math.atan2(wy, wx) + PI / 2) / (PI / 2)) % 4 + 4) % 4; }
    if (st.wheelUp) { selectWeapon(G.wheelSel); G.wheel = false; }
  }
}
/* Merge controller state into the frame's input record (called by readInput). */
function applyGamepad(I) {
  var s = pad.state;
  if (!s || G.phone || G.wheel) { return I; }
  if (player.car) {
    I.up = I.up || s.gas > 0.15; I.down = I.down || s.brake > 0.15;
    I.left = I.left || s.left; I.right = I.right || s.right;
    I.padSteer = s.steer; I.padGas = s.gas; I.padBrake = s.brake;
    I.hb = I.hb || s.hb;
    I.fire = I.fire || s.r1; I.fireHit = I.fireHit || s.r1Hit;
  } else {
    I.up = I.up || s.up; I.down = I.down || s.down; I.left = I.left || s.left; I.right = I.right || s.right;
    I.padMoveX = s.moveX; I.padMoveY = s.moveY;
    I.sprint = I.sprint || s.hb;
    I.fire = I.fire || s.r1 || s.gas > 0.5; I.fireHit = I.fireHit || s.r1Hit || s.r2Hit;
  }
  I.act = I.act || s.act;
  return I;
}
