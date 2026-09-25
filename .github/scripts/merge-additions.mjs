// merge-additions.mjs — card 4.4 (dedup) belt-and-braces, and card 4.5
// (added_at) end to end.
//
// run.mjs's own mergeIntoCorpus() already dedups new candidates against the
// corpus by normalized URL and by jevable id before writing
// data/corpus-additions.json, and deliberately stops there for a human to
// review by hand. This script is the unattended continuation of that same
// additive-only contract: it is the ONLY thing that writes data/corpus.json
// in the cron, it re-checks the URL dedup itself (so a stale
// corpus-additions.json left over from an interrupted run can never double-
// add a row), and it stamps `added_at` on every genuinely new row —
// never touching a row that already has one.
//
// A rerun with no new upstream content: corpus-additions.json is either
// absent or empty, this script no-ops, and `npm run build` runs on an
// unchanged corpus.json — an empty diff, satisfying card 4.4's DONE-WHEN.
//
// The "New this week" rail filter that READS added_at is separate work
// (card 4.5's UI half) — this script only guarantees the field exists and is
// honest; it does not touch src/ or the renderer.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const CORPUS = path.join(ROOT, "data", "corpus.json");
const ADDITIONS = path.join(ROOT, "data", "corpus-additions.json");

function out(name, value) {
  const f = process.env.GITHUB_OUTPUT;
  if (f) fs.appendFileSync(f, `${name}=${value}\n`);
}

const norm = (u) => {
  if (!u) return "";
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch { return String(u).toLowerCase(); }
};

if (!fs.existsSync(ADDITIONS)) {
  console.log("merge-additions: no data/corpus-additions.json — nothing to merge");
  out("added_count", "0");
  process.exit(0);
}

const additions = JSON.parse(fs.readFileSync(ADDITIONS, "utf8"));
if (!additions.length) {
  console.log("merge-additions: corpus-additions.json is empty (QA gate admitted nothing) — nothing to merge");
  fs.rmSync(ADDITIONS, { force: true });
  out("added_count", "0");
  process.exit(0);
}

const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
const have = new Set(corpus.map((p) => norm(p.url)));
const today = new Date().toISOString().slice(0, 10);

let addedCount = 0;
for (const row of additions) {
  const key = norm(row.url);
  if (!key || have.has(key)) continue; // already in the corpus — dedup, belt-and-braces on run.mjs's own check
  const stamped = { ...row };
  if (!stamped.added_at) stamped.added_at = today; // never overwrite an existing added_at
  corpus.push(stamped);
  have.add(key);
  addedCount++;
}

if (addedCount > 0) {
  fs.writeFileSync(CORPUS, JSON.stringify(corpus, null, 1));
  console.log(`merge-additions: added ${addedCount} new row(s) to data/corpus.json, stamped added_at=${today}`);
} else {
  console.log("merge-additions: every gated addition was already present — nothing new");
}

// Clear it so a subsequent run (or a retry) never re-processes the same file.
fs.rmSync(ADDITIONS, { force: true });
out("added_count", String(addedCount));
