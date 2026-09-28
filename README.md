# Protocolized Inspire

**https://protocolized.reality.design**

Write the rules, let the crowd make the work. A bilingual (English / 中文) gallery of **protocol art**: works in which an artist or designer writes a protocol — instructions, a score, a contract, a game, a smart contract — that shapes what a group of people does, and that group behaviour is the work. From Moholy-Nagy's telephone paintings, Fluxus scores and Sol LeWitt's wall drawings to Pak's Merge, terra0's self-owning forest and art DAOs. Built by [Reality Design Lab](https://reality.design) as idea material for designers, artists and researchers; a sibling of [More than Human Inspire](https://more-than-human.reality.design).

## What counts

A work is included when all three hold (full test in [`data/RESEARCH_BRIEF.md`](data/RESEARCH_BRIEF.md)):

1. **Authored protocol** — an identifiable artist, designer or collective wrote the rules.
2. **Addressed to a group** — the rules are carried out by other people: assistants, audiences, strangers, collectors, token holders.
3. **The group's behaviour is the work** — the result could not be produced by the author alone.

Every work records its **protocol** (the rules) and its **collective** (what people did under them).

## What's inside

- **Atlas**: six fields and their sub-categories, plus a view by mechanism.
- **Six field views**, each grouped by sub-category:
  - Scores & Instructions: instructions for execution, event scores & Fluxus, instructions for the public, constraints, chance & games.
  - Social Protocols & Economies: social sculpture & collective action, performance protocols, mail art, contracts, currencies & exchange.
  - Network & Crowd Protocols: telematic art, crowdsourced works, collective canvases & games, open infrastructure.
  - Smart-Contract Art: supply, burn & merge; ownership & transfer rules; programmable & co-authored works; early tokens & provenance.
  - Autonomous Entities & DAOs: self-owning life & nature, autonomous & collective artists, DAOs & collective governance.
  - Theory & Texts: systems & protocol theory, participation & relational art, crypto art & protocol research.
- **Timeline**: every work in order, from 1919 to today; the filters apply.
- **All works**: filter by field, mechanism (instruction, chance, burn, merge, governance…), substrate (text, bodies, post, internet, Ethereum, Tezos…), type and era; full-text search.
- **Creators**: people, collectives, studios and DAOs, with bios and all their works.
- **Resources**: a directory of every artist and collective, plus the institutions (museums, prizes, festivals, labs, platforms) and websites (archives, timelines, publications, tools) around protocol art, linked to the works they commissioned, showed or document.
- **Starred**: star works in your browser, export them as `SKILL.md`, `README.md` or a reading list.

## For AI assistants

- [`llms.txt`](llms.txt): index
- [`catalog.md`](catalog.md) / [`catalog.zh.md`](catalog.zh.md): full catalog in English / Chinese
- [`data/entries.json`](data/entries.json): raw data

## Maintain it with AI

Open this folder in [Claude Code](https://claude.com/claude-code) and run:

```text
/add-work Sarah Friend
/add-work https://www.terra0.org
/add-work Nouns, Botto
```

`/add-work` (in [`.claude/commands/`](.claude/commands/)) researches the artist or project, adds every work that passes the test in both languages with verified image / video / contract links, rebuilds and publishes. The data format is in [`data/SCHEMA.md`](data/SCHEMA.md).

| Script | Purpose |
|---|---|
| `python3 tools/check_media.py <url>…` / `--doi` / `--arxiv` / `--og <page>` | Check videos, images, DOIs and arXiv ids; list image candidates on a page |
| `python3 tools/validate.py data/raw/<file>.json` (or `--all`) | Check a batch: required bilingual fields, taxonomy ids, duplicates |
| `python3 tools/build_data.py [--recheck]` | Merge batches, verify every link, write `data/entries.*`, catalogs and `llms.txt`; warns about works removed since the last build |
| `python3 tools/audit_titles.py` | List same-title works across batches (possible duplicates) |
| `tools/publish.sh "<message>"` | Validate all, rebuild, refuse on errors or unexpected removals, commit and push |

## Run locally

```bash
./serve.sh   # rebuilds data/ and serves http://localhost:8933
```

## Data layout

| Path | Contents |
|---|---|
| `data/taxonomy.json` | Fields and sub-categories, mechanisms, substrates, work types, collections |
| `data/raw/*.json` | Research batches: creators, works, leads |
| `data/collections/*.json` | Extra members of a collection (lists of work ids) |
| `data/resources/*.json` | Institutions and websites for the Resources tab (people come from the creator records) |
| `data/overrides.json` | Optional manual curation: merge creators, drop or patch works |
| `data/entries.json`, `data/entries.js` | Built dataset used by the site |
| `data/media_cache.json` | Link-check results |
| `data/dropped.json` | Dead links found at build |
| `data/leads.json` | Artists and projects found but not yet researched |

## Credits

Images and videos are linked from the artists, museums, platforms and publishers and remain theirs. To suggest a correction or an addition, please open an issue.

---

# Protocolized Inspire（中文）

写下规则，让人群完成作品。这是一个中英双语的**协议艺术**作品库：艺术家或设计师写下一个协议——指令、乐谱、契约、游戏或智能合约——它塑造一群人的行为，而这群人的行为就是作品。从莫霍利-纳吉的电话绘画、激浪派乐谱、索尔·勒维特的墙绘，到 Pak 的 Merge、terra0 的自我拥有的森林和艺术 DAO。由 [Reality Design Lab](https://reality.design) 整理，是 [More than Human Inspire](https://more-than-human.reality.design) 的姊妹站。

收录标准：（1）规则由可识别的艺术家、设计师或团体写下；（2）规则交由一群人执行；（3）这群人的行为构成作品本身。每件作品都写明**协议**（规则）和**群体做了什么**。

- **总览**：六个领域及其子类，以及按机制浏览。
- **时间线**：按年份排列的全部作品，可叠加筛选。
- **全部作品**：按领域、机制、载体、类型和年代筛选，支持全文搜索。
- **资源**：全部艺术家与团体的名录，以及相关的机构（博物馆、奖项、艺术节、实验室、平台）和网站（档案、时间线、出版物、工具）。
- **创作者**、**收藏**（可导出 `SKILL.md`、`README.md` 或阅读清单）。

在 Claude Code 中打开本仓库，输入 `/add-work <名字或链接>` 即可让 AI 调研并添加新作品。本地运行：`./serve.sh`。

图片与视频版权归原作者、博物馆、平台和出版方所有。如需更正或补充，欢迎提交 issue。
