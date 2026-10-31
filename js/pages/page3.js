let D, years, Y0, Y1;
const PAL = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac", "#1b9e77", "#7570b3"];
const S = { view: "crop", mode: "area", item: null, hidden: new Set(), focus: null, hover: null, dom: null };
const color = d3.scaleOrdinal(PAL);
const M = { t: 10, r: 16, b: 26, l: 48 }, FH = 340, CH = 60, GAP = 34;
let cur, x, y, x2, y2, gF, gC, gBrush, brush, iw, W;

function series() {
  const crop = S.view === "crop", names = crop ? D.crops.names : D.regions.names;
  const get = crop ? n => D.crops.values[n] : n => D.regions.items[S.item][n];
  const rows = years.map((yr, i) => { const r = { year: yr }; names.forEach(n => r[n] = (get(n)[i] || 0) / 1e6); return r; });
  return { names, rows };
}
const visible = () => cur.names.filter(n => !S.hidden.has(n));
const peak = (r, vis) => S.mode === "area" ? d3.sum(vis, k => r[k]) : d3.max(vis, k => r[k]) || 0;

function build() {
  W = Math.max(320, document.getElementById("chart").clientWidth - 12);
  iw = W - M.l - M.r;
  d3.select("#chart svg").remove();
  const svg = d3.select("#chart").insert("svg", ".tip").attr("width", W).attr("height", M.t + FH + GAP + CH + M.b);
  svg.append("defs").append("clipPath").attr("id", "clip").append("rect").attr("width", iw).attr("height", FH);
  x = d3.scaleLinear().range([0, iw]); y = d3.scaleLinear().range([FH, 0]);
  x2 = d3.scaleLinear().domain([Y0, Y1]).range([0, iw]); y2 = d3.scaleLinear().range([CH, 0]);
  gF = svg.append("g").attr("transform", `translate(${M.l},${M.t})`);
  gF.append("g").attr("class", "gridl"); gF.append("g").attr("class", "layers").attr("clip-path", "url(#clip)");
  gF.append("g").attr("class", "axis ax"); gF.append("g").attr("class", "axis ay");
  gF.append("text").attr("class", "ylab").attr("x", -M.l + 4).attr("y", -1).text("Million tonnes");
  const hv = gF.append("g").style("display", "none");
  hv.append("line").attr("y1", 0).attr("y2", FH).attr("stroke", "currentColor").attr("stroke-opacity", .4);
  gF.append("rect").attr("width", iw).attr("height", FH).attr("fill", "none").attr("pointer-events", "all")
    .on("mousemove", e => hover(e, hv)).on("mouseleave", () => { hv.style("display", "none"); d3.select("#tip").style("display", "none"); });
  gC = svg.append("g").attr("transform", `translate(${M.l},${M.t + FH + GAP})`);
  gC.append("g").attr("class", "layers");
  gC.append("g").attr("class", "axis").attr("transform", `translate(0,${CH})`).call(d3.axisBottom(x2).ticks(8).tickFormat(d3.format("d")));
  brush = d3.brushX().extent([[0, 0], [iw, CH]]).on("brush end", e => {
    if (e.selection) { const [a, b] = e.selection.map(x2.invert).map(Math.round); S.dom = b > a ? [a, b] : null; } else S.dom = null;
    drawFocus();
  });
  gBrush = gC.append("g").call(brush);
  if (S.dom) gBrush.call(brush.move, S.dom.map(x2));
}

function layers(vis, xs, ys, rows) {
  if (S.mode === "area") {
    const st = d3.stack().keys(vis)(rows), a = d3.area().x(d => xs(d.data.year)).y0(d => ys(d[0])).y1(d => ys(d[1])).curve(d3.curveMonotoneX);
    return st.map(s => ({ key: s.key, d: a(s) }));
  }
  return vis.map(k => ({ key: k, d: d3.line().x(r => xs(r.year)).y(r => ys(r[k])).curve(d3.curveMonotoneX)(rows) }));
}
function paint(g, L, thin) {
  g.selectAll("path").data(L, d => d.key).join("path").attr("class", "layer").attr("d", d => d.d)
    .attr("fill", d => S.mode === "area" ? color(d.key) : "none").attr("stroke", d => color(d.key))
    .attr("stroke-width", S.mode === "area" ? (thin ? 0 : .6) : (thin ? 1 : 2)).attr("stroke-linejoin", "round");
  highlight();
}
function highlight() {
  const f = S.hover || S.focus;
  d3.selectAll(".layer").style("opacity", d => f ? (d.key === f ? 1 : .12) : (S.mode === "area" ? .9 : 1));
  d3.selectAll("#legend button").classed("focus", function () { return this.dataset.k === S.focus; });
}

function drawContext() {
  const vis = visible();
  y2.domain([0, d3.max(cur.rows, r => peak(r, vis)) || 1]);
  paint(gC.select(".layers"), layers(vis, x2, y2, cur.rows), true);
}
function drawFocus() {
  const vis = visible(), dom = S.dom || [Y0, Y1];
  x.domain(dom);
  const inR = cur.rows.filter(r => r.year >= dom[0] && r.year <= dom[1]);
  y.domain([0, (d3.max(inR, r => peak(r, vis)) || 1) * 1.05]).nice();
  gF.select(".ax").attr("transform", `translate(0,${FH})`).call(d3.axisBottom(x).ticks(Math.min(10, dom[1] - dom[0])).tickFormat(d3.format("d")));
  gF.select(".ay").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")));
  gF.select(".gridl").call(d3.axisLeft(y).ticks(6).tickSize(-iw).tickFormat(""));
  paint(gF.select(".layers"), layers(vis, x, y, cur.rows));
  summary(vis, dom);
}
function summary(vis, dom) {
  const t = yr => d3.sum(vis, k => cur.rows[yr - Y0][k]), a = t(dom[0]), b = t(dom[1]);
  const what = vis.length === cur.names.length ? "All series combined" : `${vis.length} selected series`;
  document.getElementById("summary").innerHTML = vis.length && a > 0
    ? `${what}, <b>${dom[0]}</b> → <b>${dom[1]}</b>: <b>${d3.format(",.0f")(a)}</b> → <b>${d3.format(",.0f")(b)}</b> Mt (<b>${(b / a).toFixed(1)}×</b>)`
    : "No series selected.";
}

function hover(e, hv) {
  const vis = visible(); if (!vis.length) return;
  const [mx] = d3.pointer(e), yr = Math.max(x.domain()[0], Math.min(x.domain()[1], Math.round(x.invert(mx)))), r = cur.rows[yr - Y0];
  hv.style("display", null).select("line").attr("x1", x(yr)).attr("x2", x(yr));
  const rowsH = [...vis].sort((p, q) => r[q] - r[p]).map(k => `<div class="r"><span><i style="background:${color(k)}"></i>${k}</span><b>${d3.format(",.1f")(r[k])}</b></div>`).join("");
  const tot = S.mode === "area" ? `<div class="r" style="border-top:1px solid var(--grid);margin-top:4px;padding-top:4px"><span>Total</span><b>${d3.format(",.1f")(d3.sum(vis, k => r[k]))}</b></div>` : "";
  const tip = d3.select("#tip").style("display", "block").html(`<b>${yr}</b> · Mt${rowsH}${tot}`);
  const tw = tip.node().offsetWidth, px = M.l + x(yr) + 14;
  tip.style("left", (px + tw > W ? M.l + x(yr) - tw - 14 : px) + "px").style("top", "16px");
}

function drawLegend() {
  const lg = d3.select("#legend").html("");
  cur.names.forEach(n => {
    const b = lg.append("button").attr("data-k", n).classed("off", S.hidden.has(n)).html(`<i style="background:${color(n)}"></i>${n}`)
      .on("click", e => { if (e.shiftKey) return setFocus(n); S.hidden.has(n) ? S.hidden.delete(n) : S.hidden.add(n); if (S.focus === n) S.focus = null; refresh(); })
      .on("dblclick", () => { S.hidden.delete(n); setFocus(n); })
      .on("mouseenter", () => { S.hover = n; highlight(); }).on("mouseleave", () => { S.hover = null; highlight(); });
  });
}
function setFocus(n) { S.focus = S.focus === n ? null : n; S.hidden.delete(n); refresh(); }
function refresh() { drawLegend(); drawContext(); drawFocus(); }

function setData() {
  cur = series(); color.domain(cur.names); S.hidden.clear(); S.focus = null; S.hover = null;
  document.getElementById("itemWrap").style.display = S.view === "region" ? "" : "none";
  refresh();
}

// controls
const sel = d3.select("#itemSel");
sel.on("change", function () { S.item = this.value; setData(); });
d3.selectAll("#viewSeg button").on("click", function () { S.view = this.dataset.v; d3.selectAll("#viewSeg button").classed("on", function () { return this.dataset.v === S.view; }); setData(); });
d3.selectAll("#modeSeg button").on("click", function () { S.mode = this.dataset.m; d3.selectAll("#modeSeg button").classed("on", function () { return this.dataset.m === S.mode; }); refresh(); });
d3.select("#reset").on("click", () => { S.dom = null; gBrush.call(brush.move, null); });
d3.select("#showAll").on("click", () => { S.hidden.clear(); S.focus = null; refresh(); });
let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); refresh(); }, 150); });


// ---- load cleaned_data.csv (tidy: Area, Area_Type, Item, Item_Type, Year, Production_t) ----
function fromRows(rows) {
  rows.forEach(r => { r.Year = +r.Year; r.Production_t = +r.Production_t; });
  const years = [...new Set(rows.map(r => r.Year))].sort(d3.ascending), idx = new Map(years.map((yr, i) => [yr, i]));
  const arr = new Map();
  rows.forEach(r => { const k = r.Area + "|" + r.Item; if (!arr.has(k)) arr.set(k, new Array(years.length).fill(0)); arr.get(k)[idx.get(r.Year)] = r.Production_t; });
  const uniq = f => [...new Set(rows.filter(f).map(r => r.Item))], w = n => arr.get("World|" + n), last = years.length - 1;
  const topN = uniq(r => r.Item_Type === "Crop").filter(w).sort((a, b) => w(b)[last] - w(a)[last]).slice(0, 12);
  const regions = [...new Set(rows.filter(r => r.Area_Type === "Continent").map(r => r.Area))], items = {};
  [...uniq(r => r.Item_Type === "Group"), ...topN].forEach(n => { items[n] = {}; regions.forEach(g => items[n][g] = arr.get(g + "|" + n) || new Array(years.length).fill(0)); });
  return { years, crops: { names: topN, values: Object.fromEntries(topN.map(n => [n, w(n)])) }, regions: { names: regions, items } };
}
function init(rows) {
  D = fromRows(rows); years = D.years; Y0 = years[0]; Y1 = years[years.length - 1];
  S.item = Object.keys(D.regions.items)[0];
  sel.selectAll("option").data(Object.keys(D.regions.items)).join("option").attr("value", d => d).text(d => d);
  build(); setData();
}
// fetch works on a web server; on file:// it fails, so fall back to the embedded copy in cleaned_data.js
d3.csv("cleaned_data.csv").then(init, () => window.CLEAN_CSV
  ? init(d3.csvParse(window.CLEAN_CSV))
  : (document.getElementById("summary").textContent = "Could not load cleaned_data.csv"));