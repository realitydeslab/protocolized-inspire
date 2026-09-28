---
description: Research one or more artists, collectives or protocol artworks for Protocolized Inspire, add them (bilingual, classified, with protocol, collective behaviour and media), rebuild the site and catalogs, and publish.
argument-hint: <artist, collective, project URL or contract> [, another …] [--no-push]
---

# Add to Protocolized Inspire

Input: `$ARGUMENTS` — one or more artists, collectives, DAOs, projects (URL, contract address) or texts, comma-separated. `--no-push` = build and preview locally, do not commit or publish.

The gallery collects protocol art: an author writes a protocol, a group acts under it, and the group's behaviour is the work.
Read `data/SCHEMA.md`, `data/taxonomy.json` and `data/RESEARCH_BRIEF.md` (inclusion test) first.

## Steps

1. **Sync.** `git pull --ff-only` (skip if there is no remote yet).
2. **Identify.** Resolve each input to a creator. `grep -i "<name>" data/creators_index.txt` — if they exist, reuse the id and add only missing works. For a single project, add it under its first artist / collective.
   Several inputs → one subagent each, in parallel, each writing its own file.
3. **Research all works that pass the inclusion test** (artist site, museum pages, project site, block explorer, press, interviews). For each: the protocol, what the collective did (numbers only from a source), video, 1–3 images, contract link, texts.
   Verify with `python3 tools/check_media.py <url>…`, `--doi <doi>`, `--og <page>` (image candidates). Keep only `"ok": true`.
4. **Write** `data/raw/add-<creator-id>.json` with creators, works (field / sub / mechanisms / substrate / kind from the taxonomy, English + Chinese text), leads.
5. **Validate.** `python3 tools/validate.py data/raw/add-<creator-id>.json` until ✓.
6. **Build.** `python3 tools/build_data.py`. Check `data/dropped.json` (dead media) and fix what is yours.
7. **Preview** (optional): `./serve.sh`, open `http://localhost:8933/#view=works&q=<name>`.
8. **Check duplicates**: `python3 tools/audit_titles.py` — resolve any same-title works that are yours.
9. **Publish** (skip with `--no-push`): `tools/publish.sh "feat(data): add <name> (<n> works)"`
   It validates every batch, rebuilds, refuses to publish if validation fails or works disappeared, then commits and pushes.
10. **Report**: what was added (counts per field), notable works, what was left out and why, new leads.
