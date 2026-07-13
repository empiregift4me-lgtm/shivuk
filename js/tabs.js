// ניהול הלשוניות והתוכן של כל אחת מהן

function renderJournalTab(container) {
  container.innerHTML = "";
  const card = buildDayCard(todayISO());
  container.appendChild(card.element);
}

function renderExercisesTab(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "תרגילים" }));
  wrap.appendChild(el("p", { class: "panel-subtitle", text: 'לחיצה על תרגיל מוסיפה אותו כתבנית ליומן של היום. לחיצה נוספת מסירה אותו.' }));

  function section(periodKey, label) {
    const sec = el("div", { class: "exercise-section" });
    sec.appendChild(el("h3", { class: "period-heading", text: label }));
    const grid = el("div", { class: "exercise-grid" });
    sec.appendChild(grid);

    function renderGrid() {
      grid.innerHTML = "";
      const entry = getEntry(todayISO());
      const activeIds = entry ? entry.exerciseIds : [];
      EXERCISES.filter((e) => e.period === periodKey).forEach((ex) => {
        const isActive = activeIds.includes(ex.id);
        const card = el("button", {
          class: "exercise-picker-card" + (isActive ? " is-active" : ""),
          type: "button",
          onclick: () => {
            if (isActive) removeExerciseFromDay(todayISO(), ex.id);
            else addExerciseToDay(todayISO(), ex.id);
            renderGrid();
          }
        });
        card.appendChild(el("span", { class: "picker-card-name", text: ex.name }));
        card.appendChild(el("span", { class: "picker-card-status", text: isActive ? "✓ נוסף היום" : "הוספה ליומן" }));
        grid.appendChild(card);
      });
    }
    renderGrid();
    return sec;
  }

  wrap.appendChild(section("morning", "בוקר"));
  wrap.appendChild(section("evening", "ערב"));
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
    const head = el("button", { class: "archive-item-head", type: "button" }, [
      el("span", { class: "archive-date", text: formatDateHe(entry.date) }),
      el("span", { class: "archive-count", text: `${entry.exerciseIds.length} תרגילים` }),
      el("span", { class: "archive-chevron", text: "︿" })
    ]);
    const body = el("div", { class: "archive-item-body is-collapsed" });
    let built = false;
    head.addEventListener("click", () => {
      const collapsed = body.classList.toggle("is-collapsed");
      head.querySelector(".archive-chevron").textContent = collapsed ? "﹀" : "︿";
      if (!collapsed && !built) {
        const card = buildDayCard(entry.date);
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
      block.appendChild(el("div", { class: "filter-result-date", text: formatDateHe(entry.date) }));
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
  { id: "exercises", label: "תרגילים", render: renderExercisesTab },
  { id: "archive", label: "ארכיונים", render: renderArchiveTab },
  { id: "filters", label: "סינונים", render: renderFiltersTab },
  { id: "habits", label: "מעקב הרגלים", render: renderHabitsTab }
];

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

  TABS.forEach((t) => {
    const btn = el("button", { class: "tab-btn", type: "button", "data-tab": t.id, text: t.label, onclick: () => activate(t.id) });
    nav.appendChild(btn);
  });

  const initial = TABS.some((t) => t.id === location.hash.slice(1)) ? location.hash.slice(1) : "journal";
  activate(initial);
}
