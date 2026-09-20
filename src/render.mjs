// render.mjs - inline the dataset into the page template and emit public/index.html.
//
// One file out, no framework, no runtime fetch. The whole catalogue ships inside
// the page, so it works offline, deploys as static output, and has no API to break.

import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DATA = path.join(HERE, "..", "data");
const OUT = path.join(HERE, "..", "public");

const tpl = fs.readFileSync(path.join(HERE, "template.html"), "utf8");
const raw = fs.readFileSync(path.join(DATA, "site-data.json"), "utf8");

// Escape the characters that could end the <script> block early or break a JS
// string literal. The blob is read back with JSON.parse, which accepts \uXXXX.
const ESC = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" };
ESC[String.fromCharCode(0x2028)] = "\\u2028";
ESC[String.fromCharCode(0x2029)] = "\\u2029";
const SEPS = new RegExp("[<>&" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]", "g");
const safe = raw.replace(SEPS, (c) => ESC[c]);

if (!tpl.includes("__DATA__")) { console.error("RENDER FAILED: template has no __DATA__ placeholder"); process.exit(1); }
const html = tpl.replace("__DATA__", () => safe);
if (html.includes("__DATA__")) { console.error("RENDER FAILED: placeholder survived"); process.exit(1); }

// Cheap structural guards. A JS syntax error or an unbalanced tag blanks the
// page, and that is not something to discover after deploying.
const opens = (html.match(/<script/g) || []).length;
const closes = (html.match(/<\/script>/g) || []).length;
if (opens !== closes) { console.error(`RENDER FAILED: ${opens} <script> vs ${closes} </script>`); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), html);

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`RENDER OK  public/index.html  ${kb} KB`);
if (kb > 15000) console.warn("  WARNING: approaching the 16 MB single-page ceiling.");
