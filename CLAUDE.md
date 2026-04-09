# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Shopify theme export for the "Avion Legacy Cannabis" store, built on the "Pitch" theme (v3.1.0). It uses Shopify's Liquid templating language, vanilla JavaScript (ES6+), and CSS with CSS variables for dynamic theming.

There is no Node.js build system, no npm scripts, and no compilation step. Assets are served directly by Shopify. Deployment is done via Shopify CLI (not included in this export).

## Architecture

### Directory Structure

- **`layout/`** — Master page wrappers. `theme.liquid` is the root HTML shell; everything renders inside it.
- **`templates/`** — JSON files that define which sections appear on each page type (index, product, collection, cart, etc.). Some pages have variants (e.g., `product.hoodies.json`).
- **`sections/`** — Liquid files that render dynamic, configurable page sections. These are the main building blocks. Custom Avion sections are prefixed `avion-`.
- **`blocks/`** — Smaller components nested inside sections.
- **`snippets/`** — Reusable Liquid partials, included via `{% render 'snippet-name' %}`.
- **`assets/`** — CSS and JS files served directly. Key files:
  - `base.css` — Main stylesheet
  - `avion-base.css`, `avion-components.css`, `avion-tokens.css` — Avion brand overrides
  - `critical.js` — Viewport-critical JS loaded early
  - `events.js` — Custom event bus for inter-component communication
  - `component.js` — Shared UI utilities
- **`config/`** — `settings_schema.json` defines all theme settings; `settings_data.json` stores the current active values.
- **`locales/`** — i18n translation files (51 languages). `en.default.json` is the source of truth.

### Key Patterns

**Theming via CSS variables:** Color schemes are defined in `settings_data.json` and rendered as CSS custom properties by `snippets/color-schemes.liquid`. Seven named schemes plus six custom Avion variants.

**Section/block composition:** Page layout is assembled from sections listed in template JSON files. Each section has a `{% schema %}` block that defines its settings and block types.

**Event-driven JS:** Components communicate via a custom event bus in `events.js`. Prefer dispatching named events over direct DOM coupling.

**Snippet rendering:** Use `{% render 'snippet-name', param: value %}` — snippets do not inherit parent scope.

### Custom Avion Sections

The brand-specific sections tell the Avion story:
- `avion-legacy-split.liquid` — Legacy product positioning
- `avion-plane-intro.liquid` — Aviation imagery/branding
- `avion-reinvention-split.liquid` — Reinvention narrative
- `avion-floating.liquid` — Special layout effects
- `avion-hero-poster.liquid` — Hero variants
- `about-us-avion.liquid` — About page content

### Typography & Branding

- Headings: **Young Serif**
- Body: **Source Serif**
- Logo: `shopify://shop_images/Avion_Logo_-_Final.png`
- Klaviyo is the email marketing integration

## Shopify Liquid Conventions

- Settings from `config/settings_data.json` are accessed via `{{ settings.setting_name }}` in Liquid.
- Section settings are accessed via `{{ section.settings.setting_name }}`.
- Block iteration: `{% for block in section.blocks %}`.
- Output escaping is automatic; use `| raw` filter only when HTML output is intentional.
- Translations: `{{ 'key' | t }}` pulls from the active locale file.
