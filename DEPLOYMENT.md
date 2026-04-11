# Falcon ERP — Deployment Guide

> **Target:** Windows 7+ | **Format:** Single .exe, zero dependencies | **Database:** Supabase (online)

---

## Table of Contents

1. [Build Types: Portable vs Installer](#1-build-types-portable-vs-installer)
2. [Building for Distribution](#2-building-for-distribution)
3. [Deploying to End Users](#3-deploying-to-end-users)
4. [Custom Config for Different Clients](#4-custom-config-for-different-clients)
5. [Code Signing](#5-code-signing)
6. [Auto-Update Setup](#6-auto-update-setup)
7. [Size Optimization](#7-size-optimization)
8. [Multi-Environment Deployment](#8-multi-environment-deployment)
9. [Deployment Checklist](#9-deployment-checklist)

---

## 1. Build Types: Portable vs Installer

### Comparison

| Feature | Portable (.exe) | NSIS Installer |
|---------|----------------|----------------|
| **File count** | 1 file | 1 file |
| **Installation** | None — double-click to run | Runs installer wizard |
| **Admin rights** | Not required | Required (writes to Program Files) |
| **Start Menu** | No | Yes |
| **Desktop shortcut** | No | Yes (optional) |
| **Auto-updates** | ❌ Not supported | ✅ Supported |
| **Uninstall** | Just delete the .exe | Standard Windows uninstall |
| **App data** | `%APPDATA%\Falcon ERP\` | `%APPDATA%\Falcon ERP\` |
| **config.json location** | Next to .exe | Installation directory |
| **Best for** | Quick testing, USB deployment | Production customer deployment |
| **Size** | ~100-150 MB | ~80-120 MB |

### When to Use Which

| Scenario | Recommended |
|----------|-------------|
| Testing on a new machine | **Portable** — no install needed |
| Demo / trial distribution | **Portable** — easy to delete |
| Production customer deployment | **NSIS Installer** — proper install experience |
| USB flash drive deployment | **Portable** — runs directly from USB |
| Enterprise IT deployment | **NSIS Installer** — supports silent install (`/S`) |

---

## 2. Building for Distribution

### Prerequisites
```bash
# 1. Install dependencies
npm install

# 2. Verify setup
node scripts/pre-build-check.js

# 3. Ensure .env has production values
cat .env
```

### Build Commands

```bash
# Full build (both portable + installer, x64 + ia32)
npm run electron:build

# Windows only (same as above, but explicit)
npm run electron:build:win

# Portable only (fastest option for testing)
npm run electron:build:portable

# NSIS installer only
npm run electron:build:nsis
```

### Build Output

```
release/
├── Falcon-ERP-Setup-1.0.0.exe              # NSIS installer (x64)
├── Falcon-ERP-Setup-1.0.0 (ia32).exe       # NSIS installer (32-bit)
├── Falcon-ERP-Portable-1.0.0.exe           # Portable executable (x64)
├── Falcon-ERP-Portable-1.0.0 (ia32).exe   # Portable executable (32-bit)
├── latest.yml                              # Auto-update metadata
└── builder-effective-config.yaml           # Build config used
```

### Verify Build
```bash
# Run validation
npm run test:build
```

### Build Time Expectations

| Build Type | Time | Output Size |
|------------|------|-------------|
| Vite only (`npm run build`) | 10-20 seconds | ~5-10 MB (dist/) |
| Portable x64 | 1-2 minutes | ~100-150 MB |
| NSIS x64 | 1-2 minutes | ~80-120 MB |
| Full (4 variants) | 3-5 minutes | ~400-500 MB total |

---

## 3. Deploying to End Users

### Option A: Portable Distribution

**Steps:**
1. Build portable: `npm run electron:build:portable`
2. Copy `release/Falcon-ERP-Portable-1.0.0.exe` to USB or download link
3. User double-clicks to run — no installation needed

**Pros:**
- Simplest distribution
- No admin rights needed
- Easy to update (replace the .exe)

**Cons:**
- No desktop shortcut (user must pin manually)
- No auto-updates
- File association not possible

### Option B: NSIS Installer Distribution

**Steps:**
1. Build installer: `npm run electron:build:nsis`
2. Distribute `release/Falcon-ERP-Setup-1.0.0.exe`
3. User runs installer → chooses install location → shortcut created

**Silent Install (Enterprise):**
```cmd
# Install without user interaction
Falcon-ERP-Setup-1.0.0.exe /S /D=C:\Program Files\Falcon ERP

# Install for current user only
Falcon-ERP-Setup-1.0.0.exe /S /CURRENT_USER
```

**Custom Install Path:**
```cmd
# Custom directory
Falcon-ERP-Setup-1.0.0.exe /S /D=D:\Apps\FalconERP
```

### Option C: Network Share Deployment

Place the .exe on a shared network drive:
```
\\server\shared\Falcon ERP\Falcon-ERP-Portable-1.0.0.exe
```

Users can run it directly from the share without copying.

---

## 4. Custom Config for Different Clients

### Overview

Each client may need their own Supabase instance. Instead of rebuilding for each client, ship `config.json` alongside the .exe.

### Config File Structure

```json
{
  "VITE_SUPABASE_URL": "https://CLIENT-PROJECT.supabase.co",
  "VITE_SUPABASE_ANON_KEY": "CLIENT-ANON-KEY-HERE",
  "VITE_SELLER_STATE": "Gujarat",
  "VITE_GOOGLE_VISION_API_KEY": "CLIENT-GOOGLE-KEY",
  "VITE_USE_MOCK_VISION": "false"
}
```

### Deployment Workflow

```bash
# 1. Build ONCE with default/placeholder values
npm run electron:build

# 2. For each client, create their config.json
# Client A:
mkdir client-a
cp release/Falcon-ERP-Portable-1.0.0.exe client-a/
echo '{
  "VITE_SUPABASE_URL": "https://client-a.supabase.co",
  "VITE_SUPABASE_ANON_KEY": "eyJ..."
}' > client-a/config.json

# Client B:
mkdir client-b
cp release/Falcon-ERP-Portable-1.0.0.exe client-b/
echo '{
  "VITE_SUPABASE_URL": "https://client-b.supabase.co",
  "VITE_SUPABASE_ANON_KEY": "eyJ..."
}' > client-b/config.json
```

### Config File Locations (Priority Order)

| Priority | Location | When Used |
|----------|----------|-----------|
| 1 (highest) | `resources/config.json` | Inside NSIS installer |
| 2 | Next to portable .exe | Portable mode |
| 3 | `app.asar/../config.json` | Unpacked development |
| 4 (lowest) | Build-time `.env` values | Fallback if no config.json found |

### Managing Multiple Clients

Create a deployment script:

```bash
#!/bin/bash
# deploy-client.sh
# Usage: ./deploy-client.sh "client-name" "supabase-url" "anon-key"

NAME=$1
URL=$2
KEY=$3

OUTDIR="deployments/$NAME"
mkdir -p "$OUTDIR"

cp release/Falcon-ERP-Portable-1.0.0.exe "$OUTDIR/"

cat > "$OUTDIR/config.json" << EOF
{
  "VITE_SUPABASE_URL": "$URL",
  "VITE_SUPABASE_ANON_KEY": "$KEY",
  "VITE_SELLER_STATE": "Maharashtra"
}
EOF

echo "✅ Deployed to $OUTDIR/"
echo "   Files: $(ls -1 "$OUTDIR" | wc -l)"
echo "   Size: $(du -sh "$OUTDIR" | cut -f1)"
```

---

## 5. Code Signing

### Do You Need It?

| Scenario | Required? | Recommendation |
|----------|-----------|----------------|
| Internal company use | ❌ No | Whitelist via Group Policy |
| Public distribution | ✅ Yes | EV certificate recommended |
| Small customer base | Optional | Standard certificate OK |
| Enterprise deployment | Optional | IT can whitelist hash |

### SmartScreen Behavior Without Signing

| User sees | Action needed |
|-----------|---------------|
| "Windows protected your PC" | Click "More info" → "Run anyway" |
| Antivirus false positive | Submit to Microsoft for analysis |
| Download blocked in Chrome | Click "Keep" → "Keep anyway" |

### Getting an EV Code Signing Certificate

| Provider | Price | Time | Notes |
|----------|-------|------|-------|
| DigiCert | ~$300-500/year | 1-3 days | Most trusted |
| Sectigo | ~$200-400/year | 1-5 days | Good alternative |
| GlobalSign | ~$300-500/year | 1-3 days | Enterprise |

**Requirements:**
- Business registration documents
- Phone verification
- Hardware token (for EV certificates)

### Signing the Build

After obtaining a `.p12` certificate:

```yaml
# electron-builder.yml — update win section
win:
  certificateFile: "build/certificate.p12"
  certificatePassword: "your-certificate-password"
  signingHashAlgorithms:
    - sha256  # For Windows 7, also add sha1 if needed
  verifyUpdateCodeSignature: true
```

**Note for Windows 7:** SHA-256 requires KB4474419 update. Include sha1 for legacy:
```yaml
win:
  signingHashAlgorithms:
    - sha256
    - sha1  # For older Windows 7 without SHA-2 update
```

### Self-Signed for Testing
```powershell
# Create test certificate
$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=Falcon ERP (Test)" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(1)

# Export
$password = ConvertTo-SecureString -String "test123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert `
  -FilePath "build/test-certificate.pfx" `
  -Password $password
```

**Warning:** Self-signed certs still trigger SmartScreen — they only prevent "Unknown publisher" warnings for manually-trusted applications.

---

## 6. Auto-Update Setup

### Prerequisites

```bash
# Install electron-updater v5 (Win7 compatible)
npm install electron-updater@5 --save-dev
```

### Configuration

**1. Update `electron-builder.yml`:**
```yaml
publish:
  provider: generic
  url: "https://your-server.com/updates"
  channel: latest
  electronUpdaterCompatibility: ">= 2.16"
```

**2. Update `electron/main.js`:**
Uncomment the auto-update section (lines marked with `// Uncomment below`).

**3. Host the Updates:**
Upload these files to your server:
```
https://your-server.com/updates/
├── Falcon-ERP-Setup-1.0.1.exe     # New version installer
├── latest.yml                      # Auto-generated by electron-builder
└── latest.yml.blockmap             # For differential updates
```

**4. Generate `latest.yml`:**
```bash
# Build with publish config
npm run electron:build
# latest.yml is automatically generated in release/
```

### Provider Options

| Provider | Setup Complexity | Cost | Best For |
|----------|-----------------|------|----------|
| **GitHub Releases** | Low | Free (public repo) | Open source, small projects |
| **Generic (your server)** | Medium | Hosting cost | Full control |
| **AWS S3** | Medium | Pay per GB | Scalable |
| **DigitalOcean Spaces** | Low | $5/month | Simple setup |

### GitHub Releases Setup (Easiest)

```yaml
# electron-builder.yml
publish:
  provider: github
  owner: your-username
  repo: falcon-super-gold-erp
  private: false  # Set true for private repos
```

Then:
```bash
# Set GitHub token
set GH_TOKEN=your_github_token

# Build and publish
npm run electron:build
# latest.yml is auto-uploaded to GitHub Releases
```

### Update Flow

```
1. App starts
2. After 10 seconds: checks /updates/latest.yml
3. If new version found: downloads in background
4. Download complete: shows notification
5. User clicks "Restart": installs update, relaunches
6. Next check: every 1 hour
```

### Important Notes for Win7

- Auto-updates **only work with NSIS builds** — NOT portable
- `electron-updater@5` required — v6 needs Node.js 18+
- SmartScreen may flag the downloaded installer
- Differential updates (small downloads) work on Win7

---

## 7. Size Optimization

### Current Bundle Breakdown

| Component | Size (gzipped) | Notes |
|-----------|---------------|-------|
| vendor-pdf (jsPDF) | ~192 KB | Largest chunk — only needed for PDF export |
| vendor-charts (Recharts) | ~115 KB | Dashboard charts |
| vendor-react | ~69 KB | React + Router |
| vendor-supabase | ~46 KB | Supabase client |
| SmartCamera | ~50 KB | OCR / vision |
| App code | ~200 KB | All pages + services |

### Optimization Strategies

**Already Applied:**
- ✅ Code splitting via `manualChunks` in vite.config.ts
- ✅ ASAR compression in electron-builder
- ✅ No native modules (better-sqlite3 removed)
- ✅ Tree shaking (Vite default)

**Additional Options:**

| Strategy | Savings | Effort | Trade-off |
|----------|---------|--------|-----------|
| Lazy-load PDF export | -50 KB initial load | Low | PDF loads on demand |
| Replace Recharts with lighter lib | -100 KB | Medium | Different API |
| Remove Google Vision if unused | -50 KB | Low | No OCR feature |
| Compress images | -10-50 KB | Low | Slight quality loss |
| Remove sourcemaps in production | -50% dist/ size | Low | No production debugging |

**Disable Sourcemaps for Production:**
```ts
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false,  // Set to false for smallest dist/
  }
})
```

**Lazy-load Heavy Features:**
```ts
// In your route definition
{
  path: '/reports',
  component: () => import('@/features/reports/pages/ReportsPage'),
}
```

---

## 8. Multi-Environment Deployment

### Environment Matrix

| Environment | Supabase URL | Config Source | Build Command |
|-------------|-------------|---------------|---------------|
| **Development** | Dev project | `.env` file | `npm run electron:dev` |
| **Staging** | Staging project | `config.staging.json` | `npm run build && electron-builder` |
| **Production** | Live project | `config.json` or `.env` | `npm run electron:build` |

### Per-Environment Build Script

```bash
#!/bin/bash
# build-env.sh
# Usage: ./build-env.sh staging

ENV=$1
if [ -z "$ENV" ]; then
  echo "Usage: ./build-env.sh [dev|staging|production]"
  exit 1
fi

# Copy environment-specific config
cp "config.${ENV}.json" config.json

# Build
npm run build
npm run electron:build:win

# Rename output with environment tag
mv release/Falcon-ERP-Setup-*.exe release/Falcon-ERP-${ENV}-Setup-*.exe

# Clean up
rm config.json

echo "✅ Built ${ENV} version"
```

### Version Numbering

```
1.0.0     → Initial release
1.0.1     → Bug fix
1.1.0     → New feature
2.0.0     → Major changes (breaking)
```

Update version in `package.json` before each release:
```json
{
  "version": "1.0.1"
}
```

---

## 9. Deployment Checklist

### Pre-Release
- [ ] Version number updated in `package.json`
- [ ] All tests pass: `npm run test:build`
- [ ] Pre-build checks pass: `node scripts/pre-build-check.js`
- [ ] CHANGELOG.md updated with changes
- [ ] `.env` has production values (or config.json prepared)
- [ ] Supabase RLS policies verified for production
- [ ] Google Vision API key set (if using OCR)

### Build
- [ ] Clean build: `rm -rf dist release && npm run electron:build`
- [ ] Build validation: `npm run test:build`
- [ ] Portable .exe tested locally
- [ ] NSIS installer tested locally
- [ ] Both x64 and ia32 builds generated

### Post-Build Testing
- [ ] Portable .exe launches on test machine
- [ ] Installer installs correctly
- [ ] Login works with real credentials
- [ ] Data loads from Supabase
- [ ] No console errors in DevTools
- [ ] Window controls work (min/max/close)
- [ ] App data directory created (`%APPDATA%\Falcon ERP\`)
- [ ] config.json overrides work (if used)

### Distribution
- [ ] Upload to distribution server / USB
- [ ] Test download link works
- [ ] Test installation on clean Windows 7 machine
- [ ] Test installation on Windows 10/11 machine
- [ ] Document installation steps for users
- [ ] Prepare `config.json` for each client (if multi-tenant)

### Post-Deployment
- [ ] Monitor error reports from users
- [ ] Check Supabase dashboard for error logs
- [ ] Verify all clients can connect
- [ ] Gather user feedback
- [ ] Plan next release

---

## Quick Deploy Commands

```bash
# One-command build and test
npm run build && npm run test:build && npm run electron:build:portable

# Full production build
node scripts/pre-build-check.js && \
npm run electron:build && \
npm run test:build

# Quick portable for testing
npm run electron:build:portable && \
start release\Falcon-ERP-Portable-1.0.0.exe
```
