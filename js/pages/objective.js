// OBJECTIVE page behaviour: the question cards fade in one after another when the page first comes into view.
import { stagger } from '../fx.js';

stagger(document.getElementById('objective'), document.getElementById('objective-root'));
