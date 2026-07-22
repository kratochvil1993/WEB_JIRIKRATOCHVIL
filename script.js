/* ============ Jiří Kratochvíl – one-page scroll experience ============ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 991px)").matches;
  var lowPower = reduceMotion || isMobile;

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
  var navMenuEl = document.getElementById("navMenu");
  var navCollapse = navMenuEl ? new bootstrap.Collapse(navMenuEl, { toggle: false }) : null;

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
      if (navCollapse && navMenuEl.classList.contains("show")) navCollapse.hide();
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
    if (lowPower) { roleEl.textContent = roles[0]; return; }
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

  var heroTl = gsap.timeline({ defaults: { ease: "power2.out" } })
    .from("#hero .hero-name", { y: 30, opacity: 0, duration: 0.7 })
    .from("#hero .role-line", { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
    .from("#hero .lead-text", { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
    .from("#hero .btn-neon", { y: 20, opacity: 0, duration: 0.6 }, "-=0.3");
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
    gsap.to(heroVariants[fromIndex].el, {
      opacity: 0, y: -14, filter: "blur(4px)", duration: 0.7, ease: "power2.inOut",
      onComplete: function () {
        typeInHeroVariant(to);
        gsap.delayedCall(to.typeDuration + heroHold, function () { swapHeroCode(toIndex); });
      }
    });
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

  function makeParticle() {
    var hueRange = activeConfig.hue;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * activeConfig.speed,
      vy: (Math.random() - 0.5) * activeConfig.speed,
      size: activeConfig.size[0] + Math.random() * (activeConfig.size[1] - activeConfig.size[0]),
      hue: hueRange[0] + Math.random() * (hueRange[1] - hueRange[0])
    };
  }

  var maxParticles = lowPower ? 35 : 140;
  function targetCount() { return Math.min(maxParticles, Math.round(W * H * targetDensity)); }

  for (var i = 0; i < targetCount(); i++) particles.push(makeParticle());

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  });
  window.addEventListener("mouseleave", function () { mouse.active = false; });

  var navLinks = document.querySelectorAll('.navbar-custom .nav-link[href^="#"]');
  function updateActiveNavLink(sectionId) {
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + sectionId);
    });
  }

  function updateSectionByScroll() {
    var sections = ["hero", "section-web", "section-marketing", "section-portrait", "contact"];
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

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    var linky = activeConfig.linky && !lowPower;
    particles.forEach(function (p, idx) {
      p.x += p.vx; p.y += p.vy;
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
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 90) {
            ctx.strokeStyle = "hsla(" + p.hue + ",45%,62%," + (0.12 * (1 - d / 90)) + ")";
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
    if (n < 2) return;
    var front = 0;
    function applyPoses(idx) {
      cards.forEach(function (card, i) {
        var offset = (i - idx + n) % n;
        gsap.set(card, { zIndex: n - offset });
        var pose = offset === 0 ? cardFrontPose() : cardStackedPose(offset - 1);
        pose.duration = 0.9; pose.ease = "power2.inOut"; pose.overwrite = "auto";
        gsap.to(card, pose);
      });
    }
    applyPoses(front);
    setInterval(function () {
      front = (front + 1) % n;
      applyPoses(front);
    }, interval || 3200);
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
    gsap.set(morph.code, { opacity: 1 - t, y: t * -14, filter: "blur(" + (t * 4) + "px)" });
    gsap.set(morph.wire, { opacity: t, y: (1 - t) * 14, filter: "blur(" + ((1 - t) * 4) + "px)" });
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
    gsap.set(morph.serp, { opacity: 1 - t, y: t * -14, filter: "blur(" + (t * 4) + "px)" });
    gsap.set(morph.dash, { opacity: t, y: (1 - t) * 14, filter: "blur(" + ((1 - t) * 4) + "px)" });
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

  function buildPinned(sectionId, panelSelector) {
    var section = document.getElementById(sectionId);
    var textEls = gsap.utils.toArray(panelSelector + " .fade-el");
    var graphic = section.querySelector(".pin-graphic");
    var cards = graphic ? gsap.utils.toArray(graphic.querySelectorAll(".photo-card")) : [];
    var symbolEntries = prepSymbol(graphic);
    var accentDots = prepAccents(graphic);
    var codeMorph = prepCodeMorph(graphic);
    var serpMorph = prepSerpMorph(graphic);
    gsap.set(textEls, { y: 40, opacity: 0 });
    if (graphic) gsap.set(graphic, { scale: 0.85, rotate: -6, opacity: 0 });
    if (cards.length) {
      cards.forEach(function (card, i) { gsap.set(card, { zIndex: cards.length - i }); });
      updateCardStack(cards, 0);
    }
    if (codeMorph) updateCodeMorph(codeMorph, 0);
    if (serpMorph) updateSerpMorph(serpMorph, 0);

    function enterGraphic(self) {
      if (!graphic) return;
      gsap.to(graphic, { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: "power2.out" });
      if (cards.length) updateCardStack(cards, self.progress);
      else if (codeMorph) updateCodeMorph(codeMorph, self.progress);
      else if (serpMorph) updateSerpMorph(serpMorph, self.progress);
    }

    /* lowPower never scrubs the pin, so there's no continuous scroll progress
       to drive the code→wireframe / SERP→dashboard morphs. Play them once,
       time-based, the first time the graphic scrolls into view — otherwise
       mobile visitors only ever saw the finished state appear with no
       animation at all. */
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

    if (lowPower) {
      textEls.concat(graphic ? [graphic] : []).forEach(function (el) {
        ScrollTrigger.create({
          trigger: el, start: "top 88%",
          onEnter: function () {
            gsap.to(el, { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: "power2.out" });
            if (el === graphic) {
              drawSymbolIn(symbolEntries); drawAccentsIn(accentDots); playCodeMorphOnce(); playSerpMorphOnce();
              /* gated on isMobile (not the broader lowPower/reduceMotion flag): a visitor
                 with prefers-reduced-motion on desktop shouldn't get an unrequested
                 auto-rotating carousel, per WCAG's "pause, stop, hide" guidance on
                 auto-updating content. */
              if (cards.length && isMobile && !reduceMotion) startCardAutoplay(cards, 1500);
            }
          },
          once: true
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
      onEnter: function (self) { revealIn(textEls); enterGraphic(self); drawSymbolIn(symbolEntries); drawAccentsIn(accentDots); },
      onEnterBack: function (self) { revealIn(textEls); enterGraphic(self); drawSymbolIn(symbolEntries); drawAccentsIn(accentDots); },
      onLeave: function () { revealOut(textEls); if (graphic) gsap.to(graphic, { opacity: 0, rotate: 4, duration: 0.5, ease: "power2.in" }); drawSymbolOut(symbolEntries); drawAccentsOut(accentDots); },
      onLeaveBack: function () { revealOut(textEls); if (graphic) gsap.to(graphic, { opacity: 0, scale: 0.85, rotate: -6, duration: 0.5, ease: "power2.in" }); drawSymbolOut(symbolEntries); drawAccentsOut(accentDots); },
      onUpdate: function (self) {
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

  /* Hero: odscrolluje/zmizí, jakmile se přiblíží sekce Web & e-shop */
  if (!lowPower) {
    ScrollTrigger.create({
      trigger: "#section-web",
      start: "top bottom",
      end: "top top",
      scrub: true,
      onUpdate: function (self) {
        gsap.set("#hero > .container", { opacity: 1 - self.progress, y: self.progress * -60 });
      }
    });
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* ---------------- Contact section: same reveal choreography as the pinned
     sections (revealIn/stagger), but without pin: true — the section (3 info
     cards + full form) runs taller than the viewport, so locking scroll here
     would trap visitors with the submit button off-screen. */
  var contactEls = gsap.utils.toArray("#contact .fade-el");
  gsap.set(contactEls, { y: 40, opacity: 0 });
  ScrollTrigger.create({
    trigger: "#contact",
    start: "top 70%",
    onEnter: function () { revealIn(contactEls); },
    onEnterBack: function () { revealIn(contactEls); }
  });

  gsap.utils.toArray("footer .fade-el").forEach(function (el) {
    gsap.from(el, {
      y: 30, opacity: 0, duration: 0.7, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
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

  /* ---------------- Contact form: basic UX (Netlify handles real submit) ---------------- */
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function () {
      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Odesílám…"; }
    });
  }
})();
