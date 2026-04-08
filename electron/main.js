/**
 * Falcon ERP - Electron Main Process
 * Optimized for Windows 7 compatibility (Electron 22.3.27)
 * Last Electron version supporting Windows 7/8/8.1
 *
 * Database: Supabase (online only) - NO local SQLite cache
 * Config: Loads from config.json if present, falls back to build-time env vars
 */

const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// === Configuration ===
const IS_DEV = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const APP_NAME = 'Falcon ERP';
const APP_VERSION = app.getVersion() || '1.0.0';

// === Debug: Log environment info early ===
console.log('[Main] ========================================');
console.log(`[Main] ${APP_NAME} v${APP_VERSION} starting`);
console.log(`[Main] IS_DEV: ${IS_DEV}`);
console.log(`[Main] __dirname: ${__dirname}`);
console.log(`[Main] process.resourcesPath: ${process.resourcesPath}`);
console.log(`[Main] process.execPath: ${process.execPath}`);
console.log(`[Main] app.getAppPath(): ${app.getAppPath()}`);
console.log(`[Main] Platform: ${process.platform} ${os.release()}`);
console.log(`[Main] Electron: ${process.versions.electron}`);
console.log(`[Main] Chrome: ${process.versions.chrome}`);
console.log(`[Main] Node.js: ${process.versions.node}`);
console.log(`[Main] ========================================`);

// === Windows 7 Compatibility Checks ===
const isWin7 = () => {
  if (process.platform !== 'win32') return false;
  const release = os.release();
  const major = parseInt(release.split('.')[0], 10);
  return major === 6; // Windows 7 is 6.1
};

// Disable hardware acceleration on Windows 7 for compatibility
if (isWin7()) {
  console.log('[Win7] Disabling hardware acceleration for Windows 7 compatibility');
  app.disableHardwareAcceleration();
}

// Disable sandbox on Windows 7 (Chromium 108+ requires newer Windows)
if (isWin7()) {
  app.commandLine.appendSwitch('--no-sandbox');
}

// === Configuration Loader (config.json support) ===
const loadConfig = () => {
  const defaults = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    VITE_SELLER_STATE: process.env.VITE_SELLER_STATE || '',
    VITE_GOOGLE_VISION_API_KEY: process.env.VITE_GOOGLE_VISION_API_KEY || '',
    VITE_USE_MOCK_VISION: process.env.VITE_USE_MOCK_VISION || 'false',
  };

  // Try to load config.json from multiple locations
  const configPaths = [
    path.join(process.resourcesPath, 'config.json'),       // In installer resources
    path.join(path.dirname(process.execPath), 'config.json'), // Next to portable exe
    path.join(app.getAppPath(), 'config.json'),             // In app directory
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`[Config] ✅ Loaded config from: ${configPath}`);
        return { ...defaults, ...fileConfig };
      }
    } catch (err) {
      console.warn(`[Config] ⚠ Failed to load config from ${configPath}: ${err.message}`);
    }
  }

  console.log('[Config] ⚠ No config.json found — using build-time environment variables');
  return defaults;
};

const APP_CONFIG = loadConfig();

// === App Data Directory ===
const getAppDataPath = () => {
  if (process.platform === 'win32') {
    return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }
};

const APP_DATA_DIR = path.join(getAppDataPath(), 'Falcon ERP');
const USER_DATA_DIR = path.join(APP_DATA_DIR, 'data');
const IMAGES_DIR = path.join(APP_DATA_DIR, 'images');
const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');

// Create directories
[APP_DATA_DIR, USER_DATA_DIR, IMAGES_DIR, LOGS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Main] Created directory: ${dir}`);
    } catch (err) {
      console.error(`[Main] Failed to create directory: ${dir}`, err);
    }
  }
});

console.log(`[Main] App data directory: ${APP_DATA_DIR}`);

// === Auto-Update Setup (Optional - Windows 7 Compatible) ===
let autoUpdater = null;
// Uncomment below to enable auto-updates:
// const { autoUpdater } = require('electron-updater');

const setupAutoUpdater = () => {
  if (!autoUpdater) {
    console.log('[Update] Auto-updater not installed. Skipping update checks.');
    console.log('[Update] To enable: npm install electron-updater@5 --save-dev');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => console.log('[Update] Checking for updates...'));
  autoUpdater.on('update-available', (info) => {
    console.log(`[Update] Update available: ${info.version}`);
    dialog.showMessageBox({
      type: 'info', title: 'Update Available',
      message: `Falcon ERP ${info.version} is available.`,
      detail: 'Downloading in background. The app will restart to install the update.',
      buttons: ['OK'],
    });
  });
  autoUpdater.on('update-not-available', () => console.log('[Update] No updates available'));
  autoUpdater.on('error', (err) => console.error('[Update] Update error:', err.message));
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[Update] Download: ${progressObj.bytesPerSecond}/s - ${progressObj.percent}%`);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[Update] Downloaded: ${info.version}`);
    dialog.showMessageBox({
      type: 'question', title: 'Update Ready',
      message: `Falcon ERP ${info.version} has been downloaded.`,
      detail: 'Restart now to install the update?',
      buttons: ['Restart', 'Later'],
    }).then((result) => {
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    });
  });

  setInterval(() => autoUpdater.checkForUpdates().catch(console.error), 60 * 60 * 1000);
  setTimeout(() => autoUpdater.checkForUpdates().catch(console.error), 10000);
};

// === IPC Handlers ===

ipcMain.handle('config-get', () => APP_CONFIG);
ipcMain.handle('config-get-key', (event, key) => APP_CONFIG[key] || '');

// File System IPC handlers
ipcMain.handle('fs-exists', (event, filePath) => fs.existsSync(filePath));

ipcMain.handle('fs-create-dir', (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (err) {
    console.error('[IPC] fs-create-dir error:', err);
    throw err;
  }
});

ipcMain.handle('fs-write-binary', (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data));
    return { success: true };
  } catch (err) {
    console.error('[IPC] fs-write-binary error:', err);
    throw err;
  }
});

ipcMain.handle('fs-read-binary', (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
    const data = fs.readFileSync(filePath);
    return { success: true, data: Array.from(data) };
  } catch (err) {
    console.error('[IPC] fs-read-binary error:', err);
    throw err;
  }
});

ipcMain.handle('fs-remove', (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    console.error('[IPC] fs-remove error:', err);
    throw err;
  }
});

ipcMain.handle('fs-join', (event, ...paths) => path.join(...paths));
ipcMain.handle('fs-app-data-dir', () => APP_DATA_DIR);
ipcMain.handle('fs-images-dir', () => IMAGES_DIR);

// App IPC handlers
ipcMain.handle('app-get-version', () => APP_VERSION);

ipcMain.handle('app-get-path', (event, name) => {
  const validNames = ['home', 'appData', 'userData', 'temp', 'exe', 'module', 'desktop', 'documents', 'downloads', 'music', 'pictures', 'videos'];
  if (validNames.includes(name)) return app.getPath(name);
  return '';
});

// Environment variables (secure exposure)
ipcMain.handle('env-get', (event, key) => {
  if (key.startsWith('VITE_')) return APP_CONFIG[key] || process.env[key] || '';
  return '';
});

// Window control handlers
ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('dialog-show-save', async (event, options) => dialog.showSaveDialog(options));
ipcMain.handle('dialog-show-open', async (event, options) => dialog.showOpenDialog(options));

// === Window Creation ===

let mainWindow = null;

/**
 * Resolve the path to index.html for production builds.
 *
 * In ASAR-packed builds, the structure is:
 *   app.asar/
 *     electron/main.js        ← __dirname
 *     electron/preload.js
 *     dist/index.html         ← what we need
 *
 * After electron-builder packs files, __dirname points to:
 *   - win-unpacked: <install-dir>\resources\app.asar.unpacked\electron
 *   - ASAR: inside app.asar at \electron
 *
 * The dist/ folder is at: path.join(__dirname, '..', 'dist', 'index.html')
 * which resolves to: <install-dir>\resources\app.asar.unpacked\dist\index.html
 */
function getIndexPath() {
  // In development, __dirname is <project>/electron
  // In production, __dirname is inside app.asar or app.asar.unpacked
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

  console.log(`[Main] Resolving index.html path:`);
  console.log(`[Main]   __dirname:     ${__dirname}`);
  console.log(`[Main]   indexPath:     ${indexPath}`);
  console.log(`[Main]   exists:        ${fs.existsSync(indexPath)}`);

  // Also check alternative locations for packed builds
  const alternatives = [
    path.join(app.getAppPath(), 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
    path.join(path.dirname(process.execPath), 'dist', 'index.html'),
  ];

  for (const alt of alternatives) {
    const exists = fs.existsSync(alt);
    console.log(`[Main]   alternative:   ${alt} → ${exists ? '✅ FOUND' : '❌ not found'}`);
    if (exists && !fs.existsSync(indexPath)) {
      console.log(`[Main]   Using alternative path`);
      return alt;
    }
  }

  return indexPath;
}

function createWindow() {
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: APP_NAME,
    show: false, // Show after ready-to-show to prevent white flash
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: !isWin7(), // Disable sandbox on Win7
      webSecurity: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
  };

  if (isWin7()) {
    windowOptions.frame = true;
    windowOptions.transparent = false;
  }

  mainWindow = new BrowserWindow(windowOptions);
  mainWindow.setTitle(APP_NAME);

  // ─── Load the App ─────────────────────────────────────────────
  if (IS_DEV) {
    const devUrl = 'http://localhost:3007';
    console.log(`[Main] Loading development server: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = getIndexPath();
    console.log(`[Main] Loading production build from: ${indexPath}`);

    if (!fs.existsSync(indexPath)) {
      console.error(`[Main] ❌ CRITICAL: index.html NOT FOUND at ${indexPath}`);
      console.error(`[Main] App directory contents:`);
      try {
        const appDir = path.join(__dirname, '..');
        if (fs.existsSync(appDir)) {
          const files = fs.readdirSync(appDir);
          files.forEach(f => console.error(`[Main]   ${f}`));
        }
      } catch (e) {
        console.error(`[Main]   Could not read directory:`, e.message);
      }

      // Show error window instead of blank screen
      mainWindow.loadURL('data:text/html,<h1 style="font-family:sans-serif;padding:40px;">Falcon ERP - Build Error</h1><p style="font-family:monospace;padding:0 40px;">index.html not found. The app may not be built correctly.</p><p style="font-family:monospace;padding:0 40px;">Run: npm run electron:build</p>');
      mainWindow.show();
      return;
    }

    mainWindow.loadFile(indexPath);
  }

  // ─── Page Load Events ─────────────────────────────────────────
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] ✅ Page loaded successfully (did-finish-load)');

    // Inject Electron detection flags for renderer
    mainWindow.webContents.executeJavaScript(`
      window.__ELECTRON__ = true;
      window.__ELECTRON_CONFIG__ = ${JSON.stringify(APP_CONFIG)};
      console.log('[Renderer] Electron flag injected');
      console.log('[Renderer] Config loaded:', ${JSON.stringify(APP_CONFIG.VITE_SUPABASE_URL ? 'URL SET' : 'URL MISSING')});
    `).catch(err => console.error('[Main] Failed to inject flags:', err));
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Main] ❌ Page failed to load:`);
    console.error(`[Main]   Error code:        ${errorCode}`);
    console.error(`[Main]   Error description: ${errorDescription}`);
    console.error(`[Main]   URL:               ${validatedURL}`);
    // Force open DevTools in production to debug
    if (!IS_DEV && !mainWindow.webContents.isDevToolsOpened()) {
      console.log('[Main] Opening DevTools for production debugging');
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Main] ❌ Provisional load failed:`);
    console.error(`[Main]   Error code:        ${errorCode}`);
    console.error(`[Main]   Error description: ${errorDescription}`);
    console.error(`[Main]   URL:               ${validatedURL}`);
  });

  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[Main] Page started loading...');
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Main] ✅ DOM is ready');
    // Log the current URL for debugging
    const currentURL = mainWindow.webContents.getURL();
    console.log(`[Main] Current URL after DOM ready: ${currentURL}`);

    // In production, force-open DevTools so we can see React errors
    if (!IS_DEV && !mainWindow.webContents.isDevToolsOpened()) {
      console.log('[Main] Opening DevTools for production debugging (DOM ready)');
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Execute diagnostic script
    mainWindow.webContents.executeJavaScript(`
      (function() {
        console.log('[Diagnostic] === Page Diagnostic ===');
        console.log('[Diagnostic] User Agent:', navigator.userAgent);
        console.log('[Diagnostic] Protocol:', window.location.protocol);
        console.log('[Diagnostic] href:', window.location.href);
        console.log('[Diagnostic] pathname:', window.location.pathname);
        console.log('[Diagnostic] Hash:', window.location.hash);
        console.log('[Diagnostic] document.readyState:', document.readyState);
        console.log('[Diagnostic] document.body:', document.body ? 'EXisted' : 'NULL');
        console.log('[Diagnostic] #root element:', document.getElementById('root') ? 'EXISTS' : 'NULL');
        console.log('[Diagnostic] window.electron:', window.electron ? 'EXISTS' : 'NULL');
        console.log('[Diagnostic] __ELECTRON_CONFIG__:', window.__ELECTRON_CONFIG__ ? 'LOADED' : 'NOT SET');
        console.log('[Diagnostic] === End Diagnostic ===');
      })();
    `).catch(err => console.error('[Main] Failed to run diagnostic:', err));
  });

  // ─── Renderer Crash Handling ──────────────────────────────────
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[Main] ❌ Renderer process gone:`, details);
    dialog.showMessageBox({
      type: 'error',
      title: 'Falcon ERP - Renderer Crash',
      message: 'The app encountered a critical error.',
      detail: `Reason: ${details.reason}\nExit code: ${details.exitCode}\n\nThe app will now restart.`,
      buttons: ['Restart'],
    }).then(() => {
      app.relaunch();
      app.exit(0);
    });
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('[Main] ⚠ Renderer became unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    console.log('[Main] Renderer recovered from unresponsive state');
  });

  // ─── Show Window ──────────────────────────────────────────────
  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Window ready-to-show event fired');
    mainWindow.show();
    mainWindow.focus();
  });

  // Timeout: show window even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log('[Main] Timeout — showing window anyway (ready-to-show did not fire)');
      mainWindow.show();
    }
  }, 10000);

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed');
    mainWindow = null;
  });

  // Security: Block external navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log(`[Main] Blocked new window: ${url}`);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (IS_DEV && url.startsWith('http://localhost:3007')) return;
    if (!url.startsWith('file://')) {
      event.preventDefault();
      console.log(`[Main] Blocked navigation to: ${url}`);
    }
  });

  // Log all console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levels = ['', 'error', 'warning', 'info', 'debug'];
    const prefix = levels[level] || 'log';
    console.log(`[Renderer:${prefix}] ${message} (source: ${sourceId}:${line})`);
  });
}

// === App Lifecycle ===

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance already running, quitting');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    setupAutoUpdater();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    console.log('[Main] All windows closed');
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => console.log('[Main] Preparing to quit'));
  app.on('quit', () => console.log('[Main] Application quit'));

  process.on('uncaughtException', (err) => console.error('[Main] Uncaught exception:', err));
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
  });
}
