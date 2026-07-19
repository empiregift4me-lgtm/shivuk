// מודול צ'אט עם עצמך - גנרי, משמש גם ל"החלטות עסקיות חשובות" וגם ל"תיעוד רגשי"
// הודעות עם חותמת זמן, תיבת כתיבה עשירה למטה, Ctrl+Enter לשליחה

function initChatView(container, listKey, draftKey, options) {
  const protectable = !!(options && options.protectable);
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

  // מצב "הגנה" - כשפעיל, ההודעה הבאה שנשלחת נשמרת כרגיל אבל מוצגת מוסתרת בפיד עד הזנת סיסמת היומן
  let protectMode = false;
  if (protectable) {
    const protectBtn = el("button", {
      type: "button",
      class: "btn btn-secondary btn-small chat-protect-btn",
      text: "הגנה🔐",
      title: "ההודעה הבאה שתישלח תוצג מוסתרת עד הזנת סיסמת היומן",
      onclick: () => {
        protectMode = !protectMode;
        protectBtn.classList.toggle("is-active", protectMode);
      }
    });
    composeArea.appendChild(protectBtn);
  }

  composeArea.appendChild(sendBtn);
  wrap.appendChild(composeArea);
  container.appendChild(wrap);

  // אילו הודעות מוסתרות שוחררו זמנית לצפייה - מתאפס בכל כניסה מחדש לתצוגה, בלי להישמר
  const revealedIds = new Set();

  function renderFeed() {
    feed.innerHTML = "";
    const list = loadChatList(listKey).slice().sort((a, b) => a.createdAt - b.createdAt);
    if (list.length === 0) {
      feed.appendChild(el("div", { class: "empty-state", text: "עדיין אין הודעות. כתבי לעצמך את ההודעה הראשונה למטה." }));
    }
    list.forEach((msg) => {
      let editing = false;
      let unlocking = false;
      let unlockError = "";
      const bubble = el("div", { class: "chat-bubble" });

      function persistMsg() {
        const all = loadChatList(listKey);
        const idx = all.findIndex((m) => m.id === msg.id);
        if (idx !== -1) {
          all[idx] = msg;
          saveChatList(listKey, all);
        }
      }

      function buildProtectedBody() {
        bubble.classList.add("chat-bubble-protected");
        const box = el("div", { class: "protected-box" });
        box.appendChild(el("div", { class: "protected-label", text: "תוכן מוסתר:" }));
        const topicInput = el("input", {
          type: "text",
          class: "field-input protected-topic-input",
          placeholder: "נושא קצר (לזיכרון בלבד)"
        });
        topicInput.value = msg.topic || "";
        topicInput.addEventListener("input", () => {
          msg.topic = topicInput.value;
          persistMsg();
        });
        box.appendChild(topicInput);

        if (unlocking) {
          const unlockRow = el("div", { class: "protected-unlock-row" });
          const pwInput = el("input", { type: "password", class: "field-input protected-unlock-input", placeholder: "סיסמת היומן" });
          const confirmUnlock = () => {
            if (pwInput.value === LOCK_PASSWORD) {
              revealedIds.add(msg.id);
              editing = false;
              unlocking = false;
              buildBubble();
            } else {
              unlockError = "סיסמה שגויה.";
              buildBubble();
            }
          };
          pwInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmUnlock();
            }
          });
          unlockRow.appendChild(pwInput);
          unlockRow.appendChild(el("button", { type: "button", class: "btn btn-primary btn-small", text: "פתיחה", onclick: confirmUnlock }));
          box.appendChild(unlockRow);
          if (unlockError) box.appendChild(el("div", { class: "protected-unlock-error", text: unlockError }));
          setTimeout(() => pwInput.focus(), 30);
        } else {
          box.appendChild(
            el("button", {
              type: "button",
              class: "protected-unlock-btn",
              title: "שחרור נעילה",
              text: "🔓",
              onclick: () => {
                unlockError = "";
                unlocking = true;
                buildBubble();
              }
            })
          );
        }

        bubble.appendChild(box);

        const meta = el("div", { class: "chat-bubble-meta" });
        meta.appendChild(el("span", { class: "chat-timestamp", text: formatTimestamp(msg.createdAt) }));
        const actions = el("span", { class: "chat-bubble-actions" });
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

      function buildBubble() {
        bubble.innerHTML = "";
        bubble.classList.remove("chat-bubble-protected");

        if (msg.protected && !revealedIds.has(msg.id)) {
          buildProtectedBody();
          return;
        }

        const contentEl = el("div", { class: "chat-bubble-content" });
        contentEl.contentEditable = editing ? "true" : "false";
        contentEl.innerHTML = msg.html;
        attachPlainTextPaste(contentEl);
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
                persistMsg();
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
    const msg = { id: "msg_" + Date.now(), html, createdAt: Date.now() };
    if (protectable && protectMode) {
      msg.protected = true;
      msg.topic = "";
    }
    list.push(msg);
    saveChatList(listKey, list);
    editable.innerHTML = "";
    saveChatDraft(draftKey, "");
    playMessageSentSound();
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
  initChatView(container, STORE_KEYS.emotional, STORE_KEYS.emotionalDraft, { protectable: true });
}
