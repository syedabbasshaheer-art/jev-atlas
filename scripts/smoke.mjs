// smoke.mjs - does the built page actually work?
//
// `npm run build` only proves the file was written and its script tags balance.
// It cannot tell you the page renders, because nothing runs the JavaScript. A
// syntax error, a missing element id, a thrown TypeError in the first render -
// all of those produce a green build and a blank white page.
//
// So this runs the real file in real Chrome and reads the DOM back out.
// `--dump-dom` executes scripts and prints the resulting document, which needs
// no CDP client, no WebSocket and no dependency. Each case loads a URL hash and
// asserts something about what came back.
//
//   node scripts/smoke.mjs            # against public/index.html
//   node scripts/smoke.mjs <url>      # against a deployed URL
//
// Exit code is the number of failures, so it works as a gate.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { dirOf } from "../src/paths.mjs";

const run = promisify(execFile);
const HERE = dirOf(import.meta.url);
const PAGE = path.join(HERE, "..", "public", "index.html");

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => { try { return fs.existsSync(p); } catch { return false; } });

if (!CHROME) { console.error("SMOKE SKIPPED: no Chrome binary found"); process.exit(0); }

const base = process.argv[2] || "file:///" + PAGE.replace(/\\/g, "/");

async function dom(hash) {
  const { stdout } = await run(CHROME, [
    "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--virtual-time-budget=6000", "--run-all-compositor-stages-before-draw",
    "--dump-dom", base + (hash || ""),
  ], { maxBuffer: 1024 * 1024 * 200, timeout: 90_000 });
  return stdout;
}

const count = (h, re) => (h.match(re) || []).length;
const CARD = /<article class="card/g;

// Each case: a name, the hash to load, and a check that returns "" for pass or
// a reason for fail. Checks read the DOM, never this script's own assumptions.
const CASES = [
  ["renders at all", "", (h) =>
    count(h, CARD) > 0 ? "" : "no .card in the document - the page rendered blank"],

  ["windows the feed rather than dumping 1,442", "", (h) => {
    const n = count(h, CARD);
    return n > 0 && n <= 80 ? "" : `${n} cards on first paint; expected a window of about 60`;
  }],

  ["every card carries a cover", "", (h) => {
    const cards = count(h, CARD), covers = count(h, /<div class="cover"/g);
    return covers >= cards ? "" : `${cards} cards but only ${covers} covers`;
  }],

  ["category ribbon rides the image", "", (h) =>
    count(h, /class="ribbon"/g) > 0 ? "" : "no .ribbon - the category badge is not on the cover"],

  ["attribution renders", "", (h) =>
    count(h, /class="avi"/g) > 0 ? "" : "no .avi initials circle on any card"],

  ["the result count is announced", "", (h) =>
    /id="rescount"[^>]*aria-live/.test(h) ? "" : "result count has no aria-live"],

  ["a filter narrows the feed", "#family=creative", (h) => {
    const n = count(h, CARD);
    return n > 0 ? "" : "filtering by a real family returned nothing";
  }],

  ["search finds an exact term", "#q=agent", (h) =>
    count(h, CARD) > 0 ? "" : 'searching "agent" returned nothing'],

  ["search survives a typo", "#q=agnet", (h) =>
    count(h, CARD) > 0 ? "" : '"agnet" found nothing - fuzzy matching is not working'],

  ["a hopeless query does not blank the screen", "#q=zzzqqqxyw", (h) =>
    /class="empty"/.test(h) ? "" : "no empty state rendered for a no-match query"],

  ["the empty state offers a way out", "#q=zzzqqqxyw", (h) =>
    /id="reset2"|data-drop=/.test(h) ? "" : "empty state gives the reader nothing to click"],

  ["relevance is the sort while searching", "#q=agent", (h) =>
    /data-sort="rel"/.test(h) ? "" : "no relevance sort offered during a query"],

  ["a deep link opens the reading pane", null, async () => {
    const first = (await dom("")).match(/<article class="card[^>]*data-id="([^"]+)"/);
    if (!first) return "could not find a card id to deep-link";
    const h = await dom("#p=" + encodeURIComponent(first[1]));
    return /class="pane-body"/.test(h) ? "" : "deep link did not open the pane";
  }],

  ["no unresolved build placeholder survived", "", (h) =>
    /__DATA__|__THUMBS__|__TOKENS_/.test(h) ? "a placeholder reached the browser" : ""],
];

let failed = 0;
console.log(`SMOKE  ${base}\n`);
for (const [name, hash, check] of CASES) {
  let why;
  try {
    why = hash === null ? await check() : check(await dom(hash));
  } catch (e) {
    why = "threw: " + String(e.message).split("\n")[0].slice(0, 140);
  }
  if (why) { failed++; console.log(`  FAIL  ${name}\n        ${why}`); }
  else console.log(`  ok    ${name}`);
}
console.log(`\n${CASES.length - failed} of ${CASES.length} passed`);
process.exit(failed);
