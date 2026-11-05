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

- `index.html` — the whole one-page site: fixed navbar, `#hero` (with a decorative `.scroll-cue`), `#section-web` (web/e-shop pitch), `#section-marketing` (Google Ads / online marketing pitch), `#section-portrait` (photography pitch), `#section-values` ("Proč se mnou" cards), `#contact` (Netlify Forms contact form), footer. The four `.pin-section`s each start with an `aria-hidden` `.section-ghost` div (giant outlined background title that `script.js` slides horizontally while pinned) — decorative, safe to omit from a new section, but keep it `aria-hidden`.
- `gdpr.html` — standalone privacy-policy page, linked from the footer and from the contact form's consent checkbox.
- `sitemap.html` — standalone human-readable sitemap page, linked from the footer. Not to be confused with `sitemap.xml` (the machine-readable one referenced from `robots.txt`) — keep both in sync when a page is added or removed.
- `cookie-consent.js` — Consent Mode v2 banner + GTM loader. GTM is deliberately **deferred** (first pointer/key/scroll/touch event, or ~3.5 s after `load`) so ~300 kB of Google JS stays off the critical path; the consent default in each page's `<head>` and any consent updates just queue in `dataLayer` until then.
- `robots.txt` / `sitemap.xml` — at the repo root (published as-is, no templating). `sitemap.xml` needs a `lastmod` bump on a URL when that page's content meaningfully changes.
- `style.css` — single stylesheet. Defines CSS custom properties (`--purple`, `--magenta`, `--accent2`, `--accent-ice`, `--grad-a`, `--grad-b`, `--grad-angle`, etc.) that `script.js` mutates at runtime to drive the scroll-linked background gradient. This is the file to edit. Palette note: the site is deliberately monochrome azure — `--accent2` (button/icon/bar gradient end) equals the old `--magenta`, and `--accent-ice` is a lighter tint used only for heading gradients. A cyan→blue second hue was tried and rejected (clashes with the teal background); add depth with lightness, not a new hue.
- `style.min.css` — generated from `style.css` via the `npx clean-css-cli` command above (see Commands). This is what all three HTML pages actually `<link>`; it's committed to git since there's no Netlify build step. Never hand-edit it.
- `script.js` — single vanilla-JS IIFE, no framework. This is the file to edit. See "Animation architecture" below.
- `script.min.js` — generated from `script.js` via the `npx terser` command above (see Commands). This is what `index.html` actually `<script src>`s; it's committed to git since there's no Netlify build step. Never hand-edit it.
- `assets/logo.webp` — header logo, downloaded locally from `jirikratochvil.eu` (no longer loaded externally).
- `assets/vendor/` — vendored third-party library (GSAP only), see "External dependencies" below.
- `_design/` — git-ignored Claude Design (claude.ai/design) handoff bundle; this is the canonical design source. If the design changes upstream, re-sync it via the `claude_design` MCP (`DesignSync` tool: `get_project` / `list_files` / `get_file` against the project id in `_design/README.md`), diff against the root files, then copy over.

## Structured data (SEO)

`index.html` carries the canonical JSON-LD `@graph` (in `<head>`): `Person` (`#person`), `WebSite` (`#website`), `WebPage` (`#webpage`), and one `Service` node per pitch section (`#service-web`, `#service-portrait`, `#service-marketing`). `gdpr.html` and `sitemap.html` each have their own minimal JSON-LD block, but it must reference the shared entities by `@id` (e.g. `"isPartOf": { "@id": "https://jirikratochvil.eu/#website" }`) rather than re-declaring `WebSite`/`Person` inline — inline duplicates create disconnected entities in Google's graph instead of reinforcing the same ones. Each secondary page's JSON-LD is itself an `@graph` of its own `WebPage` node (with its own `@id`) plus a `BreadcrumbList`. If a new top-level page is added, give it the same treatment: page-specific `meta description`/`canonical`/`og:*`/`twitter:*` tags (index.html's are the template) and a JSON-LD `@graph` that links into `#person`/`#website` by `@id` instead of duplicating them.

## External dependencies

Vendored locally in `assets/vendor/` (no `node_modules`, no package manager — files are committed as-downloaded and never hand-edited):

- GSAP 3.12.5 + ScrollTrigger + ScrollToPlugin — `assets/vendor/gsap/`

**No Bootstrap, no icon font.** Bootstrap and Bootstrap Icons were removed (~430 kB raw): the top of `style.css` holds a hand-trimmed layer with only what the pages use (reboot, `.container`/`.row`/`.col-*` grid, navbar, `.form-*`, a few `d-*`/`flex`/margin utilities) — if a template needs a new Bootstrap-style utility class, add it there. Icons are an inline SVG sprite (`<symbol id="bi-…">`, right after `<body>` in `index.html`) used as `<svg class="bi"><use href="#bi-name"/></svg>`; to add an icon, copy its `<path>` from the `bootstrap-icons` npm package (`icons/<name>.svg`) into a new `<symbol viewBox="0 0 16 16">`. The mobile menu's collapse is custom (`setNav()` in `script.js`, height animated with gsap), not Bootstrap's.

**Fonts:** Inter is self-hosted in `assets/fonts/` (variable `wght` 400–800, two woff2 files: `inter-latin` + a Czech-only `inter-latin-ext` subset limited to U+0100–017F, made with `fonttools` `varLib.instancer` + `pyftsubset`). `@font-face` lives at the top of `style.css`, and each page `<link rel="preload">`s both files. No Google Fonts request anywhere (also a GDPR plus). If the font is ever replaced, rename the files too — `/assets/fonts/*` is served `immutable` for a year (see `netlify.toml`).

To upgrade a vendored library, re-download the matching version's files from jsDelivr/cdnjs into the same `assets/vendor/*` paths and commit them — don't switch back to a `<script src="https://…">`/`<link href="https://…">` CDN reference for GSAP.

## Animation architecture (script.js)

Everything is driven by GSAP + ScrollTrigger plus one custom `<canvas>` particle system. Key pieces, in the order they appear:

- **Navbar**: `.scrolled` class toggled past 40px scroll (blur/background transition, CSS-driven).
- **Custom cursor** (`#cursor`): follows the pointer via `gsap.to`; disabled entirely on touch/coarse-pointer devices.
- **Hero typewriter**: cycles through a `roles` array into `#roleText`.
- **Scroll-linked gradient**: a `ScrollTrigger` on `document.body` lerps between color `stops` (one per section) and writes the result into the `--grad-a`/`--grad-b`/`--grad-angle` CSS vars consumed by `style.css`.
- **Hero scroll scene** (`buildHeroScroll()` + `heroPin`): on desktop the hero is pinned for its own height with `pinSpacing: false` (adds no extra scroll — `#section-web` arrives exactly where the pin ends). The h1 and the "Kontaktujte mě" contact title are split into `.split-word`/`.split-char` spans by `splitChars()` (the element gets an `aria-label` with the original text); a scrubbed timeline scatters the letters, drifts/blurs the other hero elements, flies the code graphic across the screen and fires the particle burst. Two non-obvious constraints: (1) the `heroPin` ScrollTrigger is created **synchronously** at script start — creating it after the intro made the hero stay offset by 900px when the page reloaded already scrolled; (2) the timeline itself is built only in `heroTl`'s `onComplete`, because the intro `.from()` tweens animate the same `y`/`opacity` and would clash. The timeline's smoothing is a manual `gsap.to(tl, { progress })` in `onUpdate`, not a `scrub` option.
- **Pinned "scrollytelling" sections** (`buildPinned()`): `#section-web`, `#section-marketing` and `#section-portrait` get pinned via `ScrollTrigger` with `pin: true`; `#section-values` is pinned separately (its pin scrubs which card is "active"). Desktop reveals go through the `epic*` helpers (`epicFrom`/`epicTo`/`epicIn`/`epicOut`), which pick a different entrance per element type (h2 clip-path wipe, eyebrow letter-spacing, blur-in paragraphs, 3D card pop, button pop); `.pin-graphic` is excluded from them and flies in on its own from the side it sits on. This is the most complex/fragile part of the file — changes to section markup must keep the `.fade-el` and `.pin-graphic` selectors intact or the reveal breaks silently. Note `.pin-graphic` itself also carries `.fade-el`, which is why `epicEls` filters it out. `epicIn`/`epicOut` use `overwrite: true`, which is only safe because they target DOM elements — never use `overwrite: true` on shared proxy objects like `heroFx` (it also kills tweens nested in the paused hero timeline).
- **Particle canvas** (`#particle-canvas`): custom rAF loop, not GSAP. `sectionConfigs` defines per-section density/speed/hue/size (and whether particles draw connecting lines); the active config swaps based on which section is vertically centered in the viewport (`updateSectionByScroll`, which reads a matching `sections` id array — keep both arrays in the same order when adding/removing sections). Each particle moves by a constant-speed **drift** (direction `a` slowly rotating) plus a damped **kick** velocity (`vx`/`vy`, ×0.985 per frame) fed by the mouse, `heroFx.burst` (hero scroll scene) and `pulseFx` (`pulse()`, fired on entering each section); size/hue/drift speed ease toward the new section's config via `retarget()`. Before the drift was added the 0.985 damping made particles freeze after ~3s — don't remove the drift without replacing it.
- **`lowPower` flag** (`prefers-reduced-motion` or viewport ≤ 991px): disables/simplifies pinning (including the hero pin and the desktop letter-splitting scroll scene), the `epic*` reveals, `.section-ghost` titles (hidden in CSS), the `.scroll-cue`, the custom cursor, particle link-lines, and card tilt. Particles still render, but the drift is off under `prefers-reduced-motion` (they stand still) and capped at 35 on mobile. **Any animation change needs to be mirrored in both the normal and `lowPower` code paths** — mobile and reduced-motion users get a deliberately simpler experience, not just a slower one.
- **Mobile effects (`mobileFx` = `isMobile && !reduceMotion`)**: phones/tablets without reduced-motion get lightweight, **pin-free** effects, all `transform`/`opacity`/`clip-path`/`filter` on a few elements only — hero h1 letters scatter in on load (`splitChars` + `heroTl`), section `h2`s wipe in via a `clip-path` played as a **timed** tween on entry (`mobileWipe()`, instead of the one-shot fade-up, so `mobH2`/`valuesH2` are excluded from `plainEls`/`valuesPlain`) — it was scrub-linked at first and looked jerky on phones because mobile browsers report scroll position coarsely and late; the same goes for hiding: `leaveEl` may only reset an element silently once it's fully off-screen (`end: "bottom top"`); an instant reset while it's still visible (the old `bottom 12%`) showed up as elements popping out under the navbar, and scrolling back up uses a short fade (`leaveEl(el, true)`); keep anything that's a visible "reveal" time-based on mobile and only scrub subtle things (parallax, card stack) with smoothing (`scrub: 0.6–0.8`), each `.pin-graphic` parallaxes with `yPercent` only (so it doesn't fight `enterEl`/`leaveEl`, which tween `y`/`scale`/`rotate`), particles are pushed by the finger (`touchstart/move`), buttons/cards get press feedback via gsap (not CSS `:active` — GSAP keeps an inline `scale` that would override it), and the mobile menu links stagger in on Bootstrap's `show.bs.collapse`. On ≤767px the "Proč já" cards become a CSS `position: sticky` stack (`.values-stack`, added by JS) where earlier cards scale down and darken slightly with `filter: brightness(.8)`; they keep the translucent glass look and `backdrop-filter: blur` hides the text of the card underneath — don't use `opacity` for the dimming (text shows through) and don't give them an opaque dark background (it looked far too dark against the teal page); `#section-values{overflow:visible}` there is required because `overflow:hidden` would turn the section into a scroll container and kill `sticky`. Reduced-motion users skip all of this.
- **Portrait photo autoplay (mobile, `startCardAutoplay`)**: each step flies the front card up and out (it keeps the top `zIndex`), advances the others, and only once the flown-out card is invisible does it silently move to the back of the deck and fade in. Never reassign `zIndex` of cards that are visible and overlapping at the start of a transition — the old version did exactly that and the previous front photo visibly "dropped" behind the others (a flicker every tick). The pending timeline is stored on `cards._autoTl` and must be killed whenever the loop stops.
- **Testing gotcha**: `isMobile`/`lowPower` are read once at load, so a `matchMedia("(max-width: 991px)")` listener calls `location.reload()` whenever the viewport crosses 991px. When driving the page with Playwright/devtools, wait ~1.5s after resizing across that width before navigating or reloading, otherwise the two loads collide (`net::ERR_ABORTED`). Also test the "reload while already scrolled down" case — scroll restoration exercises the pin setup differently from a load at the top.
- **Contact form**: still Netlify Forms (`data-netlify="true"`, honeypot `bot-field`, hidden `form-name` field — all required for Netlify to detect/accept it), but `script.js` now submits it via `fetch` POST to `/` (urlencoded, Netlify's AJAX pattern) and swaps the form for an inline `#formSuccess` panel instead of redirecting to Netlify's generic page. If the fetch fails or returns non-2xx it falls back to the native `form.submit()`, i.e. the old behaviour — don't remove the hidden `form-name` input or the `<form>` attributes, or Netlify stops receiving submissions. Invalid fields shake (`invalid` event, capture phase). Only works for real on the deployed site: a local `python3 -m http.server` can't handle POST, so test with Playwright `page.route` mocking (filter same-origin POSTs — analytics beacons are POSTs too).
- **Contact copy buttons**: `.copy-btn[data-copy]` next to the phone/e-mail links (the links stay — `tel:`/`mailto:` are the primary action); a `#copyToast` live-region element is created by JS. Clipboard API with a `execCommand` fallback.
- **Mobile hero mini code** (`.hero-mini-code`, `d-lg-none`): replaces the desktop-only code panel on small screens; its lines "type in" via a standalone `gsap.from(width)` tween (deliberately not inside `heroTl`, whose 1.6s safety `setTimeout` would cut it short). Lines use `width: fit-content` so the typing ends exactly at the text.
- **Particles & scroll**: each frame `drawParticles` reads the scroll delta — particles shift against the scroll direction by size-dependent amounts (depth) and fast scrolling boosts the drift; disabled under `prefers-reduced-motion`.
