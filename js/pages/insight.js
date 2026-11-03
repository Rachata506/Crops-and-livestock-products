// KEY INSIGHT page: one finding per question page of the project (pages 2–6).
// Each button switches the bars and the caption. All numbers are fixed history (1961 -> 2024)
// computed from data/data.csv, so nothing is fetched here:
//   production = sum of tonnes, area = sum of hectares; growth "×" = value 2024 / value 1961;
//   yield growth = (P2024 / A2024) / (P1961 / A1961).
import { whenVisible } from '../fx.js';

const REGION = { Asia: 'var(--r-asia)', Americas: 'var(--r-americas)', Europe: 'var(--r-europe)', Africa: 'var(--r-africa)', Oceania: 'var(--r-oceania)' };
const COUNTRY = '#0072b2';   // one colour for all four countries (page 6 blue)

const FINDINGS = [
    {
        key: 'where', button: 'Where', page: 2,
        title: 'Growth in crop production by region', note: '1961 → 2024 (grey line = ×1, no change)',
        unit: 'x', max: 6.5,
        bars: [['Africa', 5.76, REGION.Africa], ['Asia', 5.59, REGION.Asia], ['Oceania', 4.52, REGION.Oceania], ['Americas', 4.02, REGION.Americas], ['Europe', 1.37, REGION.Europe]],
        caption: 'Asia now grows half of the world\'s crops (50%, up from 35% in 1961). Africa grew fastest (×5.8), while Europe barely grew (×1.4).'
    },
    {
        key: 'trend', button: 'Trends', page: 3,
        title: 'World crop production', note: 'million tonnes',
        unit: 'mt', max: 10000,
        bars: [['1961', 2510, 'var(--ink)'], ['1990', 5163, 'var(--ink)'], ['2024', 9792, 'var(--ink)']],
        caption: 'World crop production almost quadrupled (×3.9): it doubled by 1990 and nearly doubled again by 2024.'
    },
    {
        key: 'leaders', button: 'Leaders', page: 4,
        title: 'Top producers in 2024', note: 'total crop production, million tonnes',
        unit: 'mt', max: 2000,
        bars: [['China (mainland)', 1857, 'var(--ink)'], ['India', 1288, 'var(--ink)'], ['Brazil', 1144, 'var(--ink)'], ['USA', 729, 'var(--ink)'], ['Indonesia', 425, 'var(--ink)']],
        caption: 'China, India and Brazil now grow 44% of the world\'s crops. In 1961 the USSR led and the USA was third; Brazil has grown ×10 since.'
    },
    {
        key: 'land', button: 'Yield', page: 5,
        title: 'Growth from 1961 to 2024, all crops', note: '(grey line = ×1, no change)',
        unit: 'x', max: 6.5,
        bars: [['Production', 3.90, 'var(--ink)'], ['Yield per hectare', 2.54, 'var(--green)'], ['Harvested area', 1.54, 'var(--gold)']],
        caption: 'Output grew ×3.9 on only 54% more harvested land, so most of the growth came from higher yields (×2.5), not from new farmland.'
    },
    {
        key: 'compare', button: 'Countries', page: 6,
        title: 'Growth in yield per hectare, all crops', note: '1961 → 2024 (grey line = ×1)',
        unit: 'x', max: 6.5,
        bars: [['China (mainland)', 4.85, COUNTRY], ['Thailand', 3.55, COUNTRY], ['India', 3.44, COUNTRY], ['USA', 2.33, COUNTRY]],
        caption: 'Yields rose in all four compared countries, fastest in China (×4.9). Thailand grew its output most (×9.5), but largely by farming 2.7× more land.'
    }
];
const DEFAULT = 'land';   // the finding shown first (matches the page title "growth came from yield, not land")

const fmt = (v, unit) => unit === 'x' ? '×' + (Math.round(v * 10) / 10).toFixed(1) : Math.round(v).toLocaleString('en-US');

const page = document.getElementById('insight');
const root = document.getElementById('insight-root');
if (page && root) {
    const seg = root.querySelector('#ki-seg'), cap = root.querySelector('#ki-cap');
    const card = root.querySelector('.ki-card');

    // buttons: one per finding (replaces whatever buttons are in the HTML)
    seg.innerHTML = FINDINGS.map(f => `<button type="button" data-k="${f.key}" aria-pressed="false">${f.button}</button>`).join('');

    // bar area: replaces the first title + the three fixed rows in the HTML; the region-share block below stays
    const firstTitle = card.querySelector('.ki-title');
    card.querySelectorAll('.ki-row').forEach(r => r.remove());
    const bars = document.createElement('div');
    bars.className = 'ki-bars';
    firstTitle.after(bars);

    function show(key) {
        const f = FINDINGS.find(x => x.key === key);
        firstTitle.innerHTML = `${f.title} <small>${f.note}</small>`;
        bars.innerHTML = f.bars.map(([label, value, color]) => `
            <div class="ki-row">
              <span class="ki-lab">${label}</span>
              <span class="ki-track"><span class="ki-fill" style="background:${color};--w:0%"></span>${f.unit === 'x' ? '<span class="ki-one"></span>' : ''}</span>
              <span class="ki-val">${fmt(value, f.unit)}</span>
            </div>`).join('');
        // let the bars grow from 0 on every switch
        requestAnimationFrame(() => requestAnimationFrame(() => {
            bars.querySelectorAll('.ki-fill').forEach((el, i) => {
                el.style.setProperty('--w', (100 * Math.min(1, f.bars[i][1] / f.max)).toFixed(1) + '%');
            });
        }));
        cap.innerHTML = `${f.caption} <a href="#p${f.page}" style="color:var(--ink);font-weight:600;white-space:nowrap">See page ${f.page} →</a>`;
        seg.querySelectorAll('button').forEach(b => {
            const on = b.dataset.k === key;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on);
        });
    }

    seg.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) show(b.dataset.k); });
    whenVisible(page, () => show(DEFAULT));
}