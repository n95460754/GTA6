/* =====================================================================
   7. HEAT INDEX (WANTED LEVEL) & CRIME
   ===================================================================== */
function crime(points) {
  G.heat = Math.min(STAR_AT[5] + 40, G.heat + points);
  var w = 0, i;
  for (i = 5; i >= 1; i--) { if (G.heat >= STAR_AT[i]) { w = i; break; } }
  if (w > G.wanted) { setWanted(w); }
  G.lastSeen = G.t;
}
function setWanted(w) {
  w = clamp(w, 0, 5);
  var prev = G.wanted;
  G.wanted = w; G.heat = Math.max(G.heat, STAR_AT[w]); if (w === 0) { G.heat = 0; }
  G.lastSeen = G.t;
  if (w > prev) {
    if (w >= 2) { feedTrigger('PURSUIT'); }
    if (w === 5) { flash('5 STARS', 'MILITARY RESPONSE INBOUND'); }
  }
}
function clearPolice() {
  for (var i = cars.length - 1; i >= 0; i--) { if (cars[i].role && cars[i] !== player.car) { cars.splice(i, 1); } }
  spikes.length = 0;
}

