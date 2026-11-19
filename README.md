# architecture-map

A Claude Code plugin with one skill, `architecture-map`. It investigates a set of repositories and builds an **interactive architecture map** of the system as a single HTML file.

- Zoomable, pannable SVG map with a minimap
- Double-click a system to drill into its internal modules
- **Runtime**, **CI/CD** and **Observability** lenses
- Step-by-step walkthroughs of request flows
- Search, plus GitHub and VS Code links for every system and module
- Deep links to any view through the URL hash
- No server, build step or CDN; it opens straight from disk

Everything on the map comes from evidence in the code. Connections that couldn't be confirmed are drawn dotted and listed as inferred.

## Install

In Claude Code:

```
/plugin marketplace add rizvanua/architecture-map
/plugin install architecture-map@architecture-map
```

Without the plugin system, copy the skill folder by hand:

```bash
git clone https://github.com/rizvanua/architecture-map.git
cp -R architecture-map/plugins/architecture-map/skills/architecture-map ~/.claude/skills/
```

## Use

```
/architecture-map Orders platform ~/code/orders-api ~/code/payments-service ~/code/web-app
```

Or just ask: *"build an architecture map of how these services connect"*.

The result is `architecture-map.html` plus `model.js`. `model.js` is the source of truth: edit it and rebuild to update the map. See the [skill README](plugins/architecture-map/skills/architecture-map/README.md) for details.

## Requirements

- Node.js 18+
- Chrome, Chromium, Edge or Brave for the automated render check (optional; set `CHROME_PATH` if it isn't found)
