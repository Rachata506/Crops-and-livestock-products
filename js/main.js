import { loadData } from './shared.js';
import * as p1 from './pages/page1.js';
import * as p2 from './pages/page2.js';
import * as p3 from './pages/page3.js';
import * as p4 from './pages/page4.js';
import * as p5 from './pages/page5.js';
import * as p6 from './pages/page6.js';
import * as p7 from './pages/page7.js';

const data = await loadData();
if (data.isDemo) document.getElementById('demo-banner').hidden = false;
[p1, p2, p3, p4, p5, p6, p7].forEach((p, i) => p.init(data, document.getElementById('p' + (i + 1) + '-root')));

// highlight current page in nav
const links = [...document.querySelectorAll('nav a')];
const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.hash === '#' + e.target.id));
}), { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('.page').forEach(s => io.observe(s));
