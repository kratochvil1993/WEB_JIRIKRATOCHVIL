/* webdebug — vývojářský režim. Načítá ho loader z page.js / script.js (kliknutí na [debug]
   v patičce nebo ?debug v URL); vzniká z něj debug.min.js, styl tlačítka je v style.css.
   Nic nemění v layoutu ani v animacích stránky: obrysy jsou CSS `outline`,
   vše ostatní žije v jedné vrstvě position:fixed s pointer-events:none. */
(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.getElementById("debugToggle");
  var KEY = "webdebug";
  var isTouch = !!(window.matchMedia && matchMedia("(hover: none)").matches);

  var on = false, raf = 0;
  var layer, panel, tip, boxM, boxB, boxC, rows = {};
  var chips = [], secEls = [];
  var mx = -1, my = -1, picked = null;
  var frames = 0, fps = 0, fpsT = 0, infoT = 0, gsapT = 0, collectT = 0;
  var gsapInfo = "—";

  /* ---------- styly (vkládají se až při zapnutí, tlačítko [debug] má styl v style.css) ---------- */
  var CSS = [
    "html.wd-on :is(section,footer,.container,.row){outline:1px dashed rgba(0,238,255,.32)!important;outline-offset:-1px}",
    "html.wd-on :is(.feature-card,.code-win,.step,.principle-card,.faq details,.sub-hero-graphic,h1,h2,form,.pill-btn,img){outline:1px solid rgba(0,238,255,.55)!important;outline-offset:-1px}",
    ".wd-layer{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d9faff}",
    "html.nav-open .wd-layer{display:none}",
    ".wd-box,.wd-tip,.wd-chip{position:fixed;left:0;top:0;display:none;pointer-events:none}",
    ".wd-m{background:rgba(255,170,90,.25)}",
    ".wd-b{background:rgba(0,238,255,.16)}",
    ".wd-c{background:rgba(0,238,255,.38)}",
    ".wd-tip{background:#00eeff;color:#04141a;padding:2px 7px;border-radius:4px;white-space:nowrap;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.4)}",
    ".wd-chip{padding:1px 6px;border-radius:4px;background:rgba(4,20,26,.88);border:1px solid rgba(0,238,255,.45);color:#7ff6ff;white-space:nowrap}",
    ".wd-panel{position:fixed;left:12px;bottom:12px;width:244px;padding:8px 10px 9px;pointer-events:auto;background:rgba(4,20,26,.93);border:1px solid rgba(0,238,255,.35);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.45)}",
    ".wd-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;color:#00eeff;font-weight:700;letter-spacing:.04em}",
    ".wd-x{pointer-events:auto;background:rgba(0,238,255,.12);border:1px solid rgba(0,238,255,.4);border-radius:6px;color:#00eeff;font:700 13px/1 ui-monospace,Menlo,monospace;cursor:pointer;width:26px;height:22px;margin:-4px -4px -4px 0;padding:0}",
    ".wd-x:hover{background:#00eeff;color:#04141a}",
    ".wd-row{display:flex;justify-content:space-between;gap:10px}",
    ".wd-row span{color:rgba(217,250,255,.6)}",
    ".wd-row b{font-weight:500;color:#fff;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}",
    ".wd-hint{margin-top:5px;color:rgba(217,250,255,.55)}",
    "@media (max-width:480px){.wd-panel{width:206px;font-size:10px}.wd-row b{max-width:110px}}"
  ].join("\n");
  var st = document.createElement("style");
  st.id = "wd-style";
  st.textContent = CSS;
  document.head.appendChild(st);

  /* ---------- pomocné funkce ---------- */
  function px(v) { return parseFloat(v) || 0; }
  function div(cls, parent) {
    var d = document.createElement("div");
    d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }
  function sel(el) {
    if (!el || el.nodeType !== 1) return "—";
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var raw = typeof el.className === "string" ? el.className : (el.className && el.className.baseVal) || "";
    var c = raw.split(/\s+/).filter(function (x) { return x && x.indexOf("wd-") !== 0 && x.indexOf("is-") !== 0; });
    if (c.length) s += "." + c.slice(0, 3).join(".");
    return s;
  }
  function bp(w) {
    return w >= 1400 ? "xxl ≥ 1400" : w >= 1200 ? "xl ≥ 1200" : w >= 992 ? "lg ≥ 992" :
      w >= 768 ? "md ≥ 768" : w >= 576 ? "sm ≥ 576" : "xs < 576";
  }
  function place(b, l, t, w, h) {
    b.style.transform = "translate(" + l + "px," + t + "px)";
    b.style.width = Math.max(0, w) + "px";
    b.style.height = Math.max(0, h) + "px";
    b.style.display = "block";
  }
  function hideBoxes() {
    boxM.style.display = boxB.style.display = boxC.style.display = tip.style.display = "none";
  }

  /* ---------- stavba vrstvy ---------- */
  function build() {
    layer = div("wd-layer");
    layer.setAttribute("aria-hidden", "true");
    boxM = div("wd-box wd-m", layer);
    boxB = div("wd-box wd-b", layer);
    boxC = div("wd-box wd-c", layer);
    tip = div("wd-tip", layer);

    panel = div("wd-panel", layer);
    var head = div("wd-head", panel);
    var title = document.createElement("span");
    title.textContent = "</> webdebug";
    var x = document.createElement("button");
    x.type = "button"; x.className = "wd-x"; x.textContent = "✕";
    x.setAttribute("aria-label", "Vypnout debug");
    x.title = "Vypnout (Esc)";
    x.addEventListener("click", disable);
    head.appendChild(title); head.appendChild(x);

    ["vp", "bp", "scroll", "fps", "cursor", "el", "gsap", "env", "html"].forEach(function (k) {
      var r = div("wd-row", panel);
      var l = document.createElement("span");
      l.textContent = ({ vp: "okno", bp: "breakpoint", scroll: "scroll", fps: "fps", cursor: "kurzor",
        el: "prvek", gsap: "gsap", env: "prostředí", html: "html.class" })[k];
      var v = document.createElement("b");
      v.textContent = "—";
      r.appendChild(l); r.appendChild(v);
      rows[k] = v;
    });
    if (isTouch) {
      var h = div("wd-hint", panel);
      h.textContent = "klepnutí vybere prvek (odkazy nejdou)";
    }
    document.body.appendChild(layer);
  }

  /* ---------- sekce se štítky ---------- */
  function collect() {
    var list = document.querySelectorAll("section, footer, .sub-hero, .sub-section, .sub-cta");
    var seen = [], i;
    secEls = [];
    for (i = 0; i < list.length; i++) {
      if (seen.indexOf(list[i]) === -1) { seen.push(list[i]); secEls.push(list[i]); }
    }
    while (chips.length < secEls.length) chips.push(div("wd-chip", layer));
    for (i = secEls.length; i < chips.length; i++) chips[i].style.display = "none";
  }
  function updateChips() {
    var vh = window.innerHeight, i, el, r, c, top, t;
    for (i = 0; i < secEls.length; i++) {
      el = secEls[i]; c = chips[i];
      r = el.getBoundingClientRect();
      if (r.bottom < 80 || r.top > vh - 24 || r.width < 40) { c.style.display = "none"; continue; }
      top = Math.min(Math.max(r.top + 6, 76), r.bottom - 22);
      t = sel(el) + "  " + Math.round(r.width) + "×" + Math.round(r.height);
      if (c._t !== t) { c.textContent = t; c._t = t; }
      c.style.transform = "translate(" + Math.max(r.left + 6, 6) + "px," + top + "px)";
      c.style.display = "block";
    }
  }

  /* ---------- zvýraznění prvku (box model) ---------- */
  function drawHover(el) {
    if (!el || el === root || el === document.body || layer.contains(el)) { hideBoxes(); return; }
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) { hideBoxes(); return; }
    var cs = getComputedStyle(el);
    var ml = px(cs.marginLeft), mr = px(cs.marginRight), mt = px(cs.marginTop), mb = px(cs.marginBottom);
    var bl = px(cs.borderLeftWidth), br = px(cs.borderRightWidth), bt = px(cs.borderTopWidth), bb = px(cs.borderBottomWidth);
    var pl = px(cs.paddingLeft), pr = px(cs.paddingRight), pt = px(cs.paddingTop), pb = px(cs.paddingBottom);
    place(boxM, r.left - ml, r.top - mt, r.width + ml + mr, r.height + mt + mb);
    place(boxB, r.left, r.top, r.width, r.height);
    place(boxC, r.left + bl + pl, r.top + bt + pt, r.width - bl - br - pl - pr, r.height - bt - bb - pt - pb);

    tip.textContent = sel(el) + "  " + Math.round(r.width) + "×" + Math.round(r.height);
    tip.style.display = "block";
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var tx = Math.min(Math.max(r.left, 4), window.innerWidth - tw - 4);
    var ty = r.top - th - 5;
    if (ty < 4) ty = Math.min(r.bottom + 5, window.innerHeight - th - 4);
    tip.style.transform = "translate(" + tx + "px," + ty + "px)";
  }

  /* ---------- panel s údaji ---------- */
  function updateInfo(el) {
    var w = window.innerWidth, h = window.innerHeight;
    var max = Math.max(1, root.scrollHeight - h);
    var y = Math.round(window.pageYOffset);
    rows.vp.textContent = w + "×" + h + " @" + (window.devicePixelRatio || 1) + "x";
    rows.bp.textContent = bp(w);
    rows.scroll.textContent = y + " / " + max + "  (" + Math.round(y / max * 100) + " %)";
    rows.fps.textContent = fps ? String(fps) : "…";
    rows.cursor.textContent = mx < 0 ? "—" : Math.round(mx) + ", " + Math.round(my);
    rows.el.textContent = el ? sel(el) : "—";
    rows.gsap.textContent = gsapInfo;
    rows.env.textContent = (matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced-motion" : "motion") +
      " · " + (navigator.hardwareConcurrency || "?") + " jader";
    var cl = [].filter.call(root.classList, function (c) { return c !== "wd-on" && c !== "js"; }).join(" ");
    rows.html.textContent = cl || "—";
  }
  function updateGsap() {
    var g = window.gsap, s = window.ScrollTrigger;
    if (!g) { gsapInfo = "není"; return; }
    var act = 0;
    try {
      act = g.globalTimeline.getChildren(true, true, false).filter(function (t) { return t.isActive(); }).length;
    } catch (e) { act = 0; }
    gsapInfo = act + " tweenů · " + (s ? s.getAll().length : 0) + " ST";
  }

  /* ---------- smyčka ---------- */
  function loop(now) {
    if (!on) return;
    raf = requestAnimationFrame(loop);

    frames++;
    if (now - fpsT >= 500) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
    if (now - gsapT >= 400) { updateGsap(); gsapT = now; }
    if (now - collectT >= 1500) { collect(); collectT = now; }

    var el = picked || (mx >= 0 ? document.elementFromPoint(mx, my) : null);
    updateChips();
    drawHover(el);
    if (now - infoT >= 120) { updateInfo(el); infoT = now; }
  }

  /* ---------- události ---------- */
  function onMove(e) { mx = e.clientX; my = e.clientY; picked = null; }
  function onLeave() { mx = -1; }
  function onKey(e) { if (e.key === "Escape") disable(); }
  function onTap(e) {
    if ((layer && layer.contains(e.target)) || (toggle && toggle.contains(e.target))) return;
    e.preventDefault();
    e.stopPropagation();
    picked = e.target;
  }

  function setToggle(v) {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", v ? "true" : "false");
    toggle.textContent = v ? "[debug ✓]" : "[debug]";
  }
  function save(v) {
    try { sessionStorage.setItem(KEY, v ? "1" : "0"); } catch (e) { /* bez ukládání */ }
  }

  function enable() {
    if (on) return;
    on = true;
    build();
    root.classList.add("wd-on");
    collect();
    window.addEventListener("mousemove", onMove, { passive: true });
    root.addEventListener("mouseleave", onLeave);
    window.addEventListener("keydown", onKey);
    if (isTouch) document.addEventListener("click", onTap, true);
    setToggle(true); save(true);
    fpsT = performance.now(); frames = 0;
    raf = requestAnimationFrame(loop);
  }
  function disable() {
    if (!on) return;
    on = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("mousemove", onMove);
    root.removeEventListener("mouseleave", onLeave);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onTap, true);
    root.classList.remove("wd-on");
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = panel = tip = boxM = boxB = boxC = null;
    chips = []; secEls = []; picked = null; mx = -1;
    setToggle(false); save(false);
  }

  if (toggle) toggle.addEventListener("click", function () { on ? disable() : enable(); });

  var auto = !!window.__wdOn;
  try { auto = auto || sessionStorage.getItem(KEY) === "1"; } catch (e) { /* nic */ }
  if (/[?&]debug\b/.test(location.search)) auto = true;
  if (auto) enable();
})();
