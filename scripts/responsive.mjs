// responsive.mjs - measure the layout at real viewport widths.
//
// smoke.mjs proves the page renders and behaves; it cannot see layout, because
// --dump-dom returns a document with no geometry. Horizontal overflow, a tap
// target too small for a thumb, text below a readable size - none of those show
// up in the DOM. They need a browser that has actually laid the page out.
//
// So this drives Chrome over the DevTools Protocol. Node 22+ ships a WebSocket
// client, so that costs no dependency either. Chrome is launched on a fixed
// port and killed BY PID at the end - never by image name, which would take
// down the user's own browser with it.
//
//   node scripts/responsive.mjs [url]

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { dirOf } from "../src/paths.mjs";

const HERE = dirOf(import.meta.url);
const PAGE = path.join(HERE, "..", "public", "index.html");
const url = process.argv[2] || "file:///" + PAGE.replace(/\\/g, "/");
const PORT = 9333;

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((p) => { try { return fs.existsSync(p); } catch { return false; } });
if (!CHROME) { console.error("RESPONSIVE SKIPPED: no Chrome"); process.exit(0); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = path.join(process.env.TEMP || "/tmp", "jev-resp-" + process.pid);

const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  "--remote-debugging-port=" + PORT, "--user-data-dir=" + profile,
  "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: "ignore", detached: false });

// Kill by PID. Killing by image name would close every Chrome window the
// person has open, which has happened before and is not recoverable for them.
const done = (code) => { try { process.kill(chrome.pid); } catch {} process.exit(code); };

let ws, id = 0;
const pending = new Map();
function send(method, params) {
  return new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params: params || {} }));
    setTimeout(() => { if (pending.has(n)) { pending.delete(n); rej(new Error(method + " timed out")); } }, 30000);
  });
}
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || "evaluate threw");
  return r.result.value;
}

// Everything measured in one pass inside the page, so one round trip per width.
const probeFor = (TOUCH) => `(() => {
  const TOUCH = ${TOUCH};
  const de = document.documentElement;
  const vw = de.clientWidth;
  const out = { vw, scrollW: de.scrollWidth, offenders: [], small: [], tiny: [] };
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    // Something sticking out past the viewport, ignoring anything deliberately
    // put in its own horizontal scroller.
    if (r.right > vw + 1) {
      let scroller = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll') { scroller = true; break; }
      }
      if (!scroller && out.offenders.length < 8) {
        out.offenders.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '') + ' right=' + Math.round(r.right));
      }
    }
    // Tap targets. 44px is the TOUCH guideline and only makes sense where a
    // thumb is the pointer; applying it to a mouse at 1920px flags every
    // ordinary 42px control and the check stops meaning anything. On a desktop
    // width the bar is WCAG 2.5.8's 24px.
    if (/^(button|a|input|select)$/.test(el.tagName.toLowerCase()) && r.width > 0) {
      const min = TOUCH ? 44 : 24;
      if ((r.height < min || r.width < min) && out.small.length < 8) {
        out.small.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' <' + min);
      }
    }
    // Text too small to read, counting only elements holding their own text.
    if (el.children.length === 0 && (el.textContent || '').trim().length > 2) {
      const fs = parseFloat(cs.fontSize);
      if (fs && fs < 11.5 && out.tiny.length < 8) out.tiny.push(el.tagName.toLowerCase() + ' ' + fs + 'px "' + (el.textContent||'').trim().slice(0,22) + '"');
    }
  }
  out.cards = document.querySelectorAll('article.card').length;
  return out;
})()`;

const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1920];

try {
  // Wait for the debugging endpoint, then attach to the page target.
  let list = null;
  for (let i = 0; i < 60 && !list; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(250); }
  }
  if (!list) throw new Error("Chrome never opened the debugging port");
  const target = list.find((t) => t.type === "page");
  if (!target) throw new Error("no page target");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error("ws failed")); });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");

  console.log(`RESPONSIVE  ${url}\n`);
  let failed = 0;
  for (const w of WIDTHS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w <= 560,
    });
    await send("Page.navigate", { url });
    await sleep(w === WIDTHS[0] ? 4500 : 2200);
    let r;
    try { r = await evaluate(probeFor(w <= 560)); }
    catch (e) { console.log(`  FAIL  ${w}px - probe threw: ${e.message}`); failed++; continue; }

    const problems = [];
    if (r.scrollW > r.vw + 1) problems.push(`page scrolls sideways (${r.scrollW} > ${r.vw})`);
    if (r.offenders.length) problems.push(`overflowing: ${r.offenders.join(" | ")}`);
    if (r.small.length) problems.push(`tap target under 44px: ${r.small.join(" | ")}`);
    if (r.tiny.length) problems.push(`text under 11.5px: ${r.tiny.join(" | ")}`);
    if (!r.cards) problems.push("no cards rendered");

    if (problems.length) { failed++; console.log(`  FAIL  ${w}px  (${r.cards} cards)`); for (const p of problems) console.log("        " + p); }
    else console.log(`  ok    ${w}px  (${r.cards} cards)`);
  }
  console.log(`\n${WIDTHS.length - failed} of ${WIDTHS.length} widths clean`);
  done(failed ? 1 : 0);
} catch (e) {
  console.error("RESPONSIVE ERROR: " + e.message);
  done(2);
}
