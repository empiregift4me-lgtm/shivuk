// קישור בין רשומות בסיכומים לבין הודעות בתיעוד רגשי - כל צד שומר הפניה זה לזה, כדי שאפשר
// יהיה לנווט מכל צד לצד השני. נשען על הפונקציות הגלובליות של שני המודולים (loadSummaries/
// saveSummaries/loadChatList/saveChatList) שכבר קיימות ב-storage.js

function summaryLinkLabel(summary) {
  const topic = (summary.topic || "").trim() || "(ללא נושא)";
  const date = summary.sessionDate ? formatDateHe(summary.sessionDate) : formatTimestamp(summary.createdAt);
  return `${topic} — ${date}`;
}

function emotionalMsgLinkLabel(msg) {
  const text = (msg.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const snippet = text.length > 40 ? text.slice(0, 40) + "…" : text || "(הודעה ריקה)";
  return `${snippet} — ${formatTimestamp(msg.createdAt)}`;
}

// חלונית חיפוש/בחירה גנרית - candidates = [{id, label}], onPick(candidate) נקרא בבחירה
function openLinkPickerModal(title, candidates, onPick) {
  const overlay = el("div", { class: "modal-overlay link-picker-overlay" });
  const modal = el("div", { class: "modal-box link-picker-box" });
  modal.appendChild(el("h3", { class: "modal-title", text: title }));

  const searchInput = el("input", {
    type: "text",
    class: "field-input link-picker-search",
    placeholder: "חיפוש לפי נושא/תאריך/טקסט..."
  });
  modal.appendChild(searchInput);

  const listEl = el("div", { class: "link-picker-list" });
  modal.appendChild(listEl);

  function renderList(filterText) {
    listEl.innerHTML = "";
    const q = (filterText || "").trim().toLowerCase();
    const filtered = q ? candidates.filter((c) => c.label.toLowerCase().includes(q)) : candidates;
    if (filtered.length === 0) {
      listEl.appendChild(el("div", { class: "empty-state", text: "לא נמצאו תוצאות." }));
      return;
    }
    filtered.forEach((c) => {
      const row = el("button", { type: "button", class: "link-picker-row", text: c.label });
      row.addEventListener("click", () => {
        onPick(c);
        overlay.remove();
      });
      listEl.appendChild(row);
    });
  }
  renderList("");
  searchInput.addEventListener("input", () => renderList(searchInput.value));

  modal.appendChild(
    el("button", { class: "btn btn-secondary", type: "button", text: "ביטול", onclick: () => overlay.remove() })
  );
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => searchInput.focus());
}

function addLinkFromSummaryToEmotional(summary, onDone) {
  const msgs = loadChatList(STORE_KEYS.emotional);
  if (msgs.length === 0) {
    alert("אין עדיין הודעות בתיעוד רגשי לקשר אליהן.");
    return;
  }
  const candidates = msgs
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((m) => ({ id: m.id, label: emotionalMsgLinkLabel(m) }));
  openLinkPickerModal("קישור להודעה בתיעוד רגשי", candidates, (choice) => {
    if (!summary.links) summary.links = [];
    if (!summary.links.some((l) => l.type === "emotional" && l.id === choice.id)) {
      summary.links.push({ type: "emotional", id: choice.id, label: choice.label });
    }
    const msg = msgs.find((m) => m.id === choice.id);
    if (msg) {
      if (!msg.links) msg.links = [];
      if (!msg.links.some((l) => l.type === "summary" && l.id === summary.id)) {
        msg.links.push({ type: "summary", id: summary.id, label: summaryLinkLabel(summary) });
      }
      saveChatList(STORE_KEYS.emotional, msgs);
    }
    onDone();
  });
}

function addLinkFromEmotionalToSummary(msg, onDone) {
  const summaries = loadSummaries();
  if (summaries.length === 0) {
    alert("אין עדיין סיכומים שמורים לקשר אליהם.");
    return;
  }
  const candidates = summaries
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => ({ id: s.id, label: summaryLinkLabel(s) }));
  openLinkPickerModal("קישור לסיכום", candidates, (choice) => {
    if (!msg.links) msg.links = [];
    if (!msg.links.some((l) => l.type === "summary" && l.id === choice.id)) {
      msg.links.push({ type: "summary", id: choice.id, label: choice.label });
    }
    const all = loadSummaries();
    const summary = all.find((s) => s.id === choice.id);
    if (summary) {
      if (!summary.links) summary.links = [];
      if (!summary.links.some((l) => l.type === "emotional" && l.id === msg.id)) {
        summary.links.push({ type: "emotional", id: msg.id, label: emotionalMsgLinkLabel(msg) });
      }
      saveSummaries(all);
    }
    onDone();
  });
}

function removeLinkFromSummary(summary, linkId, onDone) {
  summary.links = (summary.links || []).filter((l) => l.id !== linkId);
  const msgs = loadChatList(STORE_KEYS.emotional);
  const msg = msgs.find((m) => m.id === linkId);
  if (msg) {
    msg.links = (msg.links || []).filter((l) => l.id !== summary.id);
    saveChatList(STORE_KEYS.emotional, msgs);
  }
  onDone();
}

function removeLinkFromEmotionalMsg(msg, linkId, onDone) {
  msg.links = (msg.links || []).filter((l) => l.id !== linkId);
  const summaries = loadSummaries();
  const summary = summaries.find((s) => s.id === linkId);
  if (summary) {
    summary.links = (summary.links || []).filter((l) => l.id !== msg.id);
    saveSummaries(summaries);
  }
  onDone();
}

// בונה שורת "צ'יפים" של קישורים קיימים - לחיצה על הצ'יפ מנווטת אל הרשומה המקושרת,
// לחיצה על ה-✕ מסירה את הקישור (משני הצדדים)
function renderLinkChips(links, onNavigate, onRemove) {
  if (!links || links.length === 0) return null;
  const row = el("div", { class: "link-chips-row" });
  links.forEach((link) => {
    const chip = el("span", { class: "link-chip" });
    const label = el("button", {
      type: "button",
      class: "link-chip-label",
      text: `🔗 ${link.label}`,
      onclick: () => onNavigate(link)
    });
    const removeBtn = el("button", {
      type: "button",
      class: "link-chip-remove",
      text: "✕",
      title: "הסרת הקישור",
      onclick: () => onRemove(link)
    });
    chip.appendChild(label);
    chip.appendChild(removeBtn);
    row.appendChild(chip);
  });
  return row;
}

function flashLinkTarget(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("link-jump-highlight");
  setTimeout(() => el.classList.remove("link-jump-highlight"), 2000);
}

// ניווט אל הודעת תיעוד רגשי ספציפית לפי מזהה - עובר לסקשן ואז מאתר את הבועה בפועל
function jumpToEmotionalMessage(msgId) {
  showSection("emotional");
  requestAnimationFrame(() => {
    const bubble = document.querySelector(`#emotional-view .chat-bubble[data-msg-id="${msgId}"]`);
    flashLinkTarget(bubble);
  });
}

// ניווט אל רשומת סיכום בארכיון לפי מזהה - עובר ללשונית הארכיונים, פותח את הרשומה אם סגורה, וגולל אליה
function jumpToSummaryArchiveItem(summaryId) {
  showSection("summaries");
  requestAnimationFrame(() => {
    if (window.activateSummariesArchiveTab) window.activateSummariesArchiveTab();
    requestAnimationFrame(() => {
      const card = document.querySelector(`.archive-item[data-summary-id="${summaryId}"]`);
      if (!card) return;
      const toggleBtn = card.querySelector(".summary-archive-toggle");
      const body = card.querySelector(".archive-item-body");
      if (body && body.classList.contains("is-collapsed") && toggleBtn) toggleBtn.click();
      flashLinkTarget(card);
    });
  });
}
