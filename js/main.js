import { loadData } from './shared.js';

import * as p1 from './pages/page1.js';
import * as p2 from './pages/page2.js';
import * as p3 from './pages/page3.js';
import * as p4 from './pages/page4.js';
import * as p5 from './pages/page5.js';
import * as p6 from './pages/page6.js';
import * as p7 from './pages/page7.js';

// Load shared data.
const data = await loadData();

// Show the banner when using demo data.
const demoBanner = document.getElementById('demo-banner');

if (demoBanner) {
    demoBanner.hidden = !data.isDemo;
}

// Initialize each available page.
const pages = [p1, p2, p3, p4, p5, p6, p7];

pages.forEach((page, index) => {
    const root = document.getElementById(`p${index + 1}-root`);

    if (!root) return;

    if (typeof page.init !== 'function') {
        root.textContent = 'This page has not been added yet.';
        return;
    }

    // Keep a failed page from stopping the remaining pages.
    try {
        Promise.resolve(page.init(data, root)).catch(error => {
            console.error(`Page ${index + 1} failed to initialize:`, error);
            root.textContent = 'Unable to load this page.';
        });
    } catch (error) {
        console.error(`Page ${index + 1} failed to initialize:`, error);
        root.textContent = 'Unable to load this page.';
    }
});

// Highlight the page currently in view.
const links = [...document.querySelectorAll('nav a')];

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            links.forEach(link => {
                link.classList.toggle(
                    'active',
                    link.hash === `#${entry.target.id}`
                );
            });
        }
    });
}, {
    rootMargin: '-40% 0px -55% 0px'
});

document.querySelectorAll('.page').forEach(section => {
    observer.observe(section);
});
