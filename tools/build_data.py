#!/usr/bin/env python3
"""Merge data/raw/*.json into the gallery dataset.

- Merges creators by id (unions links / connections).
- Dedupes works by id, then DOI, then video, unioning creator_ids.
- Verifies videos, images, DOIs (Crossref) and arXiv ids (cached in data/media_cache.json);
  drops dead media, and drops works left with no video, image or paper.
- Writes data/entries.json, data/entries.js (window.PROTO), leads, creators index, Markdown catalogs, llms.txt.

Usage: python3 tools/build_data.py [--recheck]
"""
import json
import logging
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_video import UA  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OVERRIDES = ROOT / "data" / "overrides.json"
TAXONOMY = ROOT / "data" / "taxonomy.json"
CACHE = ROOT / "data" / "media_cache.json"
COLLECTIONS = ROOT / "data" / "collections"
MEDIA = ROOT / "data" / "media"  # extra media per work, kept apart from the research batches


def _check_mp4(url: str) -> dict:
    """Direct video file: ok when it answers with a video content type (used by check_video)."""
    try:
        req = urllib.request.Request(url, headers={**UA, "Range": "bytes=0-1"})
        with urllib.request.urlopen(req, timeout=15) as r:
            ctype = r.headers.get("Content-Type", "")
            ok = r.status in (200, 206) and (ctype.startswith("video/") or ctype == "application/octet-stream")
            return {"url": url, "ok": ok, "platform": "mp4", "id": url, "content_type": ctype}
    except Exception as e:  # noqa: BLE001 - any failure means the file is not playable
        return {"url": url, "ok": False, "platform": "mp4", "id": url, "error": str(e)}


def _video(v: dict | None) -> dict:
    from check_video import parse  # noqa: PLC0415
    v = dict(v or {})
    url = v.get("url", "")
    if not url:
        return {}
    plat, vid = parse(url)
    if plat:
        v["platform"], v["id"] = plat, vid
    elif re.search(r"\.(mp4|webm|mov)(\?|$)", url) or "github.com/user-attachments/assets/" in url:
        v["platform"], v["id"] = "mp4", url
    else:
        return {}
    return v


def _doi(p: dict) -> str:
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", (p or {}).get("doi", "").strip()).lower()


def _similar(a: str, b: str) -> float:
    norm = lambda s: re.sub(r"[^a-z0-9 ]", "", (s or "").lower())  # noqa: E731
    a, b = norm(a), norm(b)
    return 1.0 if a and b and (a in b or b in a) else SequenceMatcher(None, a, b).ratio()


def load_raw() -> tuple[dict, list, list]:
    creators: dict[str, dict] = {}
    works: list[dict] = []
    leads: list[dict] = []
    for f in sorted(RAW.glob("*.json")):
        try:
            d = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            logger.error("SKIP %s: invalid JSON (%s)", f.name, e)
            continue
        batch = d.get("batch", f.stem)
        for c in d.get("creators", []):
            cid = c.get("id")
            if not cid:
                continue
            cur = creators.setdefault(cid, {"id": cid, "links": {}, "connected_to": [], "batches": []})
            for k, val in c.items():
                if k == "links":
                    cur["links"].update({lk: lv for lk, lv in (val or {}).items() if lv})
                elif k == "connected_to":
                    cur["connected_to"] = sorted(set(cur["connected_to"]) | set(val or []))
                elif val and not cur.get(k):
                    cur[k] = val
            cur["batches"] = sorted(set(cur["batches"]) | {batch})
        for w in d.get("works", []):
            works.append({**w, "video": _video(w.get("video")), "batch": batch})
        leads += [{**lead, "batch": batch} for lead in d.get("leads", [])]
    return creators, works, leads


def dedupe(works: list) -> list:
    """Same id, DOI or video = same work: keep the first, fill its empty fields and union creators / images."""
    out: list[dict] = []
    index: dict[str, dict] = {}
    for w in works:
        keys = [f"id:{w.get('id')}"]
        if _doi(w.get("paper")):
            keys.append(f"doi:{_doi(w['paper'])}")
        if w["video"].get("id"):
            keys.append(f"v:{w['video']['platform']}:{w['video']['id']}")
        # same DOI only means same work when the titles agree too: one essay can discuss several works
        cur = next((index[k] for k in keys if k in index
                    and (not k.startswith("doi:") or _similar(index[k].get("title", ""), w.get("title", "")) >= 0.9)), None)
        if cur is None:
            w["creator_ids"] = list(dict.fromkeys(w.get("creator_ids", [])))
            out.append(w)
            cur = w
        else:
            logger.info("  merge duplicate %s -> %s", w.get("id"), cur.get("id"))
            cur["creator_ids"] = list(dict.fromkeys(cur["creator_ids"] + w.get("creator_ids", [])))
            cur["images"] = list(dict.fromkeys((cur.get("images") or []) + (w.get("images") or [])))[:4]
            cur["also"] = sorted(set(cur.get("also") or []) | set(w.get("also") or []) | ({w.get("field")} - {cur.get("field"), None}))
            for k, val in w.items():
                if val and not cur.get(k):
                    cur[k] = val
        for k in keys:
            index.setdefault(k, cur)
    return out


def add_media(works: list) -> None:
    """data/media/*.json: { work_id: { "images": [...], "video": {"url": ...} } } — appended to works that lack them."""
    by_id = {w["id"]: w for w in works}
    for f in sorted(MEDIA.glob("*.json")) if MEDIA.exists() else []:
        for wid, m in json.loads(f.read_text()).items():
            w = by_id.get(wid)
            if not w:
                logger.warning("media %s: unknown work %s", f.name, wid)
                continue
            w["images"] = list(dict.fromkeys((w.get("images") or []) + (m.get("images") or [])))[:4]
            if m.get("video") and not w["video"]:
                w["video"] = _video(m["video"])


def merge_creators(creators: dict, works: list, mapping: dict) -> None:
    for src, dst in mapping.items():
        if src not in creators or dst not in creators or src == dst:
            logger.warning("merge_creators: skip %s -> %s", src, dst)
            continue
        a, b = creators.pop(src), creators[dst]
        for k, v in a.items():
            if k == "links":
                b["links"] = {**v, **b.get("links", {})}
            elif k == "connected_to":
                b["connected_to"] = sorted(set(b.get("connected_to", [])) | set(v))
            elif v and not b.get(k):
                b[k] = v
        for w in works:
            w["creator_ids"] = list(dict.fromkeys(dst if c == src else c for c in w["creator_ids"]))
        for c in creators.values():
            c["connected_to"] = [dst if x == src else x for x in c.get("connected_to", [])]
            if c.get("discovered_via") == src:
                c["discovered_via"] = dst


def verify(works: list, recheck: bool) -> dict:
    from check_media import check_arxiv, check_doi, check_image, transient  # noqa: PLC0415
    from check_video import check as check_video  # noqa: PLC0415
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    jobs: dict[str, tuple] = {}
    for w in works:
        if w["video"].get("url"):
            jobs[f"video:{w['video']['platform']}:{w['video']['id']}"] = (check_video, w["video"]["url"])
        for u in w.get("images") or []:
            jobs[f"img:{u}"] = (check_image, u)
        if _doi(w.get("paper")):
            jobs[f"doi:{_doi(w['paper'])}"] = (check_doi, _doi(w["paper"]))
        if (w.get("paper") or {}).get("arxiv"):
            jobs[f"arxiv:{w['paper']['arxiv']}"] = (check_arxiv, w["paper"]["arxiv"])
    for w in works:  # 16:9 YouTube poster without letterbox bars, when the video has one
        if w["video"].get("platform") == "youtube":
            u = f"https://i.ytimg.com/vi/{w['video']['id']}/maxresdefault.jpg"
            jobs[f"ytmax:{w['video']['id']}"] = (check_image, u)
    todo = {k: v for k, v in jobs.items() if recheck or not cache.get(k, {}).get("ok") or cache[k].get("unverified")}
    logger.info("verifying %d links (%d cached)", len(todo), len(jobs) - len(todo))

    def run(item: tuple) -> tuple[str, dict]:
        key, (fn, arg) = item
        return key, fn(arg)

    with ThreadPoolExecutor(max_workers=6) as ex:
        for i, (k, res) in enumerate(ex.map(run, todo.items()), 1):
            if transient(res):  # keep the link, do not cache the failure; re-checked next build
                res = {**res, "ok": True, "unverified": True}
                logger.warning("  unverified (transient): %s — %s", k, res.get("error"))
            cache[k] = res
            if i % 50 == 0:
                logger.info("  checked %d/%d", i, len(todo))
    CACHE.write_text(json.dumps(cache, indent=1, ensure_ascii=False))
    return cache


def apply_media(w: dict, cache: dict, problems: list) -> bool:
    """Keep only verified media. Returns False when nothing is left to show or read."""
    v = w["video"]
    if v.get("url"):
        res = cache.get(f"video:{v['platform']}:{v['id']}", {})
        if res.get("ok"):
            hd = cache.get(f"ytmax:{v['id']}", {}) if v["platform"] == "youtube" else {}
            v["thumbnail"] = v.get("thumbnail") or (hd.get("url") if hd.get("ok") and not hd.get("unverified") else "") or res.get("thumbnail") or ""
            v["embeddable"] = res.get("embeddable", True)
        else:
            problems.append({"id": w["id"], "what": "video", "url": v["url"], "error": res.get("error")})
            w["video"] = {}
    good = [u for u in w.get("images") or [] if cache.get(f"img:{u}", {}).get("ok")]
    for u in set(w.get("images") or []) - set(good):
        problems.append({"id": w["id"], "what": "image", "url": u, "error": cache.get(f"img:{u}", {}).get("error")})
    w["images"] = good
    p = dict(w.get("paper") or {})
    if _doi(p):
        res = cache.get(f"doi:{_doi(p)}", {})
        if res.get("ok"):
            p["doi"] = _doi(p)
            p["url"] = p.get("url") or f"https://doi.org/{p['doi']}"
            p["venue"] = p.get("venue") or res.get("venue", "")
            if _similar(res.get("title", ""), p.get("title") or w.get("title", "")) < 0.45:
                problems.append({"id": w["id"], "what": "doi-title", "doi": p["doi"], "crossref": res.get("title"), "title": w.get("title")})
            p["title"] = p.get("title") or res.get("title", "")
        else:
            problems.append({"id": w["id"], "what": "doi", "doi": p["doi"], "error": res.get("error")})
            if p.get("url", "").startswith("https://doi.org/"):
                p.pop("url")
            p.pop("doi")
    if p.get("arxiv"):
        res = cache.get(f"arxiv:{p['arxiv']}", {})
        if res.get("ok"):
            p["url"] = p.get("url") or res["url"]
        else:
            problems.append({"id": w["id"], "what": "arxiv", "arxiv": p["arxiv"], "error": res.get("error")})
            p.pop("arxiv")
    w["paper"] = p if p.get("url") else {}
    return bool(w["video"] or w["images"] or w["paper"])


def apply_collections(works: list, known: set) -> None:
    """Union `collections` from batches with data/collections/<id>.json (a list of work ids)."""
    by_id = {w["id"]: w for w in works}
    for f in sorted(COLLECTIONS.glob("*.json")) if COLLECTIONS.exists() else []:
        for wid in json.loads(f.read_text()):
            if wid in by_id:
                by_id[wid].setdefault("collections", []).append(f.stem)
            else:
                logger.warning("collection %s: unknown work %s", f.stem, wid)
    for w in works:
        cs = [c for c in dict.fromkeys(w.get("collections") or []) if c in known]
        if cs:
            w["collections"] = cs
        else:
            w.pop("collections", None)


def classify_leads(leads: list, creators: dict) -> tuple[list, list]:
    names = {re.sub(r"[^a-z]", "", c.get("name", "").lower()) for c in creators.values()}
    open_, checked, seen = [], [], set()
    for lead in leads:
        key = re.sub(r"[^a-z]", "", (lead.get("name") or "").lower())
        if not key or key in seen:
            continue
        seen.add(key)
        status = "covered" if key in names else lead.get("status", "open")
        (open_ if status == "open" else checked).append({**lead, "status": status})
    return open_, checked


def load_taxonomy() -> dict:
    tax = json.loads(TAXONOMY.read_text())
    for f in sorted((COLLECTIONS / "defs").glob("*.json")) if (COLLECTIONS / "defs").exists() else []:
        known = {c["id"] for c in tax["collections"]}
        tax["collections"] += [c for c in json.loads(f.read_text()) if c["id"] not in known]
    return tax


def keep_works(works: list, subs: dict, creators: dict, cache: dict) -> tuple[list, list, list]:
    kept, problems, dropped = [], [], []
    for w in works:
        if w.get("field") not in subs:
            dropped.append({"id": w.get("id"), "why": f"unknown field {w.get('field')}"})
            continue
        if w.get("sub") not in subs[w["field"]]:
            logger.warning("work %s: unknown sub %s", w["id"], w.get("sub"))
        if not apply_media(w, cache, problems):
            dropped.append({"id": w["id"], "why": "no working video, image or paper"})
            continue
        w["also"] = [a for a in w.get("also") or [] if a in subs and a != w["field"]]
        w["creator_ids"] = [c for c in w["creator_ids"] if c in creators] or w["creator_ids"]
        w.pop("batch", None)
        kept.append(w)
    return kept, problems, dropped


def write_outputs(data: dict, open_leads: list, checked_leads: list, dropped: list, problems: list) -> None:
    d = ROOT / "data"
    # guard against works silently disappearing (e.g. two batches each deleting a shared work)
    prev = {w["id"]: w.get("title", "") for w in json.loads((d / "entries.json").read_text())["works"]} if (d / "entries.json").exists() else {}
    removed = sorted(set(prev) - {w["id"] for w in data["works"]})
    if removed:
        logger.warning("works REMOVED since the last build (%d): %s", len(removed), removed[:20])
    (d / "entries.json").write_text(json.dumps(data, indent=1, ensure_ascii=False))
    (d / "entries.js").write_text("window.PROTO = " + json.dumps(data, ensure_ascii=False) + ";\n")
    (d / "leads.json").write_text(json.dumps(open_leads, indent=1, ensure_ascii=False))
    (d / "leads_checked.json").write_text(json.dumps(checked_leads, indent=1, ensure_ascii=False))
    (d / "dropped.json").write_text(json.dumps({"works": dropped, "media": problems,
                                                "removed_since_last_build": [{"id": i, "title": prev[i]} for i in removed]}, indent=1, ensure_ascii=False))
    (d / "creators_index.txt").write_text("".join(
        f"{c['id']} | {c['name']} | {c.get('work_count', 0)} works\n" for c in sorted(data["creators"], key=lambda c: c["id"])))
    from markdown_export import catalog_md, llms_txt  # noqa: PLC0415
    (ROOT / "catalog.md").write_text(catalog_md(data, "en"))
    (ROOT / "catalog.zh.md").write_text(catalog_md(data, "zh"))
    (ROOT / "llms.txt").write_text(llms_txt(data))
    index = ROOT / "index.html"
    if index.exists():
        stamp = str(int(time.time()))
        index.write_text(re.sub(r'(assets/(?:app|i18n|export)\.(?:js|css)|data/entries\.js)(\?v=\d+)?"', rf'\1?v={stamp}"', index.read_text()))


def main() -> None:
    recheck = "--recheck" in sys.argv
    tax = load_taxonomy()
    subs = {f["id"]: {s["id"] for s in f["subs"]} for f in tax["fields"]}
    creators, works, leads = load_raw()
    ov = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    works = dedupe(works)
    merge_creators(creators, works, ov.get("merge_creators", {}))
    works = [w for w in works if w.get("id") not in set(ov.get("drop_works", []))]
    add_media(works)
    for w in works:
        w.update(ov.get("patch_works", {}).get(w["id"], {}))
    cache = verify(works, recheck)
    kept, problems, dropped = keep_works(works, subs, creators, cache)

    used = {c for w in kept for c in w["creator_ids"]}
    for cid in used - creators.keys():
        logger.warning("work references unknown creator %s", cid)
        creators[cid] = {"id": cid, "name": cid.replace("-", " ").title(), "links": {}, "connected_to": []}
    out_creators = [c for c in creators.values() if c["id"] in used]
    for c in out_creators:
        c["connected_to"] = [x for x in c["connected_to"] if x in used and x != c["id"]]
        c["work_count"] = sum(c["id"] in w["creator_ids"] for w in kept)
        c.pop("batches", None)
    apply_collections(kept, {c["id"] for c in tax.get("collections", [])})
    kept.sort(key=lambda w: (-(w.get("year") or 0), w.get("title", "")))
    open_leads, checked_leads = classify_leads(leads, creators)

    data = {"generated": date.today().isoformat(), "taxonomy": tax, "creators": out_creators, "works": kept}
    write_outputs(data, open_leads, checked_leads, dropped, problems)
    by_field = {f: sum(w["field"] == f for w in kept) for f in subs}
    logger.info("creators=%d works=%d dropped=%d media_problems=%d open_leads=%d | %s | video=%d images=%d paper=%d contract=%d",
                len(out_creators), len(kept), len(dropped), len(problems), len(open_leads),
                " ".join(f"{k}={v}" for k, v in by_field.items()),
                sum(bool(w["video"]) for w in kept), sum(bool(w["images"]) for w in kept),
                sum(bool(w["paper"]) for w in kept), sum(bool(w.get("contract_url")) for w in kept))


if __name__ == "__main__":
    main()
