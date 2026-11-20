# NEON TIDE: Palmetto County

Original neon open-world crime sandbox in **one file** (`index.html`): strict ES5, Canvas 2D only, no assets, no libraries.

**Play:** open `index.html` in any browser. Dev: `node manager.js --serve` → open the printed LAN URL on phones / test rigs.

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
