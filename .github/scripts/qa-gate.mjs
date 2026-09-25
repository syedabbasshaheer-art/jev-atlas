// qa-gate.mjs — card 4.8: the hard QA gate runs INSIDE the cron, before
// anything is written, not as an after-the-fact check.
//
// It re-uses the existing gate (src/harvest/qa.mjs's hardQA) rather than
// inventing a second one — this file only IMPORTS it (read-only; src/ is
// owned by another writer and is never edited here) and wires it into the
// unattended pipeline: run.mjs's own relevance.judge() already screens raw
// candidates during the sweep, but hardQA — the stricter, centrality-aware
// gate with the fixed poison/disclaim/link-post bugs — was not otherwise
// invoked before data/corpus-additions.json reached the corpus. This script
// closes that gap without touching run.mjs.
//
// Input:  data/corpus-additions.json (written by `node src/harvest/run.mjs --merge`)
// Output: the same file, filtered to admitted rows only; rejects are appended
//         (never overwritten) to data/qa-rejects.json with a reason and a
//         timestamp, so a drifting source leaves a trail instead of silence.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hardQA } from "../../src/harvest/qa.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const ADDITIONS = path.join(ROOT, "data", "corpus-additions.json");
const REJECTS = path.join(ROOT, "data", "qa-rejects.json");

function out(name, value) {
  const f = process.env.GITHUB_OUTPUT;
  if (f) fs.appendFileSync(f, `${name}=${value}\n`);
}

if (!fs.existsSync(ADDITIONS)) {
  console.log("qa-gate: no data/corpus-additions.json — nothing to gate (harvest found nothing new)");
  out("admitted", "0");
  process.exit(0);
}

const rows = JSON.parse(fs.readFileSync(ADDITIONS, "utf8"));
const admitted = [];
const rejected = [];

for (const row of rows) {
  const verdict = hardQA(row);
  if (verdict.pass) admitted.push(row);
  else rejected.push({
    id: row.id, url: row.url, title: row.title,
    reason: verdict.reason, checkedAt: new Date().toISOString(),
  });
}

fs.writeFileSync(ADDITIONS, JSON.stringify(admitted, null, 1));

if (rejected.length) {
  const prior = fs.existsSync(REJECTS) ? JSON.parse(fs.readFileSync(REJECTS, "utf8")) : [];
  fs.writeFileSync(REJECTS, JSON.stringify([...prior, ...rejected], null, 1));
}

console.log(`qa-gate: ${admitted.length} admitted, ${rejected.length} rejected of ${rows.length} candidate(s)`);
if (rows.length > 0 && admitted.length === 0) {
  console.log("qa-gate: WARNING — every candidate this run was rejected. If harvest reported healthy source counts, a source may have changed shape (see W9) rather than the field being quiet.");
}

out("admitted", String(admitted.length));
