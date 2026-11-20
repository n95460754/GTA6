/* =====================================================================
   20. SAVE / LOAD (localStorage, guarded for hosts without storage)
   ===================================================================== */
function save() {
  try { if (window.localStorage && window.JSON) {
    window.localStorage.setItem('neontide_save', JSON.stringify({ cash: G.cash, score: G.score, trust: G.trust, jobs: G.jobs, mi: G.missionIdx, ch: player.ch, owned: player.owned, ammo: player.ammo, followers: G.followers }));
  } } catch (e) { }
}
function load() {
  try { if (window.localStorage && window.JSON) {
    var s = window.localStorage.getItem('neontide_save'); if (!s) { return; }
    var d = JSON.parse(s); G.cash = d.cash || 0; G.score = d.score || 0; G.trust = d.trust || 50; G.jobs = d.jobs || 0;
    G.missionIdx = d.mi || 0; player.ch = d.ch || 0; G.followers = d.followers || 1200;
    if (d.owned) { player.owned = d.owned; } if (d.ammo) { player.ammo = d.ammo; }
  } } catch (e) { }
}

