# GMAnt's Eladrin — CLAUDE.md

## Overview

Eladrin season management for D&D 5e. Change your Eladrin's season with one click — swap token art, portrait, and Fey Step racial feature. Includes interactive Fey Step teleport with seasonal particle effects.

**Module ID:** `gmants-eladrin`
**System:** D&D 5e (dnd5e)
**Status:** Release-ready
**Brand:** VTTools by GM Ant

## Architecture

Single ApplicationV2 dialog (`EladrinSeasonDialog`) with a 2x2 season grid and collapsible image configuration.

### Key Files

| File | Purpose |
|------|---------|
| `scripts/main.js` | Entry point, hooks, scene control button, public API |
| `scripts/const.js` | MODULE_ID, FLAGS, SEASONS definitions |
| `scripts/settings.js` | Settings registration, Eladrin opt-in header button |
| `scripts/season-data.js` | `isEladrin()` detection, season getters/setters |
| `scripts/image-manager.js` | Save/load/delete per-season token + portrait images |
| `scripts/compendium-seeder.js` | Item lookup from compendium and swap logic |
| `scripts/season-particles.js` | PIXI particle ring for Fey Step teleport range |
| `scripts/teleport.js` | Interactive Fey Step teleport handler with effects |
| `scripts/dialog/EladrinSeasonDialog.js` | Main ApplicationV2 dialog |
| `templates/eladrin-dialog.hbs` | Handlebars template |
| `styles/module.css` | All CSS (scoped with `.eladrin` app class) |

### Data Storage

```
flags['gmants-eladrin'].eladrinSeason = "spring" | "summer" | "autumn" | "winter"
flags['gmants-eladrin'].eladrinImages = {
  spring:  { token: "path/to/token.webp", portrait: "path/to/portrait.webp" },
  summer:  { ... }, autumn: { ... }, winter: { ... }
}
flags['gmants-eladrin'].eladrinOptIn = true  // manual opt-in for non-Eladrin actors
```

### Eladrin Detection

Two paths in `isEladrin(actor)`:
1. Auto-detect: checks race item name or `system.details.race` for "Eladrin"
2. Manual opt-in: `eladrinOptIn` flag (toggled via actor sheet header button)

### Season Change Flow

1. Apply saved token/portrait images from flags
2. Update `eladrinSeason` flag
3. Swap Fey Step + Eladrin Season items from compendium (preserves spent uses)
4. Post chat message: "{name} shifts to their {season} aspect."

### Compendium

Pre-built LevelDB pack `gmants-eladrin-items` with 9 items:
- 4 Fey Step variants (Spring, Summer, Autumn, Winter)
- 4 Eladrin Season tracker items
- 1 "All Seasons" reference item

Source JSON in `packs/_source/gmants-eladrin-items/`.

### Fey Step Teleport

Interactive teleport triggered by `dnd5e.postUseActivity` hook:
- Seasonal particle ring shows 30ft range
- Ghost token outline follows cursor (green=in range, red=out)
- Snap-to-grid placement
- Sequencer + JB2A animations if available, simple fade fallback
- Auto-triggers seasonal bonus (damage/save) after teleport

## Deployment

```bash
bash deploy.sh
```
Copies to `R:\Foundry\Data\modules\gmants-eladrin\`

## Public API

```javascript
game.modules.get("gmants-eladrin").api.open()
```

## Building Compendium Packs

Source JSON files are in `packs/_source/`. To rebuild LevelDB packs:

```bash
fvtt package pack -n gmants-eladrin-items -t Item --in packs/_source/gmants-eladrin-items --out packs/gmants-eladrin-items
fvtt package pack -n gmants-eladrin-macros -t Macro --in packs/_source/gmants-eladrin-macros --out packs/gmants-eladrin-macros
```

Then flatten the nested output directory (fvtt CLI creates a subdirectory):
```bash
mv packs/gmants-eladrin-items/gmants-eladrin-items/* packs/gmants-eladrin-items/
rmdir packs/gmants-eladrin-items/gmants-eladrin-items
```
