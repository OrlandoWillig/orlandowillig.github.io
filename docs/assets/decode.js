// Matrix-Decode-Effekt: Text "entschlüsselt" sich beim Scrollen ins Bild,
// Zeichen für Zeichen aus zufälligen Glyphen. Respektiert prefers-reduced-motion.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll(".decode-on-scroll, h1.title");
  if (reduce || els.length === 0) { return; }

  var glyphs = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ$#%&+-*/".split("");

  function randomGlyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)];
  }

  function decode(el) {
    var original = el.textContent;
    var length = original.length;
    var revealed = 0;
    var revealInterval = 110; // ms bis das nächste Zeichen fixiert wird
    var flickerInterval = 60; // ms zwischen Glyph-Wechseln
    var lastReveal = 0;
    var lastFlicker = 0;

    function tick(now) {
      if (now - lastReveal >= revealInterval) {
        lastReveal = now;
        revealed++;
      }
      if (now - lastFlicker >= flickerInterval) {
        lastFlicker = now;
        var out = "";
        for (var i = 0; i < length; i++) {
          out += (i < revealed || original[i] === " ") ? original[i] : randomGlyph();
        }
        el.textContent = out;
      }

      if (revealed <= length) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = original;
      }
    }
    requestAnimationFrame(tick);
  }

  if (!("IntersectionObserver" in window)) { return; }

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        obs.unobserve(entry.target);
        var delay = Number(entry.target.dataset.decodeDelay || 0);
        setTimeout(function () { decode(entry.target); }, delay);
      }
    });
  }, { threshold: 0.4 });

  els.forEach(function (el, i) {
    el.dataset.decodeDelay = i * 100;
    obs.observe(el);
  });
})();
