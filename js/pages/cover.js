// COVER page behaviour: count the three headline numbers up when the page first comes into view.
import { whenVisible, countUp } from '../fx.js';

const page = document.getElementById('cover');
if (page) whenVisible(page, () => page.querySelectorAll('[data-count]').forEach(el => countUp(el)));
