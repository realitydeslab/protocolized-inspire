# Task plan — Protocolized Inspire

Goal: a sibling of `../mth-inspire` for **protocol art**: works where an artist / designer authors a protocol,
the protocol shapes what a group of people does, and that group behaviour is the work.
Examples named by the user: Pak, terra0, Sol LeWitt; most recent works are smart-contract based.

## Decisions
- Same architecture as mth-inspire: `data/raw/*.json` batches → `tools/build_data.py` → `data/entries.js` + static site.
- Replace `organisms` with `mechanisms` (1–3 protocol primitives) and add `substrate` (paper, body, post, internet, ethereum…).
- Replace `method` with two protocol fields: `protocol` (the rules) and `collective` (what the group did).
- Replace the Papers view with a Timeline view (the lineage from 1920s instructions to smart contracts).
- Local only: no git remote, no publish, no domain until the user decides. Placeholder site URL `https://protocolized.reality.design`.

## Phases
- [x] P0 Scaffold: taxonomy, SCHEMA, RESEARCH_BRIEF, tools, site, README, /add-work command (empty build OK, JS/py syntax OK)
- [ ] P0 Research batches (8 parallel agents): score, social, network, onchain-pak, onchain-rules, onchain-coauthor, autonomous, theory
- [ ] P0 Validate + build + fix dropped media
- [ ] P1 Local preview check (`./serve.sh`, port 8933)
- [x] P2 git init, remote, domain — user chose repo realitydeslab/protocolized-inspire (public, like mth) and domain protocolized.reality.design (DNS CNAME already pointed to realitydeslab.github.io). Pages enabled from main /, CNAME committed.
- [ ] P0 After remaining batches: validate, build, audit duplicates, `tools/publish.sh`, enforce HTTPS once cert is approved

## Progress log
- theory.json ✓ (28 works), onchain-pak.json ✓ (19 works). Interim build: 47 works, 0 dropped, 0 media problems.
- Browser check (localhost:8933): atlas, timeline, player OK, no console errors. Added hashchange listener; collection chip row hidden until a collection has works.
- Second-pass leads: Distributed Gallery, World Computer Sculpture Garden (0xfff 2024), De Filippi & Beer "Protocol Art II", Hashmasks, Sam Spratt, Pak Fomo / ASH Chapter II.
- Possible duplicate: Pak "Clock" (onchain-pak) vs AssangeDAO (autonomous batch) — check with audit_titles.

- Published 88caa01: 250 works / 134 creators (score 65, social 42, network 35, onchain 60, autonomous 20, theory 28). audit_titles: 4 groups, all distinct works.
- User requests in flight: (1) all of Holly Herndon & Mat Dryhurst's works → batch herndon-dryhurst; (2) symbient.life registry → batch symbient + collection `symbient-life` (type registry, added to UI).
- Still running: network, onchain-rules (files already valid and published), herndon-dryhurst, symbient.

- All batches done and published (c091bbb): 313 works / 184 creators; collections: the-scores-project (9), symbient-life (19). audit_titles: 4 groups, all distinct.
- Open questions to user: "Proof of War" (which work?), rename to "protocolized-reality-inspire" (title / repo / domain / folder?).
- Next-pass leads: Distributed Gallery, World Computer Sculpture Garden (0xfff), De Filippi & Beer "Protocol Art II", Strange Rules (Venice 2026) collection, Eve Sussman 89 Seconds Atomized, Blast Theory, Stelarc Fractal Flesh, Yvonne Rainer, Picbreeder.

- 6fb00db: added Egor Kraft, Hashd0x | Proof of War (user clarified to the onchain-rules agent directly).
- Resources tab (user request relayed by onchain-rules agent): People auto from creators; institutions/websites from data/resources/*.json (tools/resources.py, validated in validate --all, rendered in catalog.md). UI done locally, not yet published; agent compiling data/resources/core.json.

## Blockers
- Bash auto-mode classifier returned "no verdict" repeatedly at start; scaffold written with Write.
