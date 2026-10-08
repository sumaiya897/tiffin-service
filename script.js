(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  document.getElementById('yr').textContent = new Date().getFullYear();

  const nav = document.getElementById('nav'), burger = document.getElementById('burger'), overlay = document.getElementById('overlay');
  let lenis;
  function setMenu(open) {
    overlay.classList.toggle('open', open);
    overlay.toggleAttribute('inert', !open);
    overlay.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('lock', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  burger.addEventListener('click', () => setMenu(!overlay.classList.contains('open')));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // ---- Order builder: menu tiles and form pills stay in sync ----
  const dishes = [...document.querySelectorAll('.dish')].map(el => ({
    el, name: el.dataset.dish, price: parseFloat(el.dataset.price), btn: el.querySelector('.add'), group: el.closest('.desserts') ? 'Desserts' : 'Mains'
  }));
  const pills = document.getElementById('pills');
  const totalEl = document.getElementById('total');
  ['Mains', 'Desserts'].forEach(g => {
    dishes.filter(d => d.group === g).forEach(d => {
      const l = document.createElement('label');
      l.innerHTML = `<input type="checkbox" value="${d.name}"><span></span>`;
      l.querySelector('span').textContent = d.name;
      d.box = l.querySelector('input');
      pills.appendChild(l);
    });
  });
  const money = n => 'Â£' + n.toFixed(2);
  function sync(d, on) {
    d.box.checked = on;
    d.btn.setAttribute('aria-pressed', String(on));
    d.el.classList.toggle('selected', on);
  }
  function updateTotal() {
    const sel = dishes.filter(d => d.box.checked);
    if (!sel.length) { totalEl.textContent = 'Nothing selected yet.'; return; }
    const sum = sel.reduce((s, d) => s + d.price, 0);
    const ask = sel.some(d => d.price === 0);
    totalEl.textContent = `${sel.length} ${sel.length === 1 ? 'dish' : 'dishes'} selected, ${money(sum)}${ask ? ' plus price on request' : ''}. Confirmed in chat.`;
  }
  dishes.forEach(d => {
    d.btn.addEventListener('click', () => { sync(d, !d.box.checked); updateTotal(); });
    d.box.addEventListener('change', () => { sync(d, d.box.checked); updateTotal(); });
  });

  // ---- Order form: validate inline, then hand the message to Instagram DM ----
  const form = document.getElementById('orderForm'), status = document.getElementById('status');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const sel = dishes.filter(d => d.box.checked);
    const nameOk = form.name.value.trim().length > 0;
    document.getElementById('nameErr').textContent = nameOk ? '' : 'Please tell us your name.';
    form.name.closest('.field').classList.toggle('invalid', !nameOk);
    document.getElementById('itemsErr').textContent = sel.length ? '' : 'Pick at least one dish so we know what to cook.';
    if (!nameOk || !sel.length) return;
    const note = form.note.value.trim();
    const sum = sel.reduce((s, d) => s + d.price, 0);
    const list = sel.map(d => `${d.name} (${d.price ? money(d.price) : 'price on request'})`).join(', ');
    const msg = `Hi Ghar Ka Khana! I'm ${form.name.value.trim()}. I'd like to order: ${list}. Estimated total: ${money(sum)}.${note ? ' Notes: ' + note : ''}`;
    const open = () => window.open('https://ig.me/m/tiffin_gloucester', '_blank', 'noopener');
    (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(() => {
      status.textContent = 'Order copied. Paste it into the Instagram chat and hit send.';
      open();
    }).catch(() => {
      status.textContent = 'Copy this message and paste it into our Instagram chat: ' + msg;
      open();
    });
  });

  // Words are wrapped for the masked headline reveal
  document.querySelectorAll('.split').forEach(el => {
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map(w => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  });

  const onAnchor = a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const t = id.length > 1 && document.querySelector(id);
    if (overlay.classList.contains('open')) setMenu(false);
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { offset: -90 });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  // ---- Hero video: seamless crossfade loop, pauses off-screen, respects reduced motion and data saver ----
  function initHeroVideo() {
    const stage = document.getElementById('heroStage');
    const vids = [...stage.querySelectorAll('.hv')];
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData || vids.length < 2) { stage.classList.add('no-video'); return; }

    const FADE = 1.1;                 // seconds of overlap between the end of one pass and the start of the next
    let cur = 0, z = 2, swapping = false, inView = true;
    const [first, second] = vids;
    first.removeAttribute('loop');    // the crossfade replaces the native hard-cut loop

    first.addEventListener('playing', () => {
      first.classList.add('on');
      second.preload = 'auto';
      second.src = first.currentSrc || first.querySelector('source').src;   // cached copy, no extra download
      second.load();
    }, { once: true });
    first.play().catch(() => { stage.classList.add('no-video'); });         // autoplay blocked: the poster stays

    const playable = v => v.readyState >= 2;
    function crossfade() {
      const a = vids[cur], b = vids[1 - cur];
      if (swapping || !playable(b)) return;
      swapping = true;
      b.currentTime = 0;
      b.style.zIndex = ++z;
      b.play().then(() => {
        b.classList.add('on');                                              // incoming fades in over the outgoing pass
        setTimeout(() => {
          a.style.transition = 'none'; a.classList.remove('on'); a.pause(); a.currentTime = 0;
          requestAnimationFrame(() => { a.style.transition = ''; });
          cur = 1 - cur; swapping = false;
        }, FADE * 1000 + 80);
      }).catch(() => { swapping = false; });
    }
    function tick() {
      requestAnimationFrame(tick);
      if (!inView || swapping) return;
      const a = vids[cur];
      if (a.duration && !a.paused && a.duration - a.currentTime <= FADE) crossfade();
    }
    requestAnimationFrame(tick);
    // Safety net: if a pass ever reaches its end before the crossfade fires, restart it rather than freezing
    vids.forEach(v => v.addEventListener('ended', () => { if (!swapping && vids[cur] === v) { v.currentTime = 0; v.play().catch(() => {}); } }));

    // Save battery and decoding work when the hero is not on screen or the tab is hidden
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (!inView) vids.forEach(v => v.pause());
      else vids[cur].play().catch(() => {});
    }, { threshold: 0.05 }).observe(stage);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) vids.forEach(v => v.pause());
      else if (inView) vids[cur].play().catch(() => {});
    });
  }
  initHeroVideo();

  const showAll = () => {
    document.getElementById('loader')?.remove();
    document.body.classList.remove('lock');
    document.querySelectorAll('.reveal-fade').forEach(e => e.style.opacity = 1);
    document.querySelectorAll('.split .w>span').forEach(e => e.style.transform = 'none');
    document.querySelectorAll('[data-count]').forEach(e => e.textContent = e.dataset.count);
    document.querySelectorAll('a[href^="#"]').forEach(onAnchor);
  };
  if (!window.gsap || !window.ScrollTrigger || reduce) { showAll(); return; }

  document.body.classList.add('lock');
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  document.querySelectorAll('a[href^="#"]').forEach(onAnchor);

  // Heavy blur-fade-up: content settles into place as the reader arrives
  const settle = (targets, trigger, extra = {}) => gsap.fromTo(targets,
    { opacity: 0, y: 56, filter: 'blur(10px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', clearProps: 'filter', scrollTrigger: { trigger, start: 'top 90%' }, ...extra });

  // Intro: brand word, curtain up, then hero in order of importance
  gsap.set('.hero .reveal-fade', { y: 28 });
  gsap.timeline({ onComplete: () => { document.getElementById('loader').remove(); document.body.classList.remove('lock'); lenis && lenis.start(); } })
    .from('.loader-word span', { yPercent: 100, opacity: 0, stagger: .12, duration: .7, ease: 'power3.out' })
    .to('#loaderBar', { width: '100%', duration: .8, ease: 'power1.inOut' }, 0)
    .to('.loader', { yPercent: -100, duration: .9, ease: 'power4.inOut', delay: .15 })
    .from(nav, { y: -80, opacity: 0, duration: .9, ease: 'power3.out' }, '-=.35')
    .to('.hero h1 .w>span', { y: 0, stagger: .08, duration: .9, ease: 'power4.out' }, '-=.5')
    .to('.hero .reveal-fade', { opacity: 1, y: 0, stagger: .12, duration: .8, ease: 'power3.out' }, '-=.5')
    .from('#heroMedia', { opacity: 0, filter: 'blur(14px)', duration: 1.4, ease: 'power2.out', clearProps: 'filter' }, '-=1.3');

  // Hero depth: the video layer drifts slower than the page
  if (document.getElementById('heroStage')) {
    gsap.to('.hero-videos', { yPercent: 4, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  gsap.utils.toArray('.split').forEach(h => {
    if (h.closest('.hero')) return;
    gsap.to(h.querySelectorAll('.w>span'), { y: 0, stagger: .07, duration: .9, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 90%' } });
  });
  gsap.utils.toArray('.eyebrow').forEach(e => settle(e, e, { y: 20, filter: 'blur(4px)', duration: .8 }));
  gsap.utils.toArray('.reveal-fade').forEach(e => { if (!e.closest('.hero')) settle(e, e); });

  // Menu: tiles settle in a quick cascade, desserts panel follows
  gsap.fromTo('#dishes .dish', { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: .06, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '#dishes', start: 'top 85%' } });
  settle('.desserts-bezel', '.desserts-bezel');

  // Gallery photos: each frame wipes open, the image settles from a zoom, drifts inside its frame on scroll, and swells on hover
  gsap.utils.toArray('.shot').forEach((shot, i) => {
    const frame = shot.querySelector('.media'), img = shot.querySelector('img'), cap = shot.querySelector('figcaption');
    gsap.timeline({ scrollTrigger: { trigger: shot, start: 'top 86%' }, delay: i * 0.12 })
      .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' })
      .fromTo(img, { scale: 1.45 }, { scale: 1.12, duration: 1.8, ease: 'power3.out' }, 0)
      .fromTo(cap, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, 0.8);
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true } });
    if (canHover) {
      shot.addEventListener('mouseenter', () => gsap.to(img, { scale: 1.2, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }));
      shot.addEventListener('mouseleave', () => gsap.to(img, { scale: 1.12, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }));
    }
  });

  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => el.textContent = Math.round(o.v) });
  });
  gsap.from('.promises li', { x: 36, opacity: 0, stagger: .14, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.promises', start: 'top 85%' } });

  // How it works: the line fills as the reader moves down the steps
  const stepsEl = document.getElementById('steps');
  ScrollTrigger.create({ trigger: stepsEl, start: 'top 65%', end: 'bottom 60%', onUpdate: t => stepsEl.style.setProperty('--p', t.progress) });
  gsap.from('.step', { x: 36, opacity: 0, stagger: .18, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: stepsEl, start: 'top 80%' } });

  // Magnetic buttons
  if (canHover) {
    document.querySelectorAll('.magnetic').forEach(b => {
      const x = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), y = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * .2); y((e.clientY - r.top - r.height / 2) * .28);
      });
      b.addEventListener('mouseleave', () => { x(0); y(0); });
    });
  }
})();
