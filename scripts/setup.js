/* Prepares the wrapper projects from the single index.html:
 *   www/                 Capacitor webDir
 *   cordova/www/         Cordova project www
 *   build/nw-app/        NW.js app (drop next to nw.exe of NW.js 0.14.7 for Windows XP)
 *   legacy-android/assets/index.html  minSdk 1 WebView wrapper
 * Usage: node scripts/setup.js */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..');
require('./bundle.js')();
var html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'));
function put(rel, data) { var p = path.join(ROOT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); console.log('  wrote ' + rel); }

put('www/index.html', html);
put('cordova/www/index.html', html);
put('legacy-android/assets/index.html', html);
put('build/nw-app/index.html', html);
put('build/nw-app/package.json', JSON.stringify({
  name: 'neon-tide', main: 'index.html', version: '1.0.0',
  window: { title: 'Neon Tide', width: 1280, height: 720, min_width: 320, min_height: 320, toolbar: false, icon: '' },
  'chromium-args': '--disable-gpu --disable-gpu-compositing --ignore-gpu-blacklist'
}, null, 2));
console.log('Setup done. NW.js for Windows XP: download nwjs-v0.14.7-win-ia32.zip from dl.nwjs.io,');
console.log('unzip it and copy build/nw-app/* next to nw.exe (or zip them as package.nw).');
