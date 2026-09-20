// CAPABILITY REGISTRY - provider-agnostic.
// A capability is a job to be done in a build. Jev is ONE provider of ONE capability.
// Keeping this layer abstract is what stops the repo dying when a vendor changes.

export const CAPABILITIES = {
  classify: {
    label: "Typed classification & decision",
    job: "Turn messy input into a typed answer software can branch on, with a confidence number.",
    providers: [
      { name: "TypeSafe Jev", kind: "hosted", note: "$0.042/MTok in, output free; 70-500ms; 1,200 req/min", url: "https://docs.typesafe.ai" },
      { name: "kev", kind: "self-host", note: "Qwen 0.5-8B, runs on a laptop; ~6-7pts behind out-of-distribution", url: "https://github.com/jaredpalmer/kev" },
      { name: "SemIf", kind: "self-host", note: "logit readout, zero output tokens, WebGPU demo", url: "https://github.com/TheoLeeCJ/SemIf" },
      { name: "openjev-sglang", kind: "self-host", note: "prefill-only, needs a serious GPU", url: "https://github.com/ekzhang/openjev-sglang" },
      { name: "LLM + structured output", kind: "fallback", note: "10-100x slower and dearer; fine below ~100 items", url: null }
    ],
    cost_shape: "per item, ~free",
    latency: "~100ms"
  },
  textgen: {
    label: "Text generation",
    job: "Write the strings a typed model structurally cannot emit: queries, form values, copy, code.",
    providers: [
      { name: "inception/mercury-2.5 via OpenRouter", kind: "hosted", note: "the default typing model in jev-ultrafast", url: "https://openrouter.ai" },
      { name: "Claude / GPT / Gemini", kind: "hosted", note: "when quality beats latency", url: null },
      { name: "Keyword heuristics", kind: "local", note: "the no-key fallback in jev-browser", url: null }
    ],
    cost_shape: "per token",
    latency: "200ms-2s"
  },
  browser: {
    label: "Browser automation",
    job: "Drive a real web page: click, type, select, scroll, read state.",
    providers: [
      { name: "Playwright", kind: "library", note: "headless driver, used by jev-browser", url: "https://playwright.dev" },
      { name: "Chrome DevTools Protocol", kind: "protocol", note: "jev-ultrafast connects directly", url: null },
      { name: "Stagehand", kind: "framework", note: "act/observe API, has a Jev path", url: "https://github.com/browserbase/stagehand" },
      { name: "Chrome extension APIs", kind: "in-browser", note: "the only route to a logged-in session", url: null }
    ],
    cost_shape: "compute",
    latency: "100ms-2s per action"
  },
  domsnapshot: {
    label: "Page state extraction",
    job: "Turn a live page into an indexed list of things that can be acted on.",
    providers: [
      { name: "Injected snapshot script", kind: "custom", note: "atomic capture of visible controls, as in jev-ultrafast", url: null },
      { name: "Raw DOM query", kind: "custom", note: "what jev-browser chose; the a11y tree under-reports inputs", url: null },
      { name: "Accessibility tree", kind: "builtin", note: "cleaner but misses elements, including a DuckDuckGo search box", url: null }
    ],
    cost_shape: "free",
    latency: "<50ms"
  },
  fetch: {
    label: "Fetch, scrape & ingest",
    job: "Get the raw corpus in: pages, feeds, APIs, catalogues, PDFs.",
    providers: [
      { name: "Embedded JSON blob", kind: "technique", note: "always look here first; beats rendering a page", url: null },
      { name: "HTTP + parser (cheerio / BeautifulSoup)", kind: "library", note: "cheapest path for server-rendered HTML", url: null },
      { name: "Headless browser", kind: "library", note: "only when the data is client-rendered", url: null },
      { name: "Official API or bulk export", kind: "source", note: "always preferred where it exists", url: null }
    ],
    cost_shape: "bandwidth",
    latency: "varies"
  },
  voicein: {
    label: "Voice input",
    job: "Turn speech into text, and know when the speaker has finished.",
    providers: [
      { name: "Web Speech API", kind: "browser", note: "free, zero install, cloud backed", url: null },
      { name: "whisper.cpp local", kind: "local", note: "~100ms, audio never leaves the device", url: "https://github.com/ggerganov/whisper.cpp" },
      { name: "Deepgram / realtime STT", kind: "hosted", note: "streaming partials, paid", url: null }
    ],
    cost_shape: "per minute",
    latency: "~100-300ms",
    gotcha: "Shipped Jev voice projects use a 200ms debounce plus a 600-900ms silence timer INSTEAD of a real VAD library. Cheap, and good enough."
  },
  voiceout: {
    label: "Voice output",
    job: "Speak back, or confirm a risky action out loud.",
    providers: [
      { name: "Web Speech Synthesis", kind: "browser", note: "free", url: null },
      { name: "System TTS", kind: "os", note: "macOS talk-back in the Jev Mac demos", url: null },
      { name: "ElevenLabs or hosted TTS", kind: "hosted", note: "quality, paid", url: null }
    ],
    cost_shape: "per character",
    latency: "200ms-1s",
    gotcha: "Several shipped voice demos skip TTS entirely and show a toast. Faster, and usually enough."
  },
  vision: {
    label: "Image understanding",
    job: "Read what is in a picture: a label, a garment, a screen, a document.",
    providers: [
      { name: "OCR (Tesseract or on-device Vision)", kind: "local", note: "the macOS computer-use demo uses on-device OCR", url: null },
      { name: "Vision LLM", kind: "hosted", note: "for open-ended understanding", url: null },
      { name: "CoreML segmentation", kind: "local", note: "segment UI or product regions before classifying", url: null }
    ],
    cost_shape: "per image",
    latency: "100ms-3s",
    gotcha: "Jev is text-only. Every image must become text or structured fields BEFORE the typed call."
  },
  imagegen: {
    label: "Image generation & try-on",
    job: "Render something that does not exist yet: a garment on a body, a variant, a scene.",
    providers: [
      { name: "Virtual try-on diffusion (fal / replicate)", kind: "hosted", note: "garment-on-person rendering", url: "https://fal.ai" },
      { name: "General image models", kind: "hosted", note: "Seedream, Imagen, nano-banana", url: null }
    ],
    cost_shape: "per image",
    latency: "2-30s",
    gotcha: "The slowest thing in any stack. Never put it on the critical path - precompute it or stream it in."
  },
  search: {
    label: "Search & retrieval",
    job: "Find the candidate set worth judging.",
    providers: [
      { name: "Keyword / BM25", kind: "local", note: "Stagehand shortlists candidates this way before calling Jev", url: null },
      { name: "Vector / embeddings", kind: "hosted", note: "when wording differs from meaning", url: null },
      { name: "Search API", kind: "hosted", note: "Jev Search pairs a search API with typed ranking", url: null }
    ],
    cost_shape: "per query",
    latency: "50-500ms",
    gotcha: "Retrieve wide and cheap, then judge narrow and typed. Never ask the typed model to scan everything."
  },
  store: {
    label: "Data store",
    job: "Hold the corpus, the judgments, and the provenance.",
    providers: [
      { name: "SQLite / Postgres", kind: "db", note: "judgments are rows; keep the raw input beside the verdict", url: null },
      { name: "Static JSON", kind: "file", note: "fine into the low thousands, trivially deployable", url: null },
      { name: "Object storage", kind: "hosted", note: "media and large artifacts", url: null }
    ],
    cost_shape: "per GB",
    latency: "ms"
  },
  realtime: {
    label: "Realtime transport",
    job: "Stream partial results so the interface never looks frozen.",
    providers: [
      { name: "WebSocket", kind: "protocol", note: "supported on Vercel Functions", url: null },
      { name: "SSE / streaming response", kind: "protocol", note: "works on the Node runtime, no edge needed", url: null }
    ],
    cost_shape: "connection time",
    latency: "ms"
  },
  mobile: {
    label: "Mobile & desktop control",
    job: "Drive a native app rather than a web page.",
    providers: [
      { name: "Appium / Espresso", kind: "library", note: "used in the Jev end-to-end testing projects", url: null },
      { name: "macOS Accessibility API", kind: "os", note: "how the voice-controlled Mac demos dispatch", url: null }
    ],
    cost_shape: "compute",
    latency: "200ms-2s",
    gotcha: "No Jev-specific mobile integration writeup was found in this research pass. Treat mobile as an open gap."
  },
  orchestrate: {
    label: "Orchestration & scheduling",
    job: "Run the whole thing repeatedly, in parallel, without tripping a rate limit.",
    providers: [
      { name: "Plain script + worker pool", kind: "code", note: "the honest default; cap in-flight yourself", url: null },
      { name: "Cron / durable queues", kind: "hosted", note: "scheduled and durable fan-out", url: null },
      { name: "n8n", kind: "gui", note: "a community TypeSafe node exists, unverified", url: null }
    ],
    cost_shape: "compute",
    latency: "n/a",
    gotcha: "1,200 req/min is the real ceiling. One item per request means about 20 items a second, whatever your budget says."
  },
  guardrail: {
    label: "Safety & guardrails",
    job: "Refuse to do the irreversible thing without a human.",
    providers: [
      { name: "Typed risk gate", kind: "pattern", note: "classify read-only / reversible / irreversible before acting", url: null },
      { name: "Confidence threshold", kind: "pattern", note: "fitted on labelled data, never guessed", url: null }
    ],
    cost_shape: "one extra question",
    latency: "~0",
    gotcha: "Ride the risk question along in the SAME call as the action question. It costs almost nothing and it is the difference between a demo and a product."
  }
};

export const CAP_ORDER = Object.keys(CAPABILITIES);
