/* =====================================================================
   3. SCREEN, RESOLUTION & ADAPTIVE SCALING
   ===================================================================== */
var VW = 320, VH = 480, RS = 1, U = 1;
var sunsetGrad = null;
function resize() {
  VW = window.innerWidth || document.documentElement.clientWidth || 320;
  VH = window.innerHeight || document.documentElement.clientHeight || 480;
  var dpr = window.devicePixelRatio || 1;
  RS = gfx.low ? (PLATFORM.legacy ? 0.6 : 1) : Math.min(dpr, 1.5);
  canvas.width = Math.max(1, Math.floor(VW * RS));
  canvas.height = Math.max(1, Math.floor(VH * RS));
  canvas.style.width = VW + 'px';
  canvas.style.height = VH + 'px';
  U = clamp(Math.min(VW, VH) / 400, 0.65, 1.6);
  sunsetGrad = null;
  layoutTouch();
}

