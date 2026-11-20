/* =====================================================================
   11. SPAWNING / POPULATION MANAGEMENT
   ===================================================================== */
function sidewalkPoint() {
  var bx = rndi(0, NB - 1), by = rndi(0, NB - 1), side = rndi(0, 3), t = rnd(45, 355);
  var x0 = bx * CELL, y0 = by * CELL, o = rnd(44, 54);
  if (side === 0) { return { x: x0 + t, y: y0 + o }; } if (side === 1) { return { x: x0 + t, y: y0 + CELL - o }; }
  if (side === 2) { return { x: x0 + o, y: y0 + t }; } return { x: x0 + CELL - o, y: y0 + t };
}
function nearPlayerSidewalk() {
  var P = playerPos(), i, s;
  for (i = 0; i < 12; i++) { s = sidewalkPoint(); var d = dist(s.x, s.y, P.x, P.y); if (d > 500 && d < 1300) { return s; } }
  return sidewalkPoint();
}
function spawnTraffic(initial) {
  var P = playerPos(), i, ix, iy, d;
  for (i = 0; i < 20; i++) {
    ix = rndi(0, NB); iy = rndi(0, NB); d = dist(ix * CELL, iy * CELL, P.x, P.y);
    if (initial ? d < 1500 : (d > 650 && d < 1300)) { break; }
  }
  var c = new Car(Math.random() < 0.2 ? 'sport' : 'sedan', 0, 0, 0);
  placeOnRoad(c, ix, iy); cars.push(c);
}
function population(dt) {
  var P = playerPos(), i, c, civ = 0;
  for (i = cars.length - 1; i >= 0; i--) {
    c = cars[i]; if (c === player.car || c.role) { continue; }
    var d = dist(c.x, c.y, P.x, P.y);
    if (d > 1700 || (c.dead && c.deadT > 30 && d > 600)) { cars.splice(i, 1); continue; }
    if (c.ai === 'civ' && !c.dead) { civ++; }
  }
  if (civ < 18) { spawnTraffic(false); }
  for (i = peds.length - 1; i >= 0; i--) {
    var p = peds[i], pd = dist(p.x, p.y, P.x, P.y);
    if ((p.dead && p.deadT > 20) || pd > 1700) { var s = nearPlayerSidewalk(); peds[i] = new Ped(s.x, s.y); }
  }
}

