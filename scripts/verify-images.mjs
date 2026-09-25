// verify-images.mjs - is the bulk image upload actually on the host?
//
// The rule this exists for: a bulk upload gets verified from the OUTSIDE.
// The tempting version reads back the build's own manifest and reports that
// every entry is present. That measures obedience, not completeness - a
// verifier once reported 10,118 of 10,118 fine while 4,535 files were missing,
// because a glob had matched one extension.
//
// So the source of truth here is the filesystem: walk public/thumbs, take a
// random sample, and fetch each one over HTTP from the deployed host. A file
// that exists locally and 404s publicly is exactly the failure being hunted.
//
//   node scripts/verify-images.mjs <base-url> [sample-size]

import fs from "node:fs";
import path from "node:path";
import { dirOf } from "../src/paths.mjs";

const HERE = dirOf(import.meta.url);
const DIR = path.join(HERE, "..", "public", "thumbs");
const base = (process.argv[2] || "").replace(/\/+$/, "");
const N = Number(process.argv[3] || 40);

if (!base) { console.error("usage: node scripts/verify-images.mjs <base-url> [sample-size]"); process.exit(2); }
if (!fs.existsSync(DIR)) { console.error("no public/thumbs on disk"); process.exit(2); }

const files = fs.readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png|webp|avif)$/i.test(f));
console.log(`${files.length} image file(s) on disk in public/thumbs`);

// Random sample without replacement, so a systematically broken tail is as
// likely to be caught as a broken head.
const pool = files.slice();
for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
const sample = pool.slice(0, Math.min(N, pool.length));

let ok = 0, bad = [], thin = [];
await Promise.all(sample.map(async (f) => {
  const url = `${base}/thumbs/${f}`;
  const onDisk = fs.statSync(path.join(DIR, f)).size;
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) { bad.push(`${f} -> HTTP ${r.status}`); return; }
    const body = await r.arrayBuffer();
    if (body.byteLength === 0) { bad.push(`${f} -> 200 but empty body`); return; }
    // A served file much smaller than the one on disk usually means a pointer
    // file or an error page wearing a 200.
    if (body.byteLength < onDisk * 0.5) { thin.push(`${f} -> served ${body.byteLength}B vs ${onDisk}B on disk`); return; }
    ok++;
  } catch (e) { bad.push(`${f} -> ${String(e.message).slice(0, 80)}`); }
}));

console.log(`sampled ${sample.length}: ${ok} served correctly, ${bad.length} failed, ${thin.length} suspiciously small`);
for (const b of bad.slice(0, 12)) console.log("  FAIL  " + b);
for (const t of thin.slice(0, 12)) console.log("  THIN  " + t);

const cacheProbe = await fetch(`${base}/thumbs/${sample[0]}`).then((r) => r.headers.get("cache-control")).catch(() => null);
console.log(`cache-control on a thumb: ${cacheProbe || "(none)"}`);
if (!/immutable/.test(cacheProbe || "")) console.log("  note: expected an immutable one-year cache on /thumbs/");

process.exit(bad.length + thin.length ? 1 : 0);
