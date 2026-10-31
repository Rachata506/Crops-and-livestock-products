
const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmtYield = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

let records = [];
let areas = [];
let items = [];
let scatterChart = null;
let lineChart = null;

const $ = (id) => document.getElementById(id);

export async function init(data, root) {
  if (!root) {
    console.error('Page 5 root not found');
    return;
  }

  // All styles are limited to Page 5.
  if (!document.getElementById('page5-custom-style')) {
    const style = document.createElement('style');
    style.id = 'page5-custom-style';

    style.textContent = `
      #p5 {
        background: #ffffff;
        color: #263341;
        font-family: inherit;
        height: auto;
        min-height: 100vh;
      }

      #p5, #p5 * {
        box-sizing: border-box;
      }

      #p5 #p5-root {
        width: 100%;
        max-width: none;
      }

      #p5 .dashboard {
        width: 100%;
        max-width: 1500px;
        margin: 0 auto;
        padding: 32px 42px 50px;
      }

      #p5 .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 24px;
        padding: 22px 26px;
        background: #ffffff;
        border: 1px solid #e1e9e5;
        border-radius: 18px;
        box-shadow: none;
      }

      #p5 .topbar h1 {
        font-family: Georgia, "Times New Roman", serif;
        color: #1e704c;
        font-size: clamp(26px, 3vw, 40px);
        margin: 0;
        letter-spacing: -.03em;
        line-height: 1.2;
      }

      #p5 .subtitle {
        margin: 9px 0 0;
        color: #647381;
        font-size: 14px;
        line-height: 1.6;
      }

      #p5 .intro-grid {
        display: grid;
        grid-template-columns:
          minmax(220px, .9fr)
          minmax(350px, 1.45fr)
          minmax(180px, .5fr);
        gap: 16px;
        align-items: stretch;
      }

      #p5 .bottom-grid {
        display: grid;
        grid-template-columns:
          minmax(350px, 1.6fr)
          minmax(230px, .8fr);
        gap: 16px;
        margin-top: 16px;
      }

      #p5 .panel {
        background: #ffffff;
        border: 1px solid #dce8e1;
        border-radius: 16px;
        box-shadow: none;
        min-width: 0;
      }

      #p5 .insight {
        padding: 22px 24px;
      }

      #p5 .insight h2,
      #p5 .panel h2 {
        margin: 0;
        color: #153e35;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -.02em;
        line-height: 1.4;
      }

      #p5 .insight h2 {
        text-align: center;
        margin-bottom: 14px;
      }

      #p5 .insight p {
        font-size: 13px;
        line-height: 1.75;
        color: #596575;
        margin: 0 0 12px;
      }

      #p5 .insight .note {
        font-size: 11px;
        color: #8792a1;
        border-top: 1px solid #e5eee9;
        padding-top: 12px;
        margin-top: 16px;
      }

      #p5 .scatter-panel,
      #p5 .line-panel {
        padding: 20px 20px 14px;
      }

      #p5 .panel-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      #p5 .small {
        font-size: 11px;
        color: #7b8991;
        margin: 6px 0 0;
        line-height: 1.5;
      }

      #p5 .count,
      #p5 .legend-note {
        font-size: 11px;
        color: #718091;
        white-space: nowrap;
      }

      #p5 .chart-wrap {
        position: relative;
        width: 100%;
      }

      #p5 .scatter-wrap {
        height: 300px;
      }

      #p5 .line-wrap {
        height: 330px;
      }

      #p5 .filters {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      #p5 .filter-panel {
        padding: 18px;
      }

      #p5 .filter-panel label {
        display: block;
        font-weight: 700;
        font-size: 13px;
        color: #153e35;
        margin-bottom: 10px;
      }

      #p5 .filter-panel select {
        width: 100%;
        padding: 10px;
        border: 1px solid #cdded5;
        border-radius: 9px;
        background: #ffffff;
        color: #263341;
        font: inherit;
        font-size: 12px;
      }

      #p5 .filter-panel select:focus {
        outline: 2px solid #168a77;
        outline-offset: 2px;
      }

      #p5 .filter-panel input[type="range"] {
        width: 100%;
        margin: 18px 0 4px;
        accent-color: #087f70;
      }

      #p5 .range-labels {
        display: flex;
        justify-content: space-between;
        color: #8a95a4;
        font-size: 10px;
      }

      #p5 .kpi-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      #p5 .kpi {
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 120px;
      }

      #p5 .kpi p {
        margin: 0 0 9px;
        font-size: 13px;
        font-weight: 600;
        color: #647381;
      }

      #p5 .kpi strong {
        color: #153e35;
        font-size: clamp(21px, 2vw, 30px);
        letter-spacing: -.04em;
        overflow-wrap: anywhere;
      }

      #p5 .kpi span {
        font-size: 10px;
        color: #8a95a4;
        margin-top: 7px;
      }

      @media (max-width: 1050px) {
        #p5 .intro-grid {
          grid-template-columns: 1fr 1.4fr;
        }

        #p5 .filters {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        #p5 .bottom-grid {
          grid-template-columns: 1fr;
        }

        #p5 .kpi-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 680px) {
        #p5 .dashboard {
          padding: 12px;
        }

        #p5 .topbar {
          align-items: flex-start;
          flex-direction: column;
          padding: 20px;
        }

        #p5 .intro-grid,
        #p5 .filters {
          grid-template-columns: 1fr;
        }

        #p5 .scatter-wrap,
        #p5 .line-wrap {
          height: 280px;
        }

        #p5 .kpi-grid {
          grid-template-columns: 1fr;
        }

        #p5 .panel-heading {
          flex-direction: column;
        }

        #p5 .legend-note {
          white-space: normal;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // Complete Page 5 HTML.
  root.innerHTML = `
    <div class="dashboard">

      <header class="topbar">
        <div>
          <h1>Agricultural Production Dashboard</h1>
          <p class="subtitle">
            Explore global crop production, harvested area and yield trends.
          </p>
        </div>
      </header>

      <div class="intro-grid">

        <article class="panel insight">
          <h2>Key Insight</h2>
          <p>
            Food security depends not only on expanding agricultural
            land, but also on improving productivity.
          </p>
          <p>
            Compare harvested area and production over time,
            then explore how agricultural scale and yield
            differ across countries.
          </p>
          <p class="note">
            Yield uses FAOSTAT measurements where available.
            Bubble size represents production volume.
          </p>
        </article>

        <article class="panel scatter-panel">
          <div class="panel-heading">
            <div>
              <h2>Land vs. Yield</h2>
              <p class="small">
                Country/area comparison for the selected crop and year
              </p>
            </div>
            <span id="scatterCount" class="count">—</span>
          </div>

          <div class="chart-wrap scatter-wrap">
            <canvas id="scatterChart"></canvas>
          </div>
        </article>

        <aside class="filters">

          <div class="panel filter-panel">
            <label for="yearSelect">Year</label>
            <select id="yearSelect"></select>
            <input type="range" id="yearSlider">

            <div class="range-labels">
              <span id="minYearLabel"></span>
              <span id="yearLabel"></span>
              <span id="maxYearLabel"></span>
            </div>
          </div>

          <div class="panel filter-panel">
            <label for="areaSelect">Area / Country</label>
            <select id="areaSelect"></select>
            <p class="small">
              Select a country or region to update the trend
              and summary cards.
            </p>
          </div>

          <div class="panel filter-panel">
            <label for="cropSelect">Crop / Product</label>
            <select id="cropSelect"></select>
            <p class="small">
              Choose a crop to filter the scatter plot,
              trend and summary values.
            </p>
          </div>

        </aside>
      </div>

      <div class="bottom-grid">

        <article class="panel line-panel">
          <div class="panel-heading">
            <div>
              <h2>Production &amp; Harvested Area</h2>
              <p class="small">
                Trend across available years for the selected area and crop
              </p>
            </div>
            <span class="legend-note">
              Area harvested · Production
            </span>
          </div>

          <div class="chart-wrap line-wrap">
            <canvas id="lineChart"></canvas>
          </div>
        </article>

        <div class="kpi-grid">

          <article class="panel kpi">
            <p>Total Area Harvested</p>
            <strong id="areaKpi">—</strong>
            <span>ha · selected area/year/crop</span>
          </article>

          <article class="panel kpi">
            <p>Total Production</p>
            <strong id="productionKpi">—</strong>
            <span>tonnes · selected area/year/crop</span>
          </article>

          <article class="panel kpi">
            <p>Crop Yield</p>
            <strong id="yieldKpi">—</strong>
            <span>kg/ha · selected area/year/crop</span>
          </article>

        </div>
      </div>
    </div>
  `;

  try {
    if (!window.Chart) {
      const chartModule = await import(
        'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/+esm'
      );
      window.Chart = chartModule.Chart;
    }

    const response = await fetch('./data_page5/agriculture.json');

    if (!response.ok) {
      throw new Error(
        `Cannot load agriculture.json (HTTP ${response.status})`
      );
    }

    const payload = await response.json();

    if (
      !Array.isArray(payload.areas) ||
      !Array.isArray(payload.items) ||
      !Array.isArray(payload.records)
    ) {
      throw new Error('Invalid agriculture.json format');
    }

    areas = payload.areas;
    items = payload.items;

    records = payload.records.map(r => ({
      area: areas[r[0]],
      year: r[1],
      item: items[r[2]],
      areaHarvested: r[3],
      production: r[4],
      yieldValue: r[5]
    }));

    if (!records.length) {
      throw new Error('No agricultural records found');
    }

    setupFilters();

    if (scatterChart) scatterChart.destroy();
    if (lineChart) lineChart.destroy();

    buildCharts();
    updateDashboard();

    $('yearSelect').addEventListener('change', () => {
      $('yearSlider').value = $('yearSelect').value;
      updateDashboard();
    });

    $('yearSlider').addEventListener('input', () => {
      $('yearSelect').value = $('yearSlider').value;
      updateDashboard();
    });

    $('areaSelect').addEventListener('change', updateDashboard);
    $('cropSelect').addEventListener('change', updateDashboard);

    console.log('PAGE 5 READY');

  } catch (err) {
    console.error('Page 5 failed:', err);

    root.querySelector('.dashboard')?.insertAdjacentHTML(
      'afterbegin',
      `<div class="panel" style="padding:16px;color:#a22;margin-bottom:16px">
        Page 5 could not be loaded: ${escapeHtml(err.message)}
      </div>`
    );
  }
}

function setupFilters() {
  const years = [...new Set(records.map(d => d.year))]
    .sort((a, b) => a - b);

  if (!years.length) {
    throw new Error('No years available');
  }

  $('yearSelect').innerHTML = years
    .map(y => `<option value="${y}">${y}</option>`)
    .join('');

  const startYear = years.includes(1997) ? 1997 : years[0];

  $('yearSelect').value = startYear;
  $('yearSlider').min = years[0];
  $('yearSlider').max = years[years.length - 1];
  $('yearSlider').value = startYear;

  $('minYearLabel').textContent = years[0];
  $('maxYearLabel').textContent = years[years.length - 1];

  $('areaSelect').innerHTML = areas
    .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    .join('');

  $('areaSelect').value = areas.includes('World')
    ? 'World'
    : areas[0];

  $('cropSelect').innerHTML = items
    .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    .join('');

  $('cropSelect').value = items.includes('Wheat')
    ? 'Wheat'
    : items[0];
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}

function colorForArea(name) {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }

  return `hsla(${hash % 360}, 58%, 48%, 0.68)`;
}

function buildCharts() {
  scatterChart = new window.Chart($('scatterChart'), {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Areas',
        data: [],
        backgroundColor: [],
        borderColor: [],
        hoverBackgroundColor: '#e6a35c'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c =>
              `${c.raw.area}: harvested area ${fmt.format(c.raw.x)} ha; ` +
              `yield ${fmtYield.format(c.raw.y)} kg/ha; ` +
              `production ${fmt.format(c.raw.production)} t`
          }
        }
      },
      scales: {
        x: {
          type: 'logarithmic',
          title: {
            display: true,
            text: 'Area harvested (ha)'
          },
          ticks: { callback: v => compact(v) },
          grid: { color: '#edf1f5' }
        },
        y: {
          title: {
            display: true,
            text: 'Yield (kg/ha)'
          },
          grid: { color: '#edf1f5' }
        }
      }
    }
  });

  lineChart = new window.Chart($('lineChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Area harvested (ha)',
          data: [],
          borderColor: '#6eb8ac',
          backgroundColor: '#6eb8ac',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: .25,
          yAxisID: 'y'
        },
        {
          label: 'Production (tonnes)',
          data: [],
          borderColor: '#4f7fb5',
          backgroundColor: '#4f7fb5',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: .25,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            boxWidth: 7,
            font: { size: 10 }
          }
        },
        tooltip: {
          callbacks: {
            label: c =>
              `${c.dataset.label}: ${fmt.format(c.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8 }
        },
        y: {
          position: 'left',
          title: {
            display: true,
            text: 'Area harvested (ha)'
          },
          ticks: { callback: compact },
          grid: { color: '#edf1f5' }
        },
        y1: {
          position: 'right',
          title: {
            display: true,
            text: 'Production (tonnes)'
          },
          ticks: { callback: compact },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function compact(v) {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v;
}

function updateDashboard() {
  const year = Number($('yearSelect').value);
  const area = $('areaSelect').value;
  const crop = $('cropSelect').value;

  $('yearLabel').textContent = year;

  const yearRows = records.filter(d =>
    d.year === year &&
    d.item === crop &&
    d.areaHarvested > 0 &&
    d.yieldValue !== null &&
    d.yieldValue >= 0
  );

  const points = yearRows
    .filter(d => d.area !== 'World')
    .map(d => ({
      x: d.areaHarvested,
      y: d.yieldValue,
      r: Math.max(
        4,
        Math.min(
          14,
          Math.sqrt(Math.max(0, d.production || 0)) / 180
        )
      ),
      area: d.area,
      production: d.production || 0,
      backgroundColor: colorForArea(d.area),
      borderColor: colorForArea(d.area)
    }))
    .filter(d => d.x > 0 && Number.isFinite(d.y));

  scatterChart.data.datasets[0].data = points;
  scatterChart.data.datasets[0].backgroundColor =
    points.map(d => d.backgroundColor);
  scatterChart.data.datasets[0].borderColor =
    points.map(d => d.borderColor);
  scatterChart.update();

  $('scatterCount').textContent = `${points.length} areas`;

  const trend = records
    .filter(d => d.area === area && d.item === crop)
    .sort((a, b) => a.year - b.year);

  lineChart.data.labels = trend.map(d => d.year);
  lineChart.data.datasets[0].data =
    trend.map(d => d.areaHarvested);
  lineChart.data.datasets[1].data =
    trend.map(d => d.production);
  lineChart.update();

  const selected = records.find(d =>
    d.area === area &&
    d.year === year &&
    d.item === crop
  );

  $('areaKpi').textContent =
    selected && selected.areaHarvested !== null
      ? fmt.format(selected.areaHarvested)
      : 'No data';

  $('productionKpi').textContent =
    selected && selected.production !== null
      ? fmt.format(selected.production)
      : 'No data';

  $('yieldKpi').textContent =
    selected && selected.yieldValue !== null
      ? fmtYield.format(selected.yieldValue)
      : 'No data';
}
