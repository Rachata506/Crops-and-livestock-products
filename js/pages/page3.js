// PAGE 3: Trends Over Time (owner: ___)
// Interactions: measure + country selectors, click legend to hide/show a crop,
// drag on the small context chart to zoom, hover for values by year.
import { cropColor, MEASURES, fmt, fmtYear, tooltip } from '../shared.js';

export function init(data, root) {
    const crops = Array.from(new Set(data.map(d => d.crop))).sort();
    const countries = ['World total', ...Array.from(new Set(data.map(d => d.country))).sort()];
    const state = { measure: 'production', country: 'World total', hidden: new Set(), domain: null };

    root.innerHTML = `
    <div class="card">
      <div class="controls">
        <label>Measure <select id="p3-measure">${Object.entries(MEASURES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
        <label>Area <select id="p3-country">${countries.map(c => `<option>${c}</option>`).join('')}</select></label>
        <button id="p3-all">Show all crops</button>
        <button id="p3-reset">Reset zoom</button>
      </div>
      <div class="legend" id="p3-legend"></div>
      <svg id="p3-main" viewBox="0 0 960 360"></svg>
      <svg id="p3-ctx" viewBox="0 0 960 80"></svg>
      <p style="font-size:13px;color:var(--muted);margin:6px 0 0">Tip: drag on the small chart to zoom into a period. Click a crop to hide it.</p>
    </div>`;

    const W = 960, m = { t: 10, r: 20, b: 26, l: 64 }, iw = W - m.l - m.r;
    const H = 360, ih = H - m.t - m.b, ch = 50;
    const years = d3.extent(data, d => d.year);
    const xFull = d3.scaleLinear(years, [0, iw]);

    // main chart scaffolding
    const g = d3.select('#p3-main').append('g').attr('transform', `translate(${m.l},${m.t})`);
    g.append('defs').append('clipPath').attr('id', 'p3-clip').append('rect').attr('width', iw).attr('height', ih);
    const gx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`);
    const gy = g.append('g').attr('class', 'axis');
    const yLabel = g.append('text').attr('x', -ih / 2).attr('y', -48).attr('transform', 'rotate(-90)').attr('text-anchor', 'middle').attr('fill', 'var(--muted)').attr('font-size', 12);
    const lineG = g.append('g').attr('clip-path', 'url(#p3-clip)');
    const cross = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', 'var(--ink)').attr('stroke-dasharray', '3 3').attr('opacity', 0);
    const overlay = g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'none').attr('pointer-events', 'all');

    // context chart + brush
    const c = d3.select('#p3-ctx').append('g').attr('transform', `translate(${m.l},5)`);
    const cLines = c.append('g');
    c.append('g').attr('class', 'axis').attr('transform', `translate(0,${ch})`).call(d3.axisBottom(xFull).ticks(10).tickFormat(fmtYear));
    const brush = d3.brushX().extent([[0, 0], [iw, ch]]).on('brush end', e => {
        state.domain = e.selection ? e.selection.map(xFull.invert) : null;
        drawMain();
    });
    const brushG = c.append('g').call(brush);

    let series = [];
    const x = () => d3.scaleLinear(state.domain || years, [0, iw]);

    function compute() {
        const rows = state.country === 'World total' ? data : data.filter(d => d.country === state.country);
        const roll = d3.rollup(rows, v => {
            const a = d3.sum(v, d => d.area), p = d3.sum(v, d => d.production);
            return state.measure === 'area' ? a : state.measure === 'production' ? p : (a ? p / a : 0); // yield = production / area (weighted)
        }, d => d.crop, d => d.year);
        series = crops.map(crop => ({ crop, values: Array.from(roll.get(crop) || [], ([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year) }));
    }

    const visible = () => series.filter(s => !state.hidden.has(s.crop));

    function drawLegend() {
        d3.select('#p3-legend').selectAll('button').data(crops).join('button')
            .attr('class', d => state.hidden.has(d) ? 'off' : '')
            .html(d => `<i style="background:${cropColor(d)}"></i>${d}`)
            .on('click', (e, d) => { state.hidden.has(d) ? state.hidden.delete(d) : state.hidden.add(d); drawLegend(); drawMain(); drawCtx(); });
    }

    function drawCtx() {
        const vis = visible(), ymax = d3.max(vis, s => d3.max(s.values, d => d.value)) || 1;
        const y = d3.scaleLinear([0, ymax], [ch, 0]);
        const line = d3.line().x(d => xFull(d.year)).y(d => y(d.value));
        cLines.selectAll('path').data(vis, s => s.crop).join('path')
            .attr('fill', 'none').attr('stroke', s => cropColor(s.crop)).attr('stroke-width', 1).attr('d', s => line(s.values));
    }

    function drawMain() {
        const xs = x(), vis = visible(), [x0, x1] = xs.domain();
        const ymax = d3.max(vis, s => d3.max(s.values.filter(d => d.year >= x0 && d.year <= x1), d => d.value)) || 1;
        const y = d3.scaleLinear([0, ymax * 1.05], [ih, 0]).nice();
        gx.call(d3.axisBottom(xs).ticks(10).tickFormat(fmtYear));
        gy.call(d3.axisLeft(y).ticks(6).tickFormat(fmt));
        yLabel.text(`${MEASURES[state.measure].label} (${MEASURES[state.measure].unit})`);
        const line = d3.line().x(d => xs(d.year)).y(d => y(d.value));
        lineG.selectAll('path').data(vis, s => s.crop).join('path')
            .attr('fill', 'none').attr('stroke', s => cropColor(s.crop)).attr('stroke-width', 2.2).attr('d', s => line(s.values));

        overlay.on('mousemove', e => {
            const [mx] = d3.pointer(e), yr = Math.round(xs.invert(mx));
            const rows = vis.map(s => ({ crop: s.crop, v: s.values.find(d => d.year === yr)?.value })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
            cross.attr('x1', xs(yr)).attr('x2', xs(yr)).attr('opacity', 1);
            tooltip.show(`<b>${yr}</b><br>` + rows.map(r => `<span style="color:${cropColor(r.crop)}">●</span> ${r.crop}: ${fmt(r.v)}`).join('<br>'), e);
        }).on('mouseleave', () => { cross.attr('opacity', 0); tooltip.hide(); });

        // dynamic takeaway: growth of the fastest-growing visible crop in the selected period
        const growth = vis.map(s => {
            const v = s.values.filter(d => d.year >= x0 && d.year <= x1);
            return { crop: s.crop, f: v.length > 1 && v[0].value ? v[v.length - 1].value / v[0].value : 0, a: v[0]?.year, b: v[v.length - 1]?.year };
        }).sort((a, b) => b.f - a.f)[0];
        const el = document.getElementById('p3-takeaway');
        if (growth && growth.f) el.textContent = `Takeaway: ${state.country}, ${growth.a}-${growth.b}: ${growth.crop} grew the most in ${MEASURES[state.measure].label.toLowerCase()} (x${growth.f.toFixed(1)}).`;
    }

    function refresh() { compute(); drawLegend(); drawMain(); drawCtx(); }

    d3.select('#p3-measure').on('change', e => { state.measure = e.target.value; refresh(); });
    d3.select('#p3-country').on('change', e => { state.country = e.target.value; refresh(); });
    d3.select('#p3-all').on('click', () => { state.hidden.clear(); drawLegend(); drawMain(); drawCtx(); });
    d3.select('#p3-reset').on('click', () => brushG.call(brush.move, null));

    refresh();
}