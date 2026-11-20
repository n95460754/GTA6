# NEON TIDE: Palmetto County

Original neon open-world crime sandbox: strict ES5, Canvas 2D only, no assets, no libraries. Native apps for **Windows, Linux and Android**.

## Download & play
| Platform | File (in [`releases/`](releases/)) | How |
|---|---|---|
| Windows 10/11 x64 | `NeonTide-windows-x64.7z` | unpack with 7-Zip, run `Neon Tide.exe` |
| Linux x64 | `NeonTide-linux-x64.tar.xz` | `tar -xJf NeonTide-linux-x64.tar.xz` then run `neon-tide` |
| Android 7+ | `NeonTide-android.apk` | copy to phone, allow "install unknown apps", install |

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
