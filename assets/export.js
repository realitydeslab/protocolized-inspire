/* Protocolized Inspire — language-aware field access and Markdown export (SKILL.md / README.md / reading list). */
(() => {
  "use strict";
  const SITE = "https://protocolized.reality.design";

  const text = {
    work(w, lang) {
      const zh = lang === "zh";
      return { description: zh ? w.description_zh : w.description, idea: zh ? w.idea_zh : w.idea_en,
        protocol: zh ? w.protocol_zh : w.protocol, collective: zh ? w.collective_zh : w.collective };
    },
    creator(c, lang) {
      const zh = lang === "zh";
      return { role: zh ? c.role_zh : c.role, bio: zh ? c.bio_zh : c.bio, why: zh ? c.why_zh : c.why, based: zh ? c.based_zh : c.based };
    },
  };

  const L = {
    en: {
      skillDesc: (n) => `${n} protocol artworks I starred in Protocolized Inspire (${SITE}): instructions, scores, social protocols, crowd works, smart-contract art and DAOs. For each: what it is, its core idea, the protocol (rules), what the collective did, and links. Use when designing participatory systems, smart-contract art, games or DAOs, or when writing about protocol art.`,
      skillTitle: "Protocol art: my starred works",
      source: (d, n) => `Source: ${SITE} · exported ${d} · ${n} works.`,
      howTitle: "How to use this skill",
      how: [
        "Start from these works and name the work and creator you build on.",
        "Keep the protocol (the rules) apart from the collective behaviour it produced.",
        "Propose new protocols by combining mechanisms and substrates from two or more works, and say what behaviour you expect.",
        "Do not invent numbers, prices or contract addresses that are not listed here.",
      ],
      field: "Field", mechanisms: "Mechanisms", substrate: "Substrate", idea: "Idea", what: "What it is",
      protocol: "Protocol", collective: "What the collective did",
      paper: "Text", video: "Video", page: "Project page", contract: "Contract",
      readmeTitle: "My picks from Protocolized Inspire",
      readmeIntro: (n) => `${n} works I starred on ${SITE}. For an AI assistant, load the companion SKILL.md.`,
      listTitle: "Reading list — Protocolized Inspire",
    },
    zh: {
      skillDesc: (n) => `我在 Protocolized Inspire（${SITE}）收藏的 ${n} 件协议艺术作品，涵盖指令、乐谱、社会协议、群体作品、智能合约艺术与 DAO。每件作品包括：内容、核心想法、协议（规则）、群体做了什么，以及相关链接。在设计参与式系统、智能合约艺术、游戏或 DAO，或撰写协议艺术相关文字时使用。`,
      skillTitle: "协议艺术：我的收藏",
      source: (d, n) => `来源：${SITE} · 导出于 ${d} · 共 ${n} 件作品。`,
      howTitle: "如何使用这个 skill",
      how: [
        "从这些作品出发，并说明借鉴的是哪件作品、哪位创作者。",
        "把协议（规则）和它引发的群体行为分开来看。",
        "把两件或更多作品的机制和载体组合起来，提出新的协议，并说明预期会出现什么行为。",
        "不要编造这里没有列出的数字、价格或合约地址。",
      ],
      field: "领域", mechanisms: "机制", substrate: "载体", idea: "核心想法", what: "作品内容",
      protocol: "协议", collective: "群体做了什么",
      paper: "文本", video: "视频", page: "项目主页", contract: "合约",
      readmeTitle: "我在 Protocolized Inspire 的收藏",
      readmeIntro: (n) => `我在 ${SITE} 收藏的 ${n} 件作品。给 AI 助手使用时，请加载配套的 SKILL.md。`,
      listTitle: "阅读清单 — Protocolized Inspire",
    },
  };

  const label = (pairs, k, zh) => { const r = (pairs || []).find((p) => p[0] === k); return r ? (zh ? r[2] : r[1]) : k; };
  const fieldName = (data, id, zh) => { const f = data.taxonomy.fields.find((x) => x.id === id); return f ? (zh ? f.zh : f.en) : id; };
  const subName = (data, w, zh) => {
    const f = data.taxonomy.fields.find((x) => x.id === w.field);
    const s = f && f.subs.find((x) => x.id === w.sub);
    return s ? (zh ? s.zh : s.en) : "";
  };
  const names = (w, data) => w.creator_ids.map((id) => (data.creators.find((c) => c.id === id) || {}).name || id).join(", ");

  function block(w, data, lang) {
    const s = L[lang], zh = lang === "zh", t = text.work(w, lang), tax = data.taxonomy;
    const p = w.paper || {};
    return [
      `### ${w.title} — ${names(w, data)}${w.year ? ` (${w.year})` : ""}`,
      `- ${s.field}: ${fieldName(data, w.field, zh)} / ${subName(data, w, zh)}`,
      `- ${s.mechanisms}: ${(w.mechanisms || []).map((m) => label(tax.mechanisms, m, zh)).join(", ")} · ${s.substrate}: ${label(tax.substrates, w.substrate, zh)}`,
      t.idea ? `- ${s.idea}: ${t.idea}` : "",
      t.description ? `- ${s.what}: ${t.description}` : "",
      t.protocol ? `- ${s.protocol}: ${t.protocol}` : "",
      t.collective ? `- ${s.collective}: ${t.collective}` : "",
      p.url ? `- ${s.paper}: ${p.url}${p.venue ? ` (${p.venue})` : ""}` : "",
      w.video && w.video.url ? `- ${s.video}: ${w.video.url}` : "",
      w.source_url ? `- ${s.page}: ${w.source_url}` : "",
      w.contract_url ? `- ${s.contract}: ${w.contract_url}` : "",
    ].filter(Boolean).join("\n");
  }
  const today = () => new Date().toISOString().slice(0, 10);

  function skillMd(list, data, lang) {
    const s = L[lang];
    return [
      "---", "name: protocol-art-inspiration", `description: ${s.skillDesc(list.length)}`, "---", "",
      `# ${s.skillTitle}`, "", s.source(today(), list.length), "", `## ${s.howTitle}`, "",
      ...s.how.map((x) => `- ${x}`), "", ...list.map((w) => block(w, data, lang) + "\n"),
    ].join("\n");
  }
  function readmeMd(list, data, lang) {
    const s = L[lang];
    return [`# ${s.readmeTitle}`, "", s.readmeIntro(list.length), "", ...list.map((w) => block(w, data, lang) + "\n")].join("\n");
  }
  function readingList(list, data, lang) {
    const s = L[lang];
    const rows = [...list].sort((a, b) => (a.year || 0) - (b.year || 0))
      .map((w) => { const link = (w.paper && w.paper.url) || w.source_url || ""; return `- ${names(w, data)} (${w.year || "n.d."}). *${w.title}*.${w.paper && w.paper.venue ? ` ${w.paper.venue}.` : ""}${link ? ` ${link}` : ""}`; });
    return [`# ${s.listTitle}`, "", s.source(today(), rows.length), "", ...rows, ""].join("\n");
  }

  window.ProtoText = text;
  window.ProtoExport = { skillMd, readmeMd, readingList };
})();
