const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset', 
    autoHideMenuBar: true, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Prevents the desktop app from blocking the CDN downloads
    }
  });

  // --- THE VIP BOUNCER: AUTO-APPROVE CAMERA PERMISSIONS ---
  // This tells Electron to automatically say "Yes" whenever the app asks for the webcam
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Approve camera/mic
    } else {
      callback(true); // Approve other basic permissions
    }
  });

  // Secondary check handler required by newer versions of Electron
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') {
      return true;
    }
    return true;
  });

  // Load your simple, original UI
  mainWindow.loadFile('attention_analyzer.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
