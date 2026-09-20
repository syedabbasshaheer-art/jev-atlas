// Taxonomy for the Jev Discovery catalog.
// FIELD = the real-world domain a builder searches by.
// PATTERN = the build recipe. 359 projects collapse into these.

export const FIELDS = {
  commerce:    { label: "Commerce & Shopping",   blurb: "Product search, catalogues, buying agents, price/spec comparison." },
  food:        { label: "Food & Nutrition",      blurb: "Menus, recipes, ordering, label and ingredient scoring." },
  travel:      { label: "Travel & Mobility",     blurb: "Flights, hotels, routing, transport decisions." },
  education:   { label: "Education & Learning",  blurb: "Curriculum content, tutoring, grading, study material at scale." },
  hiring:      { label: "Hiring & Careers",      blurb: "Resumes, job matching, screening, outreach." },
  comms:       { label: "Email, Chat & Support", blurb: "Inbox triage, ticket routing, moderation, intake." },
  social:      { label: "Social & Feeds",        blurb: "Timeline filtering, comment triage, slop detection." },
  marketing:   { label: "Marketing, SEO & Ads",  blurb: "Content research, ad analysis, lead scoring, outreach." },
  devtools:    { label: "Software Engineering",  blurb: "Code review, linting, testing, PR gates, query planning." },
  agentinfra:  { label: "Agent Infrastructure",  blurb: "Model routing, context compaction, tool selection, evals, MCP." },
  security:    { label: "Security & Trust",      blurb: "Threat gates, bot detection, fraud, redaction, supply chain." },
  finance:     { label: "Finance & Markets",     blurb: "Trading signals, backtests, market news, stock research." },
  health:      { label: "Health & Clinical",     blurb: "Intake, transcripts, triage." },
  backoffice:  { label: "Documents & Back-office",blurb: "PDFs, invoices, tax, forms, OCR, spreadsheets." },
  research:    { label: "Research & Knowledge",  blurb: "Papers, libraries, datasets, taxonomy building." },
  games:       { label: "Games & Simulation",    blurb: "Game AI, NPCs, playtesting, multi-agent worlds." },
  robotics:    { label: "Robotics & Control",    blurb: "Arms, drones, driving, navigation, physical control." },
  creative:    { label: "Creative & Media",      blurb: "Music, art, video, 3D, design review." },
  desktop:     { label: "Personal Productivity", blurb: "Files, clipboard, launchers, scheduling, journaling." },
};

export const PATTERNS = {
  "batch-scorer": {
    label: "Bulk Scorer",
    one_liner: "N items in, a typed judgment on each, ranked or filtered out.",
    shape: "source -> normalise -> fan-out typed calls -> store -> browse",
    why_jev: "Cost and latency scale linearly with N. At 3,000+ items an LLM is unaffordable; a typed call at ~$0.042/M input is not.",
    difficulty: 2,
    exemplars: ["Scoring 3,000 kids' snacks", "Sorting 63,000 emails", "TC39 Atlas"],
  },
  "feed-filter": {
    label: "Live Feed Filter",
    one_liner: "Classify DOM nodes as they appear and hide, tag or recolour them.",
    shape: "MutationObserver -> extract node text -> typed call -> mutate DOM",
    why_jev: "Must decide in the gap before the user scrolls past. ~100ms works, 2s does not.",
    difficulty: 2,
    exemplars: ["An ad blocker with judgment", "Detecting slop in the X timeline"],
  },
  "browser-agent": {
    label: "Browser / Computer Agent",
    one_liner: "Indexed DOM snapshot in, one typed action out, loop until done.",
    shape: "snapshot -> index elements -> single typed call -> execute -> repeat",
    why_jev: "Replaces a screenshot+reasoning round-trip per step. Measured 1,092 -> 101 protocol calls.",
    difficulty: 4,
    exemplars: ["A faster browser agent", "Stagehand browser control with Jev"],
  },
  "router-gate": {
    label: "Router / Gate",
    one_liner: "Middleware that picks a branch, or blocks a risky one, before work happens.",
    shape: "intercept -> typed call -> dispatch | block | escalate",
    why_jev: "It sits on the hot path of every request, so it must be near-free and never the bottleneck.",
    difficulty: 1,
    exemplars: ["pkg-gate", "jev-router", "traffic-guard"],
  },
  "control-loop": {
    label: "Real-time Control Loop",
    one_liner: "Game or physical state in, next move out, at frame rate.",
    shape: "sense state -> serialise -> typed move choice -> actuate -> repeat",
    why_jev: "A frame budget is ~16ms-100ms. Only a typed decision fits.",
    difficulty: 3,
    exemplars: ["Tetris with typed landing choices", "Zero-shot robotic arm control"],
  },
  "semantic-search": {
    label: "Semantic Search & Rank",
    one_liner: "Score every candidate against what the user meant, then order them.",
    shape: "candidates -> typed relevance score each -> sort -> present",
    why_jev: "Scoring every candidate individually is only affordable when each score is ~free.",
    difficulty: 2,
    exemplars: ["Find in page by meaning", "Jev Search"],
  },
  "adaptive-ui": {
    label: "Adaptive Interface",
    one_liner: "A typed decision chooses what the UI shows or asks next.",
    shape: "user input -> typed call -> pick next component/field/format -> render",
    why_jev: "It runs between keystrokes, so the decision has to beat the user's typing.",
    difficulty: 3,
    exemplars: ["JevForm", "Typeahead UI", "Spreadsheets that read intent"],
  },
  "voice-intent": {
    label: "Voice & Intent Dispatch",
    one_liner: "Speech in, a typed intent out, a function call executed.",
    shape: "mic -> VAD -> STT -> typed intent + slots -> dispatch -> TTS",
    why_jev: "Voice feels broken past ~300ms round-trip; the decision stage must cost ~100ms.",
    difficulty: 4,
    exemplars: ["Real-time voice control for a browser", "An assistant without a wake word"],
  },
  "ci-gate": {
    label: "Pipeline Quality Gate",
    one_liner: "An artifact meets N typed checks and passes or fails with a reason.",
    shape: "diff/doc -> N parallel typed checks -> aggregate -> pass | fail",
    why_jev: "All N checks ride in one call, so adding a check is nearly free.",
    difficulty: 1,
    exemplars: ["Fourteen checks for every pull request", "jev-codes"],
  },
  "context-manager": {
    label: "Agent Context Manager",
    one_liner: "Score what an agent is carrying and drop what is not earning its place.",
    shape: "context items -> relevance score each -> prune -> resume",
    why_jev: "Pruning must cost far less than the tokens it saves, or it is pointless.",
    difficulty: 2,
    exemplars: ["Claude Code context compaction", "Tool-prune", "jev-pruner"],
  },
};

// FAMILIES — 6 groups over the 19 categories.
// Fixed order, ascending by how crowded the field is: slot 1 is the emptiest.
// Order is load-bearing (it encodes the finding) AND required by the palette,
// which passes the adjacent-pair CVD gate only in a fixed order.
export const FAMILIES = [
  { key:"people",   label:"People & Care",       light:"#2a78d6", dark:"#3987e5", cats:["education","health","hiring"],
    note:"The emptiest fields, and the ones with a person at the other end." },
  { key:"everyday", label:"Everyday & Commerce", light:"#eb6834", dark:"#d95926", cats:["commerce","food","travel","desktop"],
    note:"Buying, eating, moving, and the small friction of a day." },
  { key:"ops",      label:"Operations & Money",  light:"#1baf7a", dark:"#199e70", cats:["backoffice","finance","research"],
    note:"Paperwork, ledgers and the reading nobody wants to do." },
  { key:"reach",    label:"Communication & Reach",light:"#eda100", dark:"#c98500", cats:["comms","social","marketing"],
    note:"Everything that arrives in a feed or an inbox." },
  { key:"eng",      label:"Engineering",          light:"#e87ba4", dark:"#d55181", cats:["devtools","agentinfra","security"],
    note:"Builders building for builders. Heavily served already." },
  { key:"motion",   label:"Making & Motion",      light:"#008300", dark:"#008300", cats:["games","creative","robotics"],
    note:"Games, art and things that move. The most crowded field by far." },
];
export const FAMILY_OF = FAMILIES.reduce((m,f)=>{ f.cats.forEach(c=>m[c]=f.key); return m; },{});
