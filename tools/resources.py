"""Resources: institutions and websites around protocol art (data/resources/*.json, see data/SCHEMA.md).

load_resources(work_ids)  -> {"institutions": [...], "websites": [...]} merged across files, unknown work_ids dropped.
validate_resources()      -> list of error strings (used by tools/validate.py --all).
"""
import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
RESOURCES = ROOT / "data" / "resources"
CJK = re.compile(r"[㐀-鿿]")
KINDS = {
    "institutions": {"museum", "gallery", "prize", "festival", "organization", "lab", "platform", "dao", "auction"},
    "websites": {"archive", "publication", "timeline", "database", "tool", "community", "course"},
}


def _files() -> list[Path]:
    return sorted(RESOURCES.glob("*.json")) if RESOURCES.exists() else []


def _norm_url(u: str) -> str:
    return re.sub(r"^https?://(www\.)?|/$", "", (u or "").strip().lower())


def load_resources(work_ids: set) -> dict:
    """Merge every resource file; the first entry for an id or URL wins, later ones only fill empty fields."""
    out: dict = {"institutions": [], "websites": []}
    for f in _files():
        try:
            d = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            logger.error("SKIP resources %s: invalid JSON (%s)", f.name, e)
            continue
        for group in out:
            index = {k: r for r in out[group] for k in (r["id"], _norm_url(r.get("url", "")))}
            for r in d.get(group, []):
                r = {**r, "work_ids": [w for w in r.get("work_ids") or [] if w in work_ids]}
                cur = index.get(r.get("id")) or index.get(_norm_url(r.get("url", "")))
                if cur:
                    cur["work_ids"] = list(dict.fromkeys(cur["work_ids"] + r["work_ids"]))
                    cur.update({k: v for k, v in r.items() if v and not cur.get(k)})
                    continue
                out[group].append(r)
                index[r.get("id")] = index[_norm_url(r.get("url", ""))] = r
    for group in out:
        out[group].sort(key=lambda r: r.get("name", "").lower())
    return out


def validate_resources() -> list[str]:
    errs: list[str] = []
    known = set()
    for f in (ROOT / "data" / "raw").glob("*.json"):
        known |= {w.get("id") for w in json.loads(f.read_text()).get("works", [])}
    seen: set = set()
    for f in _files():
        try:
            d = json.loads(f.read_text())
        except json.JSONDecodeError as e:
            errs.append(f"{f.name}: invalid JSON: {e}")
            continue
        for group, kinds in KINDS.items():
            for r in d.get(group, []):
                who = f"{f.name} {group[:-1]} {r.get('id', '?')}"
                if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", r.get("id", "")):
                    errs.append(f"{who}: id must be kebab-case")
                if r.get("id") in seen:
                    errs.append(f"{who}: duplicate id")
                seen.add(r.get("id"))
                if r.get("kind") not in kinds:
                    errs.append(f"{who}: kind must be one of {sorted(kinds)}")
                if not str(r.get("url", "")).startswith("http"):
                    errs.append(f"{who}: url must start with http")
                if not r.get("name") or not r.get("desc_en") or CJK.search(r.get("desc_en", "")):
                    errs.append(f"{who}: needs name and English desc_en")
                if not CJK.search(r.get("desc_zh", "")):
                    errs.append(f"{who}: desc_zh must be Chinese")
                bad = [w for w in r.get("work_ids") or [] if w not in known]
                if bad:
                    errs.append(f"{who}: unknown work_ids {bad}")
    return errs
