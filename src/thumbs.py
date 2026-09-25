"""thumbs.py - fetch each project's poster image, shrink it, keep it locally.

Why this exists: 356 of 359 projects already carry a poster image URL, and the
catalogue was ignoring all of them. A wall of text next to a gallery of
screenshots is the whole difference between "reference document" and "product".

Two outputs, because the two targets have different rules:
  public/thumbs/<id>.jpg   files, for the Vercel deploy
  data/thumbs.json         base64 data URIs, for the published artifact,
                           whose CSP blocks every cross-origin image

Run:  python src/thumbs.py            (all, skips what it already has)
      python src/thumbs.py --limit 5  (sample, for measuring)
"""
import colorsys, hashlib, io, json, os, re, sys, time, urllib.request, urllib.error
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "public", "thumbs")
CORPUS = os.path.join(ROOT, "data", "corpus.json")
MANIFEST = os.path.join(ROOT, "data", "thumbs.json")

# Sized against the 16 MB single-page ceiling, not against taste.
WIDTH = 380
QUALITY = 62
UA = "jev-atlas/1.0 (+https://github.com/syedabbasshaheer-art/jev-atlas)"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"

# Real covers are whatever aspect ratio the source gave them; the GitHub
# opengraph card (1200x600, i.e. 2:1) is the single largest recovered group,
# so a generated monogram uses that same 2:1 frame rather than inventing a
# fourth aspect ratio for the grid to deal with.
MONO_W = WIDTH
MONO_H = WIDTH // 2
FONT_PATH = r"C:\Windows\Fonts\arialbd.ttf"

limit = None
if "--limit" in sys.argv:
    limit = int(sys.argv[sys.argv.index("--limit") + 1])

os.makedirs(OUT_DIR, exist_ok=True)
posts = json.load(open(CORPUS, encoding="utf-8"))

GH_REPO = re.compile(r"^https://github\.com/([^/]+)/([^/?#]+)/?$")


def safe_name(pid):
    """A filename Windows will accept.

    Only the 359 X posts have a bare numeric id. Everything else is prefixed by
    its source -- "github:642065600", "awesome:https://github.com/x/y" -- and a
    colon is illegal in a Windows filename, a forward slash is a directory
    separator. Writing those verbatim produced stray "hackernews" and "npm"
    entries and made os.path.exists lie, so the fetch skipped work it had never
    done. Digits pass through; anything else becomes a short stable hash.
    """
    if pid.isdigit():
        return pid
    return hashlib.sha1(pid.encode("utf-8")).hexdigest()[:16]

def poster(p):
    """Where a cover can come from, best first."""
    m = p.get("media") or []
    if m and m[0].get("poster"):
        return m[0]["poster"]
    if m and m[0].get("type") == "photo" and m[0].get("src"):
        return m[0]["src"]
    # GitHub renders a social card for every repo: owner, name, description,
    # language and stars on a branded background. Not a screenshot of the
    # project, but real, specific to the repo, and far better than a monogram.
    g = GH_REPO.match(str(p.get("url") or ""))
    if g:
        return "https://opengraph.githubassets.com/1/%s/%s" % (g.group(1), g.group(2))
    return None


WORD_RE = re.compile(r"[A-Za-z0-9]+")


def initials(title):
    """Up to 2 letters from the project title. '?' if there's nothing to take."""
    words = WORD_RE.findall(title or "")
    if not words:
        return "?"
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[1][0]).upper()


def mono_color(pid):
    """A background deterministic from the id, so re-runs never flicker.

    Hash -> hue; fixed sat/lightness tuned for a light title-caps text on top.
    """
    h = int(hashlib.sha1(pid.encode("utf-8")).hexdigest()[:8], 16)
    hue = (h % 360) / 360.0
    r, g, b = colorsys.hls_to_rgb(hue, 0.40, 0.45)
    return (round(r * 255), round(g * 255), round(b * 255))


def make_monogram(pid, title):
    """A designed fallback cover: initials on a deterministic tint, honest
    about being a placeholder rather than pretending to be a screenshot."""
    bg = mono_color(pid)
    im = Image.new("RGB", (MONO_W, MONO_H), bg)
    draw = ImageDraw.Draw(im)
    text = initials(title)
    size = round(MONO_H * 0.62)
    try:
        font = ImageFont.truetype(FONT_PATH, size)
    except OSError:
        font = ImageFont.load_default()
    box = draw.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    draw.text(
        ((MONO_W - w) / 2 - box[0], (MONO_H - h) / 2 - box[1]),
        text, font=font, fill=(255, 255, 255, 235),
    )
    return im


targets = [(str(p["id"]), poster(p)) for p in posts]
targets = [(i, u) for i, u in targets if u]
if limit:
    targets = targets[:limit]

print(f"{len(targets)} project(s) with a poster image")
got = skipped = failed = 0
total_bytes = 0

for pid, url in targets:
    dest = os.path.join(OUT_DIR, safe_name(pid) + ".jpg")
    if os.path.exists(dest):
        skipped += 1
        total_bytes += os.path.getsize(dest)
        continue
    # twimg serves sized variants; ask for the small one rather than the original
    src = url if "opengraph.githubassets" in url else url + ("&" if "?" in url else "?") + "format=jpg&name=small"
    try:
        # GitHub's opengraph endpoint throttles hard on a non-browser agent:
        # the same URL answers curl in ~150ms and stalled this script to roughly
        # one image every fifteen minutes. twimg does not care either way.
        agent = BROWSER_UA if "opengraph.githubassets" in src else UA
        req = urllib.request.Request(src, headers={"User-Agent": agent, "Accept": "image/*,*/*"})
        raw = urllib.request.urlopen(req, timeout=20).read()
        im = Image.open(io.BytesIO(raw))
        im = im.convert("RGB")
        if im.width > WIDTH:
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        got += 1
        total_bytes += os.path.getsize(dest)
    except Exception as e:
        failed += 1
        print(f"  fail {pid}: {type(e).__name__}")
    time.sleep(0.12)

print(f"\nfetched {got}, already had {skipped}, failed {failed}")
if got + skipped:
    print(f"total {total_bytes/1024/1024:.2f} MB, average {total_bytes/(got+skipped)/1024:.1f} KB")

# Designed fallback: whatever still has no cover after the real fetch above
# -- no poster URL at all, or a fetch that failed -- gets a generated
# monogram instead of a broken-image icon. Skipped under --limit so a
# sampling run stays small and predictable.
mono = 0
if not limit:
    for p in posts:
        pid = str(p["id"])
        dest = os.path.join(OUT_DIR, safe_name(pid) + ".jpg")
        if os.path.exists(dest):
            continue
        im = make_monogram(pid, p.get("title", ""))
        im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        mono += 1
    print(f"monogrammed {mono} (no fetchable image)")

# manifest of data URIs for the artifact build -- every post that now has a
# file on disk, not just the ones with a fetchable poster URL.
import base64
man = {}
for p in posts:
    pid = str(p["id"])
    dest = os.path.join(OUT_DIR, safe_name(pid) + ".jpg")
    if os.path.exists(dest):
        man[pid] = "data:image/jpeg;base64," + base64.b64encode(open(dest, "rb").read()).decode()
json.dump(man, open(MANIFEST, "w", encoding="utf-8"))
size = os.path.getsize(MANIFEST) / 1024 / 1024
print(f"data/thumbs.json: {len(man)} images, {size:.2f} MB inline")
if size > 12:
    print("  WARNING: approaching the 16 MB single-page ceiling. Lower WIDTH or QUALITY.")
