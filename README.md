# NEON TIDE: Palmetto County

Original neon open-world crime sandbox in **real 3D** (software chase-camera renderer, auto-fallback to 2.5D and top-down): strict ES5, Canvas 2D only, no assets, no libraries. Native apps for **Windows, Linux and Android**.

## Download & play
**Fastest:** download [`NeonTide.html`](NeonTide.html) and open it in any browser (PC, phone, PS4/PS5). It is the whole game in one file.

| Platform | File (in [`releases/`](releases/)) | How |
|---|---|---|
| Windows 10/11 x64 | `NeonTide-windows-x64.7z` | unpack with 7-Zip, run `Neon Tide.exe` |
| Linux x64 | `NeonTide-linux-x64.tar.xz` | `tar -xJf NeonTide-linux-x64.tar.xz` then run `neon-tide` |
| Android 7+ | `NeonTide-android.apk` | copy to phone, allow "install unknown apps", install |
| Linux (Debian/Ubuntu) | `NeonTide-linux-amd64.deb` | `sudo apt install ./NeonTide-linux-amd64.deb` |
| PS4 / PS5 / any browser | GitHub Pages link or `NeonTide-web-PS4-PS5.html` | see below |
| Windows XP | `NeonTide-windowsXP-nwjs-app.zip` | unzip next to `nw.exe` of NW.js 0.14.7 (ia32) |

### PS4 / PS5
Sony only allows native `.pkg` games built with its licensed SDK on a devkit, so a native console build is not possible here.
The consoles' built-in web browser runs the game with full DualShock 4 / DualSense support:
1. In the repo: **Settings → Pages → Source: GitHub Actions** (one time). The `pages` workflow publishes the game.
2. On the console, open the browser (PS5: send yourself the link in a PlayStation message and open it; PS4: Internet Browser app) and go to `https://<user>.github.io/GTA6/`.

| Controller | Action |
|---|---|
| Left stick / D-pad | move / steer (D-pad picks phone apps) |
| R2 / L2 | gas & fire / brake & reverse |
| R1 | fire (drive-by) · Right stick: aim / tank turret |
| Triangle | enter / exit vehicle |
| Cross | handbrake / sprint · Circle: back |
| Square | switch Rosa ↔ Dex · L1 (hold): weapon wheel |
| OPTIONS | phone · SHARE/CREATE: graphics pipe |

GitHub Actions (`.github/workflows/build.yml`) rebuilds `.exe` installer, AppImage/deb and APK on every push and runs the test suite every hour.

## Source layout
```
src/shell.html          page shell (canvas, CSS)
src/engine/00..22-*.js  engine modules (platform, world, cars, AI, police, combat, renderer, HUD, phone...)
src/engine/ORDER        module order
scripts/bundle.js       bundles src/ -> app/index.html (generated, loaded by every native host)
electron/main.js        Windows / Linux / macOS host
capacitor.config.json   Android host (Capacitor)   cordova/  alt Android host   legacy-android/  API-1 WebView
manager.js              tests, hot-reload server, build router
```

## Controls
| Keyboard | Touch |
|---|---|
| WASD / arrows: move / drive · Space: handbrake · Shift: sprint | D-pad, GAS, BRK |
| E/F: enter/exit vehicle · Click / J / Ctrl: fire (mouse aims) | ENTER, FIRE |
| Q: weapon wheel (time ×0.2) · 1-4: weapons | WPN |
| P: Palmetto OS phone · C: switch Rosa/Dex · G: graphics auto/top/persp | PHONE |
| ~ : cheat console | triple-tap top-left corner: cheat pad |

## Cheat codes (type anywhere, console or touch pad)
`MEDSUPPLY` health+armor · `HEAVYMETAL` tank · `TOOLBOX` pistol+SMG+RPG · `NITROUS` turbo (accel×3, top speed×4) ·
`BLANKSLATE` wanted 0 · `MAXHEAT` 5 stars · `LOWGRAVITY` gravity ×0.15 (toggle) · `MONEYRAIN` +$250k

## Game Manager
```bash
node manager.js --test          # ES5 parse + forbidden API scan + headless dry run (mock DOM/canvas)
node manager.js --serve 8080    # hot-reload server (XHR polling, works on legacy browsers)
node manager.js --build         # lint -> clean -> compress -> .exe / .AppImage / .dmg / .apk into dist/
node manager.js --build --only=win,linux
```

## Platform reality check
| Target | How | Notes |
|---|---|---|
| Win 10/11, Linux | Electron 33 (`npm run build:win`, `build:linux`) | |
| Win 7/8 | Electron 22 (`npm run build:win7`), GPU off automatically | last Electron supporting Win7 |
| Win XP | NW.js **0.14.7** + `build/nw-app` | Electron never ran on XP; IE6-8 have no canvas |
| macOS universal .dmg | `npm run build:mac` | **must run on macOS** |
| Android 7+ (.apk) | Capacitor 6 / Cordova 12 | modern toolchains need minSdk 23-24 |
| Android 1.x-6 | `legacy-android/` (minSdk 1 WebView, legacy SDK + ant) or open `index.html` in the stock browser | no modern tool builds API<23 APKs |

<!-- README-BOT:START -->
## Status (auto-updated by the README bot)

- **Tests:** ✅ 16 passed, 0 failed
- **Engine:** 26 modules, 2792 lines of strict ES5
- **Updated:** 2026-11-22 00:16 UTC

### Release files
| File | Size |
|---|---|
| [`NeonTide-android.apk`](releases/NeonTide-android.apk) | 3.7 MB |
| [`NeonTide-linux-amd64.deb`](releases/NeonTide-linux-amd64.deb) | 65.9 MB |
| [`NeonTide-linux-x64.tar.xz`](releases/NeonTide-linux-x64.tar.xz) | 65.6 MB |
| [`NeonTide-web-PS4-PS5.html`](releases/NeonTide-web-PS4-PS5.html) | 0.2 MB |
| [`NeonTide-windows-x64.7z`](releases/NeonTide-windows-x64.7z) | 64.8 MB |
| [`NeonTide-windowsXP-nwjs-app.zip`](releases/NeonTide-windowsXP-nwjs-app.zip) | 0.0 MB |

### Cheat codes
`MEDSUPPLY` full health & armor · `HEAVYMETAL` battle tank delivered · `TOOLBOX` pistol + micro smg + rpg, max ammo · `NITROUS` turbo: accel x3, top speed x4 · `BLANKSLATE` wanted level cleared · `MAXHEAT` five star fugitive · `LOWGRAVITY` gravity x0.15 · `MONEYRAIN` +$250,000

### Engine modules (lines)
`00-polyfills-math-utilities` (26) · `01-platform-layer-browser-electron-nw-js-co` (31) · `02-constants-tuning-tables-global-state` (105) · `03-screen-resolution-adaptive-scaling` (20) · `04-procedural-world-generation-palmetto-cou` (128) · `05-entities-cars-prototype-pedestrians-part` (121) · `06-notifications-flash-messages-social-feed` (18) · `07-heat-index-wanted-level-crime` (26) · `08-combat-hitscan-projectiles-explosions` (124) · `09-traffic-ai-road-graph-lane-following-fle` (56) · `10-police-director-state-machine-scaled-by-` (119) · `11-spawning-population-management` (39) · `12-missions-phone-economy-story` (120) · `13-cheat-engine-passive-30-char-buffer-cons` (53) · `14-input-keyboard-mouse-multi-touch-virtual` (135) · `14b-gamepad-dualshock-dualsense-xbox-standard-mapping` (82) · `14c-multiplayer-lan-online-relay-client` (152) · `15-update-loop` (214) · `16-adaptive-graphics-core-fps-telemetry-pip` (37) · `17-renderer-world-top-down-pipe-pseudo-3d-p` (276) · `17b-true-3d-chase-camera-software-renderer` (429) · `18-renderer-hud-phone-wheel-console-touch-c` (309) · `19-camera` (17) · `20-save-load-localstorage-guarded-for-hosts` (18) · `21-native-host-hooks-cordova-capacitor-elec` (56) · `22-boot-main-loop` (81)
<!-- README-BOT:END -->
