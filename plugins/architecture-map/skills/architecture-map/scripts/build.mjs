#!/usr/bin/env node
// Validate an architecture-map model and inject it into the HTML template.
// Usage: node build.mjs <model.js> <out.html> [--title "My System Map"]
// model.js must assign a global: `const MODEL = {...};` (plain JS, may compute values).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [modelPath, outPath, ...rest] = process.argv.slice(2);
if (!modelPath || !outPath) {
  console.error('usage: node build.mjs <model.js> <out.html> [--title "…"]');
  process.exit(2);
}
const ti = rest.indexOf('--title');
const src = fs.readFileSync(modelPath, 'utf8');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__M = MODEL;', ctx, { filename: modelPath });
const M = ctx.__M;
const title = ti >= 0 ? rest[ti + 1] : (M.title || 'Architecture Map');

const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

for (const k of ['roots', 'edgeTypes', 'kinds', 'lenses', 'groups', 'nodes', 'edges', 'flows', 'overview'])
  if (M[k] == null) err(`MODEL.${k} is missing`);
if (errors.length) report();

if (!M.edgeTypes.http) err('edgeTypes.http is required (renderer fallback)');
if (!M.kinds.service) err('kinds.service is required (renderer fallback)');
if (!M.kinds.module) err('kinds.module is required (drill-down default)');
if (!M.lenses.runtime) err('lenses.runtime is required (default lens)');
for (const [k, l] of Object.entries(M.lenses))
  for (const t of l.types || []) if (!M.edgeTypes[t]) err(`lens ${k}: unknown edge type ${t}`);
if (!Array.isArray(M.overview.intro)) err('overview.intro must be an array of paragraphs');

const groups = new Map(), nodes = new Map();
for (const g of M.groups) { if (groups.has(g.id)) err(`duplicate group id ${g.id}`); groups.set(g.id, g); }
for (const n of M.nodes) {
  if (nodes.has(n.id) || groups.has(n.id)) err(`duplicate id ${n.id}`);
  nodes.set(n.id, n);
  if (!groups.has(n.group)) err(`node ${n.id}: unknown group ${n.group}`);
  if (!M.kinds[n.kind]) err(`node ${n.id}: unknown kind ${n.kind}`);
  if (typeof n.x !== 'number' || typeof n.y !== 'number') err(`node ${n.id}: x/y must be numbers (grid units)`);
  if (n.repo && M.repoMeta && !M.repoMeta[n.repo]) warn(`node ${n.id}: repo ${n.repo} has no repoMeta entry (no GitHub link)`);
  if (n.repo && !M.roots[n.repo.split('/')[0]]) warn(`node ${n.id}: repo alias ${n.repo.split('/')[0]} not in roots`);
  if (!n.desc) warn(`node ${n.id}: no desc`);
}

// overlapping boxes at root level
const seen = new Map();
for (const n of M.nodes) {
  const k = `${Math.round(n.x * 4)}|${Math.round(n.y * 4)}`;
  if (seen.has(k)) warn(`nodes ${seen.get(k)} and ${n.id} overlap at (${n.x},${n.y})`);
  seen.set(k, n.id);
}

const known = id => nodes.has(id) || groups.has(id);
M.edges.forEach((e, i) => {
  if (!known(e.from)) err(`edge #${i} ${e.from}→${e.to}: unknown from`);
  if (!known(e.to)) err(`edge #${i} ${e.from}→${e.to}: unknown to`);
  if (!M.edgeTypes[e.type]) err(`edge #${i} ${e.from}→${e.to}: unknown type ${e.type}`);
  if (!e.label) warn(`edge #${i} ${e.from}→${e.to}: no label`);
});

for (const n of M.nodes) {
  if (!n.children) continue;
  const ids = new Set();
  for (const c of n.children.nodes) {
    if (ids.has(c.id)) err(`${n.id}/children: duplicate id ${c.id}`);
    ids.add(c.id);
    if (c.kind && !M.kinds[c.kind]) err(`${n.id}/${c.id}: unknown kind ${c.kind}`);
  }
  for (const e of n.children.edges || []) for (const end of [e.from, e.to]) {
    if (end[0] === '@') { if (!nodes.has(end.slice(1))) err(`${n.id}/children edge: @ref ${end} is not a top-level node`); }
    else if (!ids.has(end)) err(`${n.id}/children edge ${e.from}→${e.to}: unknown ${end}`);
    if (!M.edgeTypes[e.type]) err(`${n.id}/children edge ${e.from}→${e.to}: unknown type ${e.type}`);
  }
}

for (const f of M.flows) {
  const view = f.view && f.view !== 'root' ? nodes.get(f.view) : null;
  if (f.view && f.view !== 'root' && !view?.children) err(`flow ${f.id}: view ${f.view} has no children`);
  if (f.lens && !M.lenses[f.lens]) err(`flow ${f.id}: unknown lens ${f.lens}`);
  const ok = id => view ? view.children.nodes.some(c => c.id === id) || (id[0] === '@' && nodes.has(id.slice(1))) : known(id);
  f.steps.forEach((s, i) => {
    if (!ok(s.from) || !ok(s.to)) err(`flow ${f.id} step ${i + 1}: ${s.from}→${s.to} not on the ${f.view || 'root'} view`);
    if (!s.text) warn(`flow ${f.id} step ${i + 1}: no text`);
  });
}

for (const [repo, m] of Object.entries(M.repoMeta || {})) {
  const root = M.roots[repo.split('/')[0]];
  if (!root) continue;
  const base = path.join(root, repo.slice(repo.indexOf('/') + 1));
  for (const [p, t] of Object.entries(m.types || {})) {
    const full = path.join(base, p);
    if (!fs.existsSync(full)) warn(`repoMeta ${repo}: path not found locally: ${p}`);
    else if ((t === 'd') !== fs.statSync(full).isDirectory()) warn(`repoMeta ${repo}: ${p} marked '${t}' but is ${t === 'd' ? 'a file' : 'a directory'}`);
  }
}

report();

function report() {
  warns.forEach(w => console.warn('WARN  ' + w));
  errors.forEach(e => console.error('ERROR ' + e));
  if (errors.length) { console.error(`\n${errors.length} error(s) — not written.`); process.exit(1); }
  const tpl = fs.readFileSync(path.join(here, '../assets/template.html'), 'utf8');
  const html = tpl.replaceAll('__TITLE__', title.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])))
    .replace('/*__MODEL__*/', () => src.replace(/<\/script/gi, '<\\/script'));
  fs.writeFileSync(outPath, html);
  const mods = M.nodes.reduce((a, n) => a + (n.children?.nodes.length || 0), 0);
  const inf = M.edges.filter(e => e.inferred).length;
  console.log(`OK  ${outPath}\n    ${M.groups.length} groups · ${M.nodes.length} nodes · ${M.edges.length} edges (${inf} inferred) · ${mods} modules · ${M.flows.length} flows · ${warns.length} warning(s)`);
  process.exit(0);
}
