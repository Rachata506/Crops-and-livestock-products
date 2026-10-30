import { loadData, CSV_URL } from './shared.js';
import * as p1 from './pages/page1.js';
import * as p2 from './pages/page2.js';
import * as p3 from './pages/page3.js';
import * as p4 from './pages/page4.js';
import * as p5 from './pages/page5.js';
import * as p6 from './pages/page6.js';   // page6.js is a plain script: it exposes window.mountPage6, not init()
import * as p7 from './pages/page7.js';

const data = await loadData();
if (data.isDemo) document.getElementById('demo-banner').hidden = false;

// Build every page; one broken page never blocks the others.
[p1, p2, p3, p4, p5, p6, p7].forEach((p, i) => {
    const root = document.getElementById('p' + (i + 1) + '-root');
    try {
        if (typeof p.init === 'function') p.init(data, root);
        else if (i === 5 && window.mountPage6) window.mountPage6({ root, dataUrl: './' + CSV_URL });
    } catch (e) { console.error('Page ' + (i + 1) + ' failed', e); }
});

const pages = [...document.querySelectorAll('.page')];

// Dot navigation (right edge): one dot per section, click to jump
const dotNav = document.getElementById('dots');
pages.forEach((s, i) => dotNav.insertAdjacentHTML('beforeend',
    `<a href="#${s.id}" aria-label="Slide ${i + 1}" title="Slide ${i + 1}"></a>`));
const links = [...dotNav.querySelectorAll('a')];

// Small arrow under each section (no page names)
pages.forEach((s, i) => {
    if (pages[i + 1]) s.insertAdjacentHTML('beforeend', `<a class="next" href="#${pages[i + 1].id}" aria-label="Next slide">↓</a>`);
});

// Presentation motion: activate slide when it scrolls into view
const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            links.forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id));
        } else {
            entry.target.classList.remove('in');
        }
    });
}, { threshold: 0.05 });

pages.forEach(s => {
    s.classList.add('reveal');
    slideObserver.observe(s);
});

// Presentation keyboard navigation (ArrowDown, ArrowUp, ArrowRight, ArrowLeft, Space, PageDown, PageUp)
addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    const currentIdx = pages.findIndex(p => {
        const r = p.getBoundingClientRect();
        return r.top >= -r.height / 2 && r.top < r.height / 2;
    });
    if (currentIdx === -1) return;

    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key) && (!e.shiftKey || e.key !== ' ')) {
        if (currentIdx < pages.length - 1) {
            e.preventDefault();
            pages[currentIdx + 1].scrollIntoView({ behavior: 'smooth' });
        }
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey)) {
        if (currentIdx > 0) {
            e.preventDefault();
            pages[currentIdx - 1].scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// Reading-progress bar
const bar = document.getElementById('progress');
const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? 100 * scrollY / max : 0) + '%';
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();