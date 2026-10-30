// PAGE 3: Trends over time. "How has production changed since 1961?"
// Interactions: country selector, Tonnes / Growth toggle, click a crop to hide it, hover for values by year.
import { cropColor, tooltip } from '../shared.js';

const fmtT = v => d3.format('.3~s')(v).replace('G', 'B');     // 1.5B, 295M, 3.8k

export function init(data, root) {
    const crops = [...new Set(data.map(d => d.crop))].sort();
    const areas = ['All countries', ...[...new Set(data.map(d => d.country))].sort()];
    const [y0, y1] = d3.extent(data, d => d.year);
    const years = d3.range(y0, y1 + 1);
    const st = { area: 'All countries', mode: 'tonnes', hidden: new Set() };

    root.innerHTML = `
    <style>
      .p3 { display: grid; grid-template-columns: minmax(250px, 1fr) 2fr; gap: 36px; align-items: center }
      .p3 h2 { margin: 0 0 12px !important }
      .p3 .p3-lead { color: var(--muted); font-size: 17px; margin: 0 0 18px }
      .p3-stats { display: flex; flex-wrap: wrap; gap: 22px; margin: 0 0 18px }
      .p3-stats b { display: block; font-family: var(--serif); font-size: 32px; line-height: 1.05; color: var(--gold) }
      .p3-stats span { font-size: 13px; color: var(--muted) }
      .p3-take { border-left: 3px solid var(--gold); padding-left: 12px; margin: 0; font-size: 15px }
      .p3 .seg { display: inline-flex }
      .p3 .seg button { border-radius: 0 }
      .p3 .seg button:first-child { border-radius: 6px 0 0 6px }
      .p3 .seg button:last-child { border-radius: 0 6px 6px 0; border-left: 0 }
      .p3 .seg button.on { background: var(--green); border-color: var(--green); color: #fff }
      @media (max-width: 860px) { .p3 { grid-template-columns: 1fr; gap: 18px } }
    </style>
    <div class="p3">
      <div>
        <h2>How has production changed since ${y0}?</h2>
        <p class="p3-lead">Total harvest of the crops in this dataset, year by year.</p>
        <div class="p3-stats">
          <div><b id="p3-s0"></b><span>in ${y0}</span></div>
          <div><b id="p3-s1"></b><span>in ${y1}</span></div>
          <div><b id="p3-sx"></b><span>growth</span></div>
        </div>
        <p class="p3-take" id="p3-takeaway"></p>
      </div>
      <div class="card">
        <div class="controls">
          <label>Area <select id="p3-area">${areas.map(a => `<option>${a}</option>`).join('')}</select></label>
          <span class="seg"><button type="button" data-mode="tonnes" class="on">Tonnes</button><button type="button" data-mode="growth">Growth (×${y0})</button></span>
        </div>
        <div class="legend" id="p3-legend"></div>
        <svg id="p3-svg" viewBox="0 0 760 380"></svg>
      </div>
    </div>`;

    const W = 760, H = 380, m = { t: 14, r: 86, b: 28, l: 58 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleLinear([y0, y1], [0, iw]);
    const g = d3.select('#p3-svg').append('g').attr('transform', `translate(${m.l},${m.t})`);
    const gx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
    const gy = g.append('g').attr('class', 'axis');
    const yTitle = g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih / 2).attr('y', -44).attr('text-anchor', 'middle').attr('fill', 'var(--muted)').attr('font-size', 12);
    const layer = g.append('g');
    const cross = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', 'var(--ink)').attr('stroke-dasharray', '3 3').attr('opacity', 0);
    const overlay = g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'none').attr('pointer-events', 'all');

    let byCrop = new Map(), vis = [], growth = [], y = null;

    function compute() {
        const rows = st.area === 'All countries' ? data : data.filter(d => d.country === st.area);
        const r = d3.rollup(rows, v => d3.sum(v, d => d.production), d => d.crop, d => d.year);
        byCrop = new Map(crops.map(c => [c, years.map(yr => ({ year: yr, value: r.get(c)?.get(yr) ?? 0 }))]));
    }

    function summary() {
        const tot = i => d3.sum(crops, c => byCrop.get(c)[i].value), last = years.length - 1;
        const a = tot(0), b = tot(last);
        const gr = crops.filter(c => byCrop.get(c)[0].value > 0 && byCrop.get(c)[last].value > 0)
            .map(c => ({ c, f: byCrop.get(c)[last].value / byCrop.get(c)[0].value })).sort((p, q) => q.f - p.f);
        const big = crops.map(c => ({ c, v: byCrop.get(c)[last].value })).sort((p, q) => q.v - p.v)[0];
        document.getElementById('p3-s0').textContent = fmtT(a) + ' t';
        document.getElementById('p3-s1').textContent = fmtT(b) + ' t';
        document.getElementById('p3-sx').textContent = a ? '×' + (b / a).toFixed(1) : '–';
        const where = st.area === 'All countries' ? 'across these four countries' : 'in ' + st.area;
        document.getElementById('p3-takeaway').textContent = a && b
            ? `Production ${where} grew ×${(b / a).toFixed(1)} between ${y0} and ${y1}. ` +
            (gr.length ? `${gr[0].c} grew the most (×${gr[0].f.toFixed(1)}), ` : '') +
            (big && big.v ? `and ${big.c} makes up ${Math.round(100 * big.v / b)}% of the ${y1} total.` : '')
            : `No production recorded ${where} in ${y0} or ${y1}.`;
    }

    function drawLegend() {
        d3.select('#p3-legend').selectAll('button').data(crops).join('button')
            .attr('type', 'button').attr('class', d => st.hidden.has(d) ? 'off' : '')
            .html(d => `<i style="background:${cropColor(d)}"></i>${d}`)
            .on('click', (e, d) => { st.hidden.has(d) ? st.hidden.delete(d) : st.hidden.add(d); drawLegend(); draw(); });
    }

    function draw() {
        vis = crops.filter(c => !st.hidden.has(c));
        layer.selectAll('*').remove();
        if (st.mode === 'tonnes') {
            const rows = years.map((yr, i) => Object.fromEntries([['year', yr], ...vis.map(c => [c, byCrop.get(c)[i].value])]));
            const stack = d3.stack().keys(vis)(rows);
            const ymax = d3.max(stack.at(-1) || [], d => d[1]) || 1;
            y = d3.scaleLinear([0, ymax * 1.05], [ih, 0]).nice();
            const area = d3.area().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1]));
            layer.selectAll('path').data(stack).join('path').attr('fill', s => cropColor(s.key)).attr('fill-opacity', .88).attr('stroke', '#fff').attr('stroke-width', .6).attr('d', area);
            gy.call(d3.axisLeft(y).ticks(5).tickFormat(fmtT));
            yTitle.text('Production (tonnes)');
            const last = stack.at(-1)?.at(-1);
            if (last) layer.append('text').attr('x', iw + 6).attr('y', y(last[1]) + 4).attr('font-size', 12).attr('font-weight', 700).attr('fill', 'var(--ink)').text(fmtT(last[1]) + ' t');
        } else {
            growth = vis.filter(c => byCrop.get(c)[0].value > 0).map(c => ({ crop: c, v: byCrop.get(c).map(d => ({ year: d.year, r: d.value / byCrop.get(c)[0].value })) }));
            const ymax = d3.max(growth, s => d3.max(s.v, d => d.r)) || 1;
            y = d3.scaleLinear([0, ymax * 1.08], [ih, 0]).nice();
            const line = d3.line().x(d => x(d.year)).y(d => y(d.r));
            layer.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(1)).attr('y2', y(1)).attr('stroke', 'var(--muted)').attr('stroke-dasharray', '4 4');
            layer.append('text').attr('x', 4).attr('y', y(1) - 5).attr('font-size', 11).attr('fill', 'var(--muted)').text(`${y0} level`);
            layer.selectAll('path.ln').data(growth).join('path').attr('class', 'ln').attr('fill', 'none').attr('stroke', s => cropColor(s.crop)).attr('stroke-width', 2.4).attr('d', s => line(s.v));
            // end labels, nudged apart so they don't overlap
            let prev = Infinity;
            growth.map(s => ({ s, ly: y(s.v.at(-1).r) })).sort((p, q) => p.ly - q.ly).reverse().forEach(o => {
                o.ly = Math.min(o.ly, prev - 14); prev = o.ly;
                layer.append('text').attr('x', iw + 6).attr('y', o.ly + 4).attr('font-size', 12).attr('font-weight', 700).attr('fill', cropColor(o.s.crop)).text('×' + o.s.v.at(-1).r.toFixed(1));
            });
            gy.call(d3.axisLeft(y).ticks(6).tickFormat(d => '×' + d));
            yTitle.text(`Production relative to ${y0}`);
        }
        const skipped = st.mode === 'growth' ? vis.filter(c => byCrop.get(c)[0].value === 0) : [];
        if (skipped.length) layer.append('text').attr('x', iw).attr('y', ih - 6).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--muted)').text(`Not shown (no ${y0} output): ${skipped.join(', ')}`);

        overlay.raise().on('mousemove', e => {
            const [mx] = d3.pointer(e), yr = Math.max(y0, Math.min(y1, Math.round(x.invert(mx)))), i = yr - y0;
            cross.attr('x1', x(yr)).attr('x2', x(yr)).attr('opacity', 1).raise();
            overlay.raise();
            const list = vis.map(c => ({ c, v: byCrop.get(c)[i].value, b: byCrop.get(c)[0].value })).sort((p, q) => q.v - p.v);
            let html = `<b>${yr}</b><br>`;
            if (st.mode === 'tonnes') html += list.map(o => `<span style="color:${cropColor(o.c)}">●</span> ${o.c}: ${fmtT(o.v)} t`).join('<br>') + `<br><b>Total: ${fmtT(d3.sum(list, o => o.v))} t</b>`;
            else html += list.filter(o => o.b > 0).map(o => `<span style="color:${cropColor(o.c)}">●</span> ${o.c}: ×${(o.v / o.b).toFixed(1)}`).join('<br>');
            tooltip.show(html, e);
        }).on('mouseleave', () => { cross.attr('opacity', 0); tooltip.hide(); });
    }

    function refresh() { compute(); summary(); drawLegend(); draw(); }

    d3.select('#p3-area').on('change', e => { st.area = e.target.value; refresh(); });
    d3.selectAll('.p3 .seg button').on('click', function () {
        st.mode = this.dataset.mode;
        d3.selectAll('.p3 .seg button').classed('on', function () { return this === this.parentNode.querySelector(`[data-mode="${st.mode}"]`); });
        draw();
    });
    refresh();
}