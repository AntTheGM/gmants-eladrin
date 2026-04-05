# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-04-05

### Added
- One-click season change (Spring, Summer, Autumn, Winter) for Eladrin characters
- Automatic token art and portrait swapping per season
- Fey Step racial feature swap from pre-built compendium (preserves spent uses)
- Interactive Fey Step teleport with 30ft range ring and ghost token preview
- Seasonal particle effects (flowers, leaves, snowflakes) during teleport
- Sequencer + JB2A animation support with simple fade fallback
- Automatic seasonal bonus triggers (damage/saves) after teleport
- MIDI QOL integration mode (renames Fey Step instead of replacing, preserving automation)
- Manual Eladrin opt-in toggle for non-standard race setups
- Actor sheet header button for quick access
- Scene control button for opening the season dialog
- Public API: `game.modules.get("gmants-eladrin").api.open()`
- Pre-built compendium with 4 Fey Step variants, 4 season trackers, and All Seasons reference

[Unreleased]: https://github.com/AntTheGM/gmants-eladrin/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/AntTheGM/gmants-eladrin/releases/tag/v1.0.0
