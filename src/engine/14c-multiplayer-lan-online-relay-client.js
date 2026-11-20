/* =====================================================================
   14c. MULTIPLAYER (relay client)
   Up to 16 players share one Palmetto County through the relay built into
   manager.js (`node manager.js --serve` or `--multiplayer`).
   Transport: plain XHR polling at ~12 Hz. No WebSocket required, so it
   works on legacy WebKit, the PS4/PS5 browser, Electron and Android.
   Each client simulates its own traffic; players, gunfire, rockets and
   explosions are shared (PvP damage included).

   How to connect:
     * open the game from the server URL (http://<host-ip>:8080/) -> auto-joins
     * or add ?mp=http://<host-ip>:8080 to any build / file URL
     * or Phone > ONLINE > JOIN and type the host address
   ===================================================================== */
var MP = { on: false, url: '', id: '', name: '', players: {}, seq: 0, sendT: 0, busy: false, out: [], status: 'OFFLINE', lastOk: 0, fails: 0 };
var MP_NAMES = ['Gator', 'Flamingo', 'Neon', 'Riptide', 'Mango', 'Hurricane', 'Palmetto', 'Vice', 'Coral', 'Sunset', 'Manatee', 'Pelican'];
function mpInit() {
  MP.id = 'p' + Math.floor(Math.random() * 1e9).toString(36);
  MP.name = pick(MP_NAMES) + rndi(10, 99);
  var q = (window.location && window.location.search) || '', m = q.match(/[?&]mp=([^&]+)/);
  if (m) { mpConnect(decodeURIComponent(m[1])); return; }
  var proto = window.location && window.location.protocol;
  if (proto === 'http:' || proto === 'https:') { mpConnect(''); }   // same-origin server?
}
function mpXhr(method, path, body, cb) {
  var x;
  try { x = new XMLHttpRequest(); } catch (e) { cb(null); return; }
  x.onreadystatechange = function () {
    if (x.readyState !== 4) { return; }
    var data = null;
    if (x.status === 200) { try { data = JSON.parse(x.responseText); } catch (e2) { data = null; } }
    cb(data);
  };
  try {
    x.open(method, MP.url + path, true);
    if (body) { x.setRequestHeader('Content-Type', 'text/plain'); }   // simple request = no CORS preflight
    x.send(body || null);
  } catch (e3) { cb(null); }
}
function mpConnect(url) {
  MP.url = (url || '').replace(/\/+$/, '');
  if (MP.url && !/^https?:\/\//.test(MP.url)) { MP.url = 'http://' + MP.url; }
  MP.status = 'CONNECTING';
  mpXhr('GET', '/mp/ping', null, function (d) {
    if (d && d.server === 'neontide-mp') {
      MP.on = true; MP.status = 'ONLINE'; MP.fails = 0; MP.seq = d.seq || 0;
      notify('ONLINE', 'Joined Palmetto County lobby as ' + MP.name + ' (' + (d.players || 0) + ' others online)', '#2ee59d');
    } else { MP.on = false; MP.status = url ? 'NO SERVER AT ' + MP.url : 'OFFLINE'; if (url) { notify('ONLINE', 'No multiplayer server found at ' + MP.url, '#ff3b1f'); } }
  });
}
function mpEmit(ev) { if (MP.on && MP.out.length < 40) { MP.out.push(ev); } }
function mpUpdate(dt) {
  var id, p, k;
  /* smooth remote players toward their last network state (interpolation) */
  for (id in MP.players) {
    if (!MP.players.hasOwnProperty(id)) { continue; }
    p = MP.players[id]; k = 1 - Math.exp(-dt * 12);
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.a += wrapA(p.ta - p.a) * k;
  }
  if (!MP.on) { return; }
  MP.sendT -= dt;
  if (MP.sendT > 0 || MP.busy) { return; }
  MP.sendT = 0.08; MP.busy = true;
  var c = player.car;
  var me = { id: MP.id, name: MP.name, ch: player.ch, x: Math.round(player.x), y: Math.round(player.y),
    a: Math.round((c ? c.a : player.a) * 100) / 100, car: c ? c.type : '', color: c ? c.color : '', ta: c ? Math.round(c.turretA * 100) / 100 : 0,
    hp: Math.round(player.hp), w: G.wanted, weap: player.weap };
  var body = JSON.stringify({ me: me, seq: MP.seq, ev: MP.out });
  MP.out = [];
  mpXhr('POST', '/mp/sync', body, function (d) {
    MP.busy = false;
    if (!d) { MP.fails++; if (MP.fails > 25) { MP.on = false; MP.status = 'DISCONNECTED'; MP.players = {}; notify('ONLINE', 'Lost connection to the lobby.', '#ff3b1f'); } return; }
    MP.fails = 0; MP.lastOk = G.t; MP.seq = d.seq;
    var seen = {}, i, s;
    for (i = 0; i < d.players.length; i++) {
      s = d.players[i]; seen[s.id] = true;
      p = MP.players[s.id];
      if (!p) { p = MP.players[s.id] = { x: s.x, y: s.y, a: s.a }; notify('ONLINE', s.name + ' joined the session', '#2ee59d'); }
      p.tx = s.x; p.ty = s.y; p.ta = s.a; p.name = s.name; p.ch = s.ch; p.car = s.car; p.color = s.color || '#fff'; p.turretA = s.ta; p.hp = s.hp; p.w = s.w; p.weap = s.weap;
    }
    for (id in MP.players) { if (MP.players.hasOwnProperty(id) && !seen[id]) { notify('ONLINE', MP.players[id].name + ' left', '#aaa'); delete MP.players[id]; } }
    for (i = 0; i < d.events.length; i++) { mpEvent(d.events[i]); }
  });
}
function mpEvent(e) {
  if (e.t === 'boom') { explode(e.x, e.y, 'remote'); }
  else if (e.t === 'shot') { if (tracers.length < 40) { tracers.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0.08, c: '#2ee59d' }); } noise(e.x1, e.y1, 300); }
  else if (e.t === 'rocket') { fireRocket(e.x, e.y, e.a, 'remote', null, e.k); rockets[rockets.length - 1].net = true; }
  else if (e.t === 'hit' && e.to === MP.id) { hurtPlayer(e.dmg); G.shake = Math.min(1, G.shake + 0.2); if (player.hp <= 0) { notify('ONLINE', 'Taken out by ' + e.by, '#ff3b1f'); } }
}
/* Ray test against remote players for PvP hitscan. Returns hit distance or -1. */
function mpRayHit(x, y, cx, cy, maxT, dmg) {
  var id, p, t, px, py, best = -1, bestId = null, r;
  for (id in MP.players) {
    if (!MP.players.hasOwnProperty(id)) { continue; }
    p = MP.players[id]; px = p.x - x; py = p.y - y; t = px * cx + py * cy; r = p.car ? 20 : 10;
    if (t > 0 && t < maxT && Math.abs(px * cy - py * cx) < r && (best < 0 || t < best)) { best = t; bestId = id; }
  }
  if (bestId) { mpEmit({ t: 'hit', to: bestId, dmg: Math.round(dmg * (MP.players[bestId].car ? 0.3 : 1)), by: MP.name }); }
  return best;
}
function mpNearRemote(x, y, r) {
  for (var id in MP.players) { if (MP.players.hasOwnProperty(id) && dist(x, y, MP.players[id].x, MP.players[id].y) < r) { return true; } }
  return false;
}
var mpFake = { x: 0, y: 0, a: 0, w: 46, h: 22, r: 16, type: 'sedan', color: '#fff', z: 0, dead: false, popped: false, v: 0, turretA: 0 };
function mpDrawWorld() {
  var id, p, T;
  for (id in MP.players) {
    if (!MP.players.hasOwnProperty(id)) { continue; }
    p = MP.players[id];
    if (p.car && CAR_TYPES[p.car]) {
      T = CAR_TYPES[p.car]; mpFake.x = p.x; mpFake.y = p.y; mpFake.a = p.a; mpFake.w = T.w; mpFake.h = T.h; mpFake.type = p.car; mpFake.color = p.color; mpFake.turretA = p.turretA || p.a;
      drawCar(mpFake);
    } else {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = 'rgba(46,229,157,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, PI2, false); ctx.fill();
      ctx.fillStyle = CHARS[p.ch || 0].color; ctx.fillRect(-4, -6, 8, 12);
      ctx.fillStyle = '#c68642'; ctx.beginPath(); ctx.arc(1, 0, 4, 0, PI2, false); ctx.fill();
      if (p.weap > 0) { ctx.fillStyle = '#111'; ctx.fillRect(4, 3, p.weap === 3 ? 16 : 9, 3); }
      ctx.restore();
    }
  }
}
function mpDrawHUD() {
  if (!MP.on) { return; }
  var id, p, sx, sy;
  font(11 * U, true);
  for (id in MP.players) {
    if (!MP.players.hasOwnProperty(id)) { continue; }
    p = MP.players[id];
    sx = (p.x - cam.x) * cam.zoom + VW / 2; sy = (p.y - cam.y) * cam.zoom + VH / 2 - 26 * U;
    if (sx < -50 || sx > VW + 50 || sy < -50 || sy > VH + 50) { continue; }
    text(p.name + (p.w ? ' ' + p.w + '*' : ''), sx, sy, '#2ee59d', 'center');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 18 * U, sy + 3 * U, 36 * U, 4 * U);
    ctx.fillStyle = '#ff3fa4'; ctx.fillRect(sx - 18 * U, sy + 3 * U, 36 * U * clamp(p.hp / 100, 0, 1), 4 * U);
  }
  font(10 * U, true);
  var n = 0; for (id in MP.players) { if (MP.players.hasOwnProperty(id)) { n++; } }
  text('ONLINE ' + (n + 1) + 'P  ' + MP.name, VW - 10 * U, VH - (usingTouch ? 230 : 12) * U, '#2ee59d', 'right');
}
function mpMinimap(L, my, s) {
  ctx.fillStyle = '#2ee59d';
  for (var id in MP.players) { if (MP.players.hasOwnProperty(id)) { ctx.fillRect(L + MP.players[id].x * s - 2, my + MP.players[id].y * s - 2, 4, 4); } }
}
function mpJoinPrompt() {
  var h = null;
  try { if (window.prompt) { h = window.prompt('Multiplayer host (e.g. 192.168.1.20:8080)', MP.url ? MP.url.replace(/^https?:\/\//, '') : ''); } } catch (e) { h = null; }
  if (h) { mpConnect(h); } else { notify('ONLINE', 'Start `node manager.js --serve` on a PC, then open http://<PC-IP>:8080 on every device.', '#2ee59d'); }
}
