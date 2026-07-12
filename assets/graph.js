// Skill-/Projekt-Graph: eigene leichte Force-Simulation (kein D3), SVG-basiert.
// Ziehbare Knoten, Tooltip auf Hover/Tap, Klick auf verlinkte Knoten navigiert.
// Respektiert prefers-reduced-motion (statisches Radial-Layout statt Physik).
(function () {
  var container = document.getElementById("skill-graph");
  if (!container) { return; }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 860, H = 560, CX = W / 2, CY = H / 2;

  var nodes = [
    { id: "orlando", label: "Orlando Willig", type: "center" },

    { id: "polwiss", label: "Politikwissenschaft", type: "hub",
      desc: "Verständnis für Institutionen, öffentliche Aufgaben und Governance" },
    { id: "data", label: "Data Analyse & ML", type: "hub",
      desc: "R, SQL und Process Mining, um Prüfungsfragen empirisch zu beantworten" },
    { id: "audit", label: "Audit & Governance", type: "hub",
      desc: "Prüfung von Systemen, Prozessen und Wirksamkeit" },

    { id: "masterarbeit", label: "Masterarbeit", type: "link", href: "masterarbeit.html",
      desc: "Affektive Polarisierung & demokratische Rezession — Paneldatenanalyse mit CSES-, V-Dem- und EES-Daten" },

    { id: "r", label: "R", type: "leaf", desc: "Statistische Analyse und Modellierung" },
    { id: "sql", label: "SQL", type: "leaf", desc: "Datenabfragen und -aufbereitung" },
    { id: "processmining", label: "Process Mining", type: "leaf", desc: "Analyse von Prüfprozessen" },

    { id: "efk", label: "EFK", type: "leaf",
      desc: "Eidgenössische Finanzkontrolle, Bern — Junior Prüfungsexperte & Data Analyst" },
    { id: "performanceaudit", label: "Performance-Audit", type: "leaf",
      desc: "Prüfung von Wirksamkeit und Wirtschaftlichkeit" },
    { id: "kigov", label: "KI-Governance", type: "leaf",
      desc: "Verantwortungsvoller Einsatz von KI im Prüfungswesen" },
    { id: "agenticai", label: "Agentic AI", type: "leaf",
      desc: "Autonome KI-Systeme im Prüfungskontext" },
    { id: "caats", label: "CAATs", type: "leaf",
      desc: "Computer Assisted Audit Techniques" },

    { id: "pub1", label: "Agentic AI & CAATs", type: "link", href: "publikationen.html",
      desc: "„Agentic AI und CAATs“ — ExpertFocus, April 2026 (mit Marco Schreyer)" },
    { id: "pub2", label: "Agentic AI & Perf.-Audit", type: "link", href: "publikationen.html",
      desc: "„Agentic AI und Performance Auditing“ — INTOSAI Journal, Q3 2026" }
  ];

  var links = [
    ["orlando", "polwiss", 200],
    ["orlando", "data", 200],
    ["orlando", "audit", 200],
    ["polwiss", "masterarbeit", 110],
    ["data", "r", 100],
    ["data", "sql", 100],
    ["data", "processmining", 100],
    ["audit", "efk", 105],
    ["audit", "performanceaudit", 105],
    ["audit", "kigov", 105],
    ["audit", "agenticai", 105],
    ["audit", "caats", 105],
    ["pub1", "agenticai", 95],
    ["pub1", "caats", 95],
    ["pub1", "audit", 130],
    ["pub2", "agenticai", 95],
    ["pub2", "performanceaudit", 95]
  ];

  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });
  links = links.map(function (l) {
    return { source: byId[l[0]], target: byId[l[1]], length: l[2] };
  });

  var radius = { center: 26, hub: 19, leaf: 12, link: 14 };
  var padX = { center: 65, hub: 75, leaf: 45, link: 80 };

  // ---------- Ausgangspositionen ----------
  var hubs = nodes.filter(function (n) { return n.type === "hub"; });
  nodes[0].x = CX; nodes[0].y = CY;
  hubs.forEach(function (h, i) {
    var angle = -Math.PI / 2 + i * (2 * Math.PI / 3);
    h.x = CX + Math.cos(angle) * 195;
    h.y = CY + Math.sin(angle) * 195;
  });

  var groups = { polwiss: [], data: [], audit: [] };
  links.forEach(function (l) {
    if (l.source.id in groups) { groups[l.source.id].push(l.target); }
  });
  Object.keys(groups).forEach(function (hubId) {
    var hub = byId[hubId];
    var members = groups[hubId];
    members.forEach(function (m, i) {
      if (m.x !== undefined) { return; }
      var baseAngle = Math.atan2(hub.y - CY, hub.x - CX);
      var spread = (i - (members.length - 1) / 2) * 0.7;
      var angle = baseAngle + spread;
      m.x = hub.x + Math.cos(angle) * 120;
      m.y = hub.y + Math.sin(angle) * 120;
    });
  });
  nodes.forEach(function (n) {
    if (n.x === undefined) { n.x = CX + (Math.random() - 0.5) * 40; n.y = CY + (Math.random() - 0.5) * 40; }
    n.vx = 0; n.vy = 0;
  });

  // ---------- Statisches Layout bei reduced motion: Simulation vorab durchrechnen ----------
  function simulateStep(alpha) {
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var distSq = dx * dx + dy * dy || 0.01;
        var dist = Math.sqrt(distSq);
        var force = Math.min(11000 / distSq, 45);
        var fx = force * dx / dist, fy = force * dy / dist;
        if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
        if (!b.fixed) { b.vx += fx; b.vy += fy; }
      }
    }
    links.forEach(function (l) {
      var dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var diff = (dist - l.length) * 0.045;
      var fx = diff * dx / dist, fy = diff * dy / dist;
      if (!l.source.fixed) { l.source.vx += fx; l.source.vy += fy; }
      if (!l.target.fixed) { l.target.vx -= fx; l.target.vy -= fy; }
    });
    nodes.forEach(function (n) {
      if (n.fixed) { n.vx = 0; n.vy = 0; return; }
      n.vx += (CX - n.x) * 0.0018;
      n.vy += (CY - n.y) * 0.0018;
      n.vx *= 0.8; n.vy *= 0.8;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
      var px = padX[n.type];
      var top = radius[n.type] + 8;
      var bottom = radius[n.type] + 24;
      n.x = Math.max(px, Math.min(W - px, n.x));
      n.y = Math.max(top, Math.min(H - bottom, n.y));
    });
  }

  // ---------- SVG-Aufbau ----------
  var svgNS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("class", "skill-graph-svg");
  container.appendChild(svg);

  var linkEls = links.map(function () {
    var el = document.createElementNS(svgNS, "line");
    el.setAttribute("class", "graph-link");
    svg.appendChild(el);
    return el;
  });

  var tooltip = document.createElement("div");
  tooltip.className = "graph-tooltip";
  tooltip.setAttribute("role", "status");
  container.appendChild(tooltip);

  function showTooltip(n, x, y) {
    var text = n.desc || n.label;
    if (n.href) { text += " → zur Seite"; }
    tooltip.textContent = text;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
    tooltip.classList.add("is-visible");
  }
  function hideTooltip() { tooltip.classList.remove("is-visible"); }

  var nodeEls = nodes.map(function (n) {
    var g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "graph-node graph-node--" + n.type + (n.href ? " is-linked" : ""));
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", n.href ? "link" : "img");
    g.setAttribute("aria-label", n.label + (n.desc ? ": " + n.desc : ""));

    var circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", radius[n.type]);
    g.appendChild(circle);

    var text = document.createElementNS(svgNS, "text");
    text.setAttribute("class", "graph-label");
    text.setAttribute("y", radius[n.type] + 14);
    text.textContent = n.label;
    g.appendChild(text);

    svg.appendChild(g);
    return g;
  });

  function render() {
    linkEls.forEach(function (el, i) {
      var l = links[i];
      el.setAttribute("x1", l.source.x); el.setAttribute("y1", l.source.y);
      el.setAttribute("x2", l.target.x); el.setAttribute("y2", l.target.y);
    });
    nodeEls.forEach(function (g, i) {
      g.setAttribute("transform", "translate(" + nodes[i].x + "," + nodes[i].y + ")");
    });
  }

  if (reduce) {
    for (var s = 0; s < 260; s++) { simulateStep(1); }
    render();
  } else {
    // ---------- Animierte Simulation ----------
    var alpha = 1, alphaDecay = 0.985, minAlpha = 0.006, rafId = null;

    function tick() {
      alpha *= alphaDecay;
      simulateStep(alpha);
      render();
      if (alpha > minAlpha) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }
    function reheat() {
      alpha = Math.max(alpha, 0.5);
      if (rafId === null) { rafId = requestAnimationFrame(tick); }
    }
    tick();

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      else if (!document.hidden && alpha > minAlpha && rafId === null) { rafId = requestAnimationFrame(tick); }
    });

    // ---------- Drag (Pointer Events: Maus + Touch) ----------
    var dragNode = null, dragMoved = false, startX = 0, startY = 0;

    function svgPoint(evt) {
      var rect = svg.getBoundingClientRect();
      var x = (evt.clientX - rect.left) / rect.width * W;
      var y = (evt.clientY - rect.top) / rect.height * H;
      return { x: x, y: y };
    }

    nodeEls.forEach(function (g, i) {
      var n = nodes[i];

      g.addEventListener("pointerdown", function (evt) {
        dragNode = n; dragMoved = false;
        startX = evt.clientX; startY = evt.clientY;
        n.fixed = true;
        g.setPointerCapture(evt.pointerId);
      });

      g.addEventListener("pointermove", function (evt) {
        if (dragNode === n) {
          if (Math.abs(evt.clientX - startX) > 3 || Math.abs(evt.clientY - startY) > 3) { dragMoved = true; }
          var p = svgPoint(evt);
          n.x = p.x; n.y = p.y;
          reheat();
          render();
        }
        var rect = container.getBoundingClientRect();
        showTooltip(n, evt.clientX - rect.left + 14, evt.clientY - rect.top + 10);
      });

      g.addEventListener("pointerup", function (evt) {
        if (dragNode === n) {
          n.fixed = false;
          dragNode = null;
          if (!dragMoved && n.href) { window.location.href = n.href; }
        }
      });

      g.addEventListener("pointerleave", function () { hideTooltip(); });
      g.addEventListener("focus", function () {
        var rect = g.getBoundingClientRect();
        var cRect = container.getBoundingClientRect();
        showTooltip(n, rect.left - cRect.left + 14, rect.top - cRect.top);
      });
      g.addEventListener("blur", hideTooltip);
      g.addEventListener("keydown", function (evt) {
        if ((evt.key === "Enter" || evt.key === " ") && n.href) {
          evt.preventDefault();
          window.location.href = n.href;
        }
      });
    });
  }

  render();
})();
