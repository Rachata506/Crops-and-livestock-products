
export async function init(data, root) {
    root.innerHTML = "";
  
    const style = document.createElement("style");
    style.textContent = `
      #p1 {
        --green: #17613c;
        --ink: #202622;
        --muted: #607067;
        font-family: Arial, Helvetica, sans-serif;
        color: var(--ink);
        background: #faf9f6;
        min-height: 100vh;
        padding: 35px 3% 65px;
        box-sizing: border-box;
      }
  
      #p1 * { box-sizing: border-box; }
  
      #p1 .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
        gap: 5%;
        width: 100%;
        max-width: 1450px;
        margin: 0 auto;
        align-items: start;
      }
  
      #p1 .intro {
        padding-top: 15px;
        min-width: 0;
      }
  
      #p1 h1 {
        font-size: clamp(55px, 5.8vw, 90px);
        line-height: 1.06;
        font-weight: 400;
        letter-spacing: -4px;
        margin: 0 0 25px;
      }
  
      #p1 .subtitle {
        font-size: 18px;
        color: var(--muted);
        margin-bottom: 35px;
      }
  
      #p1 .line {
        width: 55px;
        height: 4px;
        background: var(--green);
        margin-bottom: 35px;
      }
  
      #p1 .description {
        font-size: 20px;
        line-height: 1.8;
        color: #414941;
        max-width: 540px;
        margin: 0;
      }
  
      #p1 .charts {
        display: flex;
        flex-direction: column;
        gap: 24px;
        min-width: 0;
        width: 100%;
      }
  
      #p1 .chart-card {
        border: 1px solid #dce9df;
        border-radius: 18px;
        padding: 24px;
        background: white;
        width: 100%;
      }
  
      #p1 .chart-head {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        align-items: flex-start;
      }
  
      #p1 .chart-title {
        font-size: 19px;
        font-weight: 700;
        margin: 0;
      }
  
      #p1 .chart-note {
        font-size: 12px;
        color: var(--muted);
        margin-top: 8px;
      }
  
      #p1 .chart-value {
        font-size: 27px;
        font-weight: 700;
        color: var(--green);
        text-align: right;
        white-space: nowrap;
      }
  
      #p1 .chart-year {
        font-size: 12px;
        color: var(--muted);
        text-align: right;
        margin-top: 7px;
      }
  
      #p1 .chart-svg {
        width: 100%;
        height: 165px;
        display: block;
        overflow: visible;
        margin-top: 20px;
        cursor: crosshair;
      }
  
      #p1 .chart-grid {
        stroke: #e4eae5;
        stroke-width: 1;
      }
  
      #p1 .chart-axis {
        font-size: 11px;
        fill: #85918a;
      }
  
      #p1 .chart-hover-line {
        stroke: #9ca9a0;
        stroke-width: 1;
        stroke-dasharray: 4 4;
        pointer-events: none;
      }
  
      #p1 .chart-hover-dot {
        fill: white;
        stroke: var(--green);
        stroke-width: 3;
        pointer-events: none;
      }
  
      @media (max-width: 850px) {
        #p1 { padding: 30px 5% 65px; }
        #p1 .layout {
          grid-template-columns: 1fr;
          gap: 40px;
        }
        #p1 .intro { padding-top: 0; }
        #p1 h1 {
          font-size: clamp(48px, 9vw, 75px);
          letter-spacing: -3px;
        }
        #p1 .description { font-size: 17px; }
      }
    `;
  
    root.appendChild(style);
  
    const page = document.createElement("section");
    page.id = "p1";
  
    const cards = [
      {
        title: "Global Production Index",
        note: "Cereals, primary · 1961 = 100",
        id: "production"
      },
      {
        title: "Global Harvested Area",
        note: "Cereals, primary · million hectares",
        id: "area"
      },
      {
        title: "Global Yield",
        note: "Cereals, primary · tonnes per hectare",
        id: "yield"
      }
    ];
  
    page.innerHTML = `
      <div class="layout">
        <div class="intro">
          <h1>Crops &<br>Livestock<br>Products</h1>
  
          <div class="subtitle">
            An exploration of global agricultural production
          </div>
  
          <div class="line"></div>
  
          <p class="description">
            How has agricultural production changed around the world
            since 1961, and what drives the differences between
            countries? Does growth come from more land or higher yield?
          </p>
        </div>
  
        <div class="charts">
          ${cards.map(card => `
            <div class="chart-card">
              <div class="chart-head">
                <div>
                  <div class="chart-title">${card.title}</div>
                  <div class="chart-note">${card.note}</div>
                </div>
                <div>
                  <div class="chart-value" id="p1-${card.id}-value">—</div>
                  <div class="chart-year" id="p1-${card.id}-year">
                    Loading...
                  </div>
                </div>
              </div>
              <svg class="chart-svg" id="p1-${card.id}-chart"></svg>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  
    root.appendChild(page);
  
    const NS = "http://www.w3.org/2000/svg";
  
    function svgElement(tag, attributes = {}) {
      const el = document.createElementNS(NS, tag);
  
      for (const [key, value] of Object.entries(attributes)) {
        el.setAttribute(key, String(value));
      }
  
      return el;
    }
  
    function drawChart(svg, points, options) {
      svg.innerHTML = "";
  
      const width = 520;
      const height = 165;
      const left = 15;
      const right = 10;
      const top = 10;
      const bottom = 25;
  
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
  
      if (!points.length) return;
  
      const years = points.map(p => p.year);
      const values = points.map(p => p.value);
  
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      const maxValue = Math.max(...values) * 1.08;
  
      const x = year =>
        left +
        ((year - minYear) / (maxYear - minYear || 1)) *
        (width - left - right);
  
      const y = value =>
        height - bottom -
        (value / (maxValue || 1)) *
        (height - top - bottom);
  
      for (let i = 0; i <= 3; i++) {
        const gy = top + i * (height - top - bottom) / 3;
  
        svg.appendChild(svgElement("line", {
          x1: left,
          y1: gy,
          x2: width - right,
          y2: gy,
          class: "chart-grid"
        }));
      }
  
      const path = points.map((p, i) =>
        `${i === 0 ? "M" : "L"} ${x(p.year)} ${y(p.value)}`
      ).join(" ");
  
      const areaPath =
        path +
        ` L ${x(points[points.length - 1].year)} ${height - bottom}` +
        ` L ${x(points[0].year)} ${height - bottom} Z`;
  
      svg.appendChild(svgElement("path", {
        d: areaPath,
        fill: "rgba(23,97,60,0.09)"
      }));
  
      svg.appendChild(svgElement("path", {
        d: path,
        fill: "none",
        stroke: options.color,
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke"
      }));
  
      const ticks = [
        ...new Set([minYear, 1980, 2000, maxYear])
      ].filter(year => year >= minYear && year <= maxYear);
  
      for (const year of ticks) {
        const label = svgElement("text", {
          x: x(year),
          y: height - 5,
          "text-anchor":
            year === minYear ? "start" :
            year === maxYear ? "end" : "middle",
          class: "chart-axis"
        });
  
        label.textContent = year;
        svg.appendChild(label);
      }
  
      const hoverLine = svgElement("line", {
        y1: top,
        y2: height - bottom,
        class: "chart-hover-line",
        visibility: "hidden"
      });
  
      const hoverDot = svgElement("circle", {
        r: 5,
        class: "chart-hover-dot",
        visibility: "hidden"
      });
  
      svg.appendChild(hoverLine);
      svg.appendChild(hoverDot);
  
      const valueEl = page.querySelector(options.valueSelector);
      const yearEl = page.querySelector(options.yearSelector);
  
      function update(index, showMarker) {
        const point = points[index];
  
        valueEl.textContent = options.format(point.value);
        yearEl.textContent = `As of ${point.year}`;
  
        hoverLine.setAttribute("x1", x(point.year));
        hoverLine.setAttribute("x2", x(point.year));
  
        hoverDot.setAttribute("cx", x(point.year));
        hoverDot.setAttribute("cy", y(point.value));
  
        hoverLine.setAttribute(
          "visibility",
          showMarker ? "visible" : "hidden"
        );
  
        hoverDot.setAttribute(
          "visibility",
          showMarker ? "visible" : "hidden"
        );
      }
  
      update(points.length - 1, false);
  
      svg.addEventListener("pointermove", event => {
        const rect = svg.getBoundingClientRect();
  
        const mouseX =
          (event.clientX - rect.left) / rect.width * width;
  
        let closest = 0;
        let smallestDistance = Infinity;
  
        points.forEach((point, index) => {
          const distance = Math.abs(x(point.year) - mouseX);
  
          if (distance < smallestDistance) {
            smallestDistance = distance;
            closest = index;
          }
        });
  
        update(closest, true);
      });
  
      svg.addEventListener("pointerleave", () => {
        update(points.length - 1, false);
      });
    }
  
    try {
      const response = await fetch("./data_page5/agriculture.json");
  
      if (!response.ok) {
        throw new Error(`Cannot load data: HTTP ${response.status}`);
      }
  
      const dataset = await response.json();
  
      const worldIndex = dataset.areas.indexOf("World");
      const cerealIndex = dataset.items.indexOf("Cereals, primary");
  
      if (worldIndex === -1 || cerealIndex === -1) {
        throw new Error(
          "World or Cereals, primary not found in dataset"
        );
      }
  
      const records = dataset.records
        .filter(row =>
          row[0] === worldIndex &&
          row[2] === cerealIndex &&
          row[1] >= 1961 &&
          row[1] <= 2024
        )
        .sort((a, b) => a[1] - b[1]);
  
      const production = records
        .filter(row => Number.isFinite(row[4]))
        .map(row => ({
          year: row[1],
          value: row[4]
        }));
  
      const area = records
        .filter(row => Number.isFinite(row[3]))
        .map(row => ({
          year: row[1],
          value: row[3] / 1000000
        }));
  
      const yieldData = records
        .filter(row => Number.isFinite(row[5]))
        .map(row => ({
          year: row[1],
          value: row[5] / 1000
        }));
  
      if (!production.length || !area.length || !yieldData.length) {
        throw new Error("No usable cereal data found");
      }
  
      const baseProduction =
        production.find(p => p.year === 1961)?.value;
  
      if (!baseProduction) {
        throw new Error("1961 production baseline not available");
      }
  
      const productionIndex = production.map(p => ({
        year: p.year,
        value: p.value / baseProduction * 100
      }));
  
      drawChart(
        page.querySelector("#p1-production-chart"),
        productionIndex,
        {
          valueSelector: "#p1-production-value",
          yearSelector: "#p1-production-year",
          format: value => value.toFixed(1),
          color: "#17613c"
        }
      );
  
      drawChart(
        page.querySelector("#p1-area-chart"),
        area,
        {
          valueSelector: "#p1-area-value",
          yearSelector: "#p1-area-year",
          format: value =>
            value.toLocaleString("en-US", {
              maximumFractionDigits: 0
            }) + " Mha",
          color: "#238550"
        }
      );
  
      drawChart(
        page.querySelector("#p1-yield-chart"),
        yieldData,
        {
          valueSelector: "#p1-yield-value",
          yearSelector: "#p1-yield-year",
          format: value => value.toFixed(2) + " t/ha",
          color: "#53ad78"
        }
      );
  
    } catch (error) {
      console.error("Page 1 data error:", error);
  
      for (const selector of [
        "#p1-production-year",
        "#p1-area-year",
        "#p1-yield-year"
      ]) {
        const element = page.querySelector(selector);
        if (element) element.textContent = "Data unavailable";
      }
    }
  }
    