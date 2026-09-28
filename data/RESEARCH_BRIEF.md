# Research brief (for every research agent)

Project: **Protocolized Inspire** — a bilingual (English / Simplified Chinese) gallery of **protocol art**, made by
Reality Design Lab as idea material for designers, artists and researchers; a sibling of More than Human Inspire.
Working dir: `/Users/amber/Projects/HoloKit/HoloKit2/protocolized-inspire`.

Read first: `data/SCHEMA.md` (JSON format, language rule) and `data/taxonomy.json` (field / sub / mechanisms / substrates / kind ids).

## What counts as protocol art (inclusion test)
A work is in scope when all three hold:
1. **Authored protocol.** An identifiable artist, designer or collective wrote the rules (instructions, a score, a contract, a game, a smart contract).
2. **Addressed to a group.** The rules are meant to be carried out by other people: assistants, audiences, strangers, collectors, token holders, a crowd.
3. **The group's behaviour is the work.** What those people do under the rules makes up the work, or a decisive part of it; the author alone could not produce the result.

Borderline and usually out: generative art where collectors only press "mint" (a single Art Blocks output), profile-picture
collections with no rule that shapes collective behaviour, platforms and DAOs with no artistic author (Bitcoin itself,
Wikipedia, ConstitutionDAO), and games made only as commercial products. Record good borderline cases as `leads` with
`status: "off_topic"` and a one-line reason, so the next pass does not research them again.
Precursors are welcome when the protocol is explicit (Moholy-Nagy's telephone paintings, Yves Klein's receipts, Siegelaub's contract).

## What to collect
- The most important and most inventive works in your scope. Breadth first, then depth: for each key creator, collect **all** their works that pass the test.
- Every work: bilingual text, a correct classification, the protocol, what the collective did, and as many of these as exist:
  **video** (YouTube / Vimeo / X / mp4), **images** (1–3 direct image URLs), **paper** (essay, whitepaper, book, DOI), **source_url**, **contract_url**.
- Aim for a visual on every work. Good image sources: the project page's `og:image` (`python3 tools/check_media.py --og <page>`),
  museum pages (MoMA, Tate, Guggenheim, Whitney), Wikimedia Commons (`upload.wikimedia.org`), auction pages, artist sites,
  OpenSea / Etherscan-linked project sites, arweave / IPFS gateways with a direct image. Avoid Instagram / Pinterest CDN links (they expire).
  Wikimedia thumbnails only work at standard widths (e.g. `/330px-`, `/500px-`, `/960px-`, `/1280px-`) or as the original file URL; get the real
  file URL from the Commons API (`https://commons.wikimedia.org/w/api.php?action=query&titles=File:<name>&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json`).
- Verify everything with `python3 tools/check_media.py` before writing it: videos and images (`<url>`), DOIs (`--doi`), arXiv ids (`--arxiv`).
  Keep only `"ok": true`. Never guess a DOI, a contract address, a date, a participant count or a price.
- Year = year of first public showing, first performance, publication or contract deployment.

## Writing
- `description`: 1–2 sentences, concrete: what it is and what happens.
- `idea_en`: the one-line idea a designer should take away.
- `protocol`: the rules, stated plainly (who may act, what they can do, what is enforced and by what: a certificate, the post, a platform, a contract).
- `collective`: what the group did and what that produced. Use numbers only when a source states them; otherwise describe qualitatively.
- Chinese versions natural, not word-for-word. Plain, precise language. No hype ("groundbreaking", "revolutionary", "iconic").

## Output
- One file `data/raw/<your-batch>.json` (`"batch": "<your-batch>"`), creators + works + leads. You may split into
  several files if large (`<your-batch>-2.json`).
- Before creating a creator, `grep -ril "<surname>" data/raw/` to see if another agent already created them; if so, reuse that id
  (you may still add the works that belong to your scope). Creator ids: kebab-case of the name (`sol-lewitt`, `terra0`, `pak`).
- Work id: `<first-creator-id>--<short-slug>`.
- Run `python3 tools/validate.py data/raw/<file>.json` until it prints ✓.
- `leads`: people / projects you found but did not research (for the next round).
- Do NOT use the Chrome browser tools (shared with other agents). Use web search / fetch and `curl`.
- Do NOT touch files outside `data/raw/` and `temp/`.

## Report back (short)
File(s) written, number of creators and works, how many have video / images / paper, notable gaps, top leads.
