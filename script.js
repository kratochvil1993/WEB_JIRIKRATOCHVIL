/* ============ Jiří Kratochvíl – one-page scroll experience ============ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 991px)").matches;
  var lowPower = reduceMotion || isMobile;
  /* Mobil BEZ reduced-motion: dostává lehké efekty bez pinování (písmena hera,
     scrubované nadpisy, parallax grafiky, sticky stack karet, dotykové
     reakce). Jen transform/opacity — žádný pin, žádný velký blur. */
  var mobileFx = isMobile && !reduceMotion;

  /* Desktop-width machines with few CPU cores tend to pair with weak
     integrated GPUs (older/budget laptops) — a real FPS benchmark would be
     more accurate but has to run *after* the heavy stuff is already built
     (there's no direct GPU-benchmark API), so it can only react to jank,
     not prevent it. hardwareConcurrency is a synchronous, zero-delay proxy
     available before anything is built. Deliberately kept separate from
     lowPower (not merged into it): mobile's lowPower strips pinning/cursor
     entirely, which is more than a merely underpowered desktop needs — this
     tier keeps pinning, the custom cursor and tilt (the effects that define
     the site), and only trims what profiling showed as actually expensive:
     animated blur-radius tweens (can't be GPU-cached like a static blur,
     unlike lowPower it doesn't disable filters wholesale) and particle/canvas
     load. Any future animated-`filter` tween or particle-cap change should
     be checked against `weakHardware` too, same as lowPower's own mirroring
     rule below. */
  var weakHardware = !lowPower && !!(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  document.documentElement.classList.toggle("weak-hw", weakHardware);

  /* Visible in the browser console for anyone (dev, or a visitor asked to
     "check what mode you're getting") diagnosing performance — the three
     tiers above collapse into one boolean each, so without this the actual
     detected state isn't inspectable from outside the closure. */
  console.log(
    "[perf] mode: " + (lowPower ? (isMobile ? "mobile (lowPower)" : "reduced-motion (lowPower)") : (weakHardware ? "weak-hardware (mid-tier)" : "full performance")) +
    "  isMobile=" + isMobile +
    " reduceMotion=" + reduceMotion +
    " hardwareConcurrency=" + (navigator.hardwareConcurrency || "n/a") +
    " weakHardware=" + weakHardware
  );

  /* isMobile/lowPower are captured once above; every pin, the custom cursor,
     and the particle cap are all built against that snapshot and never
     revisited. Resizing across the 991px breakpoint (devtools responsive
     mode, window snapping) would otherwise leave desktop/mobile animation
     modes permanently mismatched with the current width, so reload instead
     of trying to rebuild everything live. */
  window.matchMedia("(max-width: 991px)").addEventListener("change", function () {
    location.reload();
  });

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  /* Mobile browsers resize the viewport as the address bar hides/shows
     mid-scroll; without this, ScrollTrigger recalculates every trigger's
     start position on that resize, so a reveal that should already have
     fired waits for the next scroll tick — cards stay hidden until you
     scroll again. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- Navbar blur on scroll ---------------- */
  var navbar = document.getElementById("mainNav");
  ScrollTrigger.create({
    start: 40,
    end: 99999,
    onUpdate: function (self) {
      navbar.classList.toggle("scrolled", self.scroll() > 40);
    }
  });

  /* ---------------- Mobile nav collapse ---------------- */
  /* Vlastní collapse (dřív Bootstrap): výška se animuje přes gsap, bez animace při reduced-motion. */
  var navMenuEl = document.getElementById("navMenu");
  var navToggler = document.querySelector(".navbar-toggler");
  var navOpen = false;
  var navOnShow = null;
  function setNav(open) {
    if (!navMenuEl || open === navOpen) return;
    navOpen = open;
    if (navToggler) {
      navToggler.setAttribute("aria-expanded", open ? "true" : "false");
      navToggler.classList.toggle("collapsed", !open);
    }
    gsap.killTweensOf(navMenuEl);
    var animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      navMenuEl.classList.add("show");
      if (navOnShow) navOnShow();
      if (animate) {
        gsap.fromTo(navMenuEl, { height: 0, overflow: "hidden" },
          { height: "auto", duration: 0.35, ease: "power2.out", clearProps: "height,overflow" });
      }
    } else if (animate) {
      gsap.to(navMenuEl, {
        height: 0, overflow: "hidden", duration: 0.3, ease: "power2.in",
        onComplete: function () { navMenuEl.classList.remove("show"); gsap.set(navMenuEl, { clearProps: "height,overflow" }); }
      });
    } else {
      navMenuEl.classList.remove("show");
    }
  }
  if (navToggler) navToggler.addEventListener("click", function () { setNav(!navOpen); });

  /* ---------------- Go to top button ---------------- */
  var toTopBtn = document.getElementById("toTop");
  if (toTopBtn) {
    ScrollTrigger.create({
      start: 600,
      end: 99999,
      onUpdate: function (self) {
        toTopBtn.classList.toggle("visible", self.scroll() > 600);
      }
    });
    /* Progress ring: fills clockwise with overall page scroll. "max" (not a
       fixed end) so progress spans the real scrollable length, pin spacers
       included; onRefresh keeps it right after load/resize. */
    var ringBar = toTopBtn.querySelector(".ring-bar");
    if (ringBar) {
      var ringLen = 2 * Math.PI * ringBar.r.baseVal.value;
      ringBar.style.strokeDasharray = ringLen;
      var setRing = function (self) {
        ringBar.style.strokeDashoffset = ringLen * (1 - self.progress);
      };
      setRing({ progress: 0 });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: setRing,
        onRefresh: setRing
      });
    }
    toTopBtn.addEventListener("click", function () {
      gsap.to(window, { duration: lowPower ? 0.01 : 1, scrollTo: { y: 0 }, ease: "power2.inOut" });
    });
  }

  /* ---------------- Anchor nav: GSAP-driven scroll ----------------
     CSS `scroll-behavior: smooth` fights with pinned ScrollTrigger sections
     (the browser computes a fixed scroll distance up front, but pinning
     resizes the page mid-scroll), so nav clicks land in a broken state
     where pinned text never reveals. ScrollToPlugin is used instead, with
     two pin-specific corrections below. */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (navOpen) setNav(false);
      /* Resolve to a fixed pixel offset up front rather than handing the
         element itself to ScrollToPlugin: once scroll enters a pinned
         section's active range the element is position:fixed, so its
         live document-position collapses to "wherever scroll currently
         is" and a live-tracked tween thinks it has already arrived,
         stopping short (or, scrolling backward, overshooting straight to
         the far end of the pin). For pinned targets, getBoundingClientRect
         is also unreliable on its own: once scrolled past the pin's end,
         the element's resting position reports at the pin's *end*, not
         its start, because of how the pin-spacer reserves space. GSAP's
         own ScrollTrigger.start is authoritative regardless of current
         scroll/pin state, so prefer that when the target is pinned. */
      var pinST = ScrollTrigger.getAll().filter(function (st) { return st.pin === target; })[0];
      var y = pinST ? pinST.start : (target.getBoundingClientRect().top + window.scrollY);
      /* +24 lands comfortably past the section's natural top rather than
         exactly on it (harmless: the pinned range is 1600px long).
         Pinned sections' ScrollTrigger only fires its onEnter/onEnterBack
         reveal once scroll actually crosses the "top top" start
         threshold; landing at/just-under progress 0 never crosses it,
         leaving the pinned text/graphic hidden until the visitor
         scrolled again by hand. */
      gsap.to(window, {
        duration: lowPower ? 0.01 : 0.6,
        scrollTo: { y: y + 24 },
        ease: "power2.inOut",
        onComplete: function () { history.pushState(null, "", id); }
      });
    });
  });

  /* ---------------- Custom cursor ---------------- */
  var cursor = document.getElementById("cursor");
  if (cursor && !isMobile) {
    window.addEventListener("mousemove", function (e) {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
    });
    document.querySelectorAll("a, button, .feature-card, input, textarea").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("hover"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("hover"); });
    });
  }

  /* ---------------- Hero typewriter + entrance ---------------- */
  var roleEl = document.getElementById("roleText");
  var roles = ["Web Developer", "Tvůrce E-shopů", "Fotograf Portrétů", "Tvůrce Kampaní"];
  function typewriter() {
    /* Only reduced-motion users get the static word — mobile (isMobile-driven
       lowPower) still gets the full typewriter cycle: it's a lightweight
       text tween, not in the same cost class as pinning/particles/cursor
       that lowPower otherwise strips. */
    if (reduceMotion) { roleEl.textContent = roles[0]; return; }
    var i = 0;
    function loop() {
      var word = roles[i % roles.length];
      var tl = gsap.timeline({ onComplete: loop });
      var chars = { n: 0 };
      tl.to(chars, {
        n: word.length, duration: word.length * 0.06, ease: "none",
        onUpdate: function () { roleEl.textContent = word.slice(0, Math.round(chars.n)); }
      });
      tl.to({}, { duration: 1.1 });
      tl.to(chars, {
        n: 0, duration: word.length * 0.03, ease: "none",
        onUpdate: function () { roleEl.textContent = word.slice(0, Math.round(chars.n)); }
      });
      tl.to({}, { duration: 0.4 });
      i++;
    }
    loop();
  }
  typewriter();

  var heroChars = mobileFx ? splitChars(document.querySelector("#hero h1")) : [];
  /* mobil: mini kód v hero se "píše" řádek po řádku. Samostatný tween mimo heroTl —
     jistička níž (setTimeout 1600 ms) by heroTl dokončila a useklá by psaní. */
  var miniLines = mobileFx ? gsap.utils.toArray("#hero .hero-mini-code .code-line") : [];
  if (miniLines.length) {
    gsap.from(miniLines, { width: 0, duration: 0.8, ease: "steps(24)", stagger: 0.5, delay: 1.0 });
  }
  var heroTl = gsap.timeline({ defaults: { ease: "power2.out" } })
    .from("#hero .hero-name", { y: 30, opacity: 0, duration: 0.7 })
    .from("#hero .role-line", { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
    .from("#hero .lead-text", { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
    .from("#hero .pill-btn", { y: 20, opacity: 0, duration: 0.6 }, "-=0.3");
  /* mobil: písmena nadpisu se při načtení slétnou z náhodných pozic */
  if (heroChars.length) {
    heroTl.from(heroChars, {
      x: function () { return gsap.utils.random(-90, 90); },
      y: function () { return gsap.utils.random(-70, 70); },
      rotation: function () { return gsap.utils.random(-80, 80); },
      scale: function () { return gsap.utils.random(0.4, 1.6); },
      opacity: 0, duration: 0.9, ease: "power3.out",
      stagger: { amount: 0.45, from: "random" }
    }, 0.1);
  }
  /* safety net: if rAF is throttled (e.g. backgrounded/inactive tab), force-complete
     via setTimeout so hero content is never stuck invisible */
  setTimeout(function () {
    if (heroTl.progress() < 1) heroTl.progress(1);
  }, 1600);

  /* ---------------- Hero graphic: type-in code, then loop between two code variants ----------------
     Time-based, not scroll-driven (hero isn't pinned). Hidden on mobile via
     the `d-none d-lg-block` wrapper in the markup (same 991px cutoff as
     `isMobile`), so skip building it there entirely.
     Every .code-line across both variants already declares its final width
     via inline style (as in the other pin-graphics' code mockups); each
     line's width is captured once up front, then every reveal — the
     initial load AND every loop swap, not just the first — resets that
     variant's lines to width:0 and re-tweens them up to their captured
     width, staggered per line, so both variants "type in" the same way
     every time they appear (not just a plain opacity crossfade). Text
     content itself is never touched, so syntax-highlighting spans stay
     intact throughout.
     On desktop with prefers-reduced-motion: skip the typing/loop entirely,
     leaving variant A at its final (already-full-width) resting state —
     same "pause, stop, hide" rationale as the card-autoplay gate below. */
  var heroTypeStagger = 0.16, heroTypeDuration = 0.45, heroHold = 3.5;
  var heroVariants = [
    { el: document.querySelector(".hero-code-a"), lines: gsap.utils.toArray(".hero-code-a .code-line") },
    { el: document.querySelector(".hero-code-b"), lines: gsap.utils.toArray(".hero-code-b .code-line") }
  ].filter(function (v) { return v.el && v.lines.length; });
  heroVariants.forEach(function (v) {
    v.widths = v.lines.map(function (el) { return el.style.width; });
    /* total time for the staggered width tween below to fully finish:
       last line's start offset plus its own duration. */
    v.typeDuration = (v.lines.length - 1) * heroTypeStagger + heroTypeDuration;
  });

  function typeInHeroVariant(v, fromLoad) {
    gsap.set(v.lines, { width: 0 });
    if (!fromLoad) gsap.set(v.el, { opacity: 1, y: 0, filter: "blur(0px)" });
    gsap.to(v.lines, {
      width: function (i) { return v.widths[i]; },
      duration: heroTypeDuration, stagger: heroTypeStagger, ease: "power1.inOut"
    });
  }

  function swapHeroCode(fromIndex) {
    var toIndex = (fromIndex + 1) % heroVariants.length;
    var to = heroVariants[toIndex];
    /* filter (blur) omitted on weakHardware: unlike opacity/y, an animated
       blur *radius* can't be cached by the compositor — it re-rasterizes
       every frame of the tween, so this is one of the trims that actually
       matters on weak GPUs. See the weakHardware comment near the top. */
    var outVars = {
      opacity: 0, y: -14, duration: 0.7, ease: "power2.inOut",
      onComplete: function () {
        typeInHeroVariant(to);
        gsap.delayedCall(to.typeDuration + heroHold, function () { swapHeroCode(toIndex); });
      }
    };
    if (!weakHardware) outVars.filter = "blur(4px)";
    gsap.to(heroVariants[fromIndex].el, outVars);
  }

  if (heroVariants.length > 1 && !isMobile && !reduceMotion) {
    gsap.delayedCall(0.5, function () {
      var first = heroVariants[0];
      typeInHeroVariant(first, true);
      gsap.delayedCall(first.typeDuration + heroHold, function () { swapHeroCode(0); });
    });
  }

  /* Camera-iris badge: kept for potential reuse, disabled for now per
     request to just cycle the two code variants above instead. The
     matching markup is commented out in index.html (search
     "hero-iris-layer") — uncomment both to bring it back as a third state
     in the loop. */
  // var heroIrisLayer = document.querySelector(".hero-iris-layer");
  // var heroIrisBlades = gsap.utils.toArray(".hero-iris-blade");
  // if (heroIrisBlades.length && !isMobile && !reduceMotion) {
  //   gsap.to(heroIrisBlades, {
  //     rotation: "+=22",
  //     transformOrigin: "100px 100px",
  //     duration: 1.7,
  //     ease: "sine.inOut",
  //     yoyo: true,
  //     repeat: -1
  //   });
  // }

  /* ---------------- Background: gradient tied to scroll progress ---------------- */
  var root = document.documentElement;
  var stops = [
    { a: "#00eeff", b: "#0a5f7a", angle: 135, glowA: .45, glowB: .30 }, // hero
    { a: "#0ac8e0", b: "#2e6e8f", angle: 110, glowA: .70, glowB: .35 }, // web/eshop
    { a: "#0adcc0", b: "#0a7a5a", angle: 120, glowA: .35, glowB: .70 }, // online marketing
    { a: "#0eb8d8", b: "#0a7a9a", angle: 150, glowA: .50, glowB: .55 }, // portréty
    { a: "#00eeff", b: "#0a5f7a", angle: 135, glowA: .45, glowB: .40 }  // kontakt
  ];
  function lerpColor(c1, c2, t) {
    var p1 = parseInt(c1.slice(1), 16), p2 = parseInt(c2.slice(1), 16);
    var r1 = (p1 >> 16) & 255, g1 = (p1 >> 8) & 255, b1 = p1 & 255;
    var r2 = (p2 >> 16) & 255, g2 = (p2 >> 8) & 255, b2 = p2 & 255;
    var r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function lerpNum(n1, n2, t) { return n1 + (n2 - n1) * t; }
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: function (self) {
      var p = self.progress * (stops.length - 1);
      var idx = Math.min(Math.floor(p), stops.length - 2);
      var t = p - idx;
      var from = stops[idx], to = stops[idx + 1];
      root.style.setProperty("--grad-a", lerpColor(from.a, to.a, t));
      root.style.setProperty("--grad-b", lerpColor(from.b, to.b, t));
      root.style.setProperty("--grad-angle", (from.angle + (to.angle - from.angle) * t) + "deg");
      root.style.setProperty("--glow-a", lerpNum(from.glowA, to.glowA, t));
      root.style.setProperty("--glow-b", lerpNum(from.glowB, to.glowB, t));
      root.style.setProperty("--scroll-progress", self.progress);
      currentSectionProgress = self.progress;
    }
  });

  /* slow ambient float of blobs (paused if reduced motion) */
  if (!reduceMotion) {
    gsap.to("#bg-blob-a", { x: 80, y: 60, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to("#bg-blob-b", { x: -60, y: -80, duration: 17, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to("#bg-gradient", { opacity: 0.85, duration: 6, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }

  /* ---------------- Particle canvas ---------------- */
  var canvas = document.getElementById("particle-canvas");
  var ctx = canvas.getContext("2d");
  var W, H, particles = [];
  var mouse = { x: -9999, y: -9999, active: false };
  var currentSectionProgress = 0;

  var sectionConfigs = [
    { name: "hero", density: 0.00009, speed: 0.15, hue: [185, 195], size: [1, 2] },
    { name: "web", density: 0.00016, speed: 0.35, hue: [185, 200], size: [1, 3], linky: true },
    { name: "marketing", density: 0.00014, speed: 0.3, hue: [160, 185], size: [1, 2.5], linky: true },
    { name: "portrait", density: 0.00011, speed: 0.2, hue: [180, 195], size: [1.5, 3] },
    { name: "values", density: 0.0001, speed: 0.18, hue: [180, 195], size: [1, 2.2] },
    { name: "contact", density: 0.00008, speed: 0.12, hue: [185, 195], size: [1, 2] }
  ];
  var activeConfig = sectionConfigs[0];
  var targetDensity = activeConfig.density;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  /* Pohyb částice = plynulý drift + krátkodobé "kopnutí".
       - drift: směr `a` se pomalu natáčí (`da`), rychlost `s` je stálá →
         částice kreslí jemné oblouky a nezastaví se. Při prefers-reduced-motion
         je drift vypnutý (s = 0), částice zůstanou stát.
       - kopnutí (vx/vy): myš, výbuch hera a vlna při vstupu do sekce přidávají
         do vx/vy rychlost, která se každý snímek tlumí (×0.985) a doznívá.
     Velikost, odstín i rychlost driftu se po změně sekce plynule dotahují k
     cílovým hodnotám (tSize/tHue/ts), takže konfigurace sekce je vidět i na
     částicích, které už na plátně byly. */
  function driftSpeed(cfg) {
    return reduceMotion ? 0 : cfg.speed * (0.4 + Math.random() * 0.8);
  }
  function retarget(p, cfg) {
    p.ts = driftSpeed(cfg);
    p.tSize = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
    p.tHue = cfg.hue[0] + Math.random() * (cfg.hue[1] - cfg.hue[0]);
  }
  function makeParticle() {
    var cfg = activeConfig;
    var size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
    var hue = cfg.hue[0] + Math.random() * (cfg.hue[1] - cfg.hue[0]);
    var speed = driftSpeed(cfg);
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0, vy: 0,
      a: Math.random() * Math.PI * 2,
      da: (Math.random() - 0.5) * 0.006,
      s: speed, ts: speed,
      size: size, tSize: size,
      hue: hue, tHue: hue
    };
  }

  /* The connecting-line pass below is O(n²) in particle count (every particle
     checks distance to every later particle), so it's the dominant cost of
     this whole canvas on "linky" sections (web/marketing) — halving the cap
     quarters that cost. weakHardware also shrinks the link radius itself
     (LINK_DIST below), pruning even more pairs before they're drawn. */
  var maxParticles = lowPower ? 35 : (weakHardware ? 70 : 140);
  var LINK_DIST = weakHardware ? 70 : 90;
  var LINK_DIST_SQ = LINK_DIST * LINK_DIST;
  function targetCount() { return Math.min(maxParticles, Math.round(W * H * targetDensity)); }

  for (var i = 0; i < targetCount(); i++) particles.push(makeParticle());

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  });
  window.addEventListener("mouseleave", function () { mouse.active = false; });
  /* Dotyk: částice se odtlačují od prstu stejně jako od myši. Po touchend se
     ještě chvíli počká, protože prohlížeč po klepnutí vyšle emulovaný mousemove,
     který by jinak nechal "odpuzovací zónu" viset na místě posledního doteku. */
  if (!reduceMotion) {
    var touchMove = function (e) {
      var t = e.touches && e.touches[0];
      if (!t) return;
      mouse.x = t.clientX; mouse.y = t.clientY; mouse.active = true;
    };
    var touchEnd = function () { setTimeout(function () { mouse.active = false; }, 450); };
    window.addEventListener("touchstart", touchMove, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
  }

  var navLinks = document.querySelectorAll('.navbar-custom .nav-link[href^="#"]');
  function updateActiveNavLink(sectionId) {
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + sectionId);
    });
  }

  function updateSectionByScroll() {
    var sections = ["hero", "section-web", "section-marketing", "section-portrait", "section-values", "contact"];
    var mid = window.innerHeight / 2;
    var found = sectionConfigs[0];
    var foundId = sections[0];
    sections.forEach(function (id, idx) {
      var el = document.getElementById(id);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { found = sectionConfigs[idx]; foundId = id; }
    });
    updateActiveNavLink(foundId);
    if (found !== activeConfig) {
      activeConfig = found;
      targetDensity = found.density;
      var want = targetCount();
      particles.forEach(function (p) { retarget(p, found); });
      while (particles.length < want) particles.push(makeParticle());
      while (particles.length > want) particles.pop();
    }
  }
  /* Raw "scroll" events can fire dozens of times per second during a fast
     scroll/fling, and updateSectionByScroll's getBoundingClientRect reads
     force a synchronous layout each time — unlike ScrollTrigger elsewhere
     in this file, which batches its own scroll-driven reads/writes into a
     single tick. Coalescing to at most one call per animation frame gives
     it the same batching and removes the extra forced layouts. */
  var sectionScrollQueued = false;
  function queueSectionUpdate() {
    if (sectionScrollQueued) return;
    sectionScrollQueued = true;
    requestAnimationFrame(function () {
      sectionScrollQueued = false;
      updateSectionByScroll();
    });
  }
  window.addEventListener("scroll", queueSectionUpdate, { passive: true });
  updateSectionByScroll();

  /* Scroll-driven burst při odjezdu hera (0–1, plní ho buildHeroScroll):
     částice se zrychlí a odtlačí od středu obrazovky. */
  var heroFx = { burst: 0 };
  /* Krátká vlna částic při vstupu do sekce (viz pulse()). Oddělená od heroFx,
     aby gsap overwrite nezabil scrub tweeny hera. */
  var pulseFx = { v: 0 };
  /* Částice reagují na scroll: každá se (podle velikosti ≈ "hloubky") posouvá proti
     směru scrollu jinou rychlostí a rychlý scroll navíc zrychlí drift. Vypnuto
     při prefers-reduced-motion. */
  var lastScrollY = window.pageYOffset || 0;
  var scrollVel = 0;
  function pulse() {
    gsap.fromTo(pulseFx, { v: 0.8 }, { v: 0, duration: 1.5, ease: "power2.out", overwrite: true });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    var linky = activeConfig.linky && !lowPower;
    var burst = heroFx.burst + pulseFx.v;
    var sy = window.pageYOffset || 0;
    var dy = reduceMotion ? 0 : Math.max(-80, Math.min(80, sy - lastScrollY));
    lastScrollY = sy;
    scrollVel += (Math.abs(dy) - scrollVel) * 0.12;
    var boost = 1 + burst * 5 + Math.min(scrollVel / 14, 3.5);
    particles.forEach(function (p, idx) {
      if (dy) p.y -= dy * (0.06 + p.size * 0.07);
      if (burst > 0.001) {
        p.vx += (p.x - W / 2) / W * burst * 0.12;
        p.vy += (p.y - H / 2) / H * burst * 0.12;
      }
      p.a += p.da;
      p.s += (p.ts - p.s) * 0.02; p.size += (p.tSize - p.size) * 0.02; p.hue += (p.tHue - p.hue) * 0.02;
      p.x += (Math.cos(p.a) * p.s + p.vx) * boost;
      p.y += (Math.sin(p.a) * p.s + p.vy) * boost;
      if (mouse.active) {
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var radius = 130;
        if (dist < radius && dist > 0.1) {
          var force = (radius - dist) / radius * 0.6;
          p.vx += (dx / dist) * force * 0.04;
          p.vy += (dy / dist) * force * 0.04;
        }
      }
      p.vx *= 0.985; p.vy *= 0.985;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;

      ctx.beginPath();
      ctx.fillStyle = "hsla(" + p.hue + ",45%,62%,.55)";
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (linky) {
        for (var j = idx + 1; j < particles.length; j++) {
          var q = particles[j];
          var ddx = p.x - q.x, ddy = p.y - q.y;
          var dSq = ddx * ddx + ddy * ddy;
          /* Cheap squared-distance check first, so Math.sqrt only runs for
             the (usually small) subset of pairs actually close enough to
             draw — most pairs on a spread-out canvas are far apart and never
             need the sqrt at all. */
          if (dSq < LINK_DIST_SQ) {
            var d = Math.sqrt(dSq);
            ctx.strokeStyle = "hsla(" + p.hue + ",45%,62%," + (0.12 * (1 - d / LINK_DIST)) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    });
    requestAnimationFrame(drawParticles);
  }
  if (!lowPower || true) drawParticles(); // always draw, just fewer particles when lowPower

  /* ---------------- Pinned scrollytelling: section 2 (web/e-shop) a 3 (portrét) ----------------
     Text se odhaluje přes onEnter/onLeave (jistý jednorázový tween, nezávislý na scrubu),
     grafika vpravo má navíc jemný scrub parallax rotace/scale během pinu. */
  function revealIn(targets) {
    gsap.to(targets, { y: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: "power2.out", overwrite: "auto" });
  }
  function revealOut(targets) {
    gsap.to(targets, { y: -30, opacity: 0, stagger: 0.08, duration: 0.5, ease: "power2.in", overwrite: "auto" });
  }
  /* Pin-graphic line-art symbols (abstract SVG shapes) "draw themselves" via
     stroke-dasharray/-dashoffset rather than GSAP's paid DrawSVGPlugin, which
     isn't in the free cdnjs bundle this project uses. */
  function prepSymbol(graphic) {
    if (!graphic) return [];
    var shapes = gsap.utils.toArray(graphic.querySelectorAll(".pin-symbol .pin-stroke"));
    return shapes.map(function (el) {
      var len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      return { el: el, len: len };
    });
  }
  function drawSymbolIn(entries) {
    entries.forEach(function (e) {
      gsap.to(e.el, { strokeDashoffset: 0, duration: 1, ease: "power2.inOut", overwrite: "auto" });
    });
  }
  function drawSymbolOut(entries) {
    entries.forEach(function (e) {
      gsap.set(e.el, { strokeDashoffset: e.len });
    });
  }
  /* Small satellite "accent" dots pop in after the line-art draws, each with
     a companion "halo" ring that pulses outward like a radar ping
     (outside lowPower, where a static dot is simpler and cheaper). The dots'
     one-shot pop-in uses GSAP; the halo's continuous pulse is a plain CSS
     class toggle (see @keyframes pinHaloPulse in style.css) rather than an
     infinitely-repeating GSAP tween, since that runs alongside ScrollTrigger's
     pin scrub and the particle canvas's rAF loop on the same thread. */
  function prepAccents(graphic) {
    if (!graphic) return { dots: [], halos: [] };
    var dots = gsap.utils.toArray(graphic.querySelectorAll(".pin-symbol .accent-dot"));
    var halos = gsap.utils.toArray(graphic.querySelectorAll(".pin-symbol .accent-halo"));
    gsap.set(dots, { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" });
    return { dots: dots, halos: halos };
  }
  function drawAccentsIn(accents) {
    accents.dots.forEach(function (d, i) {
      gsap.killTweensOf(d);
      gsap.to(d, { opacity: 1, scale: 1, duration: 0.5, delay: 0.3 + i * 0.12, ease: "back.out(2)", overwrite: "auto" });
    });
    if (lowPower) return;
    accents.halos.forEach(function (h, i) {
      h.style.animationDelay = (0.6 + i * 0.25) + "s";
      h.classList.add("pulsing");
    });
  }
  function drawAccentsOut(accents) {
    accents.dots.forEach(function (d) {
      gsap.killTweensOf(d);
      gsap.set(d, { opacity: 0, scale: 0.3 });
    });
    accents.halos.forEach(function (h) {
      h.classList.remove("pulsing");
    });
  }
  /* Photo card stack (portrait section): N stacked photos fanned behind a
     flat front card. A single 0-1 scalar drives all cards at once — card i
     is "front" when active (progress * (n-1)) crosses i, entering from its
     fanned rest pose over the unit before and exiting over the unit after,
     so consecutive cards crossfade/swap in the same window. */
  function cardStackedPose(i) {
    var dir = i % 2 === 0 ? 1 : -1;
    return { opacity: 1, y: 12 + i * 12, rotate: dir * (5 + i * 3), scale: 0.94 - i * 0.06 };
  }
  function cardFrontPose() {
    return { opacity: 1, y: 0, rotate: 0, scale: 0.94 };
  }
  function cardExitPose() {
    return { opacity: 0, y: -80, rotate: -12, scale: 0.86 };
  }
  /* Mobile has no scroll-scrub to drive updateCardStack, so the fanned photos
     would otherwise sit frozen on card 0 forever. Autoplay rotates the "front"
     slot on a timer instead: whichever card is `offset` steps behind the
     current front (cyclically) gets that offset's stacked pose, so the deck
     keeps its fanned look while cycling through every photo. zIndex is
     reassigned each tick (front on top, deeper offsets below) since a fixed
     stacking order would let a "behind" card cover the new front card. */
  function startCardAutoplay(cards, interval) {
    var n = cards.length;
    if (n < 2) return null;
    var front = 0;
    function offsetOf(i, idx) { return (i - idx + n) % n; }
    function poseFor(offset) { return offset === 0 ? cardFrontPose() : cardStackedPose(offset - 1); }
    function killTl() { if (cards._autoTl) { cards._autoTl.kill(); cards._autoTl = null; } }
    /* Úvodní seskládání balíčku. */
    function setup(idx) {
      killTl();
      cards.forEach(function (card, i) {
        var o = offsetOf(i, idx);
        gsap.set(card, { zIndex: n - o });
        var pose = poseFor(o);
        pose.duration = 0.9; pose.ease = "power2.inOut"; pose.overwrite = "auto";
        gsap.to(card, pose);
      });
    }
    /* Jeden krok: přední fotka odletí nahoru a zmizí (zůstává nad všemi), ostatní
       se posunou o místo dopředu, a teprve až je odlétnutá karta neviditelná, tiše
       se přesune úplně dozadu a vyplave. Dřív se z-index všech karet přepsal na
       začátku přechodu, zatímco byly plně viditelné — stará přední fotka tím
       skokem "spadla" pod ostatní, což vypadalo jako probliknutí. Z-index
       viditelné karty se teď nikdy nemění tak, aby se změnilo pořadí překrytí. */
    function advance() {
      var old = front;
      front = (front + 1) % n;
      killTl();
      var tl = gsap.timeline();
      cards._autoTl = tl;
      gsap.set(cards[old], { zIndex: n + 1 });
      cards.forEach(function (card, i) {
        if (i === old) return;
        var o = offsetOf(i, front);
        gsap.set(card, { zIndex: n - o });
        var pose = poseFor(o);
        pose.duration = 0.8; pose.ease = "power2.inOut";
        tl.to(card, pose, 0);
      });
      var exit = cardExitPose();
      exit.duration = 0.55; exit.ease = "power2.in";
      tl.to(cards[old], exit, 0);
      var back = cardStackedPose(n - 2);
      back.opacity = 0; back.zIndex = 1;
      tl.set(cards[old], back);
      tl.to(cards[old], { opacity: 1, duration: 0.5, ease: "power1.out" });
    }
    setup(front);
    return setInterval(advance, interval || 3200);
  }
  function blendPose(a, b, t) {
    var out = {};
    Object.keys(a).forEach(function (key) { out[key] = a[key] + (b[key] - a[key]) * t; });
    return out;
  }
  /* Section-web pin-graphic: "code" crossfades into a page "wireframe" as the
     pin scrubs. A single 0-1 progress drives both layers via opacity/blur —
     crossfade happens over the middle stretch of the scrub so each layer
     holds fully readable at the pin's ends, not mid-fade. */
  function prepCodeMorph(graphic) {
    if (!graphic) return null;
    var morph = graphic.querySelector(".code-wire-morph");
    if (!morph) return null;
    return { code: morph.querySelector(".code-layer"), wire: morph.querySelector(".wireframe-layer") };
  }
  function updateCodeMorph(morph, progress) {
    if (!morph) return;
    var t = gsap.utils.clamp(0, 1, (progress - 0.2) / 0.6);
    var codeVars = { opacity: 1 - t, y: t * -14 };
    var wireVars = { opacity: t, y: (1 - t) * 14 };
    /* filter (blur) skipped on weakHardware: this runs on every scroll tick
       while the pin is scrubbing, so an animated blur *radius* here is the
       one most directly tied to visible scroll jank. See weakHardware
       comment near the top of the file. */
    if (!weakHardware) {
      codeVars.filter = "blur(" + (t * 2) + "px)";
      wireVars.filter = "blur(" + ((1 - t) * 2) + "px)";
    }
    gsap.set(morph.code, codeVars);
    gsap.set(morph.wire, wireVars);
  }
  /* Section-marketing pin-graphic: same crossfade timing as the section-web
     code→wireframe morph above, but the "after" layer is an analytics
     dashboard whose bar heights and stat counters are also driven straight
     off progress so they land at their final values exactly as the dashboard
     finishes fading in. */
  function prepSerpMorph(graphic) {
    if (!graphic) return null;
    var morph = graphic.querySelector(".serp-dash-morph");
    if (!morph) return null;
    return {
      serp: morph.querySelector(".serp-layer"),
      dash: morph.querySelector(".dash-layer"),
      bars: gsap.utils.toArray(morph.querySelectorAll(".dash-bar")),
      stats: gsap.utils.toArray(morph.querySelectorAll(".dash-stat-value"))
    };
  }
  function updateSerpMorph(morph, progress) {
    if (!morph) return;
    var t = gsap.utils.clamp(0, 1, (progress - 0.2) / 0.6);
    var serpVars = { opacity: 1 - t, y: t * -14 };
    var dashVars = { opacity: t, y: (1 - t) * 14 };
    /* see updateCodeMorph's weakHardware comment: same reasoning applies here. */
    if (!weakHardware) {
      serpVars.filter = "blur(" + (t * 2) + "px)";
      dashVars.filter = "blur(" + ((1 - t) * 2) + "px)";
    }
    gsap.set(morph.serp, serpVars);
    gsap.set(morph.dash, dashVars);
    morph.bars.forEach(function (bar) {
      gsap.set(bar, { height: (t * parseFloat(bar.dataset.h)) + "%" });
    });
    morph.stats.forEach(function (stat) {
      stat.textContent = (t * parseFloat(stat.dataset.target)).toFixed(1) + stat.dataset.suffix;
    });
  }
  function updateCardStack(cards, progress) {
    var n = cards.length;
    if (!n) return;
    var active = progress * Math.max(1, n - 1);
    cards.forEach(function (card, i) {
      var t = active - i;
      var pose;
      if (t <= -1) pose = cardStackedPose(i);
      else if (t < 0) pose = blendPose(cardStackedPose(i), cardFrontPose(), t + 1);
      else if (t < 1) pose = (i === n - 1) ? cardFrontPose() : blendPose(cardFrontPose(), cardExitPose(), t);
      else pose = (i === n - 1) ? cardFrontPose() : cardExitPose();
      gsap.set(card, pose);
    });
  }

  /* ---------------- "Epic" reveal choreography (jen desktop, !lowPower) ----------------
     Každý typ prvku v pinnuté sekci se odkrývá jinak (wipe nadpisu, roztažený
     eyebrow, blur-in odstavců, 3D naskočení karet, pop tlačítka) místo jednoho
     generického fade-up. epicFrom() = výchozí skrytý stav, epicTo() = cílový.
     Výstup (epicOut) odletí nahoru a po dokončení vrátí prvek do epicFrom(),
     aby se při dalším vstupu efekt přehrál znovu. overwrite: true je tu
     bezpečné — cílí jen na DOM prvky, ne na sdílené proxy objekty. */
  var epicBlur = !weakHardware;
  function epicFrom(el) {
    if (el.classList.contains("value-card")) return { y: 90, rotationX: -40, opacity: 0, transformPerspective: 900 };
    if (el.classList.contains("feature-card")) return { y: 70, rotationX: -35, scale: 0.85, opacity: 0, transformPerspective: 900 };
    if (el.tagName === "H2") return { clipPath: "inset(0 100% 0 0)", x: -50, y: 0, opacity: 1 };
    if (el.classList.contains("eyebrow")) return { x: -30, opacity: 0, letterSpacing: "0.5em" };
    if (el.classList.contains("pill-btn")) return { y: 30, scale: 0.7, opacity: 0 };
    return epicBlur ? { y: 40, opacity: 0, filter: "blur(8px)" } : { y: 40, opacity: 0 };
  }
  function epicTo(el) {
    if (el.classList.contains("value-card")) return { y: 0, rotationX: 0, opacity: 1, duration: 0.9, ease: "back.out(1.4)" };
    if (el.classList.contains("feature-card")) return { y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 0.9, ease: "back.out(1.5)" };
    if (el.tagName === "H2") return { clipPath: "inset(0 0% 0 0)", x: 0, duration: 1, ease: "power3.out" };
    if (el.classList.contains("eyebrow")) return { x: 0, opacity: 1, letterSpacing: "0.2em", duration: 0.8, ease: "power3.out" };
    if (el.classList.contains("pill-btn")) return { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.7)" };
    return epicBlur
      ? { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power2.out", onComplete: function () { gsap.set(el, { clearProps: "filter" }); } }
      : { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" };
  }
  function epicInit(els) { els.forEach(function (el) { gsap.set(el, epicFrom(el)); }); }
  function epicIn(els) {
    els.forEach(function (el, i) {
      var vars = epicTo(el);
      vars.delay = i * 0.12;
      vars.overwrite = true;
      gsap.to(el, vars);
    });
  }
  function epicOut(els) {
    gsap.to(els, {
      y: -30, opacity: 0, stagger: 0.06, duration: 0.5, ease: "power2.in", overwrite: true,
      onComplete: function () { epicInit(els); }
    });
  }

  /* Mobil: wipe nadpisu sekce. Dřív byl přímo navázaný na pohyb prstu (scrub),
     ale mobilní prohlížeče hlásí pozici scrollu hrubě a se zpožděním, takže se
     animace při přijíždění nadpisu trhala. Teď je to jednorázová časová
     animace spuštěná při vstupu (a plynule vrácená při scrollu zpět), která
     na škubání scrollu nezávisí. */
  function mobileWipe(h2) {
    gsap.set(h2, { clipPath: "inset(0 100% 0 0)", x: -24 });
    ScrollTrigger.create({
      trigger: h2,
      start: "top 88%",
      onEnter: function () {
        gsap.to(h2, { clipPath: "inset(0 0% 0 0)", x: 0, duration: 0.9, ease: "power3.out", overwrite: true });
      },
      onLeaveBack: function () {
        gsap.to(h2, { clipPath: "inset(0 100% 0 0)", x: -24, duration: 0.5, ease: "power2.in", overwrite: true });
      }
    });
  }

  function buildPinned(sectionId, panelSelector) {
    var section = document.getElementById(sectionId);
    var textEls = gsap.utils.toArray(panelSelector + " .fade-el");
    var graphic = section.querySelector(".pin-graphic");
    var cards = graphic ? gsap.utils.toArray(graphic.querySelectorAll(".photo-card")) : [];
    var symbolEntries = prepSymbol(graphic);
    var accentDots = prepAccents(graphic);
    var codeMorph = prepCodeMorph(graphic);
    var serpMorph = prepSerpMorph(graphic);
    /* Grafika má sama třídu .fade-el, takže je v textEls — v desktop cestě ji
       z epic choreografie vyjímám a řídím zvlášť (3D vlet ze své strany). */
    var epicEls = textEls.filter(function (el) { return el !== graphic; });
    var ghost = section.querySelector(".section-ghost");
    var gdir = graphic && graphic.getBoundingClientRect().left > window.innerWidth / 2 ? 1 : -1;
    function graphicFrom() {
      return { opacity: 0, scale: 0.7, rotationY: gdir * 55, rotationX: 10, x: gdir * 120, transformPerspective: 1000 };
    }
    /* mobil: h2 se odkrývá scrubovaným wipe (viz níž), proto není v jednorázovém fade-up */
    var mobH2 = mobileFx ? textEls.filter(function (el) { return el.tagName === "H2"; }) : [];
    /* mobil: karty ve stejné řadě naskakují po skupinách s odstupem (batch), ne každá zvlášť */
    var mobCards = mobileFx ? textEls.filter(function (el) { return el.classList.contains("feature-card"); }) : [];
    var plainEls = textEls.filter(function (el) { return mobH2.indexOf(el) < 0 && mobCards.indexOf(el) < 0; });
    if (lowPower) {
      gsap.set(plainEls, { y: 28, opacity: 0 });
      gsap.set(mobCards, { y: 28, opacity: 0 });
      if (graphic) gsap.set(graphic, { scale: 0.94, rotate: -2, opacity: 0 });
    } else {
      epicInit(epicEls);
      if (graphic) gsap.set(graphic, graphicFrom());
      if (ghost) gsap.set(ghost, { xPercent: 10 });
    }
    if (cards.length) {
      cards.forEach(function (card, i) { gsap.set(card, { zIndex: cards.length - i }); });
      updateCardStack(cards, 0);
    }
    if (codeMorph) updateCodeMorph(codeMorph, 0);
    if (serpMorph) updateSerpMorph(serpMorph, 0);

    function enterGraphic(self) {
      if (!graphic) return;
      gsap.to(graphic, { opacity: 1, scale: 1, rotationY: 0, rotationX: 0, x: 0, duration: 1.1, ease: "power3.out", overwrite: "auto" });
      if (cards.length) updateCardStack(cards, self.progress);
      else if (codeMorph) updateCodeMorph(codeMorph, self.progress);
      else if (serpMorph) updateSerpMorph(serpMorph, self.progress);
    }

    /* lowPower never scrubs the pin, so there's no continuous scroll progress
       to drive the code→wireframe / SERP→dashboard morphs. On mobile (not
       just reduced-motion desktop), yoyo them back and forth continuously
       while the graphic is in view — a single one-shot play looked "dead"
       next to the portrait section's card autoplay, which keeps cycling
       indefinitely. Same "pause, stop, hide" gate as the card autoplay below:
       only auto-loop when isMobile && !reduceMotion; a reduced-motion visitor
       (mobile or desktop) gets a single one-shot reveal instead. */
    function playCodeMorphOnce() {
      if (!codeMorph) return;
      var proxy = { t: 0 };
      gsap.to(proxy, {
        t: 1, duration: 1.1, ease: "power2.inOut",
        onUpdate: function () { updateCodeMorph(codeMorph, proxy.t); }
      });
    }
    function playSerpMorphOnce() {
      if (!serpMorph) return;
      var proxy = { t: 0 };
      gsap.to(proxy, {
        t: 1, duration: 1.1, ease: "power2.inOut",
        onUpdate: function () { updateSerpMorph(serpMorph, proxy.t); }
      });
    }
    function startCodeMorphLoop() {
      if (!codeMorph) return null;
      var proxy = { t: 0 };
      return gsap.to(proxy, {
        t: 1, duration: 1.3, ease: "power1.inOut", yoyo: true, repeat: -1, repeatDelay: 0.8,
        onUpdate: function () { updateCodeMorph(codeMorph, proxy.t); }
      });
    }
    function startSerpMorphLoop() {
      if (!serpMorph) return null;
      var proxy = { t: 0 };
      return gsap.to(proxy, {
        t: 1, duration: 1.3, ease: "power1.inOut", yoyo: true, repeat: -1, repeatDelay: 0.8,
        onUpdate: function () { updateSerpMorph(serpMorph, proxy.t); }
      });
    }

    if (lowPower) {
      /* Unlike the desktop pin (whose scrub loops continuously while pinned),
         mobile has no pin at all — each section only gets a single scroll pass.
         Resetting on onLeave/onLeaveBack and replaying on onEnter/onEnterBack
         keeps the reveal alive across repeated scroll-throughs, and the loop
         tweens/interval below keep it animating continuously for as long as
         the graphic stays in view. */
      var autoplayInterval = null;
      var codeLoopTween = null;
      var serpLoopTween = null;
      function enterEl(el) {
        gsap.to(el, { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.9, ease: "power3.out", overwrite: "auto" });
        if (el === graphic) {
          drawSymbolIn(symbolEntries); drawAccentsIn(accentDots);
          /* gated on isMobile (not the broader lowPower/reduceMotion flag): a visitor
             with prefers-reduced-motion on desktop shouldn't get an unrequested
             auto-rotating carousel, per WCAG's "pause, stop, hide" guidance on
             auto-updating content. */
          if (cards.length && isMobile && !reduceMotion && !autoplayInterval) {
            autoplayInterval = startCardAutoplay(cards, 1500);
          }
          if (codeMorph) {
            if (isMobile && !reduceMotion) { if (!codeLoopTween) codeLoopTween = startCodeMorphLoop(); }
            else playCodeMorphOnce();
          }
          if (serpMorph) {
            if (isMobile && !reduceMotion) { if (!serpLoopTween) serpLoopTween = startSerpMorphLoop(); }
            else playSerpMorphOnce();
          }
        }
      }
      /* gentle = prvek je ještě vidět (scroll zpět nad jeho vstupní bod) → plynulé
         vyblednutí; jinak je už celý mimo obrazovku a stačí tichý reset, aby se
         efekt při návratu přehrál znovu. Okamžitý reset viditelného prvku
         (dřív už při `bottom 12%`) působil jako trhání. */
      function leaveEl(el, gentle) {
        var hide = el === graphic ? { y: 28, opacity: 0, scale: 0.94, rotate: -2 } : { y: 28, opacity: 0 };
        if (gentle) {
          hide.duration = 0.35; hide.ease = "power2.in"; hide.overwrite = "auto";
          gsap.to(el, hide);
        } else {
          gsap.set(el, hide);
        }
        if (el === graphic) {
          drawSymbolOut(symbolEntries); drawAccentsOut(accentDots);
          if (autoplayInterval) { clearInterval(autoplayInterval); autoplayInterval = null; }
          if (cards._autoTl) { cards._autoTl.kill(); cards._autoTl = null; }
          if (codeLoopTween) { codeLoopTween.kill(); codeLoopTween = null; }
          if (serpLoopTween) { serpLoopTween.kill(); serpLoopTween = null; }
          if (codeMorph) updateCodeMorph(codeMorph, 0);
          if (serpMorph) updateSerpMorph(serpMorph, 0);
          if (cards.length) updateCardStack(cards, 0);
        }
      }
      if (mobileFx) {
        /* nadpis: wipe zleva (časová animace spuštěná při vstupu, viz mobileWipe) */
        mobH2.forEach(mobileWipe);
        if (mobCards.length) {
          var cardsIn = function (batch) { gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.14, overwrite: "auto" }); };
          ScrollTrigger.batch(mobCards, {
            start: "top 90%", end: "bottom top",
            onEnter: cardsIn, onEnterBack: cardsIn,
            onLeave: function (batch) { gsap.set(batch, { y: 28, opacity: 0 }); },
            onLeaveBack: function (batch) { gsap.to(batch, { y: 28, opacity: 0, duration: 0.35, ease: "power2.in", overwrite: "auto" }); }
          });
        }
        /* grafika jede o něco pomaleji než text → hloubka (jen yPercent, aby
           se nepralo s enterEl/leaveEl, které animují y/scale/rotate) */
        if (graphic) {
          gsap.fromTo(graphic, { yPercent: 14 }, {
            yPercent: -14, ease: "none",
            scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.8 }
          });
        }
      }
      plainEls.concat(graphic ? [graphic] : []).forEach(function (el) {
        ScrollTrigger.create({
          trigger: el, start: "top 88%", end: "bottom top",
          onEnter: function () { enterEl(el); },
          onEnterBack: function () { enterEl(el); },
          onLeave: function () { leaveEl(el); },
          onLeaveBack: function () { leaveEl(el, true); }
        });
      });
      return;
    }

    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=1600",
      pin: true,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onEnter: function (self) { epicIn(epicEls); enterGraphic(self); drawSymbolIn(symbolEntries); drawAccentsIn(accentDots); pulse(); },
      onEnterBack: function (self) { epicIn(epicEls); enterGraphic(self); drawSymbolIn(symbolEntries); drawAccentsIn(accentDots); pulse(); },
      onLeave: function () {
        epicOut(epicEls);
        if (graphic) gsap.to(graphic, { opacity: 0, scale: 1.15, rotationY: -gdir * 25, x: -gdir * 60, duration: 0.6, ease: "power2.in", overwrite: "auto" });
        drawSymbolOut(symbolEntries); drawAccentsOut(accentDots);
      },
      onLeaveBack: function () {
        epicOut(epicEls);
        if (graphic) { var back = graphicFrom(); back.duration = 0.6; back.ease = "power2.in"; back.overwrite = "auto"; gsap.to(graphic, back); }
        drawSymbolOut(symbolEntries); drawAccentsOut(accentDots);
      },
      onUpdate: function (self) {
        if (ghost) gsap.set(ghost, { xPercent: 10 - self.progress * 40 });
        if (cards.length) { updateCardStack(cards, self.progress); }
        else if (codeMorph) { updateCodeMorph(codeMorph, self.progress); }
        else if (serpMorph) { updateSerpMorph(serpMorph, self.progress); }
        else if (graphic) { gsap.set(graphic, { rotate: -6 + self.progress * 10 }); }
      }
    });
  }
  buildPinned("section-web", "#section-web");
  buildPinned("section-marketing", "#section-marketing");
  buildPinned("section-portrait", "#section-portrait");

  /* Hero: připnutá scrollytelling scéna (scrub, vázané na scroll, plně
     reverzibilní). Hero se po dobu své vlastní výšky přišpendlí (pin bez
     pinSpacing, takže nepřidává žádný scroll navíc) a během toho:
       - nadpis h1 se po písmenech rozletí od středu (split na .split-char),
       - role-line/lead odplují nahoru s blurem, kontakty a tlačítko dolů,
       - graf s kódem se zvětší, natočí v 3D a "přeletí" přes obrazovku,
       - celý obsah zoomuje dopředu a na konci zmizí do sekce Web & e-shop,
       - částice na pozadí explodují od středu (heroFx.burst v drawParticles).
     Timeline (scrub vyhlazený ručně přes gsap.to na progress) se staví až po
     dokončení úvodní heroTl: obě animují y/opacity stejných prvků, takže by
     si přepisovaly počáteční hodnoty.
     lowPower (mobil / reduced-motion) dostává záměrně jen běžný scroll bez
     pinu, rozpadu i blur efektů. */
  function splitChars(h1) {
    var chars = [];
    h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var word = document.createElement("span");
            word.className = "split-word";
            word.setAttribute("aria-hidden", "true");
            part.split("").forEach(function (ch) {
              var c = document.createElement("span");
              c.className = "split-char";
              c.textContent = ch;
              word.appendChild(c);
              chars.push(c);
            });
            frag.appendChild(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(h1);
    return chars;
  }

  function buildHeroScroll() {
    var h1 = document.querySelector("#hero h1");
    var chars = splitChars(h1);
    var blur = weakHardware ? "blur(0px)" : "blur(10px)";
    var tl = gsap.timeline({ paused: true, defaults: { ease: "power2.in" } });

    /* písmena: odlétají od středu nadpisu, nahoru/dolů náhodně, s rotací */
    var box = null;
    function center(i) {
      if (!box) box = h1.getBoundingClientRect();
      var r = chars[i].getBoundingClientRect();
      return { dx: (r.left + r.width / 2) - (box.left + box.width / 2),
               dy: (r.top + r.height / 2) - (box.top + box.height / 2) };
    }
    tl.to(chars, {
      x: function (i) { return center(i).dx * 1.2 + gsap.utils.random(-80, 80); },
      y: function (i) { return center(i).dy * 1.2 + gsap.utils.random(-260, 120); },
      rotation: function () { return gsap.utils.random(-140, 140); },
      scale: function () { return gsap.utils.random(0.4, 1.8); },
      opacity: 0,
      duration: 0.6,
      stagger: { amount: 0.15, from: "center" }
    }, 0)
      .to("#hero p.eyebrow", { y: -60, opacity: 0, duration: 0.35 }, 0)
      .to("#hero .role-line", { y: -90, opacity: 0, filter: blur, duration: 0.45 }, 0.04)
      .to("#hero .lead-text", { y: -70, opacity: 0, filter: blur, duration: 0.45 }, 0.08)
      .to("#hero .hero-contact", { y: 90, opacity: 0, duration: 0.45 }, 0.04)
      .to("#hero .pill-btn", { y: 120, opacity: 0, duration: 0.45 }, 0.08)
      /* graf: zvětšení + 3D náklon + průlet přes obrazovku */
      .to("#hero .hero-graphic", {
        scale: 2.8, rotationY: -35, rotationX: 8, x: -80, transformPerspective: 900,
        ease: "power1.in", duration: 0.85
      }, 0)
      .to("#hero .hero-graphic", { opacity: 0, ease: "power1.in", duration: 0.3 }, 0.6)
      /* celý obsah: zoom dopředu a závěrečné zmizení */
      .to("#hero > .container", { scale: 1.18, ease: "none", duration: 1 }, 0)
      .to("#hero > .container", { opacity: 0, ease: "power1.in", duration: 0.2 }, 0.8)
      /* částice: výbuch od středu a dozvuk */
      .to(heroFx, { burst: 1, ease: "none", duration: 0.5 }, 0)
      .to(heroFx, { burst: 0, ease: "none", duration: 0.5 }, 0.5);

    heroScrollTl = tl;
    /* hned srovnat s aktuální pozicí (reload uprostřed stránky), bez vyhlazení */
    tl.progress(heroPin.progress);
  }

  /* Pin se vytváří synchronně (ne až po intru), jinak by se při reloadu
     uprostřed stránky špatně spočítal stav hera. Timeline se k němu připojí
     později v buildHeroScroll(); do té doby onUpdate nedělá nic. */
  var heroScrollTl = null;
  var heroPin = null;
  if (!lowPower) {
    heroPin = ScrollTrigger.create({
      trigger: "#hero",
      start: "top top",
      end: "+=100%",
      pin: true,
      pinSpacing: false, /* žádný extra prázdný scroll: sekce Web najede přesně tam, kde pin hera končí */
      anticipatePin: 1,
      onUpdate: function (self) {
        if (heroScrollTl) gsap.to(heroScrollTl, { progress: self.progress, duration: 0.6, ease: "power3.out", overwrite: true });
      }
    });
  }
  if (!lowPower) heroTl.eventCallback("onComplete", buildHeroScroll);

  /* Scroll nápověda: zmizí při prvním scrollu, vrátí se na úplném vrcholu */
  var scrollCue = document.querySelector("#hero .scroll-cue");
  if (scrollCue && !lowPower) {
    ScrollTrigger.create({
      start: 40,
      onEnter: function () { scrollCue.classList.add("is-hidden"); },
      onLeaveBack: function () { scrollCue.classList.remove("is-hidden"); }
    });
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* ---------------- Values section: pinned like the other scrollytelling
     sections above (same pin/end/anticipatePin shape as buildPinned), but
     instead of a graphic morph the pin scrubs which of the 4 cards is
     "active" — it grows/lifts continuously as scroll progress passes its
     slot, then hands off to the next one. Kept separate from buildPinned()
     since there's no text/graphic split here, just one reveal batch.
     lowPower never pins (mirrors buildPinned's lowPower branch): cards
     reveal once on enter and sit statically highlighted, no scrub. */
  var valuesSection = document.getElementById("section-values");
  var valuesCards = gsap.utils.toArray("#valuesGrid .value-card");
  var valuesEls = gsap.utils.toArray("#section-values .fade-el");
  /* mobil: nadpis wipe podle scrollu; karty (jen 1 sloupec, ≤767px) jako sticky
     stack — CSS `position: sticky` + scrub zmenšování předchozí karty. Obojí
     je vyňaté z jednorázového revealIn. */
  var valuesH2 = mobileFx ? document.querySelector("#section-values h2") : null;
  var stackMode = mobileFx && window.matchMedia("(max-width: 767.98px)").matches;
  var valuesPlain = valuesEls.filter(function (el) {
    return el !== valuesH2 && !(stackMode && el.classList.contains("value-card"));
  });
  if (lowPower) gsap.set(valuesPlain, { y: 40, opacity: 0 }); else epicInit(valuesEls);
  var valuesGhost = document.querySelector("#section-values .section-ghost");
  if (valuesGhost && !lowPower) gsap.set(valuesGhost, { xPercent: 10 });

  /* The scrubbed "lift" (scale/y) is written to an inner wrapper, never to
     the .value-card itself — that outer element is also a `fade-el` that
     revealIn/revealOut tween on entrance/exit, and both systems fighting
     over the same y meant the "closest" card could visibly lift into place
     before its own entrance had even started (or finished). Splitting the
     two onto separate elements (outer = entrance, inner = scrub) matches
     how the other pinned sections already keep those roles apart (their
     pin-graphic's inner morph/stack layers aren't `fade-el` either). */
  function updateValuesCards(progress) {
    var n = valuesCards.length;
    if (!n) return;
    var active = progress * (n - 1);
    valuesCards.forEach(function (card, i) {
      var closeness = 1 - gsap.utils.clamp(0, 1, Math.abs(active - i));
      card.classList.toggle("is-active", closeness > 0.5);
      /* Scale the whole card (box + contents) as one unit from its center —
         a separate, larger scale on the inner wrapper plus a `y` lift used
         to look "more dynamic" but actually just pushed the text toward the
         top edge as the box grew around it. `scale` alone on the outer
         element never conflicts with revealIn/revealOut, which only tween
         y/opacity, so no split is needed here (unlike `y`, see comment above). */
      gsap.set(card, { scale: 0.94 + closeness * 0.14 });
      gsap.set(card.querySelector(".value-card-inner"), { opacity: 0.6 + closeness * 0.4 });
    });
  }

  if (lowPower) {
    ScrollTrigger.create({
      trigger: valuesSection, start: "top 80%",
      onEnter: function () { revealIn(valuesPlain); },
      once: true
    });
    valuesCards.forEach(function (card) { card.classList.add("is-active"); });
    if (valuesH2) mobileWipe(valuesH2);
    if (stackMode) {
      valuesSection.classList.add("values-stack");
      valuesCards.forEach(function (card, i) {
        var next = valuesCards[i + 1];
        if (!next) return;
        /* jemné ztmavení (ne průhlednost): zakryté karty zůstávají čitelně světlé a
           po průchodu stackem nezůstanou příliš tmavé */
        gsap.fromTo(card, { scale: 1, filter: "brightness(1)" }, {
          scale: 0.92, filter: "brightness(0.8)", transformOrigin: "50% 0%", ease: "none",
          scrollTrigger: { trigger: next.parentElement, start: "top 85%", end: "top 25%", scrub: 0.6 }
        });
      });
    }
  } else {
    ScrollTrigger.create({
      trigger: valuesSection,
      start: "top top",
      end: "+=1400",
      pin: true,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onEnter: function (self) { epicIn(valuesEls); updateValuesCards(self.progress); pulse(); },
      onEnterBack: function (self) { epicIn(valuesEls); updateValuesCards(self.progress); pulse(); },
      onLeave: function () { epicOut(valuesEls); },
      onLeaveBack: function () { epicOut(valuesEls); },
      onUpdate: function (self) {
        if (valuesGhost) gsap.set(valuesGhost, { xPercent: 10 - self.progress * 40 });
        updateValuesCards(self.progress);
      }
    });
  }

  /* ---------------- Contact section: same reveal choreography as the pinned
     sections (revealIn/stagger), but without pin: true — the section (3 info
     cards + full form) runs taller than the viewport, so locking scroll here
     would trap visitors with the submit button off-screen. */
  /* Zrcadlo rozpadu nadpisu v hero: písmena "Kontaktujte mě" se při scrollu
     (scrub) slétnou z náhodných pozic do slova. Jen desktop. */
  var contactTitle = document.querySelector("#contact h2");
  if (contactTitle && !lowPower) {
    gsap.from(splitChars(contactTitle), {
      x: function () { return gsap.utils.random(-260, 260); },
      y: function () { return gsap.utils.random(-180, 180); },
      rotation: function () { return gsap.utils.random(-120, 120); },
      scale: function () { return gsap.utils.random(0.3, 1.8); },
      opacity: 0,
      ease: "power2.out",
      stagger: { amount: 0.5, from: "random" },
      scrollTrigger: { trigger: contactTitle, start: "top 95%", end: "top 50%", scrub: 0.6 }
    });
  }
  var contactEls = gsap.utils.toArray("#contact .fade-el");
  gsap.set(contactEls, { y: 40, opacity: 0 });
  ScrollTrigger.create({
    trigger: "#contact",
    start: "top 70%",
    onEnter: function () { revealIn(contactEls); if (!lowPower) pulse(); },
    onEnterBack: function () { revealIn(contactEls); if (!lowPower) pulse(); }
  });

  /* Trigger off the footer itself, not each column: a per-column trigger
     ("top 85%" of that column's own position) can never fire for the last
     column, since the page runs out of scrollable space before its top
     reaches 85% of the viewport — leaving it stuck at opacity 0. */
  var footerEls = gsap.utils.toArray("footer .fade-el");
  gsap.set(footerEls, { y: 30, opacity: 0 });
  ScrollTrigger.create({
    trigger: "footer",
    start: "top 85%",
    onEnter: function () { revealIn(footerEls); },
    onEnterBack: function () { revealIn(footerEls); }
  });

  /* ---------------- Feature card tilt/glow ---------------- */
  document.querySelectorAll(".feature-card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      var rx = ((y / r.height) - 0.5) * -10;
      var ry = ((x / r.width) - 0.5) * 10;
      if (!lowPower) gsap.to(card, { rotateX: rx, rotateY: ry, duration: 0.3, ease: "power2.out", transformPerspective: 600 });
    });
    card.addEventListener("mouseleave", function () {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "power2.out" });
    });
  });

  /* ---------------- Mobil: zpětná vazba při klepnutí ----------------
     Tlačítka a karty se při doteku zmenší a rozsvítí glow v místě prstu
     (--mx/--my používá i hover glow). Přes gsap, ne CSS :active — gsap drží na
     těchto prvcích inline `scale`, který by CSS přebil. Při posunu prstu o víc
     než 10 px (= scrolluje se, neklepe) se stav hned uvolní. */
  if (mobileFx && window.matchMedia("(pointer: coarse)").matches) {
    var tapSel = ".pill-btn, .feature-card:not(.value-card), .social-ico, .btn-vcard";
    var tapEl = null, tapX = 0, tapY = 0;
    var tapRelease = function () {
      if (!tapEl) return;
      var el = tapEl; tapEl = null;
      el.classList.remove("is-pressed");
      gsap.to(el, { scale: 1, duration: 0.35, ease: "back.out(2.2)", overwrite: "auto" });
    };
    document.addEventListener("touchstart", function (e) {
      var el = e.target.closest && e.target.closest(tapSel);
      if (!el) return;
      var t = e.touches[0], r = el.getBoundingClientRect();
      tapEl = el; tapX = t.clientX; tapY = t.clientY;
      el.style.setProperty("--mx", (t.clientX - r.left) + "px");
      el.style.setProperty("--my", (t.clientY - r.top) + "px");
      el.classList.add("is-pressed");
      gsap.to(el, { scale: 0.96, duration: 0.12, ease: "power2.out", overwrite: "auto" });
      if (el.classList.contains("pill-btn") && navigator.vibrate) navigator.vibrate(8);
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      if (tapEl && (Math.abs(t.clientX - tapX) > 10 || Math.abs(t.clientY - tapY) > 10)) tapRelease();
    }, { passive: true });
    document.addEventListener("touchend", tapRelease, { passive: true });
    document.addEventListener("touchcancel", tapRelease, { passive: true });
  }

  /* Mobilní menu: odkazy vlétnou postupně při otevření */
  if (navMenuEl && mobileFx) {
    navOnShow = function () {
      gsap.fromTo("#navMenu .nav-link", { x: -26, opacity: 0 }, {
        x: 0, opacity: 1, duration: 0.45, stagger: 0.07, delay: 0.12, ease: "power3.out", overwrite: true
      });
    };
  }

  /* ---------------- Contact: kopírování, třes neplatných polí, odeslání bez přesměrování ----------------
     Formulář pořád patří Netlify Forms (data-netlify, honeypot), jen se odesílá přes
     fetch (Netlify AJAX: POST na "/" s polem form-name) a místo přesměrování na
     obecnou stránku Netlify se ukáže potvrzení přímo ve stránce. Když fetch selže
     (offline, jiná než 2xx odpověď), spadne to na nativní odeslání jako dřív. */
  var toastEl = document.createElement("div");
  toastEl.id = "copyToast";
  toastEl.setAttribute("role", "status");
  toastEl.setAttribute("aria-live", "polite");
  document.body.appendChild(toastEl);
  var toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 1900);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (err) { reject(err); }
      document.body.removeChild(ta);
    });
  }
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var icon = btn.querySelector("use");
      copyText(btn.dataset.copy).then(function () {
        showToast("Zkopírováno: " + btn.dataset.copy);
        btn.classList.add("is-copied");
        if (icon) icon.setAttribute("href", "#bi-check2");
        setTimeout(function () { btn.classList.remove("is-copied"); if (icon) icon.setAttribute("href", "#bi-clipboard"); }, 1600);
      }).catch(function () { showToast("Kopírování se nezdařilo"); });
    });
  });

  var form = document.getElementById("contactForm");
  var formSuccess = document.getElementById("formSuccess");
  if (form) {
    /* neplatné pole se při pokusu o odeslání zatřese (invalid nebublá → capture) */
    if (!reduceMotion) {
      form.addEventListener("invalid", function (e) {
        var box = e.target.closest(".form-floating, .form-check") || e.target;
        gsap.fromTo(box, { x: 0 }, { keyframes: [{ x: -8 }, { x: 8 }, { x: -5 }, { x: 5 }, { x: 0 }], duration: 0.4, ease: "power1.inOut", overwrite: "auto" });
      }, true);
    }
    function showFormSuccess() {
      var done = function () {
        form.style.display = "none";
        formSuccess.hidden = false;
        if (!reduceMotion) {
          var circle = formSuccess.querySelector(".fs-circle"), tick = formSuccess.querySelector(".fs-tick");
          gsap.set([circle, tick], { strokeDasharray: 1, strokeDashoffset: 1 });
          gsap.timeline()
            .to(circle, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" })
            .to(tick, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, "-=0.1")
            .from(formSuccess.querySelectorAll("h3, p"), { y: 14, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.3");
        }
        ScrollTrigger.refresh();
        formSuccess.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      };
      if (reduceMotion) done(); else gsap.to(form, { opacity: 0, y: -10, duration: 0.35, onComplete: done });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var label = btn && (btn.querySelector(".pill-btn__label") || btn);
      if (btn) { btn.disabled = true; label.textContent = "Odesílám…"; }
      fetch(form.getAttribute("action") || "/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        showFormSuccess();
      }).catch(function () {
        form.submit(); /* nativní odeslání (stará cesta) */
      });
    });
  }
})();
