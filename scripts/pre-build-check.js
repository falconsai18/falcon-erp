/**
 * Falcon ERP — Pre-Build Validation Script
 *
 * Runs automatically before build to catch configuration errors.
 * Checks .env, Node.js version, dependencies, and stale builds.
 *
 * Usage: node scripts/pre-build-check.js
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
const blockers = [];

function check(name, condition, detail) {
  if (condition) {
    console.log(`  ${PASS} ${name}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${name}`);
    if (detail) console.log(`     ${RED}${detail}${RESET}`);
    failed++;
    blockers.push(name);
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
console.log(`\n${BOLD}🔍 Falcon ERP — Pre-Build Checks${RESET}`);
console.log(`${INFO} ${new Date().toISOString()}\n`);

const ROOT = path.resolve(__dirname, '..');

// ─── 1. Node.js Version ─────────────────────────────────────────────
section('1. Node.js Environment');

const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);

// Electron 22.x bundles Node 16.x, but we build with Node 16-22
// Avoid Node 23+ which may have compatibility issues with electron-builder 24.x
if (major >= 16 && major <= 22) {
  check(`Node.js version: ${nodeVersion} (compatible)`, true);
} else if (major < 16) {
  check(`Node.js version: ${nodeVersion} (TOO OLD)`, false,
    'Node.js 16+ required. Download from https://nodejs.org');
} else {
  warn(`Node.js version: ${nodeVersion} (untested — use 16-22 for best results)`);
}

check(`Platform: ${process.platform} ${process.arch}`, true);

// ─── 2. Environment Variables ───────────────────────────────────────
section('2. Environment Variables (.env)');

const envPath = path.join(ROOT, '.env');
check('.env file exists', fs.existsSync(envPath),
  'Create .env from .env.example: copy .env.example .env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n').reduce((acc, line) => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valParts] = line.split('=');
      acc[key.trim()] = valParts.join('=').trim();
    }
    return acc;
  }, {});

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const optionalVars = [
    'VITE_SELLER_STATE',
    'VITE_GOOGLE_VISION_API_KEY',
    'VITE_USE_MOCK_VISION',
  ];

  for (const v of requiredVars) {
    const value = envLines[v];
    if (!value) {
      check(`${v} is set`, false, `Add to .env: ${v}=your_value`);
    } else if (value.includes('xxxxx') || value === 'your-value' || value === '') {
      check(`${v} is not a placeholder`, false, `Replace placeholder value with real ${v}`);
    } else {
      check(`${v} is set (${value.slice(0, 30)}...)`, true);
    }
  }

  for (const v of optionalVars) {
    const value = envLines[v];
    if (!value) {
      warn(`${v} not set (optional)`);
    } else if (value.includes('your-') || value === '') {
      warn(`${v} has placeholder value`, 'This may cause runtime errors if the feature is used');
    } else {
      check(`${v} is set`, true);
    }
  }
}

// ─── 3. Dependency Versions ─────────────────────────────────────────
section('3. Dependency Versions');

const pkgPath = path.join(ROOT, 'package.json');
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch {
  check('package.json is valid JSON', false, 'Fix JSON syntax error in package.json');
  pkg = null;
}

if (pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Electron version check
  const electronVer = deps['electron'];
  if (electronVer === '22.3.27') {
    check(`Electron version: ${electronVer} (Win7 compatible)`, true);
  } else if (electronVer) {
    check(`Electron version: ${electronVer} (Win7 requires 22.3.27)`, false,
      'Change to "electron": "22.3.27" in package.json devDependencies');
  } else {
    check('Electron is installed', false, 'npm install electron@22.3.27 --save-dev');
  }

  // electron-builder check
  const builderVer = deps['electron-builder'];
  if (builderVer) {
    check(`electron-builder: ${builderVer}`, true);
  } else {
    check('electron-builder is installed', false, 'npm install electron-builder --save-dev');
  }

  // Check for removed native modules
  if (deps['better-sqlite3']) {
    check('better-sqlite3 is removed', false,
      'Run: npm uninstall better-sqlite3 && npm uninstall electron-rebuild');
  } else {
    check('better-sqlite3 is NOT installed (correct)', true);
  }

  if (deps['electron-rebuild']) {
    check('electron-rebuild is removed', false,
      'Run: npm uninstall electron-rebuild');
  } else {
    check('electron-rebuild is NOT installed (correct)', true);
  }

  // Check that Supabase is present
  if (deps['@supabase/supabase-js']) {
    check(`@supabase/supabase-js: ${deps['@supabase/supabase-js']}`, true);
  } else {
    check('@supabase/supabase-js is installed', false, 'npm install @supabase/supabase-js');
  }

  // npmRebuild check in build config
  if (pkg.build && pkg.build.npmRebuild === true) {
    check('npmRebuild is false', false,
      'Set "build.npmRebuild": false in package.json (no native modules)');
  } else {
    check('npmRebuild is false or absent', true);
  }
}

// ─── 4. Critical Files ──────────────────────────────────────────────
section('4. Critical Files');

const criticalFiles = [
  { path: 'electron/main.js', desc: 'Electron main process' },
  { path: 'electron/preload.js', desc: 'Electron preload script' },
  { path: 'vite.config.ts', desc: 'Vite build configuration' },
  { path: 'src/main.tsx', desc: 'React entry point' },
  { path: 'src/lib/supabase.ts', desc: 'Database client' },
  { path: 'src/lib/localAuth.ts', desc: 'Authentication adapter' },
  { path: 'config.example.json', desc: 'Config template for deployment' },
];

for (const { path: relPath, desc } of criticalFiles) {
  const fullPath = path.join(ROOT, relPath);
  check(`${relPath} (${desc})`, fs.existsSync(fullPath), 'File is missing');
}

// ─── 5. Stale Build Detection ───────────────────────────────────────
section('5. Build Freshness');

const distPath = path.join(ROOT, 'dist');
if (fs.existsSync(distPath)) {
  const stat = fs.statSync(distPath);
  const age = Date.now() - stat.mtimeMs;
  const ageHours = Math.floor(age / 1000 / 60 / 60);
  const ageDays = Math.floor(ageHours / 24);

  if (ageDays > 7) {
    warn(`dist/ folder is ${ageDays} days old`, 'Consider running `npm run build` for a fresh build');
  } else if (ageHours > 24) {
    warn(`dist/ folder is ${ageHours} hours old`, 'May be stale — rebuild recommended');
  } else {
    check(`dist/ is fresh (${ageHours}h old)`, true);
  }

  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const indexStat = fs.statSync(indexHtml);
    const indexAge = Date.now() - indexStat.mtimeMs;
    const indexAgeHours = Math.floor(indexAge / 1000 / 60 / 60);
    check('dist/index.html exists', true);

    if (indexAgeHours > 24) {
      warn(`dist/index.html is ${indexAgeHours}h old`, 'Vite may need to rebuild');
    }
  }
} else {
  warn('dist/ folder does not exist', 'Will be created by `npm run build`');
}

// Check node_modules
const nodeModules = path.join(ROOT, 'node_modules');
if (!fs.existsSync(nodeModules)) {
  check('node_modules/ exists', false, 'Run `npm install` first');
} else {
  check('node_modules/ exists', true);
}

// ─── Summary ────────────────────────────────────────────────────────
section('Checklist Summary');

console.log(`\n  ${BOLD}Results:${RESET}`);
console.log(`  ${PASS} Passed:   ${passed}`);
console.log(`  ${FAIL} Failed:   ${failed}`);
console.log(`  ${WARN} Warnings: ${warnings}`);

if (failed > 0) {
  console.log(`\n  ${BOLD}${RED}❌ Build BLOCKED — ${failed} issue(s) must be fixed first:${RESET}`);
  blockers.forEach((b, i) => {
    console.log(`  ${RED}  ${i + 1}. ${b}${RESET}`);
  });
  console.log(``);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n  ${BOLD}${YELLOW}⚠️  Build allowed with ${warnings} warning(s). Proceeding...${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n  ${BOLD}${GREEN}✅ All checks passed — safe to build!${RESET}\n`);
  process.exit(0);
}
