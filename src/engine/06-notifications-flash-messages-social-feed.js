/* =====================================================================
   6. NOTIFICATIONS, FLASH MESSAGES, SOCIAL FEED
   ===================================================================== */
var toasts = [], flashMsg = { t: 0, a: '', b: '' };
var feed = { t: 0, cd: 0, viewers: 0, handle: '', lines: [], lineT: 0, reason: '' };
function notify(from, text, color) {
  toasts.push({ from: from, text: text, c: color || (from === 'ROSA' ? '#ff3fa4' : (from === 'DEX' ? '#3ff6ff' : '#ffe600')), t: 6 });
  if (toasts.length > 3) { toasts.shift(); }
}
function flash(a, b) { flashMsg.t = 3; flashMsg.a = a; flashMsg.b = b || ''; }
function feedTrigger(reason) {
  if (feed.cd > 0) { return; }
  feed.t = 8; feed.cd = 16; feed.reason = reason; feed.handle = pick(FEED_HANDLES);
  feed.viewers = rndi(800, 4000) + G.wanted * 3000; feed.lines = [pick(FEED_LINES)]; feed.lineT = 0.6;
  G.followers += rndi(50, 400);
}

