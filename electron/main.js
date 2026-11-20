/* Electron host for Neon Tide (Windows 7-11, macOS Intel + Apple Silicon, Linux).
 * Legacy machines (Windows 7/8, or `--legacy`) get software rasterization:
 * GPU disabled and the page starts in its cheap top-down pipe (?soft=1). */
'use strict';
var electron = require('electron');
var app = electron.app, BrowserWindow = electron.BrowserWindow;
var path = require('path'), os = require('os');

var legacy = process.argv.indexOf('--legacy') >= 0 ||
  (process.platform === 'win32' && parseFloat(os.release()) < 6.2);   // 6.1 = Windows 7
if (legacy) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
}
app.commandLine.appendSwitch('disable-renderer-backgrounding');

function createWindow() {
  var win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 320, minHeight: 320,
    backgroundColor: '#0a0014', autoHideMenuBar: true, title: 'Neon Tide',
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'), { query: legacy ? { soft: '1' } : {} });
  win.webContents.on('before-input-event', function (e, input) {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', function () { app.quit(); });
