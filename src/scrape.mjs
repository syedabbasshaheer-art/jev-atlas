// scrape.mjs - pull the evidence layer from the public gallery.
//
// The gallery is server-rendered and ships its own JSON: every page carries a
// <script id="board-data" type="application/json"> blob with posts, total,
// nextOffset and pageSize. So this reads that blob instead of parsing HTML or
// driving a browser. Always look for the blob before you write a scraper.
//
// Politeness: one request per page, sequential, with a pause between.
// Caching: raw pages land in data/raw/ and are reused unless --fresh is passed.

import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DATA = path.join(HERE, "..", "data");
const RAW = path.join(DATA, "raw");

const BASE = "https://jevable.com";
const MAX_PAGES = 60;          // hard stop so a pagination bug cannot loop forever
const PAUSE_MS = 700;
const fresh = process.argv.includes("--fresh");

fs.mkdirSync(RAW, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extract(html) {
  const m = html.match(/<script id="board-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function getPage(n) {
  const file = path.join(RAW, `page${n}.html`);
  if (!fresh && fs.existsSync(file)) return { html: fs.readFileSync(file, "utf8"), cached: true };
  const res = await fetch(n === 1 ? `${BASE}/` : `${BASE}/?page=${n}`, {
    headers: { "user-agent": "jev-atlas/1.0 (+https://github.com/jev-atlas)" },
  });
  if (res.status === 404) return { html: null };
  if (!res.ok) throw new Error(`page ${n}: HTTP ${res.status}`);
  const html = await res.text();
  fs.writeFileSync(file, html);
  return { html, cached: false };
}

const seen = new Map();
let total = null, fetched = 0, cachedCount = 0;

for (let n = 1; n <= MAX_PAGES; n++) {
  const { html, cached } = await getPage(n);
  if (!html) break;
  cached ? cachedCount++ : fetched++;
  const blob = extract(html);
  if (!blob) { console.warn(`  page ${n}: no board-data blob, stopping`); break; }
  if (total === null) total = blob.total;
  const before = seen.size;
  for (const post of blob.posts) if (!seen.has(post.id)) seen.set(post.id, post);
  console.log(`  page ${n}: ${blob.posts.length} posts, ${seen.size - before} new (${seen.size}/${total})`);
  if (blob.posts.length === 0) break;
  if (total !== null && seen.size >= total) break;
  if (!cached) await sleep(PAUSE_MS);
}

const posts = [...seen.values()];
if (!posts.length) { console.error("SCRAPE FAILED: no posts. The gallery markup may have changed."); process.exit(1); }

fs.writeFileSync(path.join(DATA, "corpus.json"), JSON.stringify(posts, null, 1));
console.log(`\nSCRAPE OK  ${posts.length} unique projects (gallery reports ${total})`);
console.log(`  pages fetched ${fetched}, served from cache ${cachedCount}`);
if (total !== null && posts.length !== total) {
  console.warn(`  NOTE: got ${posts.length} but the gallery says ${total}. Re-run with --fresh if that gap is unexpected.`);
}
