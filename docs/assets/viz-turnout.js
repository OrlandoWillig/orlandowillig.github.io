// Visualisierungen der GSERM-Fallstudie: handgezeichnetes SVG, keine
// Fremdbibliothek — gleiches Vorgehen wie assets/graph.js. Farben und
// Typografie kommen aus styles.scss; hier wird nur Geometrie gerechnet.
// Daten: assets/data/*.json, einmalig aus results.rds exportiert
// (Final_Project/export_web.R).
(function () {
  "use strict";

  // Nur auf der Fallstudien-Seite aktiv.
  if (!document.getElementById("viz-gap")) { return; }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  // Serienfarben aus den CSS-Custom-Properties lesen — styles.scss bleibt
  // die einzige Quelle der Wahrheit.
  var css = getComputedStyle(document.documentElement);
  function cssVar(name, fallback) {
    var v = css.getPropertyValue(name).trim();
    return v || fallback;
  }
  var COLORS = {
    lasso: cssVar("--series-lasso", "#38bdf8"),
    rf:    cssVar("--series-rf", "#00ff41"),
    nn:    cssVar("--series-nn", "#f59e0b")
  };
  var MUTED = cssVar("--series-muted", "#6b7683");
  var NAMES = {
    lasso: "LASSO Logistic",
    rf: "Random Forest",
    nn: "Neural Network"
  };

  // ---------- SVG-Helfer ----------
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        n.setAttribute(k, attrs[k]);
      }
    }
    if (parent) { parent.appendChild(n); }
    return n;
  }

  function svgRoot(host, w, h, label, minWidth) {
    host.innerHTML = "";
    var s = el("svg", {
      viewBox: "0 0 " + w + " " + h,
      role: "img",
      "aria-label": label
    }, host);
    s.style.maxWidth = w + "px";
    // Breite Grafiken duerfen auf schmalen Displays nicht beliebig
    // herunterskalieren, sonst sind die Beschriftungen nicht mehr lesbar.
    // Stattdessen scrollt das umgebende Panel horizontal.
    if (minWidth) {
      s.style.minWidth = minWidth + "px";
      markScrollable(host);
    }
    return s;
  }

  // Blendet den Hinweis auf seitliches Scrollen nur ein, wenn er zutrifft.
  function markScrollable(host) {
    var body = host.closest(".viz-frame__body");
    if (!body) { return; }
    var hint = body.parentNode.querySelector(".viz-scroll-hint");
    var check = function () {
      var scrollable = body.scrollWidth > body.clientWidth + 1;
      if (hint) { hint.hidden = !scrollable; }
    };
    check();
    window.addEventListener("resize", check);
  }

  function label(parent, x, y, str, cls, anchor) {
    var t = el("text", { x: x, y: y, class: cls || "ax-text" }, parent);
    if (anchor) { t.setAttribute("text-anchor", anchor); }
    t.textContent = str;
    return t;
  }

  function tip(parent, str) {
    el("title", {}, parent).textContent = str;
  }

  function scale(d0, d1, r0, r1) {
    return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
  }

  function fmt(v, digits) {
    return v.toFixed(digits === undefined ? 4 : digits);
  }

  // ---------- 1. Beteiligungslücke je Land ----------
  function drawGap(data) {
    var host = document.getElementById("viz-gap");
    if (!host) { return; }

    var rows = data.rows;
    var W = 900, rowH = 24, padT = 34, padB = 36, padL = 128, padR = 62;
    var H = padT + rows.length * rowH + padB;
    var svg = svgRoot(host, W, H,
      "Offizielle und in der Befragung angegebene Wahlbeteiligung je EU-Land, " +
      "sortiert nach der Differenz", 640);

    var x = scale(0, 100, padL, W - padR);

    for (var v = 0; v <= 100; v += 20) {
      el("line", { x1: x(v), y1: padT - 12, x2: x(v), y2: H - padB + 4, class: "ax-grid" }, svg);
      label(svg, x(v), H - padB + 18, v + "%", "ax-text", "middle");
    }

    // EU-Referenzlinie
    el("line", {
      x1: x(data.euOfficial), y1: padT - 12, x2: x(data.euOfficial), y2: H - padB + 4,
      stroke: MUTED, "stroke-width": 1, "stroke-dasharray": "3 3"
    }, svg);
    label(svg, x(data.euOfficial), padT - 18, "EU " + data.euOfficial + " %", "ax-title", "middle");

    rows.forEach(function (r, i) {
      var y = padT + i * rowH + rowH / 2;
      var g = el("g", {}, svg);

      tip(g, r.name + ": offiziell " + r.official.toFixed(2) + " %, " +
             "Befragung " + r.survey.toFixed(1) + " % (+" + r.gap.toFixed(1) + " Punkte)");

      label(g, padL - 12, y + 3.5, r.name, "ax-text", "end");

      el("line", {
        x1: x(r.official), y1: y, x2: x(r.survey), y2: y,
        stroke: COLORS.rf, "stroke-width": 2, "stroke-opacity": 0.28
      }, g);

      el("circle", { cx: x(r.official), cy: y, r: 4.5, fill: MUTED }, g);
      el("circle", {
        cx: x(r.survey), cy: y, r: 4.5, fill: COLORS.rf,
        stroke: "#0a0c10", "stroke-width": 1
      }, g);

      label(g, x(r.survey) + 11, y + 3.5, "+" + r.gap.toFixed(1), "ax-title");
    });

    label(svg, padL, 16, "Wahlbeteiligung Europawahl 2024", "ax-title");

    var legend = document.getElementById("legend-gap");
    if (legend) {
      legend.innerHTML =
        '<span><i style="background:' + MUTED + '"></i>offiziell</span>' +
        '<span><i style="background:' + COLORS.rf + '"></i>in der Befragung angegeben</span>';
    }
  }

  // ---------- 2. Kennzahlen-Kacheln ----------
  function drawTiles(metrics) {
    var host = document.getElementById("viz-tiles");
    if (!host) { return; }

    var best = Math.max.apply(null, metrics.models.map(function (m) { return m.auc; }));

    metrics.models.forEach(function (m) {
      var isBest = m.auc === best;
      var card = document.createElement("div");
      card.className = "metric-tile" + (isBest ? " is-best" : "");
      card.style.setProperty("--accent", COLORS[m.key]);
      card.innerHTML =
        "<h3>" + NAMES[m.key] +
          (isBest ? '<span class="badge-best">beste AUC</span>' : "") + "</h3>" +
        '<span class="metric-value" data-target="' + m.auc + '">0.0000</span>' +
        '<span class="metric-label">AUC (Testset)</span>' +
        '<div class="metric-rows">' +
          "<div><span>Brier-Score</span><span>" + fmt(m.brier) + "</span></div>" +
          "<div><span>Bal. Accuracy</span><span>" + fmt(m.balAccuracy) + "</span></div>" +
          "<div><span>Schwelle (Youden)</span><span>" + fmt(m.threshold, 3) + "</span></div>" +
        "</div>";
      host.appendChild(card);
    });

    var values = host.querySelectorAll(".metric-value");
    if (reduce || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(values, function (n) {
        n.textContent = fmt(parseFloat(n.dataset.target));
      });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        obs.unobserve(e.target);
        var node = e.target, target = parseFloat(node.dataset.target), t0 = null;
        requestAnimationFrame(function step(now) {
          if (t0 === null) { t0 = now; }
          var k = Math.min((now - t0) / 900, 1);
          var eased = 1 - Math.pow(1 - k, 3);
          node.textContent = fmt(target * eased);
          if (k < 1) { requestAnimationFrame(step); }
        });
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(values, function (n) { obs.observe(n); });
  }

  // ---------- 3. ROC ----------
  function drawRoc(roc, metrics) {
    var host = document.getElementById("viz-roc");
    if (!host) { return; }

    var W = 440, H = 380, padL = 46, padR = 14, padT = 16, padB = 44;
    var svg = svgRoot(host, W, H, "ROC-Kurven der drei Modelle auf dem Testset");
    var x = scale(0, 1, padL, W - padR), y = scale(0, 1, H - padB, padT);

    for (var v = 0; v <= 1.0001; v += 0.25) {
      el("line", { x1: padL, y1: y(v), x2: W - padR, y2: y(v), class: "ax-grid" }, svg);
      label(svg, padL - 8, y(v) + 3.5, v.toFixed(2), "ax-text", "end");
      label(svg, x(v), H - padB + 16, v.toFixed(2), "ax-text", "middle");
    }

    el("line", {
      x1: x(0), y1: y(0), x2: x(1), y2: y(1),
      class: "ax-line", "stroke-dasharray": "4 4"
    }, svg);

    roc.forEach(function (curve) {
      var d = curve.points.map(function (p, i) {
        return (i ? "L" : "M") + x(p[0]).toFixed(2) + " " + y(p[1]).toFixed(2);
      }).join(" ");
      var path = el("path", {
        d: d, fill: "none", stroke: COLORS[curve.key],
        "stroke-width": 1.9, "stroke-linejoin": "round"
      }, svg);
      tip(path, NAMES[curve.key]);
    });

    label(svg, padL, H - 8, "1 – Spezifität", "ax-title");
    var yl = label(svg, 0, 0, "Sensitivität", "ax-title");
    yl.setAttribute("transform", "translate(13," + ((H - padB + padT) / 2) + ") rotate(-90)");
    yl.setAttribute("text-anchor", "middle");

    var legend = document.getElementById("legend-roc");
    if (legend) {
      legend.innerHTML = metrics.models.map(function (m) {
        return '<span><i style="background:' + COLORS[m.key] + '"></i>' +
               NAMES[m.key] + " · " + fmt(m.auc) + "</span>";
      }).join("");
    }
  }

  // ---------- 4. Kalibrierung ----------
  function drawCalib(calib, metrics) {
    var host = document.getElementById("viz-calib");
    if (!host) { return; }

    var W = 440, H = 380, padL = 46, padR = 14, padT = 16, padB = 44;
    var svg = svgRoot(host, W, H,
      "Kalibrierungskurven: mittlere vorhergesagte gegen beobachtete Wahrscheinlichkeit");
    var x = scale(0, 1, padL, W - padR), y = scale(0, 1, H - padB, padT);

    for (var v = 0; v <= 1.0001; v += 0.25) {
      el("line", { x1: padL, y1: y(v), x2: W - padR, y2: y(v), class: "ax-grid" }, svg);
      label(svg, padL - 8, y(v) + 3.5, v.toFixed(2), "ax-text", "end");
      label(svg, x(v), H - padB + 16, v.toFixed(2), "ax-text", "middle");
    }

    el("line", {
      x1: x(0), y1: y(0), x2: x(1), y2: y(1),
      class: "ax-line", "stroke-dasharray": "4 4"
    }, svg);

    var maxN = Math.max.apply(null, calib.map(function (d) { return d.n; }));

    ["lasso", "rf", "nn"].forEach(function (k) {
      var pts = calib.filter(function (d) { return d.key === k; })
        .sort(function (a, b) { return a.meanPred - b.meanPred; });

      var d = pts.map(function (p, i) {
        return (i ? "L" : "M") + x(p.meanPred).toFixed(2) + " " + y(p.fracPos).toFixed(2);
      }).join(" ");
      el("path", {
        d: d, fill: "none", stroke: COLORS[k],
        "stroke-width": 1.4, "stroke-opacity": 0.55
      }, svg);

      pts.forEach(function (p) {
        var c = el("circle", {
          cx: x(p.meanPred), cy: y(p.fracPos),
          r: 2.5 + Math.sqrt(p.n / maxN) * 6,
          fill: COLORS[k], "fill-opacity": 0.4,
          stroke: COLORS[k], "stroke-width": 1.2
        }, svg);
        tip(c, NAMES[k] + " — vorhergesagt " + (p.meanPred * 100).toFixed(1) + " %, " +
               "beobachtet " + (p.fracPos * 100).toFixed(1) + " % (n = " + p.n + ")");
      });
    });

    label(svg, padL, H - 8, "vorhergesagt", "ax-title");
    var yl = label(svg, 0, 0, "beobachtet", "ax-title");
    yl.setAttribute("transform", "translate(13," + ((H - padB + padT) / 2) + ") rotate(-90)");
    yl.setAttribute("text-anchor", "middle");

    var legend = document.getElementById("legend-calib");
    if (legend) {
      legend.innerHTML = metrics.models.map(function (m) {
        return '<span><i style="background:' + COLORS[m.key] + '"></i>' +
               NAMES[m.key] + " · Brier " + fmt(m.brier) + "</span>";
      }).join("");
    }
  }

  // ---------- 5. Schwellen-Explorer ----------
  function initThreshold(grids, metrics) {
    var host = document.getElementById("viz-threshold");
    if (!host) { return; }

    var slider = document.getElementById("thr-input");
    var readout = document.getElementById("thr-value");
    var cmHost = document.getElementById("thr-matrix");
    var statHost = document.getElementById("thr-stats");
    var caption = document.getElementById("thr-caption");
    var segHost = document.getElementById("thr-models");
    var snapBtn = document.getElementById("thr-snap");
    var current = "rf";

    function grid() {
      return grids.filter(function (g) { return g.key === current; })[0];
    }
    function metric() {
      return metrics.models.filter(function (m) { return m.key === current; })[0];
    }

    function nearestRow(t) {
      return grid().rows.reduce(function (best, r) {
        return Math.abs(r[0] - t) < Math.abs(best[0] - t) ? r : best;
      }, grid().rows[0]);
    }

    function render() {
      var row = nearestRow(parseFloat(slider.value));
      var t = row[0], tp = row[1], fp = row[2], tn = row[3], fn = row[4];
      var total = tp + fp + tn + fn;
      var col = COLORS[current];

      readout.textContent = t.toFixed(3);

      function cell(n, caption, good) {
        // Flaechen bewusst gedaempft: die Beschriftung in der Zelle muss auch
        // im staerkst eingefaerbten Feld lesbar bleiben.
        var share = n / total;
        var alpha = good ? (0.08 + share * 0.22) : (0.05 + share * 0.15);
        var rgb = good ? col : MUTED;
        return '<div class="cm-cell" style="background:' +
               hexToRgba(rgb, alpha) + '">' +
               '<span class="cm-n">' + n.toLocaleString("de-CH") + "</span>" +
               '<span class="cm-k">' + caption + "</span></div>";
      }

      cmHost.innerHTML =
        '<div class="cm-head"></div>' +
        '<div class="cm-head">tatsächlich<br>gewählt</div>' +
        '<div class="cm-head">tatsächlich<br>nicht</div>' +
        '<div class="cm-head cm-head--row">vorhergesagt<br>gewählt</div>' +
        cell(tp, "richtig positiv", true) +
        cell(fp, "falsch positiv", false) +
        '<div class="cm-head cm-head--row">vorhergesagt<br>nicht</div>' +
        cell(fn, "falsch negativ", false) +
        cell(tn, "richtig negativ", true);

      var sens = tp + fn ? tp / (tp + fn) : 0;
      var spec = tn + fp ? tn / (tn + fp) : 0;
      var acc = (tp + tn) / total;
      var bal = (sens + spec) / 2;

      function stat(name, v) {
        return '<div class="stat"><div class="stat-top"><span>' + name +
               "</span><b>" + v.toFixed(3) + "</b></div>" +
               '<div class="stat-bar"><i style="width:' + (v * 100).toFixed(1) +
               "%;background:" + col + '"></i></div></div>';
      }
      statHost.innerHTML = stat("Sensitivität", sens) + stat("Spezifität", spec) +
                           stat("Accuracy", acc) + stat("Bal. Accuracy", bal);

      var youden = grid().youden;
      if (t <= 0.505) {
        caption.innerHTML = "Bei dieser Schwelle erkennt das Modell nur <b>" +
          Math.round(spec * 100) + " %</b> der Nichtwähler — es sagt fast allen " +
          "«hat gewählt». Die Accuracy von " + Math.round(acc * 100) +
          " % sieht gut aus und sagt nichts.";
      } else if (Math.abs(t - youden) < 0.004) {
        caption.innerHTML = "Youden-Optimum (" + youden.toFixed(3) +
          "): Sensitivität und Spezifität sind ausbalanciert, die Gesamt-Accuracy " +
          "fällt dafür auf " + Math.round(acc * 100) + " %.";
      } else {
        caption.innerHTML = "Sensitivität " + Math.round(sens * 100) +
          " %, Spezifität " + Math.round(spec * 100) +
          " %. Youden-Optimum für dieses Modell: " + youden.toFixed(3) + ".";
      }
    }

    metrics.models.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = NAMES[m.key];
      b.style.setProperty("--sel", COLORS[m.key]);
      b.setAttribute("aria-pressed", String(m.key === current));
      b.addEventListener("click", function () {
        current = m.key;
        Array.prototype.forEach.call(segHost.querySelectorAll("button"), function (x) {
          x.setAttribute("aria-pressed", String(x === b));
        });
        render();
      });
      segHost.appendChild(b);
    });

    if (snapBtn) {
      snapBtn.addEventListener("click", function () {
        slider.value = grid().youden;
        render();
      });
    }

    slider.addEventListener("input", render);
    render();
  }

  function hexToRgba(hex, alpha) {
    var h = hex.replace("#", "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," +
           (n & 255) + "," + alpha.toFixed(3) + ")";
  }

  // ---------- 6. Permutation Importance ----------
  function drawImportance(rows) {
    var host = document.getElementById("viz-importance");
    if (!host) { return; }

    // padL muss das laengste Label tragen ("Zufriedenheit mit der Demokratie
    // (national)" — 42 Zeichen Monospace bei 10 px).
    var W = 940, rowH = 24, padT = 26, padB = 36, padL = 310, padR = 62;
    var H = padT + rows.length * rowH + padB;
    var svg = svgRoot(host, W, H,
      "Permutation Importance der 15 wichtigsten Prädiktoren des Random Forest", 700);

    var max = rows[0].importance;
    var x = scale(0, max, padL, W - padR);

    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var v = max * f;
      el("line", { x1: x(v), y1: padT - 10, x2: x(v), y2: H - padB + 4, class: "ax-grid" }, svg);
      label(svg, x(v), H - padB + 18, v.toFixed(3), "ax-text", "middle");
    });

    rows.forEach(function (r, i) {
      var y = padT + i * rowH;
      var colour = r.isNaFlag ? COLORS.nn : COLORS.rf;
      var g = el("g", {}, svg);

      tip(g, r.label + " (" + r.feature + "): " + r.importance.toFixed(5));

      var t = label(g, padL - 12, y + rowH / 2 + 3.5, r.label, "ax-text", "end");
      if (r.isNaFlag) { t.setAttribute("fill", COLORS.nn); }

      el("rect", {
        x: padL, y: y + 4,
        width: Math.max(x(r.importance) - padL, 1),
        height: rowH - 9, rx: 2,
        fill: colour, "fill-opacity": r.isNaFlag ? 0.3 : 0.2,
        stroke: colour, "stroke-width": 1, "stroke-opacity": 0.65
      }, g);

      label(g, x(r.importance) + 8, y + rowH / 2 + 3.5, r.importance.toFixed(4), "ax-title");
    });

    label(svg, padL, 14, "Rückgang der Trefferquote bei Permutation", "ax-title");

    var legend = document.getElementById("legend-importance");
    if (legend) {
      legend.innerHTML =
        '<span><i style="background:' + COLORS.rf + '"></i>Antwort</span>' +
        '<span><i style="background:' + COLORS.nn + '"></i>ob überhaupt geantwortet wurde</span>';
    }
  }

  // ---------- 7. Live-Modell ----------
  function initPredict(model) {
    var host = document.getElementById("viz-predict");
    if (!host) { return; }

    var age = document.getElementById("p-age");
    var interest = document.getElementById("p-interest");
    var attention = document.getElementById("p-attention");
    var pid = document.getElementById("p-pid");
    var out = document.getElementById("p-output");
    var gauge = document.getElementById("p-gauge");

    age.min = model.ageRange[0];
    age.max = model.ageRange[1];

    var INTEREST_WORDS = {
      1: "sehr interessiert",
      2: "ziemlich interessiert",
      3: "wenig interessiert",
      4: "gar nicht interessiert"
    };

    function update() {
      var a = parseFloat(age.value);
      var i = parseFloat(interest.value);
      var t = parseFloat(attention.value);
      var p = parseFloat(pid.value);

      document.getElementById("p-age-value").textContent = a + " Jahre";
      document.getElementById("p-interest-value").textContent = INTEREST_WORDS[i];
      document.getElementById("p-attention-value").textContent = t + " / 10";
      document.getElementById("p-pid-value").textContent = p === 1 ? "ja" : "nein";

      var logit = model.base +
        model.perYear * (a - model.baseAge) +
        model.perInterest * (i - model.baseInterest) +
        model.perAttention * (t - model.baseAttention) +
        model.pid * (p - model.basePid);

      var prob = 1 / (1 + Math.exp(-logit));
      out.textContent = (prob * 100).toFixed(1).replace(".", ",") + " %";
      gauge.style.width = (prob * 100).toFixed(1) + "%";
    }

    [age, interest, attention, pid].forEach(function (input) {
      input.addEventListener("input", update);
    });
    update();
  }

  // ---------- Laden ----------
  var files = [
    "assets/data/turnout_country.json",
    "assets/data/metrics.json",
    "assets/data/roc.json",
    "assets/data/calibration.json",
    "assets/data/threshold_grid.json",
    "assets/data/importance.json",
    "assets/data/lasso_live.json"
  ];

  Promise.all(files.map(function (f) {
    return fetch(f).then(function (r) {
      if (!r.ok) { throw new Error(f + ": HTTP " + r.status); }
      return r.json();
    });
  })).then(function (d) {
    drawGap(d[0]);
    drawTiles(d[1]);
    drawRoc(d[2], d[1]);
    drawCalib(d[3], d[1]);
    initThreshold(d[4], d[1]);
    drawImportance(d[5]);
    initPredict(d[6]);
  }).catch(function (err) {
    if (window.console && console.error) {
      console.error("Fallstudie: Daten konnten nicht geladen werden.", err);
    }
    var note = document.getElementById("viz-error");
    if (note) { note.hidden = false; }
  });
})();
