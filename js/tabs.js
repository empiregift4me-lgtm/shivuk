// ניהול הלשוניות והתוכן של כל אחת מהן

function renderJournalTab(container) {
  container.innerHTML = "";
  const date = todayISO();
  const wrap = el("div", { class: "day-card" });

  const header = el("div", { class: "day-header" });
  header.appendChild(el("div", { class: "day-date", text: formatDateHe(date) }));
  const streakNote = el("div", { class: "streak-note" });
  header.appendChild(streakNote);
  wrap.appendChild(header);

  function renderStreak() {
    const streakN = computeJournalStreak();
    streakNote.textContent = streakN > 0 ? `✍️ ${formatStreakLabel(streakN)} ברצף שאת כותבת` : "היום זה מתחיל 🌱";
  }

  const pillsRow = el("div", { class: "period-pills" });
  wrap.appendChild(pillsRow);

  const editorHost = el("div");
  wrap.appendChild(editorHost);

  let activePeriod = null;
  let editorInstance = null;

  function pickDefaultPeriod(status) {
    if (!status.morning || !status.morning.saved) return "morning";
    if (!status.evening || !status.evening.saved) return "evening";
    return null;
  }

  function renderPills() {
    pillsRow.innerHTML = "";
    const status = dayStatus(date);
    PERIODS.forEach((p) => {
      const isSaved = status[p] && status[p].saved;
      const btn = el("button", {
        class: "period-pill" + (activePeriod === p ? " is-active" : "") + (isSaved ? " is-done" : ""),
        type: "button",
        text: isSaved ? `✓ ${PERIOD_LABELS[p]}` : PERIOD_LABELS[p],
        onclick: () => {
          if (isSaved) return;
          activePeriod = p;
          renderPills();
          renderEditor();
        }
      });
      if (isSaved) btn.disabled = true;
      pillsRow.appendChild(btn);
    });
  }

  function renderEditor() {
    editorHost.innerHTML = "";
    if (editorInstance && editorInstance.destroy) editorInstance.destroy();
    if (!activePeriod) {
      editorHost.appendChild(el("div", { class: "empty-state", text: "שני היומנים של היום נשמרו. מתראים מחר 🎉" }));
      return;
    }
    editorInstance = buildDraftEditor(date, activePeriod, () => {
      activePeriod = pickDefaultPeriod(dayStatus(date));
      renderStreak();
      renderPills();
      renderEditor();
    });
    editorHost.appendChild(editorInstance.element);
  }

  activePeriod = pickDefaultPeriod(dayStatus(date));
  renderStreak();
  renderPills();
  renderEditor();

  container.appendChild(wrap);
}

function renderArchiveTab(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "ארכיונים" }));
  const entries = allEntriesSorted("desc").filter((e) => e.saved);

  if (entries.length === 0) {
    wrap.appendChild(el("div", { class: "empty-state", text: "עדיין אין רשומות שמורות בארכיון." }));
    container.appendChild(wrap);
    return;
  }

  entries.forEach((entry) => {
    const item = el("div", { class: "archive-item" });
    const toggleBtn = el("button", { class: "archive-item-toggle", type: "button" }, [
      el("span", { class: "archive-date", text: `${formatDateHe(entry.date)}, ${PERIOD_LABELS[entry.period]}` }),
      el("span", { class: "archive-count", text: `${entry.exerciseIds.length} תרגילים` }),
      el("span", { class: "archive-chevron", text: "︿" })
    ]);
    const deleteBtn = el("button", {
      class: "archive-delete",
      type: "button",
      text: "🗑",
      title: "מחיקת הרשומה לצמיתות",
      onclick: (e) => {
        e.stopPropagation();
        if (confirm(`למחוק לצמיתות את היומן של ${formatDateHe(entry.date)}, ${PERIOD_LABELS[entry.period]}? לא ניתן לשחזר.`)) {
          deleteEntry(entry.date, entry.period);
          renderArchiveTab(container);
        }
      }
    });
    const head = el("div", { class: "archive-item-head" }, [toggleBtn, deleteBtn]);
    const body = el("div", { class: "archive-item-body is-collapsed" });
    let built = false;
    toggleBtn.addEventListener("click", () => {
      const collapsed = body.classList.toggle("is-collapsed");
      head.querySelector(".archive-chevron").textContent = collapsed ? "﹀" : "︿";
      if (!collapsed && !built) {
        const card = buildArchiveCard(entry.date, entry.period);
        body.appendChild(card.element);
        built = true;
      }
    });
    item.appendChild(head);
    item.appendChild(body);
    wrap.appendChild(item);
  });

  container.appendChild(wrap);
}

function renderFiltersTab(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "סינונים" }));
  wrap.appendChild(el("p", { class: "panel-subtitle", text: "בחרי תרגיל כדי לראות את כל הפעמים שמילאת אותו לאורך זמן." }));

  const controls = el("div", { class: "filter-controls" });
  const select = el("select", { class: "field-input filter-select" });
  EXERCISES.forEach((ex) => {
    select.appendChild(el("option", { value: ex.id, text: ex.name }));
  });
  let order = "desc";
  const orderBtn = el("button", {
    class: "btn btn-ghost btn-small",
    type: "button",
    text: "מהחדש לישן ⇅",
    onclick: () => {
      order = order === "desc" ? "asc" : "desc";
      orderBtn.textContent = order === "desc" ? "מהחדש לישן ⇅" : "מהישן לחדש ⇅";
      renderResults();
    }
  });
  controls.appendChild(select);
  controls.appendChild(orderBtn);
  wrap.appendChild(controls);

  const results = el("div", { class: "filter-results" });
  wrap.appendChild(results);

  function renderResults() {
    results.innerHTML = "";
    const exId = select.value;
    const instance = getExerciseById(exId);
    const entries = allEntriesSorted(order).filter((e) => e.saved && e.exerciseIds.includes(exId));
    if (entries.length === 0) {
      results.appendChild(el("div", { class: "empty-state", text: "עדיין אין רשומות לתרגיל הזה." }));
      return;
    }
    entries.forEach((entry) => {
      const block = el("div", { class: "filter-result-block" });
      block.appendChild(
        el("div", { class: "filter-result-date", text: `${formatDateHe(entry.date)}, ${PERIOD_LABELS[entry.period]}` })
      );
      const rendered = renderExercise(instance, entry.data[exId], true);
      block.appendChild(rendered.el);
      results.appendChild(block);
    });
  }

  select.addEventListener("change", renderResults);
  renderResults();
  container.appendChild(wrap);
}

const TABS = [
  { id: "journal", label: "יומן", render: renderJournalTab },
  { id: "archive", label: "ארכיונים", render: renderArchiveTab },
  { id: "filters", label: "סינונים", render: renderFiltersTab },
  { id: "habits", label: "מעקב הרגלים", render: renderHabitsTab }
];

function buildExercisesMenu(nav, exBtn) {
  const dropdown = el("div", { class: "exercises-dropdown is-collapsed" });

  function closeMenu() {
    dropdown.classList.add("is-collapsed");
    exBtn.classList.remove("is-active");
  }

  function openMenu() {
    dropdown.innerHTML = "";
    const date = todayISO();
    PERIODS.forEach((p) => {
      dropdown.appendChild(el("div", { class: "dropdown-section-label", text: PERIOD_LABELS[p] }));
      EXERCISES.filter((e) => e.period === p).forEach((ex) => {
        dropdown.appendChild(
          el("button", {
            type: "button",
            class: "dropdown-item",
            text: ex.name,
            onclick: () => {
              addExerciseToDay(date, ex.id);
              closeMenu();
            }
          })
        );
      });
    });
    dropdown.classList.remove("is-collapsed");
    exBtn.classList.add("is-active");
  }

  exBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains("is-collapsed")) openMenu();
    else closeMenu();
  });
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== exBtn) closeMenu();
  });

  nav.insertAdjacentElement("afterend", dropdown);
}

function initTabs() {
  const nav = document.getElementById("tab-nav");
  const content = document.getElementById("tab-content");

  function activate(tabId) {
    TABS.forEach((t) => {
      const btn = nav.querySelector(`[data-tab="${t.id}"]`);
      btn.classList.toggle("is-active", t.id === tabId);
    });
    const tab = TABS.find((t) => t.id === tabId);
    tab.render(content);
    location.hash = tabId;
  }

  const journalBtn = el("button", {
    class: "tab-btn",
    type: "button",
    "data-tab": "journal",
    text: "יומן",
    onclick: () => activate("journal")
  });
  nav.appendChild(journalBtn);

  const exBtn = el("button", { class: "tab-btn", type: "button", text: "תרגילים" });
  nav.appendChild(exBtn);
  buildExercisesMenu(nav, exBtn);

  TABS.filter((t) => t.id !== "journal").forEach((t) => {
    const btn = el("button", { class: "tab-btn", type: "button", "data-tab": t.id, text: t.label, onclick: () => activate(t.id) });
    nav.appendChild(btn);
  });

  const initial = TABS.some((t) => t.id === location.hash.slice(1)) ? location.hash.slice(1) : "journal";
  activate(initial);
}
