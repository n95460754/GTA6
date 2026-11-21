/* =====================================================================
   19. CAMERA
   ===================================================================== */
function updateCamera(dt) {
  var P = playerPos(), base = clamp(Math.min(VW, VH) / 720, 0.42, 1.15);
  var sp = player.car ? Math.abs(player.car.v) : 0;
  var target = base * (1 - clamp(sp / 900, 0, 0.35));
  cam.zoom += (target - cam.zoom) * (1 - Math.exp(-dt * 2));
  var lead = player.car ? 0.35 : 0;
  /* frame-rate independent critically-damped follow */
  cam.lx += ((P.vx * lead) - cam.lx) * (1 - Math.exp(-dt * 2.5)); cam.ly += ((P.vy * lead) - cam.ly) * (1 - Math.exp(-dt * 2.5));
  var tx = P.x + cam.lx, ty = P.y + cam.ly, k = 1 - Math.exp(-dt * 7);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  if (gfx.p3d) { updateCamera3D(dt); }
}

