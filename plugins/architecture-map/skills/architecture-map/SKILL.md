---
name: architecture-map
description: Build a self-contained interactive architecture map of a multi-repo system by investigating its code — one HTML file with a zoomable SVG, drill-down into modules, Runtime/CI-CD/Observability lenses, step-by-step request flows, search and GitHub + VS Code links. Use when the user asks for an "architecture map", "interactive system map", "how do these services/repos connect", "onboarding map of our platform", or to map a system across several repositories. Do NOT use for a single static or hand-drawn diagram (use excalidraw-diagram), or for writing/reviewing a repo's docs/architecture.md (use architecture-guidance).
argument-hint: "[system name] [repo paths or org/repos…]"
metadata:
  status: pilot
  maintainer: rizvanua
  human-description: Investigates a set of repositories and builds an interactive, drill-down architecture map (runtime, CI/CD and observability views, guided flows) as a single HTML file.
  tags:
    - engineering
    - documentation
    - onboarding
    - ci-cd
    - observability
---

# Architecture map

The output is a single `architecture-map.html` file. It has no build step and no CDN dependencies, and opens directly from `file://`. The renderer already exists in `assets/template.html`. **Don't rewrite it.** Your job is to investigate the system, write `model.js`, and build the page with `scripts/build.mjs`.

Skill files (paths are relative to this SKILL.md):
- `references/model-schema.md`: the full MODEL schema plus layout tips. Read it before writing the model.
- `assets/example-model.js`: a minimal working model. Copy it as your starting point.
- `scripts/build.mjs`: validates the model and injects it into the template.
- `scripts/check.mjs`: renders every view in a headless browser and reports JS errors.

Prerequisites: Node.js 18+. The browser check also needs Chrome, Chromium, Edge or Brave, found automatically or set with `CHROME_PATH`. Run `node --version` first. If Node is missing, stop and tell the user.

## 0. Scope

Work out the inputs from `$ARGUMENTS` and the conversation:
- system name
- source repos or local checkouts
- GitHub URL and default branch for each repo (use `git -C <repo> remote get-url origin` and `git -C <repo> symbolic-ref refs/remotes/origin/HEAD`)
- extra docs (Confluence, ADRs, runbooks)
- target audience
- 3–6 key user journeys

Only ask the user about something you really can't infer, usually the list of repos and the journeys they care about. Pick an output folder too; by default, the folder that contains the repos.

## 1. Discovery (evidence first)

If there are many repos, fan out with Explore or general-purpose subagents, one per repo or small batch of repos. Each one returns structured findings **with file paths**:

1. **Identity:** kind (ui / service / worker / store / bus / topic / external / legacy / tool), language and framework, owning team (CODEOWNERS, catalog-info, README).
2. **Runtime connections:**
   - outbound HTTP/gRPC clients (base URLs, env vars)
   - inbound routes and auth
   - topics produced and consumed (exact names)
   - DBs, indices and buckets
   - LLM/ML calls
   - UI embedding (module federation, iframe, custom element, postMessage)
3. **Modules:** the 5–15 folders or files that matter, what each does, and how they connect to each other and to outside systems.
4. **Delivery:** CI system and pipeline file, quality gates, artifact registry, deploy mechanism, environments and how changes are promoted.
5. **Observability:** tracing/APM, metrics, logs, error tracking, LLM tracing, SLOs-as-code, alert routing, feature flags.
6. **Docs:** links to existing documentation.

Rules:
- **Never invent** topic names, endpoints, paths or owners.
- If you can't confirm something in code, set `inferred: true` and explain why in `desc`/`detail`.
- Add anything unresolved to `overview.caveats`.
- Only put paths in `repoMeta.types` that you've seen exist, marked `'f'` (file) or `'d'` (directory).

## 2. Write `model.js`

Copy `assets/example-model.js` next to the output and replace its content, following `references/model-schema.md`.

Quality bar:
- **Scale:** 25–60 top-level nodes in 6–10 groups. Drill-downs (`children`) for the 5–10 most important systems, with 5–15 modules each.
- **Descriptions:** every node `desc` is 1–3 sentences on what it does and why it matters, plus key files in `details`.
- **Edges:** every edge has a short label naming the protocol, endpoint or topic.
- **Flows:** 3–6 runtime flows, plus delivery/observability flows such as "Ship a backend change" and "Investigate a prod incident". Every step's `ref` names the file or function responsible.
- **Lens content:** add `cicd` / `obs` blocks to each service you have evidence for.
- **Overview:** a glossary of internal jargon and acronyms, the caveats, and a `generated` stamp (date + sources).

## 3. Build and validate

```bash
node <skill-dir>/scripts/build.mjs model.js architecture-map.html --title "<System> — Architecture Map"
```

- **ERROR** lines: unknown ids, edge types, kinds or lenses, or a broken flow step. Nothing is written. Fix them and rebuild.
- **WARN** lines: missing desc or label, overlapping boxes, or a `repoMeta` path that's missing locally. Fix them unless you have a reason not to.

## 4. Verify in a browser

```bash
node <skill-dir>/scripts/check.mjs architecture-map.html model.js
```

This renders the root view, every lens, every drill-down and every flow through URL-hash deep links. It works on macOS, Linux and Windows.

- **Exit 0:** every view rendered nodes and had no `Uncaught`, `edge missing` or `flow step missing` messages.
- **Exit 1:** at least one view failed. Fix the problems it prints, rebuild, and run the check again.
- **Exit 3:** no browser was found. Tell the user to open the file and check the devtools console, and say plainly that you couldn't verify it. Don't claim the map works without having checked.

## 5. Report

Tell the user:
- the file path
- counts (groups, nodes, edges, modules, flows)
- what is marked inferred
- open questions for the owning teams
- how to extend the map: edit `model.js` and rerun the build command

Keep `model.js` next to the HTML, because it's the source of truth for future updates.

## Extending an existing map

If the user already has a map made by this skill, edit its `model.js` and rebuild. Don't regenerate it from scratch. If you have only an HTML file without `model.js`, the model is the `<script>` block before the renderer IIFE. Extract it into `model.js` first.
