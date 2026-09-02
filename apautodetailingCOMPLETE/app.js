/* ============================================================
   AP AUTO DETAILING — app.js
   Real-footage hero · gallery · free-quote request form · PWA
   ============================================================ */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- year, nav ---------- */
$('#year').textContent = new Date().getFullYear();
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 30), { passive: true });

/* ---------- nav scroll-spy: highlight the section you're in ---------- */
(function scrollSpy() {
  const links = $$('#navLinks a[href^="#"]');
  const map = new Map();
  links.forEach(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) map.set(sec, a);
  });
  if (!map.size) return;
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.remove('active'));
      map.get(e.target).classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_link, sec) => spy.observe(sec));
})();
$('#navToggle').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
$$('#navLinks a').forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- videos: hero autoplay safety + work video plays in view ---------- */
(function videos() {
  const hero = $('.hero-video');
  if (hero && !reduceMotion) hero.play().catch(() => {});
  const work = $('#workVideo');
  if (!work || reduceMotion) return;
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) work.play().catch(() => {}); else work.pause();
  }), { threshold: 0.35 }).observe(work);
})();

/* ============================================================
   GALLERY
   ============================================================ */
/* To add a photo: save it as images/gallery-<n>.webp and add a line here.
   Order is display order. The caption is the alt text and the lightbox label,
   so describe the actual vehicle — it is what screen readers and Google read. */
const GALLERY = [
  ['gallery-1.webp',  'Ford F-150 — mirror gloss after hand wash and wax'],
  ['gallery-2.webp',  'Ford F-150 interior detailed at sunset'],
  ['gallery-3.webp',  'White Audi S5 — exterior detail and wax'],
  ['gallery-4.webp',  'Honda Civic — black paint corrected to a mirror finish'],
  ['gallery-5.webp',  'Audi S5 cockpit after a full interior detail'],
  ['gallery-6.webp',  'Jeep Wrangler Moab — exterior detail and tire dressing'],
  ['gallery-7.webp',  'Tesla Model 3 interior after a deep clean'],
  ['gallery-8.webp',  'Chevrolet Corvette C8 detailed on location'],
  ['gallery-9.webp',  'GMC Sierra Denali interior deep clean'],
  ['gallery-10.webp', 'White Audi S5 gloss finish in the driveway'],
  ['gallery-11.webp', 'Honda Civic — exterior hand wash and wax'],
  ['gallery-12.webp', 'Chevrolet Corvette C8 — paint correction gloss'],
  ['gallery-13.webp', 'Honda Civic interior deep clean'],
];

(function gallery() {
  const grid = $('#galleryGrid');
  if (!grid) return;
  GALLERY.forEach(([file, alt]) => {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `images/${file}`;
    img.alt = alt;
    img.onerror = () => fig.remove();   // a missing file drops out silently
    fig.appendChild(img);
    fig.addEventListener('click', () => openLightbox(img.src, img.alt));
    grid.appendChild(fig);
  });
})();
function openLightbox(src, alt) {
  const lb = $('#lightbox'); $('#lbImg').src = src; $('#lbImg').alt = alt; lb.hidden = false;
}
$('#lightbox').addEventListener('click', () => $('#lightbox').hidden = true);

/* ============================================================
   FREE QUOTE REQUEST FORM  →  emails Parker via /api/send-sms
   ============================================================ */
(function quoteForm() {
  const form = $('#quoteForm');
  if (!form) return;
  const status = $('#qStatus');
  const submitBtn = $('#qSubmit');

  // Add-ons: keep a running total visible so the quote isn't a surprise
  const addonBoxes = $$('#qAddons input[type="checkbox"]');
  const addonTotalEl = $('#qAddonTotal');
  const selectedAddons = () => addonBoxes.filter(b => b.checked);
  const addonSum = () => selectedAddons().reduce((n, b) => n + Number(b.dataset.price || 0), 0);
  const refreshAddonTotal = () => {
    const sum = addonSum();
    addonTotalEl.hidden = sum === 0;
    addonTotalEl.querySelector('strong').textContent = `+$${sum}`;
  };
  addonBoxes.forEach(b => b.addEventListener('change', refreshAddonTotal));
  refreshAddonTotal();

  // Pre-select service when a pricing "Book This" button is clicked
  $$('[data-service]').forEach(btn => btn.addEventListener('click', () => {
    const sel = $('#qService');
    const want = btn.dataset.service.replace(/\s*\(Quote\)/i, '');
    const opt = [...sel.options].find(o => o.value.toLowerCase().startsWith(want.toLowerCase().split(' ')[0]));
    if (opt) sel.value = opt.value;
    $('#qName').focus();
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#qName').value.trim();
    const phone = $('#qPhone').value.trim();
    if (!name || !phone) {
      status.className = 'qf-status err';
      status.textContent = 'Please add your name and phone number so Parker can reach you.';
      (!name ? $('#qName') : $('#qPhone')).focus();
      return;
    }

    const chosen = selectedAddons();
    const payload = {
      name, phone,
      vehicle: $('#qVehicle').value.trim() || 'Not specified',
      service: $('#qService').value,
      location: $('#qLocation').value.trim() || 'Not specified',
      hookups: $('#qHookups').checked ? 'Yes — water available on-site' : 'Customer unsure / not confirmed',
      date: $('#qNotes').value.trim() || '—',   // notes carried in the "date" field the email template reads
      time: '',
      addons: chosen.map(b => `${b.dataset.addon} (+$${b.dataset.price})`).join(', ') || 'None',
      addonsTotal: addonSum()
    };

    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    status.className = 'qf-status';
    status.textContent = '';

    let ok = false;
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      ok = res.ok;
    } catch (_) { ok = false; }

    if (ok) {
      form.reset();
      refreshAddonTotal();   // reset() clears the boxes; keep the total in step
      status.className = 'qf-status ok';
      status.innerHTML = '✅ Got it! Parker will reach out shortly. For the fastest response, call or text <a href="tel:3364027336">336-402-7336</a>.';
    } else {
      // Fallback: hand off to the phone's SMS app with the details prefilled
      const body = encodeURIComponent(
        `New quote request:\n${payload.name} — ${payload.phone}\n${payload.service} · ${payload.vehicle}\n${payload.location}`
      );
      status.className = 'qf-status err';
      status.innerHTML = `Couldn't send automatically. Tap to text it to Parker: <a href="sms:3364027336?&body=${body}">Text 336-402-7336</a> or call <a href="tel:3364027336">336-402-7336</a>.`;
    }
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  });
})();

/* ============================================================
   PWA
   ============================================================ */
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
