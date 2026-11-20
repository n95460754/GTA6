/* README bot: regenerates the AUTO section of README.md from the repo itself
 * (release files + sizes, engine modules, cheat codes, test status, timestamp).
 * Runs locally (`node scripts/readme-bot.js`) and in GitHub Actions
 * (.github/workflows/readme-bot.yml) which commits the result. */
'use strict';
var fs = require('fs'), path = require('path'), cp = require('child_process');
var ROOT = path.join(__dirname, '..');
var START = '<!-- README-BOT:START -->', END = '<!-- README-BOT:END -->';

function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }
function releases() {
  var dir = path.join(ROOT, 'releases');
  if (!fs.existsSync(dir)) { return '_No release files yet._'; }
  var rows = fs.readdirSync(dir).filter(function (f) { return f[0] !== '.'; }).sort().map(function (f) {
    return '| [`' + f + '`](releases/' + encodeURIComponent(f) + ') | ' + mb(fs.statSync(path.join(dir, f)).size) + ' |';
  });
  return '| File | Size |\n|---|---|\n' + rows.join('\n');
}
function modules() {
  var order = fs.readFileSync(path.join(ROOT, 'src', 'engine', 'ORDER'), 'utf8').split('\n').filter(Boolean);
  var lines = 0;
  var list = order.map(function (f) {
    var n = fs.readFileSync(path.join(ROOT, 'src', 'engine', f), 'utf8').split('\n').length; lines += n;
    return '`' + f.replace(/\.js$/, '') + '` (' + n + ')';
  });
  return { text: list.join(' · '), count: order.length, lines: lines };
}
function cheats() {
  var src = fs.readFileSync(path.join(ROOT, 'src', 'engine', '13-cheat-engine-passive-30-char-buffer-cons.js'), 'utf8');
  var re = /^\s+([A-Z]{4,}):\s*\{ label: '([^']+)'/gm, m, out = [];
  while ((m = re.exec(src))) { out.push('`' + m[1] + '` ' + m[2].toLowerCase()); }
  return out.join(' · ');
}
function tests() {
  var r = cp.spawnSync(process.execPath, [path.join(ROOT, 'manager.js'), '--test'], { cwd: ROOT, encoding: 'utf8' });
  var out = (r.stdout || '').replace(/\x1b\[[0-9;]*m/g, '');
  var pass = (out.match(/PASS/g) || []).length, fail = (out.match(/FAIL/g) || []).length;
  return (r.status === 0 ? '✅ ' : '❌ ') + pass + ' passed, ' + fail + ' failed';
}
function render() {
  var m = modules();
  return [START,
    '## Status (auto-updated by the README bot)',
    '',
    '- **Tests:** ' + tests(),
    '- **Engine:** ' + m.count + ' modules, ' + m.lines + ' lines of strict ES5',
    '- **Updated:** ' + new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    '',
    '### Release files',
    releases(),
    '',
    '### Cheat codes',
    cheats(),
    '',
    '### Engine modules (lines)',
    m.text,
    END].join('\n');
}
var file = path.join(ROOT, 'README.md'), readme = fs.readFileSync(file, 'utf8'), block = render();
if (readme.indexOf(START) >= 0 && readme.indexOf(END) >= 0) {
  readme = readme.slice(0, readme.indexOf(START)) + block + readme.slice(readme.indexOf(END) + END.length);
} else { readme = readme.replace(/\s*$/, '\n\n') + block + '\n'; }
fs.writeFileSync(file, readme);
console.log('README.md updated');
