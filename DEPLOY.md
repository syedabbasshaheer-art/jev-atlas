# Deploying — Vercel, then Cloudflare

Follows `~/.claude/deploy-kit/DEPLOY.md`, the machine-wide ship doctrine. Where a rule below looks fussy, it is because it was paid for once already on `ncertshorts.com`. Laws are cited so a disagreement can be settled against that file rather than argued.

One sitting, about 40 minutes. **YOU** marks a step needing an account or a payment.

Repo: `D:\10. Apps\jev-atlas` · https://github.com/syedabbasshaheer-art/jev-atlas

---

## Before anything — the ship checklist

| # | Check | State here |
|---|---|---|
| 1 | Which of registrar / DNS / host? (LAW 0) | All three will be touched. They are **not the same thing** and each step below says which |
| 2 | Is the release path `git push`? (LAW 2) | **Yes, and only that.** See the warning under step 1 |
| 3 | Any secret carrying a client prefix? (LAW 3) | **None. There are no secrets at all** — no API key, no database, no function |
| 4 | CAA clean, proxy grey? (DNS 1, 3) | Step 3 |
| 5 | **noindex until launch** | Step 2. Deploying and launching are different events |
| 6 | Money MCP tools denied? (LAW 1) | **Do this first.** See below |
| 7 | Spend cap, and does the plan match use? (COST 1) | Step 5 |
| 8 | Errors written durably at the source? (COST 2) | Not applicable — nothing runs |
| 9 | Bulk upload verified from the outside? (LAW 4) | Step 6. **1,201 images is a bulk upload** |
| 10 | Auto-renew, WHOIS privacy, DNSSEC | Step 2 |

### Do this before touching Vercel — **YOU**, 2 minutes

The Vercel MCP plugin is connected in this session. **Ten of its tools spend money or take a site down** — `buy_pro`, `buy_credits` ($1–$1,000), `buy_domain`, `buy_addon`, `pause_project` and the deploy tools. The plugin's own config still calls itself read-only. It is not.

Deny them in settings now, while they are still unreachable. One consent click later turns all ten callable at once.

---

## 1 · Vercel — **YOU**, 10 minutes

Dashboard, not CLI.

1. **vercel.com → Add New → Project**
2. **Import** `syedabbasshaheer-art/jev-atlas`
3. Accept every default. Vercel reads `vercel.json`; leave the framework preset alone, it is deliberately `null`
4. **Deploy**

The log should print `BUILD OK`, `DOCS OK`, `RENDER OK`. If Node is too old: **Settings → General → Node.js Version → 20.x**.

> **Do not run `vercel --prod` or `vercel deploy`.** They upload the working folder rather than building from git, and that path died at Vercel's 15,000-file limit once already, costing 22 unpushed commits while the wrong thing was debugged. Release is `git push`. (LAW 2)
>
> **Do not run `vercel curl` or `vercel httpstat`** to test the URL. Both **mint a Deployment Protection bypass secret on first use**, as a build-visible env var, and can fail at their stated job while still writing the credential. Use plain `curl`. (LAW 1)

Confirm afterwards in **Deployments → the deployment → Source** that it reads `git` with a SHA. Answer "how does this deploy?" from that record, never from the page rendering. (LAW 2)

---

## 2 · Domain — **YOU**, 8 minutes

**Check availability by RDAP, not a registrar search box** — a search box is a sales funnel and prices unowned names as "premium". (DNS 4)

```bash
curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" https://rdap.org/domain/jevatlas.com
# 404 = free · 200 = taken
```

Buy at **Cloudflare Registrar** — at cost, no renewal markup, and the same dashboard as `ncertshorts.com`.

Turn on all three: **auto-renew · WHOIS privacy · DNSSEC**. (Checklist 10)

### And set noindex before the domain resolves

Deploying is not launching. Until you want it found, the site should not be indexed — one switch, reverted deliberately at launch. Say the word and I will add the meta tag and a `robots.txt`; it is a two-line change and belongs in the repo, not the dashboard. (Checklist 5)

---

## 3 · Point the domain at Vercel — **YOU**, 12 minutes

Add it in Vercel **first**, so Vercel reveals the record it wants.

1. **Vercel → Project → Settings → Domains → Add** the apex
2. Take the **CNAME** it recommends, not the legacy `76.76.21.21`
3. **Cloudflare → DNS**

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `@` | what Vercel gave | **DNS only — grey** |
| CNAME | `www` | the same value | **DNS only — grey** |

4. In Vercel, add `www` and set it to redirect to the apex. **A 308, permanent and method-preserving — never a 307.** (DNS 5)
5. **Cloudflare → SSL/TLS → Full (strict)**

### Three things that cost real time, in order of nastiness

**Read the CAA records immediately.** (DNS 1) An imported zone can inherit CAA rows that **fail closed and block certificate issuance with no error anywhere** — the symptom is a dead TLS handshake while the dashboard says Active. On `ncertshorts.com` deleting three stale rows let the cert issue 540 seconds later. Check them, do not assume they are fine and do not blanket-keep them.

```bash
dig CAA jevatlas.com +short @1.1.1.1
```

**Grey cloud, not orange.** (DNS 3) Orange puts Cloudflare in front of Vercel, which loses visitor IPs, degrades Vercel's analytics and can break certificate issuance. Orange belongs only where Cloudflare must terminate, such as an R2 custom domain.

**Delete any wildcard `*` A record** Cloudflare imports. It answers for names that never existed, so it silently shadows anything added later — and deleting one strands cached answers for hours. (LAW 5)

---

## 4 · Verify — **ME**, 8 minutes

Send me the live URL.

**The images are a bulk upload and get verified from the outside.** (LAW 4) I will walk `public/thumbs` on disk, sample keys at random, and fetch each from the public host — never read back the build's own manifest, which measures obedience rather than completeness. A verifier once reported 10,118 of 10,118 fine while 4,535 files were absent, because a glob matched one extension.

Also: every filter, the reading pane, deep links, the palette, `www` → apex as a **308**, https on both names, the page at 400px, and `Cache-Control: immutable` on `/thumbs/`.

---

## 5 · Plan and rollback — **YOU**, 5 minutes

**Hobby is personal, non-commercial only — donations included.** (COST 1) A public open-source catalogue with no revenue is within it. The day it earns anything, Pro is mandatory. That is a licence limit, not a technical one.

**There is no runtime cost to cap.** One HTML file and 1,201 images: no function, no database, no key. Nothing meters.

**But drill the rollback before you need it.** (LAW 6 #6) Push auto-promotes, so `push == production`. A rollback that has never been performed is not a rollback. Once live: push a trivial change, promote the previous deployment from the dashboard, confirm the site reverts. Five minutes, once, while nothing is wrong.

---

## 6 · After launch — **ME**

- Live URL into `README.md`, which still says "add your Vercel URL here"
- Repo description and topics: `jev`, `typesafe`, `catalogue`, `system-one`, `capabilities`
- OG meta and a social preview image
- Submit to the six `awesome-jev` lists — they cross-link each other, which is how people find this
- Remove the noindex switch, deliberately, as its own commit

---

## What I am not doing, and why

**No Cloudflare proxy.** Adds caching and DDoS protection there is no traffic to need, and complicates the first certificate. Turn it on later, on purpose.

**No Cloudflare Pages migration.** The output is static so it would work, but `vercel.json` is already correct and changing hosts to save nothing is not a launch task.

**No Git LFS for the 1,201 images.** (GITHUB 1) It is the top search result and the standard answer, and it fails silently and late: the host re-clones every build, burns the 10 GiB monthly LFS bandwidth in a few deploys, then serves pointer text files where images should be, with nothing in the logs. The images are 10 MB of ordinary files, far under the 100 MiB per-file and 2 GiB per-push limits.

**No post-deploy smoke test yet.** (LAW 6 #8) One that runs by memory does not run. If we want it, it must be triggered by the deploy itself, and that is a task after the first one succeeds — not a reason to delay it.

---

## Open, carried from the doctrine

| # | Question | Bites here |
|---|---|---|
| 6 | **No uptime or certificate-expiry monitoring exists anywhere in this stack** | A silent renewal failure on a 3-month cert is a dead site with no notice |
| 7 | Server-side branch protection was never configured | Any push from a machine without local hooks |
| 3 | Whether rollback on a free plan reaches past the previous deployment | The first bad release. Step 5's drill answers it cheaply |
