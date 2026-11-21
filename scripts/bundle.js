/* Bundles src/engine/*.js (in src/engine/ORDER) into one strict-ES5 closure
 * and injects it into src/shell.html -> app/index.html.
 * Every native host (Electron, NW.js, Capacitor, Cordova, legacy WebView)
 * loads app/index.html. Usage: node scripts/bundle.js */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..');
var SRC = path.join(ROOT, 'src');
function bundle() {
  var order = fs.readFileSync(path.join(SRC, 'engine', 'ORDER'), 'utf8').split('\n').filter(function (l) { return l.trim(); });
  var parts = order.map(function (f) { return '/* ---- src/engine/' + f + ' ---- */\n' + fs.readFileSync(path.join(SRC, 'engine', f), 'utf8'); });
  var js = '\n(function () {\n\'use strict\';\n\n' + parts.join('\n') + '})();\n';
  var shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');
  var html = shell.replace('\n/*@@ENGINE@@*/\n', function () { return js; });
  fs.mkdirSync(path.join(ROOT, 'app'), { recursive: true });
  var out = path.join(ROOT, 'app', 'index.html');
  fs.writeFileSync(out, html);
  /* playable single-file copy in the repo root: download it, open it in any browser */
  fs.writeFileSync(path.join(ROOT, 'NeonTide.html'), html);
  return { file: out, modules: order.length, bytes: Buffer.byteLength(html) };
}
module.exports = bundle;
if (require.main === module) { var r = bundle(); console.log('bundled ' + r.modules + ' modules -> app/index.html (' + (r.bytes / 1024).toFixed(1) + ' KB)'); }
