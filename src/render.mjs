// render.mjs - inline the dataset into the page template and emit public/index.html.
//
// One file out, no framework, no runtime fetch. The whole catalogue ships inside
// the page, so it works offline, deploys as static output, and has no API to break.

import fs from "node:fs";
import path from "node:path";
import { dirOf } from "./paths.mjs";
import crypto from "node:crypto";
import { LIGHT, DARK, audit, cssBlock } from "./tokens.mjs";

const HERE = dirOf(import.meta.url);
const DATA = path.join(HERE, "..", "data");
const OUT = path.join(HERE, "..", "public");

const tpl = fs.readFileSync(path.join(HERE, "template.html"), "utf8");

// Colour tokens are generated and contrast-audited, never hand-typed.
// A failing pair stops the build: an unreadable page is not a page.
for (const [scheme, name] of [[LIGHT, "LIGHT"], [DARK, "DARK"]]) {
  const a = audit(scheme, name);
  if (a.fails.length) {
    console.error(`RENDER FAILED: ${a.fails.length} contrast failure(s) in ${name}`);
    for (const f of a.fails) console.error(`  ${f.pair}: ${f.r.toFixed(2)} < ${f.need}`);
    process.exit(1);
  }
}
const raw = fs.readFileSync(path.join(DATA, "site-data.json"), "utf8");

// Thumbnails are inlined as data URIs. The published artifact's CSP blocks
// every cross-origin image, so a twimg URL would simply not render there.
// Inlining costs a few MB and makes the page work everywhere, offline included.
let thumbs = "{}";
const thumbFile = path.join(DATA, "thumbs.json");
if (fs.existsSync(thumbFile)) {
  thumbs = fs.readFileSync(thumbFile, "utf8");
  console.log(`  thumbnails: ${Object.keys(JSON.parse(thumbs)).length} inlined, ${(Buffer.byteLength(thumbs)/1024/1024).toFixed(1)} MB`);
}

// Escape the characters that could end the <script> block early or break a JS
// string literal. The blob is read back with JSON.parse, which accepts \uXXXX.
const ESC = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" };
ESC[String.fromCharCode(0x2028)] = "\\u2028";
ESC[String.fromCharCode(0x2029)] = "\\u2029";
const SEPS = new RegExp("[<>&" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]", "g");
const safe = raw.replace(SEPS, (c) => ESC[c]);

if (!tpl.includes("__DATA__")) { console.error("RENDER FAILED: template has no __DATA__ placeholder"); process.exit(1); }
let html = tpl
  .replace("__TOKENS_LIGHT__", () => cssBlock(LIGHT, "  "))
  .replace("__TOKENS_DARK__", () => cssBlock(DARK, "  "))
  .replace("__TOKENS_DARK_2__", () => cssBlock(DARK, "  "))
  .replace("__DATA__", () => safe)
  ;
if (html.includes("__DATA__") || html.includes("__TOKENS_")) { console.error("RENDER FAILED: data or token placeholder survived"); process.exit(1); }

// Cheap structural guards. A JS syntax error or an unbalanced tag blanks the
// page, and that is not something to discover after deploying.
const opens = (html.match(/<script/g) || []).length;
const closes = (html.match(/<\/script>/g) || []).length;
if (opens !== closes) { console.error(`RENDER FAILED: ${opens} <script> vs ${closes} </script>`); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });

// Two outputs, because the two targets have opposite needs.
//
// Vercel serves files: a thumbnail referenced as thumbs/<id>.jpg is cached by
// the browser, fetched only when it scrolls into view, and costs the HTML
// nothing. That is strictly better on a real host.
//
// A published artifact cannot do that at all. Its CSP blocks every
// cross-origin image, and there is no origin to serve a relative path from, so
// the picture has to travel inside the page as a data URI or not exist.
const thumbMap = JSON.parse(thumbs);
const evidence = JSON.parse(raw).evidence;

// The same rank the feed uses, so the images that survive a budget cut are the
// ones a reader actually reaches before scrolling.
const rank = (e) =>
  Math.log10((e.stars || 0) + 1) * 19 +
  (thumbMap[String(e.id)] ? 72 : 0) +
  ((e.discovered_via || [])[0] === "awesome" ? 8 : 0) +
  ((e.blurb || "").length > 60 ? 6 : 0);

// A filename Windows accepts; must match safe_name() in thumbs.py exactly.
const safeName = (id) =>
  /^\d+$/.test(id) ? id : crypto.createHash("sha1").update(id, "utf8").digest("hex").slice(0, 16);

// TWO BUILDS, because the targets have opposite constraints.
//
// Vercel serves files. Every one of the covers can be a thumbs/<name>.jpg that
// the browser caches for a year and fetches only when it scrolls into view.
//
// A published artifact has no origin to serve a relative path from and its CSP
// blocks cross-origin images, so a picture has to travel inside the page. All
// 1,293 inlined come to roughly 19 MB of base64, over the 16 MB page ceiling,
// so the artifact carries the highest-ranked ones until the budget is spent and
// the rest fall back to their designed cover. The artifact is the preview; the
// deployed site is the one that shows everything.
const BUDGET = 11 * 1024 * 1024;
const ranked = evidence
  .filter((e) => thumbMap[String(e.id)])
  .sort((a, b) => rank(b) - rank(a));
const inlined = {};
let used = 0;
for (const e of ranked) {
  const uri = thumbMap[String(e.id)];
  if (used + uri.length > BUDGET) break;
  inlined[String(e.id)] = uri;
  used += uri.length;
}

const fileMap = {};
for (const id of Object.keys(thumbMap)) fileMap[id] = `thumbs/${safeName(id)}.jpg`;

const artifactHtml = html
  .replace("__THUMBS__", () => JSON.stringify(inlined))
  .replace("__THUMBFILES__", () => "{}");
const siteHtml = html
  .replace("__THUMBS__", () => "{}")
  .replace("__THUMBFILES__", () => JSON.stringify(fileMap));

// ---------------------------------------------------------------------------
// The invisibility switch, and the document shell the site (not the artifact)
// needs. Deploying and launching are different events: until PUBLIC_INDEXABLE
// is truthy, every crawler is told no in both places that matter - the meta tag
// and robots.txt. Card 1.35 flips it, deliberately, as its own commit.
//
// The artifact build gets none of this: its host supplies the document shell
// and there is nothing to index.
const INDEXABLE = /^(1|true|yes|on)$/i.test(process.env.PUBLIC_INDEXABLE || "");
const SITE_URL = (process.env.PUBLIC_SITE_URL || "https://jev-atlas.vercel.app").replace(/\/+$/, "");
const ROBOTS = INDEXABLE ? "index,follow" : "noindex,nofollow";

const TITLE = "Jev Atlas";
const DESC = `${evidence.length} shipped projects, classified by what they are for and built from - `
  + "so you can find the ones that already solved a piece of your problem.";

const head = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  `<meta name="robots" content="${ROBOTS}">`,
  `<meta name="description" content="${DESC}">`,
  `<link rel="canonical" href="${SITE_URL}/">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="${TITLE}">`,
  `<meta property="og:title" content="${TITLE}">`,
  `<meta property="og:description" content="${DESC}">`,
  `<meta property="og:url" content="${SITE_URL}/">`,
  `<meta property="og:image" content="${SITE_URL}/og.png">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${TITLE}">`,
  `<meta name="twitter:description" content="${DESC}">`,
  `<meta name="twitter:image" content="${SITE_URL}/og.png">`,
  `<meta name="theme-color" content="#f7f5f1" media="(prefers-color-scheme:light)">`,
  `<meta name="theme-color" content="#12100d" media="(prefers-color-scheme:dark)">`,
].join(String.fromCharCode(10));

const shellHtml = `<!doctype html>
<html lang="en">
<head>
${head}
</head>
<body>
${siteHtml}
</body>
</html>
`;

fs.writeFileSync(
  path.join(OUT, "robots.txt"),
  INDEXABLE
    ? `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
    : `User-agent: *
Disallow: /
`
);
fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`
  + `  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
</urlset>
`
);

for (const [name, out] of [["index.html", siteHtml], ["index.artifact.html", artifactHtml]]) {
  if (out.includes("__THUMBS__") || out.includes("__THUMBFILES__")) {
    console.error(`RENDER FAILED: ${name} still holds a thumbnail placeholder`);
    process.exit(1);
  }
}
fs.writeFileSync(path.join(OUT, "index.html"), shellHtml);
fs.writeFileSync(path.join(OUT, "index.artifact.html"), artifactHtml);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
const sk = (Buffer.byteLength(shellHtml) / 1024).toFixed(0);
const ak = (Buffer.byteLength(artifactHtml) / 1024 / 1024).toFixed(2);
console.log(`RENDER OK  public/index.html ${sk} KB (file-backed, for Vercel)`);
console.log(`           robots: ${ROBOTS} - ${INDEXABLE ? "VISIBLE to crawlers" : "INVISIBLE (PUBLIC_INDEXABLE is off)"}`);
console.log(`           public/index.artifact.html ${ak} MB (${Object.keys(inlined).length} of ${Object.keys(thumbMap).length} inlined, rest fall back)`);
console.log(`           ${Object.keys(fileMap).length} image(s) referenced as files in the Vercel build`);
if (kb > 15000) console.warn("  WARNING: approaching the 16 MB single-page ceiling.");
