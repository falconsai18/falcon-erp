const { contextBridge, ipcRenderer } = require('electron');

// === Security Warning ===
// This preload script runs in an isolated context between the main process
// (Node.js) and the renderer process (React/Vite app).
// Only expose necessary APIs through contextBridge.
// ===

// Valid IPC channels for allowed communication
const VALID_CHANNELS = [
  // Configuration
  'config-get',
  'config-get-key',
  // File system operations
  'fs-exists',
  'fs-create-dir',
  'fs-write-binary',
  'fs-read-binary',
  'fs-remove',
  'fs-join',
  'fs-app-data-dir',
  'fs-images-dir',
  // App operations
  'app-get-version',
  'app-get-path',
  // Window operations
  'window-minimize',
  'window-maximize',
  'window-close',
  // Dialog operations
  'dialog-show-save',
  'dialog-show-open',
  // Environment
  'env-get',
];

// API exposed to renderer process
const electronAPI = {
  // === IPC Communication ===
  invoke: (channel, ...args) => {
    if (!VALID_CHANNELS.includes(channel)) {
      console.error(`[Preload] Blocked IPC channel: ${channel}`);
      return Promise.reject(new Error(`Blocked IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  send: (channel, ...args) => {
    if (!VALID_CHANNELS.includes(channel)) {
      console.error(`[Preload] Blocked IPC send channel: ${channel}`);
      return;
    }
    ipcRenderer.send(channel, ...args);
  },

  receive: (channel, callback) => {
    if (!VALID_CHANNELS.includes(channel)) {
      console.error(`[Preload] Blocked IPC receive channel: ${channel}`);
      return;
    }
    const subscription = (event, ...args) => callback(event, ...args);
    ipcRenderer.on(channel, subscription);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  // === Environment Info ===
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  platform: process.platform,
  isElectron: true,
  isWin7Compatible: true,

  // === App Info ===
  appVersion: '',

  // === Network Status ===
  getOnlineStatus: () => navigator.onLine,

  // === Configuration ===
  config: {
    getAll: () => ipcRenderer.invoke('config-get'),
    get: (key) => ipcRenderer.invoke('config-get-key', key),
  },

  // === Environment Variables (secure exposure) ===
  // Only exposes VITE_* prefixed env vars
  getEnv: (key) => {
    if (key.startsWith('VITE_')) {
      return ipcRenderer.invoke('env-get', key);
    }
    return '';
  },

  // === Window Control ===
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // === File System Helpers ===
  fs: {
    exists: (filePath) => ipcRenderer.invoke('fs-exists', filePath),
    createDir: (dirPath) => ipcRenderer.invoke('fs-create-dir', dirPath),
    writeBinary: (filePath, buffer) => ipcRenderer.invoke('fs-write-binary', filePath, buffer),
    readBinary: (filePath) => ipcRenderer.invoke('fs-read-binary', filePath),
    remove: (filePath) => ipcRenderer.invoke('fs-remove', filePath),
    join: (...paths) => ipcRenderer.invoke('fs-join', ...paths),
    getAppDataDir: () => ipcRenderer.invoke('fs-app-data-dir'),
    getImagesDir: () => ipcRenderer.invoke('fs-images-dir'),
  },
};

// Expose the API to window.electron
contextBridge.exposeInMainWorld('electron', electronAPI);

// Also expose as window.api for backward compatibility
contextBridge.exposeInMainWorld('api', electronAPI);

// Notify when preload is complete
console.log('[Preload] Electron API exposed successfully');
