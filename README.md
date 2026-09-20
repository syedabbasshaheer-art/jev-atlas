# Jev Atlas

A catalogue of what people actually build with a typed decision model, **grouped by the field it serves**, and broken into the **capabilities each project is assembled from**.

Typed classification is one capability of fifteen. The category is the axis.

**Live:** _(add your Vercel URL here after the first deploy)_

---

## The finding this repo exists for

Every project on [jevable.com](https://jevable.com) was scraped on 20 September 2026 — 359 of them — and sorted into the field it serves. The distribution is lopsided:

| Field | Projects | | Field | Projects |
|---|---:|---|---|---:|
| Games & Simulation | **82** | | Security & Trust | 11 |
| Software Engineering | **52** | | Research & Knowledge | 10 |
| Agent Infrastructure | **43** | | Hiring & Careers | **7** |
| Creative & Media | 22 | | Food & Nutrition | **5** |
| Social & Feeds | 21 | | Travel & Mobility | **3** |
| Marketing, SEO & Ads | 18 | | Health & Clinical | **2** |
| Personal Productivity | 16 | | Education & Learning | **1** |
| Email, Chat & Support | 15 | | | |
| Finance & Markets | 14 | | | |
| Robotics & Control | 13 | | | |
| Documents & Back-office | 12 | | | |
| Commerce & Shopping | 12 | | | |

Eighty-two game projects. One education project. Health, travel and education hold six between them.

The crowd built what demos well in an afternoon. Every field with a real user at the other end is close to empty. That gap is what the blueprints in this repo are for.

**Caveat, stated up front:** the gallery was four days old when scraped, with every project dated 16–19 September 2026. Some of this skew is a launch-window artifact. `npm run rebuild` re-runs the whole thing against a fresh scrape, which is how that gets settled rather than argued about.

---

## What is in here

The catalogue has two layers and they do different jobs.

| Layer | What it is | Where it comes from | Count |
|---|---|---|---|
| **Evidence** | Projects that shipped. Proof a capability works. | Scraped, then classified by rules + overrides | 359 |
| **Blueprint** | A composed, launchable project. Capability stack, build order, what goes wrong. | Authored by hand, anchored to evidence | 12 |

Plus two reference layers that make both readable:

| Layer | What it answers | Count |
|---|---|---|
| **Capabilities** | Which job, and who supplies it — provider-agnostic | 15 |
| **Patterns** | The build shapes the 359 collapse into | 10 |

A blueprint names the shipped projects that prove its risky parts. The build **refuses to run** if one of those names does not resolve, so a blueprint can never cite evidence that is not there.

---

## Quick start

```bash
git clone <this repo>
cd jev-atlas
npm run build     # classify -> validate -> render to public/index.html
npm run dev       # build, then serve on http://localhost:4321
```

There are **no dependencies**. Node 20+ and nothing else.

| Command | What it does |
|---|---|
| `npm run scrape` | Pull the gallery. Reuses `data/raw/` if present |
| `npm run scrape:fresh` | Ignore the cache and re-fetch every page |
| `npm run classify` | Corpus → `data/evidence.json` (field, pattern, capabilities, ratings) |
| `npm run data` | Classify, then merge + validate into `data/site-data.json` |
| `npm run render` | Inline the data into the template → `public/index.html` |
| `npm run build` | `data` + `render`. This is what Vercel runs |
| `npm run rebuild` | Fresh scrape, then a full build |

---

## Deploying

The site is one static HTML file with the data inlined. No framework, no runtime fetch, no API to break, works offline.

```bash
vercel          # preview
vercel --prod   # production
```

`vercel.json` already sets `buildCommand: npm run build` and `outputDirectory: public`. Or import the repo in the Vercel dashboard and accept the defaults it reads from that file.

---

## How the pipeline works

```
jevable.com
    │  scrape.mjs   reads the embedded board-data JSON blob, not the HTML
    ▼
data/corpus.json          359 raw posts
    │  classify.mjs  ordered regex rules + hand-written overrides
    ▼
data/evidence.json        + field, pattern, capabilities, impact, effort
    │  build.mjs     merges taxonomy + capabilities + blueprints, VALIDATES
    ▼
data/site-data.json       one payload
    │  render.mjs    inlines it into src/template.html
    ▼
public/index.html         the whole site, 274 KB
```

Each stage writes a file and the next stage reads it, so any stage can be re-run alone and inspected in a text editor.

### The scraper does not parse HTML

The gallery is server-rendered and ships its own JSON in a `<script id="board-data">` tag: `posts`, `total`, `nextOffset`, `pageSize`. One request per page, ten pages, done. No headless browser, no DOM parsing, no selectors to break.

Look for that blob before writing any scraper. It took one `grep` to find.

### The build validates before it renders

`build.mjs` refuses to emit on a dangling reference:

```
BUILD FAILED - 1 dangling reference(s):
  - blueprint intake-router: unknown capability "adaptive"
```

That is a real failure from this repo's history. A capability had been written into a blueprint that did not exist in the registry. The note describing it would have read perfectly well and been wrong. Twenty lines of validation is the only reason it did not ship.

It checks that every blueprint's category, capability stack, phase capabilities and cited evidence all resolve, and that every classified project lands in a known field, pattern and family.

---

## Known limits

Stated plainly, because a catalogue that overstates its depth is worse than a short one.

| Limit | Detail |
|---|---|
| **Evidence is shallow** | X returns HTTP 402 to a plain fetch and 403 through a text proxy, and the gallery strips URLs out of post text. Every project sits at title + tags + a 280-character description + the author's permalink. Nothing deeper was reachable |
| **Ratings are heuristics** | `impact` and `effort` come from the field and the build shape, not from measuring anything. They rank; they do not score |
| **Classification is rules + overrides** | Good enough to match the gallery's own counts closely, not a ground truth. `classify.mjs` carries an override map for exactly this reason |
| **12 blueprints, not 359** | Blueprints are hand-written. The other 347 projects are evidence, not recipes |
| **Four days of data** | See the caveat above |

### A failure worth copying

The finance rule contained `/market/`. **Marketing** contains *market*. Every Marketing project was silently absorbed into Finance — 30 against 1 — and nothing errored. The classifier ran clean and produced a confident, wrong table.

It was caught by comparing against the gallery's own category counts, which the JSON blob carries and which nothing was otherwise using. Marketing was 17 there and 1 here.

Any rule-based classifier needs an independent count to check against. This one nearly shipped without one.

---

## Contributing

Adding a blueprint is the most useful contribution. See [CONTRIBUTING.md](CONTRIBUTING.md) — it is a single object in `src/blueprints.mjs`, and the validator will tell you exactly what is wrong.

## Reference

| Doc | Contents |
|---|---|
| [docs/JEV-REFERENCE.md](docs/JEV-REFERENCE.md) | The API surface, the real limits, question design, economics |
| [docs/PATTERNS.md](docs/PATTERNS.md) | The 10 build shapes, in full |
| [docs/CAPABILITIES.md](docs/CAPABILITIES.md) | The 15 capabilities and who supplies each |

## Licence

MIT. The catalogue links to each project's author; the projects are theirs.
