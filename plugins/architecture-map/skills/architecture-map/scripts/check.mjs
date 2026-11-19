#!/usr/bin/env node
// Render a built architecture map in a headless Chromium-family browser and report JS errors.
// Usage: node check.mjs <architecture-map.html> <model.js>
// Checks the root view, every lens, every drill-down and every flow via URL-hash deep links.
// Browser lookup: $CHROME_PATH, then Chrome / Chromium / Edge / Brave in the usual macOS, Linux and Windows locations.
// Exit codes: 0 = all states render cleanly, 1 = errors found, 3 = no browser found (check manually).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const [htmlPath, modelPath] = process.argv.slice(2);
if (!htmlPath || !modelPath) {
  console.error('usage: node check.mjs <architecture-map.html> <model.js>');
  process.exit(2);
}

const browser = findBrowser();
if (!browser) {
  console.error('No Chrome/Chromium/Edge/Brave found. Set CHROME_PATH, or open the file in a browser and check the devtools console.');
  process.exit(3);
}

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(modelPath, 'utf8') + '\n;globalThis.__M = MODEL;', ctx);
const M = ctx.__M;

const states = [''];
for (const l of Object.keys(M.lenses)) if (l !== 'runtime') states.push(`lens=${l}`);
for (const n of M.nodes) if (n.children) states.push(`view=${n.id}`);
for (const f of M.flows) states.push(`flow=${f.id}`);

const base = pathToFileURL(path.resolve(htmlPath)).href;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'archmap-check-'));
let failed = 0;
console.log(`Browser: ${browser}\nChecking ${states.length} state(s)…`);
try {
  for (const s of states) {
    const r = spawnSync(browser, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${profile}`, '--enable-logging=stderr', '--v=0',
      '--virtual-time-budget=3000', '--dump-dom', s ? `${base}#${s}` : base
    ], { encoding: 'utf8', timeout: 60000, maxBuffer: 64 << 20 });
    const dom = r.stdout || '';
    const nodes = (dom.match(/<g class="node/g) || []).length;
    const problems = (r.stderr || '').split('\n')
      .filter(l => /CONSOLE|Uncaught/.test(l))
      .filter(l => /Uncaught|missing|Error/i.test(l))
      .map(l => l.replace(/^\[[^\]]*\]\s*/, '').trim());
    const ok = nodes > 0 && problems.length === 0 && !r.error;
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'}  #${s || '(root)'}  — ${nodes} node(s)`);
    if (r.error) console.log(`      ${r.error.message}`);
    problems.forEach(p => console.log(`      ${p}`));
  }
} finally {
  fs.rmSync(profile, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} state(s) failed.` : '\nAll states render without errors.');
process.exit(failed ? 1 : 0);

function findBrowser() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const pf = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const files = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    ].flatMap(p => [p, path.join(os.homedir(), p)]),
    win32: pf.flatMap(d => [
      path.join(d, 'Google/Chrome/Application/chrome.exe'),
      path.join(d, 'Microsoft/Edge/Application/msedge.exe'),
      path.join(d, 'Chromium/Application/chrome.exe')
    ])
  }[process.platform] || [];
  const hit = files.find(f => fs.existsSync(f));
  if (hit) return hit;
  for (const cmd of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser']) {
    try {
      const p = execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n')[0].trim();
      if (p) return p;
    } catch {}
  }
  return null;
}
