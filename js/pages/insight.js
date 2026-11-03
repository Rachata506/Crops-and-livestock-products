// KEY INSIGHT page behaviour: the crop buttons switch the three growth bars (1961 = 1x).
// The numbers below are fixed history (1961 -> 2024) computed from data/data.csv, so nothing is fetched here.
//   production x = P2024 / P1961      area x = A2024 / A1961      yield x = (P2024 / A2024) / (P1961 / A1961)
//   (P = sum of tonnes, A = sum of hectares over the countries in the file)
import { whenVisible } from '../fx.js';

const STATS = {
    all: { label: 'All crops', p: 3.90, a: 1.54, y: 2.54 },
    wheat: { label: 'Wheat', p: 3.59, a: 1.07, y: 3.34 },
    rice: { label: 'Rice', p: 3.80, a: 1.49, y: 2.54 },
    maize: { label: 'Maize', p: 5.94, a: 1.99, y: 2.99 },
};
const SCALE = 6.5;                       // a bar is value / SCALE wide; keep equal to the 1x marker in insight.css (100% / 6.5)

const page = document.getElementById('insight');
const root = document.getElementById('insight-root');
if (page && root) {
    const seg = root.querySelector('#ki-seg'), cap = root.querySelector('#ki-cap');

    function show(key) {
        const s = STATS[key];
        for (const k of ['p', 'y', 'a']) {
            const row = root.querySelector(`[data-bar="${k}"]`);
            row.querySelector('.ki-fill').style.setProperty('--w', (100 * s[k] / SCALE).toFixed(1) + '%');
            row.querySelector('.ki-val').textContent = '×' + s[k].toFixed(1);
        }
        const land = Math.round((s.a - 1) * 100);
        cap.textContent = `${s.label}: output grew ×${s.p.toFixed(1)} on ${s.a < 1.2 ? 'only ' : ''}${land}% more harvested land, while yield per hectare grew ×${s.y.toFixed(1)}.`;
        seg.querySelectorAll('button').forEach(b => {
            const on = b.dataset.k === key;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on);
        });
    }

    seg.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) show(b.dataset.k); });

    // grow the bars from 0 the first time the page is seen
    root.querySelectorAll('.ki-fill').forEach(f => f.style.setProperty('--w', '0%'));
    whenVisible(page, () => show('all'));
}
