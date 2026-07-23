// קישור בין תיבות כתיבה חופשית בסיכומים (סיפור נושא / פירוט+מסקנות של עניין / בלוק כתיבה חופשית
// עצמאי) לבין הודעות בתיעוד רגשי. כל צד שומר הפניה זה לזה, כדי שאפשר יהיה לנווט מכל צד לצד השני.
// נשען על הפונקציות הגלובליות של שני המודולים (loadSummaries/saveSummaries/loadChatList/
// saveChatList) שכבר קיימות ב-storage.js

function summaryLinkLabel(summary) {
  const topic = (summary.topic || "").trim() || "(ללא נושא)";
  const date = summary.sessionDate ? formatDateHe(summary.sessionDate) : formatTimestamp(summary.createdAt);
  return `${topic} — ${date}`;
}

// הודעה מוגנת ("הגנה") מציגה תמיד את הנושא שלה בלבד, לא קטע מהטקסט המוסתר עצמו
function emotionalMsgLinkLabel(msg) {
  if (msg.protected) {
    const topic = (msg.topic || "").trim() || "(ללא נושא)";
    return `🔒 ${topic} — ${formatTimestamp(msg.createdAt)}`;
  }
  const text = (msg.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const snippet = text.length > 40 ? text.slice(0, 40) + "…" : text || "(הודעה ריקה)";
  return `${snippet} — ${formatTimestamp(msg.createdAt)}`;
}

// חלונית חיפוש/בחירה גנרית - candidates = [{id, label, ...}], onPick(candidate) נקרא בבחירה
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

// מאתרת אובייקט נושא/עניין ספציפי בתוך סיכום שמור, לפי המזהה שלו
function findSummaryBox(summary, boxId) {
  let found = null;
  (summary.topics || []).forEach((topic) => {
    if (topic.id === boxId) found = topic;
    (topic.items || []).forEach((item) => {
      if (item.id === boxId) found = item;
    });
  });
  return found;
}

// --- קישור מתיבת כתיבה חופשית בסיכום (topic.links / item.links) להודעת תיעוד רגשי ---
function addLinkFromSummaryBoxToEmotional(summary, box, boxLabel, onDone) {
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
    if (!box.links) box.links = [];
    if (!box.links.some((l) => l.type === "emotional" && l.id === choice.id)) {
      box.links.push({ type: "emotional", id: choice.id, label: choice.label });
    }
    const msg = msgs.find((m) => m.id === choice.id);
    if (msg) {
      if (!msg.links) msg.links = [];
      if (!msg.links.some((l) => l.boxId === box.id)) {
        msg.links.push({ type: "summaryBox", summaryId: summary.id, boxId: box.id, label: boxLabel });
      }
      saveChatList(STORE_KEYS.emotional, msgs);
    }
    onDone();
  });
}

function removeLinkFromSummaryBox(box, linkId, onDone) {
  box.links = (box.links || []).filter((l) => l.id !== linkId);
  const msgs = loadChatList(STORE_KEYS.emotional);
  const msg = msgs.find((m) => m.id === linkId);
  if (msg) {
    msg.links = (msg.links || []).filter((l) => l.boxId !== box.id);
    saveChatList(STORE_KEYS.emotional, msgs);
  }
  onDone();
}

// --- קישור מהודעת תיעוד רגשי לתיבת כתיבה חופשית בסיכום ---
function addLinkFromEmotionalToSummaryBox(msg, onDone) {
  const summaries = loadSummaries();
  const candidates = [];
  summaries.forEach((summary) => {
    const summaryLabel = summaryLinkLabel(summary);
    (summary.topics || []).forEach((topic) => {
      if (summaryNotesHasContent(topic.storyHtml)) {
        candidates.push({
          id: topic.id,
          label: `📖 סיפור: ${topic.title || "(ללא כותרת)"} — ${summaryLabel}`,
          summaryId: summary.id,
          boxRef: topic
        });
      }
      (topic.items || []).forEach((item) => {
        if (item.type === "freewrite") {
          if (summaryNotesHasContent(item.html)) {
            candidates.push({
              id: item.id,
              label: `✍️ כתיבה חופשית — ${summaryLabel}`,
              summaryId: summary.id,
              boxRef: item
            });
          }
        } else if (summaryNotesHasContent(item.notesHtml) || summaryNotesHasContent(item.conclusionsHtml)) {
          candidates.push({
            id: item.id,
            label: `📝 ${item.text || "עניין ללא שם"} — ${summaryLabel}`,
            summaryId: summary.id,
            boxRef: item
          });
        }
      });
    });
  });
  if (candidates.length === 0) {
    alert("אין עדיין תיבות כתיבה עם תוכן בסיכומים לקשר אליהן.");
    return;
  }
  openLinkPickerModal("קישור לתיבת כתיבה בסיכומים", candidates, (choice) => {
    if (!msg.links) msg.links = [];
    if (!msg.links.some((l) => l.boxId === choice.id)) {
      msg.links.push({ type: "summaryBox", summaryId: choice.summaryId, boxId: choice.id, label: choice.label });
    }
    const box = choice.boxRef;
    if (!box.links) box.links = [];
    if (!box.links.some((l) => l.type === "emotional" && l.id === msg.id)) {
      box.links.push({ type: "emotional", id: msg.id, label: emotionalMsgLinkLabel(msg) });
    }
    saveSummaries(summaries);
    onDone();
  });
}

function removeLinkFromEmotionalMsg(msg, link, onDone) {
  msg.links = (msg.links || []).filter((l) => l.boxId !== link.boxId);
  const summaries = loadSummaries();
  const summary = summaries.find((s) => s.id === link.summaryId);
  if (summary) {
    const box = findSummaryBox(summary, link.boxId);
    if (box) {
      box.links = (box.links || []).filter((l) => l.id !== msg.id);
      saveSummaries(summaries);
    }
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

function flashLinkTarget(target) {
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("link-jump-highlight");
  setTimeout(() => target.classList.remove("link-jump-highlight"), 2000);
}

// ניווט אל הודעת תיעוד רגשי ספציפית לפי מזהה - עובר לסקשן ואז מאתר את הבועה בפועל
function jumpToEmotionalMessage(msgId) {
  showSection("emotional");
  requestAnimationFrame(() => {
    const bubble = document.querySelector(`#emotional-view .chat-bubble[data-msg-id="${msgId}"]`);
    flashLinkTarget(bubble);
  });
}

// ניווט אל תיבת כתיבה חופשית ספציפית בתוך רשומת סיכום בארכיון - עובר ללשונית הארכיונים,
// פותח את הרשומה אם סגורה, ומגלגל אל התיבה הספציפית בתוכה (אם נמצאה)
function jumpToSummaryArchiveItem(summaryId, boxId) {
  showSection("summaries");
  requestAnimationFrame(() => {
    if (window.activateSummariesArchiveTab) window.activateSummariesArchiveTab();
    requestAnimationFrame(() => {
      const card = document.querySelector(`.archive-item[data-summary-id="${summaryId}"]`);
      if (!card) return;
      const toggleBtn = card.querySelector(".summary-archive-toggle");
      const body = card.querySelector(".archive-item-body");
      if (body && body.classList.contains("is-collapsed") && toggleBtn) toggleBtn.click();
      requestAnimationFrame(() => {
        let target = card;
        if (boxId) {
          const boxEl = card.querySelector(`[data-topic-id="${boxId}"], [data-item-id="${boxId}"]`);
          if (boxEl) target = boxEl;
        }
        flashLinkTarget(target);
      });
    });
  });
}
