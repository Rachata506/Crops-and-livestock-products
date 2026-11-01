/* Page 6: mountPage6({root, dataUrl}) mounts inside one dedicated container.
   Layout is in template() below; all visual styling is in page6.css. */
(function (global) {
  'use strict';
  const ALLOWED_COUNTRIES = ['China', 'India', 'Thailand', 'United States of America'];
  const SOURCE_MEASURES = {
    area: { title: 'Harvested Area', unit: 'ha', icon: '🌾' },
    yield: { title: 'Yield', unit: 't/ha', icon: '📈' },
    production: { title: 'Production', unit: 'tonnes', icon: '⚖️' },
    production_number: { title: 'Production', unit: 'number', icon: '⚖️' },
    stocks: { title: 'Stocks', unit: 'animals', icon: '🐄' },
    stocks_number: { title: 'Stocks', unit: 'number', icon: '📊' },
    slaughtered: { title: 'Producing Animals / Slaughtered', unit: 'animals', icon: '🐑' },
    carcassWeight: { title: 'Yield / Carcass Weight', unit: 'kg/animal', icon: '⚖️' },
    laying: { title: 'Laying Animals', unit: 'animals', icon: '🥚' },
    milkAnimals: { title: 'Milk Animals', unit: 'animals', icon: '🥛' },
    yield_number: { title: 'Yield', unit: 'number/animal', icon: '📈' }
  };
  function sourceMetric(element, unit) {
    if (element === 'Area harvested' && unit === 'ha') return ['area', 1];
    if (element === 'Yield' && unit === 'kg/ha') return ['yield', 0.001];
    if (element === 'Yield' && unit === 'No/An') return ['yield_number', 1];
    if (element === 'Production' && unit === 't') return ['production', 1];
    if (element === 'Production' && unit === '1000 No') return ['production_number', 1000];
    if (element === 'Stocks' && unit === 'No') return ['stocks_number', 1];
    if (['Stocks', 'Producing Animals/Slaughtered', 'Laying', 'Milk Animals'].includes(element) && ['An', '1000 An'].includes(unit)) {
      const key = { 'Stocks': 'stocks', 'Producing Animals/Slaughtered': 'slaughtered', 'Laying': 'laying', 'Milk Animals': 'milkAnimals' }[element];
      return [key, unit === '1000 An' ? 1000 : 1];
    }
    if (element === 'Yield/Carcass Weight' && ['g/An', 'kg/An'].includes(unit)) return ['carcassWeight', unit === 'g/An' ? 0.001 : 1];
    throw new Error(`Unsupported source measure: ${element} (${unit}).`);
  }
  function normalizeSource(raw) {
    const products = new Map();
    if (raw.columns.includes('Area') && raw.columns.includes('Y1961')) {
      const years = raw.columns.filter(key => /^Y\d{4}$/.test(key)).sort();
      const records = new Map(), seen = new Set();
      for (const row of raw) {
        if (!ALLOWED_COUNTRIES.includes(row.Area)) continue;
        const [key, factor] = sourceMetric(row.Element, row.Unit);
        const sourceKey = JSON.stringify([row.Area, row.Item, key]);
        if (seen.has(sourceKey)) throw new Error('Duplicate source series for ' + row.Area + ' / ' + row.Item);
        seen.add(sourceKey);
        let meta = products.get(row.Item);
        if (!meta) { meta = { keys: new Set(), isTotal: String(row['Item Code (CPC)'] || '').replace(/^'/, '').startsWith('F') }; products.set(row.Item, meta); }
        meta.keys.add(key);
        for (const yearColumn of years) {
          const year = Number(yearColumn.slice(1));
          const recordKey = JSON.stringify([row.Area, row.Item, year]);
          let record = records.get(recordKey);
          if (!record) { record = { country: row.Area, crop: row.Item, code: String(row['Area Code (M49)'] || '').replace(/^'/, ''), region: row.Area === 'United States of America' ? 'Americas' : 'Asia', year }; records.set(recordKey, record); }
          const value = numeric(row[yearColumn]); record[key] = value === null ? null : value * factor;
        }
      }
      return { rows: [...records.values()], products, isWide: true };
    }
    // Backward compatibility for the earlier cleaned crop CSV.
    validate([], raw.columns, true);
    const rows = raw.filter(row => ALLOWED_COUNTRIES.includes(row.country)).map(parseRow);
    for (const row of rows) { if (!products.has(row.crop)) products.set(row.crop, { keys: new Set(['area', 'yield', 'production']), isTotal: false }); }
    return { rows, products, isWide: false };
  }
  const METRICS = SOURCE_MEASURES;
  const COLUMNS = ['country', 'code', 'region', 'crop', 'year', 'area (ha)', 'yield (t/ha)', 'production (tonnes)'];
  const format = value => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'No data';
  function numeric(value) {
    if (value == null || String(value).trim() === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error('A measurement is invalid or negative.');
    return n;
  }
  function parseRow(row) {
    const year = Number(row.year);
    if (!row.country || !row.crop || !String(row.year ?? '').trim() || !Number.isInteger(year)) throw new Error('Invalid country, crop or year.');
    return {
      country: row.country.trim(), code: String(row.code ?? ''), region: row.region ?? '', crop: row.crop.trim(), year,
      area: numeric(row['area (ha)']), yield: numeric(row['yield (t/ha)']), production: numeric(row['production (tonnes)'])
    };
  }
  function validate(rows, columns, schemaOnly = false) {
    if (!COLUMNS.every(c => columns.includes(c))) throw new Error('CSV column names do not match crops_clean.csv.');
    if (schemaOnly) return;
    if (!rows.length) throw new Error('The CSV contains no records for the four selected countries.');
    const keys = new Set();
    rows.forEach(d => { const key = JSON.stringify([d.country, d.crop, d.year]); if (keys.has(key)) throw new Error('Duplicate country / crop / year records.'); keys.add(key); });
  }
  function rangePreset(length, min, max) { return { from: length === 'all' ? min : Math.max(min, max - Number(length) + 1), to: max }; }
  function clampYear(year, from, to) { return Math.min(to, Math.max(from, year)); }
  function comparison(a, b, unit, country) {
    if (a == null || b == null) return 'Comparison unavailable: missing data.';
    const delta = a - b;
    const start = `Difference: ${delta > 0 ? '+' : ''}${format(delta)} ${unit}. `;
    if (b === 0) return start + 'Percentage unavailable: reference value is zero.';
    if (delta === 0) return start + `Equal to ${country}.`;
    const pct = Math.abs(delta / b * 100);
    return start + `${pct < 0.01 ? '<0.01' : format(pct)}% ${delta > 0 ? 'higher' : 'lower'} than ${country}.`;
  }
  // Pure functions are also available to the accompanying development checks.
  if (typeof module !== 'undefined' && module.exports) { module.exports = { parseRow, validate, rangePreset, clampYear, comparison, COLUMNS, normalizeSource, sourceMetric, ALLOWED_COUNTRIES }; return; }
  let d3Promise;
  async function getD3(url) {
    if (global.d3) {
      if (!['csvParse', 'select', 'scaleLinear', 'axisLeft', 'line'].every(key => typeof global.d3[key] === 'function')) throw new Error('Page 6 requires D3 v7. The existing D3 version is incompatible.');
      return global.d3;
    }
    if (!d3Promise) d3Promise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = url;
      script.onload = () => global.d3 ? resolve(global.d3) : reject(new Error('D3 did not initialize.'));
      script.onerror = () => { script.remove(); d3Promise = null; reject(new Error('D3 could not load. Check your internet connection and retry.')); };
      document.head.append(script);
    });
    return d3Promise;
  }
  function template() {
    return `
      <div class="pl">
      <header class="p6-hero"><span class="p6-eyebrow">AGRICULTURE · COUNTRY EXPLORER</span>
        <h2>How do countries compare?</h2><p>Explore crops and livestock across four countries and over time.</p></header>
      <div class="p6-box p6-filters">
        <label>Country<select data-role="a" disabled></select></label>
        <label>Compare with<select data-role="b" disabled></select></label>
        <label>Product<select data-role="crop" disabled></select></label>
        <label>Selected year<select data-role="year" disabled></select></label>
      </div>
      <section class="p6-box p6-time" aria-label="Time frame">
        <div class="p6-toolbar"><div><h3>Time Frame</h3><p>Choose the years shown in the historical chart.</p></div>
          <button type="button" data-role="reset">Reset all filters</button></div>
        <div class="p6-presets" role="group" aria-label="Time frame presets">
          <button type="button" data-range="5" aria-pressed="false">Last 5 Years</button>
          <button type="button" data-range="10" aria-pressed="false">Last 10 Years</button>
          <button type="button" data-range="20" aria-pressed="false">Last 20 Years</button>
          <button type="button" data-range="all" aria-pressed="true">All Years</button>
        </div>
        <div class="p6-range-inputs"><label>From<select data-role="from" disabled></select></label>
          <label>To<select data-role="to" disabled></select></label>
          <p class="p6-note" data-role="range-note"></p></div>
      </section>
      </div>
      <div class="pr">
      <p data-role="status" class="p6-status" role="status">Loading data…</p>
      <button type="button" data-role="retry" hidden>Retry loading</button>
      <p data-role="summary" class="p6-summary" aria-live="polite"></p>
      <div data-role="cards" class="p6-cards"></div>
      <section class="p6-box p6-profile"><h3 data-role="profile-title">Country Profile</h3><p data-role="profile-subtitle"></p>
        <div data-role="profile-chart" class="p6-chart"></div>
        <p class="p6-note" data-role="profile-note"></p></section>
      <div class="p6-toolbar"><div><h2>Explore the comparison</h2><p>One year in detail. The full story over time.</p></div>
        <label>Chart metric<select data-role="metric" disabled><option value="yield">Yield (t/ha)</option><option value="production">Production (tonnes)</option><option value="area">Harvested Area (ha)</option></select></label></div>
      <div data-role="legend" class="p6-legend"></div>
      <div class="p6-charts">
        <section class="p6-box p6-chart-box"><h3>Selected Year</h3><p data-role="bar-subtitle"></p><div data-role="bars" class="p6-chart"></div></section>
        <section class="p6-box p6-chart-box"><h3>Historical Trend</h3><p data-role="line-subtitle"></p><div data-role="lines" class="p6-chart"></div></section>
      </div>
      <p class="p6-note">Hover over, tap or focus a mark for its value. Click a trend point or press Enter to select its year. The vertical dashed line marks the selected year. Gaps indicate missing data.</p>
      <footer class="p6-note"><p data-role="source"></p>
        <details><summary>Data coverage and definitions</summary><p data-role="coverage"></p>
          <p>Harvested area is not total agricultural land. Units depend on the selected product. Crop yield kg/ha is converted to t/ha; animal counts in thousands are converted to animals or number; carcass weight g/animal is converted to kg/animal. Production in tonnes is separate from production in number. Missing values are never replaced with zero. A zero reference value has no percentage comparison. Percentage differences use the second country as the reference.</p>
          <p>Country codes preserve FAOSTAT M49 codes (China: 159). Regions are dashboard groupings: Asia and Americas. The wide source file does not include observation-quality flags.</p>
        </details></footer>
      </div>`;
  }

  // Inline SVG flags: no external image files required.
  function flag(country) {
    const base = 'viewBox="0 0 60 40" class="p6-flag" aria-hidden="true"';

    if (country === "Thailand") {
      return `<svg ${base}>
          <path fill="#c92c3b" d="M0 0h60v40H0z"/>
          <path fill="#fff" d="M0 7h60v26H0z"/>
          <path fill="#27346c" d="M0 13h60v14H0z"/>
        </svg>`;
    }

    if (country === "India") {
      return `<svg ${base}>
          <path fill="#f39738" d="M0 0h60v40H0z"/>
          <path fill="#fff" d="M0 13h60v14H0z"/>
          <path fill="#18864b" d="M0 27h60v13H0z"/>
          <circle cx="30" cy="20" r="5" fill="none"
            stroke="#24408c" stroke-width="1.4"/>
          <path d="M25 20h10M30 15v10M26.5 16.5l7 7M26.5 23.5l7-7"
            stroke="#24408c" stroke-width=".7"/>
        </svg>`;
    }

    if (country === "China") {
      return `<svg ${base}>
          <path fill="#df3038" d="M0 0h60v40H0z"/>
          <g fill="#ffe36a">
            <path d="m12 6 2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/>
            <circle cx="24" cy="6" r="1.7"/>
            <circle cx="28" cy="12" r="1.7"/>
            <circle cx="28" cy="19" r="1.7"/>
            <circle cx="24" cy="25" r="1.7"/>
          </g>
        </svg>`;
    }

    if (country === "United States of America") {
      const stripes = Array.from({ length: 7 }, (_, i) =>
        `<rect y="${i * 40 / 7}" width="60" height="${40 / 14}"
            fill="#c83b49"/>`
      ).join("");

      const stars = Array.from({ length: 12 }, (_, i) =>
        `<circle cx="${4 + (i % 4) * 5.5}"
            cy="${4 + Math.floor(i / 4) * 6}" r="1" fill="white"/>`
      ).join("");

      return `<svg ${base}>
          <path fill="#fff" d="M0 0h60v40H0z"/>
          ${stripes}
          <path fill="#304475" d="M0 0h26v22H0z"/>
          ${stars}
        </svg>`;
    }

    return "";
  }


  async function mountPage6(options = {}) {
    const root = typeof options.root === 'string' ? document.querySelector(options.root) : options.root || document.getElementById('page6');
    if (!root) throw new Error('Page 6 container was not found.');
    if (root.__page6) root.__page6.destroy();
    root.classList.add('p6'); root.innerHTML = template();
    const controller = new AbortController(); let destroyed = false;
    const $ = role => root.querySelector(`[data-role="${role}"]`);
    const listen = (element, event, fn) => element.addEventListener(event, fn, { signal: controller.signal });
    const api = { destroy() { destroyed = true; controller.abort(); root.replaceChildren(); delete root.__page6; } };
    root.__page6 = api;
    const dataUrl = options.dataUrl || root.dataset.csv || './data/data.csv';
    const d3Url = options.d3Url || 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
    let rows = [], state, years, countries, crops, lookup, d3, minYear, maxYear, productMeta = new Map(), wideSource = false;
    const get = (country, crop, year) => lookup.get(JSON.stringify([country, crop, year]));
    const selected = () => [...new Set([state.a, state.b])];
    const palette = () => { const css = getComputedStyle(root); return [css.getPropertyValue('--country-a').trim() || '#087f72', css.getPropertyValue('--country-b').trim() || '#da7833']; };
    const metricKeys = () => Object.keys(METRICS).filter(key => productMeta.get(state.crop)?.keys.has(key));
    const info = () => METRICS[state.metric];
    function countryLabel(host, country, color) {
      host.innerHTML = flag(country); const text = document.createElement('span'); text.textContent = country; host.append(text);
      host.style.color = color;
    }
    function optionsFor(role, values) {
      const select = $(role); select.replaceChildren();
      values.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = role === 'crop' && productMeta.get(value)?.isTotal ? value + ' (total)' : value; select.append(option); });
    }
    function defaults() { return { a: countries.includes('Thailand') ? 'Thailand' : countries[0], b: countries.includes('India') ? 'India' : countries[1] || countries[0], crop: crops.includes('Rice') ? 'Rice' : crops[0], year: maxYear, from: minYear, to: maxYear, metric: 'yield' }; }
    function sync() {
      const available = metricKeys();
      if (!available.includes(state.metric)) state.metric = available.includes('production') ? 'production' : available.includes('stocks') ? 'stocks' : available[0];
      const control = $('metric'); control.replaceChildren();
      available.forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = `${METRICS[key].title} (${METRICS[key].unit})`; control.append(option); });
      ['a', 'b', 'crop', 'year', 'from', 'to', 'metric'].forEach(role => { $(role).value = String(state[role]); });
      for (const option of $('from').options) option.disabled = Number(option.value) > state.to;
      for (const option of $('to').options) option.disabled = Number(option.value) < state.from;
      for (const option of $('year').options) option.disabled = Number(option.value) < state.from || Number(option.value) > state.to;
      root.querySelectorAll('[data-range]').forEach(button => { const preset = rangePreset(button.dataset.range, minYear, maxYear); button.setAttribute('aria-pressed', String(preset.from === state.from && preset.to === state.to)); });
      $('range-note').textContent = `${state.from}–${state.to} · ${state.to - state.from + 1} calendar years. Selected year stays inside this range.`;
    }
    function update() {
      if (destroyed) return;
      sync(); $('summary').textContent = `${state.a} vs ${state.b} · ${state.crop} · Selected year: ${state.year} · Trend: ${state.from}–${state.to}`;
      cards(); profile(); charts(); selectionStatus();
    }
    function cards() {
      $('cards').replaceChildren(); const colors = palette();
      metricKeys().forEach(key => {
        const metric = METRICS[key];
        const card = document.createElement('article'); card.className = 'p6-card';
        const heading = document.createElement('h3'); heading.innerHTML = `<span class="p6-icon" aria-hidden="true">${metric.icon}</span>${metric.title}`; card.append(heading);
        const values = [get(state.a, state.crop, state.year)?.[key] ?? null, get(state.b, state.crop, state.year)?.[key] ?? null];
        [state.a, state.b].forEach((country, index) => {
          const label = document.createElement('div'); label.className = 'p6-country'; countryLabel(label, country, colors[country === state.a ? 0 : 1]);
          const value = document.createElement('div'); value.className = 'p6-value'; value.style.color = colors[country === state.a ? 0 : 1]; value.textContent = format(values[index]);
          const unit = document.createElement('span'); unit.className = 'p6-unit'; unit.textContent = metric.unit; card.append(label, value, unit);
        });
        const delta = document.createElement('p'); delta.className = 'p6-difference'; delta.textContent = comparison(values[0], values[1], metric.unit, state.b); card.append(delta); $('cards').append(card);
      });
    }
    function chartBase(role, width, height, title) {
      const host = $(role); host.replaceChildren();
      const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'group').attr('aria-label', title);
      svg.append('title').text(title);
      const tip = d3.select(host).append('div').attr('class', 'p6-tooltip').attr('role', 'status').style('display', 'none');
      function show(text, x, y) {
        tip.style('display', 'block').text(text); const node = tip.node();
        tip.style('left', `${Math.max(0, Math.min(x + 12, host.clientWidth - node.offsetWidth))}px`)
          .style('top', `${Math.max(0, Math.min(y + 12, host.clientHeight - node.offsetHeight))}px`);
      }
      function attach(marks, describe, activate) {
        const pointer = (event, datum) => { const [x, y] = d3.pointer(event, host); show(describe(datum), x, y); };
        marks.attr('tabindex', 0).attr('role', activate ? 'button' : 'img').attr('aria-label', d => describe(d) + (activate ? ' — press Enter to select.' : ''))
          .on('pointerenter', pointer).on('pointermove', pointer).on('pointerleave', () => tip.style('display', 'none'))
          .on('focus', function (event, d) { const box = this.getBoundingClientRect(), parent = host.getBoundingClientRect(); show(describe(d), box.left - parent.left, box.top - parent.top); })
          .on('blur', () => tip.style('display', 'none'))
          .on('click', (event, d) => { if (activate) activate(d); else pointer(event, d); })
          .on('keydown', (event, d) => { if (event.key === 'Escape') tip.style('display', 'none'); if (activate && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); activate(d); } });
        marks.append('title').text(describe); return marks;
      }
      return { svg, attach };
    }
    function grid(svg, y, width, left) {
      svg.append('g').attr('transform', `translate(${left},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''))
        .call(g => g.select('.domain').remove()).call(g => g.selectAll('line').attr('class', 'p6-grid'));
    }
    function profile() {
      const current = productMeta.get(state.crop).keys;
      const key = current.has('production') ? 'production' : current.has('production_number') ? 'production_number' : state.metric;
      const metric = METRICS[key];
      $('profile-title').textContent = `Country Profile — ${metric.title} by Product`;
      $('profile-note').textContent = `Top 8 available products with the same measure and unit (${metric.unit}). Product totals are excluded. Click a product to select it.`;
      $('profile-subtitle').textContent = `${state.a} · ${state.year} · ${metric.title} (${metric.unit})`;
      const { svg, attach } = chartBase('profile-chart', 900, 320, `${metric.title} by product in ${state.a}, ${state.year}`);
      const observations = crops.filter(crop => !productMeta.get(crop).isTotal && productMeta.get(crop).keys.has(key)).map(crop => ({ crop, value: get(state.a, crop, state.year)?.[key] ?? null })).filter(d => d.value !== null).sort((a, b) => b.value - a.value || a.crop.localeCompare(b.crop)).slice(0, 8);
      if (!observations.length) { svg.append('text').attr('x', 30).attr('y', 80).attr('class', 'p6-chart-label').text('No comparable products for this measure and year.'); return; }
      const x = d3.scaleLinear().domain([0, d3.max(observations, d => d.value) || 1]).nice().range([145, 755]);
      const y = d3.scaleBand().domain(observations.map(d => d.crop)).range([25, 275]).padding(.35);
      svg.append('g').attr('transform', 'translate(0,275)').call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('~s')));
      const axis = svg.append('g').attr('transform', 'translate(145,0)').call(d3.axisLeft(y).tickSize(0).tickFormat(text => text.length > 22 ? text.slice(0, 19) + '…' : text)); axis.select('.domain').remove();
      function choose(crop) { state.crop = crop; update(); }
      const labels = axis.selectAll('.tick text'); attach(labels, d => `Select ${d}`, choose);
      observations.forEach(d => {
        svg.append('rect').attr('x', 145).attr('y', y(d.crop)).attr('width', 610).attr('height', y.bandwidth()).attr('rx', 5).attr('class', 'p6-track');
        if (d.value !== null) {
          const mark = svg.append('rect').datum(d).attr('x', 145).attr('y', y(d.crop)).attr('width', Math.max(0, x(d.value) - 145)).attr('height', y.bandwidth()).attr('rx', 5).attr('fill', palette()[0]).attr('opacity', d.crop === state.crop ? 1 : .5);
          attach(mark, d => `${state.a}\n${d.crop} · ${state.year}\n${metric.title}: ${format(d.value)} ${metric.unit}`, d => choose(d.crop));
        }
        svg.append('text').attr('x', d.value === null ? 153 : x(d.value) + 8).attr('y', y(d.crop) + y.bandwidth() / 2).attr('dominant-baseline', 'middle').attr('class', 'p6-chart-label').text(format(d.value));
      });
      svg.append('text').attr('x', 145).attr('y', 313).attr('class', 'p6-chart-label').text(`${metric.title} (${metric.unit})`);
    }
    function bars() {
      const metric = info(), colors = palette();
      const values = selected().map((country, index) => ({ country, value: get(country, state.crop, state.year)?.[state.metric] ?? null, color: colors[index] }));
      $('bar-subtitle').textContent = `${state.crop} · ${state.year} · ${metric.unit}`;
      const { svg, attach } = chartBase('bars', 420, 340, `${metric.title} comparison in ${state.year}`);
      const x = d3.scaleLinear().domain([0, (d3.max(values, d => d.value) || 1) * 1.2]).range([26, 390]);
      svg.append('g').attr('transform', 'translate(0,290)').call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('~s')));
      values.forEach((d, i) => {
        const top = 35 + i * 115;
        svg.append('text').attr('x', 26).attr('y', top).attr('fill', d.color).attr('font-size', 13).attr('font-weight', 600).text(d.country);
        svg.append('rect').attr('x', 26).attr('y', top + 15).attr('width', 364).attr('height', 25).attr('rx', 5).attr('class', 'p6-track');
        if (d.value !== null) {
          const mark = svg.append('rect').datum(d).attr('x', 26).attr('y', top + 15).attr('width', Math.max(0, x(d.value) - 26)).attr('height', 25).attr('rx', 5).attr('fill', d.color);
          attach(mark, d => `${d.country}\n${state.crop} · ${state.year}\n${metric.title}: ${format(d.value)} ${metric.unit}`);
        }
        svg.append('text').attr('x', 26).attr('y', top + 62).attr('class', 'p6-chart-label').text(d.value === null ? 'No data' : `${format(d.value)} ${metric.unit}`);
      });
      svg.append('text').attr('x', 26).attr('y', 328).attr('class', 'p6-chart-label').text(`${metric.title} (${metric.unit})`);
    }
    function trend() {
      const metric = info(), colors = palette();
      const series = selected().map((country, index) => ({ country, color: colors[index], index, values: d3.range(state.from, state.to + 1).map(year => get(country, state.crop, year) || { year, [state.metric]: null }) }));
      $('line-subtitle').textContent = `${state.crop} · ${state.from}–${state.to} · ${metric.unit}`;
      const { svg, attach } = chartBase('lines', 680, 340, `${metric.title} trend, ${state.crop}, ${state.from}–${state.to}`);
      const valid = series.flatMap(s => s.values).filter(d => Number.isFinite(d[state.metric]));
      if (!valid.length) { svg.append('text').attr('x', 30).attr('y', 80).attr('class', 'p6-chart-label').text('No data available in this time frame.'); return; }
      const x = d3.scaleLinear().domain(state.from === state.to ? [state.from - .5, state.to + .5] : [state.from, state.to]).range([62, 660]);
      const y = d3.scaleLinear().domain([0, (d3.max(valid, d => d[state.metric]) || 1) * 1.12]).nice().range([295, 30]);
      grid(svg, y, 598, 62);
      const ticks = state.to - state.from <= 6 ? d3.range(state.from, state.to + 1) : x.ticks(6).filter(Number.isInteger);
      svg.append('g').attr('transform', 'translate(0,295)').call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format('d')));
      svg.append('g').attr('transform', 'translate(62,0)').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));
      svg.append('text').attr('x', 62).attr('y', 16).attr('class', 'p6-chart-label').text(`${metric.title} (${metric.unit})`);
      svg.append('text').attr('x', 340).attr('y', 335).attr('text-anchor', 'middle').attr('class', 'p6-chart-label').text('Year');
      svg.append('line').attr('x1', x(state.year)).attr('x2', x(state.year)).attr('y1', 30).attr('y2', 295).attr('class', 'p6-year-marker');
      const line = d3.line().defined(d => Number.isFinite(d[state.metric])).x(d => x(d.year)).y(d => y(d[state.metric]));
      series.forEach(s => {
        svg.append('path').datum(s.values).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', 2.5).attr('stroke-dasharray', s.index ? '7,4' : null).attr('d', line);
        const marks = svg.append('g').selectAll('circle').data(s.values.filter(d => Number.isFinite(d[state.metric]))).join('circle').attr('cx', d => x(d.year)).attr('cy', d => y(d[state.metric])).attr('r', d => d.year === state.year ? 5 : 3).attr('fill', s.color).attr('class', 'p6-point');
        attach(marks, d => `${s.country}\n${state.crop} · ${d.year}\n${metric.title}: ${format(d[state.metric])} ${metric.unit}`, d => { state.year = d.year; update(); });
      });
    }
    function charts() {
      const colors = palette(); $('legend').replaceChildren();
      selected().forEach((country, index) => { const item = document.createElement('span'); countryLabel(item, country, colors[index]); item.append(document.createTextNode(index ? ' ┄' : ' ━')); $('legend').append(item); });
      bars(); trend();
    }
    function selectionStatus() {
      const filtered = rows.filter(d => (d.country === state.a || d.country === state.b) && d.crop === state.crop && d.year >= state.from && d.year <= state.to);
      const missing = filtered.reduce((total, d) => total + metricKeys().filter(key => d[key] == null).length, 0);
      $('status').textContent = `${filtered.length} records in this time frame · ${missing} missing measurements. ${state.a === state.b ? 'The same country is selected; charts show it once.' : ''}`;
    }
    async function load() {
      $('status').textContent = 'Loading data…'; $('retry').hidden = true;
      root.querySelectorAll('select,[data-range],[data-role="reset"]').forEach(control => control.disabled = true);
      try {
        d3 = await getD3(d3Url);
        const response = await fetch(dataUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`CSV request failed (${response.status}).`);
        const raw = d3.csvParse((await response.text()).replace(/^\uFEFF/, ''));
        const normalized = normalizeSource(raw); rows = normalized.rows; productMeta = normalized.products; wideSource = normalized.isWide;
        if (!rows.length) throw new Error('No data for the four selected countries.');
        if (destroyed) return;
        countries = ALLOWED_COUNTRIES.filter(country => rows.some(row => row.country === country)); crops = [...new Set(rows.map(d => d.crop))].sort(); years = [...new Set(rows.map(d => d.year))].sort((a, b) => a - b);
        minYear = years[0]; maxYear = years.at(-1); lookup = new Map(rows.map(d => [JSON.stringify([d.country, d.crop, d.year]), d]));
        optionsFor('a', countries); optionsFor('b', countries); optionsFor('crop', crops); optionsFor('year', [...years].reverse());
        optionsFor('from', years); optionsFor('to', years);
        state = defaults();
        root.querySelectorAll('select,[data-range],[data-role="reset"]').forEach(control => control.disabled = false);
        const missing = rows.reduce((total, d) => total + [...productMeta.get(d.crop).keys].filter(k => d[k] == null).length, 0);
        $('source').textContent = `Source: FAOSTAT · ${rows.length.toLocaleString('en-US')} records · ${countries.length} countries · ${crops.length} products · ${minYear}–${maxYear}. Missing measurements remain missing.`;
        $('coverage').textContent = `Coverage: ${countries.join(', ')}. Products: ${crops.join('; ')}. ${missing} missing measurements in this file. Product coverage is limited to the selected countries in this source. Regional totals and other countries are excluded from the selectors.`;
        update();
      } catch (error) {
        if (destroyed || error.name === 'AbortError') return;
        $('status').textContent = `Unable to load dashboard: ${error.message} Open through Live Server and check ${dataUrl}.`;
        $('retry').hidden = false; console.error(error);
      }
    }
    ['a', 'b', 'crop', 'metric'].forEach(role => listen($(role), 'change', () => { state[role] = $(role).value; update(); }));
    listen($('year'), 'change', () => { state.year = Number($('year').value); update(); });
    ['from', 'to'].forEach(role => listen($(role), 'change', () => {
      state[role] = Number($(role).value);
      if (state.from > state.to) { if (role === 'from') state.to = state.from; else state.from = state.to; }
      state.year = clampYear(state.year, state.from, state.to); update();
    }));
    root.querySelectorAll('[data-range]').forEach(button => listen(button, 'click', () => { Object.assign(state, rangePreset(button.dataset.range, minYear, maxYear)); state.year = clampYear(state.year, state.from, state.to); update(); }));
    listen($('reset'), 'click', () => { state = defaults(); update(); });
    listen($('retry'), 'click', load);
    listen(root, 'page6:themechange', () => { if (state) update(); });
    await load(); return api;
  }
  global.mountPage6 = mountPage6;
  function auto() { const root = document.getElementById('page6'); if (root && !root.__page6 && root.dataset.auto !== 'false') mountPage6({ root }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto, { once: true }); else auto();
})(typeof window === 'undefined' ? globalThis : window);
// The group main.js imports this entry point. Keep exactly one init export.
export async function init(data, root) {
  if (!root) return;
  root.__page6?.destroy();
  root.textContent = 'Looking for data.csv…';

  // Both supported locations are relative to the project, not this page's URL.
  const candidates = [
    new URL('../../data.csv', import.meta.url).href,
    new URL('../../data/data.csv', import.meta.url).href
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      });
      const type = response.headers.get('content-type') || '';
      if (response.ok && !type.includes('text/html')) {
        return globalThis.mountPage6({ root, dataUrl: url });
      }
    } catch (error) {
      // Try the other supported location before displaying a clear file error.
    }
  }

  const heading = document.createElement('h3');
  heading.textContent = 'data.csv was not found';
  const message = document.createElement('p');
  message.textContent =
    'Copy data.csv into the same folder as index.html, then refresh this page. ' +
    'Keep the file name data.csv and open the project through Live Server.';
  root.replaceChildren(heading, message);
}
