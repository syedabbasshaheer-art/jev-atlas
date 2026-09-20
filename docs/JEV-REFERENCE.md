# Jev reference

What the model is, what it costs, and what actually limits it.

Every figure here is marked **verified** (read from the cited page on 20 September 2026), **reported** (from a repo or write-up, not the vendor), or **derived** (arithmetic on a verified number, stated as such). Nothing is estimated and presented as measured.

---

## What it is

Jev is TypeSafe's hosted "System One" model. It takes a **state** and a set of **typed questions**, and returns **typed answers with probabilities**. It does not generate text. It cannot emit a single character of free-form output.

That last part is the whole design. A model that can only pick from a menu the code wrote is a model whose output is always valid, always parseable, and never needs a retry for malformed JSON.

### The three primitives

| Primitive | Ask it | Give it | Get back |
|---|---|---|---|
| **Noul** | A yes/no proposition | `instructions`, optionally `criteria: {true, false}` | `noul` — a probability 0–1 |
| **Choice** | Pick one of N | `instructions`, `criteria: {option: description}` | `choice`, `probabilities{}`, `confidence` |
| **Score** | Rate on a rubric | `instructions`, `criteria: [ordered levels]` | `score` (fractional), `probabilities{}`, `confidence`, `legend{}` |

---

## The API surface

```jsonc
// POST https://api.typesafe.ai/v1/systemone
// Authorization: Bearer <API_KEY>
{
  "model": "jev-latest",
  "state": "…the thing being judged. String, object or array…",
  "questions": {
    "is_urgent": {
      "type": "noul",
      "instructions": "Does the ticket explicitly communicate time pressure?"
    },
    "intent": {
      "type": "choice",
      "instructions": "What is the customer's main request?",
      "criteria": {
        "refund":         "The customer wants money returned.",
        "technical_help": "The customer needs a bug or integration fixed.",
        "other":          "None of the other options clearly fits."
      }
    },
    "severity": {
      "type": "score",
      "instructions": "How severe is the customer-facing impact?",
      "criteria": [
        "Minor inconvenience; workaround available",
        "Material degradation; some users affected",
        "Critical outage; core workflow blocked"
      ]
    }
  }
}
```

```jsonc
{
  "model": "jev-1.13.0",
  "answers": {
    "is_urgent": { "type": "noul", "noul": 0.999 },
    "intent":    { "type": "choice", "choice": "refund",
                   "confidence": 0.95,
                   "probabilities": { "refund": 0.95, "technical_help": 0.03, "other": 0.02 } },
    "severity":  { "type": "score", "score": 1.43, "confidence": 0.35,
                   "probabilities": { "0": 0.0, "1": 0.57, "2": 0.43 },
                   "legend": { "0": "Minor…", "1": "Material…", "2": "Critical…" } }
  },
  "usage": { "input_tokens": 296, "output_tokens": 20 }
}
```

**Confidence is not the top probability.** It measures how concentrated the distribution is. For a three-option Choice it is `(3 × top_probability − 1) / 2`. Do not conflate the two when setting an action threshold. *(reported — from docs.typesafe.ai/confidence, not re-fetched here)*

---

## The limits that actually shape a design

| Property | Value | Status |
|---|---|---|
| Input price | **$0.042 per million tokens** | verified, docs.typesafe.ai/models |
| Output price | **Free** | verified |
| Requests per minute | **1,200** | verified |
| Tokens per second | **250,000** | verified |
| Budget per request | **64k tokens** | verified |
| State budget | **32k tokens**, plus the longest question | verified |
| Latency | 70–500 ms claimed, ~100 ms described as typical | verified |
| p50 / p99 | **None published** | verified absent |
| Batch endpoint | **Not documented** | verified absent |
| Choice option cap | 255 | **reported** — appears in harness code, absent from the vendor's model page |
| Score levels | 2–10 | **reported**, same caveat |

### The rate limit is the constraint, not the price

The intuition about a cheap model is that cost is what bounds you. For bulk scoring — the single commonest pattern, 102 of the 359 projects — it is not.

Judging 63,000 items at a few hundred input tokens each is a rounding error at $0.042 a million.

But with no documented batch endpoint, scoring N items means **N client-side requests**. At 1,200 a minute that is about **20 items a second**, which puts a **floor near 52 minutes** on a 63,000-item backfill regardless of budget or per-call speed. *(derived — arithmetic on the verified 1,200/min, not a TypeSafe figure)*

**So the lever is fewer calls, not cheaper ones.** Multiple questions in one request are evaluated together, and the vendor's guidance is that adding questions has little effect on response time. Ten checks on one email is one request, not ten. The 64k budget, of which 32k is state, is what eventually caps how many ride along.

### It is text-only

Images, audio and binaries must become text or structured fields **before** the call. In practice OCR or a vision model runs first, and its output is what Jev judges. In several of the catalogued projects that upstream step is the hard part and the typed call is the easy half.

---

## Question design

Rules stated in the community pattern collections, and visible in the question objects that shipped:

**Choice** — options are mutually exclusive, each gets a plain-language criterion sentence, and there is **always a residual `other`**. Without it the model is forced to mis-file anything unanticipated into a real bucket.

**Score** — `criteria` is an **ordered list of described levels**, not a bare 1–5 scale. The model anchors on the description. "Critical outage; core workflow blocked" produces a usable score; "5" does not.

**Noul** — one proposition, phrased as a factual question, **never compound**. "Is this urgent and from a paying customer?" is two questions and the probability it returns means nothing.

**Atomic over compound.** One narrow question per judgment rather than one large prompt, because each then carries its own confidence number you can gate on separately.

### Patterns worth knowing

| Pattern | What it is |
|---|---|
| **Speculative fan-out** | Ask every question you *might* need in one call and discard the unused answers. One round trip instead of a branch-then-ask |
| **Confidence-gated routing** | Treat the answer and its confidence as separate axes. Below threshold goes to a human, not to a default |
| **Composite scoring** | Normalise several Score outputs and combine with explicit weights |
| **Two-stage dependency** | Fire a second call only when the first answer changes what matters |
| **Risk gate** | Classify read-only / reversible / irreversible in the *same* call as the action. It costs almost nothing and it is the difference between a demo and a product |

**Fit thresholds on labelled data.** A confidence cutoff guessed at is a cutoff that will be wrong. Tools exist for fitting one against held-out labels; the point is that it is a measurement, not a preference.

---

## Economics, including the counter-fact

A typed call is cheap and fast. It does not follow that a system built on one is cheaper.

rtrvr.ai published a benchmark from switching their browser agent to Jev:

| Task | Latency before | after | Cost before | after |
|---|---|---|---|---|
| LinkedIn | 95.5 s | 65.8 s (−31%) | $0.02398 | $0.03308 (**+38%**) |
| Amazon | 178.7 s | 101.9 s (−43%) | $0.03298 | $0.04978 (**+51%**) |

Faster on both. More expensive on both. *(reported — rtrvr.ai's published figures, not reproduced)*

The typed call does not remove the other models from the loop. Something still has to write the strings, because Jev cannot, and the extra round trips plus the text model land on the bill.

**Jev is an instrument for latency.** It is often cheaper too. Those are two separate claims and the second does not follow from the first.

---

## Self-hostable alternatives

Useful if the hosted dependency is unacceptable, and useful as a reminder that the *capability* outlives the vendor.

| Project | Approach | Trade-off |
|---|---|---|
| [kev](https://github.com/jaredpalmer/kev) | Qwen 0.5–8B, single-pass, pointer head over options | Runs on a laptop; trails on out-of-distribution input |
| [SemIf](https://github.com/TheoLeeCJ/SemIf) | Logit readout, zero output tokens, WebGPU demo | Very fast; somewhat lower agreement |
| [openjev-sglang](https://github.com/ekzhang/openjev-sglang) | Prefill-only on SGLang, radix cache | Needs a serious GPU |
| [reflex](https://github.com/kshetrajna12/reflex) | Cached forward pass, parallel branches, temperature calibration | API-compatible server mode; smaller community |

*(reported — star counts and claims from repo READMEs, not independently benchmarked)*

---

## The browser action space

Deliberately not duplicated here. It is taken apart layer by layer — element table, validation, freshness guard, the text side-channel — in the engineering note this repo grew out of. The short version:

The harness builds a numbered menu of what is on the page. Jev returns an index plus a distribution. The harness validates that the index was on the menu and that the probabilities sum to 1, then executes. Operations are `CLICK`, `TYPE_TEXT`, `SELECT`, `SCROLL_UP`, `SCROLL_DOWN`, `WAIT`, `DONE`, `BLOCKED`.

Because Choice caps out and long pages blow past it, every real harness **pre-filters candidates** before the model sees them — one cut 591 elements to 82.

Text comes from a separate small model, wired alongside, because Jev structurally cannot produce it.
