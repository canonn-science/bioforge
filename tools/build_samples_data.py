"""Fetch biostats for every biology genus from the Canonn API and condense
them into data/samples.json for samples.html.

Usage: python tools/build_samples_data.py [cache_dir]
If cache_dir holds <Term>.json files they are used instead of re-fetching.
"""
import json, math, os, re, sys, urllib.parse, urllib.request
from collections import defaultdict, Counter

API = "https://us-central1-canonn-api-236217.cloudfunctions.net/query/biostats/"
TERMS = ["Aleoida", "Amphora", "Anemone", "Bacterium", "Bark", "Brain", "Cactoida", "Clypeus",
         "Concha", "Crystalline", "Electricae", "Fonticulua", "Frutexa", "Fumerola", "Fungoida",
         "Osseus", "Recepta", "Sinuous", "Stratum", "Tubus", "Tussock"]
ODD_GENERA = ["Anemone", "Brain Tree", "Sinuous Tubers", "Amphora Plant", "Bark Mounds", "Crystalline Shards"]
REGIONS = [
    "Galactic Centre", "Empyrean Straits", "Ryker's Hope", "Odin's Hold", "Norma Arm", "Arcadian Stream",
    "Izanami", "Inner Orion-Perseus Conflux", "Inner Scutum-Centaurus Arm", "Norma Expanse", "Trojan Belt",
    "The Veils", "Newton's Vault", "The Conduit", "Outer Orion-Perseus Conflux", "Orion-Cygnus Arm", "Temple",
    "Inner Orion Spur", "Hawking's Gap", "Dryman's Point", "Sagittarius-Carina Arm", "Mare Somnia", "Acheron",
    "Formorian Frontier", "Hieronymus Delta", "Outer Scutum-Centaurus Arm", "Outer Arm", "Aquila's Halo",
    "Errant Marches", "Perseus Arm", "The Formidine Rift", "Vulcan Gate", "Elysian Shore", "Sanguineous Rim",
    "Outer Orion Spur", "Achilles's Altar", "Xibalba", "Lyra's Song", "Tenebrae", "The Abyss", "Kepler's Crest",
    "The Void"]
METRICS = {  # key: (log axis?, bins)
    "temperature": False, "gravity": False, "pressure": True, "distance": True}
NBINS = 48
MUST_SHARE = 0.99       # data wobbles ~0.3% (bodies logged without surface data), so "all" means >= 99%
MUST_MIN_BODIES = 30    # below this a 100% share could easily be chance
GAME_MATERIALS = {"Antimony", "Arsenic", "Cadmium", "Carbon", "Chromium", "Germanium", "Iron", "Manganese",
                  "Mercury", "Molybdenum", "Nickel", "Niobium", "Phosphorus", "Polonium", "Ruthenium", "Selenium",
                  "Sulphur", "Technetium", "Tellurium", "Tin", "Tungsten", "Vanadium", "Yttrium", "Zinc", "Zirconium"}


def load(term, cache):
    path = os.path.join(cache, term + ".json") if cache else None
    if path and os.path.exists(path):
        return json.load(open(path))
    with urllib.request.urlopen(API + urllib.parse.quote(term), timeout=120) as r:
        return json.load(r)


def split_name(name):
    for g in ODD_GENERA:
        if g in name and " - " not in name:
            return g, g, name
    genus, rest = name.split(" ", 1)
    species, _, variant = name.partition(" - ")
    return genus, species, variant


def star_class(s):
    if not s or s == "null": return None
    for key, label in [("White Dwarf", "White Dwarf"), ("Wolf-Rayet", "Wolf-Rayet"), ("Neutron", "Neutron"),
                       ("Black Hole", "Black Hole"), ("T Tauri", "T Tauri"), ("Herbig", "Herbig Ae/Be"),
                       ("Brown dwarf", "Brown dwarf")]:
        if key in s: return label
    if s.split(" ")[0] in ("C", "CJ", "CN", "S-type", "MS-type"): return "Carbon / S-type"
    t = s.split(" ")[0]
    return {"M": "M", "K": "K", "G": "G", "F": "F", "A": "A", "B": "B", "O": "O"}.get(t, s)


def buckets(entry, key):
    return [(b["min"], b["max"], b["value"]) for b in entry["histograms"].get(key, []) if b and b.get("value")]


def quantile(pairs, q):
    """Weighted quantile of [(lo, hi, w)] buckets (uniform within a bucket, buckets may overlap)."""
    pts = []
    for lo, hi, w in pairs:
        for k in range(20):
            pts.append((lo + (hi - lo) * (k + 0.5) / 20, w / 20))
    pts.sort()
    tot = sum(w for _, w in pts)
    if not tot: return None
    acc = 0
    for x, w in pts:
        acc += w
        if acc >= q * tot: return x
    return pts[-1][0]


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else None
    raw = {}
    for t in TERMS:
        raw.update(load(t, cache))
    bio = [v for v in raw.values() if v.get("hud_category") == "Biology"]

    entries, species, genera = [], defaultdict(lambda: defaultdict(list)), defaultdict(list)
    for e in bio:
        g, s, v = split_name(e["name"])
        e["_g"], e["_s"], e["_v"] = g, s, v
        bodies = sum(e["histograms"].get("body_types", {}).values()) or 1
        mats = e["histograms"].get("materials", {})
        named = {t for t in re.split(r"[_;$]", e["fdevname"]) if t in GAME_MATERIALS}
        entries.append({"n": e["name"], "g": g, "s": s, "v": v, "c": e["count"], "r": e["reward"],
                        # per-variant materials: share of its bodies in permille, never rounded up to 1000 unless
                        # truly all of them
                        "m": {k: (1000 if n >= bodies else min(999, round(1000 * n / bodies))) for k, n in mats.items()},
                        # must-haves: the material named in the codex ID (e.g. $Codex_Ent_Osseus_04_Polonium_Name;)
                        # plus anything on >= MUST_SHARE of its bodies when the sample is big enough to trust
                        "u": sorted(set(named) | {k for k, n in mats.items()
                                                 if bodies >= MUST_MIN_BODIES and n / bodies >= MUST_SHARE}),
                        "f": sorted(named),
                        # codex ID suffix: a star class (K, TTS...), a material (Polonium) or a plain index (01)
                        "k": re.split(r"[_;$]", e["fdevname"])[-3]})
        species[g][s].append(e)
        genera[g].append(e)

    # axis ranges for ridgelines: pooled 0.5–99.5 percentile
    axes = {}
    for m, log in METRICS.items():
        pool = sorted((lo, hi, w) for e in bio for lo, hi, w in buckets(e, m))
        lo, hi = quantile(pool, 0.005), quantile(pool, 0.995)
        if log: lo = max(lo, 1e-4)
        axes[m] = [lo, hi, log]

    def density(es, m):
        lo, hi, log = axes[m]
        f = (lambda x: math.log10(max(x, 1e-9))) if log else (lambda x: x)
        a, b = f(lo), f(hi)
        out = [0.0] * NBINS
        for e in es:
            for blo, bhi, w in buckets(e, m):
                x0, x1 = f(max(blo, 1e-9)), f(max(bhi, 1e-9))
                if x1 <= x0: x1 = x0 + 1e-9
                for i in range(NBINS):
                    c0, c1 = a + (b - a) * i / NBINS, a + (b - a) * (i + 1) / NBINS
                    ov = max(0, min(x1, c1) - max(x0, c0))
                    if ov: out[i] += w * ov / (x1 - x0)
        tot = sum(out) or 1
        return [round(x / tot, 4) for x in out]

    def merged(es, m):
        return sorted(p for e in es for p in buckets(e, m))

    sp_out = []
    for g, ss in species.items():
        for s, es in ss.items():
            rec = {"g": g, "s": s, "variants": len(es), "count": sum(e["count"] for e in es),
                   "reward": max(e["reward"] for e in es)}
            rec["regions"] = [round(sum(r in e["regions"] for e in es) / len(es), 3) for r in REGIONS]
            fp = {}
            for m in METRICS:
                p = merged(es, m)
                if p: fp[m] = [quantile(p, q) for q in (0.05, 0.5, 0.95)]
            rec["fp"] = fp
            sp_out.append(rec)

    gen_out = {}
    for g, es in genera.items():
        total = sum(e["count"] for e in es)
        mats, stars, bodies = Counter(), Counter(), Counter()
        for e in es:
            for k, n in e["histograms"].get("materials", {}).items(): mats[k] += n
            for k, n in e["histograms"].get("primary_stars", {}).items():
                c = star_class(k)
                if c: stars[c] += n
            for k, n in e["histograms"].get("body_types", {}).items(): bodies[k] += n
        # share of sightings whose body carries each material
        mat_total = sum(sum(e["histograms"].get("body_types", {}).values()) for e in es) or 1
        scale = lambda c: {k: round(n * total / (sum(c.values()) or 1)) for k, n in c.most_common()}
        must = Counter()  # sightings of variants whose 'materials' list names the element (a must-have)
        for e in es:
            for k in e.get("materials", []): must[k] += e["count"]
        gen_out[g] = {"count": total, "variants": len(es),
                      "materials": {k: round(n / mat_total, 4) for k, n in mats.items()},
                      "must": {k: round(n / total, 4) for k, n in must.items()},
                      "stars": scale(stars), "bodies": scale(bodies),
                      "ridge": {m: density(es, m) for m in METRICS}}

    out = {"generated": __import__("datetime").date.today().isoformat(), "regions": REGIONS,
           "axes": axes, "bins": NBINS, "entries": entries, "species": sp_out, "genera": gen_out}
    os.makedirs("data", exist_ok=True)
    with open("data/samples.json", "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(len(entries), "entries,", len(sp_out), "species,", len(gen_out), "genera")


if __name__ == "__main__":
    main()
