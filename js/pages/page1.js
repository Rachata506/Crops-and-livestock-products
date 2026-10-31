// Standalone dashboard interactions. Chart data below is illustrative, not live FAOSTAT data.
const data = [
  { year: 2010, value: 100 }, { year: 2012, value: 103 },
  { year: 2014, value: 108 }, { year: 2016, value: 111 },
  { year: 2018, value: 115 }, { year: 2020, value: 119 },
  { year: 2021, value: 118 }, { year: 2022, value: 122 },
  { year: 2024, value: 127 }
];

function drawChart() {
  const line = document.getElementById('line');
  const area = document.getElementById('area');
  const point = document.getElementById('point');
  if (!line || !area || !point) return;

  const width = 900, height = 260, min = 95, max = 132;
  const coords = data.map((d, i) => [
    i / (data.length - 1) * width,
    height - (d.value - min) / (max - min) * height
  ]);
  const path = coords.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  line.setAttribute('d', path);
  area.setAttribute('d', `${path} L${width},${height} L0,${height} Z`);
  point.setAttribute('cx', coords.at(-1)[0]);
  point.setAttribute('cy', coords.at(-1)[1]);
  document.getElementById('latest').textContent = data.at(-1).value;
}

function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const amount = maxScroll > 0 ? window.scrollY / maxScroll * 100 : 0;
  document.getElementById('progress').style.width = `${amount}%`;
}

document.addEventListener('DOMContentLoaded', () => {
  drawChart();
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
});
