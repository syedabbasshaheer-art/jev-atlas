/* submit.js — "Add a project": the community submission flow.
 *
 * WHAT THIS CAN AND CANNOT DO, stated once so nobody is surprised.
 * A published artifact cannot fetch a cross-origin URL: the CSP blocks it and
 * no runtime capability grants generic HTTP. So this file never pretends to
 * fetch. It does the four things a browser genuinely can do here:
 *
 *   1. parse the pasted URL locally          -> source, id, handle, repo
 *   2. check it against the corpus already here -> duplicate guard
 *   3. ask Claude to propose a classification   -> field, pattern, capabilities
 *   4. queue it in the shared db                -> the pipeline fetches for real
 *
 * The actual metadata fetch happens in src/harvest/, which has no CSP:
 * cdn.syndication.twimg.com for X posts, the GitHub API for repos.
 */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("atlas-data").textContent);
  var CAPS = D.capabilities, PATS = D.patterns, CATS = D.categories;
  var el = function (i) { return document.getElementById(i); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var snack = function (m) {
    var t = el("snack"); if (!t) return;
    t.textContent = m; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  };

  var DB = null, SAMPLE = null, USER = null, ME = null;
  var draft = null;      // the project being added
  var bulk = [];         // queued urls when several were pasted
  var subs = [];         // submissions from the shared db

  /* ───────── local URL parsing, no network ───────── */
  var PARSERS = [
    { re: /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/i,
      map: function (m) { return { source: "x", handle: m[1], sid: m[2], label: "X post by @" + m[1] }; } },
    { re: /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i,
      map: function (m) { return { source: "github", handle: m[1], sid: m[1] + "/" + m[2], label: "GitHub repo · " + m[1] + "/" + m[2] }; } },
    { re: /^https?:\/\/(?:www\.|old\.)?reddit\.com\/r\/([^/]+)\/comments\/([a-z0-9]+)/i,
      map: function (m) { return { source: "reddit", handle: "r/" + m[1], sid: m[2], label: "Reddit post in r/" + m[1] }; } },
    { re: /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i,
      map: function (m) { return { source: "youtube", handle: "", sid: m[1], label: "YouTube video" }; } },
    { re: /^https?:\/\/(?:www\.)?npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/i,
      map: function (m) { return { source: "npm", handle: "", sid: m[1], label: "npm package · " + m[1] }; } },
    { re: /^https?:\/\/news\.ycombinator\.com\/item\?id=(\d+)/i,
      map: function (m) { return { source: "hackernews", handle: "", sid: m[1], label: "Hacker News thread" }; } }
  ];
  function parseUrl(raw) {
    var u = String(raw || "").trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    for (var i = 0; i < PARSERS.length; i++) {
      var m = u.match(PARSERS[i].re);
      if (m) { var o = PARSERS[i].map(m); o.url = u; return o; }
    }
    try { var h = new URL(u).hostname.replace(/^www\./, "");
      return { source: "web", handle: h, sid: u, url: u, label: "Website · " + h };
    } catch (e) { return null; }
  }
  function splitBulk(t) {
    return String(t || "").split(/[\s,]+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return /^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,}\/)/i.test(s); });
  }
  var canon = function (x) {
    try { var v = new URL(x); return (v.hostname.replace(/^www\./, "") + v.pathname.replace(/\/+$/, "")).toLowerCase(); }
    catch (e) { return String(x).toLowerCase(); }
  };
  function findExisting(p) {
    if (!p) return null;
    var k = canon(p.url);
    for (var i = 0; i < D.evidence.length; i++) if (canon(D.evidence[i].url) === k) return D.evidence[i];
    if (p.source === "x") for (var j = 0; j < D.evidence.length; j++) if (String(D.evidence[j].id) === p.sid) return D.evidence[j];
    for (var s = 0; s < subs.length; s++) if (canon(subs[s].url) === k) return { title: subs[s].title || subs[s].url, queued: true };
    return null;
  }

  /* ───────── the modal ───────── */
  function ensureModal() {
    var m = el("addmodal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "addmodal"; m.className = "cmdk"; m.hidden = true;
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Add a project");
    m.innerHTML =
      '<div class="cmd" style="max-width:640px">' +
        '<div style="padding:var(--sp5) var(--sp5) var(--sp3);border-bottom:1px solid var(--outline-variant)">' +
          '<h2 class="t-title-l">Add a project</h2>' +
          '<p class="t-body-m muted" style="margin-top:var(--sp1)">Paste a link from X, GitHub, Reddit, YouTube, npm or any site. Several at once is fine.</p>' +
        '</div>' +
        '<div style="padding:var(--sp4) var(--sp5)">' +
          '<textarea id="addurl" rows="2" placeholder="https://x.com/someone/status/123…" aria-label="Project link" ' +
            'style="width:100%;padding:var(--sp3);border:1px solid var(--outline);border-radius:var(--sh-m);' +
            'background:var(--surface-container-highest);color:var(--on-surface);font:inherit;font-size:var(--body-l);resize:vertical"></textarea>' +
          '<div id="addchip" style="margin-top:var(--sp3)"></div>' +
          '<div id="addform" hidden style="margin-top:var(--sp4)"></div>' +
        '</div>' +
        '<div style="display:flex;gap:var(--sp2);padding:var(--sp4) var(--sp5);border-top:1px solid var(--outline-variant);align-items:center;flex-wrap:wrap">' +
          '<button class="btn btn-text btn-sm" data-add="paste">Paste from clipboard</button>' +
          '<span id="addstatus" class="t-label-m muted" style="margin-left:auto"></span>' +
          '<button class="btn btn-outlined btn-sm" data-add="close">Cancel</button>' +
          '<button class="btn btn-filled btn-sm" data-add="save" disabled>Add to atlas</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) closeModal(); });
    el("addurl").addEventListener("input", onType);
    return m;
  }
  function openModal(prefill) {
    var m = ensureModal();
    m.hidden = false;
    el("addurl").value = prefill || "";
    el("addchip").innerHTML = ""; el("addform").hidden = true; el("addform").innerHTML = "";
    el("addstatus").textContent = ""; el("addurl").focus();
    draft = null; bulk = [];
    if (prefill) onType();
  }
  function closeModal() { var m = el("addmodal"); if (m) m.hidden = true; }

  function onType() {
    var raw = el("addurl").value;
    var urls = splitBulk(raw);
    var chip = el("addchip"), form = el("addform"), save = document.querySelector('[data-add="save"]');
    if (!urls.length) { chip.innerHTML = ""; form.hidden = true; save.disabled = true; draft = null; return; }

    if (urls.length > 1) {                       // bulk paste: this is how it is really done
      bulk = urls;
      var parsed = urls.map(parseUrl).filter(Boolean);
      var dupes = parsed.filter(function (p) { return findExisting(p); }).length;
      chip.innerHTML = '<div class="banner" style="margin:0"><span class="bi">' + ICON_STACK + '</span><span class="t-body-m">' +
        '<b>' + parsed.length + ' links detected.</b> ' + (dupes ? dupes + ' already in the atlas and will be skipped. ' : '') +
        (parsed.length - dupes) + ' will be queued. Bulk adds skip the classification step; the pipeline fills them in.</span></div>';
      form.hidden = true; save.disabled = (parsed.length - dupes) === 0;
      draft = null;
      return;
    }

    bulk = [];
    var p = parseUrl(urls[0]);
    if (!p) { chip.innerHTML = ''; save.disabled = true; return; }
    var dup = findExisting(p);
    if (dup) {
      chip.innerHTML = '<div class="banner" style="margin:0;border-left-color:var(--error)"><span class="bi">' + ICON_WARN + '</span>' +
        '<span class="t-body-m"><b>Already here.</b> ' + esc(dup.title) + (dup.queued ? ' is already queued.' : ' is in the atlas.') + '</span></div>';
      save.disabled = true; form.hidden = true; draft = null; return;
    }
    draft = { url: p.url, source: p.source, handle: p.handle, sid: p.sid,
              title: "", category: "", pattern: "", capabilities: [] };
    chip.innerHTML = '<span class="chip">' + ICON_OK + ' ' + esc(p.label) + '</span>';
    renderForm();
    save.disabled = false;
  }

  var ICON_OK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_WARN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>';
  var ICON_STACK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5"/></svg>';

  function renderForm() {
    var f = el("addform");
    f.hidden = false;
    f.innerHTML =
      '<label class="overline" for="addtitle">Title</label>' +
      '<input id="addtitle" value="' + esc(draft.title) + '" placeholder="What is it, in a few words" ' +
        'style="width:100%;margin:var(--sp1) 0 var(--sp4);padding:var(--sp3);border:1px solid var(--outline);border-radius:var(--sh-m);background:var(--surface-container-highest);color:var(--on-surface);font:inherit">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp3)">' +
        '<div><label class="overline" for="addcat">Field</label>' +
          '<select id="addcat" style="width:100%;margin-top:var(--sp1);padding:var(--sp3);border:1px solid var(--outline);border-radius:var(--sh-m);background:var(--surface-container-highest);color:var(--on-surface);font:inherit">' +
          '<option value="">Choose…</option>' + CATS.map(function (c) {
            return '<option value="' + c.key + '"' + (draft.category === c.key ? " selected" : "") + '>' + esc(c.label) + '</option>'; }).join("") +
          '</select></div>' +
        '<div><label class="overline" for="addpat">Build shape</label>' +
          '<select id="addpat" style="width:100%;margin-top:var(--sp1);padding:var(--sp3);border:1px solid var(--outline);border-radius:var(--sh-m);background:var(--surface-container-highest);color:var(--on-surface);font:inherit">' +
          '<option value="">Choose…</option>' + Object.keys(PATS).map(function (k) {
            return '<option value="' + k + '"' + (draft.pattern === k ? " selected" : "") + '>' + esc(PATS[k].label) + '</option>'; }).join("") +
          '</select></div>' +
      '</div>' +
      '<div style="margin-top:var(--sp4)"><span class="overline">Capabilities it uses</span>' +
        '<div class="caps" id="addcaps" style="margin-top:var(--sp2)">' + Object.keys(CAPS).map(function (k) {
          return '<button type="button" class="cap' + (draft.capabilities.indexOf(k) > -1 ? " key" : "") + '" data-addcap="' + k + '">' + esc(CAPS[k].label) + '</button>'; }).join("") + '</div></div>' +
      '<button class="btn btn-tonal btn-sm" data-add="suggest" style="margin-top:var(--sp4)">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>' +
        'Suggest with Claude</button>';
    el("addtitle").addEventListener("input", function (e) { draft.title = e.target.value; });
    el("addcat").addEventListener("change", function (e) { draft.category = e.target.value; });
    el("addpat").addEventListener("change", function (e) { draft.pattern = e.target.value; });
  }

  /* ───────── Claude proposes a classification from the URL alone ───────── */
  async function suggest() {
    if (!SAMPLE || !draft) { snack("Suggestions are not available here"); return; }
    var btn = document.querySelector('[data-add="suggest"]');
    btn.disabled = true; el("addstatus").textContent = "Asking Claude…";
    try {
      var out = await SAMPLE.json(
        "You are classifying a project for a catalogue of software built with typed decision models.\n" +
        "You are given only a URL. Infer what you reasonably can from it and say so honestly.\n\n" +
        "URL: " + draft.url + "\nSource: " + draft.source + "\nAuthor handle: " + draft.handle + "\n\n" +
        "FIELDS (pick one key): " + CATS.map(function (c) { return c.key + "=" + c.label; }).join(", ") + "\n" +
        "BUILD SHAPES (pick one key): " + Object.keys(PATS).map(function (k) { return k + "=" + PATS[k].one_liner; }).join(" | ") + "\n" +
        "CAPABILITIES (pick 2-5 keys): " + Object.keys(CAPS).map(function (k) { return k + "=" + CAPS[k].job; }).join(" | ") + "\n\n" +
        'Reply with ONLY JSON: {"title":"short plain name","category":"<field key>","pattern":"<shape key>",' +
        '"capabilities":["key","key"],"confidence":"high|medium|low","why":"one short sentence"}\n' +
        "If the URL alone is not enough, still choose the most likely and set confidence to low.",
        { modelTier: "quick" }
      );
      if (out.title) { draft.title = out.title; }
      if (out.category && CATS.some(function (c) { return c.key === out.category; })) draft.category = out.category;
      if (out.pattern && PATS[out.pattern]) draft.pattern = out.pattern;
      if (Array.isArray(out.capabilities)) draft.capabilities = out.capabilities.filter(function (k) { return CAPS[k]; });
      renderForm();
      el("addstatus").textContent = "Claude suggested this · confidence " + (out.confidence || "?") + ". Edit anything.";
    } catch (e) {
      el("addstatus").textContent = e && e.code === "not_granted" ? "Suggestions need permission" : "Could not reach Claude — fill it in by hand";
    } finally { btn.disabled = false; }
  }

  /* ───────── queue it ───────── */
  async function save() {
    if (!DB) { snack("Submissions are not available on this view"); return; }
    var btn = document.querySelector('[data-add="save"]');
    btn.disabled = true; el("addstatus").textContent = "Saving…";
    try {
      var items = [];
      if (bulk.length) {
        bulk.map(parseUrl).filter(Boolean).forEach(function (p) {
          if (findExisting(p)) return;
          items.push({ url: p.url, source: p.source, handle: p.handle, sid: p.sid, title: "", category: "", pattern: "", capabilities: [] });
        });
      } else if (draft) items.push(draft);
      if (!items.length) { el("addstatus").textContent = "Nothing new to add"; btn.disabled = false; return; }

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        await DB.collection("submissions").add({
          url: it.url, source: it.source, handle: it.handle, sid: it.sid,
          title: it.title || "", category: it.category || "", pattern: it.pattern || "",
          capabilities: it.capabilities || [],
          status: "queued",          // queued -> enriched -> published, set by the pipeline
          submittedBy: ME || "",
          submittedAt: new Date().toISOString()
        });
      }
      closeModal();
      snack(items.length === 1 ? "Queued. The pipeline will fetch it." : items.length + " queued for the pipeline.");
    } catch (e) {
      el("addstatus").textContent = (e && e.code === "not_granted") ? "You need edit access to add" : "Could not save — try again";
      btn.disabled = false;
    }
  }

  /* ───────── the Community view ───────── */
  function renderCommunity() {
    var pane = el("pane"), count = el("count");
    if (!pane) return;
    count.textContent = subs.length + " submission" + (subs.length === 1 ? "" : "s");
    var banner = el("banner"); if (banner) banner.hidden = true;
    if (!DB) {
      pane.innerHTML = '<div class="rescue"><h3>Submissions are not available on this view</h3>' +
        '<p>The shared queue needs the page to be opened from claude.ai with access. Everything else on the page works as normal.</p></div>';
      return;
    }
    if (!subs.length) {
      pane.innerHTML = '<div class="rescue"><h3>Nothing submitted yet</h3>' +
        '<p>Paste a link to any Jev project — X, GitHub, Reddit, YouTube, npm or a plain website — and it joins the queue. ' +
        'The pipeline fetches the real details and folds it into the catalogue.</p>' +
        '<button class="btn btn-filled btn-sm" data-add="open">Add the first one</button></div>';
      return;
    }
    var byStatus = { queued: [], enriched: [], published: [] };
    subs.forEach(function (s) { (byStatus[s.status] || byStatus.queued).push(s); });
    pane.innerHTML = '<div class="stagger">' + ["queued", "enriched", "published"].map(function (k) {
      if (!byStatus[k].length) return "";
      var label = k === "queued" ? "Waiting for the pipeline" : k === "enriched" ? "Details fetched, awaiting review" : "In the catalogue";
      return '<div style="margin-bottom:var(--sp5)"><div class="overline" style="margin-bottom:var(--sp2)">' +
        esc(label) + ' · ' + byStatus[k].length + '</div><div class="grid">' +
        byStatus[k].map(function (s) {
          var cat = CATS.filter(function (c) { return c.key === s.category; })[0];
          return '<article class="card card-out ev">' +
            '<div style="display:flex;gap:var(--sp2);align-items:flex-start">' +
              '<h3 class="ev-t"><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
                esc(s.title || s.url.replace(/^https?:\/\//, "").slice(0, 46)) + '</a></h3></div>' +
            '<p class="ev-b">' + esc(s.source) + (s.handle ? " · " + esc(s.handle) : "") + '</p>' +
            (s.capabilities && s.capabilities.length ? '<div class="caps">' + s.capabilities.slice(0, 4).map(function (c) {
              return '<span class="cap">' + esc(CAPS[c] ? CAPS[c].label : c) + '</span>'; }).join("") + '</div>' : "") +
            '<div class="ev-f"><span>' + esc(cat ? cat.label : "unclassified") + '</span>' +
              '<span style="margin-left:auto" class="t-label-s">' + esc((s.submittedAt || "").slice(0, 10)) + '</span></div>' +
            '</article>';
        }).join("") + '</div></div>';
    }).join("") + '</div>';
  }

  /* ───────── wiring ───────── */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-add],[data-addcap]");
    if (!t) return;
    var a = t.dataset.add;
    if (t.dataset.addcap) {
      var k = t.dataset.addcap, i = draft ? draft.capabilities.indexOf(k) : -1;
      if (!draft) return;
      if (i > -1) draft.capabilities.splice(i, 1); else draft.capabilities.push(k);
      t.classList.toggle("key"); return;
    }
    if (a === "open") { openModal(); return; }
    if (a === "close") { closeModal(); return; }
    if (a === "save") { save(); return; }
    if (a === "suggest") { suggest(); return; }
    if (a === "paste") {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (txt) { el("addurl").value = txt; onType(); })
          .catch(function () { snack("Clipboard not available — paste with ⌘V"); });
      } else snack("Clipboard not available — paste with ⌘V");
    }
  });
  document.addEventListener("keydown", function (e) {
    var m = el("addmodal");
    if (e.key === "Escape" && m && !m.hidden) { closeModal(); return; }
    if ((e.key === "Enter") && (e.metaKey || e.ctrlKey) && m && !m.hidden) { e.preventDefault(); save(); return; }
    if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey) && e.shiftKey) { e.preventDefault(); openModal(); }
  });

  // hand the community renderer to the main script
  window.__jevCommunity = renderCommunity;
  window.__jevOpenAdd = openModal;

  /* capabilities resolve later, and may never resolve. Light up on arrival. */
  (async function () {
    try {
      DB = await window.claude.use("db");
      if (DB) {
        DB.collection("submissions").orderBy("submittedAt", "desc").limit(200)
          .onSnapshot(function (snap) {
            subs = snap.docs.map(function (d) { var o = d.data(); o._id = d.id; return o; });
            var active = document.querySelector('.seg button[aria-pressed="true"]');
            if (active && active.dataset.view === "community") renderCommunity();
            var b = document.getElementById("subcount");
            if (b) b.textContent = subs.length ? String(subs.length) : "";
          }, function () { /* transient; the page still works */ });
      }
    } catch (e) { DB = null; }
    try { SAMPLE = await window.claude.use("sample"); } catch (e) { SAMPLE = null; }
    try {
      USER = await window.claude.use("user");
      if (USER && USER.id) ME = await USER.id();
    } catch (e) { USER = null; }
  })();
})();
