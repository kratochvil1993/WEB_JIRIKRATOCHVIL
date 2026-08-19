# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static one-page site for Jiří Kratochvíl — web/e-shop developer and portrait photographer. Content is in Czech (`lang="cs"`). Pure HTML/CSS/JS, no framework, no build tools, no package manager.

## Git workflow

Commit and push are two separate approvals — never assume one implies the other. Commit directly to `main` (no feature branches) when asked to commit, but do **not** run `git push` unless explicitly told to push (e.g. "pushni") — a push to `origin/main` triggers an immediate Netlify deploy, so it needs its own go-ahead even right after a commit was requested.

## Commands

There is no build, lint, or test tooling in this repo. To preview locally, serve the root over HTTP (opening `index.html` via `file://` breaks relative fetches/CORS for some assets):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

`index.html`, `gdpr.html`, and `sitemap.html` all load `script.min.js`/`style.min.css`, not `script.js`/`style.css` — after **any** edit to `script.js` or `style.css`, regenerate the matching minified file (requires Node, via `npx`, no local install needed):

```bash
npx terser@5 script.js --compress --mangle --comments false -o script.min.js
npx clean-css-cli@5 -o style.min.css style.css
```

Commit the regenerated `script.min.js`/`style.min.css` along with the source change — there is no Netlify build step (see Deployment below), so the minified files are what actually ship. Forgetting this means the site keeps serving stale CSS/JS.

Photos in `assets/images/` are committed as-is (no build-time image pipeline). If a new/replacement photo comes in oversized for how it's actually displayed (check the CSS — cards here render at well under half the viewport), downscale and recompress it before committing, e.g.:

```bash
dwebp photo.webp -o photo.png
sips -Z 1200 photo.png            # resize longest side to 1200px, keep aspect ratio
cwebp -q 82 photo.png -o photo.webp
```

Pick the resize width from where the image actually renders (2x its CSS display width covers retina); 1200px has been the right ballpark for the `.photo-card` portraits. Update the `<img>`'s `width`/`height` attributes to match the new pixel dimensions.

## Deployment

Netlify, auto-deploy from the `main` branch on GitHub. `netlify.toml` sets `publish = "."` — **the entire repo root is what gets published**, so only files meant to be public should live there (this is why `_design/` is git-ignored rather than just left in place). Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are applied to all paths via `netlify.toml`. `assets/vendor/*` additionally gets a one-year immutable `Cache-Control` there — those files never change in place, so treat a library version bump as replacing the files wholesale, not patching them.

All internal references (`style.min.css`, `script.min.js`, `gdpr.html`) use relative paths — keep it that way for anything new so Netlify serves it correctly regardless of path depth.

## Structure

- `index.html` — the whole one-page site: fixed navbar, `#hero`, `#section-web` (web/e-shop pitch), `#section-portrait` (photography pitch), `#section-marketing` (Google Ads / online marketing pitch), `#contact` (Netlify Forms contact form), footer.
- `gdpr.html` — standalone privacy-policy page, linked from the footer and from the contact form's consent checkbox.
- `sitemap.html` — standalone human-readable sitemap page, linked from the footer. Not to be confused with `sitemap.xml` (the machine-readable one referenced from `robots.txt`) — keep both in sync when a page is added or removed.
- `robots.txt` / `sitemap.xml` — at the repo root (published as-is, no templating). `sitemap.xml` needs a `lastmod` bump on a URL when that page's content meaningfully changes.
- `style.css` — single stylesheet. Defines CSS custom properties (`--purple`, `--magenta`, `--grad-a`, `--grad-b`, `--grad-angle`, etc.) that `script.js` mutates at runtime to drive the scroll-linked background gradient. This is the file to edit.
- `style.min.css` — generated from `style.css` via the `npx clean-css-cli` command above (see Commands). This is what all three HTML pages actually `<link>`; it's committed to git since there's no Netlify build step. Never hand-edit it.
- `script.js` — single vanilla-JS IIFE, no framework. This is the file to edit. See "Animation architecture" below.
- `script.min.js` — generated from `script.js` via the `npx terser` command above (see Commands). This is what `index.html` actually `<script src>`s; it's committed to git since there's no Netlify build step. Never hand-edit it.
- `assets/logo.webp` — header logo, downloaded locally from `jirikratochvil.eu` (no longer loaded externally).
- `assets/vendor/` — vendored third-party libraries (Bootstrap, Bootstrap Icons, GSAP), see "External dependencies" below.
- `_design/` — git-ignored Claude Design (claude.ai/design) handoff bundle; this is the canonical design source. If the design changes upstream, re-sync it via the `claude_design` MCP (`DesignSync` tool: `get_project` / `list_files` / `get_file` against the project id in `_design/README.md`), diff against the root files, then copy over.

## Structured data (SEO)

`index.html` carries the canonical JSON-LD `@graph` (in `<head>`): `Person` (`#person`), `WebSite` (`#website`), `WebPage` (`#webpage`), and one `Service` node per pitch section (`#service-web`, `#service-portrait`, `#service-marketing`). `gdpr.html` and `sitemap.html` each have their own minimal JSON-LD block, but it must reference the shared entities by `@id` (e.g. `"isPartOf": { "@id": "https://jirikratochvil.eu/#website" }`) rather than re-declaring `WebSite`/`Person` inline — inline duplicates create disconnected entities in Google's graph instead of reinforcing the same ones. Each secondary page's JSON-LD is itself an `@graph` of its own `WebPage` node (with its own `@id`) plus a `BreadcrumbList`. If a new top-level page is added, give it the same treatment: page-specific `meta description`/`canonical`/`og:*`/`twitter:*` tags (index.html's are the template) and a JSON-LD `@graph` that links into `#person`/`#website` by `@id` instead of duplicating them.

## External dependencies

Vendored locally in `assets/vendor/` (no `node_modules`, no package manager — files are committed as-downloaded and never hand-edited):

- Bootstrap 5.3.3 (CSS + bundle JS) — `assets/vendor/bootstrap/`
- Bootstrap Icons 1.11.3 (CSS + `fonts/*.woff2`/`.woff`) — `assets/vendor/bootstrap-icons/`
- GSAP 3.12.5 + ScrollTrigger + ScrollToPlugin — `assets/vendor/gsap/`

Only Google Fonts "Inter" is still loaded from a CDN (`fonts.googleapis.com`/`fonts.gstatic.com`) — intentional, since self-hosting fonts means manually tracking font-face updates and Google's CDN is fast/well-cached anyway.

To upgrade a vendored library, re-download the matching version's files from jsDelivr/cdnjs into the same `assets/vendor/*` paths and commit them — don't switch back to a `<script src="https://…">`/`<link href="https://…">` CDN reference for these three.

## Animation architecture (script.js)

Everything is driven by GSAP + ScrollTrigger plus one custom `<canvas>` particle system. Key pieces, in the order they appear:

- **Navbar**: `.scrolled` class toggled past 40px scroll (blur/background transition, CSS-driven).
- **Custom cursor** (`#cursor`): follows the pointer via `gsap.to`; disabled entirely on touch/coarse-pointer devices.
- **Hero typewriter**: cycles through a `roles` array into `#roleText`.
- **Scroll-linked gradient**: a `ScrollTrigger` on `document.body` lerps between color `stops` (one per section) and writes the result into the `--grad-a`/`--grad-b`/`--grad-angle` CSS vars consumed by `style.css`.
- **Pinned "scrollytelling" sections** (`buildPinned()`): `#section-web`, `#section-portrait`, and `#section-marketing` get pinned via `ScrollTrigger` with `pin: true`; `.fade-el` text reveals on `onEnter`/`onLeave`, and `.pin-graphic` gets a scale/rotate tween. This is the most complex/fragile part of the file — changes to section markup must keep the `.fade-el` and `.pin-graphic` selectors intact or the reveal breaks silently.
- **Particle canvas** (`#particle-canvas`): custom rAF loop, not GSAP. `sectionConfigs` defines per-section density/speed/hue/size (and whether particles draw connecting lines); the active config swaps based on which section is vertically centered in the viewport (`updateSectionByScroll`, which reads a matching `sections` id array — keep both arrays in the same order when adding/removing sections).
- **`lowPower` flag** (`prefers-reduced-motion` or viewport ≤ 991px): disables/simplifies pinning, the custom cursor, particle link-lines, and card tilt. **Any animation change needs to be mirrored in both the normal and `lowPower` code paths** — mobile and reduced-motion users get a deliberately simpler experience, not just a slower one.
- **Contact form**: plain Netlify Forms (`data-netlify="true"`, honeypot field `bot-field`). The only JS is disabling the submit button on submit — actual form handling/storage is entirely Netlify's, not this codebase's.
