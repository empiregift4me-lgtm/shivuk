// מודול צ'אט עם עצמך - גנרי, משמש גם ל"החלטות עסקיות חשובות" וגם ל"תיעוד רגשי"
// הודעות עם חותמת זמן, תיבת כתיבה עשירה למטה, Ctrl+Enter לשליחה

function initChatView(container, listKey, draftKey) {
  container.innerHTML = "";
  const wrap = el("div", { class: "chat-wrap" });
  const feed = el("div", { class: "chat-feed" });
  wrap.appendChild(feed);

  const composeArea = el("div", { class: "chat-compose" });
  const editable = el("div", { class: "chat-editable", contenteditable: "true" });
  editable.innerHTML = loadChatDraft(draftKey);
  const toolbar = createRichToolbar(editable);
  const sendBtn = el("button", { class: "btn btn-primary", type: "button", text: "שליחה (או Ctrl+Enter)" });
  composeArea.appendChild(toolbar);
  composeArea.appendChild(editable);
  composeArea.appendChild(sendBtn);
  wrap.appendChild(composeArea);
  container.appendChild(wrap);

  function renderFeed() {
    feed.innerHTML = "";
    const list = loadChatList(listKey).slice().sort((a, b) => a.createdAt - b.createdAt);
    if (list.length === 0) {
      feed.appendChild(el("div", { class: "empty-state", text: "עדיין אין הודעות. כתבי לעצמך את ההודעה הראשונה למטה." }));
    }
    list.forEach((msg) => {
      let editing = false;
      const bubble = el("div", { class: "chat-bubble" });

      function buildBubble() {
        bubble.innerHTML = "";
        const contentEl = el("div", { class: "chat-bubble-content" });
        contentEl.contentEditable = editing ? "true" : "false";
        contentEl.innerHTML = msg.html;
        bubble.appendChild(contentEl);

        const meta = el("div", { class: "chat-bubble-meta" });
        meta.appendChild(el("span", { class: "chat-timestamp", text: formatTimestamp(msg.createdAt) }));

        const actions = el("span", { class: "chat-bubble-actions" });
        actions.appendChild(
          el("button", {
            type: "button",
            class: "bubble-icon-btn",
            text: editing ? "✓" : "✏️",
            title: editing ? "שמירת עריכה" : "עריכה",
            onclick: () => {
              if (editing) {
                msg.html = contentEl.innerHTML;
                const all = loadChatList(listKey);
                const idx = all.findIndex((m) => m.id === msg.id);
                if (idx !== -1) {
                  all[idx] = msg;
                  saveChatList(listKey, all);
                }
              }
              editing = !editing;
              buildBubble();
            }
          })
        );
        actions.appendChild(
          el("button", {
            type: "button",
            class: "bubble-icon-btn",
            text: "🗑",
            title: "מחיקה",
            onclick: () => {
              if (confirm("למחוק את ההודעה הזו לצמיתות?")) {
                saveChatList(listKey, loadChatList(listKey).filter((m) => m.id !== msg.id));
                renderFeed();
              }
            }
          })
        );
        meta.appendChild(actions);
        bubble.appendChild(meta);
      }

      buildBubble();
      feed.appendChild(bubble);
    });
    feed.scrollTop = feed.scrollHeight;
  }

  function sendMessage() {
    const html = editable.innerHTML.trim();
    if (!html || html === "<br>") return;
    const list = loadChatList(listKey);
    list.push({ id: "msg_" + Date.now(), html, createdAt: Date.now() });
    saveChatList(listKey, list);
    editable.innerHTML = "";
    saveChatDraft(draftKey, "");
    celebrateSave();
    renderFeed();
  }

  sendBtn.addEventListener("click", sendMessage);
  editable.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  });
  const persistDraft = debounce(() => saveChatDraft(draftKey, editable.innerHTML), 400);
  editable.addEventListener("input", persistDraft);

  renderFeed();
}

function initDecisionsView(container) {
  initChatView(container, STORE_KEYS.decisions, STORE_KEYS.decisionDraft);
}

function initEmotionalView(container) {
  initChatView(container, STORE_KEYS.emotional, STORE_KEYS.emotionalDraft);
}
