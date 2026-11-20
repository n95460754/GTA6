/* =====================================================================
   2. CONSTANTS, TUNING TABLES & GLOBAL STATE
   ===================================================================== */
var WORLD = 4000, CELL = 400, NB = 10, ROADH = 40;   // 10x10 blocks, roads 80 wide
var GRAVITY = 900, CAMH = 900;                       // gravity (u/s^2), virtual camera height
var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], DANG = [0, PI / 2, PI, -PI / 2];

var CAR_TYPES = {
  sedan:  { w: 44, h: 22, accel: 230, brake: 520, max: 300, turn: 2.6, mass: 1.0, hp: 100, colors: ['#ff3fa4', '#3ff6ff', '#ffb13b', '#9b5cff', '#f2f2f2', '#2ee59d', '#ff5a36'] },
  sport:  { w: 46, h: 21, accel: 340, brake: 620, max: 430, turn: 2.9, mass: 0.9, hp: 90,  colors: ['#ff1f6d', '#ffe600', '#00e5ff', '#ff7b00'] },
  police: { w: 46, h: 22, accel: 330, brake: 620, max: 400, turn: 2.8, mass: 1.2, hp: 130, colors: ['#f4f4f4'] },
  fbi:    { w: 52, h: 26, accel: 360, brake: 650, max: 380, turn: 2.4, mass: 2.4, hp: 240, colors: ['#121218'] },
  tank:   { w: 64, h: 38, accel: 140, brake: 400, max: 160, turn: 1.6, mass: 6.0, hp: 1200, colors: ['#5f6b3a'] }
};

/* Weapon table: ballistics are data driven. */
var WEAPONS = [
  { name: 'FISTS',     cd: 0.35, dmg: 14, range: 36,  auto: false, spread: 0,    max: 0 },
  { name: '9MM PISTOL', cd: 0.26, dmg: 20, range: 540, auto: false, spread: 0.02, max: 300 },
  { name: 'MICRO SMG', cd: 0.075, dmg: 11, range: 430, auto: true,  spread: 0.13, max: 1200 },
  { name: 'RPG',       cd: 1.1,  dmg: 0,  range: 0,   auto: false, spread: 0,    max: 40 }
];

/* Heat thresholds: crime score needed for each star (0..5). */
var STAR_AT = [0, 8, 40, 90, 160, 260];
/* Police deployment table indexed by wanted level. */
var DEPLOY = {
  cops:  [0, 1, 3, 4, 4, 4],
  fbi:   [0, 0, 0, 0, 2, 3],
  tanks: [0, 0, 0, 0, 0, 2]
};

var CHARS = [
  { name: 'ROSA VEGA', color: '#ff3fa4', perk: 'TACTICIAN: loses cops faster, harder to cuff' },
  { name: 'DEX CALLOWAY', color: '#3ff6ff', perk: 'WHEELMAN: +15% handling, +25% gun damage' }
];

/* Global game state. */
var G = {
  t: 0, timeScale: 1, gravMul: 1, tod: 0.78, shake: 0,
  wanted: 0, heat: 0, lastSeen: 0, bustT: 0, spikeT: 6, spawnT: 0,
  cash: 2500, score: 0, trust: 50, jobs: 0,
  over: 0, overText: '', overSub: '', overAction: null,
  paused: false, hintT: 14, followers: 1200,
  phone: false, page: 'home', wheel: false, wheelSel: 1,
  console: false, conText: '', conLog: [], pad: false, padText: '',
  heist: { run: false, prog: 0, cd: 0 },
  mission: null, missionIdx: 0, missionDelay: 3, chatterT: 40
};

var gfx = { mode: 'auto', low: PLATFORM.legacy, fps: 60, frames: 0, acc: 0, goodStreak: 0, pmax: 280 };

/* Entity lists (hard capped). */
var cars = [], peds = [], rockets = [], tracers = [], pickups = [], spikes = [], scorch = [];
var buildings = [], blockB = [], palms = [], ponds = [], blockZone = [];
var parts = [];                     // fixed particle pool, created once
var PMAX = 280;
for (var pi0 = 0; pi0 < PMAX; pi0++) {
  parts.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, c: '#fff', type: 0 });
}

/* Player. */
var player = {
  x: 2000, y: 2200, a: -PI / 2, vx: 0, vy: 0, hp: 100, armor: 0, car: null,
  weap: 1, owned: [true, true, false, false], ammo: [0, 60, 0, 0], fireCd: 0,
  ch: 0, aim: 0, punchT: 0
};

/* Named locations (all placed on roads so they are drivable). */
var LOC = {
  home:     { x: 2000, y: 2230, name: 'Safehouse' },
  motel:    { x: 1600, y: 1420, name: 'Pink Lagoon Motel' },
  garage:   { x: 2180, y: 400,  name: 'Port Coral Garage' },
  shack:    { x: 400,  y: 3420, name: 'Airboat Shack (Glades)' },
  hospital: { x: 1200, y: 2420, name: 'Mercy Palms Hospital' },
  station:  { x: 2800, y: 2380, name: 'Coral Bay PD' },
  pier:     { x: 4000, y: 1820, name: 'Ocean Drive Pier' }
};

/* Story chain (original). After it ends, random side jobs are generated. */
var STORY = [
  { name: 'Wake-Up Call', from: 'ROSA', text: 'Babe. Pink Lagoon Motel. Now. Bring your A-game.', type: 'goto', loc: 'motel', reward: 2500, trust: 5 },
  { name: 'Fresh Wheels', from: 'DEX', text: 'We need a getaway ride. Grab any car and drop it at the Port Coral garage.', type: 'deliver', loc: 'garage', reward: 6000, trust: 5 },
  { name: 'Server Farm', from: 'ROSA', text: 'Open Palmetto OS (P) > HEIST. I wrote the exploit, you press the button.', type: 'heist', reward: 0, trust: 10 },
  { name: 'Glades Run', from: 'DEX', text: 'Cops smell money. Run the bag to the airboat shack in the Glades.', type: 'goto', loc: 'shack', wanted: 3, reward: 15000, trust: 10 },
  { name: 'Ghost Mode', from: 'ROSA', text: 'Lay low. Lose every last star and we are home free.', type: 'lose', wanted: 2, reward: 10000, trust: 15 },
  { name: 'Sunset Pier', from: 'DEX', text: 'Meet me at Ocean Drive pier. Just us, the sunset, and a duffel bag.', type: 'goto', loc: 'pier', reward: 20000, trust: 10 }
];

var CHATTER = [
  ['ROSA', 'You drive like the road owes you money.'],
  ['DEX', 'And you plan like the cops read your diary. Love you.'],
  ['ROSA', 'Rule one: nobody films us. Rule two: see rule one.'],
  ['DEX', 'We are trending on FlexTok again. Is that bad?'],
  ['ROSA', 'Trust is a currency. Do not overspend it.'],
  ['DEX', 'Swamp gas station sells boiled peanuts AND ammo. Paradise.'],
  ['ROSA', 'One more score and we buy that boat. For real this time.'],
  ['DEX', 'If I go down, I am going down at 140 mph.']
];
var FEED_HANDLES = ['@gatorcam_77', '@coralbay.chaos', '@neon_nana', '@swampdrone', '@flexking_lc', '@palmetto_pd_watch'];
var FEED_LINES = ['is this LIVE?? o_O', 'COP SPEEDRUN any%', 'Coral Bay never sleeps', 'who drives like that lmao', 'ratio + five stars',
  'mom come look', 'this is MY street!!', '#PalmettoMan strikes again', 'followed for the chaos', 'that car was my uncles',
  'gator got better driving skills', 'NOT the tank omg', 'they are so in love tho', 'clip it clip it', 'hold my boiled peanuts'];

