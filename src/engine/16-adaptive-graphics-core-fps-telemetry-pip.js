/* =====================================================================
   16. ADAPTIVE GRAPHICS CORE (FPS telemetry + pipeline switching)
   ===================================================================== */
function setLow(v, why) {
  if (gfx.low === v) { return; }
  gfx.low = v; resize();
  notify('SYSTEM', v ? 'Low FPS (' + gfx.fps + '): classic top-down pipe' + (why ? ' [' + why + ']' : '') : 'Perspective engine online', '#ffe600');
}
function cycleGfx() {
  gfx.mode = gfx.mode === 'auto' ? 'top' : (gfx.mode === 'top' ? 'persp' : 'auto');
  if (gfx.mode === 'top') { setLow(true, 'manual'); } else if (gfx.mode === 'persp') { setLow(false); }
  flash('GRAPHICS: ' + gfx.mode.toUpperCase(), gfx.mode === 'auto' ? 'switches on 1s FPS telemetry' : '');
}
function telemetry(rdt) {
  gfx.frames++; gfx.acc += rdt;
  if (gfx.acc >= 1) {                         /* rolling 1-second buffer */
    gfx.fps = Math.round(gfx.frames / gfx.acc); gfx.frames = 0; gfx.acc = 0;
    if (gfx.mode !== 'auto') { return; }
    if (gfx.fps < 25) { gfx.goodStreak = 0; setLow(true); }  /* immediate degrade */
    else if (gfx.low && gfx.fps >= 50) { gfx.goodStreak++; if (gfx.goodStreak >= 4) { setLow(false); gfx.goodStreak = 0; } }
    else { gfx.goodStreak = 0; }
  }
}

