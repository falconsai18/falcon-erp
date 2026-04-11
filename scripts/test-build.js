/**
 * Falcon ERP — Build Test Script
 *
 * Validates the production build output after `npm run electron:build`.
 * Checks dist/ folder, package.json, electron files, and config.
 *
 * Usage: node scripts/test-build.js
 */

const fs = require('fs');
const path = require('path');

// ─── ANSI Colors ────────────────────────────────────────────────────
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

const PASS = `${GREEN}✓${RESET}`;
const FAIL = `${RED}✗${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;
const INFO = `${CYAN}ℹ${RESET}`;

// ─── State ──────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warnings = 0;
const errors = [];

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ${PASS} ${name}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}`);
    if (detail) console.log(`     ${RED}${detail}${RESET}`);
    failed++;
    errors.push(name);
  }
}

function warn(name, detail) {
  console.log(`  ${WARN} ${name}`);
  if (detail) console.log(`     ${YELLOW}${detail}${RESET}`);
  warnings++;
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}── ${title} ──${RESET}`);
}

// ─── Start ──────────────────────────────────────────────────────────
console.log(`\n${BOLD}🧪 Falcon ERP — Build Validation${RESET}`);
console.log(`${INFO} ${new Date().toISOString()}\n`);

const ROOT = path.resolve(__dirname, '..');

// ─── 1. dist/ Folder Checks ─────────────────────────────────────────
section('1. dist/ Folder');

const distDir = path.join(ROOT, 'dist');
check('dist/ folder exists', fs.existsSync(distDir), 'Run `npm run build` first');

if (fs.existsSync(distDir)) {
  const indexHtml = path.join(distDir, 'index.html');
  check('dist/index.html exists', fs.existsSync(indexHtml), 'Vite build did not produce index.html');

  const assetsDir = path.join(distDir, 'assets');
  check('dist/assets/ folder exists', fs.existsSync(assetsDir), 'No JS/CSS assets generated');

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));
    const mapFiles = files.filter(f => f.endsWith('.js.map'));

    check(`JS bundles found: ${jsFiles.length} files`, jsFiles.length > 10, `Only ${jsFiles.length} JS files — build may be incomplete`);
    check(`CSS files found: ${cssFiles.length}`, cssFiles.length > 0, 'No CSS generated');
    check(`Source maps found: ${mapFiles.length}`, mapFiles.length > 0, 'No source maps — check vite.config.ts sourcemap setting');

    // Check for critical chunks
    const hasSupabase = jsFiles.some(f => f.includes('supabase'));
    check('vendor-supabase chunk exists', hasSupabase, 'Supabase bundle missing — check imports');

    const hasReact = jsFiles.some(f => f.includes('vendor-react'));
    check('vendor-react chunk exists', hasReact, 'React bundle missing');

    // Total size
    let totalSize = 0;
    files.forEach(f => {
      try { totalSize += fs.statSync(path.join(assetsDir, f)).size; } catch {}
    });
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    const sizeKB = (totalSize / 1024).toFixed(0);

    if (totalSize > 5 * 1024 * 1024) {
      warn(`dist/assets/ size: ${sizeMB} MB (> 5 MB — consider code splitting)`);
    } else {
      console.log(`  ${INFO} dist/assets/ size: ${sizeMB} MB (${sizeKB} KB)`);
    }

    console.log(`  ${INFO} File count: ${files.length} total (${jsFiles.length} JS, ${cssFiles.length} CSS)`);
  }
}

// ─── 2. package.json Checks ─────────────────────────────────────────
section('2. package.json');

const pkgPath = path.join(ROOT, 'package.json');
check('package.json exists', fs.existsSync(pkgPath));

if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // Should NOT have better-sqlite3
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  check('better-sqlite3 NOT in dependencies', !deps['better-sqlite3'],
    'better-sqlite3 should be removed — run: npm uninstall better-sqlite3');

  check('electron version is 22.3.27', deps['electron'] === '22.3.27',
    `Found ${deps['electron']} — Win7 requires 22.3.27`);

  check('electron-builder in devDependencies', !!deps['electron-builder'],
    'electron-builder is required for packaging');

  check('electron-rebuild NOT in devDependencies', !deps['electron-rebuild'],
    'electron-rebuild is only needed for native modules');

  check('main entry points to electron/main.js', pkg.main === 'electron/main.js',
    `Found: ${pkg.main}`);

  // Required scripts
  const requiredScripts = ['dev', 'build', 'electron:dev', 'electron:build'];
  const missingScripts = requiredScripts.filter(s => !pkg.scripts?.[s]);
  check('Required scripts present', missingScripts.length === 0,
    `Missing: ${missingScripts.join(', ')}`);

  check('npmRebuild is false or absent', !pkg.build?.npmRebuild,
    'npmRebuild should be false (no native modules)');
}

// ─── 3. Electron Files Checks ───────────────────────────────────────
section('3. Electron Files');

const mainJs = path.join(ROOT, 'electron', 'main.js');
const preloadJs = path.join(ROOT, 'electron', 'preload.js');

check('electron/main.js exists', fs.existsSync(mainJs), 'Main process file missing');
check('electron/preload.js exists', fs.existsSync(preloadJs), 'Preload script missing');

if (fs.existsSync(mainJs)) {
  const content = fs.readFileSync(mainJs, 'utf8');

  // Syntax check via Function constructor
  try {
    new Function(content);
    check('main.js has valid JS syntax', true);
  } catch (e) {
    check('main.js has valid JS syntax', false, e.message);
  }

  // Should NOT reference SQLite
  check('main.js does NOT reference better-sqlite3', !content.includes('better-sqlite3'),
    'SQLite should be removed from main process');
  check('main.js does NOT initDatabase()', !content.includes('initDatabase'),
    'Database init should be removed');

  // Should reference config loading
  check('main.js has config.json loader', content.includes('config.json'),
    'Runtime config loader is needed for production');
  check('main.js sets __ELECTRON__ flag', content.includes('__ELECTRON__'),
    'Renderer needs Electron detection flag');
  check('main.js has Win7 detection', content.includes('isWin7'),
    'Windows 7 compatibility check is required');
}

if (fs.existsSync(preloadJs)) {
  const content = fs.readFileSync(preloadJs, 'utf8');

  try {
    new Function(content);
    check('preload.js has valid JS syntax', true);
  } catch (e) {
    check('preload.js has valid JS syntax', false, e.message);
  }

  check('preload.js does NOT expose db API', !content.includes("'db-"),
    'Database channels should be removed from preload');
  check('preload.js exposes config API', content.includes('config-get'),
    'Config channel should be available to renderer');
}

// ─── 4. Config Validation ───────────────────────────────────────────
section('4. Configuration');

const configExample = path.join(ROOT, 'config.example.json');
check('config.example.json exists', fs.existsSync(configExample),
  'Template config file is needed for deployment');

if (fs.existsSync(configExample)) {
  try {
    const config = JSON.parse(fs.readFileSync(configExample, 'utf8'));
    check('config.example.json is valid JSON', true);

    const requiredKeys = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_SELLER_STATE',
      'VITE_GOOGLE_VISION_API_KEY',
      'VITE_USE_MOCK_VISION'
    ];
    const missingKeys = requiredKeys.filter(k => !(k in config));
    check('All required keys present', missingKeys.length === 0,
      `Missing: ${missingKeys.join(', ')}`);

    // Check for placeholder values
    const hasPlaceholder = config.VITE_SUPABASE_URL?.includes('your-project') ||
                           config.VITE_SUPABASE_URL === '';
    check('Supabase URL is not a real URL (example file)', hasPlaceholder,
      'config.example.json should use placeholder URLs, not real credentials');
  } catch (e) {
    check('config.example.json is valid JSON', false, e.message);
  }
}

const envFile = path.join(ROOT, '.env');
check('.env file exists', fs.existsSync(envFile),
  '.env is required for development — copy from .env.example');

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  check('.env has VITE_SUPABASE_URL', envContent.includes('VITE_SUPABASE_URL='));
  check('.env has VITE_SUPABASE_ANON_KEY', envContent.includes('VITE_SUPABASE_ANON_KEY='));

  // Check for placeholder values
  if (envContent.includes('VITE_SUPABASE_URL=https://xxxxx')) {
    warn('.env still has placeholder Supabase URL', 'Update with your real Supabase URL');
  }
}

// ─── 5. Release Folder (if build exists) ────────────────────────────
section('5. Release Output');

const releaseDir = path.join(ROOT, 'release');
if (fs.existsSync(releaseDir)) {
  const releaseFiles = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe'));
  check(`Release .exe files found: ${releaseFiles.length}`, releaseFiles.length > 0,
    'Run `npm run electron:build` to generate installers');

  if (releaseFiles.length > 0) {
    releaseFiles.forEach(f => {
      const stat = fs.statSync(path.join(releaseDir, f));
      const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
      console.log(`  ${INFO} ${f}: ${sizeMB} MB`);
    });

    const hasInstaller = releaseFiles.some(f => f.includes('Setup'));
    const hasPortable = releaseFiles.some(f => f.includes('Portable'));
    check('NSIS installer built', hasInstaller, 'Run: npm run electron:build:nsis');
    check('Portable executable built', hasPortable, 'Run: npm run electron:build:portable');
  }
} else {
  console.log(`  ${INFO} release/ folder not found — run npm run electron:build`);
}

// ─── Summary ────────────────────────────────────────────────────────
section('Summary');

console.log(`\n  ${BOLD}Results:${RESET}`);
console.log(`  ${PASS} Passed:   ${passed}`);
console.log(`  ${FAIL} Failed:   ${failed}`);
console.log(`  ${WARN} Warnings: ${warnings}`);

if (failed === 0 && warnings === 0) {
  console.log(`\n  ${BOLD}${GREEN}🎉 All checks passed! Build is ready for distribution.${RESET}\n`);
  process.exit(0);
} else if (failed === 0) {
  console.log(`\n  ${BOLD}${YELLOW}⚠️  Build OK with warnings. Review warnings above.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n  ${BOLD}${RED}❌ ${failed} check(s) failed. Fix the errors above before building.${RESET}`);
  console.log(`  ${RED}Failed checks: ${errors.join(', ')}${RESET}\n`);
  process.exit(1);
}
