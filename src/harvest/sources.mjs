// sources.mjs - one adapter per place people publish projects.
//
// Every adapter is a function (query, opts) -> [RawItem] and nothing else, so
// adding a source is adding a function. They are deliberately boring: an HTTP
// call and a shape mapping. Nothing here drives a browser, because none of
// these needs one (see PLAN-HARVEST.md for the ladder and why).
//
// RawItem: { source, sid, url, title, text, author, handle, date, stars, tags, kind }

const UA = "jev-atlas/1.0 (+https://github.com/syedabbasshaheer-art/jev-atlas)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json", ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.slice(0, 90)}`);
  return res.json();
}
const iso = (d) => { try { return new Date(d).toISOString().slice(0, 10); } catch { return null; } };

/* ── GitHub: repos. The richest source, because code is the strongest evidence
      that a project is real. Unauthenticated is 10 req/min, which is plenty;
      set GITHUB_TOKEN to lift it to 30. ── */
export async function github(query, o = {}) {
  const out = [], per = 100;
  for (let page = 1; page <= (o.pages || 3); page++) {
    const u = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${per}&page=${page}`;
    const h = { accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    let j;
    try { j = await getJSON(u, h); } catch (e) { if (page === 1) throw e; break; }
    for (const r of j.items || []) out.push({
      source: "github", sid: String(r.id), url: r.html_url, title: r.name,
      text: r.description || "", author: r.owner?.login || "", handle: r.owner?.login || "",
      date: iso(r.created_at), stars: r.stargazers_count, tags: r.topics || [], kind: "repo",
    });
    if (!j.items || j.items.length < per) break;
    await sleep(o.pause ?? 2500);
  }
  return out;
}

/* ── Hacker News via Algolia. Free, no key, and it indexes both stories and
      comments, so a project mentioned only in a thread still surfaces. ── */
export async function hackernews(query, o = {}) {
  const j = await getJSON(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${o.limit || 100}&tags=story`);
  return (j.hits || []).filter((h) => h.url || h.story_text).map((h) => ({
    source: "hackernews", sid: String(h.objectID), url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    title: h.title || "", text: (h.story_text || "").slice(0, 600), author: h.author || "", handle: h.author || "",
    date: iso(h.created_at), stars: h.points || 0, tags: h._tags || [], kind: "post",
  }));
}

/* ── dev.to. Tag and query search, no key. ── */
export async function devto(query, o = {}) {
  const j = await getJSON(`https://dev.to/api/articles?per_page=${o.limit || 60}&tag=${encodeURIComponent(o.tag || "jev")}`);
  const q = query.toLowerCase().split(/\s+/)[0];
  return (j || []).filter((a) => !q || JSON.stringify(a).toLowerCase().includes(q)).map((a) => ({
    source: "devto", sid: String(a.id), url: a.url, title: a.title || "",
    text: a.description || "", author: a.user?.name || "", handle: a.user?.username || "",
    date: iso(a.published_at), stars: a.positive_reactions_count || 0, tags: a.tag_list || [], kind: "article",
  }));
}

/* ── npm. A published package is a strong signal and carries a repo link. ── */
export async function npm(query, o = {}) {
  const j = await getJSON(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${o.limit || 60}`);
  return (j.objects || []).map(({ package: p, score }) => ({
    source: "npm", sid: p.name, url: p.links?.repository || p.links?.npm || "", title: p.name,
    text: p.description || "", author: p.publisher?.username || "", handle: p.publisher?.username || "",
    date: iso(p.date), stars: Math.round((score?.detail?.popularity || 0) * 1000), tags: p.keywords || [], kind: "package",
  })).filter((x) => x.url);
}

/* ── PyPI has no search API any more; its index is html-only and enormous, so
      it is deliberately not implemented rather than half-implemented. ── */

/* ── jevable: the curated gallery. Server-rendered with its own JSON blob. ── */
export async function jevable(_query, o = {}) {
  const out = new Map();
  for (let page = 1; page <= (o.pages || 12); page++) {
    const res = await fetch(page === 1 ? "https://jevable.com/" : `https://jevable.com/?page=${page}`, { headers: { "user-agent": UA } });
    if (res.status === 404) break;
    if (!res.ok) break;
    const html = await res.text();
    const m = html.match(/<script id="board-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) break;
    const d = JSON.parse(m[1]);
    for (const p of d.posts || []) if (!out.has(p.id)) out.set(p.id, {
      source: "jevable", sid: p.id, url: p.url, title: p.title, text: p.postText || p.description || "",
      author: p.author, handle: p.handle, date: p.date, stars: 0, tags: p.tags || [], kind: "post",
      media: p.media, gallery_category: p.category,
    });
    if (d.total && out.size >= d.total) break;
    await sleep(o.pause ?? 700);
  }
  return [...out.values()];
}

/* ── X ENRICHMENT, not discovery.
      x.com returns 402 to a plain fetch and 403 through a text proxy, so the
      timeline cannot be searched without the paid API. The public oembed
      endpoint does return the full text of any single public post, so this
      takes post URLs we already have and fills in what the gallery stripped.
      One call per post, so it is rate-limited politely and cached. ── */
export async function xEnrich(url) {
  const u = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1&dnt=1`;
  const res = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) return null;
  const j = await res.json();
  const html = j.html || "";
  const text = html.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").trim();
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    .filter((h) => !/twitter\.com|x\.com/.test(h));
  return { author: j.author_name || "", author_url: j.author_url || "", text, links };
}

/* ── X SYNDICATION. This is how jevable.com does it, established by matching
      its stored rows against this endpoint byte for byte: the avatar URL, the
      post text and the video poster are identical.
      cdn.syndication.twimg.com is the backend for embedded-tweet widgets. It
      takes a post id and a token derived from that id, needs no key, and
      returns the whole object: text, author, avatar, media variants, mentions
      and - the useful part - entities.urls[].expanded_url, which is the real
      destination already resolved, so no t.co round trip is needed.
      Strictly richer than oembed. Kept alongside it as a fallback. ── */
export function syndToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}
export async function xSyndication(urlOrId) {
  const id = String(urlOrId).match(/status\/(\d+)/)?.[1] || String(urlOrId);
  if (!/^\d+$/.test(id)) return null;
  const u = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${syndToken(id)}`;
  const res = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j || !j.text) return null;
  const media = (j.mediaDetails || []).map((m) => ({
    type: m.type, poster: m.media_url_https,
    sources: (m.video_info?.variants || []).filter((v) => v.content_type === "video/mp4").map((v) => v.url),
  }));
  return {
    id, text: j.text,
    author: j.user?.name || "", handle: j.user?.screen_name || "",
    avatar: j.user?.profile_image_url_https || "",
    date: (j.created_at || "").slice(0, 10),
    likes: j.favorite_count || 0,
    // already expanded: no shortener hop
    links: (j.entities?.urls || []).map((x) => x.expanded_url).filter(Boolean),
    mentions: (j.entities?.user_mentions || []).map((m) => m.screen_name),
    media,
  };
}

/* ── t.co resolution. The oembed html gives shortened links; one HEAD request
      each turns them into the real destination, which is usually the repo or
      the live demo. No auth, and the redirect is the whole response. ── */
export async function resolveShort(url) {
  if (!/^https?:\/\/t\.co\//.test(url)) return url;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual", headers: { "user-agent": "Mozilla/5.0" } });
    const loc = res.headers.get("location");
    if (!loc) return url;
    return /^https?:\/\/(www\.)?(x|twitter)\.com\//.test(loc) ? null : loc; // drop quote-tweets
  } catch { return url; }
}

export const ENRICHERS = { xSyndication, xEnrich, resolveShort };

export const DISCOVERY = { github, hackernews, devto, npm, jevable };
