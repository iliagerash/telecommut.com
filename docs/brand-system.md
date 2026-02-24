# Telecommut Brand System v1

Last updated: February 24, 2026.

## Direction

- Positioning: high-signal remote hiring marketplace.
- Tone: direct, practical, operations-focused.
- Visual mood: warm technical, editorial, and credible.

## Core Tokens

- Primary hue: deep blue (`--primary`) for trust and navigation anchors.
- Accent hue: amber (`--accent`, `--brand-highlight`) for calls to action.
- Surfaces: layered light neutrals (`--brand-surface`, `--brand-surface-2`) with soft glass panels.
- Typography:
  - Headings: `"Sora", "Avenir Next Condensed", "Trebuchet MS", sans-serif`
  - Body/UI: `"IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif`
- Radius scale: base `0.75rem`, rounded containers and pill navigation for modern utility aesthetic.

## Interaction and Layout

- Page backdrops use structured gradients (`.bg-brand-grid`, `.bg-admin-grid`) instead of flat fills.
- Main content sits in translucent bordered cards (`.glass-panel`) for contrast and scanability.
- Primary actions use filled pills; secondary actions use bordered pills.

## Current Wave 6 Scope

- Implemented: W6-1 baseline direction, W6-3 token/theme layer, W6-4 initial public/admin layout refresh.
- Implemented assets (W6-2 first pass):
  - `public/brand/logo-primary.svg`
  - `public/brand/logo-mark.svg`
  - `public/brand/logo-mono.svg`
  - `public/brand/og-default.svg`
  - `public/favicon.svg`
- Pending: PNG export variants and final accessibility + social metadata validation (W6-5).

## Validation Commands

- `npm run qa:wave6-baseline`: validates required brand assets, OG baseline image dimensions, and skip-link/meta wiring in layouts.
- `npm run ci:check`: includes Wave 6 baseline checks in CI.
