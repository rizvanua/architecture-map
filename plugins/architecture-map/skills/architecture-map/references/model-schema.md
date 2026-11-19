# MODEL schema

`model.js` declares one global, `const MODEL = {…};`. It's plain JS, so you can build it in layers: write a base runtime model, then add the CI/CD and observability layers with `push` / `Object.assign`. Start from `assets/example-model.js`.

Text fields (`desc`, `details`, `line`, `text`, `label`, intro, glossary) support `**bold**`, `` `code` `` and `[label](https://…)`.

## Top level

| key | shape | notes |
|---|---|---|
| `title` | string | Page title. You can override it with `--title`. |
| `roots` | `{ alias: '/abs/local/path' }` | Used for `vscode://file` links. A repo id `alias/rest` resolves to `roots[alias]/rest`. |
| `repoMeta` | `{ 'alias/repo': { url, branch, sub, types: { '<path>': 'f'\|'d' } } }` | A GitHub link is only rendered for paths listed in `types` (`''` = repo root). `sub` is a monorepo sub-folder. |
| `edgeTypes` | `{ key: { label, color, desc } }` | `http` is **required** because the renderer falls back to it. |
| `kinds` | `{ key: { icon, label, fill } }` | `service` and `module` are **required**. |
| `lenses` | `{ key: { label, types:[edgeType…], desc } }` | Ids are special: `runtime` (required, default), `delivery` (shows `node.cicd`), `observe` (shows `node.obs`), `all`. |
| `groups` | `[ { id, label, color, short, desc, docs?, lenses? } ]` | Swim-lanes or domains. The box is sized automatically around its members. |
| `nodes` | see below | Top-level systems. |
| `edges` | `[ { from, to, type, label, inferred?, detail?, evidence? } ]` | `from`/`to` can be a node id **or a group id** (meaning "the whole domain"). |
| `flows` | see below | Step-by-step walkthroughs. |
| `overview` | `{ title, intro:[…], glossary:[[term,def]], caveats:[…], generated }` | Shown in the panel when nothing is selected. |

## Node

```js
{ id, label, kind, group,
  x, y,                    // GRID units: column ×270px, row ×120px; box is 210×70. Fractions OK (e.g. 1.3).
  tech,                    // second line of the box
  desc,                    // 1–3 sentences
  team?, repo?,            // repo = key of repoMeta / roots alias path
  repoSub?,                // sub-folder inside the repo for this node
  docs?: [{ label, url, note? }],
  details?: { 'Section': 'text' | ['bullet', …] },
  cicd?: { line, details },   // bottom line + panel block when the delivery lens is on
  obs?:  { line, details },   // same for the observe lens
  lenses?: ['delivery'],      // node belongs only to these lenses (dimmed elsewhere)
  children?: { nodes: [Module…], edges: [ChildEdge…] }   // makes the box drillable (⊕)
}
```

**Module** (inside `children.nodes`): `{ id, label, x, y, kind?='module', path?, sub?, desc, files?:[paths], details?, docs? }`. Its `x`/`y` are local to the drill-down view.

**ChildEdge**: `{ from, to, type, label, inferred? }`. Put `@` in front of a top-level node id (`'@db'`) to reference something outside this node. It's drawn as a dashed ghost on the left (inbound) or right (outbound), and double-clicking it jumps to that node.

## Flow

```js
{ id, label, desc,
  lens?,            // switch to this lens when the flow starts
  view?,            // 'root' (default) or a node id with children → the flow runs inside that drill-down
  docs?,
  steps: [ { from, to, text, ref? } ]   // ids must exist on that view (module ids or '@ghost' ids when view is set)
}
```

## Layout tips

- Put things left to right in request order: clients (x≈0) → UI/edge → services → workers/async → stores/external.
- Give CI/CD and observability their own rows or columns, and tag them with `lenses` so they're dimmed in the Runtime lens.
- Leave at least 1.1 columns and 0.9 rows between boxes, otherwise edge labels collide.
- Keep a group's members next to each other, because the group rectangle is the bounding box of all of them.
