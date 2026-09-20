// classify.mjs - turns the scraped gallery into the Evidence layer of the catalog.
// Re-runnable: when the gallery grows past 359, run this again.
// Rules first, curated overrides second. Overrides always win.

import fs from "node:fs";
import path from "node:path";
import { FIELDS } from "./taxonomy.mjs";
import { PATTERNS } from "./taxonomy.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DIR = path.join(HERE, "..", "data");

// ---------- CATEGORY RULES (category is the core axis) ----------
// first match wins; order = most specific first
const CATEGORY_RULES = [
  ["food",       /snack|recipe|calorie|\bfood\b|menu|drive-through|nutrition|ordering/i],
  ["travel",     /flight|hotel|travel|aircraft|wifi checks|emergency routing|transport|train rout/i],
  ["hiring",     /resume|r.sum|recruit|candidate|job.?(search|crawler|description|matching)|screener|hiring|jevsume/i],
  ["health",     /clinical|healthcare|intake|patient|rheum/i],
  ["education",  /tutor|student|curriculum|ncert|lesson|teaching|\blearn|quiz|grading|flashcard/i],
  ["marketing",  /seo|aeo|backlink|outreach|ad account|competitor|advertis|viral|\bbrand|lead-?scor|linkedin|reddit|worth replying|video hook|superx|content (map|research)|ad x-ray|maxfusion/i],
  ["finance",    /\btrad(e|es|er|ing)\b|\bmarkets?\b|\bstock|hedge fund|backtest|bitcoin|crypto|\bsol\b|monad|portfolio|market-?news|market brief/i],
  ["robotics",   /robot|drone|mujoco|robot arm|driving|navigation|litter|microduck|obstacle/i],
  ["games",      /tetris|chess|pok.mon|mario|arcade|poker|sudoku|maze|rubik|catan|balatro|runescape|fps|npc|\bgame|puzzle|wordle|connect four|pac-?man|pinball|dino|flappy|minesweeper|snake|tic-tac-toe|clash royale|geometry dash|league of legends|resident evil|slay the spire|dungeon|civilization|village|town of|playtest|dogfight|combat|fight|kerbal|sindicat|big two|rock-?paper|nuclear hot potato|escape room|detective|silo vault|pong|time crisis|sparking zero|naruto|dojo|balkan|6502/i],
  ["security",   /security|fraud|malicious|bot-?detection|traffic-?guard|pkg-?gate|\bnpm\b|redaction|privacy|\brls\b|vulnerab|exploit|etherscan|jevscan|reward-?hacking|injection|sensitive-?data/i],
  ["comms",      /email|inbox|gmail|ticket|support|moderation|\bchat\b|slack|discord|twitch|intake|triage|calendar|scheduling|cal\.com/i],
  ["desktop",    /file organization|file-?organization|files by|sort files|downloads|clipboard|launcher|journaling|notebook|calculator|obsidian|\bwiki|autocorrect|jargon|sniff test|coaching|knowledge management|macos|predictive app/i],
  ["backoffice", /\bpdf\b|\bocr\b|invoice|\btax\b|\bform|spreadsheet|document|receipt|field mapping|autofill/i],
  ["commerce",   /shopping|\bproduct|ecommerce|e-commerce|easyfinder|hipershopping|ego lite|agentcard|vendor|\bprice/i],
  ["social",     /feed|timeline|slop|x post|tweet|social|youtube|bluesky|reply|engagement bait|vibecheck|your signal|profile analysis/i],
  ["research",   /research|paper|tc39|proposal|library|books|news classification|geolocation|dataset|data quality|atlas|essay|recommendations|\bnews\b/i],
  ["agentinfra", /routing|router|model selection|compaction|context|tool-?prune|tool selection|skill router|\bmcp\b|\beval|calibration|agent (swarm|trace|evaluation)|circuit breaker|memory|harness|observability|dual-brain|judgment cache|semantic cache|self-healing|browser-?agent|computer use|benchmark/i],
  ["creative",   /music|piano|beats|orchestra|composition|pixel|drawing|paint|\bart\b|\b3d\b|blender|figma|camera|video editing|character|animation|colou?r|design|improv|comedy|website composed/i],
  ["devtools",   /code review|code-?review|pull request|linting|\blint|testing|e2e|end-to-end|qa tester|postgres|query plan|\bsql|supabase|codebase|\bdiff\b|coding-?agent|\bcli\b|terminal|shell command|generative ui|typeahead|variable generation|api integration|documentation|debug|session replay|repository issue|guardrails|draft quality|ai-?writing|slop detector|jevals|jevcal|azdaja|cambium|tonk|noflow/i],
];

// ---------- BUILD PATTERN RULES ----------
const PATTERN_RULES = [
  ["voice-intent",    /voice|wake word|speech|spoken|talking|drive-through/i],
  ["browser-agent",   /browser (agent|use|automation|control)|computer use|browser-?agents|stagehand|notte|rtrvr|crawler|scrolling agent|automation across|phone automation|web tasks/i],
  ["control-loop",    /tetris|chess|pok.mon|mario|arcade|maze|robot|drone|driving|mujoco|npc|fps|game-?ai|pinball|dino|flappy|snake|pathfinding|simulation|sentinel|rubik|balatro|catan|combat|fight|aiming|platformer|runescape|kerbal|pong|puzzle|connect four|pac-?man|minesweeper|tic-tac-toe|poker|big two|sudoku/i],
  ["feed-filter",     /feed|timeline|ad block|ad filter|ad cleanup|slop|comment classification|moderation|extension|cookie|popup|filtering|live youtube/i],
  ["ci-gate",         /pull request|code review|code-?review|lint|gate|checks for every|coding standards|rls|quality gate|review gates|e2e|end-to-end|qa tester|testing/i],
  ["context-manager", /compaction|context|prune|memory|tool-?selection|skill router|cache/i],
  ["router-gate",     /routing|router|model selection|dispatch|circuit breaker|bot-?detection|traffic-?guard|pkg-?gate|npm|guardrail|safety check|fraud|security pipeline|redaction|injection/i],
  ["adaptive-ui",     /form|typeahead|autofill|generative ui|spreadsheet|intent-?driven|adaptive|interface|buttons|field mapping|instant variable|contextual help|launcher|composed for each reader/i],
  ["semantic-search", /search|find in page|semantic|ranking|rank|retrieval|discovery|matching|recommend|explore art|query/i],
  ["batch-scorer",    /scoring|score|classif|sorting|classify|batch|\d{3,}|thousand|million|audit|detect|analysis|triage|tier-?list|benchmark|evaluat/i],
];

// ---------- CAPABILITY DETECTION ----------
const CAP_RULES = [
  ["voicein",     /voice|speech|spoken|wake word|talking|audio|drive-through/i],
  ["voiceout",    /talk-?back|tts|speaks|voice-controlled/i],
  ["browser",     /browser|extension|dom|web page|stagehand|playwright|crawler|scrolling|computer use|rtrvr|notte|page/i],
  ["domsnapshot", /browser (agent|use|automation)|computer use|dom|element|page element|find in page/i],
  ["fetch",       /crawler|scrape|search api|news|feed|catalog|catalogue|headline|11 million|corpus|proposals|papers/i],
  ["vision",      /ocr|image|visual|screenshot|camera|photo|pixel|video|shot|3d|blender|figma|perception/i],
  ["imagegen",    /drawing|paint|pixel art|image experiment|generat.*image|level-?generation/i],
  ["search",      /search|semantic|ranking|rank|retrieval|matching|discovery|recommend|find/i],
  ["store",       /catalog|catalogue|database|postgres|sqlite|convex|supabase|spreadsheet|corpus|atlas/i],
  ["realtime",    /real-?time|live|streaming|instant|as you type/i],
  ["mobile",      /mobile|android|ios|phone|touchpress|appium/i],
  ["orchestrate", /batch|workflow|pipeline|parallel|swarm|multi-?agent|at scale|\d{3,}|thousand|million/i],
  ["guardrail",   /guardrail|safety|risk|gate|block|moderation|fraud|injection|reward-?hacking|destructive|security/i],
  ["textgen",     /generat|writing|compose|draft|roast|feedback|brief|summar/i],
];

// ---------- CURATED OVERRIDES (judgment beats regex) ----------
const OVERRIDES = {
  "2101006585481073093": { category: "food",      pattern: "batch-scorer", flagship: true },   // 3,000 kids snacks
  "2100483914...":       {},
  "2101063804...":       {},
};
const OVERRIDE_BY_TITLE = {
  "Scoring 3,000 kids’ snacks":            { category: "food",      pattern: "batch-scorer", flagship: true },
  "Sorting 63,000 emails":                 { category: "comms",     pattern: "batch-scorer", flagship: true },
  "Classifying 500 emails in seconds":     { category: "comms",     pattern: "batch-scorer" },
  "An inbox classifier for 1,500 emails":  { category: "comms",     pattern: "batch-scorer" },
  "TC39 Atlas":                            { category: "research",  pattern: "batch-scorer", flagship: true },
  "A faster browser agent":                { category: "agentinfra",pattern: "browser-agent", flagship: true },
  "rtrvr.ai with Jev":                     { category: "agentinfra",pattern: "browser-agent", flagship: true },
  "Stagehand browser control with Jev":    { category: "agentinfra",pattern: "browser-agent", flagship: true },
  "Find in page by meaning":               { category: "desktop",   pattern: "semantic-search", flagship: true },
  "JevForm":                               { category: "backoffice",pattern: "adaptive-ui", flagship: true },
  "pkg-gate":                              { category: "security",  pattern: "router-gate", flagship: true },
  "traffic-guard":                         { category: "security",  pattern: "router-gate", flagship: true },
  "Jev Search":                            { category: "research",  pattern: "semantic-search", flagship: true },
  "An ad blocker with judgment":           { category: "social",    pattern: "feed-filter", flagship: true },
  "A job crawler that matches your profile":{ category: "hiring",   pattern: "browser-agent", flagship: true },
  "Real-time voice control for a browser": { category: "agentinfra",pattern: "voice-intent", flagship: true },
  "Drive-through menu ordering":           { category: "food",      pattern: "voice-intent", flagship: true },
  "Spreadsheets that read intent":         { category: "backoffice",pattern: "adaptive-ui", flagship: true },
  "Finding viral content in 11 million videos": { category: "marketing", pattern: "batch-scorer", flagship: true },
  "EasyFinder intent-based product filters":{ category: "commerce", pattern: "semantic-search", flagship: true },
  "Hipershopping with Agentcard":          { category: "commerce",  pattern: "browser-agent" },
  "Ego Lite shopping decisions":           { category: "commerce",  pattern: "browser-agent" },
  "On-demand UI flow capture":             { category: "creative",  pattern: "browser-agent", flagship: true },
  "Search your inbox by intent":           { category: "comms",     pattern: "semantic-search" },
  "Recipe scoring on five dimensions":     { category: "food",      pattern: "batch-scorer" },
  "Instant calorie tracking":              { category: "food",      pattern: "batch-scorer" },
  "Tax document classification":           { category: "backoffice",pattern: "batch-scorer" },
  "Peakflo invoice coding":                { category: "backoffice",pattern: "batch-scorer" },
  "Filling messy PDF forms":               { category: "backoffice",pattern: "adaptive-ui" },
  "A page-by-page OCR router":             { category: "backoffice",pattern: "router-gate" },
  "Search a physical library":             { category: "research",  pattern: "semantic-search" },
  "Instant team scheduling with Cal.com":  { category: "comms",     pattern: "adaptive-ui" },
  "Job and candidate matching":            { category: "hiring",    pattern: "semantic-search" },
  "YouWare résumé screener":               { category: "hiring",    pattern: "batch-scorer" },
  "Jevsume resume feedback":               { category: "hiring",    pattern: "batch-scorer" },
  "A healthcare intake workflow prototype":{ category: "health",    pattern: "adaptive-ui" },
  "Live clinical-transcript classification prototype": { category: "health", pattern: "batch-scorer" },
  "FlightWifi checks aircraft connectivity": { category: "travel",  pattern: "batch-scorer" },
  "Emergency routing simulation":          { category: "travel",    pattern: "control-loop" },
  "Focus Rail train routing":              { category: "games",     pattern: "control-loop" },
};

// impact weight per category: how much a real product in this field is worth building
const CATEGORY_IMPACT = {
  commerce: 5, food: 5, travel: 5, education: 5, hiring: 5, health: 5,
  comms: 4, backoffice: 4, security: 4, devtools: 4, agentinfra: 4, finance: 4,
  marketing: 3, research: 3, social: 3, desktop: 3, robotics: 3, creative: 2, games: 2,
};

function firstMatch(rules, hay, fallback) {
  for (const [key, re] of rules) if (re.test(hay)) return key;
  return fallback;
}

function detectCaps(hay, pattern) {
  const caps = new Set(["classify"]); // every evidence project uses typed classification
  for (const [key, re] of CAP_RULES) if (re.test(hay)) caps.add(key);
  // pattern implies capabilities the text may not mention
  const implied = {
    "browser-agent": ["browser", "domsnapshot", "textgen"],
    "voice-intent": ["voicein", "realtime"],
    "feed-filter": ["browser", "realtime"],
    "batch-scorer": ["fetch", "store", "orchestrate"],
    "semantic-search": ["search"],
    "adaptive-ui": ["realtime"],
    "ci-gate": ["guardrail"],
    "router-gate": ["guardrail"],
    "control-loop": ["realtime"],
    "context-manager": ["store"],
  }[pattern] || [];
  for (const c of implied) caps.add(c);
  return [...caps];
}

function scaleSignal(text) {
  const m = text.match(/([\d,]{3,})\s*(snack|email|proposal|video|object|question|people|agent|item|row|term)/i);
  if (m) return parseInt(m[1].replace(/,/g, ""), 10);
  return 0;
}

const posts = JSON.parse(fs.readFileSync(path.join(DIR, "corpus.json"), "utf8"));
const rows = posts.map((p) => {
  const hay = `${p.title} ${p.description} ${(p.tags || []).join(" ")} ${p.category}`;
  const ov = OVERRIDE_BY_TITLE[p.title] || {};
  const category = ov.category || firstMatch(CATEGORY_RULES, hay, "devtools");
  const pattern = ov.pattern || firstMatch(PATTERN_RULES, hay, "batch-scorer");
  const caps = detectCaps(hay, pattern);
  const scale = scaleSignal(`${p.title} ${p.description}`);
  const openSource = /open.?source/i.test(hay);

  let impact = CATEGORY_IMPACT[category] ?? 3;
  if (scale >= 1000) impact = Math.min(5, impact + 1);
  if (openSource) impact = Math.min(5, impact + 1);
  if (category === "games" && !/benchmark/i.test(hay)) impact = Math.max(1, impact - 1);

  let effort = PATTERNS[pattern]?.difficulty ?? 3;
  effort = Math.min(5, effort + (caps.length >= 7 ? 1 : 0));

  return {
    id: p.id,
    title: p.title,
    author: p.author,
    handle: p.handle,
    url: p.url,
    date: p.date,
    blurb: (p.description || "").replace(/\s+/g, " ").slice(0, 260),
    gallery_category: p.category,
    category,
    pattern,
    capabilities: caps,
    scale,
    open_source: openSource,
    flagship: !!ov.flagship,
    impact,
    effort,
    start_here: impact >= 4 && effort <= 2,
    media: (p.media || []).length ? p.media[0].poster || p.media[0].src : null,
  };
});

fs.writeFileSync(path.join(DIR, "evidence.json"), JSON.stringify(rows, null, 1));

const tally = (k) => {
  const c = {};
  for (const r of rows) { const v = Array.isArray(r[k]) ? r[k] : [r[k]]; for (const x of v) c[x] = (c[x] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
console.log("ROWS:", rows.length);
console.log("\n=== CATEGORY (core axis) ===");
for (const [k, v] of tally("category")) console.log(String(v).padStart(4), k.padEnd(12), FIELDS[k]?.label ?? "??");
console.log("\n=== BUILD PATTERN ===");
for (const [k, v] of tally("pattern")) console.log(String(v).padStart(4), k);
console.log("\n=== CAPABILITY FREQUENCY ===");
for (const [k, v] of tally("capabilities")) console.log(String(v).padStart(4), k);
console.log("\nflagships:", rows.filter(r => r.flagship).length,
            "| start-here:", rows.filter(r => r.start_here).length,
            "| open-source:", rows.filter(r => r.open_source).length,
            "| avg caps/project:", (rows.reduce((a, r) => a + r.capabilities.length, 0) / rows.length).toFixed(1));
