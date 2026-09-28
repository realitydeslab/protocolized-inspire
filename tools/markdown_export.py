"""Markdown catalog of the gallery for AI assistants (llms.txt convention).

catalog_md(data, lang) -> every field and sub-category with its works, then every creator.
llms_txt(data)         -> short index pointing to the full files.
"""
SITE = "https://protocolized.reality.design"

T = {
    "en": {
        "title": "Protocolized Inspire — catalog",
        "intro": ("A catalog of protocol art: works in which an artist or designer writes a protocol — instructions, a score, "
                  "a contract, a game, a smart contract — that shapes what a group of people does, and that group behaviour is the work. "
                  "From 1920s instructions and Fluxus scores to smart-contract art and DAOs, compiled by Reality Design Lab as idea material. "
                  "Each work lists its core idea, its rules, what the collective did, and links to images, video, texts and contracts."),
        "how": "How an AI assistant should use this file",
        "how_items": [
            "Ground ideas in the specific works below and name the work and creator you draw on.",
            "Separate the protocol (the rules the author wrote) from the collective behaviour it produced.",
            "Combine mechanisms and substrates across works to propose new protocols.",
            "Do not invent numbers, prices, dates or contract addresses that are not stated here; the links are the reference.",
        ],
        "creators": "Creators", "idea": "Idea", "what": "What it is", "protocol": "Protocol", "collective": "What the collective did",
        "paper": "Text", "video": "Video", "images": "Images", "page": "Project page", "contract": "Contract", "code": "Code",
        "mechanisms": "Mechanisms", "substrate": "Substrate", "kind": "Type",
        "institutions": "Institutions", "websites": "Websites & archives",
    },
    "zh": {
        "title": "Protocolized Inspire — 作品目录",
        "intro": ("协议艺术作品目录：艺术家或设计师写下一个协议——指令、乐谱、契约、游戏或智能合约——它塑造一群人的行为，而这群人的行为就是作品。"
                  "从 1920 年代的指令、激浪派乐谱，到智能合约艺术与 DAO，由 Reality Design Lab 整理，作为灵感素材。"
                  "每件作品都列出核心想法、规则、群体做了什么，以及图片、视频、文本和合约链接。"),
        "how": "AI 助手应如何使用这个文件",
        "how_items": [
            "提出想法时，以下面的具体作品为依据，并说明借鉴的是哪件作品、哪位创作者。",
            "区分协议（作者写下的规则）和它引发的群体行为。",
            "把不同作品的机制和载体组合起来，提出新的协议。",
            "不要编造这里没有写到的数字、价格、日期或合约地址，以链接为准。",
        ],
        "creators": "创作者", "idea": "核心想法", "what": "作品内容", "protocol": "协议", "collective": "群体做了什么",
        "paper": "文本", "video": "视频", "images": "图片", "page": "项目主页", "contract": "合约", "code": "代码",
        "mechanisms": "机制", "substrate": "载体", "kind": "类型",
        "institutions": "机构", "websites": "网站与档案",
    },
}


def _label(pairs: list, key: str, zh: bool) -> str:
    row = next((p for p in pairs if p[0] == key), None)
    return (row[2] if zh else row[1]) if row else key


def _work(w: dict, lang: str, names: dict, tax: dict) -> str:
    s, zh = T[lang], lang == "zh"
    who = ", ".join(names.get(c, c) for c in w["creator_ids"])
    p = w.get("paper") or {}
    sfx = "_zh" if zh else ""
    lines = [
        f"#### {w['title']} — {who}" + (f" ({w['year']})" if w.get("year") else ""),
        f"- {s['kind']}: {_label(tax['kinds'], w.get('kind', ''), zh)} · {s['substrate']}: {_label(tax['substrates'], w.get('substrate', ''), zh)}"
        f" · {s['mechanisms']}: " + ", ".join(_label(tax["mechanisms"], m, zh) for m in w.get("mechanisms", [])),
        f"- {s['idea']}: {w.get('idea_zh' if zh else 'idea_en', '')}",
        f"- {s['what']}: {w.get('description' + sfx, '')}",
        f"- {s['protocol']}: {w.get('protocol' + sfx, '')}",
        f"- {s['collective']}: {w.get('collective' + sfx, '')}",
        f"- {s['paper']}: {p['url']}" + (f" ({p['venue']})" if p.get("venue") else "") if p.get("url") else "",
        f"- {s['video']}: {w['video']['url']}" if w.get("video") else "",
        f"- {s['images']}: {' '.join(w['images'])}" if w.get("images") else "",
        f"- {s['page']}: {w['source_url']}" if w.get("source_url") else "",
        f"- {s['contract']}: {w['contract_url']}" if w.get("contract_url") else "",
        f"- {s['code']}: {w['code_url']}" if w.get("code_url") else "",
    ]
    return "\n".join(x for x in lines if x)


def catalog_md(data: dict, lang: str) -> str:
    s, zh = T[lang], lang == "zh"
    tax = data["taxonomy"]
    names = {c["id"]: c["name"] for c in data["creators"]}
    counts = (f"{len(data['creators'])} 位创作者 · {len(data['works'])} 件作品" if zh
              else f"{len(data['creators'])} creators · {len(data['works'])} works")
    out = [f"# {s['title']}", "", s["intro"], "", f"{SITE} · {data['generated']} · {counts}", "", f"## {s['how']}", ""]
    out += [f"- {x}" for x in s["how_items"]] + [""]
    for f in tax["fields"]:
        fw = [w for w in data["works"] if w["field"] == f["id"]]
        if not fw:
            continue
        out += [f"## {f['zh'] if zh else f['en']}", "", f["desc_zh" if zh else "desc_en"], ""]
        for sub in f["subs"]:
            sw = sorted((w for w in fw if w.get("sub") == sub["id"]), key=lambda w: w.get("year") or 0)
            if not sw:
                continue
            out += [f"### {sub['zh'] if zh else sub['en']}", "", sub["desc_zh" if zh else "desc_en"], ""]
            out += ["\n\n".join(_work(w, lang, names, tax) for w in sw), ""]
    out += [f"## {s['creators']}", ""]
    for c in sorted(data["creators"], key=lambda c: (-c.get("work_count", 0), c["name"])):
        role = c.get("role_zh" if zh else "role", "")
        bio = c.get("bio_zh" if zh else "bio", "")
        site = (c.get("links") or {}).get("site", "")
        out.append(f"- **{c['name']}** ({c.get('work_count', 0)}) — {role}. {bio}" + (f" {site}" if site else ""))
    res = data.get("resources") or {}
    for group in ("institutions", "websites"):
        if res.get(group):
            out += ["", f"## {s[group]}", ""]
            out += [f"- **{r['name']}** ({r.get('kind', '')}) — {r.get('desc_zh' if zh else 'desc_en', '')} {r['url']}" for r in res[group]]
    return "\n".join(out).rstrip() + "\n"


def llms_txt(data: dict) -> str:
    fields = ", ".join(f"{f['en']} ({sum(w['field'] == f['id'] for w in data['works'])})" for f in data["taxonomy"]["fields"])
    return "\n".join([
        "# Protocolized Inspire",
        "",
        f"> {T['en']['intro']}",
        "",
        f"{len(data['creators'])} creators, {len(data['works'])} works ({fields}), "
        f"{sum(bool(w.get('contract_url')) for w in data['works'])} with a contract link, updated {data['generated']}. "
        "Bilingual (English / Simplified Chinese).",
        "",
        "## Full catalog",
        "",
        f"- [English catalog]({SITE}/catalog.md): every field and sub-category with all works, then all creators",
        f"- [Chinese catalog]({SITE}/catalog.zh.md): 中文版完整目录",
        f"- [Raw data (JSON)]({SITE}/data/entries.json)",
        "",
        "## Website",
        "",
        f"- [{SITE}]({SITE}): images and videos, protocol and collective behaviour for every work, timeline, filters by field, mechanism, substrate and type, starring and SKILL.md export",
        "",
    ])
