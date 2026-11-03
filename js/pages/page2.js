/**import React, { useEffect, useRef } from 'react';*/
//import * as d3 from 'd3';
import { feature } from 'topojson-client';

/** React/Vite page: copy data_page2/data/food to your project's public directory. */
export default function Page2({ dataUrl = `./data_page2/data/food` }) {
  const container = useRef(null);
  useEffect(() => mountFoodMap(container.current, dataUrl), [dataUrl]);
  const el = document.createElement('section');
  el.className = 'food-map-page';
  if (container) container.current = el;
  return el;
}

export function init(_data, root) {
  return mountFoodMap(root, `./data_page2/data/food`);
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
            /* Page 2. Layout comes from the shared split grid in style.css (.pl = left, .pr = right). */
      #p2 .pl { font-size: 17px; }
      #p2 .fm-controls { display: flex; flex-direction: column; align-items: stretch; gap: 18px; margin: 8px 0 18px; }
      #p2 label { display: grid; gap: 8px; font-size: 15px; font-weight: 600; letter-spacing: .06em; color: var(--ink2); }
      #p2 select { width: 100%; max-width: 380px; padding: 10px 14px; font-size: 17px; letter-spacing: 0; }
      #p2 select:disabled { opacity: .55; cursor: wait; }
      #p2 .fm-hint { font-size: 16px; color: var(--faint); }
      #p2 .fm-status { font-size: 18px; font-weight: 600; min-height: 22px; color: var(--ink); margin: 0; padding-left: 14px; border-left: 3px solid var(--gold); }

      #p2 .fm-map { width: 100%; height: clamp(300px, 56vh, 620px); display: block; touch-action: none; cursor: grab; }
      #p2 .fm-map:active { cursor: grabbing; }

      #p2 .fm-time { width: 100%; border-top: 1px solid var(--line); padding-top: 14px; margin-top: 6px; }
      #p2 .fm-time-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
      #p2 .fm-year-readout { display: flex; align-items: baseline; gap: 12px; font-size: 16px; color: var(--ink2); letter-spacing: .06em; }
      #p2 .fm-year { font: 700 32px/1.1 var(--font); color: var(--ink); letter-spacing: 0; }
      #p2 .fm-play { width: 48px; height: 38px; padding: 0; border: 1px solid var(--ink); border-radius: 6px; background: var(--ink); color: var(--bg); font-size: 15px; }
      #p2 .fm-play:hover:not(:disabled) { filter: brightness(1.25); }
      #p2 .fm-play:disabled { opacity: .45; cursor: wait; }
      #p2 input { width: 100%; }
      #p2 .fm-slider-track { width: 100%; margin: 0; }
      #p2 .fm-slider { display: block; width: 100%; height: 16px; margin: 0; padding: 0; }
      #p2 .fm-country:focus { outline: none; }

      /* Page 2 only: globe on the LEFT, title + controls on the RIGHT (desktop). Phones keep the single-column order. */
      @media (min-width: 1001px) {
        #p2.page:has(> header) { grid-template-columns: 8fr minmax(340px, 4fr); }
        #p2.page:has(> header) > header { grid-column: 2; justify-self: start; max-width: 420px; }
        #p2 .pl { grid-column: 2; justify-self: start; max-width: 420px; }
        #p2 .pr { grid-column: 1; }
      }

      .fm-tooltip { position: fixed; z-index: 9999; pointer-events: none; background: var(--ink); color: var(--bg); border-radius: 6px; padding: 10px 12px; font: 13px/1.6 var(--font); max-width: 280px; white-space: pre-line; box-shadow: 0 4px 14px rgba(0,0,0,.25); }color: var(--bg); border-radius: 6px; padding: 10px 12px; font: 13px/1.6 var(--font); max-width: 280px; white-space: pre-line; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
    </style>
    <div class="pl"><div class="fm-controls">
      <label>AGRICULTURAL ITEM<select class="fm-item" aria-label="Agricultural item" disabled></select></label>
      <label>MEASURE<select class="fm-measure" aria-label="Measure" disabled></select></label>
      <label>VIEW<select class="fm-view" aria-label="Map view"><option value="globe">Globe</option><option value="flat">World map</option></select></label>
      <span class="fm-hint">Drag to rotate · Hover or focus a country for values</span>
    </div>
    <p class="fm-status" role="status" aria-live="polite">Loading data…</p></div>
    <div class="pr"><svg class="fm-map" viewBox="0 0 1000 560" role="group" aria-label="World agricultural production map"></svg>
    <div class="fm-time"><div class="fm-time-head"><div class="fm-year-readout"><span>YEAR </span><output class="fm-year"></output></div><button class="fm-play" aria-label="Play years" disabled>▶</button></div><div class="fm-slider-track"><input class="fm-slider" type="range" aria-label="Year" disabled></div></div></div>
  `);
  const el = name => root.select(`.fm-${name}`);
  const svg = el('map');
  el('slider').style('width', '100%').style('height', '16px');
  const tip = d3.select(document.body).append('div').attr('class', 'fm-tooltip').attr('hidden', true);
  const sphere = svg.append('path').datum({ type: 'Sphere' }).attr('fill', '#f1efe8').attr('stroke', '#e6e3dc');
  const grid = svg.append('path').datum(d3.geoGraticule10()).attr('fill', 'none').attr('stroke', '#e6e3dc').attr('stroke-width', .5);
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
    layer.selectAll('path').attr('fill', f => values.has(key(f)) ? color(values.get(key(f))[3]) : '#e0ddd3')
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
    layer.selectAll('path').attr('fill', '#e0ddd3'); tip.attr('hidden', true);
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
      .attr('stroke', '#fbfaf7').attr('stroke-width', .6).attr('tabindex', 0).attr('role', 'img');
    const setHighlight = (event, active) => d3.select(event.currentTarget)
      .attr('stroke', active ? '#1c1c1a' : '#fbfaf7')
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