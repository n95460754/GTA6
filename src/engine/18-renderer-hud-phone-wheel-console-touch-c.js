/* =====================================================================
   18. RENDERER: HUD, PHONE, WHEEL, CONSOLE, TOUCH CONTROLS
   ===================================================================== */
function font(px, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px "Courier New", Courier, monospace'; }
function text(s, x, y, c, align) { ctx.textAlign = align || 'left'; ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(s, x + 1.5, y + 1.5); ctx.fillStyle = c; ctx.fillText(s, x, y); }
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function wrapLines(s, maxW) {
  var words = s.split(' '), lines = [], cur = '', i;
  for (i = 0; i < words.length; i++) {
    var test = cur ? cur + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = words[i]; } else { cur = test; }
  }
  if (cur) { lines.push(cur); }
  return lines;
}
function drawStar(cx, cy, r, fill) {
  ctx.beginPath();
  for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
}
function weaponIcon(i, x, y, s) {
  ctx.fillStyle = '#fff';
  if (i === 0) { ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, PI2, false); ctx.fill(); ctx.fillRect(x - s * 0.3, y - s * 0.35, s * 0.6, s * 0.18); }
  else if (i === 1) { ctx.fillRect(x - s * 0.35, y - s * 0.2, s * 0.7, s * 0.16); ctx.fillRect(x - s * 0.35, y - s * 0.2, s * 0.18, s * 0.5); }
  else if (i === 2) { ctx.fillRect(x - s * 0.4, y - s * 0.18, s * 0.8, s * 0.2); ctx.fillRect(x - s * 0.05, y, s * 0.14, s * 0.4); ctx.fillRect(x - s * 0.4, y - s * 0.05, s * 0.16, s * 0.3); }
  else { ctx.fillRect(x - s * 0.45, y - s * 0.08, s * 0.8, s * 0.16); ctx.beginPath(); ctx.moveTo(x + s * 0.35, y - s * 0.18); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x + s * 0.35, y + s * 0.18); ctx.fill(); }
}

function drawHUD() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  var u = U, blink = Math.floor(G.t * 6) % 2 === 0, i, x, y;
  /* day-night tint + vice sunset gradient */
  var dk = darkness();
  if (!gfx.p3d) { ctx.fillStyle = 'rgba(25,0,60,' + (dk * 0.42).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }
  if (!gfx.low && !gfx.p3d) {
    if (!sunsetGrad && ctx.createLinearGradient) {
      sunsetGrad = ctx.createLinearGradient(0, 0, 0, VH);
      sunsetGrad.addColorStop(0, 'rgba(255,63,164,0.18)'); sunsetGrad.addColorStop(0.5, 'rgba(155,92,255,0)'); sunsetGrad.addColorStop(1, 'rgba(63,246,255,0.12)');
    }
    if (sunsetGrad) { ctx.fillStyle = sunsetGrad; ctx.fillRect(0, 0, VW, VH); }
  }
  /* --- TOP RIGHT: cash / health / armor / weapon / stars --- */
  var R = VW - 10 * u, top = 10 * u, bw = 132 * u;
  font(22 * u, true); text('$' + pad8(G.cash), R, top + 20 * u, '#2ee59d', 'right');
  y = top + 30 * u;
  var hpLow = player.hp < 25, arLow = player.armor > 0 && player.armor < 25;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(R - bw, y, bw, 8 * u); ctx.fillRect(R - bw, y + 11 * u, bw, 6 * u);
  ctx.fillStyle = hpLow && blink ? '#ffffff' : '#ff3fa4'; ctx.fillRect(R - bw, y, bw * player.hp / 100, 8 * u);
  ctx.fillStyle = arLow && blink ? '#ffffff' : '#3ff6ff'; ctx.fillRect(R - bw, y + 11 * u, bw * player.armor / 100, 6 * u);
  y += 22 * u;
  var box = 30 * u;
  ctx.fillStyle = 'rgba(20,0,40,0.7)'; ctx.fillRect(R - box, y, box, box);
  ctx.strokeStyle = '#9b5cff'; ctx.lineWidth = 2; ctx.strokeRect(R - box, y, box, box);
  var inTank = player.car && player.car.type === 'tank';
  weaponIcon(inTank ? 3 : player.weap, R - box / 2, y + box / 2, box * 0.8);
  font(12 * u, true);
  text(inTank ? 'CANNON  INF' : (WEAPONS[player.weap].name + ' ' + (player.weap === 0 ? '--' : player.ammo[player.weap])), R - box - 6 * u, y + box * 0.65, '#ffffff', 'right');
  y += box + 14 * u;
  for (i = 0; i < 5; i++) {
    var on = i < G.wanted, evading = G.wanted > 0 && G.t - G.lastSeen > 2;
    drawStar(R - 8 * u - i * 18 * u, y, 7.5 * u, on ? ((evading && blink) ? '#888' : '#ffe600') : 'rgba(255,255,255,0.15)');
  }
  /* --- TOP LEFT: protagonist + relationship stats + minimap --- */
  var L = 10 * u; font(13 * u, true); text(CHARS[player.ch].name, L, top + 12 * u, CHARS[player.ch].color);
  font(10 * u, false); text('TRUST ' + G.trust + '  JOBS ' + G.jobs + '  SCORE ' + G.score, L, top + 25 * u, '#e0d0ff');
  var mm = Math.round(84 * u), my = top + 32 * u;
  if (minimapCanvas && VH > 300) {
    ctx.globalAlpha = 0.85; ctx.drawImage(minimapCanvas, L, my, mm, mm); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 2; ctx.strokeRect(L, my, mm, mm);
    var s = mm / WORLD;
    for (i = 0; i < cars.length; i++) { if (cars[i].role && !cars[i].dead) { ctx.fillStyle = blink ? '#ff1f3d' : '#1f6dff'; ctx.fillRect(L + cars[i].x * s - 1.5, my + cars[i].y * s - 1.5, 3, 3); } }
    if (G.mission) { var tg = missionTarget(G.mission.def); if (tg) { ctx.fillStyle = '#ffe600'; ctx.fillRect(L + tg.x * s - 3, my + tg.y * s - 3, 6, 6); } }
    mpMinimap(L, my, s);
    ctx.fillStyle = '#fff'; ctx.fillRect(L + player.x * s - 2, my + player.y * s - 2, 4, 4);
    font(9 * u, false); text(gfx.fps + 'FPS ' + pipeName() + (G.gravMul < 1 ? ' LOWG' : ''), L, my + mm + 11 * u, '#9b8fbf');
  }
  /* --- objective line & off-screen arrow --- */
  var narrow = VW < 560, ty = narrow ? top + 150 * u : top + 4 * u;
  if (G.mission) {
    var m = G.mission.def, obj = m.type === 'goto' ? 'Go to ' + (m.loc ? LOC[m.loc].name : 'the GPS mark') :
      (m.type === 'deliver' ? 'Deliver a car to ' + (m.loc ? LOC[m.loc].name : 'the GPS mark') :
      (m.type === 'heist' ? 'Open the phone (P) > HEIST app' : 'Lose your wanted level'));
    font(12 * u, true); text(m.name.toUpperCase() + ': ' + obj, VW / 2, ty + 12 * u, '#ffe600', 'center');
    var tgt = missionTarget(m);
    if (tgt) {
      var sx2 = (tgt.x - cam.x) * cam.zoom + VW / 2, sy2 = (tgt.y - cam.y) * cam.zoom + VH / 2, ts3 = gfx.p3d ? w2s3(tgt.x, tgt.y, 40) : null;
      if (gfx.p3d) { sx2 = ts3 ? ts3.x : -1; sy2 = ts3 ? ts3.y : -1; }
      if (sx2 < 0 || sx2 > VW || sy2 < 0 || sy2 > VH) {
        var aa = gfx.p3d ? wrapA(Math.atan2(tgt.y - C3.y, tgt.x - C3.x) - C3.yaw) - PI / 2 : Math.atan2(sy2 - VH / 2, sx2 - VW / 2), ar = Math.min(VW, VH) * 0.38;
        var axp = VW / 2 + Math.cos(aa) * ar, ayp = VH / 2 + Math.sin(aa) * ar;
        ctx.save(); ctx.translate(axp, ayp); ctx.rotate(aa); ctx.fillStyle = '#ffe600';
        ctx.beginPath(); ctx.moveTo(14 * u, 0); ctx.lineTo(-8 * u, -9 * u); ctx.lineTo(-8 * u, 9 * u); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }
  /* --- phone notification toasts --- */
  var tw = narrow ? VW - 20 * u : 300 * u, tx = narrow ? 10 * u : VW / 2 - tw / 2, ty2 = ty + 20 * u;
  for (i = 0; i < toasts.length; i++) {
    var t = toasts[i]; font(11 * u, false);
    var lines = wrapLines(t.text, tw - 20 * u), th = (18 + lines.length * 13) * u;
    ctx.globalAlpha = Math.min(1, t.t * 2);
    ctx.fillStyle = 'rgba(15,0,30,0.85)'; rrect(tx, ty2, tw, th, 8 * u); ctx.fill();
    ctx.strokeStyle = t.c; ctx.lineWidth = 1.5; ctx.stroke();
    font(10 * u, true); text(t.from + '  ' + (t.from === 'ROSA' || t.from === 'DEX' ? '[iMessage]' : ''), tx + 10 * u, ty2 + 13 * u, t.c);
    font(11 * u, false);
    for (var l = 0; l < lines.length; l++) { text(lines[l], tx + 10 * u, ty2 + (27 + l * 13) * u, '#ffffff'); }
    ctx.globalAlpha = 1; ty2 += th + 5 * u;
  }
  /* --- FlexTok live feed parody --- */
  if (feed.t > 0) {
    var fw = Math.min(170 * u, VW * 0.46), fh = 128 * u, fx = 8 * u, fy = Math.max(ty2 + 4 * u, VH * 0.36);
    if (fy + fh > VH - 150 * u && usingTouch) { fy = Math.max(ty2, VH - 150 * u - fh); }
    ctx.globalAlpha = Math.min(1, feed.t);
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; rrect(fx, fy, fw, fh, 10 * u); ctx.fill(); ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ff1f3d'; ctx.fillRect(fx + 8 * u, fy + 8 * u, 38 * u, 14 * u);
    font(10 * u, true); text('LIVE', fx + 27 * u, fy + 19 * u, '#fff', 'center');
    text(Math.round(feed.viewers / 100) / 10 + 'K watching', fx + 52 * u, fy + 19 * u, '#fff');
    font(10 * u, true); text('FlexTok  ' + feed.handle, fx + 8 * u, fy + 36 * u, '#3ff6ff');
    font(10 * u, false);
    for (i = 0; i < feed.lines.length; i++) { text(feed.lines[i].length > 24 ? feed.lines[i].substr(0, 24) : feed.lines[i], fx + 8 * u, fy + (52 + i * 14) * u, i === feed.lines.length - 1 ? '#ffe600' : '#ddd'); }
    ctx.globalAlpha = 1;
  }
  mpDrawHUD();
  /* --- retro flashing center message --- */
  if (flashMsg.t > 0) {
    var cols = ['#ff3fa4', '#3ff6ff', '#ffe600', '#9b5cff'];
    font(26 * u, true); text(flashMsg.a, VW / 2, VH * 0.42, cols[Math.floor(G.t * 10) % 4], 'center');
    if (flashMsg.b) { font(13 * u, true); text(flashMsg.b, VW / 2, VH * 0.42 + 22 * u, '#ffffff', 'center'); }
  }
  /* --- intro controls hint --- */
  if (G.hintT > 0 && !G.phone) {
    font(11 * u, false);
    var hint = pad.on ? 'L-stick move/steer | R2 gas/fire | L2 brake | R1 fire | TRIANGLE car | L1 wheel | OPTIONS phone | SQUARE switch' : usingTouch ? 'D-PAD move | GAS/BRK drive | ENTER car | FIRE | WPN wheel | PHONE | 3x tap top-left = cheats'
      : 'WASD/Arrows move | E enter car | Click/J fire | Q wheel | P phone | C switch | G graphics | ~ console';
    var hl = wrapLines(hint, VW - 40 * u);
    for (i = 0; i < hl.length; i++) { text(hl[i], VW / 2, VH * 0.62 + i * 14 * u, '#e0d0ff', 'center'); }
  }
  /* --- busted / flatlined --- */
  if (G.over > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH);
    font(40 * u, true); text(G.overText, VW / 2, VH / 2, G.overText === 'CUFFED' ? '#3ff6ff' : '#ff1f3d', 'center');
    font(12 * u, false); text(G.overSub, VW / 2, VH / 2 + 26 * u, '#fff', 'center');
  }
}

function btn(x, y, w, h, label, c, fn, sub) {
  ctx.fillStyle = 'rgba(30,5,60,0.9)'; rrect(x, y, w, h, 6 * U); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
  font(11 * U, true); text(label, x + w / 2, y + h / 2 + (sub ? -1 : 4) * U, c, 'center');
  if (sub) { font(9 * U, false); text(sub, x + w / 2, y + h / 2 + 11 * U, '#ccc', 'center'); }
  uiButtons.push({ x: x, y: y, w: w, h: h, fn: fn });
}

var phoneRect = { x: 0, y: 0, w: 0, h: 0 };
var PHONE_APPS = [
  { id: 'heist', label: 'HEIST', c: '#2ee59d' }, { id: 'jobs', label: 'JOBS', c: '#ffe600' },
  { id: 'trust', label: 'TRUST', c: '#ff3fa4' }, { id: 'feed', label: 'FLEXTOK', c: '#3ff6ff' },
  { id: 'settings', label: 'SETTINGS', c: '#9b5cff' }, { id: 'switch', label: 'SWITCH', c: '#ff8a1f' },
  { id: 'online', label: 'ONLINE', c: '#2ee59d' }
];
function phoneKey(i) { if (G.page === 'home') { openApp(PHONE_APPS[i].id); } else if (i === 0) { G.page = 'home'; } }
function openApp(id) {
  if (id === 'switch') { switchChar(); return; }
  G.page = id;
}
function drawPhone() {
  var u = U, pw = Math.min(VW * 0.88, 230 * u), ph = Math.min(VH * 0.8, 400 * u);
  var px = VW > 640 ? VW - pw - 24 * u : (VW - pw) / 2, py = (VH - ph) / 2 - (usingTouch ? 20 * u : 0);
  phoneRect.x = px; phoneRect.y = py; phoneRect.w = pw; phoneRect.h = ph;
  ctx.fillStyle = '#0c0c12'; rrect(px, py, pw, ph, 18 * u); ctx.fill(); ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 3; ctx.stroke();
  var sx = px + 10 * u, sy = py + 26 * u, sw = pw - 20 * u, sh = ph - 46 * u;
  var g = ctx.createLinearGradient && !gfx.low ? ctx.createLinearGradient(0, sy, 0, sy + sh) : null;
  if (g) { g.addColorStop(0, '#3a0b5c'); g.addColorStop(1, '#0b3a5c'); ctx.fillStyle = g; } else { ctx.fillStyle = '#25103d'; }
  ctx.fillRect(sx, sy, sw, sh);
  font(10 * u, true); text('PALMETTO OS', sx + 6 * u, py + 18 * u, '#fff');
  var hh = Math.floor(G.tod * 24), mmn = Math.floor((G.tod * 24 - hh) * 60);
  text((hh < 10 ? '0' : '') + hh + ':' + (mmn < 10 ? '0' : '') + mmn, sx + sw - 6 * u, py + 18 * u, '#fff', 'right');
  var cx = sx + 10 * u, cw = sw - 20 * u, y = sy + 12 * u, i;
  if (G.page === 'home') {
    var cols = 2, gw = (cw - 10 * u) / cols, gh = Math.min(58 * u, (sh - 70 * u) / 4);
    for (i = 0; i < PHONE_APPS.length; i++) {
      (function (app, idx) {
        btn(cx + (idx % cols) * (gw + 10 * u), y + Math.floor(idx / cols) * (gh + 8 * u), gw, gh, app.label, app.c, function () { openApp(app.id); }, '[' + (idx < 4 ? (idx + 1) : '-') + ']');
      })(PHONE_APPS[i], i);
    }
  } else {
    btn(cx, sy + sh - 34 * u, cw, 26 * u, '< BACK', '#ffffff', function () { G.page = 'home'; });
    font(14 * u, true); text(G.page === 'feed' ? 'FLEXTOK' : G.page.toUpperCase(), cx, y + 12 * u, '#ffe600'); y += 30 * u;
    font(10 * u, false);
    var para = function (s, c) { var ls = wrapLines(s, cw); for (var k = 0; k < ls.length; k++) { text(ls[k], cx, y, c || '#eee'); y += 13 * u; } y += 4 * u; };
    if (G.page === 'heist') {
      para('Target: Coral Bay Federal Credit server. Payout $50,000. Trace risk 35% (2-star investigation).');
      if (G.heist.run) {
        ctx.fillStyle = '#111'; ctx.fillRect(cx, y, cw, 14 * u); ctx.fillStyle = '#2ee59d'; ctx.fillRect(cx, y, cw * G.heist.prog, 14 * u);
        y += 22 * u; para('> bruteforcing ' + Math.floor(G.heist.prog * 100) + '% ...', '#2ee59d');
      } else if (G.heist.cd > 0) { para('Server cooling down: ' + Math.ceil(G.heist.cd) + 's', '#ff8a1f'); }
      else { btn(cx, y, cw, 34 * u, 'RUN EXPLOIT', '#2ee59d', runHeist); }
    } else if (G.page === 'jobs') {
      if (G.mission) { para('ACTIVE: ' + G.mission.def.name, '#ffe600'); para(G.mission.def.text);
        btn(cx, y, cw, 28 * u, 'ABANDON JOB', '#ff3b1f', function () { G.mission = null; G.missionDelay = 15; G.trust = clamp(G.trust - 2, 0, 100); });
      } else { para('No active job. Next one in ' + Math.max(0, Math.ceil(G.missionDelay)) + 's.');
        btn(cx, y, cw, 28 * u, 'CALL FOR WORK NOW', '#ffe600', function () { G.missionDelay = 0; }); }
      y += 40 * u; para('Story progress: ' + Math.min(G.missionIdx, STORY.length) + '/' + STORY.length, '#ccc');
    } else if (G.page === 'trust') {
      para('ROSA + DEX', '#ff3fa4');
      ctx.fillStyle = '#111'; ctx.fillRect(cx, y, cw, 12 * u); ctx.fillStyle = '#ff3fa4'; ctx.fillRect(cx, y, cw * G.trust / 100, 12 * u); y += 22 * u;
      para(G.trust > 75 ? '"Ride or die. Literally."' : (G.trust > 40 ? '"We are good. Mostly."' : '"Are you even listening to me?"'));
      para('Jobs: ' + G.jobs + '   Score: ' + G.score);
      para('Active: ' + CHARS[player.ch].name + ' - ' + CHARS[player.ch].perk, CHARS[player.ch].color);
    } else if (G.page === 'feed') {
      para('Followers: ' + G.followers, '#3ff6ff');
      para('Chaos goes viral. Pursuits and explosions get streamed live by bystanders.');
      btn(cx, y, cw, 28 * u, 'GO LIVE NOW', '#3ff6ff', function () { feed.cd = 0; feedTrigger('SELFIE'); });
    } else if (G.page === 'online') {
      para('Status: ' + MP.status, MP.on ? '#2ee59d' : '#ff8a1f');
      para('You: ' + MP.name);
      var nm = []; for (var pid in MP.players) { if (MP.players.hasOwnProperty(pid)) { nm.push(MP.players[pid].name); } }
      para(nm.length ? 'In lobby: ' + nm.join(', ') : 'No other players yet.');
      btn(cx, y, cw, 28 * u, MP.on ? 'RECONNECT' : 'JOIN LOBBY', '#2ee59d', mpJoinPrompt); y += 36 * u;
      para('Host: run node manager.js --serve on a PC, open http://PC-IP:8080 on every device (PC, phone, PS4/PS5).', '#aaa');
    } else if (G.page === 'settings') {
      btn(cx, y, cw, 28 * u, 'GRAPHICS: ' + gfx.mode.toUpperCase(), '#9b5cff', cycleGfx); y += 34 * u;
      btn(cx, y, cw, 28 * u, 'CONTROLS: ' + (usingTouch ? 'TOUCH' : 'KEYS'), '#9b5cff', function () { usingTouch = !usingTouch; }); y += 34 * u;
      btn(cx, y, cw, 28 * u, 'SAVE GAME', '#9b5cff', function () { save(); flash('SAVED', ''); }); y += 34 * u;
      para('FPS ' + gfx.fps + ' | ' + pipeName() + ' | host: ' + hostName(), '#aaa');
    }
  }
}
function wheelSlotAt(x, y) {
  var a = Math.atan2(y - VH / 2, x - VW / 2);           // 0 top, 1 right, 2 bottom, 3 left
  var s = Math.round(wrapA(a + PI / 2) / (PI / 2)); return ((s % 4) + 4) % 4;
}
function drawWheel() {
  var cx = VW / 2, cy = VH / 2, R = Math.min(VW, VH) * 0.34, r = R * 0.38, i;
  ctx.fillStyle = 'rgba(10,0,25,0.55)'; ctx.fillRect(0, 0, VW, VH);
  for (i = 0; i < 4; i++) {
    var a0 = -PI / 2 + i * PI / 2 - PI / 4, a1 = a0 + PI / 2, sel = i === G.wheelSel;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1, false); ctx.arc(cx, cy, r, a1, a0, true); ctx.closePath();
    ctx.fillStyle = sel ? 'rgba(255,63,164,0.55)' : 'rgba(30,10,60,0.8)'; ctx.fill();
    ctx.strokeStyle = sel ? '#ffe600' : '#3ff6ff'; ctx.lineWidth = 2; ctx.stroke();
    var am = (a0 + a1) / 2, ix = cx + Math.cos(am) * (R + r) / 2, iy = cy + Math.sin(am) * (R + r) / 2;
    ctx.globalAlpha = player.owned[i] ? 1 : 0.3; weaponIcon(i, ix, iy - 6 * U, 30 * U); ctx.globalAlpha = 1;
    font(10 * U, true); text(WEAPONS[i].name, ix, iy + 18 * U, player.owned[i] ? '#fff' : '#777', 'center');
    if (i > 0 && player.owned[i]) { font(9 * U, false); text('' + player.ammo[i], ix, iy + 30 * U, '#ffe600', 'center'); }
  }
  font(10 * U, true); text('TIME x0.2', cx, cy + 4 * U, '#ffe600', 'center');
}
function drawConsole() {
  var h = (34 + G.conLog.length * 14) * U;
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, VW, h); ctx.strokeStyle = '#2ee59d'; ctx.strokeRect(0, 0, VW, h);
  font(12 * U, true);
  for (var i = 0; i < G.conLog.length; i++) { text(G.conLog[i].substr(0, 60), 10 * U, (16 + i * 14) * U, '#9fffcf'); }
  text('> ' + G.conText + (Math.floor(G.t * 3) % 2 ? '_' : ''), 10 * U, h - 10 * U, '#2ee59d');
}
function drawCheatPad() {
  var keysL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), all = keysL.concat(['DEL', 'OK', 'X']), cols = 6;
  var cell = Math.min((VW - 16) / cols, (VH * 0.55) / 5), x0 = (VW - cell * cols) / 2, y0 = VH - cell * 5 - 10, i;
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, y0 - 44 * U, VW, VH - y0 + 44 * U);
  font(16 * U, true); text('CODE: ' + G.padText + '_', VW / 2, y0 - 16 * U, '#2ee59d', 'center');
  for (i = 0; i < all.length; i++) {
    (function (k, idx) {
      btn(x0 + (idx % cols) * cell + 2, y0 + Math.floor(idx / cols) * cell + 2, cell - 4, cell - 4, k, k === 'OK' ? '#2ee59d' : (k === 'X' ? '#ff3b1f' : '#3ff6ff'), function () {
        if (k === 'DEL') { G.padText = G.padText.slice(0, -1); }
        else if (k === 'OK') { if (!runCheat(G.padText)) { flash('INVALID CODE', ''); } G.padText = ''; G.pad = false; }
        else if (k === 'X') { G.pad = false; }
        else if (G.padText.length < 30) { G.padText += k; }
      });
    })(all[i], i);
  }
}
function drawTouch() {
  var u = U, d = TB.dpad, ts = touchState(), i;
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = '#3ff6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, PI2, false); ctx.stroke();
  var dirs = [[0, -1, ts.up], [1, 0, ts.right], [0, 1, ts.down], [-1, 0, ts.left]];
  for (i = 0; i < 4; i++) {
    var bx = d.x + dirs[i][0] * d.r * 0.62, by = d.y + dirs[i][1] * d.r * 0.62;
    ctx.fillStyle = dirs[i][2] ? 'rgba(63,246,255,0.8)' : 'rgba(20,0,40,0.6)';
    ctx.beginPath(); ctx.arc(bx, by, d.r * 0.33, 0, PI2, false); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(dirs[i][1], dirs[i][0])); ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(8 * u, 0); ctx.lineTo(-5 * u, -7 * u); ctx.lineTo(-5 * u, 7 * u); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  var list = [['fire', ts.fire], ['gas', ts.gas], ['brake', ts.brake], ['act', false], ['weap', G.wheel], ['phone', G.phone]];
  for (i = 0; i < list.length; i++) {
    var b = TB[list[i][0]];
    ctx.fillStyle = list[i][1] ? b.c : 'rgba(20,0,40,0.65)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, PI2, false); ctx.fill();
    ctx.strokeStyle = b.c; ctx.lineWidth = 2.5; ctx.stroke();
    font(Math.max(8, b.r * 0.42), true); text(b.label, b.x, b.y + b.r * 0.16, '#fff', 'center');
  }
  ctx.globalAlpha = 1;
}

function render() {
  uiButtons.length = 0;
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  if (gfx.p3d) { renderWorld3D(); } else { renderWorld(); }
  drawHUD();
  if (G.phone) { drawPhone(); }
  if (usingTouch && G.over <= 0) { drawTouch(); }
  if (G.wheel) { drawWheel(); }
  if (G.pad) { drawCheatPad(); }
  if (G.console) { drawConsole(); }
}

