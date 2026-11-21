/* =====================================================================
   14. INPUT: KEYBOARD, MOUSE, MULTI-TOUCH VIRTUAL CONTROLS
   ===================================================================== */
var keys = {}, keysHit = {}, mouse = { x: 0, y: 0, down: false, hit: false, moved: -10 };
var touches = [], touchHits = {}, usingTouch = PLATFORM.touch, cornerTaps = [];
var TB = {};                  // touch button layout (computed in layoutTouch)
var uiButtons = [];           // clickable UI rects registered while drawing overlays

function layoutTouch() {
  var u = U;
  TB.dpad = { x: 78 * u, y: VH - 82 * u, r: 64 * u };
  TB.fire = { x: VW - 52 * u, y: VH - 54 * u, r: 32 * u, label: 'FIRE', c: '#ff3b1f' };
  TB.gas = { x: VW - 52 * u, y: VH - 132 * u, r: 30 * u, label: 'GAS', c: '#2ee59d' };
  TB.brake = { x: VW - 126 * u, y: VH - 46 * u, r: 25 * u, label: 'BRK', c: '#ff8a1f' };
  TB.act = { x: VW - 126 * u, y: VH - 112 * u, r: 23 * u, label: 'ENTER', c: '#3ff6ff' };
  TB.weap = { x: VW - 112 * u, y: VH - 176 * u, r: 19 * u, label: 'WPN', c: '#9b5cff' };
  TB.phone = { x: VW / 2, y: VH - 30 * u, r: 20 * u, label: 'PHONE', c: '#ff3fa4' };
}
function inCircle(x, y, b, pad) { return b && dist(x, y, b.x, b.y) < b.r * (pad || 1.15); }
function hitUI(x, y) {
  for (var i = uiButtons.length - 1; i >= 0; i--) {
    var b = uiButtons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return true; }
  }
  return false;
}
/* A pointer press anywhere: overlays first, then gameplay. Returns true if consumed. */
function pointerPress(x, y, isTouch) {
  if (G.over > 0) { return true; }
  /* hidden cheat zone: triple tap the top-left corner */
  if (x < 34 * U && y < 34 * U) {
    var t = now(); cornerTaps.push(t); while (cornerTaps.length && t - cornerTaps[0] > 1200) { cornerTaps.shift(); }
    if (cornerTaps.length >= 3) { cornerTaps = []; G.pad = !G.pad; G.padText = ''; return true; }
  }
  if (G.pad || G.phone || G.wheel) { if (hitUI(x, y)) { return true; } }
  if (G.wheel) { G.wheelSel = wheelSlotAt(x, y); selectWeapon(G.wheelSel); G.wheel = false; return true; }
  if (G.pad) { return true; }
  if (isTouch) {
    if (inCircle(x, y, TB.phone)) { togglePhone(); return true; }
    if (inCircle(x, y, TB.weap)) { G.wheel = true; G.wheelSel = player.weap; return true; }
    if (inCircle(x, y, TB.act)) { touchHits.act = true; return true; }
    if (G.phone && x > phoneRect.x && y > phoneRect.y && x < phoneRect.x + phoneRect.w && y < phoneRect.y + phoneRect.h) { return true; }
    return false;
  }
  if (G.phone && x > phoneRect.x && y > phoneRect.y && x < phoneRect.x + phoneRect.w && y < phoneRect.y + phoneRect.h) { return true; }
  return false;
}
/* Is (x,y) on a virtual control? Touches elsewhere drag the 3D camera. */
function onControl(x, y) {
  if (dist(x, y, TB.dpad.x, TB.dpad.y) < TB.dpad.r * 1.6) { return true; }
  var k; for (k in TB) { if (TB.hasOwnProperty(k) && k !== 'dpad' && inCircle(x, y, TB[k], 1.35)) { return true; } }
  return false;
}
function touchXY(t) {
  var r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}
function onTouchStart(e) {
  usingTouch = true;
  var ch = e.changedTouches, i;
  for (i = 0; i < ch.length; i++) {
    var p = touchXY(ch[i]);
    if (!pointerPress(p.x, p.y, true)) { touches.push({ id: ch[i].identifier, x: p.x, y: p.y, fresh: true, look: gfx.p3d && !onControl(p.x, p.y) }); }
  }
  if (e.preventDefault) { e.preventDefault(); }
}
function onTouchMove(e) {
  var ch = e.changedTouches, i, j;
  for (i = 0; i < ch.length; i++) {
    for (j = 0; j < touches.length; j++) {
      if (touches[j].id === ch[i].identifier) {
        var p = touchXY(ch[i]);
        if (touches[j].look) { lookDrag(p.x - touches[j].x, p.y - touches[j].y); }
        touches[j].x = p.x; touches[j].y = p.y;
      }
    }
    if (G.wheel) { var q = touchXY(ch[i]); G.wheelSel = wheelSlotAt(q.x, q.y); }
  }
  if (e.preventDefault) { e.preventDefault(); }
}
function onTouchEnd(e) {
  var ch = e.changedTouches, i, j;
  for (i = 0; i < ch.length; i++) {
    for (j = touches.length - 1; j >= 0; j--) { if (touches[j].id === ch[i].identifier) { touches.splice(j, 1); } }
  }
  if (e.preventDefault) { e.preventDefault(); }
}
/* Resolve held virtual buttons from active touches each frame. */
function touchState() {
  var s = { up: false, down: false, left: false, right: false, fire: false, fireHit: false, gas: false, brake: false }, i, t;
  for (i = 0; i < touches.length; i++) {
    t = touches[i];
    if (t.look) { continue; }
    var dx = t.x - TB.dpad.x, dy = t.y - TB.dpad.y, dd = Math.sqrt(dx * dx + dy * dy);
    if (dd < TB.dpad.r * 1.5 && dd > TB.dpad.r * 0.18) {
      if (dx < -dd * 0.38) { s.left = true; } if (dx > dd * 0.38) { s.right = true; }
      if (dy < -dd * 0.38) { s.up = true; } if (dy > dd * 0.38) { s.down = true; }
    }
    if (inCircle(t.x, t.y, TB.fire)) { s.fire = true; if (t.fresh) { s.fireHit = true; } }
    if (inCircle(t.x, t.y, TB.gas)) { s.gas = true; }
    if (inCircle(t.x, t.y, TB.brake)) { s.brake = true; }
    t.fresh = false;
  }
  return s;
}
function selectWeapon(i) {
  if (!player.owned[i]) { notify('SYSTEM', WEAPONS[i].name + ' not owned. Try a phone job... or a code.', '#ffe600'); return; }
  player.weap = i;
}
function togglePhone() { G.phone = !G.phone; G.page = 'home'; }

function onKeyDown(e) {
  e = e || window.event;
  var k = e.keyCode || e.which, ch = e.key;
  usingTouch = false;
  /* tilde / backquote toggles the console */
  if (k === 192 || k === 223 || ch === '`' || ch === '~') { G.console = !G.console; G.conText = ''; stop(e); return; }
  if (G.console) {
    if (k === 13) { conExec(); } else if (k === 27) { G.console = false; } else if (k === 8) { G.conText = G.conText.slice(0, -1); }
    else if ((k >= 65 && k <= 90) || (k >= 48 && k <= 57) || k === 32) { if (G.conText.length < 30) { G.conText += String.fromCharCode(k); } }
    stop(e); return;
  }
  var swallow = (k >= 65 && k <= 90) ? cheatKey(String.fromCharCode(k)) : false;
  if (!keys[k] && !swallow) { keysHit[k] = true; }
  keys[k] = true;
  if (k === 32 || (k >= 37 && k <= 40) || k === 9) { stop(e); }
}
function onKeyUp(e) { e = e || window.event; keys[e.keyCode || e.which] = false; }
function stop(e) { if (e.preventDefault) { e.preventDefault(); } else { e.returnValue = false; } }
function mouseXY(e) {
  var r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

