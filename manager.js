#!/usr/bin/env node
/*
 * NEON TIDE - Game Manager (tester, hot-reload server, build router)
 *
 *   node manager.js              interactive menu
 *   node manager.js --test       ES5 lint + forbidden-API scan + headless dry run
 *   node manager.js --serve [p]  LAN dev server with hot reload (default port 8080)
 *   node manager.js --build      lint -> clean -> compress -> .exe/.AppImage/.dmg/.apk into ./dist
 *   node manager.js --build --only=win,linux,mac,android,nw
 *
 * Written in ES5 so the manager itself runs on old Node versions too.
 * Only Node built-ins are required; `acorn` (devDependency) gives an exact
 * ES5 parse, otherwise a regex fallback scanner is used.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var vm = require('vm');
var os = require('os');
var zlib = require('zlib');
var cp = require('child_process');

var ROOT = __dirname;
var GAME = path.join(ROOT, 'app', 'index.html');   // generated from src/ by scripts/bundle.js
var bundle = require('./scripts/bundle.js');
var DIST = path.join(ROOT, 'dist');
var args = process.argv.slice(2);

function log(tag, msg) { console.log('\x1b[35m[' + tag + ']\x1b[0m ' + msg); }
function ok(msg) { console.log('\x1b[32m  PASS\x1b[0m ' + msg); }
function bad(msg) { console.log('\x1b[31m  FAIL\x1b[0m ' + msg); }
function arg(name) { for (var i = 0; i < args.length; i++) { if (args[i].indexOf('--' + name + '=') === 0) { return args[i].split('=')[1]; } } return null; }

function readGame() { bundle(); return fs.readFileSync(GAME, 'utf8'); }
function extractScript(html) {
  var m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) { throw new Error('No inline <script> found in index.html'); }
  return m[1];
}

/* ------------------------------------------------------------------ */
/* 1. ES5 COMPLIANCE + FORBIDDEN API SCAN                              */
/* ------------------------------------------------------------------ */
function es5Check(src) {
  var errors = [], acorn = null;
  try { acorn = require('acorn'); } catch (e) { acorn = null; }
  if (acorn) {
    try { acorn.parse(src, { ecmaVersion: 5, sourceType: 'script' }); }
    catch (e) {
      var line = src.split('\n')[(e.loc ? e.loc.line : 1) - 1] || '';
      errors.push('Parser (ecmaVersion 5): ' + e.message + '\n      ' + line.trim());
    }
  } else {
    /* fallback heuristic when acorn is not installed */
    var rules = [[/(^|[^\w.$])(let|const)\s+[\w$[{]/, 'let/const'], [/=>/, 'arrow function'], [/(^|[^\w.$])class\s+\w/, 'class'],
      [/`/, 'template literal'], [/\basync\s+function|\bawait\s/, 'async/await'], [/\.\.\.[\w$[]/, 'spread/rest']];
    /* blank out block comments but keep line numbers stable */
    var clean = src.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); });
    var lines = clean.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/\/\/.*$/, '').replace(/'(?:[^'\\]|\\.)*'/g, "''");
      for (var r = 0; r < rules.length; r++) { if (rules[r][0].test(l)) { errors.push('line ' + (i + 1) + ': ' + rules[r][1] + ' -> ' + src.split('\n')[i].trim()); } }
    }
  }
  /* APIs that break the hardware-agnostic / legacy contract */
  var banned = [[/getContext\(\s*['"](webgl|experimental-webgl|webgl2)/, 'WebGL context'], [/AudioContext/, 'Web Audio API'],
    [/new\s+Promise|Promise\./, 'Promise'], [/\bfetch\s*\(/, 'fetch()'], [/\.forEach\s*\(/, 'Array.forEach (missing on IE8-era engines)'],
    [/<img|\.png|\.jpg|\.mp3|\.ogg|\.wav/, 'external asset reference'], [/\bSymbol\(|\bnew Map\(|\bnew Set\(/, 'ES6 built-in']];
  for (var b = 0; b < banned.length; b++) { if (banned[b][0].test(src)) { errors.push('Forbidden: ' + banned[b][1]); } }
  return errors;
}

/* ------------------------------------------------------------------ */
/* 2. MOCK HEADLESS ENVIRONMENT (dry run without a browser)            */
/* ------------------------------------------------------------------ */
function makeMockDom() {
  var noop = function () {};
  var gradient = { addColorStop: noop };
  var ctxCalls = { n: 0 };
  /* Every unknown 2D-context method becomes a counting no-op. */
  var ctx = new Proxy({}, {
    get: function (t, k) {
      if (k in t) { return t[k]; }
      if (k === 'measureText') { return function (s) { return { width: String(s).length * 7 }; }; }
      if (k === 'createLinearGradient' || k === 'createRadialGradient') { return function () { return gradient; }; }
      return function () { ctxCalls.n++; };
    },
    set: function (t, k, v) { t[k] = v; return true; }
  });
  function makeCanvas() {
    return { width: 0, height: 0, style: {}, getContext: function () { return ctx; }, addEventListener: noop,
      getBoundingClientRect: function () { return { left: 0, top: 0 }; } };
  }
  var canvas = makeCanvas();
  var listeners = {};
  var rafQueue = [];
  var clock = { t: 1000 };
  var store = {};
  var win = {
    innerWidth: 800, innerHeight: 450, devicePixelRatio: 1,
    location: { search: '' },
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    requestAnimationFrame: function (cb) { rafQueue.push(cb); return rafQueue.length; },
    setTimeout: function (fn) { rafQueue.push(fn); return 1; },
    localStorage: { getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = String(v); } },
    JSON: JSON, console: { error: function (e) { console.log('    game error: ' + e); }, log: noop },
    screen: {}
  };
  var doc = {
    hidden: false,
    getElementById: function () { return canvas; },
    createElement: function () { return makeCanvas(); },
    documentElement: { clientWidth: 800, clientHeight: 450 },
    body: { innerHTML: '' },
    addEventListener: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  };
  win.document = doc; win.window = win;
  var DateMock = function () { return { getTime: function () { return clock.t; } }; };
  return { win: win, doc: doc, rafQueue: rafQueue, clock: clock, listeners: listeners, ctxCalls: ctxCalls, Date: DateMock };
}

function dryRun(src, frames) {
  var env = makeMockDom();
  var sandbox = {
    window: env.win, document: env.doc, navigator: { userAgent: 'NeonTideHeadless/1.0', maxTouchPoints: 0 },
    Date: env.Date, Math: Math, JSON: JSON, parseInt: parseInt, parseFloat: parseFloat, String: String, Array: Array, Object: Object,
    console: { error: function (e) { throw new Error('game console.error: ' + e); }, log: function () {} }
  };
  sandbox.window.navigator = sandbox.navigator;
  vm.createContext(sandbox);
  var heap0 = process.memoryUsage().heapUsed;
  vm.runInContext(src, sandbox, { filename: 'index.html#script', timeout: 10000 });
  var api = env.win.NeonTide;
  if (!api) { throw new Error('window.NeonTide API was not exported'); }
  function key(code, down) { var fns = env.listeners[down ? 'keydown' : 'keyup'] || []; for (var i = 0; i < fns.length; i++) { fns[i]({ keyCode: code, preventDefault: function () {} }); } }
  function step(n) {
    for (var f = 0; f < n; f++) {
      env.clock.t += 16;
      var q = env.rafQueue.splice(0, env.rafQueue.length);
      for (var i = 0; i < q.length; i++) { q[i](); }
    }
  }
  var report = [];
  step(60);
  var s = api.state();
  report.push(['boot: ' + s.cars + ' cars, ' + s.peds + ' peds', s.cars >= 15 && s.peds === 20]);
  /* drive forward for 2 seconds */
  key(69, true); key(69, false); key(87, true); step(120); key(87, false);
  report.push(['player entered parked car & drove', api.state().inCar]);
  var cheats = { TOOLBOX: function (st) { return st.ammo[3] > 0; }, MAXHEAT: function (st) { return st.wanted === 5; },
    LOWGRAVITY: function (st) { return st.gravity === 0.15; }, BLANKSLATE: function (st) { return st.wanted === 0 && st.police === 0; },
    MEDSUPPLY: function (st) { return st.hp === 100 && st.armor === 100; } };
  for (var c in cheats) {
    for (var i = 0; i < c.length; i++) { key(c.charCodeAt(i), true); key(c.charCodeAt(i), false); }
    step(c === 'MAXHEAT' ? 300 : 5);
    report.push(['passive cheat ' + c, cheats[c](api.state())]);
    if (c === 'MAXHEAT') { report.push(['5-star police deployed (' + api.state().police + ' units)', api.state().police >= 3]); }
  }
  report.push(['console cheat path (NeonTide.cheat)', api.cheat('HEAVYMETAL') === true]);
  api.setGraphics('top'); step(30); report.push(['top-down pipe renders', api.state().low === true]);
  api.setGraphics('persp'); step(30); report.push(['perspective pipe renders', api.state().low === false]);
  step(frames || 1200);
  var heap = (process.memoryUsage().heapUsed - heap0) / 1048576;
  report.push(['ran ' + (frames || 1200) + ' extra frames, ' + env.ctxCalls.n + ' draw calls', true]);
  report.push(['heap growth ' + heap.toFixed(1) + ' MB (< 16 MB budget)', heap < 16]);
  return report;
}

function runTests() {
  log('TEST', 'ES5 compliance & forbidden API scan: ' + GAME);
  var html = readGame(), src = extractScript(html), failed = 0;
  var errs = es5Check(src);
  if (errs.length) { for (var i = 0; i < errs.length; i++) { bad(errs[i]); } failed += errs.length; }
  else { ok('strict ES5 (' + src.length + ' chars) - safe for legacy WebKit / IE9+ / Android 2.x'); }
  var kb = Buffer.byteLength(html) / 1024;
  if (kb < 512) { ok('single file size ' + kb.toFixed(1) + ' KB'); } else { bad('index.html is ' + kb.toFixed(0) + ' KB'); failed++; }
  if (!errs.length) {
    log('TEST', 'Headless dry run (mock DOM + mock Canvas 2D, no browser)');
    try {
      var rep = dryRun(src, 1200);
      for (var j = 0; j < rep.length; j++) { if (rep[j][1]) { ok(rep[j][0]); } else { bad(rep[j][0]); failed++; } }
    } catch (e) { bad('dry run crashed: ' + (e.stack || e)); failed++; }
  }
  log('TEST', failed ? failed + ' failure(s)' : 'ALL GREEN');
  return failed === 0;
}

/* ------------------------------------------------------------------ */
/* 3. HOT-RELOAD DEV SERVER                                            */
/* ------------------------------------------------------------------ */
/* ES5 client snippet: XHR polling works on every engine back to Android 1.x
   (no WebSocket / EventSource needed). It saves game state, then reloads. */
var RELOAD_SNIPPET = '<script>(function(){var v=null;function p(){var x=new XMLHttpRequest();' +
  'x.onreadystatechange=function(){if(x.readyState===4){if(x.status===200){if(v===null){v=x.responseText;}' +
  'else if(x.responseText!==v){try{if(window.NeonTide){window.NeonTide.save();}}catch(e){}location.reload();return;}}' +
  'setTimeout(p,800);}};x.open("GET","/__version?"+new Date().getTime(),true);x.send(null);}setTimeout(p,800);})();</script>';

function lanAddresses() {
  var out = [], ifs = os.networkInterfaces(), k, i;
  for (k in ifs) { for (i = 0; i < ifs[k].length; i++) { if (ifs[k][i].family === 'IPv4' || ifs[k][i].family === 4) { out.push(ifs[k][i].address); } } }
  return out;
}

function serve(port) {
  var version = 1, clients = {}, timer = null;
  function check() {
    var errs = es5Check(extractScript(readGame()));
    if (errs.length) { log('HOT', 'Change REJECTED - devices keep the last good build:'); errs.forEach(function (e) { bad(e); }); return; }
    version++; log('HOT', 'src/ changed -> v' + version + ' pushed to ' + Object.keys(clients).length + ' device(s)');
  }
  /* watch the modular sources; every save re-bundles and pushes */
  var kick = function () { clearTimeout(timer); timer = setTimeout(check, 120); };
  fs.watch(path.join(ROOT, 'src'), kick); fs.watch(path.join(ROOT, 'src', 'engine'), kick);
  http.createServer(function (req, res) {
    var url = req.url.split('?')[0];
    var ip = req.socket.remoteAddress;
    if (url.indexOf('/mp/') === 0) { mpHandle(req, res, url); return; }
    if (url === '/__version') {
      if (!clients[ip]) { log('HOT', 'device connected: ' + ip + '  ' + (req.headers['user-agent'] || '').slice(0, 60)); }
      clients[ip] = Date.now();
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); res.end(String(version)); return;
    }
    if (url === '/' || url === '/index.html') {
      var html = readGame().replace('</body>', RELOAD_SNIPPET + '</body>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); return;
    }
    res.writeHead(404); res.end('not found');
  }).listen(port, '0.0.0.0', function () {
    log('HOT', 'Dev server on port ' + port + '. Open on any device in your network:');
    console.log('    http://localhost:' + port + '/');
    lanAddresses().forEach(function (a) { console.log('    http://' + a + ':' + port + '/'); });
    log('HOT', 'Watching src/ - save to reload every connected rig.');
    log('MP', 'Multiplayer relay live on the same address (up to 16 players).');
  });
}

/* ------------------------------------------------------------------ */
/* 3b. MULTIPLAYER RELAY (same port as the dev server)                 */
/* ------------------------------------------------------------------ */
/* Clients POST their state ~12x/s and receive everyone else's state plus
   gameplay events (shots, explosions, PvP hits). CORS is open so file://
   Electron/Android builds and other origins can join over the LAN. */
var MPS = { players: {}, events: [], seq: 0 };
function mpHandle(req, res, url) {
  var hdr = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  var now = Date.now(), id;
  for (id in MPS.players) { if (now - MPS.players[id].t > 5000) { log('MP', MPS.players[id].s.name + ' left'); delete MPS.players[id]; } }
  if (req.method === 'OPTIONS') { res.writeHead(204, hdr); res.end(); return; }
  if (url === '/mp/ping') { res.writeHead(200, hdr); res.end(JSON.stringify({ server: 'neontide-mp', players: Object.keys(MPS.players).length, seq: MPS.seq })); return; }
  if (url !== '/mp/sync' || req.method !== 'POST') { res.writeHead(404, hdr); res.end('{}'); return; }
  var body = '';
  req.on('data', function (c) { body += c; if (body.length > 65536) { req.destroy(); } });
  req.on('end', function () {
    var d; try { d = JSON.parse(body); } catch (e) { res.writeHead(400, hdr); res.end('{}'); return; }
    if (!d || !d.me || typeof d.me.id !== 'string') { res.writeHead(400, hdr); res.end('{}'); return; }
    var me = d.me;
    if (!MPS.players[me.id]) {
      if (Object.keys(MPS.players).length >= 16) { res.writeHead(503, hdr); res.end('{}'); return; }
      log('MP', String(me.name).slice(0, 20) + ' joined (' + (Object.keys(MPS.players).length + 1) + ' online)');
    }
    MPS.players[me.id] = { s: me, t: now };
    (d.ev || []).slice(0, 40).forEach(function (e) { MPS.seq++; e.seq = MPS.seq; e.from = me.id; MPS.events.push(e); });
    if (MPS.events.length > 400) { MPS.events.splice(0, MPS.events.length - 400); }
    var since = typeof d.seq === 'number' ? d.seq : MPS.seq;
    var out = { seq: MPS.seq, players: [], events: MPS.events.filter(function (e) { return e.seq > since && e.from !== me.id; }) };
    for (id in MPS.players) { if (id !== me.id) { out.players.push(MPS.players[id].s); } }
    res.writeHead(200, hdr); res.end(JSON.stringify(out));
  });
}

/* ------------------------------------------------------------------ */
/* 4. BUILD ROUTER                                                     */
/* ------------------------------------------------------------------ */
function rmrf(p) { if (fs.existsSync(p)) { (fs.rmSync || fs.rmdirSync).call(fs, p, { recursive: true, force: true }); } }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function sh(cmd, cwd) {
  log('RUN', cmd + (cwd ? '   (in ' + path.relative(ROOT, cwd) + ')' : ''));
  var r = cp.spawnSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit', shell: true });
  return r.status === 0;
}
function has(bin) { return cp.spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' }).status === 0; }
function copyGlob(dir, ext, dest) {
  var found = [];
  (function walk(d) {
    if (!fs.existsSync(d)) { return; }
    fs.readdirSync(d).forEach(function (f) {
      var p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walk(p); } else if (p.slice(-ext.length) === ext) { found.push(p); }
    });
  })(dir);
  found.forEach(function (f) { mkdirp(dest); fs.copyFileSync(f, path.join(dest, path.basename(f))); });
  return found.length;
}

function build() {
  var only = (arg('only') || 'win,linux,mac,android,nw').split(','), results = [];
  function want(t) { return only.indexOf(t) >= 0; }
  log('BUILD', 'Step 1/5: lint + headless tests');
  if (!runTests()) { log('BUILD', 'Aborted: fix the failures above first.'); process.exit(1); }

  log('BUILD', 'Step 2/5: clear previous output and caches');
  rmrf(DIST); rmrf(path.join(ROOT, 'www')); rmrf(path.join(ROOT, 'build')); bundle();
  rmrf(path.join(ROOT, 'node_modules', '.cache')); mkdirp(DIST);

  log('BUILD', 'Step 3/5: compress web bundle');
  var html = readGame();
  /* safe compression: strip HTML comments and leading indentation only
     (no JS rewriting, so ES5 semantics are untouched) */
  var slim = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\n[ \t]+/g, '\n');
  mkdirp(path.join(DIST, 'web'));
  fs.writeFileSync(path.join(DIST, 'web', 'index.html'), slim);
  fs.writeFileSync(path.join(DIST, 'web', 'index.html.gz'), zlib.gzipSync(slim, { level: 9 }));
  log('BUILD', 'web: ' + (html.length / 1024).toFixed(1) + ' KB -> ' + (slim.length / 1024).toFixed(1) + ' KB -> gzip ' +
    (zlib.gzipSync(slim, { level: 9 }).length / 1024).toFixed(1) + ' KB');
  results.push(['web (any browser / legacy Android SD card)', true]);

  log('BUILD', 'Step 4/5: prepare native wrapper folders');
  if (!sh('node scripts/setup.js')) { process.exit(1); }

  log('BUILD', 'Step 5/5: native binaries (sequential)');
  var eb = 'npx electron-builder --publish never';
  if (want('win')) { results.push(['Windows 10/11 .exe (x64+ia32)', sh(eb + ' --win --x64 --ia32')]);
    results.push(['Windows 7/8 .exe (Electron 22)', sh(eb + ' --win --x64 --ia32 -c.electronVersion=22.3.27 -c.directories.output=dist/win7')]); }
  if (want('linux')) { results.push(['Linux AppImage/deb/tar.gz', sh(eb + ' --linux --x64')]); }
  if (want('mac')) {
    if (process.platform === 'darwin') { results.push(['macOS universal .dmg', sh(eb + ' --mac --universal')]); }
    else { log('SKIP', '.dmg needs a macOS host (Apple toolchain). Run --build --only=mac on a Mac / CI macos runner.'); results.push(['macOS .dmg (skipped: not on macOS)', null]); }
  }
  if (want('nw')) { results.push(['NW.js app folder for Windows XP (build/nw-app)', fs.existsSync(path.join(ROOT, 'build', 'nw-app', 'index.html'))]); }
  if (want('android')) {
    if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) { log('SKIP', 'ANDROID_HOME not set - install Android SDK + JDK 17/21.'); results.push(['Android .apk (skipped: no SDK)', null]); }
    else {
      var okA = fs.existsSync(path.join(ROOT, 'android')) || sh('npx cap add android');
      okA = okA && sh('npx cap sync android');
      okA = okA && sh(process.platform === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug', path.join(ROOT, 'android'));
      if (okA) { copyGlob(path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk'), '.apk', path.join(DIST, 'android')); }
      results.push(['Android .apk (Capacitor)', okA]);
    }
  }
  log('BUILD', 'Summary:');
  results.forEach(function (r) { console.log('   ' + (r[1] === null ? '\x1b[33mSKIP\x1b[0m' : (r[1] ? '\x1b[32m OK \x1b[0m' : '\x1b[31mFAIL\x1b[0m')) + '  ' + r[0]); });
  log('BUILD', 'Artifacts are in ' + DIST);
}

/* ------------------------------------------------------------------ */
/* 5. MENU                                                             */
/* ------------------------------------------------------------------ */
function menu() {
  var rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n\x1b[35m  NEON TIDE // GAME MANAGER\x1b[0m\n  1) Run tests\n  2) Hot-reload dev server + multiplayer relay\n  3) Build everything into /dist\n  4) Quit\n');
  rl.question('  > ', function (a) {
    rl.close();
    if (a === '1') { process.exit(runTests() ? 0 : 1); }
    else if (a === '2') { serve(8080); }
    else if (a === '3') { build(); }
  });
}

if (args.indexOf('--test') >= 0) { process.exit(runTests() ? 0 : 1); }
else if (args.indexOf('--multiplayer') >= 0) { serve(parseInt(args[args.indexOf('--multiplayer') + 1], 10) || 8080); }
else if (args.indexOf('--serve') >= 0) { var pi = args.indexOf('--serve'); serve(parseInt(args[pi + 1], 10) || 8080); }
else if (args.indexOf('--build') >= 0) { build(); }
else { menu(); }
