import * as d3 from 'd3';
import { feature } from 'topojson-client';

const SOURCE_URL = new URL('../../data/data.csv', import.meta.url).href;
const MAP_URL = new URL('../../data_page2/data/food/world.json', import.meta.url).href;
const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const compact = value => d3.format('.3~s')(value).replace('G', 'B');
const shortName = name => ({
  'United States of America': 'United States',
  'Democratic Republic of the Congo': 'DR Congo',
  'Russian Federation': 'Russia',
  'United Republic of Tanzania': 'Tanzania',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Bolivia (Plurinational State of)': 'Bolivia',
})[name] || name;

// Deliberately load the real global CSV, rather than the shared demo-data fallback.
export function prepareProduction(rows) {
  const crops = new Map();
  const countries = new Map();
  let missing = 0;
  for (const row of rows) {
    const year = Number(row.year);
    const raw = row.production;
    if (!row.country || !row.crop || !String(row.code ?? '').trim() || !Number.isInteger(year)) {
      throw new Error('Invalid country, code, crop or year in data/data.csv.');
    }
    if (raw == null || String(raw).trim() === '') { missing++; continue; }
    const production = Number(raw);
    if (!Number.isFinite(production) || production < 0) throw new Error('Invalid production value in data/data.csv.');
    const code = String(row.code).padStart(3, '0');
    countries.set(code, { code, name: row.country, region: row.region });
    if (!crops.has(row.crop)) crops.set(row.crop, new Map());
    const byYear = crops.get(row.crop);
    if (!byYear.has(year)) byYear.set(year, new Map());
    if (byYear.get(year).has(code)) throw new Error(`Duplicate production: ${row.country}, ${row.crop}, ${year}.`);
    byYear.get(year).set(code, { code, name: row.country, year, production });
  }
  if (!crops.size) throw new Error('No valid production observations in data/data.csv.');
  return { crops, countries, missing, records: rows.length - missing };
}

export function rankProduction(byYear) {
  const years = [...byYear.keys()].sort(d3.ascending);
  const ranked = new Map();
  const histories = new Map();
  let maximum = 0;
  for (const year of years) {
    const rows = [...byYear.get(year).values()].sort((a, b) => b.production - a.production || a.name.localeCompare(b.name));
    rows.forEach((row, i) => {
      const observation = { ...row, rank: i + 1 };
      rows[i] = observation;
      if (!histories.has(row.code)) histories.set(row.code, new Map());
      histories.get(row.code).set(year, observation);
      maximum = Math.max(maximum, row.production);
    });
    ranked.set(year, rows);
  }
  return { years, ranked, histories, maximum };
}

export async function init(_sharedData, root) {
  if (!root) return;
  root.__page4?.destroy();
  const abort = new AbortController();
  let disposed = false, timer = null, resizeFrame = null, current = null;
  let prepared, geography = [], selectedCountry = null, pinned = false;
  let state = { crop: 'Rice', year: null, top: 10 };
  const hidden = new Set(), cache = new Map(), colorMap = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  root.innerHTML = `
    <div class="p4-dashboard">
      <div class="pl">
        <p class="p4-intro">Compare the leading producers of one crop, then explore their production history and location. Rankings use production quantity, not exports or yield.</p>
        <div class="p4-loading" role="status">Loading global crop production from data/data.csv…</div>
        <div class="p4-content" hidden>
        <div class="p4-controls">
          <label class="p4-crop-field">Crop / Product<select data-p4="crop" aria-label="Crop or product"></select></label>
          <label>Ranking<select data-p4="top" aria-label="Number of top producers"><option value="5">Top 5</option><option value="10" selected>Top 10</option><option value="15">Top 15</option></select></label>
        </div>
        <div class="p4-time">
          <button class="p4-play" type="button" data-p4="play" aria-pressed="false">▶ Play</button>
          <label>Year <output class="p4-year" data-p4="year"></output><input type="range" data-p4="slider" aria-label="Production year" step="1"><span class="p4-time-ends"><span data-p4="first-year"></span><span data-p4="last-year"></span></span></label>
          <span class="p4-status" data-p4="status">Paused</span>
        </div>
        <p class="p4-takeaway" data-p4="takeaway" aria-live="polite"></p>
        </div>
      </div>
      <div class="pr p4-content" hidden>
        <div class="p4-subtitle" data-p4="bar-title"></div>
        <div class="p4-subtitle" data-p4="coverage"></div>
        <div class="p4-bar-chart" data-p4="bars"></div>
      </div>
      <div class="pw p4-content" hidden>
        <details>
          <summary>Exact values and changes in rank</summary>
          <div class="p4-table-wrap"><table><caption class="p4-note" data-p4="table-title"></caption><thead><tr><th scope="col">Rank</th><th scope="col">Country / area</th><th scope="col" class="p4-number">Production (tonnes)</th><th scope="col" class="p4-number">Rank vs. previous year</th></tr></thead><tbody data-p4="table"></tbody></table></div>
        </details>
        <div class="p4-support">
          <section aria-label="Historical production of the selected top producers">
            <h3>How did these producers get here?</h3>
            <p class="p4-note" data-p4="history-label"></p>
            <div class="p4-history-chart" data-p4="history"></div>
            <div class="p4-legend" data-p4="legend" aria-label="Countries in the production history"></div>
            <p class="p4-note" data-p4="history-detail"></p>
          </section>
          <section aria-label="Location of the selected top producers">
            <h3 data-p4="map-title"></h3>
            <p class="p4-note">Only this year’s Top countries are coloured. Country colours match the bars and lines.</p>
            <div class="p4-map" data-p4="map"></div>
            <p class="p4-note"><span class="p4-muted-key"></span>Outside selected Top / no data · Modern boundaries</p>
            <p class="p4-note" data-p4="map-detail"></p>
            <p class="p4-note" data-p4="map-coverage"></p>
          </section>
        </div>
        <p class="p4-note p4-source" data-p4="source"></p>
      </div>
    </div>`;
  const q = name => root.querySelector(`[data-p4="${name}"]`);
  const contents = [...root.querySelectorAll('.p4-content')];
  const loading = root.querySelector('.p4-loading');
  function stop() {
    clearInterval(timer); timer = null;
    q('play').textContent = '▶ Play'; q('play').setAttribute('aria-pressed', 'false'); q('status').textContent = 'Paused';
    d3.select(root).selectAll('*').interrupt();
  }
  const svgFor = (name, width, height, title) => {
    const svg = d3.select(q(name)).append('svg').attr('class', 'p4-chart').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', title);
    svg.append('title').text(title); return svg;
  };
  const countryColor = code => colorMap.get(code) || 'var(--green)';
  function selectCrop() {
    stop(); hidden.clear(); pinned = false; selectedCountry = null;
    state.crop = q('crop').value;
    if (!cache.has(state.crop)) {
      if (cache.size >= 6) cache.delete(cache.keys().next().value);
      cache.set(state.crop, rankProduction(prepared.crops.get(state.crop)));
    }
    current = cache.get(state.crop);
    state.year = Math.max(current.years[0], Math.min(state.year ?? current.years.at(-1), current.years.at(-1)));
    q('slider').min = current.years[0]; q('slider').max = current.years.at(-1);
    q('first-year').textContent = current.years[0]; q('last-year').textContent = current.years.at(-1);
    draw(false);
  }
  function draw(animate = false) {
    if (disposed || !current) return;
    const all = current.ranked.get(state.year) || [], top = all.slice(0, state.top);
    q('year').textContent = state.year; q('slider').value = state.year;
    q('bar-title').textContent = `${state.crop} · Top ${state.top} · ${state.year}`;
    q('coverage').textContent = `${all.length} reporting countries/areas · Ranked by production in tonnes${top.length < state.top ? ` · Only ${top.length} observations available` : ''}`;
    q('table-title').textContent = `${state.crop} production ranking · ${state.year}`;
    q('map-title').textContent = `Where are the Top ${state.top}? · ${state.year}`;
    drawBars(top, animate); drawTable(top); drawHistory(top); drawMap(top, all);
    q('takeaway').textContent = top.length ? `${top[0].name} leads with ${format.format(top[0].production)} tonnes${top[1] ? ` — ${format.format(top[0].production - top[1].production)} tonnes ahead of ${top[1].name}` : ''}.` : `No reported production for ${state.crop} in ${state.year}.`;
    // Avoid announcing every playback frame to screen readers.
    q('takeaway').setAttribute('aria-live', timer ? 'off' : 'polite');
  }

  function drawBars(rows, animate) {
    const host = q('bars'), w = Math.max(260, host.clientWidth), left = w < 520 ? 108 : 205, right = w < 520 ? 60 : 90;
    const rowHeight = w < 520 ? 38 : 36, top = 30, bottom = top + rows.length * rowHeight, h = bottom + 52;
    const x = d3.scaleLinear([0, d3.max(rows, d => d.production) || 1], [left, w - right]);
    let svg = d3.select(host).select('svg');
    if (svg.empty()) {
      svg = svgFor('bars', w, h, 'Top producers by production in tonnes');
      svg.append('g').attr('class', 'p4-bar-axis'); svg.append('g').attr('class', 'p4-bar-marks');
      svg.append('text').attr('class', 'p4-bar-x-label'); svg.append('text').attr('class', 'p4-bar-y-label');
    }
    svg.attr('viewBox', `0 0 ${w} ${h}`).attr('aria-label', q('bar-title').textContent);
    svg.select('title').text(q('bar-title').textContent);
    svg.select('.p4-bar-axis').attr('transform', `translate(0,${bottom})`).call(d3.axisBottom(x).ticks(w < 520 ? 3 : 6).tickFormat(compact));
    svg.select('.p4-bar-x-label').attr('x', (left + w - right) / 2).attr('y', h - 6).attr('text-anchor', 'middle').text('Production (tonnes)');
    svg.select('.p4-bar-y-label').attr('x', 0).attr('y', 15).text('Country / area');
    const groups = svg.select('.p4-bar-marks').selectAll('g').data(rows, d => d.code);
    groups.exit().remove();
    const enter = groups.enter().append('g');
    enter.append('rect').attr('x', left).attr('width', 0);
    enter.append('text').attr('class', 'p4-bar-name').attr('text-anchor', 'end');
    enter.append('text').attr('class', 'p4-bar-value'); enter.append('title');
    const merged = enter.merge(groups);
    const duration = animate && !reducedMotion.matches ? 500 : 0;
    // Only rank and quantity move; the country identity and colour stay fixed.
    merged.interrupt().transition().duration(duration).attr('transform', (_, i) => `translate(0,${top + i * rowHeight})`);
    merged.select('rect').interrupt().attr('x', left).attr('y', 3).attr('height', 23).attr('fill', d => countryColor(d.code))
      .transition().duration(duration).attr('width', d => Math.max(0, x(d.production) - left));
    merged.select('.p4-bar-name').attr('x', left - 8).attr('y', 19).text(d => {
      const name = shortName(d.name); return w < 520 && name.length > 13 ? name.slice(0, 11) + '…' : name;
    });
    merged.select('.p4-bar-value').attr('y', 19).text(d => compact(d.production)).interrupt().transition().duration(duration).attr('x', d => x(d.production) + 6);
    merged.select('title').text(d => `${d.name} · #${d.rank} · ${format.format(d.production)} tonnes · ${state.year}`);
  }

  function drawTable(rows) {
    q('table').replaceChildren();
    for (const d of rows) {
      const prior = current.histories.get(d.code).get(state.year - 1);
      const delta = prior ? prior.rank - d.rank : null;
      const change = delta == null ? 'No prior observation' : delta === 0 ? 'No change' : `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)}`;
      const tr = document.createElement('tr');
      [d.rank, d.name, format.format(d.production), change].forEach((value, i) => {
        const cell = document.createElement('td'); cell.textContent = value;
        if (i > 1) cell.className = 'p4-number';
        if (i === 1) { const swatch = document.createElement('span'); swatch.className = 'p4-swatch'; swatch.style.background = countryColor(d.code); cell.prepend(swatch); }
        tr.append(cell);
      }); q('table').append(tr);
    }
  }

  function drawHistory(cohort) {
    const host = q('history'); host.replaceChildren();
    q('legend').replaceChildren();
    q('history-label').textContent = `Countries in the Top ${state.top} of ${state.year} · ${current.years[0]}–${state.year} · Hover or tap for observed production and past rank. Click a legend name to hide/show its line.`;
    if (!cohort.length) { q('history-detail').textContent = 'No countries available for this year.'; return; }
    const first = current.years[0], last = Math.max(first + 1, state.year);
    const series = cohort.map(d => ({ ...d, points: d3.range(first, state.year + 1).map(year => current.histories.get(d.code).get(year) || { year, production: null }) }));
    const active = series.filter(d => !hidden.has(d.code));
    const w = Math.max(260, host.clientWidth), h = 260, m = { l: 64, r: 18, t: 30, b: 44 };
    const maximum = d3.max(series, s => d3.max(s.points, p => p.production)) || 1;
    const x = d3.scaleLinear([first, last], [m.l + 3, w - m.r - 3]);
    const y = d3.scaleLinear([0, maximum * 1.05], [h - m.b - 3, m.t + 3]);
    const svg = svgFor('history', w, h, `${state.crop}: production history of the Top ${state.top} countries in ${state.year}`);
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'none').attr('stroke', 'var(--line)');
    svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues([...new Set(x.ticks(w < 450 ? 3 : 5).filter(Number.isInteger))]).tickFormat(d3.format('d')));
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(compact));
    svg.append('text').attr('x', 0).attr('y', 16).text('Production (tonnes)');
    svg.append('text').attr('x', (m.l + w - m.r) / 2).attr('y', h - 5).attr('text-anchor', 'middle').text('Year');
    const line = d3.line().defined(d => d.production != null).x(d => x(d.year)).y(d => y(d.production));
    svg.append('g').selectAll('path').data(active).join('path').attr('class', 'p4-history-line').attr('d', d => line(d.points)).attr('fill', 'none').attr('stroke', d => countryColor(d.code)).attr('stroke-width', 2);
    svg.append('g').selectAll('circle').data(active).join('circle').attr('cx', x(state.year)).attr('cy', d => y(d.production)).attr('r', 3).attr('fill', d => countryColor(d.code));
    const hover = svg.append('g').attr('pointer-events', 'none').style('display', 'none');
    const guide = hover.append('line').attr('y1', m.t).attr('y2', h - m.b).attr('stroke', 'var(--ink)').attr('stroke-opacity', .35);
    const tip = d3.select(host).append('div').attr('class', 'p4-tooltip').attr('role', 'tooltip').attr('hidden', true);
    function show(event) {
      const year = Math.max(first, Math.min(state.year, Math.round(x.invert(d3.pointer(event, svg.node())[0]))));
      const rows = active.map(d => ({ ...d, observation: current.histories.get(d.code).get(year) })).filter(d => d.observation).sort((a, b) => a.observation.rank - b.observation.rank);
      hover.style('display', null); guide.attr('x1', x(year)).attr('x2', x(year));
      hover.selectAll('circle').data(rows, d => d.code).join('circle').attr('cx', x(year)).attr('cy', d => y(d.observation.production)).attr('r', 3).attr('fill', d => countryColor(d.code));
      tip.html('').attr('hidden', null); tip.append('div').attr('class', 'p4-tip-year').text(`${year} · Observed production / rank`);
      if (!rows.length) tip.append('div').text('No reported observations.');
      rows.forEach(d => { const row = tip.append('div').attr('class', 'p4-tip-row'); row.append('span').attr('class', 'p4-swatch').style('background', countryColor(d.code)); row.append('span').text(shortName(d.name)); row.append('span').attr('class', 'p4-tip-value').text(`${compact(d.observation.production)} t · #${d.observation.rank}`); });
      const width = tip.node().offsetWidth; tip.style('left', `${Math.max(0, Math.min(w - width, x(year) + 8))}px`).style('top', '30px');
    }
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent')
      .on('pointermove', event => { if (!pinned) show(event); }).on('pointerleave', () => { if (!pinned) { hover.style('display', 'none'); tip.attr('hidden', true); } })
      .on('click', event => { pinned = !pinned; show(event); });
    series.forEach(d => {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-pressed', String(!hidden.has(d.code)));
      const swatch = document.createElement('span'); swatch.className = 'p4-swatch'; swatch.style.background = countryColor(d.code);
      button.append(swatch, document.createTextNode(shortName(d.name)));
      button.addEventListener('click', () => { hidden.has(d.code) ? hidden.delete(d.code) : hidden.add(d.code); pinned = false; drawHistory(cohort); });
      q('legend').append(button);
    });
    const leader = series[0], observations = leader.points.filter(p => p.production != null);
    q('history-detail').textContent = `${leader.name}: best observed rank #${d3.min(observations, p => p.rank)} · #1 in ${observations.filter(p => p.rank === 1).length} observed years through ${state.year}. Gaps indicate missing observations.`;
  }

  function drawMap(cohort, all) {
    const host = q('map'); host.replaceChildren();
    if (!geography.length) { host.textContent = 'Map unavailable. Rankings and history remain available.'; return; }
    const w = Math.max(260, host.clientWidth), h = Math.max(190, Math.round(w * .51));
    const lookup = new Map(all.map(d => [d.code, d]));
    const selected = new Set(cohort.map(d => d.code));
    const mapped = new Set(geography.map(d => String(d.id).padStart(3, '0')));
    const projection = d3.geoNaturalEarth1().fitExtent([[4, 4], [w - 4, h - 4]], { type: 'Sphere' });
    const path = d3.geoPath(projection);
    const svg = svgFor('map', w, h, `${state.crop}, ${state.year}: only the selected Top ${state.top} producers use their country colours`);
    svg.append('path').datum({ type: 'Sphere' }).attr('d', path).attr('fill', 'var(--surface)').attr('stroke', 'var(--line)');
    const countries = svg.append('g').selectAll('path').data(geography).join('path').attr('class', 'p4-country').attr('d', path)
      .attr('data-code', d => String(d.id).padStart(3, '0')).attr('data-in-top', d => selected.has(String(d.id).padStart(3, '0')))
      .attr('fill', d => selected.has(String(d.id).padStart(3, '0')) ? countryColor(String(d.id).padStart(3, '0')) : 'var(--line)');
    countries.append('title').text(d => {
      const row = lookup.get(String(d.id).padStart(3, '0'));
      return row ? `${row.name} · ${state.year} · ${format.format(row.production)} tonnes · #${row.rank}${selected.has(row.code) ? '' : ' · Outside selected Top'}` : `${d.properties.name} · No observation in ${state.year}`;
    });
    const detail = code => {
      const d = lookup.get(code);
      q('map-detail').textContent = d ? `${d.name} · ${state.year} · ${format.format(d.production)} tonnes · #${d.rank}${selected.has(code) ? '' : ' · Outside selected Top'}` : `${state.year} · Hover or tap a country for its production and rank.`;
    };
    countries.on('pointerenter', (_, d) => detail(String(d.id).padStart(3, '0')))
      .on('pointerleave', () => detail(selectedCountry)).on('click', (_, d) => { selectedCountry = String(d.id).padStart(3, '0'); detail(selectedCountry); });
    detail(selectedCountry);
    const unmapped = cohort.filter(d => !mapped.has(d.code));
    q('map-coverage').textContent = `${cohort.length - unmapped.length} of ${cohort.length} selected producers mapped.${unmapped.length ? ` Not shown on modern boundaries: ${unmapped.map(d => d.name).join('; ')}.` : ''} Historical countries/areas retain their original identities.`;
  }

  function onVisibility() { if (document.hidden && timer) { stop(); draw(false); } }
  // The presentation's global Space/arrow shortcuts must not steal control input.
  function onControlKey(event) {
    if (event.target.closest('button, summary, select, input')) event.stopPropagation();
  }
  root.addEventListener('keydown', onControlKey);
  const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting && timer) { stop(); draw(false); } }, { threshold: 0 });
  const resize = new ResizeObserver(() => {
    if (!current || disposed) return;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => draw(false));
  });
  const api = {
    destroy() {
      disposed = true; stop(); abort.abort(); resize.disconnect(); observer.disconnect(); cancelAnimationFrame(resizeFrame);
      document.removeEventListener('visibilitychange', onVisibility); root.removeEventListener('keydown', onControlKey); root.replaceChildren();
      if (root.__page4 === api) delete root.__page4;
    }
  };
  root.__page4 = api;
  try {
    const mapPromise = d3.json(MAP_URL, { signal: abort.signal }).then(world => {
      geography = feature(world, world.objects.countries).features.filter(d => String(d.id) !== '010');
    }).catch(error => { if (error.name !== 'AbortError') console.warn('Page 4 map unavailable:', error); });
    const rows = await d3.csv(SOURCE_URL, { signal: abort.signal });
    if (disposed) return api;
    if (!['country', 'code', 'crop', 'year', 'production'].every(key => rows.columns.includes(key))) throw new Error('Expected country, code, crop, year and production columns in data/data.csv.');
    prepared = prepareProduction(rows);
    await mapPromise;
    if (disposed) return api;
    // Deterministic colours derived from the shared green; no changes to style.css.
    const base = d3.hcl(getComputedStyle(root).getPropertyValue('--green').trim() || '#1f6f4a');
    [...prepared.countries.keys()].sort().forEach((code, i) => colorMap.set(code, d3.hcl(base.h + i * 137.508, 42 + (i % 3) * 5, 46 + (i % 2) * 10).formatHex()));
    const cropNames = [...prepared.crops.keys()].sort(d3.ascending);
    cropNames.forEach(name => { const option = document.createElement('option'); option.value = option.textContent = name; q('crop').append(option); });
    q('crop').value = cropNames.includes(state.crop) ? state.crop : cropNames[0];
    const years = [...prepared.crops.values()].flatMap(byYear => [...byYear.keys()]);
    q('source').textContent = `Source: FAOSTAT-derived data/data.csv · ${format.format(prepared.records)} production observations · ${prepared.countries.size} countries/areas · ${cropNames.length} crops/products · ${d3.min(years)}–${d3.max(years)}. Missing values are not treated as zero. Tied quantities are ordered alphabetically. Production quantity does not establish export leadership, farming efficiency or weather causation.`;
    loading.hidden = true; contents.forEach(c => { c.hidden = false; });
    selectCrop();
    q('crop').addEventListener('change', selectCrop);
    q('top').addEventListener('change', () => { stop(); state.top = Number(q('top').value); hidden.clear(); pinned = false; draw(false); });
    q('slider').addEventListener('input', () => { stop(); state.year = Number(q('slider').value); hidden.clear(); pinned = false; draw(false); });
    q('play').addEventListener('click', () => {
      if (timer) { stop(); draw(false); return; }
      if (state.year >= current.years.at(-1)) state.year = current.years[0];
      q('play').textContent = 'Ⅱ Pause'; q('play').setAttribute('aria-pressed', 'true'); q('status').textContent = 'Playing';
      timer = setInterval(() => {
        if (state.year >= current.years.at(-1)) { stop(); draw(false); return; }
        state.year++; hidden.clear(); pinned = false; draw(true);
      }, 1100);
      draw(false);
    });
    document.addEventListener('visibilitychange', onVisibility); observer.observe(root); resize.observe(q('bars'));
  } catch (error) {
    if (!disposed && error.name !== 'AbortError') {
      loading.className = 'p4-error'; loading.setAttribute('role', 'alert');
      loading.textContent = `Page 4 could not load the real production data. ${error.message} No simulated data is displayed.`;
    }
  }
  return api;
}
