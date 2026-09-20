/* qa.mjs — the hard gate every harvested candidate must clear.
 *
 * THE STANDARD: rejecting a real Jev project costs one missing row. Admitting
 * something that is not one costs the reader's trust in all the others. So a
 * type-2 error is the one we refuse, and borderline cases are rejected.
 *
 * Three bugs in the first version of this file, all found by reading the
 * rejects instead of trusting the count, and all fixed here:
 *
 *   1. POISON RAN FIRST, so "typesafe-jev-ruby" — a Ruby client for Jev — was
 *      thrown out because its NAME contains a poison pattern. Explicit intent
 *      now wins over a name-shape heuristic. Poison only decides when nothing
 *      explicit was found.
 *   2. A LINK POST HAS NO BODY. Twenty-two Hacker News and dev.to items were
 *      rejected for "no description" when their TITLE was the content.
 *   3. NO CENTRALITY TEST, so "tinystruct" — a Java framework naming Jev only
 *      in its tags — passed as a Jev project, and "SemIf", which says in its
 *      own words "not affiliated with Jev or TypeSafe", passed as one too.
 *      Both are now classified rather than silently admitted.
 */

const JEV = /\bjev\b|\bjev[-_]|[-_]jev\b|\bjevable\b|typesafe[\s'’-]*(?:ai|jev)|\bsystem[\s-]?one\b|\bsystemone\b/i;

/* Name shapes that belong to something else entirely. Consulted ONLY when no
   explicit Jev intent was found anywhere. */
const POISON = [
  /\btypesafe[-_](i18n|actions?|path|decorators?|react|router|api|sql|css|store|rpc|env|form|fetch|query|hooks?)\b/i,
  /\bjevons?\b/i,
  /\bjevgen|jevtic|jevric|jevrem/i,
];

/* Says outright that it is NOT the thing. A reproduction or a rival, which is
   worth cataloguing but is not a project built with Jev. */
const DISCLAIMS = /\bnot affiliated\b|\balternative to (jev|typesafe)\b|\bjev[- ]compatible\b|\bopen(-| )source (jev|alternative)\b|\breproduction of\b|\bclone of jev\b/i;

export function cleanUrl(u) {
  if (!u) return null;
  const s = String(u).trim()
    .replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "");
  if (!/^https?:\/\//i.test(s)) return null;
  try { const v = new URL(s); if (!v.hostname.includes(".")) return null; return v.toString().replace(/\/$/, ""); }
  catch { return null; }
}

/* Stars are GitHub's number. npm's search returns a popularity score in 0..1
   that an earlier version multiplied by 1000 and displayed as stars, which is
   a fabricated figure. Anything not from GitHub now reports no star count. */
export function trueStars(row) {
  const src = (row.discovered_via || [])[0] || row.source;
  if (src !== "github") return null;
  const n = Number(row.stars);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* How central is Jev to this thing? */
export function centrality(row) {
  const title = String(row.title || "");
  const desc = String(row.description || row.postText || "");
  const tags = (row.tags || []).join(" ");
  if (DISCLAIMS.test(desc)) return "alternative";       // a rival or a clone
  if (JEV.test(title)) return "core";                   // it is named for it
  const at = desc.search(JEV);
  if (at >= 0 && at <= 140) return "core";              // the description leads with it
  if (at >= 0) return "integration";                    // a feature of a larger thing
  if (JEV.test(tags)) return "peripheral";              // only a tag: not evidence
  return "none";
}

export function kindOf(row) {
  const t = `${row.title} ${row.description || ""}`.toLowerCase();
  const src = (row.discovered_via || [])[0] || row.source;
  if (/\bawesome[- ]/i.test(row.title)) return "list";
  if (src === "devto" || src === "hackernews") return "writeup";
  if (src === "npm" || /\b(sdk|client|wrapper|library|bindings?|provider|adapter)\b/.test(t)) return "library";
  if (/\b(cli|mcp server|plugin|extension|gateway|router|proxy|harness)\b/.test(t)) return "tool";
  return "project";
}

/**
 * @returns {{pass, reason, url, stars, kind, centrality}}
 */
export function hardQA(row) {
  const url = cleanUrl(row.url);
  if (!url) return { pass: false, reason: "no reachable url", url: null, stars: null, kind: "?", centrality: "?" };

  const title = String(row.title || "");
  const body = String(row.description || row.postText || "");
  const tags = (row.tags || []).join(" ");
  const hay = [title, body, tags, url].join(" ");

  const explicit = JEV.test(hay);

  // Poison only gets a vote when nothing explicit was found. A repo that says
  // "Ruby client for Jev" is a Jev project whatever its name looks like.
  if (!explicit) {
    const p = POISON.find((re) => re.test(hay));
    return { pass: false, reason: p ? "not Jev, and looks like " + p : "never names jev / typesafe-ai / system-one",
             url, stars: null, kind: "?", centrality: "none" };
  }

  const c = centrality(row);
  if (c === "peripheral") return { pass: false, reason: "Jev appears only in tags, not in the title or description", url, stars: null, kind: kindOf(row), centrality: c };
  if (c === "none") return { pass: false, reason: "no Jev reference in title or description", url, stars: null, kind: kindOf(row), centrality: c };

  // A link post's title IS its content. Only demand a body when the title is
  // too thin to stand alone.
  const titleWords = title.trim().split(/\s+/).filter(Boolean).length;
  const bodyWords = body.trim().split(/\s+/).filter(Boolean).length;
  if (bodyWords < 4 && titleWords < 4) {
    return { pass: false, reason: "nothing to show a reader: no description and a bare title", url, stars: null, kind: kindOf(row), centrality: c };
  }

  return { pass: true, reason: "explicit, centrality " + c, url, stars: trueStars(row), kind: kindOf(row), centrality: c };
}
