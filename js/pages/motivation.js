// MOTIVATION page behaviour: cards fade in one after another, and the record count counts up.
import { stagger, whenVisible, countUp } from '../fx.js';

const page = document.getElementById('motivation');
stagger(page, document.getElementById('motivation-root'));
if (page) whenVisible(page, () => page.querySelectorAll('[data-count]').forEach(el => countUp(el, 1400)));
