import { I18N, RTL_LANGS } from './i18n.js';

const THEME_KEY = 'noor-site-theme';
const LANG_KEY = 'noor-site-lang';
const HTML_KEYS = new Set(['dl.note']);
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = window.matchMedia('(hover: hover)').matches;

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const UR_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const toDigits = (s, lang) =>
  String(s).replace(/[0-9]/g, (d) => (lang === 'ur' ? UR_DIGITS : AR_DIGITS)[+d]);

function flashClass(name, ms) {
  const html = document.documentElement;
  html.classList.remove(name);
  void html.offsetWidth;
  html.classList.add(name);
  clearTimeout(flashClass.timers?.[name]);
  (flashClass.timers ||= {})[name] = setTimeout(() => html.classList.remove(name), ms);
}

/* ——— language ——— */
function applyLang(lang, animate = false) {
  const dict = I18N[lang] || I18N.ar;
  const rtl = RTL_LANGS.includes(lang);
  const html = document.documentElement;

  if (animate && !REDUCED) flashClass('lang-anim', 560);

  html.lang = lang;
  html.dir = rtl ? 'rtl' : 'ltr';
  if (dict['doc.title']) document.title = dict['doc.title'];

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = dict[key];
    if (value == null) return;
    if (HTML_KEYS.has(key)) el.innerHTML = value;
    else el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.getAttribute('data-i18n-attr')
      .split(';')
      .forEach((pair) => {
        const [attr, key] = pair.split(',').map((s) => s.trim());
        if (attr && key && dict[key] != null) el.setAttribute(attr, dict[key]);
      });
  });

  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const value = dict[el.getAttribute('data-i18n-alt')];
    if (value != null) el.setAttribute('alt', value);
  });

  document.querySelectorAll('[data-i18n-num]').forEach((el) => {
    const n = el.getAttribute('data-i18n-num');
    el.textContent = rtl ? toDigits(n, lang) : n;
  });

  const select = document.getElementById('langSelect');
  if (select && select.value !== lang) select.value = lang;
}

/* ——— theme ——— */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

const storedTheme = localStorage.getItem(THEME_KEY);
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
applyTheme(storedTheme || (prefersDark.matches ? 'dark' : 'light'));

prefersDark.addEventListener('change', (e) => {
  if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
});

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const next =
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  if (!REDUCED) flashClass('theme-anim', 520);
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ——— language select ——— */
const storedLang = localStorage.getItem(LANG_KEY);
const startLang = storedLang && I18N[storedLang] ? storedLang : 'ar';
applyLang(startLang);

document.getElementById('langSelect')?.addEventListener('change', (e) => {
  const lang = e.target.value;
  if (!I18N[lang]) return;
  localStorage.setItem(LANG_KEY, lang);
  applyLang(lang, true);
});

/* ——— scroll progress + nav state ——— */
const progressBar = document.getElementById('progressBar');
const nav = document.getElementById('siteNav');
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
    nav?.classList.toggle('scrolled', window.scrollY > 8);
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ——— scrollspy ——— */
const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

if (sections.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((a) =>
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id),
        );
      }
    },
    { rootMargin: '-40% 0px -50% 0px' },
  );
  sections.forEach((s) => spy.observe(s));
}

/* ——— mobile menu ——— */
const navBurger = document.getElementById('navBurger');
const navMenu = document.getElementById('navLinks');
if (navBurger && nav && navMenu) {
  const setMenu = (open) => {
    nav.classList.toggle('nav-open', open);
    navBurger.setAttribute('aria-expanded', String(open));
  };
  navBurger.addEventListener('click', () => {
    setMenu(!nav.classList.contains('nav-open'));
  });
  navMenu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) setMenu(false);
  });
}

/* ——— 3D device: hover tilt + scroll-driven rotation ——— */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

if (!REDUCED) {
  const stages = [...document.querySelectorAll('[data-tilt]')];

  if (HOVER) {
    stages.forEach((stage) => {
      const phone = stage.querySelector('.phone');
      if (!phone) return;
      stage.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        phone.style.setProperty('--ry', (px * 16).toFixed(2) + 'deg');
        phone.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', () => {
        phone.style.setProperty('--ry', '0deg');
        phone.style.setProperty('--rx', '0deg');
      });
    });
  }

  let tiltRaf = 0;
  const updateTilt = () => {
    tiltRaf = 0;
    const vh = window.innerHeight;
    for (const stage of stages) {
      const phone = stage.querySelector('.phone');
      if (!phone) continue;
      const r = stage.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) continue;
      const c = (r.top + r.height / 2) / vh;
      const t = clamp(c * 2 - 1, -1, 1);
      const srx = t >= 0 ? t * 16 : t * 10;
      const sx = 1 - Math.abs(t) * 0.05;
      phone.style.setProperty('--srx', srx.toFixed(2) + 'deg');
      phone.style.setProperty('--sx', sx.toFixed(3));
    }
  };
  const queueTilt = () => {
    if (!tiltRaf) tiltRaf = requestAnimationFrame(updateTilt);
  };
  window.addEventListener('scroll', queueTilt, { passive: true });
  window.addEventListener('resize', queueTilt);
  updateTilt();
}

/* ——— reveals ——— */
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});
