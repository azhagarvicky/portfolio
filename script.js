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

  /* ---------- Loader: a product pipeline ---------- */
  const reelMode = root.classList.contains('is-reel');
  if (loader) {
    root.classList.add('is-loading');
    if (lenis) lenis.stop();
    const bar = $('.loader__bar i', loader);
    const pct = $('.loader__pct', loader);
    const stage = $('.loader__stage', loader);
    const STAGES = ['Discovery', 'Gap analysis', 'Prototype', 'Build', 'Ship'];
    const count = { v: 0 };
    const runLoader = () => gsap.timeline({
      onComplete: () => {
        loader.remove();
        root.classList.remove('is-loading');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
        if (reelMode) gsap.delayedCall(1.6, playReel);
      },
    })
      .to(count, {
        v: 100,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          bar.style.transform = `scaleX(${count.v / 100})`;
          pct.textContent = `${Math.round(count.v)}%`;
          stage.textContent = count.v >= 100 ? 'Ready' : STAGES[Math.floor((count.v / 100) * STAGES.length)];
        },
      })
      .to('.loader__box', { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' }, '+=0.1')
      .fromTo(loader, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' })
      .add(() => intro.play(), '-=0.55');

    if (reelMode) {
      // Reel mode waits for a tap, so you can start screen recording first
      stage.textContent = 'Tap to start';
      loader.addEventListener('pointerdown', () => { stage.textContent = STAGES[0]; runLoader(); }, { once: true });
    } else {
      runLoader();
    }
  } else {
    intro.play();
    if (reelMode) gsap.delayedCall(2, playReel);
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
    // Small starting window: portrait-ish and a little high, so the walk-in shows head to knees
    const smallInset = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      const w = vw < 700 ? vw * 0.86 : Math.min(vw * 0.44, 860);
      const h = vw < 700 ? vh * 0.66 : Math.min(vh * 0.64, w * 1.05);
      const top = vh * 0.1;
      const side = (vw - w) / 2;
      return `inset(${top}px ${side}px ${vh - h - top}px ${side}px round 20px)`;
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

  /* ---------- Reel mode (azhagar.com/#play): the page plays itself, ~28s, for a screen-recorded Instagram reel ---------- */
  function playReel() {
    const top = (el) => el.getBoundingClientRect().top + window.scrollY;
    const vh = () => window.innerHeight;
    const smooth = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const steady = (x) => x;
    const glide = (y, duration, easing = smooth) => new Promise((done) => {
      if (lenis) lenis.scrollTo(Math.max(0, y), { duration, easing, force: true, lock: true, onComplete: done });
      else { window.scrollTo({ top: y, behavior: 'smooth' }); setTimeout(done, duration * 1000); }
    });
    const hold = (s) => new Promise((done) => setTimeout(done, s * 1000));
    const reelPin = ScrollTrigger.getAll().find((st) => st.pin && st.trigger.classList.contains('reel'));
    const tiers = $$('.tier');
    const about = $('.about__text');

    (async () => {
      if (reelPin) {
        await glide(reelPin.start, 1.0);
        await glide(reelPin.end, 5.0, steady); // the showreel grows and plays
      }
      if (tiers.length) {
        await glide(top(tiers[0]) - vh() * 0.12, 2.0);
        await hold(0.9);
        await glide(top(tiers[tiers.length - 1]) - vh() * 0.3, 1.6);
        await hold(0.4);
      }
      if (about) await glide(top(about) + about.offsetHeight - vh() * 0.45, 2.8, steady);
      await glide(top($('.svc')) - vh() * 0.1, 1.6);
      await hold(1.0);
      await glide(top($('.contact__row')) - vh() * 0.35, 2.2);
      await hold(2.2);
      await glide(document.documentElement.scrollHeight - vh(), 1.2);
    })();
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
     Showreel engine: the walk-in
     100 transparent frames (assets/walk/000–099.webp) cut out of
     a green-screen Kling AI video. Scroll position = frame, so the
     walk plays forward and backward smoothly on every device.
     ========================================================== */
  function createReel() {
    const section = $('.reel');
    if (!section) return null;
    const canvas = $('.reel__walk', section);
    const ctx = canvas.getContext('2d');
    const tcEls = $$('[data-reel-tc]', section);
    const timeline = $('.timeline', section);
    const FRAMES = 100;
    const SECONDS = 5.04;
    const src = (i) => `assets/walk/${String(i).padStart(3, '0')}.webp`;
    const frames = new Array(FRAMES);

    let target = 0;
    let current = 0;
    let raf = 0;
    let drawn = -1;
    let cw = 0;
    let ch = 0;

    const load = (i) => new Promise((done) => {
      if (frames[i]) return done();
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; done(); };
      img.onerror = done;
      img.src = src(i);
    });

    // Coarse frames first (every 10th, then every 5th), then the rest, so scrubbing works early
    let loadingAll = false;
    const loadAll = () => {
      if (loadingAll) return;
      loadingAll = true;
      const order = [];
      [10, 5, 1].forEach((step) => { for (let i = 0; i < FRAMES; i += step) if (!order.includes(i)) order.push(i); });
      (async () => {
        for (let k = 0; k < order.length; k += 6) {
          await Promise.all(order.slice(k, k + 6).map(load));
          render(true);
        }
      })();
    };

    const nearestLoaded = (i) => {
      for (let d = 0; d < FRAMES; d++) {
        if (frames[i - d]) return i - d;
        if (frames[i + d]) return i + d;
      }
      return -1;
    };

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = Math.max(1, Math.round(r.width * dpr));
      ch = Math.max(1, Math.round(r.height * dpr));
      canvas.width = cw;
      canvas.height = ch;
      render(true);
    }

    function render(force) {
      const i = nearestLoaded(Math.round(current * (FRAMES - 1)));
      if (i >= 0 && (force || i !== drawn)) {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(frames[i], 0, 0, cw, ch);
        drawn = i;
      }
      const time = current * SECONDS;
      tcEls.forEach((el) => { el.textContent = timecode(time); });
      if (timeline) timeline.style.setProperty('--p', current.toFixed(4));
      section.style.setProperty('--walk', current.toFixed(4));
    }

    function loop() {
      current += (target - current) * 0.3;
      if (Math.abs(target - current) < 0.0005) current = target;
      render(false);
      raf = current !== target ? requestAnimationFrame(loop) : 0;
    }

    load(0).then(() => render(true));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { loadAll(); io.disconnect(); }
      }, { rootMargin: '150% 0px' });
      io.observe(section);
    } else {
      loadAll();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else addEventListener('resize', resize);
    resize();

    return {
      setProgress(p) {
        target = p;
        if (!raf) raf = requestAnimationFrame(loop);
      },
      setStatic() {
        current = target = 1; // show the close-up
        load(FRAMES - 1).then(() => render(true));
      },
    };
  }
})();
