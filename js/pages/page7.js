// Page 7: reading progress and expandable data-processing notes
document.addEventListener('DOMContentLoaded', () => {
  const progress = document.getElementById('progress');

  function updateProgress() {
    if (!progress) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const percent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    progress.style.width = `${percent}%`;
  }

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
});
