# Data schema — Protocolized Inspire

Each research batch writes one file: `data/raw/<batch>.json`

```json
{
  "batch": "onchain-pak",
  "creators": [ Creator, ... ],
  "works":    [ Work, ... ],
  "leads":    [ Lead, ... ]
}
```

## Creator (a person, a collective, a studio, a company or a DAO)
```json
{
  "id": "sarah-friend",                      // kebab-case, unique across all batches
  "name": "Sarah Friend",
  "kind": "person",                          // person | collective | studio | company | dao | anonymous
  "role": "Artist and software developer",
  "based": "Berlin, DE",
  "bio": "1-2 sentences, English.",
  "why": "Why they matter for protocol art (1 sentence).",
  "links": { "site": "", "x": "", "instagram": "", "github": "", "wikipedia": "", "farcaster": "" },
  "role_zh": "…", "bio_zh": "…", "why_zh": "…", "based_zh": "柏林，德国",   // REQUIRED Chinese versions
  "connected_to": ["rhea-myers"],            // other creator ids (collaborators, same collective)
  "discovered_via": "seed"                   // creator id that led to this one, or "seed"
}
```

## Work (one artwork, score, series, platform, game, DAO or text)
```json
{
  "id": "sarah-friend--lifeforms",           // <first-creator-id>--<slug>, unique
  "creator_ids": ["sarah-friend"],
  "title": "Lifeforms",
  "year": 2021,                              // year of first public showing / launch
  "field": "onchain",                        // score | social | network | onchain | autonomous | theory  (data/taxonomy.json)
  "sub": "ownership",                        // one sub-category id of that field
  "also": ["autonomous"],                    // optional: other fields it clearly belongs to
  "mechanisms": ["circulation", "time"],     // 1-3 from the mechanism vocabulary
  "substrate": "ethereum",                   // one id from substrates
  "kind": "series",                          // artwork | score | series | platform | game | organization | publication
  "description": "1-2 sentences, English: what it is and what happens.",
  "description_zh": "中文描述（自然流畅，不逐字翻译）",
  "idea_en": "One-line core idea in English.",
  "idea_zh": "一句话中文：核心想法",
  "protocol": "The rules, in one or two English sentences: who may act, what they can do, what the system enforces.",
  "protocol_zh": "中文：规则是什么。",
  "collective": "What the group actually did and what that produced, with verifiable numbers where they exist. Mark estimates with 'about' or 'likely'.",
  "collective_zh": "中文：群体实际做了什么、产生了什么。",
  "keywords": ["ERC-721", "transfer", "death"],   // free keywords, proper nouns in original

  "video":  { "url": "https://vimeo.com/…" },       // optional: YouTube | Vimeo | X | direct .mp4
  "images": ["https://…/hero.jpg"],                  // optional: 1-4 direct image URLs (jpg/png/webp/gif)
  "paper":  { "url": "https://…", "doi": "", "arxiv": "", "venue": "", "title": "" },   // optional: essay, whitepaper, book or paper; REQUIRED when kind = publication
  "source_url": "https://…",                         // project page / museum page / article (recommended)
  "contract_url": "https://etherscan.io/address/0x…", // optional: the contract on a block explorer
  "code_url": "",                                    // optional repository
  "collections": []                                  // optional: collection ids from data/taxonomy.json
}
```

Rules:
- Every work needs **at least one** of `video`, `images`, `paper`. Aim for a visual (video or image) on every work;
  a text-only work shows a typographic card.
- `protocol` and `collective` are the heart of the entry. `protocol` states the rules the author wrote;
  `collective` states what people did under them. Never invent participant counts, prices or sales totals.
- `paper.doi` is checked against Crossref and `paper.arxiv` against arXiv at build time: use the real DOI, never a guess.
- Images: direct URLs to image files (`og:image` of the project page is usually best; Wikimedia Commons `upload.wikimedia.org` for historical works). Must return `image/*`.
- Videos: prefer the creator's or the institution's own upload.
- `contract_url`: only a contract address you have seen on the project's own page, a block explorer, or a reliable source.

Verify media before writing (all must print `"ok": true`):
```
python3 tools/check_media.py <video-or-image-url> ...
python3 tools/check_media.py --doi 10.1145/…
python3 tools/check_media.py --arxiv 2301.01234
python3 tools/check_media.py --og <project-page-url>      # lists og:image / twitter:image / large <img> candidates
```

## Collections
A collection is a named set of works: an exhibition, a book or survey that discusses them, a platform's curated set.
Defined in `data/taxonomy.json` → `collections` (`id, type, en, zh, desc_en, desc_zh, url`, optional `work` = the survey's work id). `type`: `survey` | `registry` | `exhibition` | `award` | `venue`.
A work joins by listing the id in its `collections`, or by adding its work id to `data/collections/<collection-id>.json`
(a JSON list of work ids — use this for works that already exist in another batch).
New collections: do not edit taxonomy.json concurrently — define them in `data/collections/defs/<your-batch>.json` (a JSON list of collection objects); the build merges them.

## Extra media (`data/media/<name>.json`)
Images or a video found later for existing works, kept out of the research batches so passes never edit each other's files:
`{ "<work-id>": { "images": ["https://…"], "video": { "url": "https://…" } } }` — images are appended (max 4), a video is used only when the work has none.

## Lead (person / project found but not researched in this batch)
```json
{ "name": "…", "why": "…", "link": "…", "found_via": "creator id", "status": "open" }   // open | no_media | off_topic | duplicate
```

## Language rule
Every user-facing text exists in BOTH languages, never mixed inside one field (proper nouns — titles,
people, collectives, contracts, platforms — stay in the original).
English fields: description, idea_en, protocol, collective, role, bio, why, based.
Chinese fields: description_zh, idea_zh, protocol_zh, collective_zh, role_zh, bio_zh, why_zh, based_zh.
Run `python3 tools/validate.py data/raw/<file>.json` before building.

## Resources (`data/resources/<name>.json`)
Institutions and websites around protocol art, shown in the Resources tab next to an automatic directory of all creators (people).
```json
{
  "institutions": [
    {
      "id": "rhizome",                         // kebab-case, unique across resource files
      "name": "Rhizome",
      "kind": "organization",                  // museum | gallery | prize | festival | organization | lab | platform | dao | auction
      "based": "New York, US", "based_zh": "纽约，美国",
      "url": "https://rhizome.org",
      "desc_en": "One sentence: what it is and why it matters for protocol art.",
      "desc_zh": "一句中文。",
      "work_ids": ["kevin-mccoy--monegraph"]   // optional: gallery works it commissioned, showed, collected or awarded
    }
  ],
  "websites": [
    {
      "id": "mlo-history-of-crypto-art",
      "name": "History of Crypto Art (Martin Lukas Ostachowski)",
      "kind": "timeline",                      // archive | publication | timeline | database | tool | community | course
      "url": "https://mlo.art/research/history-of-crypto-art/",
      "desc_en": "…", "desc_zh": "…",
      "work_ids": []
    }
  ]
}
```
Rules: every URL must answer (check with `curl -sIL -o /dev/null -w "%{http_code}" <url>`, 2xx/3xx, or 403 from bot-blocking sites that open in a browser). Bilingual `desc_*`; `work_ids` must exist in `data/raw/`.
