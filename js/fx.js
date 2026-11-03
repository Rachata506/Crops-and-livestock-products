// SHARED EFFECTS used by the info pages (cover, motivation, objective, insight).
//   whenVisible(element, fn)  -> runs fn once, the first time the element scrolls into view
//   countUp(element)          -> animates the number in data-count from 0 (honours reduced-motion)
// Optional attributes on the counted element: data-decimals="1", data-prefix="$", data-suffix="%"

export function whenVisible(element, fn, threshold = 0.35) {
    if (!element) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold });
    io.observe(element);
}

export function countUp(element, duration = 1400) {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;
    const decimals = Number(element.dataset.decimals || 0);
    const prefix = element.dataset.prefix || '', suffix = element.dataset.suffix || '';
    const show = v => { element.textContent = prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(target); return; }
    const start = performance.now();
    const step = now => {
        const t = Math.min(1, (now - start) / duration);
        show(target * (1 - Math.pow(1 - t, 3)));          // ease-out
        if (t < 1) requestAnimationFrame(step); else show(target);
    };
    requestAnimationFrame(step);
}

// stagger(page, root): items with class .stg inside root fade in one after another (CSS: .anim .stg / .anim.go .stg),
// the first time the page scrolls into view. Without JS, or with reduced motion, everything is simply visible.
export function stagger(page, root, selector = '.stg') {
    if (!page || !root) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.querySelectorAll(selector).forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i); });
    root.classList.add('anim');
    whenVisible(page, () => root.classList.add('go'), 0.2);
}