import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';

/** React/Vite page: copy data_page2/data/food to your project's public directory. */
export default function Page2({ dataUrl = `${import.meta.env.BASE_URL}data_page2/data/food` }) {
  const container = useRef(null);
  useEffect(() => mountFoodMap(container.current, dataUrl), [dataUrl]);
  return React.createElement('section', { ref: container, className: 'food-map-page' });
}

export function init(_data, root) {
  return mountFoodMap(root, `${import.meta.env.BASE_URL}data_page2/data/food`);
}

/** Optional vanilla-JS API. Returns a cleanup function. */
export function mountFoodMap(container, dataUrl) {
  const root = d3.select(container);
  const abort = new AbortController();
  let disposed = false, timer = null, generation = 0;
  let meta, countries, rows = [], values = new Map(), rotation = [-100, -15];
  let currentItem, projection, unit = '', maximum = 1;
  const cache = new Map();
  const number = d3.format(',.2~f');
  const base = dataUrl.replace(/\/$/, '');
  root.html(`
    <style>
      .food-map-page{box-sizing:border-box;width:100%;min-height:100svh;background:#f5f5ed;color:#183d36;padding:30px clamp(16px,4vw,64px);font-family:Arial,sans-serif;position:relative}
      .food-map-page *{box-sizing:border-box}.food-map-page .fm-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}
      .food-map-page h2{font:normal clamp(28px,3.2vw,48px) Georgia,serif;margin:0}.food-map-page h2 em{color:#62854e}
      .food-map-page .fm-controls{display:flex;gap:20px;flex-wrap:wrap;padding:15px 0;border-block:1px solid #d6dfd2}.food-map-page label{display:grid;gap:8px;font-size:10px;letter-spacing:1px}
      .food-map-page select{max-width:min(390px,85vw);padding:7px 28px 7px 9px;border:1px solid #cbd7c7;border-radius:5px;background:#fafbf5;color:#183d36;font-size:14px}
      .food-map-page .fm-hint{margin-left:auto;font-size:12px;color:#6e806c;align-self:center}.food-map-page .fm-status{font-size:12px;min-height:18px;color:#65785e;margin:13px 0 0}
      .food-map-page .fm-map{width:100%;height:clamp(320px,57vh,650px);display:block;touch-action:none;cursor:grab}
      .food-map-page .fm-time{width:100%;border-top:1px solid #d6dfd2;padding-top:15px}.food-map-page .fm-time-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:8px}.food-map-page .fm-year-readout{display:flex;align-items:baseline;gap:24px}.food-map-page button{width:40px;height:40px;border:0;border-radius:50%;background:#245541;color:white;cursor:pointer}.food-map-page button:disabled{opacity:.4;cursor:wait}
      .food-map-page input{width:100%;accent-color:#416b42}.food-map-page .fm-slider-track{width:1060px;max-width:100%;margin:0 auto}.food-map-page .fm-slider{display:block;width:100%;height:16px;margin:0;padding:0}.food-map-page .fm-slider::-webkit-slider-runnable-track{width:100%}.food-map-page .fm-slider::-moz-range-track{width:100%}.food-map-page .fm-year{font-size:24px;font-weight:bold}.food-map-page .fm-footer{font-size:10px;color:#718069;margin-top:17px;line-height:1.7}
      .fm-tooltip{position:fixed;z-index:9999;pointer-events:none;background:#173e34;color:white;border-radius:7px;padding:12px 15px;font-size:12px;line-height:1.8;max-width:280px;white-space:pre-line;box-shadow:0 4px 20px #0002}.food-map-page .fm-country:focus{outline:none}
      @media(max-width:650px){.food-map-page .fm-hint{display:none}.food-map-page .fm-head{display:block}.food-map-page .fm-controls{gap:12px}.food-map-page select{font-size:12px}.food-map-page .fm-map{height:400px}}
    </style>
    <div class="fm-head"><div><h2>Where is food <em>produced?</em></h2></div></div>
    <div class="fm-controls">
      <label>AGRICULTURAL ITEM<select class="fm-item" aria-label="Agricultural item" disabled></select></label>
      <label>MEASURE<select class="fm-measure" aria-label="Measure" disabled></select></label>
      <label>VIEW<select class="fm-view" aria-label="Map view"><option value="globe">Globe</option><option value="flat">World map</option></select></label>
      <span class="fm-hint">Drag to rotate · Hover or focus a country for values</span>
    </div>
    <p class="fm-status" role="status" aria-live="polite">Loading data…</p>
    <svg class="fm-map" viewBox="0 0 1000 560" role="group" aria-label="World agricultural production map"></svg>
    <div class="fm-time"><div class="fm-time-head"><div class="fm-year-readout"><span>YEAR </span><output class="fm-year"></output></div><button class="fm-play" aria-label="Play years" disabled>▶</button></div><div class="fm-slider-track"><input class="fm-slider" type="range" aria-label="Year" disabled></div></div>
  `);
  const el = name => root.select(`.fm-${name}`);
  const svg = el('map');
  el('slider').style('width', '1060px').style('height', '16px').style('max-width', '100%');
  const tip = d3.select(document.body).append('div').attr('class', 'fm-tooltip').attr('hidden', true);
  const sphere = svg.append('path').datum({ type: 'Sphere' }).attr('fill', '#e5ece3').attr('stroke', '#c9d6c4');
  const grid = svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke', '#d1ddcc').attr('stroke-width', .5);
  const layer = svg.append('g');
  const fetchJson = async path => {
    const response = await fetch(path, { signal: abort.signal });
    if (!response.ok) throw new Error(`Cannot load ${path} (${response.status}). Check data_page2/data/food.`);
    return response.json();
  };
  const key = f => String(f.id).padStart(3, '0');
  const fail = error => { if (!disposed && error.name !== 'AbortError') el('status').text(error.message); };

  function stop() {
    clearInterval(timer); timer = null;
    el('play').text('▶').attr('aria-label', 'Play years');
  }
  function draw() {
    if (!countries) return;
    projection = el('view').property('value') === 'globe'
      ? d3.geoOrthographic().rotate(rotation).scale(266).translate([500, 280])
      : d3.geoNaturalEarth1().fitExtent([[15, 10], [985, 550]], { type: 'FeatureCollection', features: countries });
    const path = d3.geoPath(projection);
    sphere.attr('d', path); grid.attr('d', path); layer.selectAll('path').attr('d', path);
  }
  function showTooltip(event, country, keyboard = false) {
    const row = values.get(key(country));
    const text = `${meta.areas[key(country)] || country.properties.name}\n${currentItem.name}\n${el('measure').select('option:checked').text()} · ${el('slider').property('value')}\n${row ? number(row[3]) + ' ' + meta.units[row[4]] : 'No data'}`;
    const bounds = event.currentTarget.getBoundingClientRect();
    const mapBounds = svg.node().getBoundingClientRect();
    const gap = 12;
    const anchorX = keyboard ? bounds.right : event.clientX;
    const anchorY = keyboard ? bounds.top : event.clientY;
    tip.text(text).attr('hidden', null);
    const tipBounds = tip.node().getBoundingClientRect();
    let left = anchorX + gap;
    let top = anchorY + gap;
    const mapBottom = Math.min(window.innerHeight - 8, mapBounds.bottom - 8);
    if (left + tipBounds.width > window.innerWidth - 8) left = anchorX - tipBounds.width - gap;
    if (top + tipBounds.height > mapBottom) top = anchorY - tipBounds.height - gap;
    left = Math.max(8, Math.min(left, window.innerWidth - tipBounds.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tipBounds.height - 8));
    tip.style('left', left + 'px').style('top', top + 'px');
  }
  function render() {
    if (disposed || !currentItem) return;
    const [index, unitIndex] = el('measure').property('value').split('|').map(Number);
    const measure = meta.measures[index];
    const year = +el('slider').property('value');
    const series = rows.filter(r => r[1] === index && r[4] === unitIndex);
    const visible = series.filter(r => r[2] === year);
    values = new Map(visible.map(r => [r[0], r]));
    unit = meta.units[unitIndex] || '';
    maximum = d3.max(series, r => r[3]) || 1;
    const color = d3.scaleSequentialSqrt(d3.interpolateYlGn).domain([0, maximum]);
    layer.selectAll('path').attr('fill', f => values.has(key(f)) ? color(values.get(key(f))[3]) : '#d5ddd1')
      .attr('aria-label', f => `${meta.areas[key(f)] || f.properties.name}: ${values.has(key(f)) ? number(values.get(key(f))[3]) + ' ' + unit : 'No data'}`);
    el('year').text(year);
    const count = countries.filter(f => values.has(key(f))).length;
    el('status').text(`${currentItem.name} · ${measure} · ${year} · ${count} mapped countries${visible.length ? '' : ' · No observations this year'}`);
    tip.attr('hidden', true);
  }
  async function loadItem() {
    const request = ++generation; stop();
    values = new Map(); rows = [];
    currentItem = meta.items.find(i => i.id === el('item').property('value'));
    el('status').text(`Loading ${currentItem.name}…`);
    el('slider').property('disabled', true); el('play').property('disabled', true);
    el('measure').property('disabled', true);
    layer.selectAll('path').attr('fill', '#d5ddd1'); tip.attr('hidden', true);
    try {
      let next = cache.get(currentItem.id);
      if (!next) {
        next = await fetchJson(`${base}/items/${currentItem.id}.json`);
        if (disposed || request !== generation) return;
        if (cache.size >= 6) cache.delete(cache.keys().next().value);
        cache.set(currentItem.id, next);
      }
      if (disposed || request !== generation) return;
      rows = next;
      const previous = el('measure').property('value');
      const options = [...new Set(rows.map(r => `${r[1]}|${r[4]}`))].sort((a, b) => {
        const priority = value => meta.measures[+value.split('|')[0]] === 'Production' ? 0 : 1;
        return priority(a) - priority(b) || a.localeCompare(b);
      });
      el('measure').selectAll('option').data(options).join('option').attr('value', d => d)
        .text(d => { const [m, u] = d.split('|').map(Number); return `${meta.measures[m]} (${meta.units[u]})`; });
      el('measure').property('value', options.includes(previous) ? previous : options[0]);
      el('measure').property('disabled', false); el('slider').property('disabled', false); el('play').property('disabled', false);
      render();
    } catch (error) { if (request === generation) fail(error); }
  }

  svg.call(d3.drag().on('start', () => tip.attr('hidden', true)).on('drag', event => {
    if (el('view').property('value') !== 'globe') return;
    rotation[0] += event.dx * .35;
    rotation[1] = Math.max(-85, Math.min(85, rotation[1] - event.dy * .35));
    draw();
  }));
  el('view').on('change', draw);
  el('item').on('change', loadItem);
  el('measure').on('change', () => { stop(); render(); });
  el('slider').on('input', () => { stop(); render(); });
  el('play').on('click', () => {
    if (timer) return stop();
    el('play').text('Ⅱ').attr('aria-label', 'Pause years');
    timer = setInterval(() => {
      const year = +el('slider').property('value');
      el('slider').property('value', year >= meta.years[1] ? meta.years[0] : year + 1);
      render();
    }, 800);
  });
  Promise.all([fetchJson(`${base}/manifest.json`), fetchJson(`${base}/world.json`)]).then(async ([manifest, world]) => {
    if (disposed) return;
    meta = manifest;
    countries = feature(world, world.objects.countries).features.filter(f => key(f) !== '010');
    const paths = layer.selectAll('path').data(countries).join('path').attr('class', 'fm-country')
      .attr('stroke', '#f7f7ee').attr('stroke-width', .6).attr('tabindex', 0).attr('role', 'img');
    const setHighlight = (event, active) => d3.select(event.currentTarget)
      .attr('stroke', active ? '#245541' : '#f7f7ee')
      .attr('stroke-width', active ? 1.8 : .6);
    paths.on('pointerenter', (e, f) => { setHighlight(e, true); showTooltip(e, f); })
      .on('pointermove', (e, f) => showTooltip(e, f))
      .on('pointerleave', e => { setHighlight(e, false); tip.attr('hidden', true); })
      .on('focus', (e, f) => { setHighlight(e, true); showTooltip(e, f, true); })
      .on('blur', e => { setHighlight(e, false); tip.attr('hidden', true); });
    el('item').selectAll('option').data(meta.items).join('option').attr('value', d => d.id).text(d => d.name);
    el('item').property('value', meta.items.find(i => i.name === 'Rice')?.id || meta.items[0].id).property('disabled', false);
    el('slider').attr('min', meta.years[0]).attr('max', meta.years[1]).attr('step', 1).property('value', meta.years[1]);
    el('min-year').text(meta.years[0]); el('max-year').text(meta.years[1]);
    draw(); await loadItem();
  }).catch(fail);

  // React StrictMode, route changes, and remounts must not leave timers or handlers.
  return () => {
    disposed = true; generation++; abort.abort(); stop();
    svg.on('.drag', null); root.selectAll('*').on('change', null).on('input', null).on('click', null);
    tip.remove();
    root.selectAll('*').remove();
  };
}
