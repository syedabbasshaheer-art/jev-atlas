// build.mjs - merge the layers into one payload, and REFUSE to build on a dangling reference.
import fs from "node:fs";
import path from "node:path";
import { FIELDS, PATTERNS, FAMILIES, FAMILY_OF } from "./taxonomy.mjs";
import { CAPABILITIES } from "./capabilities.mjs";
import { BLUEPRINTS } from "./blueprints.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIR = path.join(HERE, "..", "data");
const evidence = JSON.parse(fs.readFileSync(path.join(DIR, "evidence.json"), "utf8"));

const errors = [];
const byTitle = new Map(evidence.map((e) => [e.title, e]));

for (const b of BLUEPRINTS) {
  if (!FIELDS[b.category]) errors.push(`blueprint ${b.id}: unknown category ${b.category}`);
  for (const c of b.stack) if (!CAPABILITIES[c]) errors.push(`blueprint ${b.id}: unknown capability "${c}"`);
  for (const p of b.phases) for (const c of p.caps) if (!CAPABILITIES[c]) errors.push(`blueprint ${b.id} phase ${p.n}: unknown capability "${c}"`);
  for (const t of b.evidence) if (!byTitle.has(t)) errors.push(`blueprint ${b.id}: evidence "${t}" not in corpus`);
}
for (const e of evidence) {
  if (!FIELDS[e.category]) errors.push(`evidence ${e.id}: unknown category ${e.category}`);
  if (!PATTERNS[e.pattern]) errors.push(`evidence ${e.id}: unknown pattern ${e.pattern}`);
  for (const c of e.capabilities) if (!CAPABILITIES[c]) errors.push(`evidence ${e.id}: unknown capability ${c}`);
  if (!FAMILY_OF[e.category]) errors.push(`evidence ${e.id}: category ${e.category} has no family`);
}

if (errors.length) {
  console.error("BUILD FAILED - " + errors.length + " dangling reference(s):");
  for (const e of errors.slice(0, 40)) console.error("  - " + e);
  process.exit(1);
}

// category rollup, including the white-space signal
const categories = Object.entries(FIELDS).map(([key, f]) => {
  const rows = evidence.filter((e) => e.category === key);
  const caps = {};
  for (const r of rows) for (const c of r.capabilities) caps[c] = (caps[c] || 0) + 1;
  const pats = {};
  for (const r of rows) pats[r.pattern] = (pats[r.pattern] || 0) + 1;
  return {
    key,
    label: f.label,
    blurb: f.blurb,
    evidence_count: rows.length,
    blueprint_count: BLUEPRINTS.filter((b) => b.category === key).length,
    avg_impact: rows.length ? +(rows.reduce((a, r) => a + r.impact, 0) / rows.length).toFixed(2) : 0,
    top_pattern: Object.entries(pats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    top_capabilities: Object.entries(caps).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
    // white space = a category worth building in but barely built in
    family: FAMILY_OF[key],
    whitespace: rows.length <= 12 && (f.label && ["commerce","food","travel","education","hiring","health","comms","backoffice"].includes(key)),
  };
}).sort((a, b) => b.evidence_count - a.evidence_count);

const payload = {
  generated: new Date().toISOString().slice(0, 10),
  source: { gallery: "https://jevable.com", total_scraped: evidence.length, scraped_on: "2026-09-20" },
  categories,
  families: FAMILIES.map(f => ({ ...f,
    evidence_count: evidence.filter(e => FAMILY_OF[e.category] === f.key).length,
    blueprint_count: BLUEPRINTS.filter(b => FAMILY_OF[b.category] === f.key).length })),
  capabilities: CAPABILITIES,
  patterns: PATTERNS,
  blueprints: BLUEPRINTS,
  evidence,
};

fs.writeFileSync(path.join(DIR, "site-data.json"), JSON.stringify(payload));
const kb = (fs.statSync(path.join(DIR, "site-data.json")).size / 1024).toFixed(0);

console.log("BUILD OK");
console.log("  evidence   :", evidence.length);
console.log("  blueprints :", BLUEPRINTS.length, "across", new Set(BLUEPRINTS.map(b => b.category)).size, "categories");
console.log("  categories :", categories.length);
console.log("  capabilities:", Object.keys(CAPABILITIES).length);
console.log("  payload    :", kb + " KB");
console.log("\n  WHITE SPACE (worth building, barely built):");
for (const c of categories.filter(c => c.whitespace)) {
  console.log("   ", String(c.evidence_count).padStart(3), c.label.padEnd(24), "blueprints:", c.blueprint_count);
}
