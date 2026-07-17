// מודול "ניהול אנרגיה" - יומן אכילה/שינה, מוזן דרך כפתורי הסימון בשורות ההפסקה בניהול משימות
// נגיש רק דרך הכפתור בעמוד ניהול המשימות (לא דרך תפריט הצד), עם חזרה בחץ ימינה

const ENERGY_TYPES = [
  {
    key: "food",
    emoji: "🥙",
    label: "זמן אוכל",
    placeholder: "מה היה סוג האוכל? כמה אכלת? איך הרגשת אחרי זה? מה עשית אחרי זה?"
  },
  {
    key: "snack",
    emoji: "☕",
    label: "נשנושים",
    placeholder: "מה נשנשת?"
  },
  {
    key: "nightSleep",
    emoji: "🛌",
    label: "שנת לילה",
    placeholder: "איך היתה שנת הלילה? כמה את ערנית עכשיו? כמה חשק ומוטיבציה יש לך להתחיל את היום ולעבוד על משימות?"
  },
  {
    key: "napSleep",
    emoji: "⛅",
    label: "שנת צהריים",
    placeholder: "איך היתה שנת הצהריים? האם התמלאת? או שהתעייפת יותר? האם היא הצריכה אותך לאכול מיד אחרי?"
  }
];

function energyTypeByKey(key) {
  return ENERGY_TYPES.find((t) => t.key === key);
}

function formatDurationHe(totalMinutes) {
  const total = Math.max(0, Number(totalMinutes) || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts = [];
  if (h > 0) parts.push(h === 1 ? "שעה" : `${h} שעות`);
  if (m > 0) parts.push(`${m} דקות`);
  if (parts.length === 0) return "0 דקות";
  return parts.join(" ו-");
}

let energyFilter = new Set();
let energySortOrder = "desc";
let energyExpandedIds = new Set();
let energyAllExpanded = false;

function renderEnergyView(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel" });

  const headerRow = el("div", { class: "energy-header-row" });
  const backBtn = el("button", {
    type: "button",
    class: "util-btn",
    text: "→",
    title: "חזרה לניהול משימות היום",
    onclick: () => showSection("tasks")
  });
  headerRow.appendChild(backBtn);
  headerRow.appendChild(el("h2", { class: "panel-title", text: "⚡ ניהול אנרגיה" }));
  wrap.appendChild(headerRow);
  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "כל תיעודי האכילה והשינה שסימנת בהפסקות, ברצף לפי תאריך ושעה." })
  );

  const toolbar = el("div", { class: "energy-toolbar" });
  const filterGroup = el("div", { class: "energy-filter-group" });
  const allLog = loadEnergyLog();

  ENERGY_TYPES.forEach((typeDef) => {
    const count = allLog.filter((e) => e.type === typeDef.key).length;
    const btn = el("button", {
      type: "button",
      class: "energy-filter-btn" + (energyFilter.has(typeDef.key) ? " is-active" : ""),
      title: typeDef.label
    });
    btn.appendChild(el("span", { class: "energy-filter-emoji", text: typeDef.emoji }));
    btn.appendChild(el("span", { class: "energy-filter-count", text: String(count) }));
    btn.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (energyFilter.has(typeDef.key)) energyFilter.delete(typeDef.key);
        else energyFilter.add(typeDef.key);
      } else if (energyFilter.size === 1 && energyFilter.has(typeDef.key)) {
        energyFilter.clear();
      } else {
        energyFilter.clear();
        energyFilter.add(typeDef.key);
      }
      renderEnergyView(container);
    });
    filterGroup.appendChild(btn);
  });
  toolbar.appendChild(filterGroup);

  const actionsGroup = el("div", { class: "energy-actions-group" });
  const bulkToggleBtn = el("button", {
    type: "button",
    class: "energy-bulk-toggle-btn",
    text: energyAllExpanded ? "︿ סגירת הכול" : "﹀ פתיחת הכול",
    title: energyAllExpanded ? "סגירת כל הפירוטים" : "פתיחת כל הפירוטים",
    onclick: () => {
      energyAllExpanded = !energyAllExpanded;
      if (energyAllExpanded) {
        visibleList().forEach((e) => energyExpandedIds.add(e.id));
      } else {
        energyExpandedIds.clear();
      }
      renderEnergyView(container);
    }
  });
  actionsGroup.appendChild(bulkToggleBtn);

  const sortBtn = el("button", {
    type: "button",
    class: "btn btn-ghost btn-small",
    text: energySortOrder === "desc" ? "מהחדש לישן ⇅" : "מהישן לחדש ⇅",
    onclick: () => {
      energySortOrder = energySortOrder === "desc" ? "asc" : "desc";
      renderEnergyView(container);
    }
  });
  actionsGroup.appendChild(sortBtn);

  const pdfBtn = el("button", {
    type: "button",
    class: "btn btn-secondary btn-small",
    text: "ייצוא ל-PDF",
    onclick: () => exportEnergyLogToPDF(visibleList())
  });
  actionsGroup.appendChild(pdfBtn);
  toolbar.appendChild(actionsGroup);
  wrap.appendChild(toolbar);

  function visibleList() {
    let list = allLog.slice();
    if (energyFilter.size > 0) list = list.filter((e) => energyFilter.has(e.type));
    list.sort((a, b) => {
      const cmp = `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`) || a.createdAt - b.createdAt;
      return energySortOrder === "desc" ? -cmp : cmp;
    });
    return list;
  }

  const listEl = el("div", { class: "energy-list" });
  const visible = visibleList();

  if (visible.length === 0) {
    listEl.appendChild(el("div", { class: "empty-state", text: "עדיין אין תיעוד תואם." }));
  } else {
    visible.forEach((entry) => listEl.appendChild(buildEnergyEntryCard(entry, container)));
  }
  wrap.appendChild(listEl);
  container.appendChild(wrap);
}

function persistEnergyEntry(entry) {
  const list = loadEnergyLog();
  const idx = list.findIndex((e) => e.id === entry.id);
  if (idx !== -1) {
    list[idx] = entry;
    saveEnergyLog(list);
  }
}

function deleteEnergyEntry(id) {
  saveEnergyLog(loadEnergyLog().filter((e) => e.id !== id));
}

function buildEnergyEntryCard(entry, container) {
  const typeDef = energyTypeByKey(entry.type) || { emoji: "•", label: entry.type, placeholder: "" };
  let editing = false;

  const toggleBtn = el("button", { class: "archive-item-toggle", type: "button" }, [
    el("span", { class: "energy-entry-label", text: `${typeDef.emoji} ${typeDef.label}` }),
    el("span", {
      class: "energy-entry-time",
      text: `${entry.startTime || ""}-${entry.endTime || ""} · ${formatDurationHe(entry.durationMinutes)}`
    }),
    el("span", { class: "archive-chevron", text: "︿" })
  ]);

  const editBtn = el("button", { type: "button", class: "bubble-icon-btn", text: "✏️", title: "עריכת התיעוד" });
  const deleteBtn = el("button", {
    type: "button",
    class: "archive-delete",
    text: "🗑",
    title: "מחיקה לצמיתות",
    onclick: (e) => {
      e.stopPropagation();
      deleteEnergyEntry(entry.id);
      renderEnergyView(container);
    }
  });

  const head = el("div", { class: "archive-item-head" }, [toggleBtn, editBtn, deleteBtn]);
  const isCollapsed = !energyExpandedIds.has(entry.id);
  const body = el("div", { class: "archive-item-body" + (isCollapsed ? " is-collapsed" : "") });

  function buildBody() {
    body.innerHTML = "";
    if (editing) {
      const textarea = el("textarea", {
        class: "field-textarea task-energy-textarea",
        placeholder: typeDef.placeholder,
        rows: "3",
        autocomplete: "off"
      });
      textarea.value = entry.text || "";
      const debouncedSave = debounce(() => persistEnergyEntry(entry), 400);
      textarea.addEventListener("input", () => {
        entry.text = textarea.value;
        debouncedSave();
      });
      body.appendChild(textarea);
    } else {
      body.appendChild(
        el("div", { class: "energy-entry-text-view", text: entry.text || "(אין עדיין תיעוד - לחצי על ✏️ כדי להוסיף)" })
      );
    }
  }

  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    editing = !editing;
    body.classList.remove("is-collapsed");
    energyExpandedIds.add(entry.id);
    buildBody();
  });

  toggleBtn.addEventListener("click", () => {
    const collapsed = body.classList.toggle("is-collapsed");
    head.querySelector(".archive-chevron").textContent = collapsed ? "﹀" : "︿";
    if (collapsed) energyExpandedIds.delete(entry.id);
    else energyExpandedIds.add(entry.id);
  });

  buildBody();
  return el("div", { class: "archive-item energy-item" }, [head, body]);
}

function exportEnergyLogToPDF(list) {
  const printRoot = el("div", { class: "day-card summary-print-root" });
  const header = el("div", { class: "day-header" });
  header.appendChild(el("div", { class: "day-date", text: "ניהול אנרגיה" }));
  printRoot.appendChild(header);

  if (list.length === 0) {
    printRoot.appendChild(el("p", { text: "אין תיעוד תואם לסינון הנוכחי." }));
  }
  list.forEach((entry) => {
    const typeDef = energyTypeByKey(entry.type) || { emoji: "•", label: entry.type };
    const row = el("div", { class: "energy-print-row" });
    row.appendChild(
      el("div", {
        class: "energy-print-head",
        text: `${typeDef.emoji} ${typeDef.label} | ${entry.startTime || ""}-${entry.endTime || ""} (${formatDurationHe(entry.durationMinutes)})`
      })
    );
    row.appendChild(el("div", { class: "energy-print-text", text: entry.text || "" }));
    printRoot.appendChild(row);
  });

  printRoot.style.position = "fixed";
  printRoot.style.left = "-9999px";
  printRoot.style.top = "0";
  printRoot.style.width = "700px";
  document.body.appendChild(printRoot);
  exportElementToPDF(printRoot, `ניהול-אנרגיה-${todayISO()}`, null, () => printRoot.remove());
}
