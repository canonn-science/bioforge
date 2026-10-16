"use strict";

/* ==========================================================================
   Canonn Bioforge — data explorer
   ========================================================================== */

var regions = {
    "Galactic Centre": "#Region_01",
    "Empyrean Straits": "#Region_02",
    "Ryker's Hope": "#Region_03",
    "Odin's Hold": "#Region_04",
    "Norma Arm": "#Region_05",
    "Arcadian Stream": "#Region_06",
    "Izanami": "#Region_07",
    "Inner Orion-Perseus Conflux": "#Region_08",
    "Inner Scutum-Centaurus Arm": "#Region_09",
    "Norma Expanse": "#Region_10",
    "Trojan Belt": "#Region_11",
    "The Veils": "#Region_12",
    "Newton's Vault": "#Region_13",
    "The Conduit": "#Region_14",
    "Outer Orion-Perseus Conflux": "#Region_15",
    "Orion-Cygnus Arm": "#Region_16",
    "Temple": "#Region_17",
    "Inner Orion Spur": "#Region_18",
    "Hawking's Gap": "#Region_19",
    "Dryman's Point": "#Region_20",
    "Sagittarius-Carina Arm": "#Region_21",
    "Mare Somnia": "#Region_22",
    "Acheron": "#Region_23",
    "Formorian Frontier": "#Region_24",
    "Hieronymus Delta": "#Region_25",
    "Outer Scutum-Centaurus Arm": "#Region_26",
    "Outer Arm": "#Region_27",
    "Aquila's Halo": "#Region_28",
    "Errant Marches": "#Region_29",
    "Perseus Arm": "#Region_30",
    "The Formidine Rift": "#Region_31",
    "Vulcan Gate": "#Region_32",
    "Elysian Shore": "#Region_33",
    "Sanguineous Rim": "#Region_34",
    "Outer Orion Spur": "#Region_35",
    "Achilles's Altar": "#Region_36",
    "Xibalba": "#Region_37",
    "Lyra's Song": "#Region_38",
    "Tenebrae": "#Region_39",
    "The Abyss": "#Region_40",
    "Kepler's Crest": "#Region_41",
    "The Void": "#Region_42"
};

var entryid = Object.fromEntries(new URLSearchParams(window.location.search).entries()).entryid;
var trimmedsysname = "";

/* ---------------------------------------------------------------------- *
 * Shared tooltip
 * ---------------------------------------------------------------------- */

function vizTooltip() {
    return document.getElementById("viz-tooltip");
}

function showViz(evt, title, body) {
    var tt = vizTooltip();
    tt.innerHTML = (title ? '<div class="tt-title">' + title + '</div>' : "") + (body || "");
    tt.style.display = "block";
    positionViz(evt);
}

function positionViz(evt) {
    var tt = vizTooltip();
    var x = evt.clientX + 14;
    var y = evt.clientY + 14;
    var maxX = window.innerWidth - 270;
    var maxY = window.innerHeight - 60;
    if (x > maxX) x = evt.clientX - 270;
    if (y > maxY) y = evt.clientY - 60;
    tt.style.left = x + "px";
    tt.style.top = y + "px";
}

function hideViz() {
    vizTooltip().style.display = "none";
}

function wireTooltip(el, title, body) {
    el.addEventListener("mouseenter", function (e) { showViz(e, title, body); });
    el.addEventListener("mousemove", positionViz);
    el.addEventListener("mouseleave", hideViz);
}

/* Grow an SVG rect from zero after it's attached to the DOM, so the CSS
   height/y transition on .bar_* actually fires. */
function growBar(rect, baselineY, finalY, finalHeight) {
    rect.setAttribute("y", baselineY);
    rect.setAttribute("height", 0);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            rect.setAttribute("y", finalY);
            rect.setAttribute("height", finalHeight);
        });
    });
}

function countUp(el, target, opts) {
    opts = opts || {};
    var prefix = opts.prefix || "", suffix = opts.suffix || "";
    var duration = opts.duration || 900;
    var start = performance.now();
    function tick(now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(target * eased).toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------------- *
 * Chart modal — click any chart to expand it. Reparents the live chart
 * element itself (not a clone) so its existing tooltip/hover listeners
 * keep working inside the modal, then moves it back on close.
 * ---------------------------------------------------------------------- */

var modalHome = null; // { el, parent, next }

function openChartModal(contentEl, title) {
    var modal = document.getElementById("chart-modal");
    var body = modal.querySelector(".chart-modal-body");
    modalHome = { el: contentEl, parent: contentEl.parentNode, next: contentEl.nextSibling };
    modal.querySelector(".chart-modal-title").textContent = title || "";
    body.innerHTML = "";
    body.appendChild(contentEl);
    modal.classList.add("open");
}

function closeChartModal() {
    var modal = document.getElementById("chart-modal");
    if (modalHome) {
        modalHome.parent.insertBefore(modalHome.el, modalHome.next);
        modalHome = null;
    }
    modal.classList.remove("open");
}

document.addEventListener("click", function (e) {
    if (e.target.closest(".chart-modal-close")) { closeChartModal(); return; }
    if (e.target.id === "chart-modal") { closeChartModal(); return; }

    var panel = e.target.closest(".zoomable");
    if (!panel) return;
    var contentEl = panel.querySelector(".chart-target");
    if (!contentEl) return;
    var heading = panel.querySelector("h3, h4");
    var title = heading && heading.firstChild ? heading.firstChild.textContent.trim() : "";
    openChartModal(contentEl, title);
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeChartModal();
});

/* ---------------------------------------------------------------------- *
 * Entry point
 * ---------------------------------------------------------------------- */

function getEntryInfo(id) {
    document.getElementById("logo").src = "img/Canonn-Logo_transparent_50.gif";
    var container = document.getElementById("container");
    if (id === undefined) {
        renderIntro(container);
        return;
    }
    // viewing a codex entry: offer a way back to the landing-page charts
    var backbar = document.getElementById("backbar");
    backbar.querySelector("a").href = window.location.pathname;
    backbar.hidden = false;
    container.innerHTML = '<div class="loading-state"><span class="spinner"></span> Searching the codex for "' + escapeHtml(id) + '"...</div>';
    fetch("https://us-central1-canonn-api-236217.cloudfunctions.net/query/biostats/" + id)
        .then(function (response) { return response.json(); })
        .then(function (data) { makePage(data, id); })
        .catch(function (err) {
            console.error(err);
            container.innerHTML = '<div class="intro-card"><h2>Something went wrong</h2><p>' + escapeHtml(String(err)) + '</p></div>';
        });
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

var EXAMPLES = ["Bacterium", "Aleoida Arcus", "Concha Renibus", "Guardian Sentinel", "Thargoid Barnacle"];

function renderIntro(container) {
    var buttons = EXAMPLES.map(function (ex) {
        return '<button onclick="runSearch(' + JSON.stringify(ex) + ')">' + escapeHtml(ex) + "</button>";
    }).join("");
    container.innerHTML =
        '<div class="intro-card">' +
        "<h2>Explore Elite Dangerous biology, Guardian &amp; Thargoid codex data</h2>" +
        "<p>Search for a species or codex entry to see where it's found: atmosphere &amp; body types, star types, " +
        "environmental ranges, common materials, and a galaxy map of matching regions and systems.</p>" +
        '<div class="intro-examples">' + buttons + "</div>" +
        "</div>" +
        '<div id="samples-root"><div class="loading-state"><span class="spinner"></span> Loading charts...</div></div>';
    loadSamples();
}

/* The landing-page charts need d3, so load it (and js/samples.js) only when no entry is requested. */
function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var el = document.createElement("script");
        el.src = src;
        el.onload = resolve;
        el.onerror = function () { reject(new Error("Could not load " + src)); };
        document.head.appendChild(el);
    });
}

function loadSamples() {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js")
        .then(function () { return loadScript("https://cdnjs.cloudflare.com/ajax/libs/d3-sankey/0.12.3/d3-sankey.min.js"); })
        .then(function () { return loadScript("js/samples.js"); })
        .catch(function (err) {
            console.error(err);
            var root = document.getElementById("samples-root");
            if (root) root.innerHTML = '<div class="intro-card"><p>Charts could not be loaded: ' + escapeHtml(String(err)) + "</p></div>";
        });
}

function runSearch(name) {
    window.location.href = window.location.href.split("?")[0] + "?entryid=" + encodeURIComponent(name);
}

function submitentry() {
    var input = document.querySelector(".searchform input");
    if (input.value.trim()) {
        runSearch(input.value.trim());
    }
}

/* ---------------------------------------------------------------------- *
 * Region map: zoom, fullscreen, system pins
 * ---------------------------------------------------------------------- */

function setupRegionMap(wrap, svgElement) {
    var full = (svgElement.getAttribute("viewBox") || svgElement.getAttribute("viewbox")).split(" ").map(Number);
    var vb = full.slice(); // [x, y, w, h] — current view
    var MIN_SPAN = full[2] / 40; // deepest zoom: 1/40th of the galaxy width
    var MAX_SPAN = full[2]; // shallowest: full galaxy

    function apply() {
        svgElement.setAttribute("viewBox", vb.join(" "));
        var s = full[2] / vb[2];
        svgElement.querySelectorAll("circle.location-dot").forEach(function (c) {
            c.setAttribute("r", (4 / s).toString());
        });
    }

    function clamp(v) {
        v[2] = Math.min(MAX_SPAN, Math.max(MIN_SPAN, v[2]));
        v[3] = v[2];
        v[0] = Math.min(full[0] + full[2] - v[2], Math.max(full[0], v[0]));
        v[1] = Math.min(full[1] + full[3] - v[3], Math.max(full[1], v[1]));
        return v;
    }

    function zoomBy(factor, cx, cy) {
        // cx/cy: SVG-space point to zoom toward (keeps it under the cursor)
        var newSpan = vb[2] / factor;
        newSpan = Math.min(MAX_SPAN, Math.max(MIN_SPAN, newSpan));
        var ratio = newSpan / vb[2];
        vb = clamp([
            cx - (cx - vb[0]) * ratio,
            cy - (cy - vb[1]) * ratio,
            vb[2] * ratio,
            vb[3] * ratio
        ]);
        apply();
    }

    function zoomToRegion(region) {
        var bbox = region.getBBox();
        var maxDim = Math.max(bbox.width, bbox.height) * 1.15;
        var cx = bbox.x + bbox.width / 2;
        var cy = bbox.y + bbox.height / 2;
        vb = clamp([cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim]);
        apply();
    }

    function reset() {
        vb = full.slice();
        apply();
    }

    function toSvgPoint(evt) {
        var pt = svgElement.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        var ctm = svgElement.getScreenCTM().inverse();
        return pt.matrixTransform(ctm);
    }

    svgElement.querySelectorAll("path.region").forEach(function (region) {
        region.addEventListener("click", function (evt) {
            evt.stopPropagation();
            zoomToRegion(region);
        });
        region.addEventListener("mouseenter", function (e) {
            var name = Object.keys(regions).find(function (k) { return regions[k] === "#" + region.id; });
            showViz(e, name || region.id, "Click to zoom in &middot; scroll to zoom freely");
        });
        region.addEventListener("mousemove", positionViz);
        region.addEventListener("mouseleave", hideViz);
    });

    svgElement.addEventListener("dblclick", function (evt) {
        evt.preventDefault();
        var p = toSvgPoint(evt);
        zoomBy(2, p.x, p.y);
    });

    svgElement.addEventListener("wheel", function (evt) {
        evt.preventDefault();
        var p = toSvgPoint(evt);
        zoomBy(evt.deltaY < 0 ? 1.4 : 1 / 1.4, p.x, p.y);
    }, { passive: false });

    var dragging = false, lastX = 0, lastY = 0, moved = false;
    svgElement.addEventListener("pointerdown", function (evt) {
        if (evt.button !== 0) return;
        dragging = true; moved = false;
        lastX = evt.clientX; lastY = evt.clientY;
        svgElement.setPointerCapture(evt.pointerId);
    });
    svgElement.addEventListener("pointermove", function (evt) {
        if (!dragging) return;
        var dx = evt.clientX - lastX, dy = evt.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        var s = vb[2] / svgElement.getBoundingClientRect().width;
        vb = clamp([vb[0] - dx * s, vb[1] - dy * s, vb[2], vb[3]]);
        apply();
        lastX = evt.clientX; lastY = evt.clientY;
    });
    svgElement.addEventListener("pointerup", function () { dragging = false; });
    svgElement.addEventListener("pointerleave", function () { dragging = false; });

    var toolbar = document.createElement("div");
    toolbar.className = "map-toolbar";
    toolbar.innerHTML =
        '<button title="Zoom in" class="map-zoomin">+</button>' +
        '<button title="Zoom out" class="map-zoomout">&minus;</button>' +
        '<button title="Reset view" class="map-reset">&#8634;</button>' +
        '<button title="Fullscreen" class="map-fs">&#9974;</button>';
    wrap.appendChild(toolbar);

    toolbar.querySelector(".map-zoomin").addEventListener("click", function (e) {
        e.stopPropagation();
        zoomBy(1.6, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2);
    });
    toolbar.querySelector(".map-zoomout").addEventListener("click", function (e) {
        e.stopPropagation();
        zoomBy(1 / 1.6, vb[0] + vb[2] / 2, vb[1] + vb[3] / 2);
    });
    toolbar.querySelector(".map-reset").addEventListener("click", function (e) {
        e.stopPropagation();
        reset();
    });
    toolbar.querySelector(".map-fs").addEventListener("click", function (e) {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            wrap.requestFullscreen ? wrap.requestFullscreen() : wrap.webkitRequestFullscreen && wrap.webkitRequestFullscreen();
        } else {
            document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen();
        }
    });

    var legend = document.createElement("div");
    legend.className = "map-legend";
    legend.innerHTML =
        '<span><i class="swatch"></i>Region contains matches</span>' +
        '<span><i class="dot"></i>Individual system</span>';
    wrap.appendChild(legend);

    return { zoomToRegion: zoomToRegion, zoomOut: reset, scale: function () { return full[2] / vb[2]; } };
}

function plotSystemPins(svgElement, mapCtl, numericEntryId, hudCategory) {
    if (!numericEntryId || !hudCategory) return;
    var url = "https://storage.googleapis.com/canonn-downloads/dumpr/" + hudCategory + "/" + numericEntryId + ".csv";

    fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (csvText) {
            var lines = csvText.trim().split("\n");
            if (!lines.length || !lines[0]) return;
            var dotGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            dotGroup.setAttribute("id", "dot-group");
            svgElement.appendChild(dotGroup);

            var index = 0;
            var batchSize = 500;
            var interval = setInterval(function () {
                for (var i = 0; i < batchSize && index < lines.length; i++, index++) {
                    var fields = lines[index].split(",");
                    if (fields.length < 8) continue;
                    var name = fields[0];
                    var x = parseFloat(fields[1]);
                    var z = parseFloat(fields[3]);
                    var cRegion = fields[6];
                    if (isNaN(x) || isNaN(z)) continue;

                    var regionEl = svgElement.getElementById("Region_" + cRegion.padStart(2, "0"));
                    if (regionEl) regionEl.classList.add("region_selected");

                    var tx = (x + 49985) * 83 / 4096;
                    var tz = (z + 24105) * 83 / 4096;
                    addPin(dotGroup, svgElement, mapCtl, tx, 2048 - tz, name);
                }
                if (index >= lines.length) clearInterval(interval);
            }, 0);
        })
        .catch(function (err) { console.warn("No per-system coordinates for this entry:", err); });
}

function addPin(parent, svgElement, mapCtl, x, y, name) {
    var svgns = "http://www.w3.org/2000/svg";
    var circle = document.createElementNS(svgns, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", (4 / mapCtl.scale()).toString());
    circle.classList.add("location-dot");
    parent.appendChild(circle);

    circle.addEventListener("mouseenter", function (e) { showViz(e, name, "Click to zoom &middot; right-click for signals &middot; middle-click to copy"); });
    circle.addEventListener("mousemove", positionViz);
    circle.addEventListener("mouseleave", hideViz);

    circle.addEventListener("click", function (evt) {
        evt.stopPropagation();
        var pt = svgElement.createSVGPoint();
        pt.x = x; pt.y = y;
        var region = Array.prototype.find.call(svgElement.querySelectorAll("path.region"), function (r) {
            return r.isPointInFill && r.isPointInFill(pt);
        });
        if (region) mapCtl.zoomToRegion(region);
    });
    circle.addEventListener("contextmenu", function (evt) {
        evt.preventDefault();
        window.open("https://signals.canonn.tech/?system=" + encodeURIComponent(name));
    });
    circle.addEventListener("mousedown", function (evt) {
        if (evt.button === 1) {
            evt.preventDefault();
            if (navigator.clipboard) navigator.clipboard.writeText(name);
        }
    });
}

/* ---------------------------------------------------------------------- *
 * Hero summary: stats, niche radar, atmosphere donut
 * ---------------------------------------------------------------------- */

function buildStats(rowclone, value, bodyTypeCount) {
    var target = rowclone.querySelector(".codex_stats");
    var stats = [
        { label: "Occurrences", value: value["count"] || 0 },
        { label: "Regions", value: (value["regions"] || []).length },
        { label: "Body types", value: bodyTypeCount },
    ];
    var html = stats.map(function (s) {
        return '<div class="stat"><span class="stat-value">0</span><span class="stat-label">' + escapeHtml(s.label) + "</span></div>";
    }).join("");
    if (value["reward"]) {
        html += '<div class="stat reward"><span class="stat-value">$0</span><span class="stat-label">Reward</span></div>';
        stats.push({ label: "Reward", value: value["reward"], prefix: "$" });
    }
    target.innerHTML = html;
    var nodes = target.querySelectorAll(".stat-value");
    stats.forEach(function (s, i) {
        countUp(nodes[i], s.value, { prefix: s.prefix || "", duration: 900 + i * 150 });
    });
}

/* Shared radar/spider chart: axes = [{label, norm (0..1), tooltip}]. */
function buildRadarChart(target, axes) {
    var size = 170, cx = size / 2, cy = size / 2, r = 44;
    var points = axes.map(function (ax, i) {
        var angle = -Math.PI / 2 + i * (Math.PI * 2 / axes.length);
        var norm = Math.max(0.06, ax.norm || 0);
        return {
            label: ax.label,
            tooltip: ax.tooltip,
            x: cx + Math.cos(angle) * r * norm,
            y: cy + Math.sin(angle) * r * norm,
            lx: cx + Math.cos(angle) * (r + 20),
            ly: cy + Math.sin(angle) * (r + 20)
        };
    });

    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("width", size); svg.setAttribute("height", size);

    [0.33, 0.66, 1].forEach(function (f) {
        var ring = document.createElementNS(svgns, "circle");
        ring.setAttribute("cx", cx); ring.setAttribute("cy", cy); ring.setAttribute("r", r * f);
        ring.setAttribute("class", "radar-grid");
        svg.appendChild(ring);
    });
    axes.forEach(function (ax, i) {
        var angle = -Math.PI / 2 + i * (Math.PI * 2 / axes.length);
        var line = document.createElementNS(svgns, "line");
        line.setAttribute("x1", cx); line.setAttribute("y1", cy);
        line.setAttribute("x2", cx + Math.cos(angle) * r); line.setAttribute("y2", cy + Math.sin(angle) * r);
        line.setAttribute("class", "radar-grid");
        svg.appendChild(line);
    });

    var poly = document.createElementNS(svgns, "polygon");
    poly.setAttribute("points", points.map(function (p) { return p.x + "," + p.y; }).join(" "));
    poly.setAttribute("class", "radar-shape");
    svg.appendChild(poly);

    points.forEach(function (p, i) {
        var dot = document.createElementNS(svgns, "circle");
        dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.setAttribute("r", 2.5);
        dot.setAttribute("class", "radar-dot");
        wireTooltip(dot, axes[i].label, p.tooltip || "");
        svg.appendChild(dot);

        var label = document.createElementNS(svgns, "text");
        label.setAttribute("x", p.lx); label.setAttribute("y", p.ly);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("class", "radar-axis-label");
        label.textContent = axes[i].label;
        svg.appendChild(label);
    });

    target.innerHTML = "";
    target.appendChild(svg);
}

/* "Where do this species' readings tend to fall within their own observed
   range?" — the bucket (of 12) with the most hits on each axis, normalized
   0..1. Plotted as a 4-axis radar so two species' environmental character
   can be compared at a glance, not just read as four separate bar charts. */
function buildNicheRadar(rowclone, value) {
    var target = rowclone.querySelector(".codex_radar");
    var defs = [
        { key: "gravity", label: "GRAV" },
        { key: "temperature", label: "TEMP" },
        { key: "pressure", label: "PRES" },
        { key: "distance", label: "DIST" }
    ];
    var axes = defs.map(function (ax) {
        var buckets = value["histograms"][ax.key] || [];
        var peak = 0, peakVal = -1;
        buckets.forEach(function (b, bi) { if ((b.value || 0) > peakVal) { peakVal = b.value || 0; peak = bi; } });
        var norm = buckets.length ? (peak + 1) / buckets.length : 0;
        var pct = Math.round(norm * 100);
        return { label: ax.label, norm: norm, tooltip: "Most common reading sits around " + pct + "% up its observed range" };
    });
    buildRadarChart(target, axes);
}


var DONUT_COLORS = ["#f89406", "#ee5f5b", "#5bc0de", "#62c462", "#b66dff", "#9aa3ad", "#ffd166", "#06d6a0"];

/* Shared animated donut: entries = [{key, value, mark?}], mark renders a
   star prefix in the legend (e.g. "system must always contain this type"). */
function buildDonutChart(target, entries, opts) {
    opts = opts || {};
    entries = entries.filter(function (e) { return e.value > 0; }).sort(function (a, b) { return b.value - a.value; });
    var total = entries.reduce(function (a, e) { return a + e.value; }, 0);

    target.innerHTML = "";
    if (!entries.length || !total) {
        target.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:20px 0;">' + (opts.emptyText || "No data") + "</p>";
        return;
    }

    var size = 150, r = 54, stroke = 14, c = 2 * Math.PI * r;
    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("width", size); svg.setAttribute("height", size);

    var bg = document.createElementNS(svgns, "circle");
    bg.setAttribute("cx", size / 2); bg.setAttribute("cy", size / 2); bg.setAttribute("r", r);
    bg.setAttribute("stroke-width", stroke);
    bg.setAttribute("class", "donut-ring-bg");
    svg.appendChild(bg);

    var offset = 0;
    var legendHtml = "";
    entries.forEach(function (e, i) {
        var frac = e.value / total;
        var len = frac * c;
        var color = DONUT_COLORS[Math.min(i, DONUT_COLORS.length - 1)];

        var ring = document.createElementNS(svgns, "circle");
        ring.setAttribute("cx", size / 2); ring.setAttribute("cy", size / 2); ring.setAttribute("r", r);
        ring.setAttribute("stroke-width", stroke);
        ring.setAttribute("stroke", color);
        ring.setAttribute("class", "donut-ring");
        ring.setAttribute("transform", "rotate(-90 " + size / 2 + " " + size / 2 + ")");
        ring.setAttribute("stroke-dasharray", "0 " + c);
        ring.setAttribute("stroke-dashoffset", -offset);
        ring.style.transition = "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1) " + (i * 120) + "ms, stroke-width .15s ease";
        wireTooltip(ring, e.key, e.value.toLocaleString() + " " + (opts.unit || "bodies") + " (" + Math.round(frac * 100) + "%)" + (e.mark ? " · every matching system has one" : ""));
        svg.appendChild(ring);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                ring.setAttribute("stroke-dasharray", len + " " + c);
            });
        });

        legendHtml += '<span><i style="background:' + color + '"></i>' + (e.mark ? "★ " : "") + escapeHtml(e.key) + "<b>" + Math.round(frac * 100) + "%</b></span>";
        offset += len;
    });

    var wrap = document.createElement("div");
    wrap.className = "donut-wrap";
    wrap.appendChild(svg);
    var center = document.createElement("div");
    center.className = "donut-center";
    center.innerHTML = '<span class="pct">' + Math.round((entries[0].value / total) * 100) + '%</span><span class="lbl">' + escapeHtml(entries[0].key) + "</span>";
    wrap.appendChild(center);

    target.appendChild(wrap);
    var legend = document.createElement("div");
    legend.className = "donut-legend";
    legend.innerHTML = legendHtml;
    target.appendChild(legend);
}

function buildDonut(rowclone, value) {
    var data = value["histograms"]["atmos_types"] || {};
    var entries = Object.keys(data).map(function (k) { return { key: k, value: data[k] }; });
    buildDonutChart(rowclone.querySelector(".codex_donut"), entries, { emptyText: "No atmosphere data", unit: "bodies" });
}

/* Body types a species actually hosts on — body_types is already scoped to
   hosting bodies only (unlike system_bodies, which counts every body of
   that type in the matching systems, hosting or not), so this reads the
   same way the atmosphere donut does: pure composition of where it lives. */
function buildBodyTypeDonut(rowclone, value) {
    var data = value["histograms"]["body_types"] || {};
    var musthave = value["systemBodyTypes"] || [];
    var entries = Object.keys(data).map(function (k) { return { key: k, value: data[k], mark: musthave.includes(k) }; });
    buildDonutChart(rowclone.querySelector(".codex_planetary_histogram"), entries, { emptyText: "No host body data", unit: "bodies" });
}

/* ---------------------------------------------------------------------- *
 * Charts
 * ---------------------------------------------------------------------- */

/* Sorted horizontal bar list: only the types actually present, ranked by
   count, full names, optional host/non-host stacked split. Much more
   legible than a fixed grid of every possible type abbreviated to 2-3
   letters, most of them empty. */
function renderTypeBars(target, rows, stacked) {
    target.innerHTML = "";
    if (!rows.length) {
        target.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:10px 0;">No data</p>';
        return;
    }
    var maxvalue = Math.max.apply(Math, rows.map(function (r) { return r.value; }));
    var list = document.createElement("div");
    list.className = "typebar-list";

    rows.sort(function (a, b) { return b.value - a.value; }).forEach(function (r, i) {
        var row = document.createElement("div");
        row.className = "typebar-row";

        var label = document.createElement("div");
        label.className = "typebar-label";
        label.textContent = r.label;
        if (r.always) label.classList.add("always");

        var track = document.createElement("div");
        track.className = "typebar-track";

        var hostPct = r.value ? (r.hostValue / r.value) * 100 : 0;

        var hostFill = document.createElement("div");
        hostFill.className = "typebar-fill " + (r.always ? "always" : (r.plain ? "nonhost" : "host"));
        hostFill.style.width = "0%";

        var nonhostFill = document.createElement("div");
        nonhostFill.className = "typebar-fill nonhost";
        nonhostFill.style.width = "0%";

        track.appendChild(hostFill);
        if (stacked) track.appendChild(nonhostFill);
        track.style.width = "0%";

        var value = document.createElement("div");
        value.className = "typebar-value";
        value.textContent = r.value.toLocaleString();

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(value);
        list.appendChild(row);

        if (r.hostTip) wireTooltip(hostFill, r.label, r.hostTip); else if (r.tip) wireTooltip(hostFill, r.label, r.tip);
        if (r.nonhostTip) wireTooltip(nonhostFill, r.label, r.nonhostTip);
        wireTooltip(track, r.label, r.tip || (r.value.toLocaleString() + " in matching systems"));

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                track.style.transitionDelay = (i * 25) + "ms";
                track.style.width = (maxvalue ? (r.value / maxvalue) * 100 : 0) + "%";
                hostFill.style.width = (stacked ? hostPct : 100) + "%";
                if (stacked) nonhostFill.style.width = (100 - hostPct) + "%";
            });
        });
    });
    target.appendChild(list);
}

function stellar_histogram(rowclone, data, primarystars, localstars, musthave) {
    var target = rowclone.querySelector(".codex_stellar_histogram");

    var scaffold = {
        "Stars": {
            "Giant": [
                { "name": "B (Blue-White super giant) Star", "tag": "B+" },
                { "name": "A (Blue-White super giant) Star", "tag": "A+" },
                { "name": "F (White super giant) Star", "tag": "F+" },
                { "name": "G (White-Yellow super giant) Star", "tag": "G+" },
                { "name": "K (Yellow-Orange giant) Star", "tag": "K+" },
                { "name": "M (Red super giant) Star", "tag": "M+" },
                { "name": "M (Red giant) Star", "tag": "M+" },
            ],
            "Scoopable": [
                { "name": "O (Blue-White) Star", "tag": "O" },
                { "name": "B (Blue-White) Star", "tag": "B" },
                { "name": "A (Blue-White) Star", "tag": "A" },
                { "name": "F (White) Star", "tag": "F" },
                { "name": "G (White-Yellow) Star", "tag": "G" },
                { "name": "K (Yellow-Orange) Star", "tag": "K" },
                { "name": "M (Red dwarf) Star", "tag": "M" },
            ],
            "Other": [
                { "name": "Supermassive Black Hole", "tag": "BH*" },
                { "name": "Black Hole", "tag": "BH" },
                { "name": "C Star", "tag": "C" },
                { "name": "CJ Star", "tag": "CJ" },
                { "name": "CN Star", "tag": "CN" },
                { "name": "Herbig Ae/Be Star", "tag": "He" },
                { "name": "MS-type Star", "tag": "MS" },
                { "name": "Neutron Star", "tag": "N" },
                { "name": "S-type Star", "tag": "S" },
                { "name": "T Tauri Star", "tag": "TTS" },
            ],
            "White Dwarfs": [
                { "name": "White Dwarf (D) Star", "tag": "D" },
                { "name": "White Dwarf (DA) Star", "tag": "DA" },
                { "name": "White Dwarf (DAB) Star", "tag": "DAB" },
                { "name": "White Dwarf (DAV) Star", "tag": "DAV" },
                { "name": "White Dwarf (DAZ) Star", "tag": "DAZ" },
                { "name": "White Dwarf (DB) Star", "tag": "DB" },
                { "name": "White Dwarf (DBV) Star", "tag": "DBV" },
                { "name": "White Dwarf (DBZ) Star", "tag": "DBZ" },
                { "name": "White Dwarf (DC) Star", "tag": "DC" },
                { "name": "White Dwarf (DCV) Star", "tag": "DCV" },
                { "name": "White Dwarf (DQ) Star", "tag": "DQ" },
            ],
            "Wolf-Rayet": [
                { "name": "Wolf-Rayet C Star", "tag": "WC" },
                { "name": "Wolf-Rayet N Star", "tag": "WN" },
                { "name": "Wolf-Rayet NC Star", "tag": "WNC" },
                { "name": "Wolf-Rayet O Star", "tag": "WO" },
                { "name": "Wolf-Rayet Star", "tag": "WR" },
            ],
            "Brown Dwarfs": [
                { "name": "L (Brown dwarf) Star", "tag": "L" },
                { "name": "T (Brown dwarf) Star", "tag": "T" },
                { "name": "Y (Brown dwarf) Star", "tag": "Y" },
            ]
        }
    };

    var rows = [];
    Object.keys(scaffold).forEach(function (type) {
        Object.keys(scaffold[type]).forEach(function (subtype) {
            scaffold[type][subtype].forEach(function (entry) {
                var key = entry["name"];
                var value = data[key] || 0;
                if (!value) return;

                var always = musthave.includes(key);
                var tip = value.toLocaleString();
                if (primarystars.includes(key) && localstars.includes(key)) tip = "Primary & local · " + tip;
                else if (primarystars.includes(key)) tip = "Primary star · " + tip;
                else if (localstars.includes(key)) tip = "Local star · " + tip;
                if (always) tip = "System must contain · " + tip;

                rows.push({
                    label: (always ? "★ " : "") + key,
                    value: value,
                    hostValue: value,
                    always: always,
                    plain: !(primarystars.includes(key) || localstars.includes(key)),
                    tip: tip
                });
            });
        });
    });
    renderTypeBars(target, rows, false);
}

function histogram(data, footer, tmin, tmax) {
    var template = document.querySelector("#histogram");
    var hist = template.content.cloneNode(true);
    var i = 0;
    var maxvalue = 0;

    data.forEach(function (x) { if (x["value"] > maxvalue) maxvalue = x["value"]; });

    data.forEach(function (x) {
        i += 1;
        var min = x["min"], max = x["max"], value = x["value"] || 0;
        var myheight = maxvalue ? (value / maxvalue) * 50 : 0;

        var bar = hist.querySelector("#h" + i);
        var rect = hist.querySelector("#r" + i);
        var foot = hist.querySelector("#hfooter #foot");
        growBar(rect, 50, 50 - myheight, myheight);
        rect.setAttribute("rx", 3);
        rect.setAttribute("ry", 3);
        bar.setAttribute("class", value > 0 ? "bar_s" : "bar_g");

        if (min !== undefined) {
            wireTooltip(bar, footer, value.toLocaleString() + " bodies (" + Number(min).toPrecision(4) + " - " + Number(max).toPrecision(4) + ")");
        }
        foot.textContent = footer + ": " + tmin.toPrecision(6) + " - " + tmax.toPrecision(6);
    });

    return hist;
}

/* ---------------------------------------------------------------------- *
 * Page assembly
 * ---------------------------------------------------------------------- */

function makePage(data, rawEntryId) {
    var entry;
    if (!isNaN(rawEntryId)) {
        entry = {};
        entry[rawEntryId] = data;
    } else {
        entry = data;
    }

    var link = document.querySelector("#jsonlink");
    link.innerHTML = '<a href="https://us-central1-canonn-api-236217.cloudfunctions.net/query/biostats/' + rawEntryId + '" target="_blank">download json</a>';

    var container = document.getElementById("container");
    container.innerHTML = "";

    if (!("content" in document.createElement("template")) || Object.keys(entry).length === 0) {
        container.innerHTML = '<div class="intro-card"><h2>No such biology found</h2><p>Try a different name, e.g. Bacterium or Concha Renibus.</p></div>';
        resetLogo();
        return;
    }

    var regionmap = document.querySelector("#map");
    var matschart = document.querySelector("#materials_chart");
    var row = document.querySelector("#row");

    var i = 0;
    for (var key in entry) {
        if (!entry.hasOwnProperty(key)) continue;
        var value = entry[key];

        var regionclone = regionmap.content.cloneNode(true);
        var rowclone = row.content.cloneNode(true);
        var matsclone = matschart.content.cloneNode(true);

        rowclone.querySelector(".entry").style.setProperty("--i", i++);

        (value.regions || []).forEach(function (x) {
            var id = regions[x];
            var region = id && regionclone.querySelector(id);
            if (region) region.classList.add("region_selected");
        });

        var localstars = value["localStars"] ? value["localStars"].toLocaleString() : [];

        stellar_histogram(rowclone, value["histograms"]["system_bodies"], value["primaryStars"], localstars, value["systemBodyTypes"]);
        buildBodyTypeDonut(rowclone, value);

        var header = rowclone.querySelector(".codex_header");
        header.textContent = value["name"];

        var meta = rowclone.querySelector(".codex_meta");
        var metaHtml = '<span class="chip accent">' + escapeHtml(value["hud_category"] || "") + "</span>";
        if (value["count"]) metaHtml += '<span class="chip">' + value["count"].toLocaleString() + " occurrences</span>";
        if (value["regions"]) metaHtml += '<span class="chip">' + value["regions"].length + " regions</span>";
        if (value["reward"]) metaHtml += '<span class="chip reward">$' + value["reward"].toLocaleString() + "</span>";
        metaHtml += '<a class="chip" target="_blank" href="https://map.canonn.tech/codex.html?english_name=' + encodeURIComponent(value["name"]) + '">Canonn Map ↗</a>';
        meta.innerHTML = metaHtml;

        var hud_category = value["hud_category"];
        var huds = ["Biology", "Guardian", "Thargoid"];
        var bodyTypeCount = Object.keys(value["histograms"]["body_types"] || {}).length;
        buildStats(rowclone, value, bodyTypeCount);

        if (huds.includes(hud_category)) {
            buildDonut(rowclone, value);
            buildNicheRadar(rowclone, value);

            var gravity = rowclone.querySelector(".codex_gravity_value");
            gravity.textContent = "";
            gravity.appendChild(histogram(value["histograms"]["gravity"], "Gravity", value["ming"], value["maxg"]));

            var temp = rowclone.querySelector(".codex_temperature_value");
            temp.textContent = "";
            temp.appendChild(histogram(value["histograms"]["temperature"], "Temperature", value["mint"], value["maxt"]));

            var distance = rowclone.querySelector(".codex_distance_value");
            distance.textContent = "";
            distance.appendChild(histogram(value["histograms"]["distance"], "Distance (ls)", value["mind"], value["maxd"]));

            var pressure = rowclone.querySelector(".codex_pressure_value");
            pressure.textContent = "";
            pressure.appendChild(histogram(value["histograms"]["pressure"], "Pressure (Atmos)", value["minp"], value["maxp"]));

            var mat_values = Object.keys(value["histograms"]["materials"]).map(function (k) {
                return parseInt(value["histograms"]["materials"][k]);
            });
            var mat_max = Math.max.apply(Math, mat_values);
            var common_mats = value["materials"];

            Object.keys(value["histograms"]["materials"]).forEach(function (k) {
                var mymat = matsclone.querySelector("#" + k);
                var mymattitle = matsclone.querySelector("#t_" + k);
                var gmymattitle = matsclone.querySelector("#gt_" + k);
                var periodic = matsclone.querySelector("#gt_" + k + " #r" + k);
                var myg = matsclone.querySelector("#g_" + k);
                var myheight = Math.round((value["histograms"]["materials"][k] / mat_max) * 50);
                var myvalue = value["histograms"]["materials"][k];

                if (common_mats.includes(k)) {
                    myg.setAttribute("class", gmymattitle.getAttribute("class"));
                }
                growBar(mymat, 50, 50 - myheight, myheight);
                mymat.setAttribute("rx", 3);
                mymat.setAttribute("ry", 3);
                periodic.setAttribute("rx", 3);
                periodic.setAttribute("ry", 3);

                mymattitle.textContent = k + " " + myvalue;
                var mymattitle2 = matsclone.querySelector("#t2_" + k);
                mymattitle2.textContent = k + " " + myvalue;
                wireTooltip(myg, k, myvalue.toLocaleString() + (common_mats.includes(k) ? " · common material" : ""));
            });

            var matdiv = rowclone.querySelector(".codex_material_list");
            matdiv.textContent = "";
            matdiv.appendChild(matsclone);
        } else {
            rowclone.querySelectorAll(".hero-radar, .hero-donut, .panel-envrow, .panel-materials").forEach(function (p) {
                p.style.display = "none";
            });
        }

        var regionTarget = rowclone.querySelector(".codex_region");
        regionTarget.textContent = "";
        regionTarget.appendChild(regionclone);

        container.appendChild(rowclone);

        var svgEl = regionTarget.querySelector("svg#galaxy");
        if (svgEl) {
            var mapCtl = setupRegionMap(regionTarget, svgEl);
            plotSystemPins(svgEl, mapCtl, key, hud_category);
        }
    }

    resetLogo();
}

function resetLogo() {
    requestAnimationFrame(function () {
        setTimeout(function () {
            document.getElementById("logo").src = "img/Canonn-Logo_transparent_50_f1.gif";
        });
    });
    document.getElementById("logo").src = "img/Canonn-Logo_transparent_50_f1.gif";
}

/* ---------------------------------------------------------------------- *
 * Boot
 * ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", function () {
    if (entryid) {
        trimmedsysname = entryid.trim();
        document.title = "Biology Statistics - " + trimmedsysname;
        document.querySelector(".searchform input").value = trimmedsysname;
    }
    document.querySelector(".searchform input").addEventListener("keyup", function (e) {
        if (e.key === "Enter") submitentry();
    });
    getEntryInfo(entryid);
});
