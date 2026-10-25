const { app, BrowserWindow, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// Crucial Linux transparency flags for GNOME/Wayland/X11
app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow = null;
let tray = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    backgroundColor: '#00000000',
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Create System Tray Menu
  try {
    const iconPath = path.join(__dirname, '../public/favicon.svg');
    tray = new Tray(nativeImage.createEmpty());
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'ThreadPet AI (Reze & Denji)',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Toggle Pet Window',
        click: () => {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        },
      },
      {
        label: 'Reload Companion',
        click: () => {
          mainWindow.reload();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit ThreadPet',
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.setToolTip('ThreadPet AI - Chainsaw Man Companion');
    tray.setContextMenu(contextMenu);
  } catch (err) {
    console.log('Tray setup skipped:', err);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
