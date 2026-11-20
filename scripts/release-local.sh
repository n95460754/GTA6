#!/usr/bin/env bash
# Rebuilds every distributable that can be produced on a Linux host into releases/.
# (The Windows NSIS installer and macOS .dmg are produced by GitHub Actions.)
set -e
cd "$(dirname "$0")/.."
export ANDROID_HOME=${ANDROID_HOME:-$HOME/android-sdk}
node manager.js --test
rm -rf dist && node scripts/setup.js
npx electron-builder --publish never --linux tar.xz deb --x64
npx electron-builder --publish never --win 7z --x64
npx cap sync android && (cd android && ./gradlew assembleDebug --no-daemon -q)
mkdir -p releases
cp "dist/Neon Tide-1.0.0-win-x64.7z"        releases/NeonTide-windows-x64.7z
cp "dist/Neon Tide-1.0.0-linux-x64.tar.xz"  releases/NeonTide-linux-x64.tar.xz
cp "dist/Neon Tide-1.0.0-linux-amd64.deb"   releases/NeonTide-linux-amd64.deb
cp android/app/build/outputs/apk/debug/app-debug.apk releases/NeonTide-android.apk
cp app/index.html releases/NeonTide-web-PS4-PS5.html
(cd build/nw-app && zip -qr ../../releases/NeonTide-windowsXP-nwjs-app.zip .)
ls -la releases
