// מודול "סיכומים" - עמוד כתיבה חופשית בסגנון Google Docs + ארכיון

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
    { id: "archive", label: "ארכיונים", render: renderSummaryArchiveTab }
  ];

  function activate(id) {
    nav.querySelectorAll(".sub-tab-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === id));
    const tab = SUB_TABS.find((t) => t.id === id);
    tab.render(content, () => activate("archive"));
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

function renderSummaryWriteTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "כתיבה חופשית" }));
  wrap.appendChild(el("p", { class: "panel-subtitle", text: "כתבי כאן חופשי - עם שמירה זה יעבור לארכיון, והדף יתפנה לסיכום הבא." }));

  const editable = el("div", { class: "a4-editor", contenteditable: "true" });
  editable.innerHTML = loadSummaryDraft();

  const toolbar = createRichToolbar(editable);
  wrap.appendChild(toolbar);
  wrap.appendChild(editable);

  const persist = debounce(() => saveSummaryDraft(editable.innerHTML), 400);
  editable.addEventListener("input", persist);

  wrap.appendChild(
    el("button", {
      class: "btn btn-primary btn-save",
      type: "button",
      text: "שמירה",
      onclick: () => {
        const html = editable.innerHTML.trim();
        if (!html || html === "<br>") {
          alert("אין כאן עדיין תוכן לשמירה.");
          return;
        }
        const list = loadSummaries();
        list.push({ id: "sum_" + Date.now(), html, createdAt: Date.now(), updatedAt: Date.now() });
        saveSummaries(list);
        editable.innerHTML = "";
        saveSummaryDraft("");
        celebrateSave();
        renderSummaryWriteTab(content);
      }
    })
  );

  content.appendChild(wrap);
}

function renderSummaryArchiveTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "ארכיונים" }));

  const list = loadSummaries().slice().sort((a, b) => b.createdAt - a.createdAt);
  if (list.length === 0) {
    wrap.appendChild(el("div", { class: "empty-state", text: "עדיין אין סיכומים שמורים." }));
    content.appendChild(wrap);
    return;
  }

  list.forEach((item) => {
    const toggleBtn = el("button", { class: "archive-item-toggle", type: "button" }, [
      el("span", { class: "archive-date", text: formatTimestamp(item.createdAt) }),
      el("span", { class: "archive-chevron", text: "︿" })
    ]);
    const deleteBtn = el("button", {
      class: "archive-delete",
      type: "button",
      text: "🗑",
      title: "מחיקה לצמיתות",
      onclick: (e) => {
        e.stopPropagation();
        if (confirm("למחוק את הסיכום הזה לצמיתות?")) {
          saveSummaries(loadSummaries().filter((s) => s.id !== item.id));
          renderSummaryArchiveTab(content);
        }
      }
    });
    const head = el("div", { class: "archive-item-head" }, [toggleBtn, deleteBtn]);
    const body = el("div", { class: "archive-item-body is-collapsed" });
    let built = false;
    let editing = false;

    function buildBody() {
      body.innerHTML = "";
      if (editing) {
        const editableRef = el("div", { class: "a4-editor", contenteditable: "true" });
        editableRef.innerHTML = item.html;
        body.appendChild(createRichToolbar(editableRef));
        body.appendChild(editableRef);
        body.appendChild(
          el("button", {
            class: "btn btn-primary btn-small",
            type: "button",
            text: "שמירת שינויים",
            onclick: () => {
              item.html = editableRef.innerHTML;
              item.updatedAt = Date.now();
              const all = loadSummaries();
              const idx = all.findIndex((s) => s.id === item.id);
              if (idx !== -1) {
                all[idx] = item;
                saveSummaries(all);
              }
              editing = false;
              buildBody();
            }
          })
        );
      } else {
        const view = el("div", { class: "a4-editor a4-editor-readonly" });
        view.innerHTML = item.html;
        body.appendChild(view);
        body.appendChild(
          el("button", {
            class: "btn btn-secondary btn-small",
            type: "button",
            text: "עריכה ושינוי",
            onclick: () => {
              editing = true;
              buildBody();
            }
          })
        );
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
