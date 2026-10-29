(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Webfont erst nach der ersten Anzeige laden ---------- */
  // Erst nach dem vollständigen Laden: so konkurriert die Schrift nicht mit dem Hero-Bild.
  const loadFont = () => {
    const face = new FontFace("Archivo", 'url(/fonts/archivo.woff2) format("woff2")', { weight: "100 900", stretch: "62% 125%", display: "swap" });
    document.fonts.add(face);
    face.load().catch(() => {});
  };
  if ("FontFace" in window) {
    if (document.readyState === "complete") loadFont();
    else addEventListener("load", loadFont, { once: true });
  }

  /* ---------- Text in einzelne Wörter zerlegen ---------- */
  const splitWords = (el, highlight = []) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "w" + (highlight.some((h) => w.startsWith(h)) ? " w--hl" : "");
      span.style.setProperty("--i", i);
      span.textContent = w;
      el.append(span, i < words.length - 1 ? " " : "");
    });
    return $$(".w", el);
  };

  /* ---------- Header ---------- */
  const hdr = $("[data-hdr]");
  const hero = $(".hero");
  if (hero) {
    new IntersectionObserver(([en]) => hdr.classList.toggle("is-solid", !en.isIntersecting), { rootMargin: "-100px 0px 0px 0px" }).observe(hero);
  }

  /* ---------- Mobile-Menü ---------- */
  const burger = $("[data-burger]");
  const mnav = $("[data-mnav]");
  const setMenu = (open) => {
    if (open) mnav.hidden = false;
    requestAnimationFrame(() => mnav.classList.toggle("is-open", open));
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    if (!open) setTimeout(() => { if (!mnav.classList.contains("is-open")) mnav.hidden = true; }, 900);
  };
  burger.addEventListener("click", () => setMenu(!mnav.classList.contains("is-open")));
  $$("a", mnav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && mnav.classList.contains("is-open")) { setMenu(false); burger.focus(); } });

  /* ---------- Aktiver Menüpunkt ---------- */
  const navLinks = $$(".hdr__nav a");
  const navIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + en.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section").forEach((s) => navIO.observe(s));

  /* ---------- Einblenden beim Scrollen ---------- */
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    io.unobserve(en.target);
  }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal], [data-line]").forEach((el) => io.observe(el));

  if (reduced) return;

  /* ---------- Statement: Wörter hellen mit dem Scrollen auf ---------- */
  const statement = $("[data-words]");
  const stWords = statement ? splitWords(statement, ["Bewertung", "Verwertung"]) : [];

  /* ---------- Scroll-gekoppelte Effekte (ein gemeinsamer rAF-Loop) ---------- */
  const track = $("[data-marquee]");
  const cards = $$("[data-card]");
  cards.forEach((c, i) => c.style.setProperty("--n", i));
  const stackOn = () => innerWidth > 860;
  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = innerHeight;

    if (statement) {
      const r = statement.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const n = Math.round(p * stWords.length);
      stWords.forEach((w, i) => w.classList.toggle("on", i < n));
    }

    if (stackOn()) {
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        const r = card.getBoundingClientRect();
        let p = 0;
        if (next) {
          const nr = next.getBoundingClientRect();
          p = clamp(1 - (nr.top - r.top) / r.height);
        }
        card.style.setProperty("--s", (1 - p * 0.07).toFixed(4));
        card.style.setProperty("--b", (1 - p * 0.35).toFixed(4));
        const img = $(".card__media img", card);
        const q = clamp((vh - r.top) / (vh + r.height));
        img.style.setProperty("--py", `${(-16 + q * 16).toFixed(2)}%`);
      });
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();

  /* ---------- Laufband: ständige Drift + schneller beim Scrollen ---------- */
  if (track) {
    let x = 0, last = performance.now(), lastY = scrollY, visible = false, raf;
    const loop = (t) => {
      const dt = Math.min(64, t - last); last = t;
      const dy = Math.abs(scrollY - lastY); lastY = scrollY;
      x -= dt * 0.05 + dy * 0.6;
      const half = track.scrollWidth / 2;
      if (-x >= half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      if (visible) raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) { last = performance.now(); lastY = scrollY; raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
    }).observe(track);
  }

  /* ---------- Hero: Lichtkegel folgt der Maus ---------- */
  if (hero && finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  /* ---------- Magnetische Buttons ---------- */
  if (finePointer) {
    $$("[data-magnet]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.translate = ""; });
    });
  }
})();
