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
[p1, p2, p3, p4, p5, p6, p7].forEach((page, index) => {
    const root = document.getElementById(`p${index + 1}-root`);

    if (!root) return;

    if (typeof page.init === 'function') {
        page.init(data, root);
    } else {
        root.textContent = 'This page has not been added yet.';
    }
});
