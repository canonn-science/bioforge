"use strict";

/* Canonn Bioforge — landing-page charts. Renders seven D3 charts into #samples-root from
   data/samples.json (built by tools/build_samples_data.py from the Canonn biostats API).
   Loaded on demand by bioforge.js, together with d3 and d3-sankey. */

(function () {

var root = document.getElementById("samples-root");
if (!root) return;

var MARKUP =
    '<div class="samples">' +
    '<div class="kpis" id="kpis"></div>' +
    '<section class="story" id="s-tree"><h3>1 · The tree of life</h3>' +
    '<p class="dek">Colour variant, sized by confirmed sightings and grouped however you like — by genus and species, by what its life is ' +
    'tied to, by the host body it\'s usually found on, or by its usual atmosphere. Variants are painted in their actual in-game colour. ' +
    'Click a ring to zoom in and click the background to zoom out. Click a name or variant to open its detail.</p>' +
    '<div class="controls" id="tabs-tree"></div>' +
    '<div class="chart" id="c-tree"></div></section>' +
    '<section class="story" id="s-value"><h3>2 · Rare versus rewarding</h3>' +
    '<p class="dek">Each bubble is a species; click one to open it. Rarer species sit left, richer ones sit higher; bubble size is its number of colour variants. ' +
    'The sweet spot is top-left: lucrative and hard to find.</p>' +
    '<div class="chart" id="c-value"></div><div class="legend" id="l-value"></div></section>' +
    '<section class="story" id="s-region"><h3>3 · Who lives where</h3>' +
    '<p class="dek">Share of each species\' colour variants that have been seen in each galactic region. Bright means every variant turns up there; ' +
    'dark means few or none do. Click a species to open it.</p>' +
    '<div class="chart scroll" id="c-region"></div></section>' +
    '<section class="story" id="s-habitat"><h3>4 · Habitat fingerprints</h3>' +
    '<p class="dek">Each species\' preferred conditions on four axes. The solid shape is the median; the shaded band is the 5th–95th percentile range. ' +
    'Pick a genus to compare its species, and click a species to open it.</p>' +
    '<div class="controls"><label>Genus <select id="sel-habitat"></select></label></div>' +
    '<div class="chart" id="c-habitat"></div></section>' +
    '<section class="story" id="s-flow"><h3>5 · What you need to find it</h3>' +
    '<p class="dek">Primary star class → genus → body type. Ribbon width is sightings. The two halves are linked through the genus: ' +
    'star and body data are recorded separately, not as joint pairs. Click a genus to open it.</p>' +
    '<div class="chart scroll" id="c-flow"></div></section>' +
    '<section class="story" id="s-ridge"><h3>6 · Comfort zones</h3>' +
    '<p class="dek">Where in each environmental range every genus is found, as stacked density ridges. Click a genus to open it.</p>' +
    '<div class="controls" id="tabs-ridge"></div><div class="chart" id="c-ridge"></div></section>' +
    '<section class="story" id="s-mats"><h3>7 · Periodic table of surface materials</h3>' +
    '<p class="dek">The surface materials found on the bodies where one individual colour variant has been logged. Colours match the codex explorer. ' +
    'A solid tile is a must-have: present on virtually every body the variant was found on (99% or more, with enough sightings to trust) or named in ' +
    'the entry\'s codex ID, marked with a white dot. A dashed tile is a may-have: present on some bodies only. Pick any of the 815 variants.</p>' +
    '<div class="controls"><label>Variant <select id="sel-mats"></select></label></div>' +
    '<div class="chart" id="c-mats"></div></section>' +
    '<p class="foot">Chart data: Canonn biostats API · snapshot <span id="snap"></span></p>' +
    "</div>";
root.innerHTML = MARKUP;

/* every genus, species or variant name links to its detail page */
function detail(name) { return "?entryid=" + encodeURIComponent(name); }

var VARIANT_COLOURS = {
    Amethyst: "#9966cc", Aquamarine: "#7fffd4", Blue: "#3b6fe0", Cobalt: "#2b50c8", Cyan: "#22d3ee",
    Emerald: "#2ecc71", Gold: "#e6b422", Green: "#3fae49", Grey: "#9aa3ad", Indigo: "#4b3fb5",
    Lime: "#a8e61d", Magenta: "#e0309e", Maroon: "#8a1c3a", Mauve: "#b78aa8", Mulberry: "#9b3b6e",
    Ocher: "#c79a2a", Orange: "#f08a1c", Peach: "#ffb28a", Red: "#e0393e", Sage: "#8fb08c",
    Teal: "#1c9a9a", Turquoise: "#30d5c8", White: "#f2f2f2", Yellow: "#f5e03b"
};

var fmt = d3.format(",");
var short = d3.format(".2s");
var money = function (n) { return "Cr " + (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : fmt(n)); };

function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

/* shared tooltip — reuses #viz-tooltip styles from bioforge.css */
var tip = d3.select("#viz-tooltip");
function showTip(evt, title, body) {
    tip.html('<div class="tt-title">' + esc(title) + "</div>" + (body || "")).style("display", "block");
    moveTip(evt);
}
function moveTip(evt) {
    var x = evt.clientX + 14, y = evt.clientY + 14;
    if (x > window.innerWidth - 270) x = evt.clientX - 270;
    if (y > window.innerHeight - 90) y = evt.clientY - 90;
    tip.style("left", x + "px").style("top", y + "px");
}
function hideTip() { tip.style("display", "none"); }
function hover(sel, fn) {
    sel.on("mouseenter mousemove", function (evt, d) {
        var t = fn(d);
        showTip(evt, t[0], t[1]);
    }).on("mouseleave", hideTip);
}

d3.json("data/samples.json").then(function (D) {
    var genusNames = Object.keys(D.genera).sort(function (a, b) { return D.genera[b].count - D.genera[a].count; });
    var genusColour = d3.scaleOrdinal()
        .domain(genusNames)
        .range(genusNames.map(function (_, i) { return d3.hcl((i * 360 / genusNames.length + 20) % 360, 62, 68).formatHex(); }));

    document.getElementById("snap").textContent = D.generated;
    kpis();
    tree();
    scatter();
    heatmap();
    habitat();
    flow();
    ridge();
    materials();

    /* ------------------------------------------------------------ KPIs */
    function kpis() {
        var total = d3.sum(D.entries, function (e) { return e.c; });
        var items = [
            [fmt(total), "Confirmed sightings"], [genusNames.length, "Genera"], [D.species.length, "Species"],
            [D.entries.length, "Variants"], [D.regions.length, "Galactic regions"]
        ];
        document.getElementById("kpis").innerHTML = items.map(function (k) {
            return '<div class="kpi"><b>' + k[0] + "</b><span>" + k[1] + "</span></div>";
        }).join("");
    }

    /* ------------------------------------------------- 1. tree of life */
    function tree() {
        var W = 900, H = 900;

        // What the codex ID suffix (entry.k) says a variant's life is tied to —
        // mirrors bioforge.js's lifeKind(), collapsed to just the label.
        var NEBULA_GENERA = ["Anemone", "Brain Tree", "Sinuous Tubers", "Bark Mounds"];
        // star-class tags broken out individually rather than lumped as one
        // "Stellar-based" bucket, same granularity as the per-material groups below
        var STAR_LABEL = {
            O: "O-type star", B: "B-type star", A: "A-type star", F: "F-type star", G: "G-type star",
            K: "K-type star", M: "M-type red dwarf", L: "L brown dwarf", T: "T brown dwarf", Y: "Y brown dwarf",
            D: "White dwarf", N: "Neutron star", W: "Wolf-Rayet star", TTS: "T Tauri star", Ae: "Herbig Ae/Be star"
        };
        var MAT_TAGS = { Carbon: 1, Phosphorus: 1, Sulphur: 1, Iron: 1, Nickel: 1, Vanadium: 1, Chromium: 1, Manganese: 1,
            Zinc: 1, Germanium: 1, Arsenic: 1, Zirconium: 1, Niobium: 1, Molybdenum: 1, Cadmium: 1, Tin: 1, Tungsten: 1,
            Mercury: 1, Selenium: 1, Yttrium: 1, Technetium: 1, Ruthenium: 1, Antimony: 1, Tellurium: 1, Polonium: 1 };
        function lifeBasis(e) {
            if (MAT_TAGS[e.k]) return e.k + "-based";
            if (STAR_LABEL[e.k]) return STAR_LABEL[e.k];
            if (NEBULA_GENERA.indexOf(e.g) !== -1) return "Nebula-based";
            return "General";
        }

        var MODES = [
            { id: "genus", label: "Genus", group: function (e) { return e.g; }, sub: function (e) { return e.s; } },
            { id: "life", label: "Life basis", group: lifeBasis },
            { id: "body", label: "Host body", group: function (e) { return e.bt || "Unknown"; } },
            { id: "atmo", label: "Atmosphere", group: function (e) { return e.at || "No atmosphere"; } }
        ];

        function leafNode(e) {
            return { name: e.v || e.n, full: e.n, genus: e.g, value: e.c, reward: e.r };
        }
        function buildRoot(mode) {
            var byGroup = d3.group(D.entries, mode.group);
            var children = Array.from(byGroup, function (kv) {
                var groupName = kv[0], es = kv[1];
                var kids;
                if (mode.sub) {
                    var bySub = d3.group(es, mode.sub);
                    kids = Array.from(bySub, function (skv) {
                        return { name: skv[0], genus: groupName, children: skv[1].map(leafNode) };
                    });
                } else {
                    kids = es.map(leafNode);
                }
                return { name: groupName, children: kids };
            });
            return { name: "Life", children: children };
        }

        var svg = d3.select("#c-tree").append("svg").attr("viewBox", [0, 0, W, H]);
        var gRoot = svg.append("g");
        function leafFill(d) {
            var last = d.data.name.split(" ").pop();
            return VARIANT_COLOURS[d.data.name] || VARIANT_COLOURS[last] || genusColour(d.data.genus);
        }

        var focus = [W / 2, H / 2, W];
        function zoomTo(v) {
            var k = W / v[2];
            gRoot.attr("transform", "translate(" + (W / 2 - v[0] * k) + "," + (H / 2 - v[1] * k) + ") scale(" + k + ")");
            gRoot.selectAll("circle.ring").attr("stroke-width", function (d) { return (d.depth === 1 ? 1.5 : 0.6) / k; });
            gRoot.selectAll("a.glabel text").attr("font-size", 12 / k);
        }
        svg.on("click", function () { animateZoom([W / 2, H / 2, W]); });
        function animateZoom(to) {
            var i = d3.interpolateZoom(focus, to);
            d3.transition().duration(i.duration).tween("zoom", function () {
                return function (t) { focus = i(t); zoomTo(focus); };
            });
        }

        var mode; // current MODES entry, set by render()
        function keyFn(d) {
            if (!d.children) return "leaf:" + d.data.full;
            return "grp:" + mode.id + ":" + d.depth + ":" + (d.parent ? d.parent.data.name : "") + ":" + d.data.name;
        }

        function render(nextMode, animated) {
            mode = nextMode;
            var h = d3.hierarchy(buildRoot(mode)).sum(function (d) { return d.value || 0; })
                .sort(function (a, b) { return b.value - a.value; });
            // sqrt the leaf sizes so rare variants stay visible beside Bacterium Aurasus
            h.each(function (n) { if (!n.children) n.value = Math.sqrt(n.data.value || 0); });
            h.eachAfter(function (n) { if (n.children) n.value = d3.sum(n.children, function (c) { return c.value; }); });
            d3.pack().size([W, H]).padding(function (n) { return n.depth === 0 ? 8 : n.depth === 1 ? 6 : 1.5; })(h);

            // category rings (life/body/atmo) have no fixed genus identity of their
            // own, so they get their own colour wheel; genus (and species, which
            // inherit their parent genus) keep the one genus colour used everywhere else.
            var ringNames = h.children.map(function (c) { return c.data.name; });
            var ringColour = d3.scaleOrdinal().domain(ringNames)
                .range(ringNames.map(function (_, i) { return d3.hcl((i * 360 / ringNames.length + 40) % 360, 55, 60).formatHex(); }));
            function ringStroke(d) {
                if (d.depth !== 1) return "#3a4149";
                return mode.id === "genus" ? genusColour(d.data.genus) : ringColour(d.data.name);
            }

            var animDur = animated ? 750 : 0;
            var ease = d3.easeCubicInOut;

            var sel = gRoot.selectAll("a.node").data(h.descendants().slice(1), keyFn);

            var exit = sel.exit();
            exit.select("circle").transition().duration(animDur).ease(ease).attr("r", 1e-6);
            exit.transition().delay(animDur).remove();

            var enter = sel.enter().append("a").attr("class", "node")
                .attr("href", function (d) { return d.children ? null : detail(d.data.full); });
            enter.append("circle")
                .attr("class", function (d) { return d.children ? "ring" : "leaf"; })
                .attr("cx", function (d) { return d.x; }).attr("cy", function (d) { return d.y; })
                .attr("r", 1e-6)
                .attr("fill", function (d) { return d.children ? "none" : leafFill(d); })
                .attr("fill-opacity", function (d) { return d.children ? null : 0.9; })
                .attr("pointer-events", function (d) { return d.children ? "all" : null; })
                .attr("stroke", ringStroke)
                .attr("stroke-width", function (d) { return d.depth === 1 ? 1.5 : 0.6; })
                .attr("stroke-opacity", 0.8);

            var merged = enter.merge(sel);
            merged.attr("href", function (d) { return d.children ? null : detail(d.data.full); });
            merged.filter(function (d) { return d.children; }).select("circle").attr("stroke", ringStroke);
            merged.select("circle").transition().duration(animDur).ease(ease)
                .attr("cx", function (d) { return d.x; }).attr("cy", function (d) { return d.y; })
                .attr("r", function (d) { return d.r; });

            hover(merged, function (d) {
                if (d.children) {
                    var cnt = d3.sum(d.leaves(), function (l) { return l.data.value; });
                    return [d.data.name, fmt(cnt) + " sightings<br>" + d.leaves().length + " variants<br>" + (d.depth === 1 ? "Click to zoom" : "Click for detail")];
                }
                return [d.data.full, fmt(d.data.value) + " sightings<br>Reward " + money(d.data.reward) + "<br>Click for detail"];
            });

            var rings = merged.filter(function (d) { return d.depth === 1; });
            rings.style("cursor", "zoom-in").on("click", function (evt, d) {
                evt.stopPropagation();
                animateZoom([d.x, d.y, d.r * 2.2]);
            });

            var lblSel = gRoot.selectAll("a.glabel").data(h.children, function (d) { return "lbl:" + mode.id + ":" + d.data.name; });
            lblSel.exit().select("text").transition().duration(animDur).attr("fill-opacity", 0);
            lblSel.exit().transition().delay(animDur).remove();
            var lblEnter = lblSel.enter().append("a").attr("class", "glabel")
                .attr("href", function (d) { return mode.id === "genus" ? detail(d.data.name) : null; });
            lblEnter.append("text")
                .attr("x", function (d) { return d.x; }).attr("y", function (d) { return d.y - d.r - 4; })
                .attr("text-anchor", "middle").attr("font-size", 12).attr("class", "lbl-strong")
                .attr("fill-opacity", 0)
                .text(function (d) { return d.r > 22 ? d.data.name : ""; });
            var lblMerged = lblEnter.merge(lblSel);
            lblMerged.select("text").text(function (d) { return d.r > 22 ? d.data.name : ""; })
                .transition().duration(animDur).ease(ease)
                .attr("x", function (d) { return d.x; }).attr("y", function (d) { return d.y - d.r - 4; })
                .attr("fill-opacity", 1);

            focus = [W / 2, H / 2, W];
            zoomTo(focus);
        }

        var tabs = d3.select("#tabs-tree");
        tabs.selectAll("button").data(MODES).join("button").text(function (d) { return d.label; })
            .classed("on", function (d) { return d.id === MODES[0].id; })
            .on("click", function (evt, d) {
                if (mode === d) return;
                tabs.selectAll("button").classed("on", function (b) { return b === d; });
                render(d, true);
            });

        render(MODES[0], false);
    }

    /* ------------------------------------------------ 2. value scatter */
    function scatter() {
        var W = 1000, H = 560, m = { t: 20, r: 20, b: 52, l: 70 };
        var svg = d3.select("#c-value").append("svg").attr("viewBox", [0, 0, W, H]);
        var x = d3.scaleLog().domain(d3.extent(D.species, function (s) { return s.count; })).range([m.l, W - m.r]).nice();
        var y = d3.scaleLog().domain(d3.extent(D.species, function (s) { return s.reward; })).range([H - m.b, m.t]).nice();
        var r = d3.scaleSqrt().domain([1, d3.max(D.species, function (s) { return s.variants; })]).range([4, 22]);

        svg.append("g").attr("class", "axis").attr("transform", "translate(0," + (H - m.b) + ")")
            .call(d3.axisBottom(x).ticks(6, "~s").tickSize(-(H - m.t - m.b))).call(styleAxis);
        svg.append("g").attr("class", "axis").attr("transform", "translate(" + m.l + ",0)")
            .call(d3.axisLeft(y).ticks(6, "~s").tickSize(-(W - m.l - m.r))).call(styleAxis);
        svg.append("text").attr("x", W / 2).attr("y", H - 10).attr("text-anchor", "middle").text("Confirmed sightings (log) → more common");
        svg.append("text").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", 16).attr("text-anchor", "middle").text("Reward, credits (log)");

        var dots = svg.append("g").selectAll("a").data(D.species.slice().sort(function (a, b) { return b.variants - a.variants; }))
            .join("a").attr("href", function (d) { return detail(d.s); }).append("circle")
            .attr("cx", function (d) { return x(d.count); }).attr("cy", function (d) { return y(d.reward); })
            .attr("r", function (d) { return r(d.variants); })
            .attr("fill", function (d) { return genusColour(d.g); }).attr("fill-opacity", 0.7)
            .attr("stroke", function (d) { return genusColour(d.g); });
        hover(dots, function (d) {
            return [d.s, fmt(d.count) + " sightings<br>" + money(d.reward) + " per sample<br>" + d.variants + " variants<br>Click for detail"];
        });
        // label the notable ones: top by reward and by rarity-adjusted value
        var notable = D.species.slice().sort(function (a, b) { return b.reward / Math.log10(b.count + 10) - a.reward / Math.log10(a.count + 10); }).slice(0, 8)
            .concat(D.species.slice().sort(function (a, b) { return b.count - a.count; }).slice(0, 3));
        var placed = [];
        var labelled = Array.from(new Set(notable)).filter(function (d) {
            var bx = x(d.count) + r(d.variants) + 3, by = y(d.reward), bw = d.s.length * 6;
            var clash = placed.some(function (p) { return bx < p[0] + p[2] && bx + bw > p[0] && Math.abs(by - p[1]) < 13; });
            if (!clash) placed.push([bx, by, bw]);
            return !clash;
        });
        svg.append("g").selectAll("a").data(labelled)
            .join("a").attr("href", function (d) { return detail(d.s); }).append("text").attr("x", function (d) { return x(d.count) + r(d.variants) + 3; })
            .attr("y", function (d) { return y(d.reward) + 4; }).attr("font-size", 11).attr("class", "lbl-strong")
            .text(function (d) { return d.s; });

        document.getElementById("l-value").innerHTML = genusNames.map(function (g) {
            return '<span><i style="background:' + genusColour(g) + '"></i>' + esc(g) + "</span>";
        }).join("");
    }

    function styleAxis(sel) {
        sel.selectAll("line").attr("class", "gridline");
        sel.selectAll("text").attr("font-size", 11);
        sel.select(".domain").remove();
    }

    /* ----------------------------------------------- 3. region heatmap */
    function heatmap() {
        var rows = D.species.slice().sort(function (a, b) {
            return genusNames.indexOf(a.g) - genusNames.indexOf(b.g) || b.count - a.count;
        });
        var cell = 17, rowH = 13, m = { t: 150, l: 190, r: 20, b: 10 };
        var W = m.l + D.regions.length * cell + m.r, H = m.t + rows.length * rowH + m.b;
        var svg = d3.select("#c-region").append("svg").attr("viewBox", [0, 0, W, H]);
        var color = d3.scaleSequential(d3.interpolateRgb("#161c25", "#f89406")).domain([0, 1]);

        svg.append("g").selectAll("text").data(D.regions).join("text")
            .attr("transform", function (d, i) { return "translate(" + (m.l + i * cell + cell / 2) + "," + (m.t - 6) + ") rotate(-55)"; })
            .attr("font-size", 10).text(function (d) { return d; });
        svg.append("g").selectAll("a").data(rows).join("a").attr("href", function (d) { return detail(d.s); }).append("text")
            .attr("x", m.l - 6).attr("y", function (d, i) { return m.t + i * rowH + rowH - 3; })
            .attr("text-anchor", "end").attr("font-size", 10)
            .attr("fill", function (d) { return genusColour(d.g); }).style("fill", function (d) { return genusColour(d.g); })
            .text(function (d) { return d.s; });

        var cells = [];
        rows.forEach(function (s, i) {
            s.regions.forEach(function (f, j) { cells.push({ s: s, i: i, j: j, f: f }); });
        });
        var rects = svg.append("g").selectAll("a").data(cells).join("a").attr("href", function (d) { return detail(d.s.s); }).append("rect")
            .attr("x", function (d) { return m.l + d.j * cell + 0.5; }).attr("y", function (d) { return m.t + d.i * rowH + 0.5; })
            .attr("width", cell - 1).attr("height", rowH - 1).attr("rx", 2)
            .attr("fill", function (d) { return color(d.f); });
        hover(rects, function (d) {
            return [d.s.s + " · " + D.regions[d.j], Math.round(d.f * d.s.variants) + " of " + d.s.variants + " variants seen"];
        });
    }

    /* ---------------------------------------------- 4. habitat radars */
    function habitat() {
        var AX = [
            { key: "temperature", label: "Temperature", unit: "K" },
            { key: "gravity", label: "Gravity", unit: "g" },
            { key: "pressure", label: "Pressure", unit: "atm" },
            { key: "distance", label: "Distance", unit: "ls" }
        ];
        var scales = {};
        AX.forEach(function (a) {
            var ax = D.axes[a.key], log = ax[2];
            scales[a.key] = (log ? d3.scaleLog() : d3.scaleLinear()).domain([ax[0], ax[1]]).range([0.08, 1]).clamp(true);
        });
        var sel = document.getElementById("sel-habitat");
        sel.innerHTML = genusNames.map(function (g) { return "<option>" + esc(g) + "</option>"; }).join("");
        sel.value = genusNames[0];
        sel.onchange = draw;
        draw();

        function draw() {
            var g = sel.value, mine = D.species.filter(function (s) { return s.g === g; });
            var host = d3.select("#c-habitat").html("");
            var S = 220, R = 62, cx = S / 2, cy = S / 2 + 6;
            var wrap = host.append("div").style("display", "grid")
                .style("grid-template-columns", "repeat(auto-fill,minmax(210px,1fr))").style("gap", "6px");
            mine.forEach(function (sp) {
                var svg = wrap.append("svg").attr("viewBox", [0, 0, S, S]);
                var ang = function (i) { return (i / AX.length) * 2 * Math.PI - Math.PI / 2; };
                var pt = function (i, v) { return [cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v]; };
                [0.25, 0.5, 0.75, 1].forEach(function (ring) {
                    svg.append("polygon").attr("points", AX.map(function (_, i) { return pt(i, ring); }).join(" "))
                        .attr("fill", "none").attr("class", "gridline");
                });
                AX.forEach(function (a, i) {
                    var p = pt(i, 1), q = pt(i, 1.12);
                    svg.append("line").attr("x1", cx).attr("y1", cy).attr("x2", p[0]).attr("y2", p[1]).attr("class", "gridline");
                    svg.append("text").attr("x", q[0]).attr("y", q[1] + 3).attr("font-size", 9)
                        .attr("text-anchor", Math.abs(q[0] - cx) < 1 ? "middle" : q[0] > cx ? "start" : "end").text(a.label);
                });
                var col = genusColour(sp.g);
                var outer = AX.map(function (a, i) { var f = sp.fp[a.key]; return pt(i, f ? scales[a.key](f[2]) : 0); });
                var inner = AX.map(function (a, i) { var f = sp.fp[a.key]; return pt(i, f ? scales[a.key](f[0]) : 0); });
                var mid = AX.map(function (a, i) { var f = sp.fp[a.key]; return pt(i, f ? scales[a.key](f[1]) : 0); });
                svg.append("polygon").attr("points", outer.join(" ")).attr("fill", col).attr("fill-opacity", 0.16).attr("stroke", col).attr("stroke-opacity", 0.4);
                svg.append("polygon").attr("points", inner.join(" ")).attr("fill", "#11161d").attr("fill-opacity", 0.85).attr("stroke", col).attr("stroke-opacity", 0.4).attr("stroke-dasharray", "2 2");
                var shape = svg.append("polygon").attr("points", mid.join(" ")).attr("fill", col).attr("fill-opacity", 0.45).attr("stroke", col).attr("stroke-width", 1.5);
                svg.append("a").attr("href", detail(sp.s)).append("text").attr("x", S / 2).attr("y", 12).attr("text-anchor", "middle").attr("font-size", 11).attr("class", "lbl-strong").text(sp.s);
                var hit = svg.append("a").attr("href", detail(sp.s)).append("rect").attr("width", S).attr("height", S).attr("fill", "transparent");
                hover(hit, function () {
                    return [sp.s, AX.map(function (a) {
                        var f = sp.fp[a.key];
                        return f ? a.label + ": " + fnum(f[1]) + " " + a.unit + " (" + fnum(f[0]) + "–" + fnum(f[2]) + ")" : "";
                    }).join("<br>")];
                });
            });
        }
        function fnum(v) { return v >= 100 ? d3.format(",.0f")(v) : v >= 1 ? d3.format(".3~g")(v) : d3.format(".2~g")(v); }
    }

    /* ----------------------------------------------------- 5. sankey */
    function flow() {
        var W = 1000, H = 760;
        var nodes = [], index = {}, links = [];
        function node(id, kind) {
            if (!(id in index)) { index[id] = nodes.length; nodes.push({ id: id, kind: kind }); }
            return index[id];
        }
        var total = d3.sum(genusNames, function (g) { return D.genera[g].count; });
        var minLink = total * 0.0015;
        genusNames.forEach(function (g) {
            var G = D.genera[g];
            Object.keys(G.stars).forEach(function (s) {
                if (G.stars[s] >= minLink) links.push({ source: node("s:" + s, "star"), target: node("g:" + g, "genus"), value: G.stars[s] });
            });
            Object.keys(G.bodies).forEach(function (b) {
                if (G.bodies[b] >= minLink) links.push({ source: node("g:" + g, "genus"), target: node("b:" + b, "body"), value: G.bodies[b] });
            });
        });
        var sk = d3.sankey().nodeId(function (d) { return d.index; }).nodeWidth(14).nodePadding(8)
            .extent([[110, 22], [W - 150, H - 6]]);
        var graph = sk({ nodes: nodes.map(function (n) { return Object.assign({}, n); }), links: links.map(function (l) { return Object.assign({}, l); }) });

        var svg = d3.select("#c-flow").append("svg").attr("viewBox", [0, 0, W, H]);
        var colour = function (n) { return n.kind === "genus" ? genusColour(n.id.slice(2)) : n.kind === "star" ? "#f89406" : "#5bc0de"; };
        var paths = svg.append("g").attr("fill", "none").selectAll("path").data(graph.links).join("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", function (d) { return d.source.kind === "star" ? colour(d.target) : colour(d.source); })
            .attr("stroke-opacity", 0.35).attr("stroke-width", function (d) { return Math.max(1, d.width); });
        hover(paths, function (d) { return [d.source.id.slice(2) + " → " + d.target.id.slice(2), fmt(Math.round(d.value)) + " sightings"]; });
        var rects = svg.append("g").selectAll("a").data(graph.nodes).join("a")
            .attr("href", function (d) { return d.kind === "genus" ? detail(d.id.slice(2)) : null; }).append("rect")
            .attr("x", function (d) { return d.x0; }).attr("y", function (d) { return d.y0; })
            .attr("width", function (d) { return d.x1 - d.x0; }).attr("height", function (d) { return Math.max(1, d.y1 - d.y0); })
            .attr("fill", colour);
        hover(rects, function (d) { return [d.id.slice(2), fmt(Math.round(d.value)) + " sightings"]; });
        svg.append("g").selectAll("a").data(graph.nodes).join("a")
            .attr("href", function (d) { return d.kind === "genus" ? detail(d.id.slice(2)) : null; }).append("text")
            .attr("x", function (d) { return d.kind === "star" ? d.x0 - 6 : d.kind === "body" ? d.x1 + 6 : (d.x0 + d.x1) / 2; })
            .attr("y", function (d) { return d.kind === "genus" ? d.y0 - 2 : (d.y0 + d.y1) / 2 + 3; })
            .attr("text-anchor", function (d) { return d.kind === "star" ? "end" : d.kind === "body" ? "start" : "middle"; })
            .attr("font-size", 11).attr("class", "lbl-strong")
            .text(function (d) { return d.y1 - d.y0 > 9 || d.kind === "star" ? d.id.slice(2) : ""; });
    }

    /* --------------------------------------------------- 6. ridgeline */
    function ridge() {
        var METRICS = [
            ["temperature", "Temperature (K)"], ["gravity", "Gravity (g)"],
            ["pressure", "Atmospheric pressure (atm)"], ["distance", "Distance from arrival (ls)"]
        ];
        var tabs = d3.select("#tabs-ridge");
        var current = "temperature";
        tabs.selectAll("button").data(METRICS).join("button").text(function (d) { return d[1]; })
            .classed("on", function (d) { return d[0] === current; })
            .on("click", function (e, d) { current = d[0]; tabs.selectAll("button").classed("on", function (b) { return b[0] === current; }); draw(); });
        draw();

        function draw() {
            var host = d3.select("#c-ridge").html("");
            var W = 1000, m = { t: 10, r: 20, b: 40, l: 130 }, step = 30, over = 2.4;
            var ax = D.axes[current], log = ax[2];
            // order by where each genus peaks
            var rows = genusNames.filter(function (g) { return d3.sum(D.genera[g].ridge[current]) > 0; }).map(function (g) {
                var d = D.genera[g].ridge[current];
                return { g: g, d: d, peak: d.indexOf(d3.max(d)) };
            }).sort(function (a, b) { return a.peak - b.peak; });
            var H = m.t + m.b + rows.length * step + step * over;
            var svg = host.append("svg").attr("viewBox", [0, 0, W, H]);
            var scale = (log ? d3.scaleLog() : d3.scaleLinear()).domain([ax[0], ax[1]]).range([m.l, W - m.r]);
            var xi = d3.scaleLinear().domain([0, D.bins]).range([m.l, W - m.r]);
            var ymax = d3.max(rows, function (r) { return d3.max(r.d); });
            var h = d3.scaleLinear().domain([0, ymax]).range([0, step * over]);
            svg.append("g").attr("class", "axis").attr("transform", "translate(0," + (H - m.b + 4) + ")")
                .call(d3.axisBottom(scale).ticks(8, log ? "~s" : ",.0f").tickSize(-(H - m.t - m.b))).call(styleAxis);
            var area = d3.area().curve(d3.curveBasis)
                .x(function (d, i) { return xi(i + 0.5); }).y0(0).y1(function (d) { return -h(d); });
            var gs = svg.append("g").selectAll("g").data(rows).join("g")
                .attr("transform", function (d, i) { return "translate(0," + (m.t + step * over + i * step) + ")"; });
            var ga = gs.append("a").attr("href", function (d) { return detail(d.g); });
            ga.append("path").datum(function (d) { return d.d; }).attr("d", area)
                .attr("fill", function (_, i, nodes) { return genusColour(d3.select(nodes[i].parentNode).datum().g); })
                .attr("fill-opacity", 0.75).attr("stroke", "#05070a").attr("stroke-width", 1);
            ga.append("text").attr("x", m.l - 8).attr("y", -2).attr("text-anchor", "end").attr("font-size", 11).attr("class", "lbl-strong")
                .text(function (d) { return d.g; });
            hover(gs, function (d) {
                var i = d.peak, lo = ax[0], hi = ax[1];
                var f = log ? function (k) { return Math.pow(10, Math.log10(lo) + (Math.log10(hi) - Math.log10(lo)) * k / D.bins); }
                            : function (k) { return lo + (hi - lo) * k / D.bins; };
                return [d.g, "Most common around " + d3.format(",.3~g")((f(i) + f(i + 1)) / 2)];
            });
        }
    }

    /* ----------------------------------------------- 7. periodic table */
    function materials() {
        // Full periodic table; rarity classes match the main page
        // (bar_v very common blue, bar_c common green, bar_s standard orange, bar_r rare red).
        var GAME = {
            Carbon: "v", Phosphorus: "v", Sulphur: "v", Iron: "v", Nickel: "v",
            Vanadium: "c", Chromium: "c", Manganese: "c", Zinc: "c", Germanium: "c", Arsenic: "c", Zirconium: "c",
            Niobium: "s", Molybdenum: "s", Cadmium: "s", Tin: "s", Tungsten: "s", Mercury: "s",
            Selenium: "r", Yttrium: "r", Technetium: "r", Ruthenium: "r", Antimony: "r", Tellurium: "r", Polonium: "r"
        };
        var MAIN = [1, 2, 13, 14, 15, 16, 17, 18], LONG = [1, 2].concat(d3.range(4, 19));
        var PERIODS = [
            [1, "H Hydrogen,He Helium", [1, 18]],
            [2, "Li Lithium,Be Beryllium,B Boron,C Carbon,N Nitrogen,O Oxygen,F Fluorine,Ne Neon", MAIN],
            [3, "Na Sodium,Mg Magnesium,Al Aluminium,Si Silicon,P Phosphorus,S Sulphur,Cl Chlorine,Ar Argon", MAIN],
            [4, "K Potassium,Ca Calcium,Sc Scandium,Ti Titanium,V Vanadium,Cr Chromium,Mn Manganese,Fe Iron,Co Cobalt,Ni Nickel,Cu Copper,Zn Zinc,Ga Gallium,Ge Germanium,As Arsenic,Se Selenium,Br Bromine,Kr Krypton"],
            [5, "Rb Rubidium,Sr Strontium,Y Yttrium,Zr Zirconium,Nb Niobium,Mo Molybdenum,Tc Technetium,Ru Ruthenium,Rh Rhodium,Pd Palladium,Ag Silver,Cd Cadmium,In Indium,Sn Tin,Sb Antimony,Te Tellurium,I Iodine,Xe Xenon"],
            [6, "Cs Caesium,Ba Barium,Hf Hafnium,Ta Tantalum,W Tungsten,Re Rhenium,Os Osmium,Ir Iridium,Pt Platinum,Au Gold,Hg Mercury,Tl Thallium,Pb Lead,Bi Bismuth,Po Polonium,At Astatine,Rn Radon", LONG],
            [7, "Fr Francium,Ra Radium,Rf Rutherfordium,Db Dubnium,Sg Seaborgium,Bh Bohrium,Hs Hassium,Mt Meitnerium,Ds Darmstadtium,Rg Roentgenium,Cn Copernicium,Nh Nihonium,Fl Flerovium,Mc Moscovium,Lv Livermorium,Ts Tennessine,Og Oganesson", LONG],
            [9, "La Lanthanum,Ce Cerium,Pr Praseodymium,Nd Neodymium,Pm Promethium,Sm Samarium,Eu Europium,Gd Gadolinium,Tb Terbium,Dy Dysprosium,Ho Holmium,Er Erbium,Tm Thulium,Yb Ytterbium,Lu Lutetium", d3.range(3, 18)],
            [10, "Ac Actinium,Th Thorium,Pa Protactinium,U Uranium,Np Neptunium,Pu Plutonium,Am Americium,Cm Curium,Bk Berkelium,Cf Californium,Es Einsteinium,Fm Fermium,Md Mendelevium,No Nobelium,Lr Lawrencium", d3.range(3, 18)]
        ];
        var EL = []; // [symbol, name, row, column, rarity (undefined if not a game material)]
        PERIODS.forEach(function (p) {
            var cols = p[2] || d3.range(1, 19);
            p[1].split(",").forEach(function (t, i) {
                var sp = t.indexOf(" "), name = t.slice(sp + 1);
                EL.push([t.slice(0, sp), name, p[0], cols[i], GAME[name]]);
            });
        });
        var RARITY = {
            v: { label: "Very common", colour: "#5bc0de" }, c: { label: "Common", colour: "#62c462" },
            s: { label: "Standard", colour: "#f89406" }, r: { label: "Rare", colour: "#ee5f5b" }
        };
        var NONE = "#3a4149"; // --grey-fill
        // What the codex ID suffix says the life form is built around
        var STAR_LIFE = {
            O: ["O-type star", "#9db4ff"], B: ["B-type star", "#aac0ff"], A: ["A-type star", "#cad8ff"],
            F: ["F-type star", "#f8f7ff"], G: ["G-type star", "#fff4ea"], K: ["K-type star", "#ffd2a1"],
            M: ["M-type red dwarf", "#ff9a6b"], L: ["L-type brown dwarf", "#b5651d"], T: ["T-type brown dwarf", "#8c4a1a"],
            Y: ["Y-type brown dwarf", "#6b3a1a"], D: ["white dwarf", "#e6ecff"], N: ["neutron star", "#5bc0de"],
            W: ["Wolf-Rayet star", "#b48cff"], TTS: ["T Tauri star", "#ff8fb1"], Ae: ["Herbig Ae/Be star", "#ff6fa8"]
        };
        function lifeKind(k) {
            if (GAME[k]) return { type: "Material", title: k + "-based life", colour: RARITY[GAME[k]].colour, note: "Needs " + k + " on its host body" };
            if (STAR_LIFE[k]) return { type: "Stellar", title: "Stellar-based life", colour: STAR_LIFE[k][1], note: "Tied to a " + STAR_LIFE[k][0] };
            return { type: "General", title: "General life", colour: "#9aa3ad", note: "No material or star-class tag in its codex ID" };
        }

        var sel = document.getElementById("sel-mats");
        // one option per colour variant, grouped by species
        var idx = D.entries.map(function (e, i) { return i; }).sort(function (a, b) {
            var A = D.entries[a], B = D.entries[b];
            return genusNames.indexOf(A.g) - genusNames.indexOf(B.g) || A.s.localeCompare(B.s) || A.n.localeCompare(B.n);
        });
        var html = "", lastSp = null;
        idx.forEach(function (i) {
            var e = D.entries[i];
            if (e.s !== lastSp) { html += (lastSp ? "</optgroup>" : "") + '<optgroup label="' + esc(e.s) + '">'; lastSp = e.s; }
            html += '<option value="' + i + '">' + esc(e.n) + "</option>";
        });
        sel.innerHTML = html + "</optgroup>";
        sel.value = idx.slice().sort(function (a, b) { return D.entries[b].c - D.entries[a].c; })[0];
        var wanted = new URLSearchParams(window.location.search).get("variant"); // e.g. ?variant=Osseus Pumice - Peach
        var hit = D.entries.findIndex(function (e) { return e.n === wanted; });
        if (hit >= 0) sel.value = hit;
        sel.onchange = draw;
        draw();

        function draw() {
            var entry = D.entries[+sel.value], g = entry.n;
            var share = {}, must = {};
            Object.keys(entry.m).forEach(function (k) { share[k] = entry.m[k] / 1000; });
            entry.u.forEach(function (k) { must[k] = 1; });
            var named = {};
            entry.f.forEach(function (k) { named[k] = 1; });
            var host = d3.select("#c-mats").html("");
            var life = lifeKind(entry.k);
            var head = host.append("div").attr("class", "life-head");
            head.append("span").attr("class", "life-dot").style("background", life.colour);
            var txt = head.append("div");
            txt.append("div").attr("class", "life-title").append("a").attr("href", detail(entry.n)).text(entry.n);
            head.append("a").attr("class", "life-link").attr("href", detail(entry.n)).text("View full detail →");
            txt.append("div").attr("class", "life-kind").html('<b style="color:' + life.colour + '">' + esc(life.title) + "</b> · " + esc(life.note));
            var c = 56, W = 18 * c + 20, H = 10 * c + 20;
            var svg = host.append("svg").attr("viewBox", [0, 0, W, H]);
            var status = function (e) {
                if (!e[4]) return "none";
                if (must[e[1]]) return "must";
                return share[e[1]] ? "may" : "none";
            };
            var cells = svg.append("g").selectAll("g").data(EL).join("g")
                .attr("transform", function (e) { return "translate(" + (10 + (e[3] - 1) * c) + "," + (10 + (e[2] - 1) * c) + ")"; });
            cells.append("rect").attr("width", c - 4).attr("height", c - 4).attr("rx", 5)
                .attr("fill", function (e) { return status(e) === "none" ? NONE : RARITY[e[4]].colour; })
                .attr("fill-opacity", function (e) { return status(e) === "must" ? 1 : status(e) === "may" ? 0.3 : 0.5; })
                .attr("stroke", function (e) { return status(e) === "none" ? "#262f3a" : RARITY[e[4]].colour; })
                .attr("stroke-width", function (e) { return status(e) === "must" ? 0 : 1.5; })
                .attr("stroke-dasharray", function (e) { return status(e) === "may" ? "4 3" : null; });
            var dark = function (e) { return status(e) === "must"; };
            cells.append("text").attr("x", (c - 4) / 2).attr("y", 26).attr("text-anchor", "middle").attr("font-size", 18)
                .style("fill", function (e) { return dark(e) ? "#0b0f15" : status(e) === "none" ? "#8d98a6" : "#e7ecf2"; }).text(function (e) { return e[0]; });
            cells.append("text").attr("x", (c - 4) / 2).attr("y", 42).attr("text-anchor", "middle").attr("font-size", 10)
                .style("fill", function (e) { return dark(e) ? "#0b0f15" : "#8d98a6"; })
                .text(function (e) {
                    var v = share[e[1]];
                    if (!v) return "–";
                    return (v >= 0.995 && v < 1 ? (v * 100).toFixed(1) : Math.round(v * 100)) + "%";
                });
cells.filter(function (e) { return named[e[1]]; }).append("circle")
                .attr("cx", c - 12).attr("cy", 8).attr("r", 3.5).attr("fill", "#fff").attr("stroke", "#0b0f15");
            hover(cells, function (e) {
                var st = status(e);
                return [e[1] + (e[4] ? " · " + RARITY[e[4]].label : ""),
                    st === "none" ? "Never seen with " + g
                        : (st === "must" ? (named[e[1]] ? "Must have: named in its codex ID" : "Must have: on virtually every body") : "May have: sometimes present")
                        + "<br>" + Math.round(share[e[1]] * 1000) / 10 + "% of the bodies it was found on"];
            });

            // legend: rarity colour + must/may fill style
            var lg = svg.append("g").attr("transform", "translate(" + (10 + 2.5 * c) + ",20)");
            lg.append("text").attr("font-size", 12).attr("class", "lbl-strong").text("Colour = material rarity");
            Object.keys(RARITY).forEach(function (k, i) {
                lg.append("rect").attr("x", i * 100).attr("y", 10).attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", RARITY[k].colour);
                lg.append("text").attr("x", i * 100 + 18).attr("y", 20).attr("font-size", 11).text(RARITY[k].label);
            });
            lg.append("text").attr("y", 52).attr("font-size", 12).attr("class", "lbl-strong").text("Fill = how reliably it is there");
            [["must", "Must have", 1, null, 0], ["may", "May have", 0.3, "4 3", 1.5], ["none", "Never seen", 0.5, null, 1]].forEach(function (k, i) {
                var col = k[0] === "none" ? NONE : "#9aa3ad";
                lg.append("rect").attr("x", i * 130).attr("y", 62).attr("width", 12).attr("height", 12).attr("rx", 3)
                    .attr("fill", col).attr("fill-opacity", k[2]).attr("stroke", k[0] === "none" ? "#262f3a" : "#9aa3ad")
                    .attr("stroke-width", k[4] || 0).attr("stroke-dasharray", k[3]);
                lg.append("text").attr("x", i * 130 + 18).attr("y", 72).attr("font-size", 11).text(k[1]);
            });
            lg.append("circle").attr("cx", 6).attr("cy", 91).attr("r", 3.5).attr("fill", "#fff");
            lg.append("text").attr("x", 18).attr("y", 95).attr("font-size", 11).text("Named in the codex ID");
        }
    }
}).catch(function (err) {
    console.error(err);
    root.insertAdjacentHTML("afterbegin", '<p style="color:#ee5f5b">Could not load data/samples.json: ' + esc(err) + "</p>");
});

})();
