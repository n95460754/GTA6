/* =====================================================================
   1. PLATFORM LAYER (browser / Electron / NW.js / Cordova / Capacitor)
   ===================================================================== */
var PLATFORM = (function () {
  var ua = navigator.userAgent || '', q = (window.location && window.location.search) || '';
  var pr = window.process, p = { ua: ua };
  p.electron = !!(pr && pr.versions && pr.versions.electron) || ua.indexOf('Electron') >= 0;
  p.nw = !!(window.nw || (pr && pr.versions && pr.versions['node-webkit']));
  p.cordova = !!window.cordova;
  p.capacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  p.android = /Android/i.test(ua);
  var m = ua.match(/Android\s([0-9]+)/);
  p.androidMajor = m ? parseInt(m[1], 10) : 0;
  p.oldWin = /Windows NT 5\./.test(ua) || /Windows NT 6\.[01]/.test(ua);
  p.host = window.NeonTideHost || {};
  /* Legacy = start in the cheap top-down pipe with a reduced backbuffer
     (soft CPU rasterization friendly). Auto-upgrades if FPS allows. */
  p.legacy = q.indexOf('soft=1') >= 0 || q.indexOf('legacy=1') >= 0 || !!p.host.softwareRender ||
             (p.android && p.androidMajor > 0 && p.androidMajor < 5) || /Windows NT 5\./.test(ua);
  p.touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  return p;
})();

var canvas = document.getElementById('game');
if (!canvas || !canvas.getContext) {
  document.body.innerHTML = '<div id="nocanvas">NEON TIDE needs HTML5 Canvas. On Windows XP use the NW.js 0.14 build or Firefox 52 ESR; on Android use the stock browser (2.x+) or the APK.</div>';
  return;
}
var ctx = canvas.getContext('2d');

