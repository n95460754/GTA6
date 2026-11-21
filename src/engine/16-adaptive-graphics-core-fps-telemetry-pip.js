/* =====================================================================
   16. ADAPTIVE GRAPHICS CORE (FPS telemetry + pipeline switching)
   Three pipes, best first:
     3D    - true 3D chase camera (17b, software perspective renderer)
     PERSP - 2.5D top-down with projected building heights (17)
     TOP   - classic flat top-down (17, cheapest; legacy machines)
   AUTO mode drops one pipe whenever the 1-second FPS average is < 25.
   ===================================================================== */
function pipeName() { return gfx.p3d ? '3D' : (gfx.low ? 'TOP-DOWN' : 'PERSP-2.5D'); }
function setPipe(p, why) {
  var wasLow = gfx.low;
  gfx.p3d = p === '3d'; gfx.low = p === 'top';
  if (gfx.p3d) { C3.ready = false; }
  if (wasLow !== gfx.low) { resize(); }
  notify('SYSTEM', 'Graphics pipe: ' + pipeName() + (why ? ' [' + why + ']' : ''), '#ffe600');
}
function setLow(v, why) { if (v) { setPipe('top', why); } else { setPipe('persp', why); } }
function cycleGfx() {
  var order = ['auto', '3d', 'persp', 'top'], i = 0;
  while (order[i] !== gfx.mode && i < order.length) { i++; }
  gfx.mode = order[(i + 1) % order.length];
  if (gfx.mode === 'auto') { setPipe(PLATFORM.legacy ? 'top' : '3d', 'auto'); } else { setPipe(gfx.mode, 'manual'); }
  flash('GRAPHICS: ' + gfx.mode.toUpperCase(), gfx.mode === 'auto' ? 'drops a level when FPS < 25' : pipeName());
}
function telemetry(rdt) {
  gfx.frames++; gfx.acc += rdt;
  if (gfx.acc >= 1) {                         /* rolling 1-second buffer */
    gfx.fps = Math.round(gfx.frames / gfx.acc); gfx.frames = 0; gfx.acc = 0;
    if (gfx.mode !== 'auto') { return; }
    if (gfx.fps < 25) {                       /* immediate degrade, one level */
      gfx.goodStreak = 0;
      if (gfx.p3d) { setPipe('persp', 'FPS ' + gfx.fps); } else if (!gfx.low) { setPipe('top', 'FPS ' + gfx.fps); }
    } else if (gfx.low && gfx.fps >= 50) { gfx.goodStreak++; if (gfx.goodStreak >= 4) { setPipe('persp', 'FPS ' + gfx.fps); gfx.goodStreak = 0; } }
    else { gfx.goodStreak = 0; }
  }
}
