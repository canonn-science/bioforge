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

// What the codex ID suffix says the life form is tied to (star class, material, or neither)
var STAR_LIFE = {
    O: ["O-type star", "#9db4ff"], B: ["B-type star", "#aac0ff"], A: ["A-type star", "#cad8ff"],
    F: ["F-type star", "#f8f7ff"], G: ["G-type star", "#fff4ea"], K: ["K-type star", "#ffd2a1"],
    M: ["M-type red dwarf", "#ff9a6b"], L: ["L-type brown dwarf", "#b5651d"], T: ["T-type brown dwarf", "#8c4a1a"],
    Y: ["Y-type brown dwarf", "#6b3a1a"], D: ["white dwarf", "#e6ecff"], N: ["neutron star", "#5bc0de"],
    W: ["Wolf-Rayet star", "#b48cff"], TTS: ["T Tauri star", "#ff8fb1"], Ae: ["Herbig Ae/Be star", "#ff6fa8"]
};

// Surface materials this game actually spawns, grouped by rarity tier
var MAT_RARITY = {
    v: { label: "Very common", colour: "#5bc0de" }, c: { label: "Common", colour: "#62c462" },
    s: { label: "Standard", colour: "#f89406" }, r: { label: "Rare", colour: "#ee5f5b" }
};
var MAT_GAME = {
    Carbon: "v", Phosphorus: "v", Sulphur: "v", Iron: "v", Nickel: "v",
    Vanadium: "c", Chromium: "c", Manganese: "c", Zinc: "c", Germanium: "c", Arsenic: "c", Zirconium: "c",
    Niobium: "s", Molybdenum: "s", Cadmium: "s", Tin: "s", Tungsten: "s", Mercury: "s",
    Selenium: "r", Yttrium: "r", Technetium: "r", Ruthenium: "r", Antimony: "r", Tellurium: "r", Polonium: "r"
};

// Genera with no star/material tag in their codex ID that, measured against the
// galaxy's nebula catalogue, turned out to cluster far closer to a nebula than
// star- or material-tagged species do (3-75% of sightings within 100ly, vs ~2-3%
// for tagged species) — Amphora Plant and Crystalline Shards do NOT show this and
// stay "General".
var NEBULA_GENERA = ["Anemone", "Brain Tree", "Sinuous Tubers", "Bark Mounds"];

function lifeKind(fdevname, name) {
    var parts = fdevname ? fdevname.split(/[_;$]/) : [];
    var k = parts.length >= 3 ? parts[parts.length - 3] : null;
    if (k && MAT_GAME.hasOwnProperty(k)) {
        return { title: k + "-based life", colour: MAT_RARITY[MAT_GAME[k]].colour, note: "Needs " + k + " on its host body" };
    }
    if (k && STAR_LIFE[k]) {
        return { title: "Stellar-based life", colour: STAR_LIFE[k][1], note: "Tied to a " + STAR_LIFE[k][0] };
    }
    if (name && NEBULA_GENERA.some(function (g) { return name.indexOf(g) !== -1; })) {
        return { title: "Nebula-based life", colour: "#a78bfa", note: "Clusters close to a galactic nebula" };
    }
    return { title: "General life", colour: "#9aa3ad", note: "No material, star-class or nebula tie in its codex ID" };
}

// Short element symbols for the 25 in-game surface materials, in the same
// common-to-rare order as MAT_GAME so a plain Object.keys() walk already
// yields the right order for the rarity cube below.
var MAT_SYMBOL = {
    Carbon: "C", Phosphorus: "P", Sulphur: "S", Iron: "Fe", Nickel: "Ni",
    Vanadium: "V", Chromium: "Cr", Manganese: "Mn", Zinc: "Zn", Germanium: "Ge", Arsenic: "As", Zirconium: "Zr",
    Niobium: "Nb", Molybdenum: "Mo", Cadmium: "Cd", Tin: "Sn", Tungsten: "W", Mercury: "Hg",
    Selenium: "Se", Yttrium: "Y", Technetium: "Tc", Ruthenium: "Ru", Antimony: "Sb", Tellurium: "Te", Polonium: "Po"
};
var MAT_CUBE_ORDER = Object.keys(MAT_GAME); // 25 materials, common -> rare

/* Materials panel as a rarity cube: the 25 in-game surface materials laid out
   5x5, common (top-left) to rare (bottom-right). Tile colour = rarity tier,
   fill = must-have (on virtually every body) vs may-have vs never. */
function buildMaterialsCube(target, value) {
    var matHist = value["histograms"]["materials"] || {};
    var bodyTotal = Object.keys(value["histograms"]["body_types"] || {}).reduce(function (a, k) {
        return a + value["histograms"]["body_types"][k];
    }, 0) || 1;
    var mustHave = {};
    (value["materials"] || []).forEach(function (k) { mustHave[k] = 1; });
    var fdevParts = value["fdevname"] ? value["fdevname"].split(/[_;$]/) : [];
    var fdevTag = fdevParts.length >= 3 ? fdevParts[fdevParts.length - 3] : null;
    var named = fdevTag && MAT_GAME.hasOwnProperty(fdevTag) ? fdevTag : null;

    function status(name) {
        if (mustHave[name]) return "must";
        return matHist[name] ? "may" : "none";
    }

    target.innerHTML = "";
    var cols = 5, c = 68, W = cols * c + 20, H = Math.ceil(MAT_CUBE_ORDER.length / cols) * c + 20;
    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    MAT_CUBE_ORDER.forEach(function (name, i) {
        var st = status(name);
        var rarity = MAT_RARITY[MAT_GAME[name]];
        var colour = rarity.colour;
        var col = i % cols, row = Math.floor(i / cols);

        var g = document.createElementNS(svgns, "g");
        g.setAttribute("transform", "translate(" + (10 + col * c) + "," + (10 + row * c) + ")");
        g.style.cursor = "default";

        var rect = document.createElementNS(svgns, "rect");
        rect.setAttribute("width", c - 6); rect.setAttribute("height", c - 6); rect.setAttribute("rx", 7);
        rect.setAttribute("fill", colour);
        rect.setAttribute("fill-opacity", st === "must" ? 1 : st === "may" ? 0.35 : 0.2);
        rect.setAttribute("stroke", st === "none" ? "var(--border)" : colour);
        rect.setAttribute("stroke-width", st === "must" ? 0 : 1.5);
        if (st === "may") rect.setAttribute("stroke-dasharray", "4 3");
        g.appendChild(rect);

        var sym = document.createElementNS(svgns, "text");
        sym.setAttribute("x", (c - 6) / 2); sym.setAttribute("y", 30); sym.setAttribute("text-anchor", "middle");
        sym.setAttribute("font-size", 18);
        sym.setAttribute("fill", st === "must" ? "#0b0f15" : st === "none" ? "var(--text-dim)" : "var(--text)");
        sym.textContent = MAT_SYMBOL[name];
        g.appendChild(sym);

        var count = matHist[name];
        var pctText = document.createElementNS(svgns, "text");
        pctText.setAttribute("x", (c - 6) / 2); pctText.setAttribute("y", 46); pctText.setAttribute("text-anchor", "middle");
        pctText.setAttribute("font-size", 10);
        pctText.setAttribute("fill", st === "must" ? "#0b0f15" : "var(--text-dim)");
        pctText.textContent = count ? Math.round((count / bodyTotal) * 100) + "%" : "–";
        g.appendChild(pctText);

        if (named === name) {
            var dot = document.createElementNS(svgns, "circle");
            dot.setAttribute("cx", c - 18); dot.setAttribute("cy", 11); dot.setAttribute("r", 3.5);
            dot.setAttribute("fill", "#fff"); dot.setAttribute("stroke", "#0b0f15");
            g.appendChild(dot);
        }

        wireTooltip(g, name + " · " + rarity.label,
            (st === "none" ? "Never seen with this species"
                : st === "must" ? "Must have: on virtually every body"
                    : "May have: sometimes present") +
            (count ? "<br>" + count.toLocaleString() + " of its bodies" : ""));
        svg.appendChild(g);
    });

    var wrap = document.createElement("div");
    wrap.className = "colchart-scroll";
    wrap.appendChild(svg);
    target.appendChild(wrap);

    var legend = document.createElement("div");
    legend.className = "mat-legend";
    legend.innerHTML = Object.keys(MAT_RARITY).map(function (k) {
        return '<span><i style="background:' + MAT_RARITY[k].colour + '"></i>' + MAT_RARITY[k].label + "</span>";
    }).join("");
    target.appendChild(legend);
}

/* Each example doubles as a lesson in how the search works; the hover text explains what it resolves to. */
var EXAMPLES = [
    { term: "Radia", tip: "Partial words work. Every name containing \"radia\" matches, here the six Electricae Radialem colour variants." },
    { term: "Maroon", tip: "Search a colour to compare it across species: 35 Maroon variants from many different genera." },
    { term: "Squid,Globe", tip: "You can give a comma separated list of search terms and it will return everything that matches each search term: here the Squid Mollusc and Globe Mollusc clouds plus a Guardian site (13 entries)." },
    { term: "Storm", tip: "A single keyword also finds non-biology codex entries, such as the Lagrange Storm Clouds." },
    { term: "Nonhuman", tip: "Some searches are very specific: this finds just one entry, the Thargoid Nonhuman Signature." },
    { term: "Guardian Beacon", tip: "Words are matched together as a phrase, so this returns the single Guardian Beacon entry rather than every Guardian site." },
    { term: "Concha Labiata - Teal", tip: "Use a full species and colour name to open exactly one variant." },
    { term: "Thargoid", tip: "A broad term returns the whole family: barnacles, interceptors, scavengers and more." }
];

function renderIntro(container) {
    var buttons = EXAMPLES.map(function (ex) {
        return '<a class="example" tabindex="0" href="?entryid=' + encodeURIComponent(ex.term) + '" data-tip="' + escapeHtml(ex.tip) + '">' + escapeHtml(ex.term) + "</a>";
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
    var PIN_PX = 2; // system markers are always this many screen pixels in radius, whatever the zoom or map size

    // SVG units per screen pixel for the current view (the map is square, so the shorter side governs)
    function pinRadius() {
        var box = svgElement.getBoundingClientRect();
        var px = Math.min(box.width, box.height) || 500;
        return PIN_PX * vb[2] / px;
    }

    function apply() {
        svgElement.setAttribute("viewBox", vb.join(" "));
        var r = pinRadius().toString();
        svgElement.querySelectorAll("circle.location-dot").forEach(function (c) {
            c.setAttribute("r", r);
        });
    }

    // fullscreen and window resizes change the pixel size of the map, so markers need re-sizing too
    function onResize() { requestAnimationFrame(apply); }
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onResize);

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

    return { zoomToRegion: zoomToRegion, zoomOut: reset, scale: function () { return full[2] / vb[2]; }, pinRadius: pinRadius };
}

// Some dumpr CSV dumps aren't named after their numeric codex entry id;
// map those entries' fdevname to the actual filename on disk.
var DUMP_SLUG_OVERRIDES = {
    "$POIScene_Wreckage_UA;": "nonhuman" // Thargoid Nonhuman Signature
};

// The dumpr CSV dumps are refreshed infrequently server-side, but the bucket
// only sets a 1-hour Cache-Control; stash the text in localStorage for a day
// so repeat views of the same entry don't refetch it every hour.
var DUMP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
function fetchCsvCached(url) {
    var cacheKey = "dumpr_cache:" + url;
    try {
        var cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached && Date.now() - cached.t < DUMP_CACHE_TTL_MS) return Promise.resolve(cached.text);
    } catch (e) { /* ignore unreadable/missing cache entry */ }

    return fetch(url).then(function (r) { return r.text(); }).then(function (text) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), text: text })); } catch (e) { /* storage full/unavailable */ }
        return text;
    });
}

function plotSystemPins(svgElement, mapCtl, numericEntryId, hudCategory, systemsTarget, fdevname) {
    if (!numericEntryId || !hudCategory) return;
    var slug = DUMP_SLUG_OVERRIDES[fdevname] || numericEntryId;
    var url = "https://storage.googleapis.com/canonn-downloads/dumpr/" + hudCategory + "/" + slug + ".csv";

    fetchCsvCached(url)
        .then(function (csvText) {
            var lines = csvText.trim().split("\n");
            if (!lines.length || !lines[0]) return;
            var dotGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            dotGroup.setAttribute("id", "dot-group");
            svgElement.appendChild(dotGroup);

            var seenSystems = {};
            var seenCount = 0;
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

                    if (!seenSystems[name]) { seenSystems[name] = true; seenCount++; }

                    var regionEl = svgElement.getElementById("Region_" + cRegion.padStart(2, "0"));
                    if (regionEl) regionEl.classList.add("region_selected");

                    var tx = (x + 49985) * 83 / 4096;
                    var tz = (z + 24105) * 83 / 4096;
                    addPin(dotGroup, svgElement, mapCtl, tx, 2048 - tz, name);
                }
                // keep the Systems stat in step with the pins as they are drawn
                if (systemsTarget) systemsTarget.textContent = seenCount.toLocaleString();
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
    circle.setAttribute("r", mapCtl.pinRadius().toString());
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
    var allRegions = (value["regions"] || []).length >= Object.keys(regions).length; // seen in every galactic region
    var stats = [
        { label: "Sightings", value: value["count"] || 0, tip: sightingsNote(sumValues(value["histograms"]["body_types"]), value["count"]) },
        { label: "Systems", value: 0, cls: "codex_systems_value" },
        { label: "Regions", value: (value["regions"] || []).length, prefix: allRegions ? "All " : "" },
        { label: "Body types", value: bodyTypeCount },
    ];
    var html = stats.map(function (s) {
        return '<div class="stat"' + (s.tip ? ' data-tip="' + escapeHtml(s.tip) + '"' : "") + '><span class="stat-value ' + (s.cls || "") + '">0</span><span class="stat-label">' + escapeHtml(s.label) + "</span></div>";
    }).join("");
    if (value["reward"]) {
        html += '<div class="stat reward"><span class="stat-value">$0</span><span class="stat-label">Reward</span></div>';
        stats.push({ label: "Reward", value: value["reward"], prefix: "$" });
    }
    target.innerHTML = html;
    var nodes = target.querySelectorAll(".stat-value");
    stats.forEach(function (s, i) {
        if (s.cls) return; // filled in once its async source (region map pins) resolves
        countUp(nodes[i], s.value, { prefix: s.prefix || "", duration: 900 + i * 150 });
    });
}

/* Shared radar/spider chart: axes = [{label, norm (0..1), tooltip}]. */
function buildRadarChart(target, axes) {
    var size = 270, cx = size / 2, cy = size / 2, r = 73;
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

/* A codex entry's `count` is every sighting, but the body-level histograms (atmosphere, body type,
   volcanism) only cover sightings where the body's details were recorded. The difference is shown as
   its own slice so every donut adds up to the sighting count. */
var UNRECORDED_KEY = "Body data unrecorded";
var UNRECORDED_COLOR = "#4a535e";

function sumValues(obj) {
    return Object.keys(obj || {}).reduce(function (a, k) { return a + obj[k]; }, 0);
}

function sightingsNote(recorded, count) {
    if (!count) return "";
    if (count > recorded) return recorded.toLocaleString() + " of " + count.toLocaleString() + " sightings have body data";
    return "All " + count.toLocaleString() + " sightings have body data";
}

/* Put the note in the panel title's "?" hover (reusing the one that's already there, if any). */
function addSightingsNote(target, note) {
    var panel = target.closest(".panel");
    var h3 = panel && panel.querySelector("h3");
    if (!h3 || !note) return;
    var info = h3.querySelector(".info");
    if (!info) {
        info = document.createElement("i");
        info.className = "info";
        info.textContent = "?";
        h3.appendChild(info);
    }
    var prev = info.dataset.tip || info.title;
    info.removeAttribute("title");
    info.dataset.tip = (prev ? prev + ". " : "") + note;
}

/* Styled hover text for the "?" icons and hero stats: the same floating tooltip the charts use, so
   it is never clipped by a panel. Static icons in the HTML template carry a native title; move those
   over to data-tip when a row is built. */
function upgradeTips(root) {
    root.querySelectorAll(".info[title]").forEach(function (el) {
        el.dataset.tip = el.getAttribute("title");
        el.removeAttribute("title");
    });
}

(function wireInfoTips() {
    var sel = ".info[data-tip], .stat[data-tip]";
    document.addEventListener("mouseover", function (e) {
        var el = e.target.closest(sel);
        if (el) showViz(e, "", escapeHtml(el.dataset.tip));
    });
    document.addEventListener("mousemove", function (e) {
        if (e.target.closest(sel)) positionViz(e);
    });
    document.addEventListener("mouseout", function (e) {
        var el = e.target.closest(sel);
        if (el && !el.contains(e.relatedTarget)) hideViz();
    });
})();

/* Shared animated donut: entries = [{key, value, mark?}], mark renders a
   star prefix in the legend (e.g. "system must always contain this type"). */
function buildDonutChart(target, entries, opts) {
    opts = opts || {};
    entries = entries.filter(function (e) { return e.value > 0; }).sort(function (a, b) { return b.value - a.value; });
    var recorded = entries.reduce(function (a, e) { return a + e.value; }, 0);
    var gap = opts.count && opts.count > recorded ? opts.count - recorded : 0;
    if (gap) entries.push({ key: UNRECORDED_KEY, value: gap, unrecorded: true }); // always last, whatever its size
    var total = recorded + gap;
    if (opts.count) addSightingsNote(target, sightingsNote(recorded, opts.count));

    target.innerHTML = "";
    if (!entries.length || !total) {
        target.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:20px 0;">' + (opts.emptyText || "No data") + "</p>";
        return;
    }

    var size = 245, r = 88, stroke = 19, c = 2 * Math.PI * r;
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
        var color = e.unrecorded ? UNRECORDED_COLOR : DONUT_COLORS[Math.min(i, DONUT_COLORS.length - 1)];

        var ring = document.createElementNS(svgns, "circle");
        ring.setAttribute("cx", size / 2); ring.setAttribute("cy", size / 2); ring.setAttribute("r", r);
        ring.setAttribute("stroke-width", stroke);
        ring.setAttribute("stroke", color);
        ring.setAttribute("class", "donut-ring");
        ring.setAttribute("transform", "rotate(-90 " + size / 2 + " " + size / 2 + ")");
        ring.setAttribute("stroke-dasharray", "0 " + c);
        ring.setAttribute("stroke-dashoffset", -offset);
        ring.style.transition = "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1) " + (i * 120) + "ms, stroke-width .15s ease";
        wireTooltip(ring, e.key, e.unrecorded
            ? e.value.toLocaleString() + " sightings (" + Math.round(frac * 100) + "%) with no body details recorded"
            : e.value.toLocaleString() + " " + (opts.unit || "bodies") + " (" + Math.round(frac * 100) + "%)" + (e.mark ? " · every matching system has one" : ""));
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
    buildDonutChart(rowclone.querySelector(".codex_donut"), entries, { emptyText: "No atmosphere data", unit: "bodies", count: value["count"] });
}

/* Body types a species actually hosts on — body_types is already scoped to
   hosting bodies only (unlike system_bodies, which counts every body of
   that type in the matching systems, hosting or not), so this reads the
   same way the atmosphere donut does: pure composition of where it lives. */
function buildBodyTypeDonut(rowclone, value) {
    var data = value["histograms"]["body_types"] || {};
    var musthave = value["systemBodyTypes"] || [];
    var entries = Object.keys(data).map(function (k) { return { key: k, value: data[k], mark: musthave.includes(k) }; });
    buildDonutChart(rowclone.querySelector(".codex_planetary_histogram"), entries, { emptyText: "No host body data", unit: "bodies", count: value["count"] });
}

/* Volcanism (inner ring) — volcanic_body_types is keyed "<body type> -
   <volcanism type>"; stripping the body type and summing gives the inner
   ring, same as before. Body types get an outer ring on top, aligned so a
   volcanism type's body-type slices sit exactly under its own inner arc
   rather than under the chart's overall 0-100% sweep. */
function buildVolcanismDonut(rowclone, value) {
    var target = rowclone.querySelector(".codex_volcanism");
    var raw = value["histograms"]["volcanic_body_types"] || {};

    // Split "<body type> - <volcanism type>" into a per-volcanism list of
    // body-type counts, and roll up the volcanism totals for the inner ring.
    var byVolc = {};
    var volcTotals = {};
    Object.keys(raw).forEach(function (k) {
        var sep = k.indexOf(" - ");
        if (sep === -1) return;
        var bt = k.slice(0, sep), volc = k.slice(sep + 3), n = raw[k];
        (byVolc[volc] || (byVolc[volc] = [])).push({ key: bt, value: n });
        volcTotals[volc] = (volcTotals[volc] || 0) + n;
    });
    var volcTypes = Object.keys(volcTotals).filter(function (v) { return volcTotals[v] > 0; })
        .sort(function (a, b) { return volcTotals[b] - volcTotals[a]; });
    var recorded = volcTypes.reduce(function (a, v) { return a + volcTotals[v]; }, 0);
    var count = value["count"] || 0;
    var gap = count > recorded ? count - recorded : 0;
    var firstVolc = volcTypes[0]; // largest recorded type, used for the centre label
    if (gap) { // the unrecorded slice sits last on both rings
        volcTotals[UNRECORDED_KEY] = gap;
        byVolc[UNRECORDED_KEY] = [{ key: UNRECORDED_KEY, value: gap }];
        volcTypes.push(UNRECORDED_KEY);
    }
    var total = recorded + gap;
    addSightingsNote(target, sightingsNote(recorded, count));

    target.innerHTML = "";
    if (!volcTypes.length || !total) {
        target.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:20px 0;">No volcanism data</p>';
        return;
    }

    // Global colour per body type, ranked across the whole species so a
    // given body type always gets the same colour regardless of which
    // volcanism type it's under.
    var btTotals = {};
    Object.keys(raw).forEach(function (k) {
        var sep = k.indexOf(" - ");
        var bt = sep === -1 ? k : k.slice(0, sep);
        btTotals[bt] = (btTotals[bt] || 0) + raw[k];
    });
    var btColor = {};
    btColor[UNRECORDED_KEY] = UNRECORDED_COLOR;
    Object.keys(btTotals).sort(function (a, b) { return btTotals[b] - btTotals[a]; })
        .forEach(function (bt, i) { btColor[bt] = DONUT_COLORS[(i + 2) % DONUT_COLORS.length]; });

    var size = 270, cx = size / 2, cy = size / 2;
    var r1 = 63, sw1 = 19, c1 = 2 * Math.PI * r1;
    var r2 = 96, sw2 = 19, c2 = 2 * Math.PI * r2;
    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("width", size); svg.setAttribute("height", size);

    [[r1, sw1], [r2, sw2]].forEach(function (ring) {
        var bg = document.createElementNS(svgns, "circle");
        bg.setAttribute("cx", cx); bg.setAttribute("cy", cy); bg.setAttribute("r", ring[0]);
        bg.setAttribute("stroke-width", ring[1]);
        bg.setAttribute("class", "donut-ring-bg");
        svg.appendChild(bg);
    });

    var volcLegend = "", btLegend = "", btLegendSeen = {};
    var fracCursor = 0;
    volcTypes.forEach(function (volc, i) {
        var frac = volcTotals[volc] / total;
        var unrec = volc === UNRECORDED_KEY;
        var color = unrec ? UNRECORDED_COLOR : DONUT_COLORS[i % DONUT_COLORS.length];

        var ring1 = document.createElementNS(svgns, "circle");
        ring1.setAttribute("cx", cx); ring1.setAttribute("cy", cy); ring1.setAttribute("r", r1);
        ring1.setAttribute("stroke-width", sw1);
        ring1.setAttribute("stroke", color);
        ring1.setAttribute("class", "donut-ring");
        ring1.setAttribute("transform", "rotate(-90 " + cx + " " + cy + ")");
        ring1.setAttribute("stroke-dasharray", "0 " + c1);
        ring1.setAttribute("stroke-dashoffset", -fracCursor * c1);
        ring1.style.transition = "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1) " + (i * 120) + "ms, stroke-width .15s ease";
        wireTooltip(ring1, volc, volcTotals[volc].toLocaleString() + (unrec ? " sightings (" : " bodies (") + Math.round(frac * 100) + "%)" + (unrec ? " with no body details recorded" : ""));
        svg.appendChild(ring1);
        (function (ring, targetLen) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { ring.setAttribute("stroke-dasharray", targetLen + " " + c1); });
            });
        })(ring1, frac * c1);
        volcLegend += '<span><i style="background:' + color + '"></i>' + escapeHtml(volc) + "<b>" + Math.round(frac * 100) + "%</b></span>";

        // Outer ring: this volcanism type's body-type split, confined to the
        // exact same [fracCursor, fracCursor + frac) slice of the circle.
        var subs = (byVolc[volc] || []).filter(function (s) { return s.value > 0; }).sort(function (a, b) { return b.value - a.value; });
        var subTotal = subs.reduce(function (a, s) { return a + s.value; }, 0);
        var subCursor = fracCursor;
        subs.forEach(function (s, j) {
            var subFrac = subTotal ? (s.value / subTotal) * frac : 0;
            if (!subFrac) return;
            var scolor = btColor[s.key];

            var ring2 = document.createElementNS(svgns, "circle");
            ring2.setAttribute("cx", cx); ring2.setAttribute("cy", cy); ring2.setAttribute("r", r2);
            ring2.setAttribute("stroke-width", sw2);
            ring2.setAttribute("stroke", scolor);
            ring2.setAttribute("class", "donut-ring");
            ring2.setAttribute("transform", "rotate(-90 " + cx + " " + cy + ")");
            ring2.setAttribute("stroke-dasharray", "0 " + c2);
            ring2.setAttribute("stroke-dashoffset", -subCursor * c2);
            ring2.style.transition = "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1) " + (i * 120 + j * 40) + "ms, stroke-width .15s ease";
            wireTooltip(ring2, unrec ? UNRECORDED_KEY : s.key + " · " + volc, s.value.toLocaleString() + (unrec ? " sightings" : " bodies"));
            svg.appendChild(ring2);
            (function (ring, targetLen) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () { ring.setAttribute("stroke-dasharray", targetLen + " " + c2); });
                });
            })(ring2, subFrac * c2);

            if (!btLegendSeen[s.key] && !unrec) {
                btLegendSeen[s.key] = true;
                btLegend += '<span><i style="background:' + scolor + '"></i>' + escapeHtml(s.key) + "</span>";
            }
            subCursor += subFrac;
        });

        fracCursor += frac;
    });

    var wrap = document.createElement("div");
    wrap.className = "donut-wrap";
    wrap.appendChild(svg);
    var center = document.createElement("div");
    center.className = "donut-center";
    var lead = firstVolc || volcTypes[0];
    center.innerHTML = '<span class="pct">' + Math.round((volcTotals[lead] / total) * 100) + '%</span><span class="lbl">' + escapeHtml(lead) + "</span>";
    wrap.appendChild(center);
    target.appendChild(wrap);

    var legend = document.createElement("div");
    legend.className = "donut-legend";
    legend.innerHTML = volcLegend;
    target.appendChild(legend);

    if (btLegend) {
        var legend2 = document.createElement("div");
        legend2.className = "donut-legend donut-legend-outer";
        legend2.innerHTML = '<span class="donut-legend-title">Body types (outer ring)</span>' + btLegend;
        target.appendChild(legend2);
    }
}

/* ---------------------------------------------------------------------- *
 * Charts
 * ---------------------------------------------------------------------- */

/* Vertical column chart: one bar per category, labelled on the x-axis.
   rows = [{tag, fullName, value, always, plain, tip}], left to right in the
   order given (callers sort/order rows themselves). */
function renderColumnChart(target, rows) {
    target.innerHTML = "";
    if (!rows.length) {
        target.innerHTML = '<p style="color:var(--text-dim);font-size:12px;margin:10px 0;">No data</p>';
        return;
    }
    var maxvalue = Math.max.apply(Math, rows.map(function (r) { return r.value; }));
    var colW = 40, barMaxH = 100, axisH = 28;
    var W = rows.length * colW, H = barMaxH + axisH + 14;

    var wrap = document.createElement("div");
    wrap.className = "colchart-scroll";
    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    rows.forEach(function (r, i) {
        var h = maxvalue ? (r.value / maxvalue) * barMaxH : 0;
        var displayH = r.value ? h : 2;
        var cx = i * colW + colW / 2;

        var bar = document.createElementNS(svgns, "rect");
        bar.setAttribute("x", i * colW + 6);
        bar.setAttribute("width", colW - 12);
        bar.setAttribute("rx", 3);
        bar.setAttribute("class", r.always ? "bar_r" : r.plain ? "bar_g" : "bar_s");
        bar.setAttribute("fill-opacity", r.value ? 1 : 0.3);
        // the bar_* classes above also style the env-mini sparklines that
        // reuse them — set fill inline so it isn't silently lost to theirs.
        bar.style.fill = r.always ? "var(--red)" : r.plain ? "var(--grey-fill)" : "var(--accent)";
        svg.appendChild(bar);
        growBar(bar, barMaxH, barMaxH - displayH, displayH);

        var tag = document.createElementNS(svgns, "text");
        tag.setAttribute("x", cx); tag.setAttribute("y", barMaxH + 16);
        tag.setAttribute("text-anchor", "middle");
        tag.setAttribute("font-size", 10);
        tag.setAttribute("fill", r.always ? "var(--red)" : "var(--text-dim)");
        tag.textContent = (r.always ? "★" : "") + r.tag;
        svg.appendChild(tag);

        wireTooltip(bar, r.fullName, r.tip);
        wireTooltip(tag, r.fullName, r.tip);
    });

    wrap.appendChild(svg);
    target.appendChild(wrap);
}

/* Star types a species is found around, as a column chart ordered along
   the main sequence (OBAFGKM), continuing into the sub-stellar (LTY) and
   post-main-sequence classes, with abbreviated spectral tags on the axis. */
function stellar_histogram(rowclone, data, primarystars, localstars, musthave) {
    var target = rowclone.querySelector(".codex_stellar_histogram");

    var scaffold = {
        "Main sequence": [
            { "name": "O (Blue-White) Star", "tag": "O" },
            { "names": ["B (Blue-White) Star", "B (Blue-White super giant) Star"], "tag": "B" },
            { "names": ["A (Blue-White) Star", "A (Blue-White super giant) Star"], "tag": "A" },
            { "names": ["F (White) Star", "F (White super giant) Star"], "tag": "F" },
            { "names": ["G (White-Yellow) Star", "G (White-Yellow super giant) Star"], "tag": "G" },
            { "names": ["K (Yellow-Orange) Star", "K (Yellow-Orange giant) Star"], "tag": "K" },
            { "names": ["M (Red dwarf) Star", "M (Red giant) Star", "M (Red super giant) Star"], "tag": "M" },
        ],
        "Brown Dwarfs": [
            { "name": "L (Brown dwarf) Star", "tag": "L" },
            { "name": "T (Brown dwarf) Star", "tag": "T" },
            { "name": "Y (Brown dwarf) Star", "tag": "Y" },
        ],
        "White Dwarfs": [
            { "names": ["White Dwarf (D) Star", "White Dwarf (DA) Star", "White Dwarf (DAB) Star",
                "White Dwarf (DAV) Star", "White Dwarf (DAZ) Star", "White Dwarf (DB) Star",
                "White Dwarf (DBV) Star", "White Dwarf (DBZ) Star", "White Dwarf (DC) Star",
                "White Dwarf (DCV) Star", "White Dwarf (DQ) Star"], "tag": "D" },
        ],
        "Wolf-Rayet": [
            { "names": ["Wolf-Rayet C Star", "Wolf-Rayet N Star", "Wolf-Rayet NC Star",
                "Wolf-Rayet O Star", "Wolf-Rayet Star"], "tag": "WR" },
        ],
        "Other": [
            { "name": "Neutron Star", "tag": "N" },
            { "names": ["Black Hole", "Supermassive Black Hole"], "tag": "BH" },
            { "name": "T Tauri Star", "tag": "TTS" },
            { "name": "Herbig Ae/Be Star", "tag": "He" },
            { "names": ["C Star", "CJ Star", "CN Star", "S-type Star", "MS-type Star"], "tag": "C" },
        ]
    };

    var rows = [];
    Object.keys(scaffold).forEach(function (group) {
        scaffold[group].forEach(function (entry) {
            var keys = entry["names"] || [entry["name"]];
            var value = keys.reduce(function (sum, k) { return sum + (data[k] || 0); }, 0);
            var always = keys.some(function (k) { return musthave.includes(k); });
            var isPrimary = keys.some(function (k) { return primarystars.includes(k); });
            var isLocal = keys.some(function (k) { return localstars.includes(k); });

            var tip = value ? value.toLocaleString() : "Not observed around this species";
            if (value) {
                if (isPrimary && isLocal) tip = "Primary & local · " + tip;
                else if (isPrimary) tip = "Primary star · " + tip;
                else if (isLocal) tip = "Local star · " + tip;
                if (always) tip = "System must contain · " + tip;
            }

            rows.push({
                tag: entry["tag"],
                fullName: keys.join(" / "),
                value: value,
                always: always,
                plain: !(isPrimary || isLocal),
                tip: tip
            });
        });
    });
    renderColumnChart(target, rows);
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
    link.innerHTML = '<a class="chip chip-json" target="_blank" title="Download the raw API response for this search" ' +
        'href="https://us-central1-canonn-api-236217.cloudfunctions.net/query/biostats/' + rawEntryId + '">' +
        '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1v8.6M8 9.6 5 6.6M8 9.6l3-3M2 11v2.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>JSON</a>';

    var container = document.getElementById("container");
    container.innerHTML = "";

    if (!("content" in document.createElement("template")) || Object.keys(entry).length === 0) {
        container.innerHTML = '<div class="intro-card"><h2>No such biology found</h2><p>Try a different name, e.g. Bacterium or Concha Renibus.</p></div>';
        resetLogo();
        return;
    }

    var regionmap = document.querySelector("#map");
    var row = document.querySelector("#row");
    var keys = Object.keys(entry);

    /* A genus like Bacterium can carry 100+ colour variants, each with its
       own region-map SVG clone and set of charts — rendering them all at
       once makes the page heavy and sluggish. Render the first couple
       immediately, then render two more each time the sentinel at the
       bottom scrolls into view. */
    function renderEntry(key, value, localIndex, beforeNode) {
        var regionclone = regionmap.content.cloneNode(true);
        var rowclone = row.content.cloneNode(true);

        rowclone.querySelector(".entry").style.setProperty("--i", localIndex);

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

        var hud_category = value["hud_category"];
        var dot = rowclone.querySelector(".codex_life_dot");
        var kindEl = rowclone.querySelector(".codex_life_kind");
        if (hud_category === "Biology") {
            var kind = lifeKind(value["fdevname"], value["name"]);
            dot.style.background = kind.colour;
            kindEl.innerHTML = '<b style="color:' + kind.colour + '">' + escapeHtml(kind.title) + "</b> &middot; " + escapeHtml(kind.note);
        } else {
            dot.remove();
            kindEl.remove();
        }

        var meta = rowclone.querySelector(".codex_meta");
        var metaHtml = '<span class="chip accent">' + escapeHtml(value["hud_category"] || "") + "</span>";
        metaHtml += '<a class="chip" target="_blank" href="https://map.canonn.tech/codex.html?english_name=' + encodeURIComponent(value["name"]) + '">Canonn Map ↗</a>';
        meta.innerHTML = metaHtml;

        var jsonLink = document.createElement("a");
        jsonLink.className = "chip chip-json";
        jsonLink.href = "#";
        jsonLink.title = "Download this entry as JSON";
        jsonLink.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1v8.6M8 9.6 5 6.6M8 9.6l3-3M2 11v2.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>JSON';
        jsonLink.addEventListener("click", function (e) {
            e.preventDefault();
            var blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = (value["name"] || "entry").replace(/[^a-z0-9]+/gi, "_") + ".json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
        meta.appendChild(jsonLink);

        var huds = ["Biology", "Guardian", "Thargoid"];
        var bodyTypeCount = Object.keys(value["histograms"]["body_types"] || {}).length;
        buildStats(rowclone, value, bodyTypeCount);

        if (huds.includes(hud_category)) {
            buildDonut(rowclone, value);
            buildNicheRadar(rowclone, value);
            buildVolcanismDonut(rowclone, value);

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

            buildMaterialsCube(rowclone.querySelector(".codex_material_list"), value);
        } else {
            rowclone.querySelectorAll(".panel-niche, .panel-atmosphere, .panel-volcanism, .panel-envrow, .panel-materials").forEach(function (p) {
                p.style.display = "none";
            });
        }

        var regionTarget = rowclone.querySelector(".codex_region");
        regionTarget.textContent = "";
        regionTarget.appendChild(regionclone);

        var systemsTarget = rowclone.querySelector(".codex_systems_value");

        upgradeTips(rowclone);
        if (beforeNode) container.insertBefore(rowclone, beforeNode); else container.appendChild(rowclone);

        var svgEl = regionTarget.querySelector("svg#galaxy");
        if (svgEl) {
            var mapCtl = setupRegionMap(regionTarget, svgEl);
            plotSystemPins(svgEl, mapCtl, key, hud_category, systemsTarget, value["fdevname"]);
        }
    }

    var BATCH_SIZE = 2;
    var cursor = 0;

    var sentinel = document.createElement("div");
    sentinel.className = "entry-sentinel";

    function renderNextBatch() {
        var end = Math.min(cursor + BATCH_SIZE, keys.length);
        for (var localIndex = 0; cursor < end; cursor++, localIndex++) {
            renderEntry(keys[cursor], entry[keys[cursor]], localIndex, sentinel.parentNode ? sentinel : null);
        }
        if (cursor >= keys.length && sentinel.parentNode) {
            sentinel.remove();
            if (scrollObserver) scrollObserver.disconnect();
        }
    }

    var scrollObserver = null;
    if (window.IntersectionObserver) {
        scrollObserver = new IntersectionObserver(function (observed) {
            if (observed[0].isIntersecting) renderNextBatch();
        }, { rootMargin: "800px" });
    }

    renderNextBatch();
    if (cursor < keys.length) {
        container.appendChild(sentinel);
        if (scrollObserver) scrollObserver.observe(sentinel);
        else { while (cursor < keys.length) renderNextBatch(); } // no IO support: just render everything
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
