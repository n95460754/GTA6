/* =====================================================================
   0. POLYFILLS & MATH UTILITIES
   ===================================================================== */
var PI = Math.PI, PI2 = Math.PI * 2;
function now() { return new Date().getTime(); }
var rafFn = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame || window.msRequestAnimationFrame || null;
function nextFrame(cb) { if (rafFn) { rafFn.call(window, cb); } else { window.setTimeout(cb, 16); } }
/* Event binding that also works on very old engines (attachEvent). */
function on(el, ev, fn, opts) {
  if (el.addEventListener) { el.addEventListener(ev, fn, opts || false); }
  else if (el.attachEvent) { el.attachEvent('on' + ev, fn); }
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function wrapA(a) { while (a > PI) { a -= PI2; } while (a < -PI) { a += PI2; } return a; }
function pad8(n) { var s = '' + Math.floor(n); while (s.length < 8) { s = '0' + s; } return s; }
/* Deterministic Park-Miller RNG for world generation (same city every run). */
var seed = 20261120;
function srnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function srndr(a, b) { return a + srnd() * (b - a); }

