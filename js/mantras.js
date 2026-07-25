// תיעוד מנטרות - רשימת המשפטים החזקים שנשמרו יום אחרי יום מהחלונית שאחרי הסיסמה, עם אפשרות
// להקליד אותם מחדש כתרגיל חיזוק (בלי לשמור את מה שהוקלד), לסמן מועדפים, ולחפש בהיסטוריה

let mantraSearchQuery = "";

function renderMantrasView(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel mantra-page" });

  const headerRow = el("div", { class: "energy-header-row" });
  const backBtn = el("button", {
    type: "button",
    class: "util-btn",
    text: "→",
    title: "חזרה ללוח הבקרה",
    onclick: () => showSection("dashboard")
  });
  headerRow.appendChild(backBtn);
  headerRow.appendChild(el("h2", { class: "panel-title", text: "🧘 תיעוד מנטרות" }));

  const searchInput = el("input", {
    type: "text",
    class: "field-input mantra-search-input",
    placeholder: "חיפוש..."
  });
  searchInput.value = mantraSearchQuery;
  searchInput.addEventListener("input", () => {
    mantraSearchQuery = searchInput.value;
    renderList();
  });
  headerRow.appendChild(searchInput);
  wrap.appendChild(headerRow);

  const listEl = el("div", { class: "mantra-list" });
  wrap.appendChild(listEl);

  function persist(log) {
    saveMantraLog(log);
  }

  function renderList() {
    listEl.innerHTML = "";
    const log = loadMantraLog().slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const q = mantraSearchQuery.trim().toLowerCase();
    const filtered = q
      ? log.filter((m) => m.sentence.toLowerCase().includes(q) || formatDateHe(m.date).toLowerCase().includes(q))
      : log;

    if (log.length === 0) {
      listEl.appendChild(
        el("div", { class: "empty-state", text: 'עדיין לא נשמרו מנטרות. לוחצים על "שמירה לתיעוד המנטרות" בחלונית שאחרי הסיסמה.' })
      );
      return;
    }
    if (filtered.length === 0) {
      listEl.appendChild(el("div", { class: "empty-state", text: "לא נמצאו מנטרות תואמות לחיפוש." }));
      return;
    }

    filtered.forEach((mantra) => listEl.appendChild(buildMantraCard(mantra)));
  }

  function buildMantraCard(mantra) {
    const card = el("div", { class: "mantra-card" });

    const topRow = el("div", { class: "mantra-card-top" });
    topRow.appendChild(el("span", { class: "mantra-date", text: formatDateHe(mantra.date) }));

    const favBtn = el("button", {
      type: "button",
      class: "mantra-fav-btn" + (mantra.favorite ? " is-active" : ""),
      text: mantra.favorite ? "⭐" : "☆",
      title: mantra.favorite ? "הסרה ממועדפים" : "סימון כמועדף"
    });
    favBtn.addEventListener("click", () => {
      const log = loadMantraLog();
      const item = log.find((m) => m.id === mantra.id);
      if (item) {
        item.favorite = !item.favorite;
        persist(log);
        renderList();
      }
    });

    const deleteBtn = el("button", {
      type: "button",
      class: "archive-delete",
      text: "🗑",
      title: "מחיקה לצמיתות",
      onclick: () => {
        if (!confirm("למחוק את המנטרה הזו לצמיתות?")) return;
        persist(loadMantraLog().filter((m) => m.id !== mantra.id));
        renderList();
      }
    });

    topRow.appendChild(favBtn);
    topRow.appendChild(deleteBtn);
    card.appendChild(topRow);

    card.appendChild(el("p", { class: "mantra-sentence", text: mantra.sentence }));

    // שורת הקלדה חופשית - לא נשמרת בשום מקום, תמיד חוזרת ריקה. Enter סופר "הפנמה" ומנקה את השורה.
    // מוסתרת כברירת מחדל כדי לא לתפוס מקום - נפתחת בלחיצה על העיפרון ליד שורת המונה
    const retypeInput = el("input", {
      type: "text",
      class: "mantra-retype-input is-hidden",
      placeholder: "הקלידי כאן את המשפט מחדש...",
      autocomplete: "off"
    });
    const countLabel = el("span", {
      class: "mantra-count-label",
      text: mantra.typedCount > 0 ? `הפנמת את המשפט הזה כבר ${mantra.typedCount} פעמים` : ""
    });
    const editToggleBtn = el("button", {
      type: "button",
      class: "mantra-edit-toggle",
      text: "✏️",
      title: "הקלדה מחדש כתרגיל חיזוק"
    });
    editToggleBtn.addEventListener("click", () => {
      retypeInput.classList.toggle("is-hidden");
      if (!retypeInput.classList.contains("is-hidden")) retypeInput.focus();
    });
    retypeInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (!retypeInput.value.trim()) return;
      const log = loadMantraLog();
      const item = log.find((m) => m.id === mantra.id);
      if (item) {
        item.typedCount = (item.typedCount || 0) + 1;
        persist(log);
        countLabel.textContent = `הפנמת את המשפט הזה כבר ${item.typedCount} פעמים`;
      }
      retypeInput.value = "";
    });
    const countRow = el("div", { class: "mantra-count-row" }, [countLabel, editToggleBtn]);
    card.appendChild(retypeInput);
    card.appendChild(countRow);

    return card;
  }

  renderList();
  container.appendChild(wrap);
}
