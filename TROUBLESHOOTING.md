# Falcon ERP — Troubleshooting Guide

> **Target:** Windows 7+ | **Electron:** 22.3.27 | **Database:** Supabase (online only)

---

## Table of Contents

1. [App Not Opening on Windows 7](#1-app-not-opening-on-windows-7)
2. [White Screen After Launch](#2-white-screen-after-launch)
3. [Supabase Connection Failed](#3-supabase-connection-failed)
4. [Config.json Not Loading](#4-configjson-not-loading)
5. [SmartScreen Blocking the App](#5-smartscreen-blocking-the-app)
6. [Build Errors](#6-build-errors)
7. [Runtime Errors](#7-runtime-errors)
8. [Performance Issues](#8-performance-issues)
9. [Network / Proxy Issues](#9-network--proxy-issues)
10. [Development Issues](#10-development-issues)

---

## 1. App Not Opening on Windows 7

### Symptom
Double-clicking the `.exe` does nothing, or a brief flash then closes.

### Diagnose
Run from Command Prompt to see errors:
```cmd
cd C:\path\to\app
Falcon-ERP-Portable-1.0.0.exe 2> error.log
type error.log
```

### Causes & Fixes

| Cause | Error Message | Fix |
|-------|--------------|-----|
| **Missing SHA-2 support** | No error, silent exit | Install **KB4474419** — [Microsoft Update Catalog](https://www.catalog.update.microsoft.com/Search.aspx?q=KB4474419) |
| **Missing TLS 1.2** | Supabase connection fails after launch | Install **KB3140245** |
| **Missing VC++ runtime** | `MSVCP140.dll not found` | Install [Visual C++ 2015 Redistributable](https://www.microsoft.com/en-us/download/details.aspx?id=48145) |
| **GPU incompatibility** | GPU process crashed | Already handled — hardware acceleration is disabled for Win7 |
| **32-bit OS with 64-bit build** | Not a valid Win32 application | Use the `(ia32)` build on 32-bit Windows 7 |
| **Electron sandbox issue** | `--no-sandbox` error | Already handled — disabled automatically for Win7 |

### Win7 Checklist

```powershell
# Check Windows version
winver
# Should show: Version 6.1 (Build 7601: Service Pack 1)

# Check TLS 1.2
[Net.ServicePointManager]::SecurityProtocol
# Should include: Tls12

# Check installed updates
Get-HotFix | Where-Object { $_.HotFixID -match "KB4474419|KB3140245" }
# Should show both updates
```

---

## 2. White Screen After Launch

### Symptom
App window opens but shows blank white screen for more than 5 seconds.

### Diagnose
Press `Ctrl+Shift+I` to open DevTools, then check:

**Console tab:**
```
[Main] Falcon ERP v1.0.0 starting...   ← Good: main process started
[Main] Window ready                     ← Good: window loaded
```

If you see **NO console output at all**:

| Cause | Fix |
|-------|-----|
| Vite build failed | Run `npm run build` and check for errors |
| `dist/index.html` missing | Rebuild: `npm run electron:build` |
| `base` path wrong in vite.config.ts | Ensure `base: './'` is set |
| ASAR unpack issue | Check `asarUnpack` in electron-builder config |

If you see **JS errors** in console:

| Error | Fix |
|-------|-----|
| `Missing Supabase credentials` | Check `.env` has real values, or add `config.json` |
| `Cannot read property 'from' of undefined` | Supabase client not initialized — check `initSupabase()` in main.tsx |
| `Failed to fetch` | Network issue — check internet connection |
| `import.meta.env.VITE_SUPABASE_URL is undefined` | In Electron, values come from `config.json` or build-time `.env` |

### Quick Fix Steps
```bash
# 1. Clean and rebuild
rm -rf dist node_modules/.vite
npm run build

# 2. Rebuild Electron
npm run electron:build

# 3. Test with dev mode (more verbose)
npm run electron:dev
```

---

## 3. Supabase Connection Failed

### Symptom
App loads but shows "No data", network errors, or login fails.

### Check 1: Verify Credentials
In DevTools console:
```js
window.__ELECTRON_CONFIG__
// Should show your Supabase URL and key
```

### Check 2: Network Tab
1. Open DevTools → **Network** tab
2. Filter by `supabase` or `fetch`
3. Look for red (failed) requests

| Status | Meaning | Fix |
|--------|---------|-----|
| `ERR_CONNECTION_REFUSED` | Wrong URL or no internet | Check `VITE_SUPABASE_URL` |
| `401 Unauthorized` | Wrong anon key | Check `VITE_SUPABASE_ANON_KEY` |
| `403 Forbidden` | RLS blocking | Check your Supabase RLS policies |
| `ERR_NAME_NOT_RESOLVED` | DNS issue | Check internet, try different DNS |
| `ERR_SSL_VERSION...` | No TLS 1.2 (Win7) | Install KB3140245 |
| `CORS` error | Supabase CORS config | Add your URL to Supabase dashboard → Settings → API → Allowed Origins |

### Check 3: Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open your project → **Settings** → **API**
3. Verify:
   - **Project URL** matches `VITE_SUPABASE_URL`
   - **anon public** key matches `VITE_SUPABASE_ANON_KEY`
   - **Allowed Origins** includes your app (or `*` for testing)

### Check 4: Firewall / Proxy
```cmd
# Test connectivity from command line
curl https://ukmpluotnystigoxejpf.supabase.co/rest/v1/ -H "apikey: YOUR_ANON_KEY"
# Should return: {"message":"Invalid API key"} or similar (not connection error)
```

If behind corporate proxy:
```bash
# Set proxy for Electron
set HTTP_PROXY=http://your-proxy:8080
set HTTPS_PROXY=http://your-proxy:8080
Falcon-ERP.exe
```

---

## 4. Config.json Not Loading

### Symptom
App connects to wrong Supabase instance despite `config.json` being present.

### Check 1: File Location

| Build Type | Where to Place `config.json` |
|------------|------------------------------|
| **Portable .exe** | Same folder as the `.exe` |
| **NSIS Installed** | Installation directory (e.g., `C:\Program Files\Falcon ERP\`) |
| **Extra Resources** | In `resources/` folder inside installation |

### Check 2: File Content
```json
{
  "VITE_SUPABASE_URL": "https://your-project.supabase.co",
  "VITE_SUPABASE_ANON_KEY": "your-key",
  "VITE_SELLER_STATE": "Maharashtra"
}
```

**Common mistakes:**
- ❌ Trailing comma after last key
- ❌ Single quotes instead of double quotes
- ❌ Missing closing brace
- ❌ Wrong key names (must be exact: `VITE_SUPABASE_URL`)

### Check 3: Verify Loading
In DevTools console:
```js
window.__ELECTRON_CONFIG__
// If this shows .env values instead of config.json values:
// 1. config.json not found at expected path
// 2. config.json has JSON parse error
// 3. App is using build-time values as fallback
```

### Check 4: Main Process Logs
Look for these in the terminal (dev mode) or check app logs:
```
[Config] Loaded config from: F:\path\to\config.json   ← Good
[Config] Using build-time environment variables         ← config.json not found
[Config] Failed to load config from: ...                ← File found but parse error
```

### Fix
```bash
# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('config.json','utf8')); console.log('Valid JSON')"
```

---

## 5. SmartScreen Blocking the App

### Symptom
Windows shows: *"Windows protected your PC"* with a blue dialog.

### Why This Happens
- Unsigned executables trigger SmartScreen by design
- This is **NOT** a virus — it's just Microsoft's warning for unknown publishers

### Solutions

| Approach | Cost | Effectiveness |
|----------|------|---------------|
| **Click "More info → Run anyway"** | Free | Works per-user, per-version |
| **Self-signed certificate** | Free | Reduces warning slightly, still shows unknown publisher |
| **EV Code Signing Certificate** | ~$300-500/year | Eliminates SmartScreen after reputation builds |
| **Standard Code Signing** | ~$80-200/year | Still shows SmartScreen until reputation builds |

### Self-Signed Certificate (Testing Only)
```powershell
# Run PowerShell as Administrator
$cert = New-SelfSignedCertificate -Type Custom `
  -Subject "CN=Falcon ERP" `
  -KeyUsage DigitalSignature `
  -CertStoreLocation "Cert:\CurrentUser\My"

# Export to PFX
$pwd = ConvertTo-SecureString -String "test123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "build\certificate.pfx" -Password $pwd
```

Then sign the .exe:
```cmd
"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe" sign ^
  /f build\certificate.pfx /p test123 /t http://timestamp.digicert.com ^
  release\Falcon-ERP-Portable-1.0.0.exe
```

### Whitelist in Group Policy (Enterprise)
```cmd
# Open Local Group Policy Editor
gpedit.msc

# Navigate to:
Computer Configuration → Administrative Templates →
  Windows Components → SmartScreen → Explorer
→ Configure SmartScreen: Disabled
```

---

## 6. Build Errors

### `PostCSS config error: Unexpected token 'export'`
```
Error: Failed to load the ES module: postcss.config.js
```
**Fix:**
```js
// postcss.config.js — use CommonJS syntax
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### `Cannot find module '@/lib/db'`
**Cause:** File still imports from removed SQLite module.
**Fix:** Check the file that has the error and remove `db` imports. See `src/lib/sync.ts` for example of stubbed-out code.

### `Cannot find module '@/lib/supabase'`
**Cause:** Import path issue or file was deleted.
**Fix:** Verify `src/lib/supabase.ts` exists and path is correct.

### `electron-builder: could not find nsis`
**Cause:** electron-builder failed to download NSIS tool.
**Fix:**
```bash
# Clear electron-builder cache
rm -rf %LOCALAPPDATA%\electron-builder\Cache
npm run electron:build
```

### `Vite build: chunkSizeWarningLimit exceeded`
**Cause:** Bundle too large.
**Fix:** Already configured at 900KB. If exceeded, check `manualChunks` in `vite.config.ts` to split large dependencies.

### `npm install fails for electron@22.3.27`
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Build is Very Slow
```bash
# Use yarn or pnpm for faster installs
npm install -g pnpm
pnpm install

# Or optimize npm
npm config set prefer-online false
```

---

## 7. Runtime Errors

### `Database not initialized. Call initSupabase() first.`
**Cause:** Supabase client was not initialized before first query.
**Fix:** Ensure `main.tsx` calls `initSupabase()` before rendering the App.

### `Electron IPC not available`
**Cause:** Code trying to call `window.electron.*` in browser mode.
**Fix:** Wrap Electron-specific code:
```ts
if (typeof window !== 'undefined' && (window as any).electron) {
  // Electron-only code
}
```

### `Another instance already running, quitting`
**Cause:** App is already open.
**Fix:** Check Task Manager → end `Falcon ERP.exe` processes.

### `Renderer crashed`
**Cause:** JavaScript error caused React to crash.
**Fix:** Check DevTools console for the actual JS error. Common causes:
- Supabase query returns `null` and code calls `.map()` on it
- Route navigation to non-existent page
- State management error in Zustand store

### Login Works but Data Doesn't Load
**Cause:** RLS policies blocking queries.
**Fix:** In Supabase dashboard → Authentication → Policies:
```sql
-- Allow anon read access to products
CREATE POLICY "Enable read access for all users" ON products
FOR SELECT USING (true);
```

---

## 8. Performance Issues

### App Starts Slow
| Symptom | Cause | Fix |
|---------|-------|-----|
| 10+ second startup | Loading large bundles | Check network tab for slow requests |
| White screen for 5s+ | Vite not optimized | Run `npm run build` (production mode) |
| First load slow, then fast | Service worker caching | Normal — PWA cache warming up |

### High Memory Usage
```
Task Manager → Details → Falcon ERP.exe
```

| Memory | Status |
|--------|--------|
| < 300 MB | Normal |
| 300-500 MB | Acceptable for ERP |
| > 500 MB | Check for memory leaks in DevTools → Memory tab |

### Slow Database Queries
```js
// In DevTools console, time a query
console.time('query')
import('@/lib/supabase').then(m =>
  m.supabase.from('products').select('*').then(() => console.timeEnd('query'))
)
// > 2 seconds: check Supabase dashboard → Database → Query performance
```

---

## 9. Network / Proxy Issues

### Behind Corporate Proxy
```bash
# Windows command prompt
set HTTP_PROXY=http://proxy.company.com:8080
set HTTPS_PROXY=http://proxy.company.com:8080
npm run electron:dev

# For built app, set in config.json:
{
  "_proxy": "http://proxy.company.com:8080"
}
```

### Firewall Blocking Supabase
Required outbound ports:
| Port | Protocol | Purpose |
|------|----------|---------|
| 443 | HTTPS | Supabase API (REST + Auth) |
| 443 | WSS | Supabase Realtime (optional) |

Required domains:
```
*.supabase.co
*.supabase.in
```

### DNS Resolution Fails
```cmd
# Flush DNS cache
ipconfig /flushdns

# Test DNS
nslookup ukmpluotnystigoxejpf.supabase.co
# Should return an IP address
```

---

## 10. Development Issues

### Hot Reload Not Working
```bash
# Check if dev server is running
# Terminal should show: VITE v7.x.x  ready in xxx ms

# Restart dev server
Ctrl+C in the terminal
npm run electron:dev
```

### TypeScript Errors
```bash
# Run type check
npx tsc --noEmit

# Fix common issues:
# 1. Missing types: npm install --save-dev @types/node
# 2. Module not found: check import paths
# 3. Property doesn't exist: check interface definitions
```

### DevTools Not Opening
In `electron/main.js`, verify:
```js
if (IS_DEV) {
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}
```

If DevTools opens but shows no console output:
- Check "All levels" in DevTools console dropdown (not "Errors only")
- Try `console.warn('test')` to verify console works

---

## Quick Diagnostic Commands

```bash
# Full diagnostic dump
echo "=== Node Version ===" && node -v
echo "=== npm Version ===" && npm -v
echo "=== OS Info ===" && ver
echo "=== Files in dist ===" && dir dist
echo "=== Files in release ===" && dir release
echo "=== Electron Version ===" && node -e "console.log(require('./node_modules/electron/package.json').version)"
```

```bash
# Quick network test to Supabase
curl -v https://ukmpluotnystigoxejpf.supabase.co/rest/v1/ 2>&1 | head -20
```

---

## Getting Help

When reporting an issue, include:
1. **OS:** Windows 7 / 10 / 11 (32 or 64-bit)
2. **App version:** `1.0.0`
3. **How launched:** dev mode / portable / installer
4. **Console output:** DevTools → Console (copy full text)
5. **Network output:** DevTools → Network (screenshot of failed requests)
6. **Steps to reproduce:** Exact steps from app launch
