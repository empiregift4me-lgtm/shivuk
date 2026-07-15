// מודול "סיכומים" - בניית רשימת נושאים לשיחה (כותרת -> עניינים -> כתיבה חופשית) + ארכיון
// מותאם גם לשימוש עם מטפלת: תאריך פגישה נפרד מזמן השמירה, סימון תשלום, והעברת עניינים שלא סומנו לסיכום הבא

function initSummariesView(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "module-wrap" });

  const nav = el("div", { class: "sub-tab-nav" });
  const content = el("div", { class: "sub-tab-content" });
  wrap.appendChild(nav);
  wrap.appendChild(content);
  container.appendChild(wrap);

  const SUB_TABS = [
    { id: "write", label: "כתיבה חופשית", render: renderSummaryWriteTab },
    { id: "archive", label: "ארכיונים", render: renderSummaryArchiveTab },
    { id: "payments", label: "תשלומים", render: renderPaymentsTab }
  ];

  function activate(id) {
    nav.querySelectorAll(".sub-tab-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === id));
    const tab = SUB_TABS.find((t) => t.id === id);
    tab.render(content, () => activate("write"));
  }

  nav.innerHTML = "";
  SUB_TABS.forEach((t) => {
    nav.appendChild(
      el("button", {
        type: "button",
        class: "sub-tab-btn",
        "data-tab": t.id,
        text: t.label,
        onclick: () => activate(t.id)
      })
    );
  });

  activate("write");
}

// ---- מבנה נתונים: כל סיכום = { id, sessionDate, paid, createdAt, updatedAt, topics: [{ id, title, items: [{ id, text, done, notesHtml }] }] } ----

function newSummaryItem() {
  return { id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), text: "", done: false, notesHtml: "" };
}

function newSummaryTopic() {
  return { id: "topic_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), title: "", items: [newSummaryItem()] };
}

function normalizeSummaryTopics(topics) {
  return Array.isArray(topics) ? topics : [];
}

function summaryNotesHasContent(html) {
  return !!html && html.replace(/<br\s*\/?>/gi, "").trim() !== "";
}

// נושא "ריק" הוא רק שלד ממתין להקלדה (למשל השורה הראשונה שנוצרת אוטומטית) - לא באמת תוכן
function isBlankSummaryTopic(topic) {
  return (
    (topic.title || "").trim() === "" &&
    topic.items.every((it) => (it.text || "").trim() === "" && !summaryNotesHasContent(it.notesHtml))
  );
}

// בונה עורך אינטראקטיבי (readOnly:false) או תצוגה בלבד (readOnly:true) על אותה מערך topics (מוחזק לפי רפרנס)
// opts.hideAddButton - כאשר הקורא רוצה לבנות בעצמו כפתור "+ נושא חדש" במקום אחר (למשל לצד שדה התאריך), משתמש ב-addTopic() שמוחזר
function buildTopicsEditor(root, topics, persist, opts) {
  const readOnly = !!opts.readOnly;
  const collapsedState = {};
  const debouncedPersist = debounce(persist, 400);

  function addTopic() {
    topics.push(newSummaryTopic());
    persist();
    fullRender();
    requestAnimationFrame(() => {
      const titles = root.querySelectorAll(".summary-topic-title-input");
      const last = titles[titles.length - 1];
      if (last) last.focus();
    });
  }

  function fullRender() {
    root.innerHTML = "";

    if (!readOnly && !opts.hideAddButton) {
      const addTopicBtn = el("button", {
        type: "button",
        class: "btn btn-primary btn-small summary-add-topic-btn",
        text: "+ נושא חדש"
      });
      addTopicBtn.addEventListener("click", addTopic);
      root.appendChild(addTopicBtn);
    }

    if (topics.length === 0) {
      root.appendChild(el("div", { class: "empty-state", text: readOnly ? "אין נושאים בסיכום הזה." : "לחצי על + נושא חדש כדי להתחיל." }));
    }

    topics.forEach((topic, topicIdx) => root.appendChild(buildTopicBlock(topic, topicIdx)));
  }

  function buildTopicBlock(topic, topicIdx) {
    const block = el("div", { class: "summary-topic" });
    const head = el("div", { class: "summary-topic-head" });

    if (readOnly) {
      head.appendChild(el("h3", { class: "summary-topic-title-view", text: topic.title || "(ללא כותרת)" }));
    } else {
      const titleInput = el("input", {
        type: "text",
        class: "summary-topic-title-input",
        placeholder: "כותרת",
        autocomplete: "off",
        spellcheck: "false"
      });
      titleInput.value = topic.title || "";
      titleInput.addEventListener("input", () => {
        topic.title = titleInput.value;
        debouncedPersist();
      });
      head.appendChild(titleInput);

      const deleteTopicBtn = el("button", {
        type: "button",
        class: "task-delete-btn",
        text: "🗑",
        title: "מחיקת הנושא כולו, כולל כל העניינים שבתוכו"
      });
      deleteTopicBtn.addEventListener("click", () => {
        if (!confirm(`למחוק את הנושא "${topic.title || "ללא כותרת"}" ואת כל העניינים שבתוכו?`)) return;
        topics.splice(topicIdx, 1);
        persist();
        fullRender();
      });
      head.appendChild(deleteTopicBtn);
    }
    block.appendChild(head);

    const itemsWrap = el("div", { class: "summary-items" });
    topic.items.forEach((item, itemIdx) => itemsWrap.appendChild(buildItemBlock(topic, item, itemIdx)));
    block.appendChild(itemsWrap);

    return block;
  }

  function buildItemBlock(topic, item, itemIdx) {
    const itemWrap = el("div", { class: "summary-item" + (item.done ? " is-done" : "") });
    const row = el("div", { class: "summary-item-row" });

    if (!readOnly) {
      const dragHandle = el("span", { class: "task-drag-handle", text: "⠿", title: "גרירה לשינוי מיקום" });
      dragHandle.draggable = true;
      dragHandle.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(itemIdx));
        itemWrap.classList.add("is-dragging");
      });
      dragHandle.addEventListener("dragend", () => itemWrap.classList.remove("is-dragging"));
      itemWrap.addEventListener("dragover", (e) => {
        e.preventDefault();
        itemWrap.classList.add("drag-over");
      });
      itemWrap.addEventListener("dragleave", () => itemWrap.classList.remove("drag-over"));
      itemWrap.addEventListener("drop", (e) => {
        e.preventDefault();
        itemWrap.classList.remove("drag-over");
        const fromIdx = Number(e.dataTransfer.getData("text/plain"));
        if (fromIdx === itemIdx || Number.isNaN(fromIdx)) return;
        const [moved] = topic.items.splice(fromIdx, 1);
        topic.items.splice(itemIdx, 0, moved);
        persist();
        fullRender();
      });
      row.appendChild(dragHandle);
    }

    const checkbox = el("input", { type: "checkbox", class: "task-checkbox", title: "בוצע" });
    checkbox.checked = !!item.done;
    checkbox.disabled = readOnly;
    checkbox.addEventListener("change", () => {
      item.done = checkbox.checked;
      itemWrap.classList.toggle("is-done", item.done);
      persist();
    });
    row.appendChild(checkbox);

    let textEl;
    if (readOnly) {
      textEl = el("span", { class: "summary-item-text-view", text: item.text || "" });
    } else {
      textEl = el("input", {
        type: "text",
        class: "field-input summary-item-text-input",
        placeholder: "עניין...",
        autocomplete: "off",
        spellcheck: "false"
      });
      textEl.value = item.text || "";
      textEl.addEventListener("input", () => {
        item.text = textEl.value;
        debouncedPersist();
      });
      textEl.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (itemIdx === topic.items.length - 1) {
          topic.items.push(newSummaryItem());
          persist();
          fullRender();
          requestAnimationFrame(() => {
            const inputs = root.querySelectorAll(".summary-item-text-input");
            const last = inputs[inputs.length - 1];
            if (last) last.focus();
          });
        } else {
          const nextRow = itemWrap.parentElement && itemWrap.parentElement.children[itemIdx + 1];
          const nextInput = nextRow && nextRow.querySelector(".summary-item-text-input");
          if (nextInput) nextInput.focus();
        }
      });
    }
    row.appendChild(textEl);

    const collapseBtn = el("button", { type: "button", class: "summary-notes-toggle", title: "הצגה/הסתרה של הכתיבה החופשית" });
    row.appendChild(collapseBtn);

    if (!readOnly) {
      const deleteItemBtn = el("button", { type: "button", class: "task-delete-btn", text: "🗑", title: "מחיקת העניין" });
      deleteItemBtn.addEventListener("click", () => {
        topic.items.splice(itemIdx, 1);
        if (topic.items.length === 0) topic.items.push(newSummaryItem());
        persist();
        fullRender();
      });
      row.appendChild(deleteItemBtn);
    }

    itemWrap.appendChild(row);

    const notesWrap = el("div", { class: "summary-item-notes-wrap" });
    if (collapsedState[item.id] === undefined) collapsedState[item.id] = !summaryNotesHasContent(item.notesHtml);
    const setCollapsed = (val) => {
      collapsedState[item.id] = val;
      notesWrap.classList.toggle("is-collapsed", val);
      collapseBtn.textContent = val ? "▸ פירוט" : "▾ פירוט";
    };
    collapseBtn.addEventListener("click", () => setCollapsed(!collapsedState[item.id]));

    if (readOnly) {
      const view = el("div", { class: "summary-item-notes summary-item-notes-view" });
      view.innerHTML = item.notesHtml || "";
      notesWrap.appendChild(view);
    } else {
      const notesEditable = el("div", { class: "summary-item-notes", contenteditable: "true", spellcheck: "false" });
      notesEditable.innerHTML = item.notesHtml || "";
      attachPlainTextPaste(notesEditable);
      const autoGrow = () => {
        notesEditable.style.height = "auto";
        notesEditable.style.height = notesEditable.scrollHeight + "px";
      };
      notesEditable.addEventListener("input", () => {
        item.notesHtml = notesEditable.innerHTML;
        autoGrow();
        debouncedPersist();
      });
      requestAnimationFrame(autoGrow);
      const notesRow = el("div", { class: "summary-item-notes-row" });
      notesRow.appendChild(notesEditable);
      notesRow.appendChild(createMiniRichToolbar(notesEditable));
      notesWrap.appendChild(notesRow);
    }

    setCollapsed(collapsedState[item.id]);
    itemWrap.appendChild(notesWrap);
    return itemWrap;
  }

  fullRender();
  return { addTopic };
}

function renderSummaryWriteTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "כתיבה חופשית" }));
  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "בנו כאן את רשימת הנושאים לשיחה - עם שמירה זה יעבור לארכיון, והדף יתפנה לסיכום הבא." })
  );

  const draft = loadSummaryDraft();
  const topics = normalizeSummaryTopics(draft.topics);

  const draftStatus = el("p", { class: "draft-status" });

  // כפתור "+ נושא חדש" ותאריך הפגישה באותה שורה - התאריך בקצה השמאלי ביותר
  const topRow = el("div", { class: "summary-top-row" });
  const addTopicBtn = el("button", { type: "button", class: "btn btn-primary btn-small summary-add-topic-btn", text: "+ נושא חדש" });
  topRow.appendChild(addTopicBtn);
  const dateRow = el("div", { class: "session-date-row" });
  dateRow.appendChild(el("label", { class: "session-date-label", text: "תאריך הפגישה:" }));
  const dateInput = el("input", { type: "date", class: "field-input session-date-input" });
  dateInput.value = draft.sessionDate || todayISO();
  dateRow.appendChild(dateInput);
  topRow.appendChild(dateRow);
  wrap.appendChild(topRow);

  function persistDraft() {
    saveSummaryDraft({ topics, sessionDate: dateInput.value || todayISO() });
    draftStatus.textContent = "✓ טיוטה נשמרה אוטומטית";
  }

  if (topics.length === 0) {
    topics.push(newSummaryTopic());
    persistDraft();
  }

  const editorRoot = el("div", { class: "summary-topics-wrap" });
  wrap.appendChild(editorRoot);
  const editorHandle = buildTopicsEditor(editorRoot, topics, persistDraft, { readOnly: false, hideAddButton: true });
  addTopicBtn.addEventListener("click", () => editorHandle.addTopic());

  wrap.appendChild(draftStatus);
  dateInput.addEventListener("change", persistDraft);

  wrap.appendChild(
    el("button", {
      class: "btn btn-primary btn-save",
      type: "button",
      text: "שמירה",
      onclick: () => {
        const hasContent = topics.some(
          (t) => (t.title || "").trim() !== "" || t.items.some((it) => (it.text || "").trim() !== "" || summaryNotesHasContent(it.notesHtml))
        );
        if (!hasContent) {
          alert("אין כאן עדיין תוכן לשמירה.");
          return;
        }
        const list = loadSummaries();
        list.push({
          id: "sum_" + Date.now(),
          topics,
          sessionDate: dateInput.value || todayISO(),
          paid: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        saveSummaries(list);
        saveSummaryDraft({ topics: [], sessionDate: todayISO() });
        celebrateSave();
        renderSummaryWriteTab(content);
      }
    })
  );

  content.appendChild(wrap);
}

let summaryArchiveOrder = "desc";

function renderSummaryArchiveTab(content, goToWriteTab) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "ארכיונים" }));

  const orderBtn = el("button", {
    class: "btn btn-ghost btn-small archive-order-btn",
    type: "button",
    text: summaryArchiveOrder === "desc" ? "מהחדש לישן ⇅" : "מהישן לחדש ⇅",
    onclick: () => {
      summaryArchiveOrder = summaryArchiveOrder === "desc" ? "asc" : "desc";
      renderSummaryArchiveTab(content, goToWriteTab);
    }
  });
  wrap.appendChild(orderBtn);

  const list = loadSummaries()
    .slice()
    .sort((a, b) => {
      const cmp = (a.sessionDate || "").localeCompare(b.sessionDate || "") || a.createdAt - b.createdAt;
      return summaryArchiveOrder === "desc" ? -cmp : cmp;
    });
  if (list.length === 0) {
    wrap.appendChild(el("div", { class: "empty-state", text: "עדיין אין סיכומים שמורים." }));
    content.appendChild(wrap);
    return;
  }

  list.forEach((item) => {
    const toggleBtn = el("button", { class: "archive-item-toggle", type: "button" }, [
      el("span", { class: "archive-date", text: item.sessionDate ? formatDateHe(item.sessionDate) : formatTimestamp(item.createdAt) }),
      el("span", { class: "paid-badge" + (item.paid ? " is-paid" : ""), text: item.paid ? "💰 שולם" : "לא שולם" }),
      el("span", { class: "archive-chevron", text: "︿" })
    ]);
    toggleBtn.querySelector(".paid-badge").addEventListener("click", (e) => {
      e.stopPropagation();
      const becamePaid = !item.paid;
      item.paid = becamePaid;
      const all = loadSummaries();
      const idx = all.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        all[idx] = item;
        saveSummaries(all);
      }
      if (becamePaid) onSessionMarkedPaidManually();
      renderSummaryArchiveTab(content, goToWriteTab);
    });

    const deleteBtn = el("button", {
      class: "archive-delete",
      type: "button",
      text: "🗑",
      title: "מחיקה לצמיתות",
      onclick: (e) => {
        e.stopPropagation();
        if (confirm("למחוק את הסיכום הזה לצמיתות?")) {
          saveSummaries(loadSummaries().filter((s) => s.id !== item.id));
          renderSummaryArchiveTab(content, goToWriteTab);
        }
      }
    });
    const head = el("div", { class: "archive-item-head" }, [toggleBtn, deleteBtn]);
    const body = el("div", { class: "archive-item-body is-collapsed" });
    let built = false;
    let editing = false;

    function persistItem() {
      const all = loadSummaries();
      const idx = all.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        all[idx] = item;
        saveSummaries(all);
      }
    }

    function buildEditToggle(label) {
      return el("button", {
        class: "btn btn-secondary btn-small",
        type: "button",
        text: label,
        onclick: () => {
          if (editing) {
            item.updatedAt = Date.now();
            persistItem();
          }
          editing = !editing;
          buildBody();
        }
      });
    }

    function buildBody() {
      body.innerHTML = "";
      item.topics = normalizeSummaryTopics(item.topics);
      const unchecked = hasUncheckedItems(item);

      if (editing) {
        if (item.topics.length === 0) item.topics.push(newSummaryTopic());
        body.appendChild(buildEditToggle("סיום עריכה ✓"));
        const editorRoot = el("div", { class: "summary-topics-wrap" });
        body.appendChild(editorRoot);
        buildTopicsEditor(
          editorRoot,
          item.topics,
          () => {
            item.updatedAt = Date.now();
            persistItem();
          },
          { readOnly: false }
        );
        body.appendChild(buildEditToggle("שמירת שינויים"));
      } else {
        const topRow = el("div", { class: "archive-body-actions" }, [
          buildEditToggle("עריכה ושינוי"),
          el("button", {
            class: "btn btn-secondary btn-small",
            type: "button",
            text: "ייצוא ל-PDF",
            onclick: () => exportSummaryToPDF(item)
          })
        ]);
        body.appendChild(topRow);
        const viewRoot = el("div", { class: "summary-topics-wrap" });
        body.appendChild(viewRoot);
        buildTopicsEditor(viewRoot, item.topics, () => {}, { readOnly: true });
        if (unchecked) {
          body.appendChild(
            el("button", {
              class: "btn btn-ghost btn-small",
              type: "button",
              text: "➡ העברת עניינים שלא סומנו לסיכום הבא",
              onclick: () => {
                if (!confirm("העניינים שלא סומנו יוסרו מהסיכום הזה ויעברו לטיוטת הכתיבה החופשית (הכותרת תישאר גם כאן). להמשיך?")) return;
                moveUncheckedToDraft(item, persistItem, () => {
                  renderSummaryArchiveTab(content, goToWriteTab);
                  goToWriteTab();
                });
              }
            })
          );
        }
        body.appendChild(buildEditToggle("עריכה ושינוי"));
      }
    }

    toggleBtn.addEventListener("click", () => {
      const collapsed = body.classList.toggle("is-collapsed");
      head.querySelector(".archive-chevron").textContent = collapsed ? "﹀" : "︿";
      if (!collapsed && !built) {
        buildBody();
        built = true;
      }
    });

    const card = el("div", { class: "archive-item" }, [head, body]);
    wrap.appendChild(card);
  });

  content.appendChild(wrap);
}

function renderPaymentsTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "תשלומים" }));
  wrap.appendChild(
    el("p", {
      class: "panel-subtitle",
      text: `מעקב חוב מול פגישות שלא סומנו כשולמו, לפי תעריף קבוע של ${SESSION_RATE} ₪ לפגישה.`
    })
  );

  const summary = computeDebtSummary();
  const debtBox = el("div", { class: "debt-summary" }, [
    el("div", { class: "debt-amount", text: `${summary.debt} ₪ לתשלום` }),
    el("p", {
      class: "debt-sub",
      text: `${summary.unpaidCount} פגישות לא משולמות × ${SESSION_RATE} ₪ = ${summary.totalOwed} ₪ | יתרת זכות שטרם שויכה: ${summary.pool} ₪`
    })
  ]);
  wrap.appendChild(debtBox);

  const entryRow = el("div", { class: "payment-entry-row" });
  const amountInput = el("input", { type: "number", min: "1", class: "field-input payment-amount-input", placeholder: "סכום ששולם (₪)" });
  entryRow.appendChild(amountInput);
  entryRow.appendChild(
    el("button", {
      class: "btn btn-primary",
      type: "button",
      text: "רישום תשלום",
      onclick: () => {
        const amount = Number(amountInput.value);
        if (!amount || amount <= 0) {
          alert("יש להזין סכום תקין.");
          return;
        }
        logPayment(amount);
        renderPaymentsTab(content);
      }
    })
  );
  wrap.appendChild(entryRow);

  wrap.appendChild(el("h3", { class: "panel-title", text: "היסטוריית תשלומים" }));
  const ledger = loadPaymentLedger();
  const history = el("div", { class: "payment-history" });
  const log = ledger.log.slice().sort((a, b) => b.timestamp - a.timestamp);
  if (log.length === 0) {
    history.appendChild(el("div", { class: "empty-state", text: "עדיין לא נרשמו תשלומים." }));
  } else {
    log.forEach((entry) => {
      const row = el("div", { class: "payment-history-row" }, [
        el("span", { class: "payment-history-date", text: formatTimestamp(entry.timestamp) }),
        el("span", { text: `${entry.amount} ₪` }),
        el("button", {
          class: "archive-delete",
          type: "button",
          text: "🗑",
          title: "מחיקת רשומת תשלום",
          onclick: () => {
            if (confirm("למחוק את רשומת התשלום הזו?")) {
              deletePaymentLogEntry(entry.id);
              renderPaymentsTab(content);
            }
          }
        })
      ]);
      history.appendChild(row);
    });
  }
  wrap.appendChild(history);

  content.appendChild(wrap);
}

function exportSummaryToPDF(item) {
  const printRoot = el("div", { class: "day-card summary-print-root" });
  const header = el("div", { class: "day-header" });
  header.appendChild(el("div", { class: "day-date", text: item.sessionDate ? formatDateHe(item.sessionDate) : formatTimestamp(item.createdAt) }));
  printRoot.appendChild(header);
  const body = el("div", { class: "summary-topics-wrap" });
  printRoot.appendChild(body);
  buildTopicsEditor(body, normalizeSummaryTopics(item.topics), () => {}, { readOnly: true });
  printRoot.style.position = "fixed";
  printRoot.style.left = "-9999px";
  printRoot.style.top = "0";
  printRoot.style.width = "700px";
  document.body.appendChild(printRoot);
  exportElementToPDF(printRoot, `סיכום-${item.sessionDate || todayISO()}`, null, () => printRoot.remove());
}

function hasUncheckedItems(item) {
  return normalizeSummaryTopics(item.topics).some((topic) => topic.items.some((it) => !it.done && (it.text || "").trim() !== ""));
}

// מעבירה (לא מעתיקה) עניינים שלא סומנו מסיכום שמור לטיוטת הכתיבה החופשית, תחת אותה כותרת (שנשארת גם בסיכום המקורי)
function moveUncheckedToDraft(item, persistItem, onDone) {
  const sourceTopics = normalizeSummaryTopics(item.topics);
  const draft = loadSummaryDraft();
  // מסננים החוצה נושאי-שלד ריקים (כמו השורה הראשונה שנוצרת אוטומטית), כדי שהתאמת כותרות תמצא נכון נושא קיים
  const draftTopics = normalizeSummaryTopics(draft.topics).filter((t) => !isBlankSummaryTopic(t));

  let movedAny = false;
  sourceTopics.forEach((topic) => {
    const unchecked = topic.items.filter((it) => !it.done && (it.text || "").trim() !== "");
    if (unchecked.length === 0) return;
    movedAny = true;

    topic.items = topic.items.filter((it) => it.done || (it.text || "").trim() === "");

    let targetTopic = draftTopics.find((t) => (t.title || "").trim() === (topic.title || "").trim());
    if (!targetTopic) {
      targetTopic = { id: "topic_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), title: topic.title, items: [] };
      draftTopics.push(targetTopic);
    }
    unchecked.forEach((it) => {
      targetTopic.items.push({
        id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        text: it.text,
        done: false,
        notesHtml: it.notesHtml || ""
      });
    });
  });

  if (!movedAny) return;

  item.topics = sourceTopics;
  item.updatedAt = Date.now();
  persistItem();

  saveSummaryDraft({ topics: draftTopics, sessionDate: draft.sessionDate || todayISO() });
  onDone();
}
