// Tiny helpers for the four new pages (cover, objective, motivation, insight).
// Standalone: needs no d3, no shared.js and no main.js, so it cannot clash with the existing pages.
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Run fn once, the first time `el` is on screen. Pass the <section class="page">, not a "display: contents" root. */
export function whenVisible(el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold: 0.2 });
    io.observe(el);
}

/** Count a number up from 0. Reads data-count (+ optional data-dec, data-prefix, data-suffix) from the element. */
export function countUp(el, ms = 1100) {
    const to = +el.dataset.count, dec = +(el.dataset.dec || 0);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const show = v => { el.textContent = pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
    if (reduceMotion) return show(to);
    const t0 = performance.now();
    const tick = now => {
        const k = Math.min(1, (now - t0) / ms);
        show(to * (1 - Math.pow(1 - k, 3)));          // ease-out
        if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/** Fade the children marked .stg in one after another, the first time the page is seen. */
export function stagger(page, root) {
    if (!page || !root || reduceMotion) return;
    root.querySelectorAll('.stg').forEach((el, i) => el.style.setProperty('--i', i));
    root.classList.add('anim');
    whenVisible(page, () => requestAnimationFrame(() => root.classList.add('go')));
}
