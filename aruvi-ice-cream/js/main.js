/* Aruvi Ice Cream & Aari Works — page behaviour.
   All content lives in index.html. Contact buttons read the shop's details from the
   Visit section, so they switch on by themselves once a real number is written there. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- Contact details (only from confirmed text on the page) ---------------- */

  // A detail counts only once its placeholder has been replaced with real text.
  function detail(key) {
    const el = $(`[data-contact="${key}"]`);
    if (!el || el.querySelector(".placeholder")) return "";
    return el.textContent.trim();
  }

  // Indian numbers written without a country code get +91.
  function withCountryCode(raw) {
    const d = raw.replace(/\D/g, "");
    if (!d) return "";
    if (raw.trim().startsWith("+")) return d;
    if (d.length === 10) return "91" + d;
    if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
    return d;
  }

  const waNumber = withCountryCode(detail("whatsapp"));
  const phoneNumber = withCountryCode(detail("phone"));
  const address = detail("address");
  const waHref = (msg) => (waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}` : "");
  const telHref = phoneNumber ? `tel:+${phoneNumber}` : "";
  const directionsEl = $("[data-directions]");
  const directionsHref =
    directionsEl?.getAttribute("href") ||
    (address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Aruvi Ice Cream & Aari Works, ${address}`)}`
      : "");

  /* ---------------- "Not added yet" notice ---------------- */

  const notice = $("[data-notice]");
  const NOTICE_COPY = {
    whatsapp: {
      title: "WhatsApp enquiries are almost ready",
      text: "The shop's WhatsApp number hasn't been added yet. Once it is, this button opens a chat with this message ready to send:",
    },
    phone: { title: "Phone number coming soon", text: "The shop's phone number hasn't been added yet." },
    directions: { title: "Directions coming soon", text: "The shop's address and map location haven't been added yet." },
  };

  function openNotice(kind, quote) {
    const copy = NOTICE_COPY[kind];
    $("[data-notice-title]", notice).textContent = copy.title;
    $("[data-notice-text]", notice).textContent = copy.text;
    const q = $("[data-notice-quote]", notice);
    q.hidden = !quote;
    q.textContent = quote || "";
    notice.showModal();
  }
  notice.addEventListener("click", (e) => {
    if (e.target === notice) notice.close();
  });

  // Turns a link into the real action, or a clearly marked "coming soon" button.
  function wireAction(el, href, kind, quote) {
    if (!el) return;
    if (href) {
      el.href = href;
      if (/^https?:/.test(href)) {
        el.target = "_blank";
        el.rel = "noopener";
      }
      return;
    }
    el.classList.add("is-pending");
    el.setAttribute("role", "button");
    el.setAttribute("aria-haspopup", "dialog");
    el.href = "#";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openNotice(kind, quote);
    });
  }

  $$("[data-wa]").forEach((el) => wireAction(el, waHref(el.dataset.wa), "whatsapp", el.dataset.wa));
  wireAction(directionsEl, directionsHref, "directions");
  wireAction($("[data-call]"), telHref, "phone");

  /* ---------------- Product filters ---------------- */

  const filters = $("[data-filters]");
  const cards = $$("[data-products] .product[data-category]");
  const catChips = $$("[data-cat]", filters);
  const brandChips = $$("[data-brand]", filters);
  const status = $("[data-filter-status]");
  const empty = $("[data-filter-empty]");
  const state = { cat: "all", brand: "all" };
  const chipLabel = (chips, attr, value) => chips.find((c) => c.dataset[attr] === value)?.textContent.trim();

  function applyFilters({ announce = true } = {}) {
    let shown = 0;
    cards.forEach((card) => {
      const match =
        (state.cat === "all" || card.dataset.category === state.cat) &&
        (state.brand === "all" || card.dataset.brand === state.brand);
      if (match) {
        shown++;
        if (card.hidden) {
          card.hidden = false;
          card.classList.remove("is-entering");
          void card.offsetWidth; // restart the entrance animation
          card.classList.add("is-entering");
        }
      } else {
        card.hidden = true;
      }
    });

    catChips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === state.cat)));
    brandChips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.brand === state.brand)));
    empty.hidden = shown > 0;

    if (!announce) return;
    const parts = [];
    if (state.cat !== "all") parts.push(chipLabel(catChips, "cat", state.cat));
    if (state.brand !== "all") parts.push(chipLabel(brandChips, "brand", state.brand));
    status.textContent =
      shown === cards.length
        ? `Showing all ${cards.length} products`
        : `Showing ${shown} of ${cards.length} products${parts.length ? ` · ${parts.join(" · ")}` : ""}`;
  }

  if (filters && cards.length) {
    filters.hidden = false;
    applyFilters();

    catChips.forEach((chip) =>
      chip.addEventListener("click", () => {
        state.cat = chip.dataset.cat;
        applyFilters();
      })
    );
    brandChips.forEach((chip) =>
      chip.addEventListener("click", () => {
        state.brand = chip.dataset.brand;
        applyFilters();
      })
    );
    $("[data-filter-reset]").addEventListener("click", () => {
      state.cat = state.brand = "all";
      applyFilters();
    });

    // Links in the brand cards jump to the catalogue with a filter applied
    $$("[data-filter-cat]").forEach((a) =>
      a.addEventListener("click", () => {
        state.cat = a.dataset.filterCat;
        state.brand = "all";
        applyFilters();
      })
    );
    $$("[data-filter-brand]").forEach((a) =>
      a.addEventListener("click", () => {
        state.brand = a.dataset.filterBrand;
        state.cat = "all";
        applyFilters();
      })
    );
  }

  /* ---------------- Gallery lightbox ---------------- */

  const KIND_LABEL = { shop: "Our shop", work: "Our work", banner: "Shop banner", illustrative: "Illustrative" };
  const galleryButtons = $$("[data-gallery] .g-btn");
  const gallery = galleryButtons.map((btn) => {
    const img = $("img", btn);
    return { src: img.getAttribute("src"), alt: img.alt, caption: btn.dataset.caption, kind: btn.dataset.kind };
  });
  galleryButtons.forEach((btn, i) =>
    btn.setAttribute("aria-label", `View larger: ${gallery[i].caption} (${KIND_LABEL[gallery[i].kind] || ""})`)
  );

  const lb = $("[data-lightbox]");
  const lbImg = $("[data-lightbox-img]", lb);
  let current = 0;
  let returnFocusTo = null;

  function showSlide(i) {
    current = (i + gallery.length) % gallery.length;
    const g = gallery[current];
    lbImg.src = g.src;
    lbImg.alt = g.alt;
    const tag = $("[data-lightbox-tag]", lb);
    tag.className = `tag tag-${g.kind}`;
    tag.textContent = KIND_LABEL[g.kind] || "";
    $("[data-lightbox-caption]", lb).textContent = g.caption;
    $("[data-lightbox-count]", lb).textContent = `${current + 1} / ${gallery.length}`;
  }

  function openLightbox(i, opener) {
    returnFocusTo = opener;
    showSlide(i);
    lb.showModal();
    document.documentElement.classList.add("no-scroll");
  }

  lb.addEventListener("close", () => {
    document.documentElement.classList.remove("no-scroll");
    returnFocusTo?.focus({ preventScroll: true });
  });

  galleryButtons.forEach((btn, i) => btn.addEventListener("click", () => openLightbox(i, btn)));
  $$("[data-open-image]").forEach((btn) => {
    const i = gallery.findIndex((g) => g.src === btn.dataset.openImage);
    if (i >= 0) btn.addEventListener("click", () => openLightbox(i, btn));
  });

  $("[data-lightbox-prev]", lb).addEventListener("click", () => showSlide(current - 1));
  $("[data-lightbox-next]", lb).addEventListener("click", () => showSlide(current + 1));
  $("[data-lightbox-close]", lb).addEventListener("click", () => lb.close());
  lb.addEventListener("click", (e) => {
    if (e.target === lb || e.target.classList.contains("lightbox-inner")) lb.close();
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showSlide(current - 1);
    if (e.key === "ArrowRight") showSlide(current + 1);
  });

  // Swipe left/right on touch screens
  let touchX = null;
  lb.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showSlide(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------------- Header, mobile menu, active section ---------------- */

  const header = $("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  const menuLabel = $("[data-menu-label]");

  function setMenu(open, { focus = true } = {}) {
    toggle.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Close menu" : "Open menu";
    header.classList.toggle("menu-open", open);
    document.documentElement.classList.toggle("no-scroll", open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
      if (focus) $("a", menu)?.focus();
    } else {
      menu.classList.remove("is-open");
      menu.hidden = true;
      if (focus) toggle.focus();
    }
  }

  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a:not(.is-pending)")) setMenu(false, { focus: false });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setMenu(false);
  });
  window.matchMedia("(min-width: 1100px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false, { focus: false });
  });

  // Highlight the nav link for the section on screen
  const navLinks = $$("[data-nav]");
  const sectionFor = { home: "home", products: "products", shop: "products", aari: "aari", gallery: "gallery", visit: "visit" };
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const key = sectionFor[entry.target.id];
        navLinks.forEach((a) => {
          const on = a.dataset.nav === key;
          a.classList.toggle("is-active", on);
          if (on) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  Object.keys(sectionFor).forEach((id) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------------- Gentle reveal on scroll ---------------- */

  const revealEls = $$(".reveal");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach((el) => io.observe(el));
  }
})();
