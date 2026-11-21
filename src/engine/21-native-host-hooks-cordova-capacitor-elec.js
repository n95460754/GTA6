/* =====================================================================
   21. NATIVE HOST HOOKS (Cordova, Capacitor, Electron, NW.js)
   ===================================================================== */
function hostName() {
  return PLATFORM.electron ? 'electron' : (PLATFORM.nw ? 'nw.js' : (PLATFORM.capacitor ? 'capacitor' : (window.cordova ? 'cordova' : (PLATFORM.android ? 'android-web' : 'browser'))));
}
function pauseGame() { G.paused = true; save(); }
function resumeGame() { G.paused = false; warmup = 1.5; gfx.frames = 0; gfx.acc = 0; }
function backButton() {
  if (G.console) { G.console = false; } else if (G.pad) { G.pad = false; } else if (G.wheel) { G.wheel = false; }
  else if (G.phone && G.page !== 'home') { G.page = 'home'; } else { togglePhone(); }
}
function lockLandscape() {
  try {
    var so = window.screen && window.screen.orientation;
    if (so && so.lock) { var r = so.lock('landscape'); if (r && r['catch']) { r['catch'](function () { }); } }
  } catch (e) { }
}
function initHosts() {
  /* Cordova: lifecycle + hardware back button + keep screen awake */
  on(document, 'deviceready', function () {
    PLATFORM.cordova = true; lockLandscape();
    on(document, 'backbutton', function (e) { stop(e); backButton(); });
    on(document, 'pause', pauseGame); on(document, 'resume', resumeGame);
    if (window.plugins && window.plugins.insomnia) { window.plugins.insomnia.keepAwake(); }
    if (window.StatusBar && window.StatusBar.hide) { window.StatusBar.hide(); }
  });
  /* Capacitor: global bridge (no imports needed inside the WebView) */
  var cap = window.Capacitor;
  if (cap && cap.Plugins && cap.Plugins.App && cap.Plugins.App.addListener) {
    cap.Plugins.App.addListener('backButton', function () { backButton(); });
    cap.Plugins.App.addListener('appStateChange', function (st) { if (st && st.isActive) { resumeGame(); } else { pauseGame(); } });
    lockLandscape();
  }
  /* Android intents forwarded by a wrapper: window.NeonTide.intent('cheat', 'MONEYRAIN') */
  /* NW.js: F11 fullscreen */
  if (PLATFORM.nw && window.nw && window.nw.Window) {
    on(window, 'keydown', function (e) { if ((e.keyCode || e.which) === 122) { window.nw.Window.get().toggleFullscreen(); } });
  }
  /* Browser/WebView lifecycle */
  on(document, 'visibilitychange', function () { if (document.hidden) { pauseGame(); } else { resumeGame(); } });
  on(window, 'blur', function () { keys = {}; });
}
/* Public API for host wrappers, automated test rigs and the hot-reloader. */
window.NeonTide = {
  version: '1.0.0',
  pause: pauseGame, resume: resumeGame, save: save,
  cheat: function (c) { return runCheat(c); },
  setGraphics: function (m) { gfx.mode = m; if (m === 'top' || m === 'persp' || m === '3d') { setPipe(m, 'host'); } },
  intent: function (action, data) { if (action === 'cheat') { runCheat(data); } else if (action === 'phone') { togglePhone(); } else if (action === 'back') { backButton(); } },
  state: function () { return { fps: gfx.fps, low: gfx.low, pipe: pipeName(), wanted: G.wanted, cash: G.cash, hp: player.hp, armor: player.armor, inCar: !!player.car, cars: cars.length, peds: peds.length, police: countPolice(), gravity: G.gravMul, weapon: player.weap, ammo: player.ammo.slice(0), t: G.t, mission: G.mission ? G.mission.def.name : null }; },
  debug: { G: G, player: player, cars: cars, gfx: gfx, MP: MP, C3: C3 }
};
function countPolice() { var n = 0; for (var i = 0; i < cars.length; i++) { if (cars[i].role && cars[i].ai === 'police') { n++; } } return n; }

