/* =====================================================================
   22. BOOT & MAIN LOOP
   ===================================================================== */
function clock() { return (window.performance && window.performance.now) ? window.performance.now() : now(); }
var lastT = clock(), errCount = 0, smoothDt = 1 / 60, warmup = 1.5;
/* SMOOTH FRAME PACING: high-resolution timestamp when available, then an
   exponential moving average of the frame delta so one late frame does not
   jerk the camera / physics. Hitches above 100 ms are treated as a pause. */
function frame() {
  var t = clock();
  var raw = (t - lastT) / 1000;
  lastT = t;
  if (raw < 0 || raw > 0.1) { raw = smoothDt; }
  smoothDt += (raw - smoothDt) * 0.25;
  var rdt = Math.min(0.05, smoothDt);
  if (warmup > 0) { warmup -= raw; }
  if (!G.paused) {
    try {
      if (warmup <= 0) { telemetry(raw); }
      update(rdt);
      updateCamera(rdt);
      render();
    } catch (err) {
      /* never let one bad frame kill the loop on fragile legacy engines */
      errCount++; if (errCount < 5 && window.console && window.console.error) { window.console.error(err && err.stack ? err.stack : err); }
    }
  }
  nextFrame(frame);
}
function boot() {
  genWorld();
  load();
  var i;
  for (i = 0; i < 18; i++) { spawnTraffic(true); }
  for (i = 0; i < 20; i++) { var s = sidewalkPoint(); peds.push(new Ped(s.x, s.y)); }
  /* a parked getaway car next to the safehouse */
  var gc = new Car('sport', LOC.home.x + 20, LOC.home.y - 40, -PI / 2); gc.ai = 'none'; cars.push(gc);
  player.x = LOC.home.x - 20; player.y = LOC.home.y;
  cam.x = player.x; cam.y = player.y;
  resize();
  on(window, 'resize', resize); on(window, 'orientationchange', function () { window.setTimeout(resize, 200); });
  on(document, 'keydown', onKeyDown); on(document, 'keyup', onKeyUp);
  on(canvas, 'mousedown', function (e) {
    var p = mouseXY(e); mouse.x = p.x; mouse.y = p.y; usingTouch = false;
    if (e.button === 2 || e.button === 1) { mouse.look = true; return; }      /* right/middle drag = look around */
    var consumed = pointerPress(p.x, p.y, false);
    /* PC mouse-look: first click in 3D captures the mouse (Esc releases it) */
    if (!consumed && gfx.p3d && !mouse.locked && canvas.requestPointerLock && !G.phone && !G.wheel && !G.pad) {
      try { canvas.requestPointerLock(); } catch (err) { }
      return;
    }
    if (!consumed) { mouse.down = true; mouse.hit = true; }
  });
  on(document, 'mouseup', function () { mouse.down = false; mouse.look = false; });
  on(canvas, 'mousemove', function (e) {
    var p = mouseXY(e);
    if (mouse.locked && gfx.p3d) { lookDrag(e.movementX || 0, e.movementY || 0); mouse.moved = G.t; return; }
    if (mouse.look && gfx.p3d) { lookDrag(p.x - mouse.x, p.y - mouse.y); }
    mouse.x = p.x; mouse.y = p.y; mouse.moved = G.t; if (G.wheel) { G.wheelSel = wheelSlotAt(p.x, p.y); }
  });
  on(canvas, 'contextmenu', function (e) { stop(e); });
  on(document, 'pointerlockchange', function () {
    mouse.locked = document.pointerLockElement === canvas;
    if (mouse.locked) { notify('SYSTEM', 'Mouse captured: move to look, click to fire, wheel to zoom, Esc to release.', '#ffe600'); }
  });
  /* mouse wheel: camera distance in 3D */
  on(canvas, 'wheel', function (e) {
    if (!gfx.p3d || G.phone) { return; }
    C3.zoomK = clamp(C3.zoomK * (e.deltaY > 0 ? 1.1 : 0.9), 0.55, 2.2); stop(e);
  }, { passive: false });
  var passive = { passive: false };
  on(canvas, 'touchstart', onTouchStart, passive); on(canvas, 'touchmove', onTouchMove, passive);
  on(canvas, 'touchend', onTouchEnd, passive); on(canvas, 'touchcancel', onTouchEnd, passive);
  initHosts();
  mpInit();
  notify('ROSA', 'Welcome back to Coral Bay, ' + (player.ch === 0 ? 'me' : 'Dex') + '. Phone is on P. Do not get us killed.');
  lastT = clock();
  nextFrame(frame);
}
boot();
