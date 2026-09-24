/* ==========================================================
   Azhagar — portfolio interactions
   GSAP + ScrollTrigger drive the scroll motion, Lenis smooths
   the scroll. If the libraries fail to load, or the visitor
   prefers reduced motion, the page stays static and readable.
   ========================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const FPS = 24;
  const PAGE_SECONDS = 96; // the whole page "runs" this long on the nav timecode
  const FILM_SECONDS = 16; // length of the canvas stand-in reel

  const timecode = (seconds) => {
    const frames = Math.max(0, Math.floor(seconds * FPS));
    const s = Math.floor(frames / FPS);
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, frames % FPS]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
  };

  /* ---------- Always-on details ---------- */
  // No photo yet? Drop the broken image so the placeholder silhouette shows.
  const portraitImg = $('.portrait__img');
  if (portraitImg) {
    if (portraitImg.complete && portraitImg.naturalWidth === 0) portraitImg.remove();
    else portraitImg.addEventListener('error', () => portraitImg.remove(), { once: true });
  }

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const tick = () => clocks.forEach((el) => { el.textContent = `${fmt.format(new Date())} IST`; });
    tick();
    setInterval(tick, 20000);
  }

  $$('[data-copy]').forEach((btn) => {
    const label = $('span', btn) || btn;
    const show = (msg) => {
      label.textContent = msg;
      clearTimeout(btn._reset);
      btn._reset = setTimeout(() => { label.textContent = 'Copy'; }, 1800);
    };
    const selectInstead = () => {
      const target = btn.dataset.copyTarget ? $(btn.dataset.copyTarget) : null;
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      show('Selected');
    };
    btn.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(btn.dataset.copy).then(() => show('Copied'), selectInstead);
      } else {
        selectInstead();
      }
    });
  });

  // Split the hero name into letters (outer span clips, inner span moves)
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-label', text);
    el.textContent = '';
    for (const char of text) {
      const outer = document.createElement('span');
      outer.className = 'ch';
      outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'ch__in';
      inner.textContent = char;
      outer.appendChild(inner);
      el.appendChild(outer);
    }
  });

  // Audio waveform on the showreel timeline
  $$('.clip--audio').forEach((clip) => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 160; i++) {
      const bar = document.createElement('i');
      const h = 18 + Math.abs(Math.sin(i * 0.37) * 46 + Math.sin(i * 1.93) * 22 + Math.sin(i * 0.07) * 14);
      bar.style.height = `${Math.min(96, h)}%`;
      frag.appendChild(bar);
    }
    clip.appendChild(frag);
  });

  // Duplicate marquee content so it can loop seamlessly
  $$('.marquee__row').forEach((row) => {
    const originals = Array.from(row.children);
    originals.forEach((node) => {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
    });
  });

  // Split the about paragraph into words; inline icons count as one word
  const splitWords = (el) => {
    const words = [];
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            frag.appendChild(span);
            words.push(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.matches('.ii, .ipill')) words.push(child);
          else walk(child);
        }
      });
    };
    walk(el);
    return words;
  };
  const aboutText = $('.about__text');
  const aboutWords = aboutText ? splitWords(aboutText) : [];

  const reel = createReel();
  const loader = $('.loader');
  const hudTc = $('.hud__tc');
  const hudSeq = $('.hud__seq');
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);

  /* ---------- Static fallback ---------- */
  if (!hasGSAP || reduceMotion) {
    root.classList.add('is-static');
    if (loader) loader.remove();
    if (reel) reel.setStatic();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (hudTc) hudTc.textContent = timecode((max > 0 ? scrollY / max : 0) * PAGE_SECONDS);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return;
  }

  /* ==========================================================
     Motion
     ========================================================== */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  let lenis = null;
  if (typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // In-page links glide instead of jumping
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#' || id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Hero intro (played after the loader) ---------- */
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  ['.hero__name .ch__in', '.hero__outline .ch__in'].forEach((sel) => {
    intro.from(sel, { yPercent: 115, duration: 1.4, stagger: { each: 0.05, from: 'center' } }, 0);
  });
  intro
    .fromTo('.portrait',
      { clipPath: 'inset(100% 0% 0% 0% round 22px)', scale: 1.18 },
      { clipPath: 'inset(0% 0% 0% 0% round 22px)', scale: 1, duration: 1.5, clearProps: 'clipPath' }, 0.15)
    .from('.float__in', { scale: 0, rotation: -40, opacity: 0, duration: 1.1, ease: 'back.out(2)', stagger: 0.09 }, 0.7)
    .from('.nav > *', { y: -24, opacity: 0, duration: 1, stagger: 0.07 }, 0.5)
    .from('.hero__foot > *', { y: 30, opacity: 0, duration: 1, stagger: 0.08 }, 0.75);

  /* ---------- Loader: a fake render dialog ---------- */
  if (loader) {
    root.classList.add('is-loading');
    if (lenis) lenis.stop();
    const bar = $('.loader__bar i', loader);
    const pct = $('.loader__pct', loader);
    const tc = $('.loader__tc', loader);
    const count = { v: 0 };
    gsap.timeline({
      onComplete: () => {
        loader.remove();
        root.classList.remove('is-loading');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      },
    })
      .to(count, {
        v: 100,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          bar.style.transform = `scaleX(${count.v / 100})`;
          pct.textContent = `${Math.round(count.v)}%`;
          tc.textContent = timecode((count.v / 100) * 5.5);
        },
      })
      .to('.loader__box', { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' }, '+=0.1')
      .fromTo(loader, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' })
      .add(() => intro.play(), '-=0.55');
  } else {
    intro.play();
  }

  /* ---------- Hero: mouse parallax ---------- */
  const hero = $('.hero');
  if (finePointer && hero) {
    const tiltX = gsap.quickTo('.portrait', 'rotationX', { duration: 0.8, ease: 'power3' });
    const tiltY = gsap.quickTo('.portrait', 'rotationY', { duration: 0.8, ease: 'power3' });
    const nameX = gsap.quickTo(['.hero__name', '.hero__outline'], 'x', { duration: 1.2, ease: 'power3' });
    const floats = $$('.float__in').map((el) => ({
      x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3' }),
      depth: parseFloat(el.dataset.depth) || 1,
    }));
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      tiltY(nx * 16);
      tiltX(-ny * 12);
      nameX(nx * -28);
      floats.forEach((f) => { f.x(nx * 46 * f.depth); f.y(ny * 34 * f.depth); });
    });
    hero.addEventListener('pointerleave', () => {
      tiltX(0); tiltY(0); nameX(0);
      floats.forEach((f) => { f.x(0); f.y(0); });
    });
  }

  /* ---------- Hero: letters spread apart as you scroll away ---------- */
  const heroOut = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  [$$('.hero__name .ch'), $$('.hero__outline .ch')].forEach((letters) => {
    const mid = (letters.length - 1) / 2;
    heroOut.to(letters, {
      xPercent: (i) => (i - mid) * 55,
      yPercent: (i) => -Math.abs(i - mid) * 14,
      rotation: (i) => (i - mid) * 3,
      ease: 'none',
    }, 0);
  });
  heroOut
    .to('.hero__portrait', { yPercent: -16, scale: 0.84, rotation: -4, ease: 'none' }, 0)
    .to('.float', {
      x: (i) => (i % 2 ? 1 : -1) * 160,
      y: (i) => -140 - i * 50,
      rotation: (i) => (i % 2 ? 30 : -30),
      opacity: 0,
      ease: 'none',
    }, 0)
    .to('.hero__foot', { y: -60, opacity: 0, ease: 'none' }, 0);

  /* ---------- Showreel: frame grows to full screen, video scrubs with scroll ---------- */
  if (reel) {
    const smallInset = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const w = vw < 700 ? vw * 0.86 : Math.min(vw * 0.46, 900);
      const h = Math.min((w * 9) / 16, vh * 0.6);
      const ix = (vw - w) / 2;
      const iy = (vh - h) / 2;
      return `inset(${iy}px ${ix}px ${iy}px ${ix}px round 20px)`;
    };

    gsap.from('.reel__w', {
      yPercent: 70,
      ease: 'none',
      scrollTrigger: { trigger: '.reel', start: 'top bottom', end: 'top top', scrub: true },
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: '.reel',
        start: 'top top',
        end: '+=320%',
        pin: true,
        scrub: true,
        refreshPriority: 2,
        invalidateOnRefresh: true,
        onUpdate: (self) => reel.setProgress(self.progress),
      },
    })
      .fromTo('.reel__frame', { clipPath: smallInset }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', ease: 'power2.inOut', duration: 0.42 }, 0)
      .to('.reel__w--l', { xPercent: -150, ease: 'power2.in', duration: 0.4 }, 0)
      .to('.reel__w--r', { xPercent: 150, ease: 'power2.in', duration: 0.4 }, 0)
      .to('.reel__cap, .reel__hint', { opacity: 0, duration: 0.12 }, 0)
      .fromTo('.timeline', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.34)
      .to({}, { duration: 0.58 }, 0.42);
  }

  /* ---------- Work: horizontal scroll on wide screens ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const work = $('.work');
    if (!work) return undefined; // section hidden until real projects are added
    root.classList.add('is-hscroll');
    const track = $('.work__track');
    const viewport = $('.work__viewport');
    const bar = $('.work__progress i');
    const indexEl = $('[data-work-index]');
    const count = $$('.card:not(.card--cta)', track).length;
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    const slide = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: work,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        refreshPriority: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          bar.style.transform = `scaleX(${self.progress})`;
          indexEl.textContent = String(Math.min(count, Math.floor(self.progress * count) + 1)).padStart(2, '0');
        },
      },
    });

    // Artwork drifts inside each card as it travels across the screen
    $$('.card__art', track).forEach((art) => {
      gsap.fromTo(art, { xPercent: -6 }, {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: art.closest('.card'), containerAnimation: slide, start: 'left right', end: 'right left', scrub: true },
      });
    });

    ScrollTrigger.sort();
    return () => root.classList.remove('is-hscroll');
  });

  // Clips inside work cards: hover to play (mouse) or play while visible (touch)
  $$('.card video').forEach((video) => {
    const card = video.closest('.card');
    if (finePointer) {
      card.addEventListener('pointerenter', () => video.play().catch(() => {}));
      card.addEventListener('pointerleave', () => video.pause());
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.6 }).observe(video);
    }
  });

  /* ---------- Skills: each tier's tiles fly in and assemble ---------- */
  $$('.skills__grid').forEach((grid) => {
    gsap.from($$('.tool', grid), {
      x: () => gsap.utils.random(-innerWidth * 0.35, innerWidth * 0.35),
      y: () => gsap.utils.random(140, 420),
      rotation: () => gsap.utils.random(-50, 50),
      scale: 0.4,
      opacity: 0,
      ease: 'power3.out',
      stagger: { each: 0.05, from: 'random' },
      scrollTrigger: { trigger: grid, start: 'top 95%', end: 'top 45%', scrub: 1, invalidateOnRefresh: true },
    });
  });
  if (finePointer) {
    $$('.tool__card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((x - 0.5) * 18).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Marquees: speed up with scroll, follow scroll direction ---------- */
  const rows = $$('.marquee__row').map((row) => ({ row, dir: row.dataset.dir === 'right' ? 1 : -1, x: 0, half: 0 }));
  const measure = () => rows.forEach((r) => { r.half = r.row.scrollWidth / 2; });
  measure();
  addEventListener('resize', measure);
  document.fonts && document.fonts.ready.then(measure);
  let velocity = 0;
  let scrollDir = 1;
  if (lenis) {
    lenis.on('scroll', (e) => {
      velocity = e.velocity;
      if (e.direction) scrollDir = e.direction;
    });
  }
  gsap.ticker.add((time, dt) => {
    const boost = 1 + Math.min(Math.abs(velocity) * 0.18, 7);
    rows.forEach((r) => {
      if (!r.half) return;
      r.x += r.dir * scrollDir * 0.05 * dt * boost;
      if (r.x <= -r.half) r.x += r.half;
      if (r.x > 0) r.x -= r.half;
      r.row.style.transform = `translate3d(${r.x}px,0,0)`;
    });
    velocity *= 0.92;
  });

  /* ---------- About: words light up in reading order ---------- */
  if (aboutWords.length) {
    gsap.fromTo(aboutWords, { opacity: 0.14 }, {
      opacity: 1,
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: aboutText, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  }
  gsap.from('.svc__row', {
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.svc', start: 'top 85%' },
  });

  /* ---------- Contact ---------- */
  gsap.from('.contact__title .line > span', {
    yPercent: 105,
    duration: 1.3,
    ease: 'expo.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.contact__title', start: 'top 80%' },
  });

  if (finePointer) {
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Custom cursor ---------- */
  if (finePointer) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    gsap.set([dot, ring], { x: innerWidth / 2, y: innerHeight / 2 });
    addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('[data-cursor], a, button');
      const text = target && target.dataset.cursor ? target.dataset.cursor : '';
      cursor.classList.toggle('is-hover', !!target);
      cursor.classList.toggle('has-label', !!text);
      if (text) label.textContent = text;
    });
    document.documentElement.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
    document.documentElement.addEventListener('pointerenter', () => gsap.to(cursor, { opacity: 1, duration: 0.2 }));
  }

  /* ---------- Nav timecode + current sequence ---------- */
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => { if (hudTc) hudTc.textContent = timecode(self.progress * PAGE_SECONDS); },
  });
  $$('[data-seq]').forEach((section, i) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        if (self.isActive && hudSeq) hudSeq.textContent = `Seq ${String(i + 1).padStart(2, '0')} · ${section.dataset.seq}`;
      },
    });
  });

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());

  /* ==========================================================
     Showreel engine
     Plays assets/showreel.mp4 if it exists; otherwise renders a
     four-shot stand-in film on canvas. Either way, scroll = time.
     ========================================================== */
  function createReel() {
    const section = $('.reel');
    if (!section) return null;
    const canvas = $('.reel__canvas', section);
    const ctx = canvas.getContext('2d');
    const video = $('.reel__video', section);
    const tcEls = $$('[data-reel-tc]', section);
    const timeline = $('.timeline', section);
    const name = (section.dataset.name || 'Showreel').toUpperCase();

    let W = 0;
    let H = 0;
    let dpr = 1;
    let target = 0;
    let current = 0;
    let raf = 0;
    let duration = FILM_SECONDS;
    let useVideo = false;
    let isStatic = false;

    // Seeded random so the "set" looks the same every visit
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const city = [0, 1, 2].map((layer) => {
      const out = [];
      let x = 0;
      while (x < 2) {
        const w = 0.03 + rnd() * 0.06;
        out.push({ x, w, h: 0.18 + rnd() * (0.22 + layer * 0.1), lit: Array.from({ length: 61 }, () => rnd() < 0.34) });
        x += w + 0.004;
      }
      return out;
    });
    const stars = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd() * 0.55, a: 0.2 + rnd() * 0.6 }));
    const bokeh = Array.from({ length: 16 }, () => ({ x: rnd(), y: 0.2 + rnd() * 0.6, s: 0.02 + rnd() * 0.07, a: 0.08 + rnd() * 0.16, warm: rnd() > 0.4, sp: 0.05 + rnd() * 0.2 }));

    const grain = document.createElement('canvas');
    grain.width = grain.height = 160;
    {
      const g = grain.getContext('2d');
      const img = g.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 30;
      }
      g.putImageData(img, 0, 0);
    }
    let grainPattern = null;

    const DISPLAY = '"Archivo", "Arial Narrow", sans-serif';
    const MONO = '"Geist Mono", ui-monospace, monospace';
    const setFont = (weight, size, family, condensed) => {
      ctx.font = `${weight} ${Math.round(size)}px ${family}`;
      if ('fontStretch' in ctx) ctx.fontStretch = condensed ? 'ultra-condensed' : 'normal';
    };
    const spaced = (text, x, y, spacing) => {
      const chars = Array.from(text);
      const widths = chars.map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
      let cx = x - total / 2;
      ctx.textAlign = 'left';
      chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
    };

    function shotGolden(t) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#120b26');
      sky.addColorStop(0.38, '#4b1f55');
      sky.addColorStop(0.6, '#d45a43');
      sky.addColorStop(0.74, '#ffb870');
      sky.addColorStop(1, '#ffe2b0');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      const m = Math.min(W, H);
      const sx = W * 0.5;
      const sy = H * (0.7 - 0.17 * t);
      const sr = m * 0.12;
      const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 5);
      glow.addColorStop(0, 'rgba(255,226,170,.85)');
      glow.addColorStop(0.3, 'rgba(255,170,110,.35)');
      glow.addColorStop(1, 'rgba(255,140,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff1d2';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      [['#7a2e52', 0.66, 0.03, 1.2], ['#43183f', 0.74, 0.045, 2], ['#1a0b22', 0.84, 0.055, 3.1]].forEach(([col, base, amp, sp], k) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W + 10; x += 10) {
          const u = x / W;
          const y = H * (base + amp * Math.sin(u * (3 + k * 1.6) + k * 2.1 + t * sp) + amp * 0.45 * Math.sin(u * (8 + k * 3) - t * sp * 0.7));
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      });
    }

    function shotCity(t) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#05060f');
      sky.addColorStop(0.6, '#151238');
      sky.addColorStop(1, '#2b1b52');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      stars.forEach((s) => {
        ctx.fillStyle = `rgba(230,225,255,${s.a})`;
        ctx.fillRect(s.x * W, s.y * H, 1.5, 1.5);
      });
      const speeds = [0.05, 0.12, 0.24];
      const colors = ['#1b1942', '#110f2c', '#07070f'];
      city.forEach((layer, k) => {
        layer.forEach((b) => {
          const x = (b.x - t * speeds[k]) * W;
          const w = b.w * W;
          if (x > W || x + w < 0) return;
          const h = b.h * H * (0.9 + k * 0.25);
          const y = H - h;
          ctx.fillStyle = colors[k];
          ctx.fillRect(x, y, w, h);
          if (k === 0) return;
          const cell = 7 + k * 3;
          const cols = Math.floor((w - 6) / cell);
          const rowsN = Math.floor((h - 10) / (cell * 1.4));
          for (let r = 0; r < rowsN; r++) {
            for (let c = 0; c < cols; c++) {
              if (!b.lit[(r * cols + c) % b.lit.length]) continue;
              ctx.fillStyle = (r + c) % 5 === 0 ? 'rgba(179,164,255,.75)' : 'rgba(255,205,130,.7)';
              ctx.fillRect(x + 4 + c * cell, y + 8 + r * cell * 1.4, cell * 0.45, cell * 0.6);
            }
          }
        });
      });
      ctx.globalCompositeOperation = 'lighter';
      bokeh.forEach((b) => {
        const x = ((((b.x - t * b.sp) % 1) + 1) % 1) * W;
        const y = b.y * H;
        const rad = b.s * Math.min(W, H) * 1.6;
        const col = b.warm ? '255,190,120' : '179,164,255';
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(${col},${b.a})`);
        g.addColorStop(0.7, `rgba(${col},${b.a * 0.6})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    function shotMotion(t) {
      ctx.fillStyle = '#0d0b15';
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const m = Math.min(W, H);
      const step = m / 10;
      ctx.strokeStyle = 'rgba(239,235,247,.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = cx % step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = cy % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      const palette = ['#b3a4ff', 'rgba(239,235,247,.55)', '#ff6a4d', '#b3a4ff', 'rgba(239,235,247,.3)', '#ffb870'];
      ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const rad = m * (0.12 + k * 0.065);
        const a0 = t * Math.PI * (1.2 + k * 0.45) * (k % 2 ? 1 : -1) + k;
        ctx.strokeStyle = palette[k];
        ctx.lineWidth = k % 2 ? 2 : Math.max(3, m * 0.012);
        ctx.setLineDash(k % 3 === 1 ? [2, 12] : []);
        ctx.beginPath();
        ctx.arc(cx, cy, rad, a0, a0 + Math.PI * (0.5 + 0.22 * k));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = '#efebf7';
      ctx.textBaseline = 'middle';
      setFont(900, m * 0.2, DISPLAY, true);
      spaced('MOTION', cx, cy, m * (0.005 + 0.05 * t));
      setFont(500, Math.max(11, m * 0.018), MONO);
      ctx.fillStyle = '#b3a4ff';
      ctx.textAlign = 'center';
      ctx.fillText('KEYFRAMES · EASING · RHYTHM', cx, cy + m * 0.16);
    }

    function shotTitle(t) {
      ctx.fillStyle = '#0a0910';
      ctx.fillRect(0, 0, W, H);
      const m = Math.min(W, H);
      const cx = W / 2;
      const cy = H / 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.8);
      glow.addColorStop(0, 'rgba(179,164,255,.22)');
      glow.addColorStop(1, 'rgba(179,164,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);
      const s = 1 + t * 0.08;
      ctx.scale(s, s);
      ctx.fillStyle = '#efebf7';
      ctx.textBaseline = 'middle';
      setFont(900, Math.min(W * 0.2, m * 0.34), DISPLAY, true);
      spaced(name, 0, -m * 0.03, m * 0.004);
      ctx.fillStyle = '#b3a4ff';
      const lw = W * 0.34 * Math.min(1, t * 1.6);
      ctx.fillRect(-lw / 2, m * 0.13, lw, 2);
      setFont(500, Math.max(11, m * 0.02), MONO);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(239,235,247,.75)';
      ctx.fillText('SHOWREEL 2026 — EDIT · MOTION · DESIGN', 0, m * 0.19);
      ctx.restore();
    }

    const SHOTS = [shotGolden, shotCity, shotMotion, shotTitle];

    function draw(p) {
      if (!W || !H) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const n = SHOTS.length;
      const x = Math.min(p * n, n - 0.0001);
      const i = Math.floor(x);
      const local = x - i;
      SHOTS[i](local);
      if (i > 0 && local < 0.05) { // flash on the cut
        ctx.fillStyle = `rgba(255,255,255,${(1 - local / 0.05) * 0.28})`;
        ctx.fillRect(0, 0, W, H);
      }
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      if (!grainPattern) grainPattern = ctx.createPattern(grain, 'repeat');
      const ox = Math.random() * 160;
      const oy = Math.random() * 160;
      ctx.save();
      ctx.translate(-ox, -oy);
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, W + 160, H + 160);
      ctx.restore();
      const bar = Math.round(H * 0.05); // letterbox
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, bar);
      ctx.fillRect(0, H - bar, W, bar);
    }

    function render() {
      const time = current * duration;
      if (useVideo) {
        if (!video.seeking && Math.abs(video.currentTime - time) > 0.04) video.currentTime = time;
      } else {
        draw(current);
      }
      tcEls.forEach((el) => { el.textContent = timecode(time); });
      if (timeline) timeline.style.setProperty('--p', current.toFixed(4));
    }

    function loop() {
      current += (target - current) * 0.25;
      if (Math.abs(target - current) < 0.0005) current = target;
      render();
      raf = current !== target ? requestAnimationFrame(loop) : 0;
    }

    function resize() {
      W = section.clientWidth || innerWidth;
      H = section.clientHeight || innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, W > 1400 ? 1 : 1.5);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      grainPattern = null;
      render();
    }

    if (video) {
      const onMeta = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        useVideo = true;
        duration = video.duration;
        section.classList.add('has-video');
        if (isStatic) video.controls = true;
        else render();
      };
      const onError = () => {
        useVideo = false;
        section.classList.remove('has-video');
        video.remove();
        render();
      };
      if (video.error) onError();
      else {
        if (video.readyState >= 1) onMeta();
        video.addEventListener('loadedmetadata', onMeta);
        video.addEventListener('error', onError, { once: true });
        video.addEventListener('seeked', () => { if (useVideo && !isStatic) render(); });
        // iOS Safari only paints seeked frames after the video has played once
        addEventListener('touchstart', () => { video.play().then(() => video.pause()).catch(() => {}); }, { once: true, passive: true });
      }
    }

    resize();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (section.clientWidth !== W || section.clientHeight !== H) resize();
      }).observe(section);
    } else {
      addEventListener('resize', resize);
    }
    if (document.fonts) document.fonts.load('900 100px "Archivo"').then(() => render()).catch(() => {});

    return {
      setProgress(p) {
        target = p;
        if (!raf) raf = requestAnimationFrame(loop);
      },
      resize,
      setStatic() {
        isStatic = true;
        current = target = 0.08;
        if (useVideo) video.controls = true;
        resize();
      },
    };
  }
})();
