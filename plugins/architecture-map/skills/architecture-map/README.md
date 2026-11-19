# Architecture Map

Architecture Map investigates a set of repositories and builds an interactive map of how the system fits together, as a single HTML file.
It covers what the parts are, how they talk to each other, where the code lives, how each part ships, and how it's observed.
Everything on the map comes from evidence in the code; connections the agent couldn't confirm are drawn dotted and listed as inferred.

## How to invoke it

Name the system and point at the repositories, for example:

```text
/architecture-map Orders platform ~/code/orders-api ~/code/payments-service ~/code/web-app
```

Or describe it in plain words: "build an architecture map of how our checkout, payments and notification services connect".
The skill asks only for what it can't infer, usually which repos are in scope and which user journeys matter most.

## What a run does

1. **Discovery:** reads each repository (in parallel for large systems) and records, with file paths:
   - runtime connections: HTTP clients and routes, topics produced and consumed, data stores, LLM calls, UI embedding
   - the modules that matter inside each system
   - CI/CD pipelines and deploy mechanisms
   - observability setup
2. **Model:** writes everything to `model.js`, a plain data file describing the systems, their connections, drill-down modules and flows.
3. **Build:** `scripts/build.mjs` validates the model and stops on any broken reference, such as an edge, flow step or drill-down that points at an unknown id. It then injects the model into a fixed, pre-tested renderer.
4. **Verify:** `scripts/check.mjs` opens every view in a headless browser (root, each lens, each drill-down, each flow) and fails on any JS error.

## Output

Two files, written next to each other:

- `architecture-map.html`: opens straight from disk, with no server, build step or CDN.
- `model.js`: the source of truth. To update the map, edit it and rerun the build command printed at the end of the run.

The map lets you:

- pan and zoom, with a minimap
- click any box for details and links (GitHub and VS Code)
- double-click a ⊕ box to see its internal modules
- switch between **Runtime**, **CI/CD** and **Observability** lenses
- search with `/`
- step through request flows with ← →

Every state is deep-linkable through the URL hash, for example `#flow=place-order` or `#view=orders-api`.

## Requirements

- **Node.js 18+** for the build and check scripts.
- **Chrome, Chromium, Edge or Brave** for the automated render check. The browser is found automatically on macOS, Linux and Windows, or you can set `CHROME_PATH`. Without one, the skill still builds the map but tells you it couldn't verify it.

## Sharing maps

A generated map contains internal repository URLs and architecture details.
Treat it as internal documentation: share it inside your organization (wiki, internal repo), not in public channels.
