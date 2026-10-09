/* Video is decorative, silent and background-only. Pause when offscreen/hidden. */
(function () {
  'use strict';
  var film = document.getElementById('maharajaHeroVideo');
  if (!film) return;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { film.pause(); return; }
  film.muted = true;
  film.defaultMuted = true;
  film.playsInline = true;
  var inView = true;
  function updatePlayback() {
    if (document.hidden || !inView) { film.pause(); return; }
    var attempt = film.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(function () { /* Poster remains visible if autoplay is blocked. */ });
  }
  document.addEventListener('visibilitychange', updatePlayback);
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries.length) { inView = entries[0].isIntersecting; updatePlayback(); }
    }, {threshold:0.02});
    observer.observe(film);
  }
  updatePlayback();
})();
