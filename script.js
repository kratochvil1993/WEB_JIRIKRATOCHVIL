/* ============ Jiří Kratochvíl – one-page scroll experience ============ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 991px)").matches;
  var lowPower = reduceMotion || isMobile;

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
        duration: lowPower ? 0.01 : 1,
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
  var roles = ["Web Developer", "Tvůrce E-shopů", "Fotograf Portrétů"];
  function typewriter() {
    if (lowPower) { roleEl.textContent = "Jsem " + roles[0]; return; }
    var i = 0;
    function loop() {
      var word = "Jsem " + roles[i % roles.length];
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

  /* ---------------- Background: gradient tied to scroll progress ---------------- */
  var root = document.documentElement;
  var stops = [
    { a: "#0ef", b: "#0a5f7a", angle: 135 }, // hero
    { a: "#0ac8e0", b: "#2e6e8f", angle: 110 }, // web/eshop
    { a: "#0eb8d8", b: "#0a7a9a", angle: 150 }, // portréty
    { a: "#0adcc0", b: "#0a7a5a", angle: 120 }, // online marketing
    { a: "#0ef", b: "#0a5f7a", angle: 135 }  // kontakt
  ];
  function lerpColor(c1, c2, t) {
    var p1 = parseInt(c1.slice(1), 16), p2 = parseInt(c2.slice(1), 16);
    var r1 = (p1 >> 16) & 255, g1 = (p1 >> 8) & 255, b1 = p1 & 255;
    var r2 = (p2 >> 16) & 255, g2 = (p2 >> 8) & 255, b2 = p2 & 255;
    var r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onUpdate: function (self) {
      var p = self.progress * (stops.length - 1);
      var idx = Math.min(Math.floor(p), stops.length - 2);
      var t = p - idx;
      var from = stops[idx], to = stops[idx + 1];
      root.style.setProperty("--grad-a", lerpColor(from.a, to.a, t));
      root.style.setProperty("--grad-b", lerpColor(from.b, to.b, t));
      root.style.setProperty("--grad-angle", (from.angle + (to.angle - from.angle) * t) + "deg");
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
    { name: "portrait", density: 0.00011, speed: 0.2, hue: [180, 195], size: [1.5, 3] },
    { name: "marketing", density: 0.00014, speed: 0.3, hue: [160, 185], size: [1, 2.5], linky: true },
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
    var sections = ["hero", "section-web", "section-portrait", "section-marketing", "contact"];
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
  window.addEventListener("scroll", updateSectionByScroll, { passive: true });
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
  function buildPinned(sectionId, panelSelector) {
    var section = document.getElementById(sectionId);
    var textEls = gsap.utils.toArray(panelSelector + " .fade-el");
    var graphic = section.querySelector(".pin-graphic");
    gsap.set(textEls, { y: 40, opacity: 0 });
    if (graphic) gsap.set(graphic, { scale: 0.85, rotate: -6, opacity: 0 });

    if (lowPower) {
      textEls.concat(graphic ? [graphic] : []).forEach(function (el) {
        ScrollTrigger.create({
          trigger: el, start: "top 88%",
          onEnter: function () { gsap.to(el, { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: "power2.out" }); },
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
      onEnter: function () { revealIn(textEls); if (graphic) gsap.to(graphic, { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: "power2.out" }); },
      onEnterBack: function () { revealIn(textEls); if (graphic) gsap.to(graphic, { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: "power2.out" }); },
      onLeave: function () { revealOut(textEls); if (graphic) gsap.to(graphic, { opacity: 0, rotate: 4, duration: 0.5, ease: "power2.in" }); },
      onLeaveBack: function () { revealOut(textEls); if (graphic) gsap.to(graphic, { opacity: 0, scale: 0.85, rotate: -6, duration: 0.5, ease: "power2.in" }); },
      onUpdate: function (self) {
        if (graphic) gsap.set(graphic, { rotate: -6 + self.progress * 10 });
      }
    });
  }
  buildPinned("section-web", "#section-web");
  buildPinned("section-portrait", "#section-portrait");
  buildPinned("section-marketing", "#section-marketing");

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
