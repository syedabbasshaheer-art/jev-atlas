# Harvesting projects from the whole internet

How the catalogue finds projects that nobody submitted to a gallery.

Everything below was probed on 20 September 2026 before it was designed. Where a source is marked blocked, that is a measured HTTP response, not an assumption.

---

## What was measured

| Source | Auth | Result | Evidence |
|---|---|---|---|
| **GitHub** repo search | none (token optional) | **works** | 644 relevant repos returned |
| **HN Algolia** | none | **works** | 133 raw → 27 relevant |
| **dev.to** | none | **works** | 24 articles on the `jev` tag |
| **npm registry** | none | **works** | 32 packages with repo links |
| **jevable** | none | **works** | embedded `board-data` JSON, 359 posts |
| **x.com oembed** | none | **works, text + links** | full post text for any public URL |
| **t.co** | none | **works** | `HEAD` returns the real destination |
| x.com direct fetch | — | **402 Payment Required** | plain `curl` |
| x.com via text proxy | — | **403** | jina.ai, abuse block |
| x.com search / timeline | paid | not attempted | official API only |
| Reddit JSON | **OAuth** | **blocked** | returns HTML, not JSON |
| Bluesky public API | none | **403 here** | possibly local egress, worth retrying |

Result of the first full sweep: **1,539 raw → 1,379 relevant → 1,084 unique**, against the 359 the gallery alone provides.

---

## The finding that mattered

x.com cannot be crawled. It returns 402 to an anonymous fetch and 403 through a proxy, and the search API costs money.

But **oembed is open**. `publish.twitter.com/oembed?url=<post>` returns the full text of any single public post with no key at all, and the links inside it. Those links are `t.co` shorteners, and a single `HEAD` request resolves each one, because the redirect *is* the response.

So the chain runs:

```
jevable board-data   →  post URL
   ↓  oembed         →  full text (327 chars avg, vs the gallery's 280 cap)
   ↓  t.co HEAD      →  the real destination
```

and it recovers exactly what the gallery strips. From eight posts it produced `askjev.ai`, `hemanth.github.io/traffic-guard`, `h3manth.com/fun/tc39-atlas` and `github.com/kushwho/jev-codes` — live demos and repositories that were invisible before.

**The distinction that makes this work: oembed is enrichment, not discovery.** It answers "tell me about this post I already know about". It cannot answer "which posts exist". Discovery still has to come from somewhere else, and for X that somewhere is the gallery, which is itself a curated X crawler. The expensive capability was already being provided by someone else for free.

---

## Why no browser automation

The obvious design is a browser agent logging into each site. It was rejected, and [browser-control](../../web/docs/Browser%20Agents/browser-control.md) is why: that note grades five control architectures and routes anything unattended to category 2, a scripted local browser, because categories 1 and 5 need an interactive session and category 3 does not exist here.

But category 2 is still a browser, and every source that matters turned out to have a JSON endpoint. A browser would add a Chrome process, a headless runtime, selector maintenance and a much larger failure surface, in exchange for data already available over HTTP.

**The ladder, cheapest first. Stop at the first rung that works:**

| Rung | Method | Cost | Used for |
|---|---|---|---|
| 1 | Official JSON API | free, stable | GitHub, HN, dev.to, npm |
| 2 | Embedded JSON in server-rendered HTML | free, one regex | jevable |
| 3 | Public oembed / metadata endpoint | free, per item | x.com posts |
| 4 | Parse rendered HTML | brittle | none yet |
| 5 | Scripted local browser | a Chrome process | none yet |
| 6 | Logged-in browser session | credentials, ToS risk | **not used** |
| 7 | Paid API | money | not used |

Nothing needed rung 4 or beyond. That is the point of probing first: the plan got smaller as the evidence came in.

---

## Architecture

```
src/harvest/
  sources.mjs     one function per source: (query, opts) -> [RawItem]
  run.mjs         sweep -> relevance -> dedupe -> enrich -> merge
```

Adding a source is adding a function. Each returns the same `RawItem` shape, so nothing downstream changes.

### Relevance

"Jev" is a Dutch given name and a surname, and "typesafe" is ordinary Java and Scala vocabulary. Both make noise. The filter requires the word `jev`, or `typesafe` bound to `ai`/`jev`, or the model class name.

It is doing real work: HN went 133 → 41 on relevance alone, dropping 92 posts about people called Jev.

It also produced a useful correction. `QuantDinger`, an AI trading OS, looked like a false positive by its name and is not: its description says "with Jev System One integration". The filter was right and the reviewer was wrong, which is the argument for keeping the rule mechanical and auditable rather than trusting a glance.

### Dedupe, and why it is the valuable part

Two passes: canonical URL first, then `handle + slugified title`.

The second pass is what turns five lists into one catalogue. `vibecheck` and `jevals` each appear as an X post on jevable *and* as a GitHub repo. They are one project. Dedupe keeps the richer record, and writes the other origin into `also`, so the catalogue knows a project was corroborated in two places.

That is the difference between an aggregator and a catalogue. An aggregator would show both rows.

**Known limitation:** `also` currently records same-source duplicates too, so "found on more than one source" is overcounted at 250. It needs to compare source names before recording. Small, real, not yet fixed.

### Merge is additive, always

`--merge` never writes to `corpus.json`. It writes `corpus-additions.json` for review.

This is deliberate. The corpus carries hand-written classifications and curated overrides, and a harvester that overwrote them would destroy the most expensive part of the repository to rebuild. Harvesting adds candidates; a person promotes them.

---

## Running it

```bash
node src/harvest/run.mjs                    # sweep everything
node src/harvest/run.mjs --only github      # one source
node src/harvest/run.mjs --enrich --limit 50  # fill in X text + resolve links
node src/harvest/run.mjs --merge            # write corpus-additions.json
```

`GITHUB_TOKEN` lifts GitHub search from 10 to 30 requests a minute. Without it the fifth query in a sweep returns 403, which is visible in the run report rather than silent.

---

## What is not solved

**Reddit.** The largest unclaimed source. `search.json` now returns HTML and the API requires a registered OAuth app. Free to create, so this is paperwork rather than a wall. Until it is done, Reddit discussion of Jev is invisible to the catalogue.

**X discovery.** Only posts that jevable already curated are reachable. A project posted on X and nowhere else, that the gallery missed, cannot be found. The honest options are the paid API, or accepting the gallery as the X frontier.

**Bluesky** returned 403 from this machine, which may be local egress rather than the API. Worth one retry before writing it off.

**YouTube, Discord, Slack.** Not attempted. YouTube needs an API key. Discord and Slack are private by design and are not a scraping target.

**Ranking.** 1,084 candidates is more than a person will review. The next real problem is not finding more, it is ordering what has been found, and that is a typed-classification job — which is what this catalogue is about in the first place.
