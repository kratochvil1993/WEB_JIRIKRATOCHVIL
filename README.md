# web_jirikratochvil

Statický one-page web [jirikratochvil.eu](https://jirikratochvil.eu) — Jiří Kratochvíl, vývojář webů a e-shopů a portrétní fotograf.

Čisté HTML/CSS/JS. Žádný framework, žádný build tool, žádný package manager.

## Lokální náhled

`index.html` přes `file://` nefunguje (relativní fetch / CORS), servíruj kořen přes HTTP:

```bash
python3 -m http.server 8000
# http://localhost:8000/index.html
```

## Úpravy CSS / JS

Stránky načítají **`style.min.css`** a **`script.min.js`**, ne zdrojové soubory. Po jakékoli změně `style.css` nebo `script.js` je nutné přegenerovat minifikované verze (potřeba Node, běží přes `npx` bez instalace):

```bash
npx terser@5 script.js --compress --mangle --comments false -o script.min.js
npx clean-css-cli@5 -o style.min.css style.css
```

Minifikované soubory se commitují spolu se zdrojem — Netlify nemá build krok, takže `.min.*` je to, co se reálně nasadí. `style.min.css` / `script.min.js` nikdy needituj ručně.

## Nasazení

Netlify, auto-deploy z větve `main` na GitHubu. `netlify.toml` má `publish = "."` → **publikuje se celý kořen repa**, takže tam patří jen veřejné soubory (proto jsou `_design/` a `_docs/` v `.gitignore`). Push do `origin/main` = okamžitý deploy.

Bezpečnostní hlavičky (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) a roční immutable cache pro `assets/vendor/*` řeší `netlify.toml`.

## Struktura

| Soubor | Účel |
| --- | --- |
| `index.html` | celý one-page web (hero, sekce web / portrét / marketing, kontaktní formulář přes Netlify Forms) |
| `gdpr.html` | zásady ochrany osobních údajů |
| `sitemap.html` | lidsky čitelná mapa webu (drž v souladu se `sitemap.xml`) |
| `404.html` | chybová stránka |
| `style.css` → `style.min.css` | jediný stylesheet; definuje CSS proměnné, které `script.js` mění za běhu (scroll gradient) |
| `script.js` → `script.min.js` | vanilla-JS IIFE: GSAP + ScrollTrigger animace + částicový `<canvas>` |
| `cookie-consent.js` | cookie lišta + GTM (GTM-MPVVNJCG) — GTM se injektuje až po souhlasu |
| `robots.txt` / `sitemap.xml` | strojově čitelné, publikují se as-is |
| `assets/vendor/` | vendorované knihovny (Bootstrap 5.3.3, Bootstrap Icons 1.11.3, GSAP 3.12.5) — commitnuté as-downloaded, needitovat |
| `assets/images/`, `assets/fav/`, `assets/logo.webp` | obrázky, favicony, logo |
| `_design/` | git-ignored Claude Design handoff (kanonický zdroj designu) |
| `_docs/` | git-ignored interní poznámky |

Fotky v `assets/images/` se commitují bez build pipeline — nové/velké fotky před commitem zmenši a překomprimuj (viz `CLAUDE.md`).

Podrobnější poznámky pro vývoj jsou v [`CLAUDE.md`](CLAUDE.md).
