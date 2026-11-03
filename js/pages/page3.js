// PAGE 3 - Trends Over Time: "How has production changed since 1961?"
// Self-starting (works as a <script> tag or via main.js `import './pages/page3.js'`). It finds its own data.
// Needs in index.html:   <header class="text"> ... #p3-takeaway ... </header>   and   <div id="p3-root" class="viz"></div>
// Data: data.csv with columns  region, crop, year, production   (plus any others - they are ignored)
(function () {
  if (window.__page3Started) return;
  window.__page3Started = true;
  if (typeof d3 === "undefined") { console.error("[page3] d3 did not load - the d3 <script> must come before this file"); return; }

  // paths tried in order (relative to index.html). Put data.csv in ONE of these places.
  const URLS = ["data/data.csv", "data.csv", "/data/data.csv", "/data.csv", "data/cleaned_data.csv", "data/page3_data.csv", "page3_data.csv"];
  const REGION_ORDER = ["Asia", "Americas", "Europe", "Africa", "Oceania"];
  const REGION_COLOR = { Asia: "var(--c1)", Americas: "var(--c2)", Europe: "var(--c3)", Africa: "var(--c4)", Oceania: "var(--c5)" };
  const CROP_COLOR = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)", "var(--c7)"];
  const OTHER = "All other crops";
  const short = s => s.replace(/, fresh n\.e\.c\./, "").replace(", fresh", "");
  const fmtMt = v => d3.format(v >= 100 ? ",.0f" : v >= 1 ? ",.1f" : ",.2f")(v);

  const pick = d => ({ region: d.region, crop: d.crop, year: +d.year, production: +(d.production ?? d["production (tonnes"] ?? d["production (tonnes)"]) });
  async function loadRows() {
    for (const url of URLS) {
      try {
        const rows = await d3.csv(url, pick);
        if (rows.length && rows[0].crop !== undefined && rows[0].region !== undefined) { console.log("[page3] data from", url, rows.length, "rows"); return rows; }
      } catch (e) { /* try the next path */ }
    }
    throw new Error("could not find data.csv with columns region, crop, year, production. Tried: " + URLS.join(", "));
  }

  function render(rows) {
    const root = document.getElementById("p3-root"), sec = document.getElementById("p3"), text = sec.querySelector(".text") || sec.querySelector("header");
    const q = s => sec.querySelector(s);
    const say = msg => { const t = document.getElementById("p3-takeaway"); if (t) t.textContent = msg; };

    // ---- left column: intro + controls; right column: chart ----
    text.insertAdjacentHTML("beforeend", `
      <p class="intro">Global crop production grew from about 2,500 million tonnes in 1961 to nearly 9,800 million tonnes in 2024, almost four times as much.
        <b>Asia now grows half of the world's output</b>, up from 35%, while <b>Europe's share fell from 30% to 11%</b>.
        Sugar cane is the largest single crop, at about 1,930 million tonnes in 2024.</p>
      <div class="controls">
        <div class="seg" data-g="by"><button data-v="crop" class="on">By crop</button><button data-v="region">By region</button></div>
        <div class="seg" data-g="mode"><button data-v="area" class="on">Stacked area</button><button data-v="line">Lines</button></div>
        <label><span class="filter-label">Region</span> <select class="filter"></select></label>
        <div class="row"><button class="btn reset" type="button">Reset zoom</button><button class="btn showall" type="button">Show all series</button></div>
      </div>`);
    root.innerHTML = `<div class="viz-title"></div><div class="chart"></div><div class="context"></div>
      <p class="hint">Drag on this small chart to zoom</p><div class="legend"></div>`;
    const tipEl = d3.select("body").append("div").attr("class", "p3-tip").style("display", "none");
    const tooltip = {
      show(html, ev) {
        tipEl.html(html).style("display", "block"); const w = tipEl.node().offsetWidth;
        tipEl.style("left", Math.min(ev.clientX + 14, innerWidth - w - 10) + "px").style("top", Math.max(8, ev.clientY - 10) + "px");
      },
      hide() { tipEl.style("display", "none"); }
    };

    // ---- reshape: cube[crop][region] = Float64Array(years) in million tonnes ----
    const years = d3.range(d3.min(rows, d => d.year), d3.max(rows, d => d.year) + 1), N = years.length, Y0 = years[0], Y1 = years[N - 1];
    const regions = [...new Set(rows.map(r => r.region))].sort((a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b));
    const cube = new Map();
    for (const r of rows) {
      if (!(r.production > 0)) continue;
      if (!cube.has(r.crop)) cube.set(r.crop, new Map(regions.map(g => [g, new Float64Array(N)])));
      cube.get(r.crop).get(r.region)[r.year - Y0] += r.production / 1e6;
    }
    const total = c => d3.sum([...cube.get(c).values()], a => d3.sum(a));
    const crops = [...cube.keys()].sort((a, b) => total(b) - total(a));
    const TOP = crops.slice(0, 7);                         // fixed top 7 -> a crop keeps its colour whatever the filter
    const S = { by: "crop", mode: "area", filter: "All regions", hidden: new Set(), hover: null, dom: [Y0, Y1] };
    const sumArrays = list => { const o = new Float64Array(N); list.forEach(a => { for (let i = 0; i < N; i++) o[i] += a[i]; }); return o; };

    function buildSeries() {
      if (S.by === "crop") {
        const rs = S.filter === "All regions" ? regions : [S.filter];
        const vals = c => sumArrays(rs.map(g => cube.get(c).get(g)));
        const out = TOP.map((c, i) => ({ key: c, label: short(c), color: CROP_COLOR[i], values: vals(c) }));
        out.push({ key: OTHER, label: OTHER, color: "var(--c-other)", values: sumArrays(crops.slice(7).map(vals)) });
        return out;
      }
      const cs = S.filter === "All crops" ? crops : [S.filter];
      return regions.map(g => ({ key: g, label: g, color: REGION_COLOR[g] || "var(--c-other)", values: sumArrays(cs.map(c => cube.get(c).get(g))) }));
    }

    // ---- svg skeleton (viewBox: scales with the container, so the chart always fills the right column) ----
    const W = 800, H = 420, M = { l: 52, t: 26, r: 12, b: 28 }, iw = W - M.l - M.r, ih = H - M.t - M.b;
    const svg = d3.select(q(".chart")).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    svg.append("defs").append("clipPath").attr("id", "p3-clip").append("rect").attr("width", iw).attr("height", ih + 2).attr("y", -1);
    const g = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
    const gGrid = g.append("g").attr("class", "gridl"), gx = g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`), gy = g.append("g").attr("class", "axis");
    const plot = g.append("g").attr("clip-path", "url(#p3-clip)");
    g.append("text").attr("class", "ylab").attr("x", -M.l + 2).attr("y", -12).text("Million tonnes");
    const cross = g.append("line").attr("y1", 0).attr("y2", ih).attr("stroke", "#1c1c1a").attr("stroke-opacity", .4).style("display", "none").style("pointer-events", "none");
    const hit = g.append("rect").attr("width", iw).attr("height", ih).attr("fill", "transparent");

    const CH = 80, csvg = d3.select(q(".context")).append("svg").attr("viewBox", `0 0 ${W} ${CH + 24}`);
    const cg = csvg.append("g").attr("transform", `translate(${M.l},4)`);
    const cx = d3.scaleLinear([Y0, Y1], [0, iw]), cy = d3.scaleLinear().range([CH, 0]);
    const cLayers = cg.append("g");
    cg.append("g").attr("class", "axis").attr("transform", `translate(0,${CH})`).call(d3.axisBottom(cx).tickFormat(d3.format("d")).ticks(10));
    const brush = d3.brushX().extent([[0, 0], [iw, CH]]).on("brush end", ev => {
      if (!ev.sourceEvent) return;                         // ignore moves made by code
      if (ev.selection) { const [a, b] = ev.selection.map(cx.invert).map(Math.round); S.dom = b > a ? [a, b] : [Y0, Y1]; } else S.dom = [Y0, Y1];
      draw(false);
    });
    const gBrush = cg.append("g").call(brush);
    gBrush.on("dblclick", resetZoom);

    // ---- drawing ----
    let series = [];
    const peak = (vis, i) => S.mode === "area" ? d3.sum(vis, s => s.values[i]) : d3.max(vis, s => s.values[i]) || 0;
    function layersFor(vis, xs, ys, idx) {
      const rowsIn = idx.map(i => { const o = { year: years[i] }; vis.forEach(s => o[s.key] = s.values[i]); return o; });
      if (S.mode === "area") {
        const a = d3.area().x(d => xs(d.data.year)).y0(d => ys(d[0])).y1(d => ys(d[1])).curve(d3.curveMonotoneX);
        return d3.stack().keys(vis.map(s => s.key))(rowsIn).map(l => ({ key: l.key, d: a(l) }));
      }
      return vis.map(s => ({ key: s.key, d: d3.line().x(r => xs(r.year)).y(r => ys(r[s.key])).curve(d3.curveMonotoneX)(rowsIn) }));
    }
    function paint(sel, L, thin) {
      const col = k => series.find(s => s.key === k).color;
      sel.selectAll("path").data(L, d => d.key).join("path").attr("class", "layer").attr("d", d => d.d)
        .style("fill", d => S.mode === "area" ? col(d.key) : "none").style("stroke", d => S.mode === "area" ? "#fbfaf7" : col(d.key))
        .attr("stroke-width", S.mode === "area" ? (thin ? 0 : 1) : (thin ? 1 : 2.4)).attr("stroke-linejoin", "round").attr("fill-opacity", S.mode === "area" ? .92 : 1);
    }
    const applyHover = () => plot.selectAll(".layer").classed("dim", d => S.hover && d.key !== S.hover);

    function draw(animate = false) {
      const vis = series.filter(s => !S.hidden.has(s.key));
      const [d0, d1] = S.dom, idx = d3.range(d0 - Y0, d1 - Y0 + 1);
      const x = d3.scaleLinear([d0, d1], [0, iw]);
      const y = d3.scaleLinear([0, (d3.max(idx, i => peak(vis, i)) || 1) * 1.04], [ih, 0]).nice();
      gy.call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")).tickSizeOuter(0));
      gGrid.call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat(""));
      gx.call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(Math.min(10, d1 - d0)).tickSizeOuter(0));
      paint(plot, layersFor(vis, x, y, idx));

      const tot = d3.range(N).map(i => d3.sum(vis, s => s.values[i]));
      cy.domain([0, d3.max(tot) || 1]);
      cLayers.selectAll("path").data([tot]).join("path").attr("fill", "var(--c-other)").attr("fill-opacity", .45)
        .attr("d", d3.area().x((d, i) => cx(years[i])).y0(CH).y1(d => cy(d)));

      d3.select(q(".legend")).selectAll("button").data(series, d => d.key).join("button").attr("type", "button")
        .classed("off", d => S.hidden.has(d.key)).html(d => `<i style="background:${d.color}"></i>${d.label}`)
        .on("click", (_, d) => { if (S.hidden.has(d.key)) S.hidden.delete(d.key); else if (S.hidden.size < series.length - 1) S.hidden.add(d.key); draw(true); })
        .on("dblclick", (_, d) => { S.hidden = new Set(series.filter(s => s.key !== d.key).map(s => s.key)); draw(true); })
        .on("mouseenter", (_, d) => { S.hover = d.key; applyHover(); }).on("mouseleave", () => { S.hover = null; applyHover(); });
      applyHover();

      const a = d3.sum(vis, s => s.values[d0 - Y0]), b = d3.sum(vis, s => s.values[d1 - Y0]);
      const what = vis.length === series.length ? "All series combined" : `${vis.length} selected series`;
      say(a > 0 ? `Takeaway: ${what.toLowerCase()} grew ${(b / a).toFixed(1)}× between ${d0} and ${d1} (${fmtMt(a)} → ${fmtMt(b)} million tonnes).` : "No series selected.");
      q(".viz-title").textContent = `Production by ${S.by} (million tonnes), ${d0}–${d1}`;

      hit.on("mousemove", ev => {
        if (!vis.length) return;
        const yr = Math.max(d0, Math.min(d1, Math.round(x.invert(d3.pointer(ev, g.node())[0]))));
        cross.style("display", null).attr("x1", x(yr)).attr("x2", x(yr));
        const list = vis.map(s => ({ s, v: s.values[yr - Y0] })).sort((p, o) => o.v - p.v);
        const rowsH = list.map(o => `<div class="r"><span><i style="background:${o.s.color.startsWith("var") ? getComputedStyle(sec).getPropertyValue(o.s.color.slice(4, -1)) : o.s.color}"></i>${o.s.label}</span><b>${fmtMt(o.v)}</b></div>`).join("");
        const totH = S.mode === "area" ? `<div class="r" style="border-top:1px solid rgba(255,255,255,.3);margin-top:4px;padding-top:4px"><span>Total</span><b>${fmtMt(d3.sum(list, o => o.v))}</b></div>` : "";
        tooltip.show(`<b>${yr}</b> · million tonnes${rowsH}${totH}`, ev);
      }).on("mouseleave", () => { cross.style("display", "none"); tooltip.hide(); });
    }

    // ---- controls ----
    function setFilterOptions() {
      const byCrop = S.by === "crop";
      q(".filter-label").textContent = byCrop ? "Region" : "Crop";
      const opts = byCrop ? ["All regions", ...regions] : ["All crops", ...crops];
      S.filter = opts[0];
      d3.select(q(".filter")).selectAll("option").data(opts).join("option").attr("value", d => d).text(short);
      q(".filter").value = S.filter;
    }
    function rebuild(animate) { series = buildSeries(); draw(animate); }
    function resetZoom() { S.dom = [Y0, Y1]; gBrush.call(brush.move, null); draw(true); }
    function seg(group, key, after) {
      sec.querySelectorAll(`[data-g="${group}"] button`).forEach(b => b.addEventListener("click", () => {
        S[key] = b.dataset.v;
        sec.querySelectorAll(`[data-g="${group}"] button`).forEach(o => o.classList.toggle("on", o === b));
        after();
      }));
    }
    seg("by", "by", () => { S.hidden.clear(); setFilterOptions(); rebuild(false); });
    seg("mode", "mode", () => draw(false));
    q(".filter").addEventListener("change", e => { S.filter = e.target.value; S.hidden.clear(); rebuild(true); });
    q(".reset").addEventListener("click", resetZoom);
    q(".showall").addEventListener("click", () => { S.hidden.clear(); draw(true); });
    setFilterOptions(); rebuild(false);
  }

  function start() {
    const t = document.getElementById("p3-takeaway");
    if (t) t.textContent = "Takeaway: loading data…";
    loadRows().then(render).catch(err => { if (t) t.textContent = "Page 3 error: " + err.message; console.error("[page3]", err); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
