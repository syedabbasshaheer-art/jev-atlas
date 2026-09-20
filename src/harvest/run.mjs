// run.mjs - sweep every source, merge, dedupe, and never lose a hand-made decision.
//
//   node src/harvest/run.mjs              sweep all sources, write data/harvest.json
//   node src/harvest/run.mjs --only github
//   node src/harvest/run.mjs --merge      fold the sweep into data/corpus.json
//   node src/harvest/run.mjs --enrich     fill in X post text via oembed
//
// The rule this file exists to enforce: harvesting ADDS, it never overwrites.
// A project already in the corpus keeps its hand-written classification.

import fs from "node:fs";
import path from "node:path";
import { dirOf } from "../paths.mjs";
import { DISCOVERY, ENRICHERS } from "./sources.mjs";
import { judge } from "./relevance.mjs";

const HERE = dirOf(import.meta.url);
const DATA = path.join(HERE, "..", "..", "data");
const arg = (f) => process.argv.includes(f);
const val = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };

// Queries per source. Broad enough to catch the long tail, narrow enough that
// the noise stays filterable. "jev" alone is a Dutch name and a surname, so it
// is never used unqualified.
const QUERIES = {
  github: ["jev typesafe", "typesafe jev model", "jev system-one", "systemone typed decisions", "awesome jev"],
  hackernews: ["jev typesafe", "typesafe ai jev", "system one model"],
  devto: ["jev"],
  npm: ["jev typesafe", "typesafe-ai"],
  jevable: [""],
};
// Anything that matches none of these is almost certainly a different Jev.
// Bare "typesafe" is ordinary TypeScript vocabulary: it pulled in typesafe-i18n,
// typesafe-actions, typesafe-path and typesafe-decorators, none of which have
// anything to do with Jev. Bind it to ai/jev, or require the word jev itself.
// The accept/reject gate lives in relevance.mjs: precision over recall.

const norm = (u) => {
  if (!u) return "";
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch { return String(u).toLowerCase(); }
};
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function sweep() {
  const only = val("--only", null);
  const all = [];
  const report = [];
  for (const [name, fn] of Object.entries(DISCOVERY)) {
    if (only && name !== only) continue;
    let got = 0, err = null;
    for (const q of QUERIES[name] || [""]) {
      try {
        const rows = await fn(q, {});
        for (const r of rows) all.push(r);
        got += rows.length;
      } catch (e) { err = e.message; }
    }
    report.push({ source: name, raw: got, error: err });
    console.log(`  ${name.padEnd(12)} ${String(got).padStart(4)} raw${err ? "   ERROR: " + err : ""}`);
  }

  // relevance, then dedupe by canonical url, then by author+title
  const relevant = all.filter((r) => r.source === "jevable" ||
    judge(r).accept);
  const byUrl = new Map(), bySig = new Map();
  for (const r of relevant) {
    const u = norm(r.url), sig = r.handle.toLowerCase() + "|" + slug(r.title);
    const prev = byUrl.get(u) || bySig.get(sig);
    if (prev) { // keep the richer record, remember both origins
      prev.also = [...new Set([...(prev.also || []), r.source])];
      if ((r.text || "").length > (prev.text || "").length) prev.text = r.text;
      if ((r.stars || 0) > (prev.stars || 0)) prev.stars = r.stars;
      continue;
    }
    if (u) byUrl.set(u, r);
    bySig.set(sig, r);
  }
  const merged = [...new Set([...byUrl.values(), ...bySig.values()])];
  return { rows: merged, report, rawCount: all.length, relevantCount: relevant.length };
}

async function enrich(rows) {
  const cacheFile = path.join(DATA, "x-oembed-cache.json");
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : {};
  const targets = rows.filter((r) => /^https?:\/\/(www\.)?(x|twitter)\.com\/[^/]+\/status\//.test(r.url || "") && !cache[r.url]);
  const limit = +val("--limit", 40);
  console.log(`  ${targets.length} post(s) without cached text; enriching up to ${limit}`);
  let ok = 0, fail = 0;
  for (const r of targets.slice(0, limit)) {
    try {
      // syndication first: richer, and its urls are already expanded.
      // oembed is the fallback for anything it will not serve.
      let e = await ENRICHERS.xSyndication(r.url);
      if (e) { e.via = "syndication"; }
      else {
        e = await ENRICHERS.xEnrich(r.url);
        if (e) {
          e.via = "oembed";
          e.resolved = [];
          for (const l of (e.links || []).slice(0, 4)) {
            const real = await ENRICHERS.resolveShort(l);
            if (real) e.resolved.push(real);
            await new Promise((s) => setTimeout(s, 250));
          }
        }
      }
      if (e) { cache[r.url] = e; ok++; } else fail++;
    } catch { fail++; }
    await new Promise((s) => setTimeout(s, 600));
  }
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
  const vals = Object.values(cache);
  const withLinks = vals.filter((e) => (e.links || []).length || (e.resolved || []).length).length;
  const bySynd = vals.filter((e) => e.via === "syndication").length;
  const withLikes = vals.filter((e) => typeof e.likes === "number").length;
  console.log(`  enriched ${ok}, failed ${fail}, cached ${vals.length} total`);
  console.log(`  via syndication ${bySynd}, carrying links ${withLinks}, with like counts ${withLikes}`);
  return cache;
}

/* ── merge: additive only ── */
function mergeIntoCorpus(rows) {
  const corpusFile = path.join(DATA, "corpus.json");
  const corpus = JSON.parse(fs.readFileSync(corpusFile, "utf8"));
  const have = new Set(corpus.map((p) => norm(p.url)));
  const haveId = new Set(corpus.map((p) => String(p.id)));
  const added = [];
  for (const r of rows) {
    if (r.source === "jevable") { if (haveId.has(String(r.sid))) continue; }
    if (have.has(norm(r.url))) continue;
    added.push({
      id: `${r.source}:${r.sid}`, url: r.url, handle: r.handle, author: r.author || r.handle,
      title: r.title, category: r.gallery_category || "", description: (r.text || "").slice(0, 280),
      date: r.date || "", tags: r.tags || [], format: r.kind, language: "en",
      postText: r.text || "", media: r.media || [], discovered_via: [r.source, ...(r.also || [])],
      stars: r.stars || 0,
    });
    have.add(norm(r.url));
  }
  if (!added.length) { console.log("  nothing new to add"); return 0; }
  fs.writeFileSync(path.join(DATA, "corpus-additions.json"), JSON.stringify(added, null, 1));
  console.log(`  ${added.length} new item(s) -> data/corpus-additions.json`);
  console.log("  review it, then append to corpus.json and re-run `npm run build`.");
  console.log("  nothing was overwritten: existing rows keep their classification.");
  return added.length;
}

/* ── main ── */
console.log("SWEEP");
const { rows, report, rawCount, relevantCount } = await sweep();
console.log(`\n  raw ${rawCount} -> relevant ${relevantCount} -> unique ${rows.length}`);
const bySource = {};
for (const r of rows) bySource[r.source] = (bySource[r.source] || 0) + 1;
console.log("  by source:", Object.entries(bySource).map(([k, v]) => `${k} ${v}`).join(", "));

fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(path.join(DATA, "harvest.json"), JSON.stringify({
  swept: new Date().toISOString(), report, count: rows.length, rows,
}, null, 1));
console.log(`  -> data/harvest.json`);

if (arg("--enrich")) { console.log("\nENRICH (x.com oembed)"); await enrich(rows); }
if (arg("--merge")) { console.log("\nMERGE"); mergeIntoCorpus(rows); }
