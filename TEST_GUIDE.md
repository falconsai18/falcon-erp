# Falcon ERP — Testing Guide

> **Last updated:** 2026-04-08 | **Target:** Windows 7+ | **Electron:** 22.3.27

---

## Table of Contents

1. [Development Mode Testing](#1-development-mode-testing)
2. [Production Build Testing](#2-production-build-testing)
3. [Windows 7 Specific Testing](#3-windows-7-specific-testing)
4. [Environment Variables Testing](#4-environment-variables-testing)
5. [Common Errors & Solutions](#5-common-errors--solutions)

---

## 1. Development Mode Testing

### 1.1 Start the App

```bash
npm run electron:dev
```

**What should happen:**
- ✅ Vite dev server starts on `http://localhost:3007`
- ✅ Electron window opens automatically
- ✅ DevTools panel opens (detached mode)
- ✅ Console shows: `[Main] Falcon ERP v1.0.0 starting...`
- ✅ Console shows: `[Main] Loading development server at http://localhost:3007`

### 1.2 Check Console Output

Open DevTools console (`Ctrl+Shift+I`) and verify:

| Log Message | Expected | Meaning |
|-------------|----------|---------|
| `[Main] Falcon ERP v1.0.0 starting...` | ✅ | Electron main process started |
| `[Main] Platform: win32 6.1...` | ✅ | Platform detected correctly |
| `[Main] Config: Supabase URL = SET` | ✅ | Config loaded from .env |
| `[Preload] Electron API exposed successfully` | ✅ | IPC bridge working |
| `[Renderer] Electron flag injected` | ✅ | `__ELECTRON__` flag set |
| `[main] Initializing Electron environment...` | ✅ | React startup sequence |
| `[supabase] Using build-time env vars` | ✅ | Supabase credentials resolved |
| `[supabase] Initialized with Supabase client` | ✅ | Database client ready |

### 1.3 Verify Supabase Connection

In DevTools console, run:

```js
// Test 1: Check config was loaded
window.__ELECTRON_CONFIG__
// Expected: { VITE_SUPABASE_URL: "https://...", VITE_SUPABASE_ANON_KEY: "..." }

// Test 2: Test Supabase query
import('@/lib/supabase').then(m => {
  m.supabase.from('products').select('id').limit(1).then(r => {
    console.log('Supabase OK:', r.data?.length, 'products found')
  })
})
// Expected: No error, returns product count

// Test 3: Test Electron API
window.electron.getEnv('VITE_SUPABASE_URL')
// Expected: Returns your Supabase URL
```

### 1.4 Check Network Tab

Open DevTools → Network tab:

| Check | Expected |
|-------|----------|
| Requests to `*.supabase.co` | ✅ 200 OK responses |
| No `ERR_CONNECTION_REFUSED` | ✅ All connections succeed |
| Auth endpoint `/auth/v1/token` | ✅ 200 (if logged in) |
| REST calls `/rest/v1/products` | ✅ 200 (if products exist) |

### 1.5 Test Core Features

| Feature | Test Steps | Expected |
|---------|------------|----------|
| **Login** | Enter valid email/password | Redirects to dashboard |
| **Dashboard** | Navigate to dashboard | Charts render, no errors |
| **Products** | Open Products page | List loads from Supabase |
| **Sales** | Open Sales page | Orders display correctly |
| **Invoices** | Open Invoices page | Invoices load, GST calculated |
| **Settings** | Open Settings page | Company info displays |
| **Sync Button** | Check sidebar/header | Shows disabled/cloud indicator |
| **Window Controls** | Click minimize/maximize/close | Window responds correctly |

### 1.6 Check for Errors

| Location | What to Look For |
|----------|------------------|
| **Electron terminal** | `[Main]`, `[IPC]` — no `Error:` or `Failed:` |
| **DevTools Console** | No red errors (warnings OK) |
| **DevTools Network** | No failed requests (red entries) |
| **DevTools Sources** | No `Uncaught TypeError` in source panel |

---

## 2. Production Build Testing

### 2.1 Build the App

```bash
npm run electron:build
```

**Expected output:**
```
✓ built in X.XXs          ← Vite build passes
• packaging...             ← electron-builder starts
• building                ← NSIS/portable building
• building block map      ← source maps
✅ release/Falcon-ERP-Setup-1.0.0.exe
✅ release/Falcon-ERP-Portable-1.0.0.exe
```

### 2.2 Verify Build Output

```bash
# Run the test script
npm run test:build
```

**Check the `release/` folder:**

| File | Size (approx) | Purpose |
|------|---------------|---------|
| `Falcon-ERP-Setup-1.0.0.exe` | ~80-120 MB | NSIS installer (x64) |
| `Falcon-ERP-Setup-1.0.0 (ia32).exe` | ~75-110 MB | NSIS installer (32-bit) |
| `Falcon-ERP-Portable-1.0.0.exe` | ~100-150 MB | Portable executable (x64) |
| `Falcon-ERP-Portable-1.0.0 (ia32).exe` | ~90-140 MB | Portable executable (32-bit) |

### 2.3 Test the Built App

**Portable mode (quickest test):**
```bash
# Double-click the portable .exe or run:
.\release\Falcon-ERP-Portable-1.0.0.exe
```

**Installer mode:**
```bash
# Run the installer, then launch from Start Menu
.\release\Falcon-ERP-Setup-1.0.0.exe
```

### 2.4 Production Verification Checklist

After launching the built .exe:

| # | Test | How | Pass/Fail |
|---|------|-----|-----------|
| 1 | App launches | No crash on startup | |
| 2 | No white screen | App renders within 5 seconds | |
| 3 | Login works | Valid credentials → dashboard | |
| 4 | Data loads | Products/Customers display | |
| 5 | No console errors | Press `Ctrl+Shift+I` → Console tab | |
| 6 | Supabase connected | Network tab shows 200 responses | |
| 7 | Window controls work | Minimize, maximize, close | |
| 8 | File menu hidden | `Alt` shows menu, then auto-hides | |
| 9 | App data created | `%APPDATA%\Falcon ERP\` exists | |
| 10 | No SQLite errors | Console: no "Database not initialized" | |

---

## 3. Windows 7 Specific Testing

### 3.1 Prerequisites

| Requirement | Details |
|-------------|---------|
| **Windows 7 SP1** | Must have Service Pack 1 installed |
| **SHA-2 support** | Install KB4474419 (SHA-2 code signing support) |
| **TLS 1.2** | Install KB3140245 (TLS 1.2 support) |
| **Visual C++ 2015** | Install `vc_redist.x64.exe` (may be bundled) |

### 3.2 Test on Windows 7 64-bit

1. Copy `Falcon-ERP-Portable-1.0.0.exe` to Win7 machine
2. Double-click to run
3. Verify all items in [Production Verification Checklist](#24-production-verification-checklist)

### 3.3 Test on Windows 7 32-bit

1. Copy `Falcon-ERP-Portable-1.0.0 (ia32).exe` to Win7 32-bit machine
2. Same verification steps
3. **Note:** 32-bit builds may have memory limits (~2GB)

### 3.4 Win7-Specific Issues to Watch

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Hardware acceleration** | White screen, GPU errors | Already disabled in main.js for Win7 |
| **Sandbox** | App won't start | Already disabled via `--no-sandbox` |
| **TLS 1.2** | Supabase connection fails | Install KB3140245 |
| **Missing DLLs** | "MSVCP140.dll not found" | Install VC++ 2015 redistributable |
| **Font rendering** | Text looks blurry | Acceptable — Win7 ClearType difference |

### 3.5 Win7 Network Testing

Windows 7 may have outdated root certificates:

```powershell
# Check TLS 1.2 support
[Net.ServicePointManager]::SecurityProtocol
# Should include Tls12

# If missing, install update KB3140245
```

---

## 4. Environment Variables Testing

### 4.1 Test Config Loading Priority

**Test 1: Build-time values (default)**
```bash
# No config.json → uses .env values baked into bundle
npm run electron:build
# Run built .exe → should connect to Supabase in .env
```

**Test 2: Runtime override (config.json)**
```bash
# Place config.json next to portable .exe
# Content:
{
  "VITE_SUPABASE_URL": "https://DIFFERENT-PROJECT.supabase.co",
  "VITE_SUPABASE_ANON_KEY": "different-key",
  "VITE_SELLER_STATE": "Gujarat"
}
```

**Test 3: Verify config was loaded**
Open DevTools in built app, run:
```js
window.__ELECTRON_CONFIG__
// Should show config.json values, NOT .env values
```

### 4.2 Missing Variables Test

Test what happens when Supabase URL is missing:
```json
{ "VITE_SUPABASE_URL": "", "VITE_SUPABASE_ANON_KEY": "" }
```

**Expected:** App shows error "Missing Supabase credentials" instead of crashing.

---

## 5. Common Errors & Solutions

| Error | Where | Cause | Solution |
|-------|-------|-------|----------|
| `Missing Supabase credentials` | Console | No .env or config.json | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| `Electron IPC not available` | Console | Not running in Electron | Use `npm run electron:dev`, not `npm run dev` |
| `Failed to load resource: net::ERR_CONNECTION_REFUSED` | Network | Supabase URL wrong or offline | Check .env / config.json values |
| `Database not initialized. Call initSupabase()` | Console | Supabase init failed or race condition | Check config loading, network connection |
| `White screen on launch` | UI | Vite build issue or config missing | Run `npm run build` first, check console |
| `Another instance already running` | Terminal | App already open | Close existing instance from Task Manager |
| `Renderer crashed` | Terminal | Memory issue or bug | Check DevTools console for JS errors |
| `SmartScreen blocked this app` | Windows dialog | No code signing | Click "More info → Run anyway" |
| `MSVCP140.dll not found` | Win7 startup | Missing VC++ runtime | Install Visual C++ 2015 Redistributable |
| `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` | Win7 network | No TLS 1.2 | Install KB3140245 |
| `PostCSS config error: Unexpected token 'export'` | Build | postcss.config.js syntax | Ensure `module.exports = {}` (CJS syntax) |
| `Cannot find module '@/lib/db'` | Build | Missing import cleanup | All db imports should be removed (see sync.ts) |

---

## Quick Reference: Test Commands

```bash
# Development
npm run electron:dev           # Start dev mode

# Pre-build checks
node scripts/pre-build-check.js  # Validate before build

# Build
npm run build                   # Vite build only
npm run electron:build          # Full Electron build
npm run electron:build:win      # Windows only
npm run electron:build:portable # Portable only
npm run electron:build:nsis     # Installer only

# Post-build
npm run test:build              # Validate build output
```
