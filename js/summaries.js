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

// ---- מבנה נתונים: כל סיכום = { id, sessionDate, paid, createdAt, updatedAt,
// topics: [{ id, title, storyHtml, items: [{ id, text, done, notesHtml, conclusionsHtml } | { id, type:"freewrite", html }] }] } ----

function newSummaryItem() {
  return { id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), text: "", done: false, notesHtml: "", conclusionsHtml: "" };
}

// בלוק כתיבה חופשית עצמאי שיושב בין עניינים (לא קשור לעניין ספציפי) - נוסף דרך כפתור "+ כתיבה חופשית"
function newFreewriteBlock() {
  return { id: "free_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), type: "freewrite", html: "" };
}

function newSummaryTopic() {
  return { id: "topic_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), title: "", storyHtml: "", items: [newSummaryItem()] };
}

function normalizeSummaryTopics(topics) {
  return Array.isArray(topics) ? topics : [];
}

function summaryNotesHasContent(html) {
  return !!html && html.replace(/<br\s*\/?>/gi, "").trim() !== "";
}

// נושא "ריק" הוא רק שלד ממתין להקלדה (למשל השורה הראשונה שנוצרת אוטומטית) - לא באמת תוכן
function persistSummaryItem(item) {
  const all = loadSummaries();
  const idx = all.findIndex((s) => s.id === item.id);
  if (idx !== -1) {
    all[idx] = item;
    saveSummaries(all);
  }
}

function isBlankSummaryTopic(topic) {
  return (
    (topic.title || "").trim() === "" &&
    !summaryNotesHasContent(topic.storyHtml) &&
    topic.items.every((it) =>
      it.type === "freewrite"
        ? !summaryNotesHasContent(it.html)
        : (it.text || "").trim() === "" && !summaryNotesHasContent(it.notesHtml) && !summaryNotesHasContent(it.conclusionsHtml)
    )
  );
}

// בונה עורך אינטראקטיבי (readOnly:false) או תצוגה בלבד (readOnly:true) על אותה מערך topics (מוחזק לפי רפרנס)
// opts.hideAddButton - כאשר הקורא רוצה לבנות בעצמו כפתור "+ נושא חדש" במקום אחר (למשל לצד שדה התאריך), משתמש ב-addTopic() שמוחזר
function buildTopicsEditor(root, topics, persist, opts) {
  const readOnly = !!opts.readOnly;
  const collapsedState = {};
  const subNoteCollapsedState = {};
  const storyCollapsedState = {};
  const debouncedPersist = debounce(persist, 400);
  // העניין שהיה בו הפוקוס לאחרונה - כדי שכפתור "+ כתיבה חופשית" ידע איפה בדיוק להוסיף את הבלוק החדש
  let lastFocusedItemRef = null;

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

  // מוסיפה בלוק כתיבה חופשית מיד אחרי העניין שבו היה הפוקוס לאחרונה (או בסוף הנושא הראשון אם עוד לא התמקדו באף עניין)
  function addFreewriteNearFocus() {
    let targetTopic = topics[0];
    let insertIdx = targetTopic ? targetTopic.items.length : 0;
    if (lastFocusedItemRef && topics.includes(lastFocusedItemRef.topic)) {
      targetTopic = lastFocusedItemRef.topic;
      const idx = targetTopic.items.indexOf(lastFocusedItemRef.item);
      insertIdx = idx === -1 ? targetTopic.items.length : idx + 1;
    }
    if (!targetTopic) {
      targetTopic = newSummaryTopic();
      targetTopic.items = [];
      topics.push(targetTopic);
      insertIdx = 0;
    }
    const block = newFreewriteBlock();
    targetTopic.items.splice(insertIdx, 0, block);
    persist();
    fullRender();
    requestAnimationFrame(() => {
      const editable = root.querySelector(`[data-block-id="${block.id}"]`);
      if (editable) editable.focus();
    });
  }

  function insertItemAfter(topic, itemIdx) {
    const newItem = newSummaryItem();
    topic.items.splice(itemIdx + 1, 0, newItem);
    persist();
    fullRender();
    requestAnimationFrame(() => {
      const target = root.querySelector(`[data-item-id="${newItem.id}"]`);
      if (target) target.focus();
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
    let storyWrap = null;

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

      // כפתור "פירוט" ברמת הנושא (בשורת הכותרת בלבד, ליד כפתור המחיקה) - כתיבה חופשית אחת שמסופרת
      // בתחילת הנושא, לפני כל העניינים - למידה/סיפור כללי הרלוונטי לנושא הספציפי
      storyWrap = el("div", { class: "summary-topic-story-wrap is-collapsed" });
      let storyOpen = storyCollapsedState[topic.id] !== undefined ? !storyCollapsedState[topic.id] : summaryNotesHasContent(topic.storyHtml);
      const storyBtn = el("button", {
        type: "button",
        class: "summary-topic-story-btn",
        text: "פירוט",
        title: "כתיבה חופשית כללית על הנושא - מופיעה בתחילת הנושא, לפני כל העניינים"
      });
      storyBtn.addEventListener("click", () => {
        storyOpen = !storyOpen;
        storyCollapsedState[topic.id] = !storyOpen;
        storyWrap.classList.toggle("is-collapsed", !storyOpen);
      });
      head.appendChild(storyBtn);

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

      storyWrap.classList.toggle("is-collapsed", !storyOpen);
      const storyEditable = el("div", { class: "summary-item-notes", contenteditable: "true", spellcheck: "false" });
      storyEditable.innerHTML = topic.storyHtml || "";
      const storyAutoGrow = () => {
        storyEditable.style.height = "auto";
        storyEditable.style.height = storyEditable.scrollHeight + "px";
      };
      storyEditable.addEventListener("input", () => {
        topic.storyHtml = storyEditable.innerHTML;
        storyAutoGrow();
        debouncedPersist();
      });
      requestAnimationFrame(storyAutoGrow);
      const storyRow = el("div", { class: "summary-item-notes-row" });
      storyRow.appendChild(createMiniRichToolbar(storyEditable));
      storyRow.appendChild(storyEditable);
      storyWrap.appendChild(storyRow);
    }
    block.appendChild(head);

    if (readOnly) {
      if (summaryNotesHasContent(topic.storyHtml)) {
        const storyView = el("div", { class: "summary-item-notes summary-item-notes-view summary-topic-story-view" });
        storyView.innerHTML = topic.storyHtml;
        block.appendChild(storyView);
      }
    } else {
      block.appendChild(storyWrap);
    }

    const itemsWrap = el("div", { class: "summary-items" });
    topic.items.forEach((item, itemIdx) => {
      itemsWrap.appendChild(item.type === "freewrite" ? buildFreewriteBlock(topic, item, itemIdx) : buildItemBlock(topic, item, itemIdx));
    });
    block.appendChild(itemsWrap);

    return block;
  }

  function buildFreewriteBlock(topic, item, itemIdx) {
    const wrap = el("div", { class: "summary-freewrite-block" });
    if (readOnly) {
      const view = el("div", { class: "summary-item-notes summary-item-notes-view" });
      view.innerHTML = item.html || "";
      wrap.appendChild(view);
      return wrap;
    }
    const editable = el("div", {
      class: "summary-item-notes",
      contenteditable: "true",
      spellcheck: "false",
      "data-block-id": item.id
    });
    editable.innerHTML = item.html || "";
    const autoGrow = () => {
      editable.style.height = "auto";
      editable.style.height = editable.scrollHeight + "px";
    };
    editable.addEventListener("input", () => {
      item.html = editable.innerHTML;
      autoGrow();
      debouncedPersist();
    });
    requestAnimationFrame(autoGrow);
    const row = el("div", { class: "summary-item-notes-row" });
    row.appendChild(createMiniRichToolbar(editable));
    row.appendChild(editable);
    const deleteBtn = el("button", {
      type: "button",
      class: "task-delete-btn summary-freewrite-delete",
      text: "🗑",
      title: "מחיקת בלוק הכתיבה החופשית"
    });
    deleteBtn.addEventListener("click", () => {
      topic.items.splice(itemIdx, 1);
      persist();
      fullRender();
    });
    wrap.appendChild(row);
    wrap.appendChild(deleteBtn);
    return wrap;
  }

  // בונה כפתור-משנה ("פירוט" / "מסקנות") שפותח/סוגר תיבת כתיבה נפרדת משלו בתוך אזור הפירוט של עניין -
  // כך ששני סוגי הכתיבה (מה שקרה השבוע מול מסקנות מהמפגש עם המטפלת) נשארים נפרדים אחד מהשני
  function buildSubNoteSection(topic, item, field, label) {
    const key = item.id + ":" + field;
    let open = subNoteCollapsedState[key] !== undefined ? !subNoteCollapsedState[key] : summaryNotesHasContent(item[field]);
    const section = el("div", { class: "summary-subnote-section" });
    const btn = el("button", { type: "button", class: "summary-subnote-toggle" + (open ? " is-open" : ""), text: label });
    const box = el("div", { class: "summary-subnote-box" + (open ? "" : " is-collapsed") });
    btn.addEventListener("click", () => {
      open = !open;
      subNoteCollapsedState[key] = !open;
      box.classList.toggle("is-collapsed", !open);
      btn.classList.toggle("is-open", open);
    });

    const editable = el("div", { class: "summary-item-notes", contenteditable: "true", spellcheck: "false" });
    editable.innerHTML = item[field] || "";
    const autoGrow = () => {
      editable.style.height = "auto";
      editable.style.height = editable.scrollHeight + "px";
    };
    editable.addEventListener("input", () => {
      item[field] = editable.innerHTML;
      autoGrow();
      debouncedPersist();
    });
    requestAnimationFrame(autoGrow);
    const boxRow = el("div", { class: "summary-item-notes-row" });
    boxRow.appendChild(createMiniRichToolbar(editable));
    boxRow.appendChild(editable);
    box.appendChild(boxRow);

    section.appendChild(btn);
    section.appendChild(box);
    return section;
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
        spellcheck: "false",
        "data-item-id": item.id
      });
      textEl.value = item.text || "";
      textEl.addEventListener("focus", () => {
        lastFocusedItemRef = { topic, item };
      });
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

    const collapseBtn = el("button", { type: "button", class: "summary-notes-toggle", title: "הצגה/הסתרה של הפירוט והמסקנות" });
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
    const hasAnyNotes = summaryNotesHasContent(item.notesHtml) || summaryNotesHasContent(item.conclusionsHtml);
    if (collapsedState[item.id] === undefined) collapsedState[item.id] = !hasAnyNotes;
    const setCollapsed = (val) => {
      collapsedState[item.id] = val;
      notesWrap.classList.toggle("is-collapsed", val);
      collapseBtn.textContent = val ? "▸" : "▾";
    };
    collapseBtn.addEventListener("click", () => setCollapsed(!collapsedState[item.id]));

    if (readOnly) {
      if (summaryNotesHasContent(item.notesHtml)) {
        notesWrap.appendChild(el("p", { class: "summary-subnote-label", text: "פירוט:" }));
        const detailView = el("div", { class: "summary-item-notes summary-item-notes-view" });
        detailView.innerHTML = item.notesHtml || "";
        notesWrap.appendChild(detailView);
      }
      if (summaryNotesHasContent(item.conclusionsHtml)) {
        notesWrap.appendChild(el("p", { class: "summary-subnote-label", text: "מסקנות:" }));
        const concView = el("div", { class: "summary-item-notes summary-item-notes-view" });
        concView.innerHTML = item.conclusionsHtml || "";
        notesWrap.appendChild(concView);
      }
    } else {
      notesWrap.appendChild(buildSubNoteSection(topic, item, "notesHtml", "פירוט"));
      notesWrap.appendChild(buildSubNoteSection(topic, item, "conclusionsHtml", "מסקנות"));

      notesWrap.appendChild(
        el("div", { class: "summary-item-add-row" }, [
          el("button", {
            type: "button",
            class: "summary-item-add-btn",
            text: "+",
            title: "הוספת עניין חדש מיד אחרי זה",
            onclick: () => insertItemAfter(topic, itemIdx)
          })
        ])
      );
    }

    setCollapsed(collapsedState[item.id]);
    itemWrap.appendChild(notesWrap);
    return itemWrap;
  }

  fullRender();
  return { addTopic, addFreewriteNearFocus };
}

function renderSummaryWriteTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });

  const draft = loadSummaryDraft();
  const topics = normalizeSummaryTopics(draft.topics);

  const draftStatus = el("p", { class: "draft-status" });

  function persistDraft() {
    saveSummaryDraft({ topics, sessionDate: dateInput.value || todayISO(), topic: topicInput.value });
    draftStatus.textContent = "✓ טיוטה נשמרה אוטומטית";
  }

  // שורת כותרת - "כתיבה חופשית" מול תאריך הפגישה, בקצוות מנוגדים של אותה שורה
  const headerRow = el("div", { class: "summary-header-row" });
  headerRow.appendChild(el("h2", { class: "panel-title", text: "כתיבה חופשית" }));
  const dateRow = el("div", { class: "session-date-row" });
  dateRow.appendChild(el("label", { class: "session-date-label", text: "תאריך הפגישה:" }));
  const dateInput = el("input", { type: "date", class: "field-input session-date-input" });
  dateInput.value = draft.sessionDate || todayISO();
  dateRow.appendChild(dateInput);
  headerRow.appendChild(dateRow);
  wrap.appendChild(headerRow);

  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "בנו כאן את רשימת הנושאים לשיחה - עם שמירה זה יעבור לארכיון, והדף יתפנה לסיכום הבא." })
  );

  // "+ נושא חדש" ושדה נושא הפגישה צמודים זה לזה; כפתור "+ כתיבה חופשית" מוסיף בלוק כתיבה חופשית
  // מיד אחרי העניין שבו היה הפוקוס לאחרונה
  const topRow = el("div", { class: "summary-top-row" });
  const addTopicBtn = el("button", { type: "button", class: "btn btn-primary btn-small summary-add-topic-btn", text: "+ נושא חדש" });
  topRow.appendChild(addTopicBtn);
  const topicInput = el("input", {
    type: "text",
    class: "field-input session-topic-input",
    placeholder: "הנושא העיקרי של הפגישה הוא...."
  });
  topicInput.value = draft.topic || "";
  topRow.appendChild(topicInput);
  const freewriteAtFocusBtn = el("button", {
    type: "button",
    class: "btn btn-secondary btn-small",
    text: "+ כתיבה חופשית",
    title: "מוסיפה תיבת כתיבה חופשית מיד אחרי העניין שבו עומדים כרגע"
  });
  topRow.appendChild(freewriteAtFocusBtn);
  wrap.appendChild(topRow);

  if (topics.length === 0) {
    topics.push(newSummaryTopic());
    persistDraft();
  }

  const editorRoot = el("div", { class: "summary-topics-wrap" });
  wrap.appendChild(editorRoot);
  const editorHandle = buildTopicsEditor(editorRoot, topics, persistDraft, { readOnly: false, hideAddButton: true });
  addTopicBtn.addEventListener("click", () => editorHandle.addTopic());
  freewriteAtFocusBtn.addEventListener("click", () => editorHandle.addFreewriteNearFocus());

  wrap.appendChild(draftStatus);
  dateInput.addEventListener("change", persistDraft);
  topicInput.addEventListener("input", persistDraft);

  wrap.appendChild(
    el("button", {
      class: "btn btn-primary btn-save",
      type: "button",
      text: "שמירה",
      onclick: () => {
        const hasContent = topics.some(
          (t) =>
            (t.title || "").trim() !== "" ||
            summaryNotesHasContent(t.storyHtml) ||
            t.items.some((it) =>
              it.type === "freewrite"
                ? summaryNotesHasContent(it.html)
                : (it.text || "").trim() !== "" || summaryNotesHasContent(it.notesHtml) || summaryNotesHasContent(it.conclusionsHtml)
            )
        );
        if (!hasContent) {
          alert("אין כאן עדיין תוכן לשמירה.");
          return;
        }
        const list = loadSummaries();
        const newItem = {
          id: "sum_" + Date.now(),
          topics,
          sessionDate: dateInput.value || todayISO(),
          topic: topicInput.value.trim(),
          paid: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        list.push(newItem);
        saveSummaries(list);
        saveSummaryDraft({ topics: [], sessionDate: todayISO(), topic: "" });
        celebrateSave();
        renderSummaryWriteTab(content);
        driveUploadSummaryPDF(newItem, () => persistSummaryItem(newItem));
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
    const toggleBtn = el("button", { class: "archive-item-toggle summary-archive-toggle", type: "button" }, [
      el("span", { class: "paid-badge" + (item.paid ? " is-paid" : ""), text: item.paid ? "💰 שולם" : "לא שולם" }),
      el("span", { class: "archive-chevron", text: "︿" })
    ]);

    // תאריך הפגישה ניתן עכשיו לעריכה ישירות מהארכיון - שדה תאריך אמיתי, נשמר מיד עם שינוי
    const dateInput = el("input", { type: "date", class: "archive-date-input", title: "שינוי תאריך הפגישה" });
    dateInput.value = item.sessionDate || "";
    dateInput.addEventListener("click", (e) => e.stopPropagation());
    dateInput.addEventListener("change", () => {
      item.sessionDate = dateInput.value || todayISO();
      persistSummaryItem(item);
      renderSummaryArchiveTab(content, goToWriteTab);
    });
    const dateWrap = el("div", { class: "archive-date-inline-wrap" }, [dateInput]);

    // שדה נושא ניתן לעריכה ישירות משורת הארכיון עצמה, בלי צורך להיכנס ל"עריכה ושינוי" -
    // לחיצה בתוך השדה כותבים, ולחיצה על ✓ שומרת מיד
    const topicInput = el("input", {
      type: "text",
      class: "field-input archive-topic-input",
      placeholder: "הנושא העיקרי של הפגישה הוא...."
    });
    topicInput.value = item.topic || "";
    function saveTopicInline() {
      item.topic = topicInput.value.trim();
      persistSummaryItem(item);
    }
    topicInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTopicInline();
        topicInput.blur();
      }
    });
    const topicConfirmBtn = el("button", {
      type: "button",
      class: "archive-topic-confirm-btn",
      title: "שמירת נושא הפגישה",
      text: "✓",
      onclick: saveTopicInline
    });
    const topicWrap = el("div", { class: "archive-topic-inline-wrap" }, [topicInput, topicConfirmBtn]);

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
    const head = el("div", { class: "archive-item-head" }, [topicWrap, dateWrap, toggleBtn, deleteBtn]);
    const body = el("div", { class: "archive-item-body is-collapsed" });
    let built = false;
    let editing = false;

    function persistItem() {
      persistSummaryItem(item);
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
            driveUploadSummaryPDF(item, persistItem);
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

const SUMMARY_FIXED_TITLE = "סיכום פגישה עם ציפי";

function buildSummaryPrintRoot(item) {
  const printRoot = el("div", { class: "day-card summary-print-root" });
  const header = el("div", { class: "day-header" });
  const titleCol = el("div", {}, [
    el("div", { class: "day-date", text: SUMMARY_FIXED_TITLE }),
    item.topic && item.topic.trim() ? el("div", { class: "streak-note", text: item.topic.trim() }) : null,
    el("div", { class: "streak-note", text: item.sessionDate ? formatDateHe(item.sessionDate) : formatTimestamp(item.createdAt) })
  ]);
  header.appendChild(titleCol);
  printRoot.appendChild(header);
  const body = el("div", { class: "summary-topics-wrap" });
  printRoot.appendChild(body);
  buildTopicsEditor(body, normalizeSummaryTopics(item.topics), () => {}, { readOnly: true });
  printRoot.style.width = "700px";
  return printRoot;
}

function summaryPdfFilename(item) {
  const topicPart = item.topic && item.topic.trim() ? `-${item.topic.trim().replace(/\s+/g, "-")}` : "";
  return `סיכום${topicPart}-${item.sessionDate || todayISO()}`;
}

function exportSummaryToPDF(item) {
  const printRoot = buildSummaryPrintRoot(item);
  const cleanup = mountOffscreenForExport(printRoot);
  exportElementToPDF(printRoot, summaryPdfFilename(item), null, cleanup);
}

function hasUncheckedItems(item) {
  return normalizeSummaryTopics(item.topics).some((topic) =>
    topic.items.some((it) => it.type !== "freewrite" && !it.done && (it.text || "").trim() !== "")
  );
}

// מעבירה (לא מעתיקה) עניינים שלא סומנו מסיכום שמור לטיוטת הכתיבה החופשית, תחת אותה כותרת (שנשארת גם בסיכום המקורי)
function moveUncheckedToDraft(item, persistItem, onDone) {
  const sourceTopics = normalizeSummaryTopics(item.topics);
  const draft = loadSummaryDraft();
  // מסננים החוצה נושאי-שלד ריקים (כמו השורה הראשונה שנוצרת אוטומטית), כדי שהתאמת כותרות תמצא נכון נושא קיים
  const draftTopics = normalizeSummaryTopics(draft.topics).filter((t) => !isBlankSummaryTopic(t));

  let movedAny = false;
  sourceTopics.forEach((topic) => {
    const unchecked = topic.items.filter((it) => it.type !== "freewrite" && !it.done && (it.text || "").trim() !== "");
    if (unchecked.length === 0) return;
    movedAny = true;

    topic.items = topic.items.filter((it) => it.type === "freewrite" || it.done || (it.text || "").trim() === "");

    let targetTopic = draftTopics.find((t) => (t.title || "").trim() === (topic.title || "").trim());
    if (!targetTopic) {
      targetTopic = { id: "topic_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), title: topic.title, storyHtml: "", items: [] };
      draftTopics.push(targetTopic);
    }
    unchecked.forEach((it) => {
      targetTopic.items.push({
        id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        text: it.text,
        done: false,
        notesHtml: it.notesHtml || "",
        conclusionsHtml: it.conclusionsHtml || ""
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
