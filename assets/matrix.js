// Matrix-Rain: Canvas-basiert, requestAnimationFrame, pausiert bei inaktivem Tab,
// blendet beim Runterscrollen aus. Respektiert prefers-reduced-motion.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("matrix-canvas");
  if (!canvas || reduce) { return; }

  var ctx = canvas.getContext("2d");
  var glyphs = "01".split("");
  var fontSize = 16;
  var columns, drops;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(0).map(function () {
      return Math.floor(Math.random() * (canvas.height / fontSize));
    });
  }
  resize();
  window.addEventListener("resize", resize);

  var rafId = null;
  var lastDraw = 0;
  var interval = 55; // ms zwischen Frames -> dezente Geschwindigkeit

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    if (now - lastDraw < interval) { return; }
    lastDraw = now;

    // Halbtransparenter schwarzer Layer erzeugt den Schweif-Effekt
    ctx.fillStyle = "rgba(10, 12, 16, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00FF41";
    ctx.font = fontSize + "px 'JetBrains Mono', monospace";

    for (var i = 0; i < drops.length; i++) {
      var text = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  function start() { if (rafId === null) { rafId = requestAnimationFrame(draw); } }
  function stop() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

  // Pausiert, wenn der Tab nicht sichtbar ist
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stop(); } else { start(); }
  });

  // Blendet beim Scrollen aus, sobald der Hero verlassen wird
  window.addEventListener("scroll", function () {
    var opacity = Math.max(0, 0.28 - window.scrollY / 900);
    canvas.style.opacity = opacity.toFixed(3);
  }, { passive: true });

  start();
})();
