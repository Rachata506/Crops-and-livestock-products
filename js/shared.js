// SHARED: colors, formatters, data loader, tooltip. Import from here, don't redefine.
export const REGION_COLORS = { Africa: '#d9a441', Americas: '#2f6b3a', Asia: '#b5543a', Europe: '#4a7c8c', Oceania: '#7b4b6e' };
const CROP_PALETTE = ['#d9a441', '#8aa84a', '#e07b39', '#5b6b2f', '#7a4e2d', '#3f8f87', '#b5543a', '#7b4b6e', '#2f5d8a', '#a89f6b'];
export const cropColor = d3.scaleOrdinal().range(CROP_PALETTE); // domain set in loadData: same color on every page

export const MEASURES = {
    production: { label: 'Production', unit: 'tonnes' },
    area: { label: 'Area harvested', unit: 'ha' },
    yield: { label: 'Yield', unit: 't/ha' }
};
export const fmt = d3.format('.3~s');
export const fmtYear = d3.format('d');

export function placeholder(title, hint) {
    return `<div class="placeholder"><h3>${title}</h3><p>${hint}</p></div>`;
}

export const tooltip = {
    show(html, event) { d3.select('#tooltip').html(html).attr('hidden', null).style('left', (event.clientX + 14) + 'px').style('top', (event.clientY + 14) + 'px'); },
    hide() { d3.select('#tooltip').attr('hidden', true); }
};

// Schema: country, code, region, crop, year, area (ha), yield (t/ha), production (tonnes)
export async function loadData() {
    let data, demo = false;
    try { data = await d3.csv('data/crops_clean.csv', d3.autoType); if (!data.length) throw 0; }
    catch (e) { data = demoData(); demo = true; }
    cropColor.domain(Array.from(new Set(data.map(d => d.crop))).sort());
    data.isDemo = demo;
    return data;
}

function demoData() {
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const regions = { Asia: ['China', 'India', 'Thailand', 'Viet Nam'], Americas: ['United States of America', 'Brazil', 'Argentina'], Europe: ['France', 'Germany', 'Ukraine'], Africa: ['Nigeria', 'Ethiopia', 'Egypt'] };
    const crops = ['Wheat', 'Rice', 'Maize (corn)', 'Soya beans', 'Potatoes', 'Sugar cane', 'Cassava', 'Barley'];
    const rows = [];
    for (const [region, list] of Object.entries(regions)) for (const country of list) for (const crop of crops) {
        const a0 = (50 + rnd() * 500) * 1e3, y0 = 1 + rnd() * 3, aG = -0.3 + rnd() * 1.5, yG = 1 + rnd() * 1.5;
        for (let year = 1961; year <= 2022; year++) {
            const t = year - 1961, area = a0 * Math.pow(1 + aG / 100, t) * (1 + 0.06 * (rnd() - .5)), yld = y0 * Math.pow(1 + yG / 100, t) * (1 + 0.08 * (rnd() - .5));
            rows.push({ country, code: country.slice(0, 3).toUpperCase(), region, crop, year, area, yield: yld, production: area * yld });
        }
    }
    return rows;
}
