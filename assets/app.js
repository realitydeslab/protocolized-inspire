/* Protocolized Inspire — gallery app. Data: data/entries.js (window.PROTO). Strings: assets/i18n.js. */
(() => {
  "use strict";

  const DATA = window.PROTO || { creators: [], works: [], taxonomy: { fields: [], mechanisms: [], substrates: [], kinds: [] }, generated: "" };
  const I18N = window.PROTO_I18N;
  const TX = window.ProtoText;
  const TAX = DATA.taxonomy;
  const FIELDS = TAX.fields;
  const COLS = TAX.collections || [];
  const MECHS = TAX.mechanisms || [];
  const SUBSTRATES = TAX.substrates || [];
  const ERAS = [["1959", 0, 1959, "≤1959"], ["1960", 1960, 1979, "1960–79"], ["1980", 1980, 1999, "1980–99"], ["2000", 2000, 2014, "2000–14"], ["2015", 2015, 2020, "2015–20"], ["2021", 2021, 2030, "2021–"]];
  const VIEWS = ["atlas", ...FIELDS.map((f) => f.id), "timeline", "collections", "works", "creators", "starred"];
  const FILTERED = ["works", "timeline", "creators"];
  const EMPTY_FILTERS = () => ({ q: "", mechs: new Set(), subs: new Set(), cols: new Set(), fields: new Set(), kinds: new Set(), era: "", creator: "", video: false, contract: false });

  const creatorsById = Object.fromEntries(DATA.creators.map((c) => [c.id, c]));
  const worksById = Object.fromEntries(DATA.works.map((w) => [w.id, w]));
  const fieldById = Object.fromEntries(FIELDS.map((f) => [f.id, f]));
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- per-viewer storage (never required for the page to work) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  let lang = store.get("proto-lang", (navigator.language || "").startsWith("zh") ? "zh" : "en");
  let stars = new Set(store.get("proto-stars", []).filter((id) => worksById[id]));
  const S = () => I18N[lang];
  const zh = () => lang === "zh";
  const nm = (o) => (zh() ? o.zh : o.en);
  const pair = (list, k) => { const r = list.find((x) => x[0] === k); return r ? (zh() ? r[2] : r[1]) : k; };
  const mechName = (k) => pair(MECHS, k);
  const subsName = (k) => pair(SUBSTRATES, k);
  const kindName = (k) => pair(TAX.kinds, k);
  const subOf = (w) => (fieldById[w.field]?.subs || []).find((s) => s.id === w.sub);
  const src = (p) => S().sources[p] || p;

  const state = { view: "atlas", sort: "new", sub: "", ...EMPTY_FILTERS() };
  let currentList = [];
  let openIndex = -1;
  let mediaIndex = 0;

  /* ---------- state <-> URL hash ---------- */
  const set = (p, k) => new Set((p.get(k) || "").split(",").filter(Boolean));
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.view = VIEWS.includes(p.get("view")) ? p.get("view") : "atlas";
    Object.assign(state, { q: p.get("q") || "", mechs: set(p, "m"), subs: set(p, "s"), cols: set(p, "col"), fields: set(p, "f"), kinds: set(p, "k"), era: p.get("era") || "",
      sort: p.get("sort") || "new", creator: p.get("c") || "", video: p.get("v") === "1", contract: p.get("x") === "1", sub: p.get("sub") || "" });
    return { work: p.get("w") };
  }
  function writeHash(workId) {
    const p = new URLSearchParams();
    if (state.view !== "atlas") p.set("view", state.view);
    if (fieldById[state.view] && state.sub) p.set("sub", state.sub);
    if (FILTERED.includes(state.view)) {
      if (state.q) p.set("q", state.q);
      [["col", state.cols], ["m", state.mechs], ["s", state.subs], ["f", state.fields], ["k", state.kinds]].forEach(([k, v]) => { if (v.size) p.set(k, [...v].join(",")); });
      if (state.era) p.set("era", state.era);
      if (state.sort !== "new") p.set("sort", state.sort);
      if (state.creator) p.set("c", state.creator);
      if (state.video) p.set("v", "1");
      if (state.contract) p.set("x", "1");
    }
    if (workId) p.set("w", workId);
    history.replaceState(null, "", "#" + p.toString());
  }

  /* ---------- filtering ---------- */
  const creatorNames = (w) => w.creator_ids.map((id) => creatorsById[id]?.name || id);
  const inField = (w, f) => w.field === f || (w.also || []).includes(f);
  function haystack(w) {
    return [w.title, w.description, w.description_zh, w.idea_en, w.idea_zh, w.protocol, w.protocol_zh, w.collective, w.collective_zh, ...(w.keywords || []),
      ...(w.mechanisms || []).map(mechName), subsName(w.substrate), ...creatorNames(w), w.year].join(" ").toLowerCase();
  }
  function matches(w, skip = "") {
    if (state.creator && !w.creator_ids.includes(state.creator)) return false;
    if (state.video && !w.video?.url) return false;
    if (state.contract && !w.contract_url) return false;
    if (skip !== "c" && state.cols.size && !(w.collections || []).some((c) => state.cols.has(c))) return false;
    if (skip !== "f" && state.fields.size && ![...state.fields].some((f) => inField(w, f))) return false;
    if (skip !== "m" && state.mechs.size && !(w.mechanisms || []).some((m) => state.mechs.has(m))) return false;
    if (skip !== "s" && state.subs.size && !state.subs.has(w.substrate)) return false;
    if (skip !== "k" && state.kinds.size && !state.kinds.has(w.kind)) return false;
    if (state.era) {
      const e = ERAS.find((x) => x[0] === state.era);
      if (!w.year || w.year < e[1] || w.year > e[2]) return false;
    }
    if (state.q && !haystack(w).includes(state.q.toLowerCase())) return false;
    return true;
  }
  function sorted(list) {
    const arr = [...list];
    if (state.sort === "old") arr.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    else if (state.sort === "creator") arr.sort((a, b) => creatorNames(a)[0].localeCompare(creatorNames(b)[0]) || (a.year || 0) - (b.year || 0));
    else arr.sort((a, b) => (b.year || 0) - (a.year || 0));
    return arr;
  }

  /* ---------- cards ---------- */
  const poster = (w) => w.video?.thumbnail || (w.images || [])[0] || "";
  const textPh = (w) => `<div class="ph ph--paper"><span class="ph__venue mono">${esc(w.paper?.venue || kindName(w.kind))}</span><span class="ph__title">${esc(w.title)}</span></div>`;
  function thumb(w) {
    const p = poster(w);
    if (p) return `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(p)}" alt="" onerror="this.outerHTML=this.dataset.ph" data-ph="${esc(textPh(w))}">`;
    if (w.video?.platform === "mp4") return `<video muted playsinline preload="none" data-src="${esc(w.video.url)}#t=0.8"></video>`;
    return textPh(w);
  }
  const starBtn = (id, cls = "star") => `<button class="${cls}" type="button" data-star="${esc(id)}" aria-pressed="${stars.has(id)}" aria-label="${esc(S().star_aria)}">${stars.has(id) ? "★" : "☆"}</button>`;
  function card(w) {
    const who = creatorNames(w).join(", ");
    const tags = (w.mechanisms || []).map((m) => `<span class="tag">${esc(mechName(m))}</span>`).join("");
    const marks = `${w.video?.url ? "▶" : ""}${w.contract_url ? " ⛓" : ""}`.trim();
    return `<div class="cardwrap">
      <button class="card" data-id="${esc(w.id)}" aria-label="${esc(w.title)} — ${esc(who)}">
        <div class="card__media">${thumb(w)}
          <span class="br br--tl"></span><span class="br br--tr"></span><span class="br br--bl"></span><span class="br br--br"></span>
          <span class="card__src">${esc(subsName(w.substrate))}${marks ? ` · ${marks}` : ""}</span>
          ${w.year ? `<span class="card__year">${w.year}</span>` : ""}
        </div>
        <div class="card__field mono">${esc(nm(fieldById[w.field] || {}))}${subOf(w) ? ` / ${esc(nm(subOf(w)))}` : ""}</div>
        <div class="card__title">${esc(w.title)}</div>
        <div class="card__meta">${esc(who)}</div>
        <div class="card__idea">${esc(TX.work(w, lang).idea || "")}</div>
        <div class="tags">${tags}</div>
      </button>${starBtn(w.id)}
    </div>`;
  }

  /* ---------- static text, tabs, chips ---------- */
  function applyStatic() {
    document.documentElement.lang = zh() ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = S()[el.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = S()[el.dataset.i18nHtml]; });
    $("#q").placeholder = S().search_ph;
    $("#langToggle").textContent = S().lang_toggle;
    const years = DATA.works.map((w) => w.year).filter(Boolean);
    $("#stats").innerHTML = [
      [S().stat_works, DATA.works.length], [S().stat_creators, DATA.creators.length],
      [S().stat_contract, DATA.works.filter((w) => w.field === "onchain" || w.field === "autonomous" || w.contract_url).length], [S().stat_video, DATA.works.filter((w) => w.video?.url).length],
      [S().stat_span, years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—"],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    $("#tabs").innerHTML = VIEWS.map((v) => `<button role="tab" class="tab" data-view="${v}">${esc(fieldById[v] ? nm(fieldById[v]) : S()["tab_" + v])}${v === "starred" ? ` <span class="tab__count mono" id="starCount"></span>` : ""}</button>`).join("");
    $("#generated").textContent = DATA.generated ? S().updated(DATA.generated) : "";
    $("#empty").textContent = S().empty;
  }
  function chipRow(label, items, cur, attr, skip) {
    const base = DATA.works.filter((w) => matches(w, skip));
    return `<div class="chiprow"><span class="chiprow__label mono">${esc(label)}</span><div class="chips">${items.map(([k, text, test]) => {
      const n = base.filter(test).length;
      return n || cur.has(k) ? `<button class="chip" data-${attr}="${esc(k)}" aria-pressed="${cur.has(k)}">${esc(text)}<small>${n}</small></button>` : "";
    }).join("")}</div></div>`;
  }
  function renderChips() {
    $("#facetChips").innerHTML =
      chipRow(S().f_field, FIELDS.map((f) => [f.id, nm(f), (w) => inField(w, f.id)]), state.fields, "field", "f") +
      chipRow(S().f_mechanism, MECHS.map(([k]) => [k, mechName(k), (w) => (w.mechanisms || []).includes(k)]), state.mechs, "mech", "m") +
      chipRow(S().f_substrate, SUBSTRATES.map(([k]) => [k, subsName(k), (w) => w.substrate === k]), state.subs, "substrate", "s") +
      chipRow(S().f_kind, TAX.kinds.map(([k]) => [k, kindName(k), (w) => w.kind === k]), state.kinds, "kind", "k") +
      (COLS.some(colCount) ? chipRow(S().f_collection, COLS.map((c) => [c.id, nm(c), (w) => (w.collections || []).includes(c.id)]), state.cols, "col", "c") : "");
    $("#eraChips").innerHTML = ERAS.map(([k, , , label]) => `<button class="chip" data-era="${k}" aria-pressed="${state.era === k}">${label}</button>`).join("");
    const ac = $("#activeCreator");
    ac.hidden = !state.creator;
    if (state.creator) ac.innerHTML = `${esc(S().showing_by)} <strong>${esc(creatorsById[state.creator]?.name || state.creator)}</strong> <button data-clear-creator>${esc(S().clear_creator)}</button>`;
  }

  /* ---------- views ---------- */
  const colCount = (c) => DATA.works.filter((w) => (w.collections || []).includes(c.id)).length;
  const colCard = (c) => { const n = colCount(c); return n ? `<button class="colcard" data-col-go="${esc(c.id)}">
      <span class="colcard__n mono">${n} · ${esc(S().col_types[c.type] || "")}</span><span class="colcard__title">${esc(nm(c))}</span>
      <span class="colcard__desc">${esc(zh() ? c.desc_zh : c.desc_en)}</span></button>` : ""; };
  function renderCollections() {
    currentList = [];
    const groups = ["exhibition", "survey", "registry", "venue", "award"].map((t) => [t, COLS.filter((c) => (c.type || "exhibition") === t && colCount(c))]).filter(([, cs]) => cs.length);
    $("#collectionList").innerHTML = `<div class="starred__head"><h2 class="starred__title">${esc(S().collections)}</h2><p class="starred__lede">${esc(S().collections_lede)}</p></div>` +
      groups.map(([t, cs]) => `<section class="scat"><div class="scat__head"><h3 class="scat__title">${esc(S().col_groups[t])}</h3><span class="scat__n mono">${cs.length}</span></div>
        <div class="cols__grid">${cs.map(colCard).join("")}</div></section>`).join("");
    return groups.length;
  }
  function renderAtlas() {
    currentList = [];
    const mechCards = MECHS.map(([k]) => { const n = DATA.works.filter((w) => (w.mechanisms || []).includes(k)).length; return n ? `<button class="colcard" data-mech-go="${esc(k)}">
        <span class="colcard__n mono">${n}</span><span class="colcard__title">${esc(mechName(k))}</span></button>` : ""; }).join("");
    $("#atlas").innerHTML = `<p class="keys__lede">${esc(S().atlas_lede)}</p><div class="atlas">${FIELDS.map((f, i) => {
      const ws = DATA.works.filter((w) => w.field === f.id);
      const shots = sorted(ws.filter(poster)).sort((a, b) => (b.images?.length ? 1 : 0) - (a.images?.length ? 1 : 0)).slice(0, 3);
      const subs = f.subs.map((s) => { const n = ws.filter((w) => w.sub === s.id).length; return n ? `<li><button data-go="${f.id}" data-go-sub="${s.id}">${esc(nm(s))}<small class="mono">${n}</small></button></li>` : ""; }).join("");
      return `<section class="fieldcard">
        <button class="fieldcard__media" data-go="${f.id}" aria-label="${esc(nm(f))}">${shots.map((w, j) => `<div class="kc__shot kc__shot--${"abc"[j]}">${thumb(w)}</div>`).join("")}
          <span class="br br--tl"></span><span class="br br--tr"></span><span class="br br--bl"></span><span class="br br--br"></span></button>
        <div class="fieldcard__body"><span class="fieldcard__num mono">0${i + 1}</span>
          <h2 class="fieldcard__title"><button data-go="${f.id}">${esc(nm(f))}</button></h2>
          <p class="fieldcard__desc">${esc(zh() ? f.desc_zh : f.desc_en)}</p>
          <ul class="sublist">${subs}</ul>
          <button class="tour__start mono" data-go="${f.id}">${esc(S().atlas_open(ws.length))}</button></div></section>`;
    }).join("")}</div>${mechCards ? `<section class="cols"><h2 class="scat__title">${esc(S().by_mechanism)}</h2><p class="scat__desc">${esc(S().by_mechanism_lede)}</p>
      <div class="cols__grid cols__grid--tight">${mechCards}</div></section>` : ""}${COLS.some(colCount) ? `<section class="cols"><h2 class="scat__title">${esc(S().collections)}</h2><p class="scat__desc">${esc(S().collections_lede)}</p>
      <div class="cols__grid">${COLS.map(colCard).join("")}</div></section>` : ""}`;
    return FIELDS.length;
  }
  function renderField(f) {
    const primary = sorted(DATA.works.filter((w) => w.field === f.id));
    const also = sorted(DATA.works.filter((w) => w.field !== f.id && (w.also || []).includes(f.id)));
    const known = new Set(f.subs.map((s) => s.id));
    const other = primary.filter((w) => !known.has(w.sub));
    const cats = [...f.subs, ...(other.length ? [{ id: "_other", en: S().other_cat, zh: S().other_cat, desc_en: "", desc_zh: "" }] : []),
      ...(also.length ? [{ id: "_also", en: S().also_title, zh: S().also_title, desc_en: S().also_desc, desc_zh: S().also_desc }] : [])];
    const listOf = (id) => (id === "_other" ? other : id === "_also" ? also : primary.filter((w) => w.sub === id));
    const chip = (id, label, n) => `<button class="chip" data-sub="${esc(id)}" aria-pressed="${state.sub === id}">${esc(label)}<small>${n}</small></button>`;
    $("#fieldHead").innerHTML = `<div class="starred__head"><h2 class="starred__title">${esc(nm(f))}</h2>
        <p class="starred__lede">${esc(zh() ? f.desc_zh : f.desc_en)}</p><p class="count mono">${esc(S().field_count(primary.length, also.length))}</p></div>
      <div class="chips scat-chips">${chip("", S().all_cats, primary.length + also.length)}${cats.map((c) => { const n = listOf(c.id).length; return n ? chip(c.id, nm(c), n) : ""; }).join("")}</div>`;
    const section = (c) => { const ws = listOf(c.id); return ws.length ? `<section class="scat"><div class="scat__head"><h3 class="scat__title">${esc(nm(c))}</h3><span class="scat__n mono">${ws.length}</span></div>
        <p class="scat__desc">${esc(zh() ? c.desc_zh : c.desc_en)}</p><div class="grid">${ws.map(card).join("")}</div></section>` : ""; };
    const shown = state.sub ? cats.filter((c) => c.id === state.sub) : cats;
    $("#fieldGrid").innerHTML = shown.map(section).join("");
    currentList = shown.flatMap((c) => listOf(c.id));
    return currentList.length;
  }
  function renderWorks() {
    currentList = sorted(DATA.works.filter((w) => matches(w)));
    $("#grid").innerHTML = currentList.map(card).join("");
    $("#worksCount").textContent = S().n_works(currentList.length);
    return currentList.length;
  }
  function renderTimeline() {
    currentList = DATA.works.filter((w) => matches(w)).sort((a, b) => (a.year || 9999) - (b.year || 9999) || a.title.localeCompare(b.title));
    const decades = [...new Set(currentList.map((w) => Math.floor((w.year || 0) / 10) * 10))];
    const row = (w) => `<li class="tl__row"><span class="tl__year mono">${w.year || ""}</span>
        <button class="tl__thumb" data-open="${esc(w.id)}" tabindex="-1" aria-hidden="true">${poster(w) ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(poster(w))}" alt="" onerror="this.remove()">` : ""}</button>
        <div class="tl__body"><button class="tl__title" data-open="${esc(w.id)}">${esc(w.title)}</button>
          <div class="tl__who mono">${esc(creatorNames(w).join(", "))} · ${esc(subsName(w.substrate))}</div>
          <div class="tl__idea">${esc(TX.work(w, lang).idea || "")}</div></div>
        <button class="tag tag--field tl__field" data-go="${esc(w.field)}" data-go-sub="${esc(w.sub || "")}">${esc(nm(fieldById[w.field] || {}))}</button></li>`;
    $("#timelineHead").innerHTML = `<p class="count mono">${esc(S().n_works(currentList.length))} · ${esc(S().timeline_lede)}</p>`;
    $("#timelineList").innerHTML = decades.map((d) => `<section class="tl__decade"><h3 class="tl__dhead mono">${d}s</h3>
      <ol class="tl__list">${currentList.filter((w) => Math.floor((w.year || 0) / 10) * 10 === d).map(row).join("")}</ol></section>`).join("");
    return currentList.length;
  }
  function renderCreators() {
    const q = state.q.toLowerCase();
    const rows = DATA.creators
      .map((c) => ({ c, works: sorted(DATA.works.filter((w) => w.creator_ids.includes(c.id) && matches(w))) }))
      .filter(({ c, works }) => works.length || (q && [c.name, c.bio, c.bio_zh, c.role].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => b.works.length - a.works.length || a.c.name.localeCompare(b.c.name));
    currentList = rows.flatMap((r) => r.works);
    $("#creatorList").innerHTML = rows.map(({ c, works }) => {
      const t = TX.creator(c, lang);
      const links = Object.entries(c.links || {}).filter(([, u]) => u).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(k)} ↗</a>`).join("");
      const conn = (c.connected_to || []).filter((id) => creatorsById[id]).map((id) => `<button data-creator="${esc(id)}">${esc(creatorsById[id].name)}</button>`).join("");
      const kind = c.kind ? S()["kind_" + c.kind] || "" : "";
      return `<article class="creator" id="c-${esc(c.id)}"><div>
          <h2 class="creator__name"><button data-creator="${esc(c.id)}">${esc(c.name)}</button></h2>
          <p class="creator__role">${kind ? esc(kind) + " · " : ""}${esc(t.role || "")}${t.based ? " · " + esc(t.based) : ""} · ${esc(S().n_works(works.length))}</p>
          ${t.bio ? `<p class="creator__bio">${esc(t.bio)}</p>` : ""}
          ${t.why ? `<p class="creator__why">${esc(t.why)}</p>` : ""}
          <div class="links">${links}</div>
          ${conn ? `<div class="web">${esc(S().connected)} ${conn}</div>` : ""}
        </div><div class="strip">${works.map(card).join("")}</div></article>`;
    }).join("");
    return rows.length;
  }
  function renderStarred() {
    const list = DATA.works.filter((w) => stars.has(w.id));
    currentList = list;
    $("#starredHead").innerHTML = `<div class="starred__head">
        <h2 class="starred__title">${esc(S().starred_title)}</h2><p class="starred__lede">${esc(S().starred_lede)}</p>
        ${list.length ? `<div class="starred__actions">
          <button class="btn btn--accent mono" data-export="skill">${esc(S().export_skill)}</button>
          <button class="btn mono" data-export="readme">${esc(S().export_readme)}</button>
          <button class="btn mono" data-export="list">${esc(S().export_bib)}</button>
          <button class="btn mono" data-export="copy">${esc(S().copy_md)}</button>
          <button class="btn btn--quiet mono" data-export="clear">${esc(S().clear_stars)}</button></div>` : `<p class="starred__empty">${esc(S().starred_empty)}</p>`}</div>`;
    $("#starGrid").innerHTML = list.map(card).join("");
    return 1;
  }

  function render() {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.view === state.view));
    const f = fieldById[state.view];
    const pane = f ? "field" : state.view;
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-on", v.id === "view-" + pane));
    $("#q").value = state.q;
    $("#sort").value = state.sort;
    $("#filters").hidden = !FILTERED.includes(state.view);
    $("#sort").hidden = state.view === "timeline";
    $("#hasVideo").setAttribute("aria-pressed", state.video);
    $("#hasContract").setAttribute("aria-pressed", state.contract);
    $("#starCount").textContent = stars.size ? stars.size : "";
    renderChips();
    const n = f ? renderField(f) : { atlas: renderAtlas, timeline: renderTimeline, collections: renderCollections, works: renderWorks, creators: renderCreators, starred: renderStarred }[state.view]();
    $("#empty").hidden = n > 0;
    lazyVideos();
    writeHash();
  }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.src = e.target.dataset.src; e.target.preload = "metadata"; io.unobserve(e.target); } });
  }, { rootMargin: "300px" }) : null;
  function lazyVideos() { document.querySelectorAll("video[data-src]:not([src])").forEach((v) => (io ? io.observe(v) : (v.src = v.dataset.src))); }

  /* ---------- player ---------- */
  function embed(v) {
    if (v.embeddable === false) {
      return `<a class="offsite" href="${esc(v.url)}" target="_blank" rel="noopener">${v.thumbnail ? `<img referrerpolicy="no-referrer" src="${esc(v.thumbnail)}" alt="">` : ""}
        <span class="offsite__btn mono">${esc(S().play_on(src(v.platform)))}</span><span class="offsite__note mono">${esc(S().only_on(src(v.platform)))}</span></a>`;
    }
    switch (v.platform) {
      case "youtube": return `<iframe class="frame" src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?autoplay=1&rel=0&playsinline=1" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="Video"></iframe>`;
      case "vimeo": return `<iframe class="frame" src="https://player.vimeo.com/video/${esc(v.id)}?autoplay=1&dnt=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>`;
      case "x": {
        const light = document.documentElement.dataset.theme === "light" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: light)").matches);
        return `<iframe class="frame frame--tweet" src="https://platform.twitter.com/embed/Tweet.html?id=${esc(v.id)}&theme=${light ? "light" : "dark"}&dnt=true&lang=${lang}" allowfullscreen title="Post"></iframe>`;
      }
      case "mp4": return `<video src="${esc(v.url)}" controls autoplay playsinline></video>`;
      default: return `<a class="watch" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(S().watch_on(src(v.platform)))}</a>`;
    }
  }
  const mediaItems = (w) => [...(w.video?.url ? [{ type: "video" }] : []), ...(w.images || []).map((u) => ({ type: "image", url: u }))];
  function showMedia(w) {
    const items = mediaItems(w);
    const m = items[mediaIndex];
    let main;
    if (!m) main = `<div class="paperview"><span class="mono ph__venue">${esc(w.paper?.venue || kindName(w.kind))}</span><h3>${esc(w.title)}</h3>
      <p class="mono">${esc(creatorNames(w).join(", "))}${w.year ? ` · ${w.year}` : ""}</p>${w.paper?.url ? `<a class="btn btn--accent mono" href="${esc(w.paper.url)}" target="_blank" rel="noopener">${esc(S().read_paper)}</a>` : ""}</div>`;
    else if (m.type === "video") main = embed(w.video);
    else main = `<img class="player__img" referrerpolicy="no-referrer" src="${esc(m.url)}" alt="${esc(w.title)}">`;
    const strip = items.length > 1 ? `<div class="mstrip">${items.map((it, i) => `<button class="mstrip__item" data-media="${i}" aria-pressed="${i === mediaIndex}">
        ${it.type === "video" ? (w.video.thumbnail ? `<img referrerpolicy="no-referrer" src="${esc(w.video.thumbnail)}" alt="">` : "") + '<span class="mstrip__play">▶</span>' : `<img referrerpolicy="no-referrer" src="${esc(it.url)}" alt="">`}</button>`).join("")}</div>` : "";
    $("#playerMedia").innerHTML = `<div class="player__main">${main}</div>${strip}`;
  }
  function openWork(id) {
    const list = currentList.length ? currentList : DATA.works;
    openIndex = list.findIndex((w) => w.id === id);
    const w = list[openIndex] || worksById[id];
    if (!w) return;
    mediaIndex = 0;
    $("#player").dataset.id = w.id;
    showMedia(w);
    fillInfo(w);
    if (!$("#player").open) $("#player").showModal();
    writeHash(w.id);
  }
  function fillInfo(w) {
    const t = TX.work(w, lang);
    const who = w.creator_ids.map((cid) => `<button data-creator="${esc(cid)}">${esc(creatorsById[cid]?.name || cid)}</button>`).join("");
    const note = (label, body, cls = "") => (body ? `<div class="note ${cls}"><b>${esc(label)}</b><p>${esc(body)}</p></div>` : "");
    const f = fieldById[w.field] || {};
    const fieldTags = [`<button class="tag tag--field" data-go="${esc(w.field)}" data-go-sub="${esc(w.sub || "")}">${esc(nm(f))}${subOf(w) ? " / " + esc(nm(subOf(w))) : ""}</button>`,
      ...(w.also || []).map((a) => `<button class="tag tag--field" data-go="${esc(a)}">${esc(nm(fieldById[a] || {}))}</button>`)].join("");
    const mechs = (w.mechanisms || []).map((m) => `<button class="tag tag--col" data-mech-go="${esc(m)}">↳ ${esc(mechName(m))}</button>`).join("");
    const kws = (w.keywords || []).map((k) => `<span class="tag">${esc(k)}</span>`).join("");
    const colTags = (w.collections || []).map((id) => COLS.find((c) => c.id === id)).filter(Boolean).map((c) => `<button class="tag tag--col" data-col-go="${esc(c.id)}">◎ ${esc(nm(c))}</button>`).join("");
    const survey = COLS.find((c) => c.work === w.id);
    const surveyN = survey ? DATA.works.filter((x) => (x.collections || []).includes(survey.id) && x.id !== w.id).length : 0;
    const p = w.paper || {};
    const link = (href, label, cls = "watch") => (href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${label}</a>` : "");
    $("#playerInfo").innerHTML = `
      <div class="meta">${w.year || ""} · ${esc(kindName(w.kind))} · ${esc(subsName(w.substrate))}</div>
      <h2>${esc(w.title)}</h2>
      <div class="who">${who}</div>
      ${starBtn(w.id, "star-inline mono")}
      ${t.description ? `<p>${esc(t.description)}</p>` : ""}
      ${note(S().idea, t.idea)}${note(S().protocol, t.protocol, "note--protocol")}${note(S().collective, t.collective, "note--collective")}
      ${survey && surveyN ? `<button class="tour__start mono survey-btn" data-col-go="${esc(survey.id)}">${esc(S().survey_works(surveyN))}</button>` : ""}
      <div class="tags">${fieldTags}</div><div class="tags">${mechs}</div>${colTags ? `<div class="tags">${colTags}</div>` : ""}<div class="tags">${kws}</div>
      <div class="actions">
        ${p.url ? `<a class="watch watch--paper" href="${esc(p.url)}" target="_blank" rel="noopener">¶ ${esc(S().read_paper)}${p.title && p.title !== w.title ? `<span class="watch__sub watch__ptitle">${esc(p.title)}</span>` : ""}${p.venue || p.doi ? `<span class="watch__sub">${esc(p.venue || "")}${p.venue && p.doi ? " · " : ""}${p.doi ? "doi:" + esc(p.doi) : ""}</span>` : ""}</a>` : ""}
        ${w.video?.url ? link(w.video.url, esc(S().watch_on(src(w.video.platform)))) : ""}
        ${link(w.source_url, esc(S().project_page))}
        ${link(w.contract_url, "⛓ " + esc(S().contract))}
        ${link(w.code_url, esc(S().source_code))}
      </div>`;
    document.querySelectorAll(".star-inline").forEach((b) => { b.textContent = stars.has(w.id) ? S().starred : S().star; });
  }
  function closeWork() { $("#playerMedia").innerHTML = ""; if ($("#player").open) $("#player").close(); writeHash(); }
  function step(d) {
    const list = currentList.length ? currentList : DATA.works;
    if (openIndex < 0) return;
    openWork(list[(openIndex + d + list.length) % list.length].id);
  }

  /* ---------- stars + export ---------- */
  function toggleStar(id) {
    stars.has(id) ? stars.delete(id) : stars.add(id);
    store.set("proto-stars", [...stars]);
    document.querySelectorAll(`[data-star="${CSS.escape(id)}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", stars.has(id));
      b.textContent = b.classList.contains("star-inline") ? (stars.has(id) ? S().starred : S().star) : (stars.has(id) ? "★" : "☆");
    });
    $("#starCount").textContent = stars.size ? stars.size : "";
    if (state.view === "starred" && !$("#player").open) render();
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
  }
  function download(name, body) {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" })), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(S().downloaded(name));
  }
  let clearArmed = false;
  function doExport(kind) {
    const list = DATA.works.filter((w) => stars.has(w.id));
    const X = window.ProtoExport;
    if (kind === "skill") download("SKILL.md", X.skillMd(list, DATA, lang));
    if (kind === "readme") download("README.md", X.readmeMd(list, DATA, lang));
    if (kind === "list") download("reading-list.md", X.readingList(list, DATA, lang));
    if (kind === "copy") { const md = X.skillMd(list, DATA, lang); navigator.clipboard?.writeText(md).then(() => toast(S().copied), () => download("SKILL.md", md)); }
    if (kind === "clear") {
      if (!clearArmed) { clearArmed = true; toast(S().confirm_clear); setTimeout(() => { clearArmed = false; }, 3000); return; }
      stars = new Set(); store.set("proto-stars", []); clearArmed = false; toast(S().cleared); render();
    }
  }

  /* ---------- events ---------- */
  const toggle = (s, k) => (s.has(k) ? s.delete(k) : s.add(k));
  function go(view, sub = "") { state.view = view; state.sub = sub; closeWork(); render(); window.scrollTo({ top: $("#tabs").offsetTop, behavior: "smooth" }); }
  function goFiltered(patch) { Object.assign(state, EMPTY_FILTERS(), patch); go("works"); }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const d = t.dataset;
    if (d.star) return toggleStar(d.star);
    if (d.export) return doExport(d.export);
    if (t.classList.contains("tab")) { state.view = d.view; state.sub = ""; return render(); }
    if (d.go) return go(d.go, d.goSub || "");
    if (d.sub !== undefined) { state.sub = d.sub; return render(); }
    if (d.field) { toggle(state.fields, d.field); return render(); }
    if (d.mech) { toggle(state.mechs, d.mech); return render(); }
    if (d.substrate) { toggle(state.subs, d.substrate); return render(); }
    if (d.col) { toggle(state.cols, d.col); return render(); }
    if (d.kind) { toggle(state.kinds, d.kind); return render(); }
    if (d.mechGo) return goFiltered({ mechs: new Set([d.mechGo]) });
    if (d.colGo) return goFiltered({ cols: new Set([d.colGo]) });
    if (d.era) { state.era = state.era === d.era ? "" : d.era; return render(); }
    if (d.media !== undefined) { mediaIndex = +d.media; return showMedia(worksById[$("#player").dataset.id]); }
    if (d.open) return openWork(d.open);
    if (d.creator) return goFiltered({ creator: d.creator });
    if ("clearCreator" in d) { state.creator = ""; return render(); }
    if (t.classList.contains("card")) return openWork(d.id);
  });
  $("#clear").addEventListener("click", () => { Object.assign(state, EMPTY_FILTERS()); render(); });
  $("#hasVideo").addEventListener("click", () => { state.video = !state.video; render(); });
  $("#hasContract").addEventListener("click", () => { state.contract = !state.contract; render(); });
  let qTimer;
  $("#q").addEventListener("input", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 160); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("#playerClose").addEventListener("click", closeWork);
  $("#prev").addEventListener("click", () => step(-1));
  $("#next").addEventListener("click", () => step(1));
  $("#player").addEventListener("close", () => { $("#playerMedia").innerHTML = ""; writeHash(); });
  $("#player").addEventListener("click", (e) => { if (e.target.id === "player") closeWork(); });
  document.addEventListener("keydown", (e) => {
    if (!$("#player").open) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  $("#langToggle").addEventListener("click", () => {
    lang = zh() ? "en" : "zh";
    store.set("proto-lang", lang);
    applyStatic();
    render();
    if ($("#player").open) { const w = worksById[$("#player").dataset.id]; if (w) fillInfo(w); }
  });
  const savedTheme = store.get("proto-theme", null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("#themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    store.set("proto-theme", next);
  });

  /* ---------- init ---------- */
  function fromHash() {
    const start = readHash();
    render();
    if (start.work) openWork(start.work);
    else if ($("#player").open) closeWork();
  }
  applyStatic();
  fromHash();
  window.addEventListener("hashchange", fromHash); // writeHash uses replaceState, which does not fire this
})();
