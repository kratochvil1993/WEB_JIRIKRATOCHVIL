# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static one-page site for Jiří Kratochvíl — web/e-shop developer and portrait photographer. Content is in Czech (`lang="cs"`). Pure HTML/CSS/JS, no framework, no build tools, no package manager.

## Commands

There is no build, lint, or test tooling in this repo. To preview locally, serve the root over HTTP (opening `index.html` via `file://` breaks relative fetches/CORS for some assets):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

## Deployment

Netlify, auto-deploy from the `main` branch on GitHub. `netlify.toml` sets `publish = "."` — **the entire repo root is what gets published**, so only files meant to be public should live there (this is why `_design/` is git-ignored rather than just left in place). Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are applied to all paths via `netlify.toml`.

All internal references (`style.css`, `script.js`, `gdpr.html`) use relative paths — keep it that way for anything new so Netlify serves it correctly regardless of path depth.

## Structure

- `index.html` — the whole one-page site: fixed navbar, `#hero`, `#section-web` (web/e-shop pitch), `#section-portrait` (photography pitch), `#contact` (Netlify Forms contact form), footer.
- `gdpr.html` — standalone privacy-policy page, linked from the footer and from the contact form's consent checkbox.
- `style.css` — single stylesheet. Defines CSS custom properties (`--purple`, `--magenta`, `--grad-a`, `--grad-b`, `--grad-angle`, etc.) that `script.js` mutates at runtime to drive the scroll-linked background gradient.
- `script.js` — single vanilla-JS IIFE, no framework. See "Animation architecture" below.
- `_design/` — git-ignored Claude Design (claude.ai/design) handoff bundle; this is the canonical design source. If the design changes upstream, re-sync it via the `claude_design` MCP (`DesignSync` tool: `get_project` / `list_files` / `get_file` against the project id in `_design/README.md`), diff against the root files, then copy over.

## External dependencies (CDN only — no `node_modules`)

- Bootstrap 5.3.3 (CSS + bundle JS), jsDelivr
- GSAP 3.12.5 + ScrollTrigger, cdnjs
- Google Fonts "Inter"
- The header logo image is loaded from `https://www.jirikratochvil.eu/...` — it is intentionally external, not a local asset.

## Animation architecture (script.js)

Everything is driven by GSAP + ScrollTrigger plus one custom `<canvas>` particle system. Key pieces, in the order they appear:

- **Navbar**: `.scrolled` class toggled past 40px scroll (blur/background transition, CSS-driven).
- **Custom cursor** (`#cursor`): follows the pointer via `gsap.to`; disabled entirely on touch/coarse-pointer devices.
- **Hero typewriter**: cycles through a `roles` array into `#roleText`.
- **Scroll-linked gradient**: a `ScrollTrigger` on `document.body` lerps between color `stops` (one per section) and writes the result into the `--grad-a`/`--grad-b`/`--grad-angle` CSS vars consumed by `style.css`.
- **Pinned "scrollytelling" sections** (`buildPinned()`): `#section-web` and `#section-portrait` get pinned via `ScrollTrigger` with `pin: true`; `.fade-el` text reveals on `onEnter`/`onLeave`, and `.pin-graphic` gets a scale/rotate tween. This is the most complex/fragile part of the file — changes to section markup must keep the `.fade-el` and `.pin-graphic` selectors intact or the reveal breaks silently.
- **Particle canvas** (`#particle-canvas`): custom rAF loop, not GSAP. `sectionConfigs` defines per-section density/speed/hue/size (and whether particles draw connecting lines); the active config swaps based on which section is vertically centered in the viewport (`updateSectionByScroll`).
- **`lowPower` flag** (`prefers-reduced-motion` or viewport ≤ 991px): disables/simplifies pinning, the custom cursor, particle link-lines, and card tilt. **Any animation change needs to be mirrored in both the normal and `lowPower` code paths** — mobile and reduced-motion users get a deliberately simpler experience, not just a slower one.
- **Contact form**: plain Netlify Forms (`data-netlify="true"`, honeypot field `bot-field`). The only JS is disabling the submit button on submit — actual form handling/storage is entirely Netlify's, not this codebase's.
