# Falcon ERP - Electron Migration Guide
## Windows 7 Compatible Version (Electron 22.3.27)

---

## Overview

This guide provides step-by-step instructions to migrate from Tauri v1 to Electron 22.3.27 for Windows 7 compatibility. Electron 22.3.27 is the last version that supports Windows 7, 8, and 8.1.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Migration Steps](#migration-steps)
3. [Configuration Files](#configuration-files)
4. [Environment Variables](#environment-variables)
5. [Build Process](#build-process)
6. [Distribution](#distribution)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 16.x or 18.x LTS (16.20.2 recommended for stability)
- **npm**: 8.x or 9.x
- **Windows**: 7 SP1 or later (x64 or x86)
- **Visual Studio Build Tools 2019** (for native modules)

### Required Global Packages

```bash
# Install globally
npm install -g electron@22.3.27
npm install -g electron-builder@24.9.1
npm install -g electron-rebuild@3.2.9

# OR use npx (recommended)
npx electron@22.3.27 --version
```

---

## Migration Steps

### Step 1: Backup Current Project

```bash
# Create backup
cp -r falcon-erp falcon-erp-backup-$(date +%Y%m%d)

# Or using git
git checkout -b tauri-backup
git add .
git commit -m "Backup before Electron migration"
git checkout main
```

### Step 2: Remove Tauri Dependencies

```bash
# Remove Tauri from package.json
npm uninstall @tauri-apps/api @tauri-apps/cli

# Remove Tauri config files
rm -rf src-tauri/
rm tauri.conf.json
```

### Step 3: Install Electron Dependencies

```bash
# Install exact versions for Windows 7 compatibility
npm install electron@22.3.27 --save-dev
npm install electron-builder@24.9.1 --save-dev
npm install electron-rebuild@3.2.9 --save-dev
npm install cross-env@7.0.3 --save-dev
npm install wait-on@9.0.4 --save-dev
npm install concurrently@9.2.1 --save-dev

# Keep better-sqlite3 for offline database
npm install better-sqlite3@12.8.0
```

### Step 4: Create Electron Directory Structure

```
falcon-super-gold-erp/
├── electron/
│   ├── main.js          # Main process
│   ├── preload.js       # Preload script (secure IPC)
│   └── electron-types.d.ts  # TypeScript definitions
├── build/
│   ├── installer.nsh    # NSIS installer script
│   └── ...
├── src/
│   ├── electron-env.ts   # Environment variable handler
│   └── ...
├── electron-builder.yml   # Builder configuration
├── package.json          # Updated scripts
└── vite.config.ts       # Updated for Electron
```

### Step 5: Update Vite Configuration

The `vite.config.ts` has been updated with:
- `base: './'` for relative paths (required for Electron)
- Proper chunking for Electron builds

```typescript
// Key changes:
export default defineConfig({
  base: './', // Required for Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // ... rest of config
  },
})
```

### Step 6: Update package.json Scripts

Replace Tauri scripts with Electron scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "cross-env NODE_ENV=development concurrently \"npm run dev\" \"wait-on http://localhost:3007 && electron .\"",
    "electron:pack": "npm run build && electron-builder --dir",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:portable": "npm run build && electron-builder --win portable",
    "electron:build:nsis": "npm run build && electron-builder --win nsis",
    "electron:rebuild": "electron-rebuild -f -w better-sqlite3",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

### Step 7: Rebuild Native Modules

```bash
# Rebuild better-sqlite3 for Electron
npm run electron:rebuild

# Or manually
npx electron-rebuild -f -w better-sqlite3
```

### Step 8: Test Development Build

```bash
# Start development server
npm run electron:dev

# This will:
# 1. Start Vite dev server on localhost:3007
# 2. Wait for server to be ready
# 3. Launch Electron with hot reload
```

### Step 9: Test Production Build

```bash
# Create production build
npm run electron:build:win

# This creates:
# - release/Falcon-ERP-Setup-1.0.0.exe (installer)
# - release/Falcon-ERP-Portable-1.0.0.exe (portable)
# - release/win-unpacked/ (unpacked app)
```

---

## Configuration Files

### 1. electron/main.js

The main process file with Windows 7 compatibility:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');

// Windows 7 detection and optimizations
const isWin7 = () => {
  if (process.platform !== 'win32') return false;
  const release = require('os').release();
  return parseInt(release.split('.')[0], 10) === 6;
};

// Disable hardware acceleration on Windows 7
if (isWin7()) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('--no-sandbox');
}
```

### 2. electron/preload.js

Secure IPC bridge exposing minimal APIs:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

const VALID_CHANNELS = [
  'db-query', 'db-execute', 'db-execute-batch',
  'fs-exists', 'fs-read-binary', 'fs-write-binary',
  // ... more channels
];

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => {
    if (!VALID_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`Blocked: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  // ... more APIs
});
```

### 3. electron-builder.yml

Complete builder configuration:

```yaml
appId: com.falconerp.desktop
productName: Falcon ERP

win:
  target:
    - target: portable
      arch: [x64, ia32]
    - target: nsis
      arch: [x64, ia32]

asarUnpack:
  - node_modules/better-sqlite3/**/*

electronDownload:
  version: "22.3.27"
```

---

## Environment Variables

### Development

Create a `.env` file in project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_KEY=your-service-key
```

### Production (Electron)

Environment variables are accessible through:

```typescript
// In your React components
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Or from Electron main process (electron/main.js)
ipcMain.handle('env-get', (event, key) => {
  if (key.startsWith('VITE_')) {
    return process.env[key] || '';
  }
  return '';
});
```

### Building with Environment Variables

```bash
# Windows (Command Prompt)
set VITE_SUPABASE_URL=https://your-project.supabase.co
npm run electron:build

# Windows (PowerShell)
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"
npm run electron:build

# Cross-platform (using cross-env)
npx cross-env VITE_SUPABASE_URL=https://your-project.supabase.co npm run electron:build
```

---

## Build Process

### Development

```bash
# Start with hot reload
npm run electron:dev
```

### Production Builds

```bash
# All Windows targets
npm run electron:build:win

# Portable executable only
npm run electron:build:portable

# NSIS installer only
npm run electron:build:nsis

# Unpacked directory (for testing)
npm run electron:pack
```

### Build Outputs

```
release/
├── Falcon-ERP-Portable-1.0.0.exe     # Single portable executable
├── Falcon-ERP-Setup-1.0.0.exe        # NSIS installer
├── Falcon-ERP-1.0.0-portable.7z       # 7z archive
└── win-unpacked/                       # Unpacked files
    ├── Falcon ERP.exe
    ├── resources/
    ├── locales/
    └── ...
```

---

## Distribution

### Portable Executable

- **Size**: ~150-200 MB (includes Chromium + Node.js)
- **Requirements**: Windows 7 SP1+, no installation needed
- **Usage**: Double-click to run
- **Data Location**: `%APPDATA%/Falcon ERP/`

### NSIS Installer

- **Features**:
  - Installation wizard
  - Desktop/start menu shortcuts
  - Optional data removal on uninstall
  - Administrator privileges (optional)

### Silent Installation

```bash
# Silent install
Falcon-ERP-Setup-1.0.0.exe /S

# Silent uninstall
"%ProgramFiles%\Falcon ERP\Uninstall Falcon ERP.exe" /S
```

---

## Troubleshooting

### Issue: better-sqlite3 fails to load

**Solution**:
```bash
# Rebuild for Electron
npm run electron:rebuild

# Or with specific Electron version
npx electron-rebuild -f -w better-sqlite3 -v 22.3.27
```

### Issue: App shows blank screen

**Solution**:
1. Check that `dist/` folder exists
2. Verify `base: './'` in vite.config.ts
3. Check DevTools console (Ctrl+Shift+I in dev mode)

### Issue: Windows 7 compatibility

**Solution**:
1. Verify Electron 22.3.27 is installed
2. Check Windows 7 SP1 is installed
3. Install Visual C++ Redistributables 2015-2022

### Issue: Build fails with native modules

**Solution**:
```bash
# Clean and rebuild
npm run electron:rebuild

# Or full clean
rm -rf node_modules
rm -rf release
npm install
npm run electron:rebuild
npm run electron:build
```

### Issue: Environment variables not loading

**Solution**:
1. Variables must start with `VITE_`
2. Rebuild after changing .env
3. Check they're in process.env in main process

---

## Windows 7 Specific Notes

### System Requirements
- Windows 7 SP1 (Service Pack 1)
- .NET Framework 4.5.2+ (usually pre-installed)
- Visual C++ Redistributables (2015-2022)

### Known Limitations
- Hardware acceleration disabled
- Sandbox disabled
- Some modern CSS features may not work
- WebGL support limited

### Testing on Windows 7

1. Install Windows 7 SP1 in a VM
2. Install Node.js 16.x
3. Run `npm run electron:build`
4. Test both portable and installer versions

---

## Migration Checklist

- [ ] Backup project
- [ ] Remove Tauri dependencies
- [ ] Install Electron 22.3.27
- [ ] Create electron/ directory
- [ ] Update vite.config.ts (base: './')
- [ ] Update package.json scripts
- [ ] Rebuild better-sqlite3
- [ ] Test dev build (`npm run electron:dev`)
- [ ] Test production build (`npm run electron:build`)
- [ ] Test on Windows 7 VM
- [ ] Create portable executable
- [ ] Create NSIS installer
- [ ] Update documentation

---

## Support

For issues with this migration:

1. Check the [Electron documentation](https://www.electronjs.org/docs/latest)
2. Review [electron-builder documentation](https://www.electron.build/)
3. Check Windows 7 compatibility: [Electron 22.x EOL](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)

---

## License

This migration guide is part of Falcon ERP. See LICENSE.txt for details.
