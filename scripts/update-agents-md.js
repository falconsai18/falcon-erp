#!/usr/bin/env node

/**
 * AGENTS.md Auto-Update Script
 * 
 * This script scans the codebase and updates AGENTS.md with:
 * - Current modules and their status
 * - Service functions
 * - Database tables
 * - Recent changes
 * 
 * Usage: node scripts/update-agents-md.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const AGENTS_MD_PATH = path.join(PROJECT_ROOT, 'AGENTS.md');
const SERVICES_DIR = path.join(PROJECT_ROOT, 'src', 'services');
const FEATURES_DIR = path.join(PROJECT_ROOT, 'src', 'features');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🔍 Scanning Falcon ERP codebase...${colors.reset}\n`);

// ============================================================================
// 1. SCAN SERVICES
// ============================================================================
function scanServices() {
  console.log(`${colors.yellow}📦 Scanning services...${colors.reset}`);
  
  const services = [];
  const serviceFiles = fs.readdirSync(SERVICES_DIR)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  
  for (const file of serviceFiles) {
    const content = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf8');
    const name = file.replace('.ts', '');
    
    // Extract exported functions
    const functionMatches = content.match(/export\s+(?:async\s+)?function\s+(\w+)/g) || [];
    const functions = functionMatches.map(m => m.replace(/export\s+(?:async\s+)?function\s+/, ''));
    
    // Extract interfaces
    const interfaceMatches = content.match(/export\s+interface\s+(\w+)/g) || [];
    const interfaces = interfaceMatches.map(m => m.replace(/export\s+interface\s+/, ''));
    
    services.push({
      name,
      file,
      functions: functions.slice(0, 10), // Limit to first 10
      interfaces: interfaces.slice(0, 5),
      functionCount: functions.length,
      interfaceCount: interfaces.length
    });
  }
  
  console.log(`  Found ${services.length} services`);
  return services;
}

// ============================================================================
// 2. SCAN FEATURES
// ============================================================================
function scanFeatures() {
  console.log(`${colors.yellow}🏗️  Scanning features...${colors.reset}`);
  
  const features = [];
  const featureDirs = fs.readdirSync(FEATURES_DIR)
    .filter(d => fs.statSync(path.join(FEATURES_DIR, d)).isDirectory());
  
  for (const dir of featureDirs) {
    const pagesDir = path.join(FEATURES_DIR, dir, 'pages');
    
    if (fs.existsSync(pagesDir)) {
      const pages = fs.readdirSync(pagesDir)
        .filter(f => f.endsWith('.tsx') && !f.includes('test'));
      
      features.push({
        name: dir,
        path: `src/features/${dir}`,
        pages: pages,
        pageCount: pages.length
      });
    } else {
      features.push({
        name: dir,
        path: `src/features/${dir}`,
        pages: [],
        pageCount: 0
      });
    }
  }
  
  console.log(`  Found ${features.length} features`);
  return features;
}

// ============================================================================
// 3. GET GIT CHANGES
// ============================================================================
function getRecentChanges() {
  console.log(`${colors.yellow}📝 Getting recent changes...${colors.reset}`);
  
  try {
    // Get last 10 commits
    const log = execSync('git log --oneline -10 --pretty=format:"%h|%s|%ai"', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    const commits = log.split('\n').filter(Boolean).map(line => {
      const [hash, subject, date] = line.split('|');
      return { hash, subject, date };
    });
    
    console.log(`  Found ${commits.length} recent commits`);
    return commits;
  } catch (e) {
    console.log(`  ${colors.red}No git history found${colors.reset}`);
    return [];
  }
}

// ============================================================================
// 4. GET BUILD STATUS
// ============================================================================
function getBuildStatus() {
  console.log(`${colors.yellow}🔨 Checking build status...${colors.reset}`);
  
  try {
    execSync('npm run build', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    return '✅ PASSING';
  } catch (e) {
    return '❌ FAILING';
  }
}

// ============================================================================
// 5. GENERATE UPDATED AGENTS.MD
// ============================================================================
function generateAgentsMd(data) {
  const { services, features, commits, buildStatus } = data;
  
  const now = new Date().toISOString().split('T')[0];
  
  return `# Falcon Super Gold ERP - Agent Documentation
*Auto-generated on ${now}*

## 📊 Quick Stats

| Metric | Count |
|--------|-------|
| **Total Services** | ${services.length} |
| **Total Features** | ${features.length} |
| **Build Status** | ${buildStatus} |

## 🧩 Services Overview

${services.map(s => `
### ${s.name}
- **File:** \`${s.file}\`
- **Functions:** ${s.functionCount} (${s.functions.slice(0, 5).join(', ')}${s.functionCount > 5 ? '...' : ''})
- **Interfaces:** ${s.interfaceCount} (${s.interfaces.join(', ') || 'none'})
`).join('')}

## 🏗️ Features Overview

${features.map(f => `
### ${f.name}
- **Path:** \`${f.path}\`
- **Pages:** ${f.pageCount} (${f.pages.join(', ') || 'none'})
`).join('')}

## 📝 Recent Changes (Last 10 Commits)

| Commit | Message | Date |
|--------|---------|------|
${commits.map(c => `| ${c.hash} | ${c.subject.substring(0, 50)}${c.subject.length > 50 ? '...' : ''} | ${c.date.split(' ')[0]} |`).join('\n')}

## 🔄 How to Update This File

Run the auto-update script:
\`\`\`bash
npm run docs:update
\`\`\`

---

*For full documentation, see the original AGENTS.md file.*
`;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  console.log(`${colors.green}🚀 Starting AGENTS.md auto-update...${colors.reset}\n`);
  
  try {
    // Gather data
    const services = scanServices();
    const features = scanFeatures();
    const commits = getRecentChanges();
    const buildStatus = getBuildStatus();
    
    console.log(`\n${colors.blue}📝 Generating updated AGENTS.md...${colors.reset}`);
    
    // Generate content
    const content = generateAgentsMd({ services, features, commits, buildStatus });
    
    // Write file
    fs.writeFileSync(AGENTS_MD_PATH, content);
    
    console.log(`\n${colors.green}✅ AGENTS.md updated successfully!${colors.reset}`);
    console.log(`${colors.blue}📄 File location: ${AGENTS_MD_PATH}${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error updating AGENTS.md:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
