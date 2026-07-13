// כרטיסי "יום" - עורך טיוטה (ליומן הראשי, תמיד פתוח לעריכה) וכרטיס ארכיון (רשומה שמורה, ננעלת)

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function getOrCreateDraft(date, period) {
  return getEntry(date, period) || { date, period, exerciseIds: [], data: {}, saved: false };
}

function addExerciseToDay(date, exerciseId) {
  const instance = getExerciseById(exerciseId);
  const period = instance.period;
  const entry = getOrCreateDraft(date, period);
  if (!entry.exerciseIds.includes(exerciseId)) {
    entry.exerciseIds.push(exerciseId);
    upsertEntry(entry);
    document.dispatchEvent(new CustomEvent("entries-changed", { detail: { date, period } }));
  }
  return entry;
}

function removeExerciseFromDay(date, period, exerciseId) {
  const entry = getOrCreateDraft(date, period);
  entry.exerciseIds = entry.exerciseIds.filter((id) => id !== exerciseId);
  delete entry.data[exerciseId];
  upsertEntry(entry);
  document.dispatchEvent(new CustomEvent("entries-changed", { detail: { date, period } }));
  return entry;
}

function renderExerciseBlocks(entry, cardBody, isLocked, activeBlocks) {
  entry.exerciseIds.forEach((id) => {
    const instance = getExerciseById(id);
    if (!instance) return;
    const blockWrap = el("div", { class: "exercise-block" });
    const blockHeader = el("div", { class: "exercise-block-header" });
    blockHeader.appendChild(el("h3", { class: "exercise-title", text: instance.name }));
    blockWrap.appendChild(blockHeader);

    let initialData = entry.data[id];
    const rendered = renderExercise(instance, initialData, isLocked);
    blockWrap.appendChild(rendered.el);
    cardBody.appendChild(blockWrap);
    activeBlocks.push({ id, getData: rendered.getData });

    if (!initialData) {
      entry.data[id] = rendered.getData();
      upsertEntry(entry);
    }
  });
}

// עורך טיוטה - תמיד במצב עריכה, בשימוש בלשונית "יומן" הראשית בלבד
function buildDraftEditor(date, period, onSaved) {
  const root = el("div", { class: "day-card" });
  let activeBlocks = [];

  function captureAll() {
    const entry = getOrCreateDraft(date, period);
    activeBlocks.forEach(({ id, getData }) => {
      entry.data[id] = getData();
    });
    return entry;
  }

  function render() {
    activeBlocks = [];
    root.innerHTML = "";
    const entry = getOrCreateDraft(date, period);
    const cardBody = el("div", { class: "day-body" });

    if (entry.exerciseIds.length === 0) {
      cardBody.appendChild(
        el("div", {
          class: "empty-state",
          text: `עדיין לא נוספו תרגילים ליום הזה. לחצי על לשונית "תרגילים" למעלה ובחרי מה למלא.`
        })
      );
    } else {
      renderExerciseBlocks(entry, cardBody, false, activeBlocks);
      cardBody.querySelectorAll(".exercise-block").forEach((blockWrap, i) => {
        const id = entry.exerciseIds[i];
        blockWrap
          .querySelector(".exercise-block-header")
          .appendChild(
            el("button", {
              class: "block-remove",
              type: "button",
              text: "הסרה",
              onclick: () => {
                removeExerciseFromDay(date, period, id);
                render();
              }
            })
          );
        const persist = debounce(() => {
          const fresh = getOrCreateDraft(date, period);
          const match = activeBlocks.find((b) => b.id === id);
          if (match) fresh.data[id] = match.getData();
          upsertEntry(fresh);
        }, 300);
        blockWrap.addEventListener("input", persist);
      });
    }
    root.appendChild(cardBody);

    if (entry.exerciseIds.length > 0) {
      root.appendChild(
        el("button", {
          class: "btn btn-primary btn-save",
          type: "button",
          text: `שמירת ${PERIOD_LABELS[period]}`,
          onclick: () => {
            const fresh = captureAll();
            fresh.saved = true;
            fresh.savedAt = Date.now();
            upsertEntry(fresh);
            document.dispatchEvent(new CustomEvent("entries-changed", { detail: { date, period } }));
            celebrateSave();
            if (typeof onSaved === "function") onSaved();
          }
        })
      );
    }
  }

  const listener = (e) => {
    if (e.detail && e.detail.date === date && e.detail.period === period) render();
  };
  document.addEventListener("entries-changed", listener);

  render();
  return { element: root, refresh: render, destroy: () => document.removeEventListener("entries-changed", listener) };
}

// כרטיס ארכיון - מציג רשומה שמורה, ננעלת כברירת מחדל עם אפשרות עריכה וייצוא
function buildArchiveCard(date, period) {
  const root = el("div", { class: "day-card" });
  let editingOverride = false;
  let activeBlocks = [];

  function captureAll() {
    const entry = getEntry(date, period);
    activeBlocks.forEach(({ id, getData }) => {
      entry.data[id] = getData();
    });
    return entry;
  }

  function render() {
    activeBlocks = [];
    root.innerHTML = "";
    const entry = getEntry(date, period);
    if (!entry) return;
    const isLocked = !editingOverride;

    const header = el("div", { class: "day-header" });
    header.appendChild(el("div", { class: "day-date", text: `${formatDateHe(date)} · ${PERIOD_LABELS[period]}` }));
    const actions = el("div", { class: "day-actions" });
    actions.appendChild(
      el("button", {
        class: "btn btn-secondary btn-small",
        type: "button",
        text: editingOverride ? "סיום עריכה" : "עריכה ושינוי",
        onclick: () => {
          if (editingOverride) {
            const fresh = captureAll();
            upsertEntry(fresh);
          }
          editingOverride = !editingOverride;
          render();
        }
      })
    );
    actions.appendChild(
      el("button", {
        class: "btn btn-primary btn-small",
        type: "button",
        text: "ייצוא ל-PDF",
        onclick: () => exportDayToPDF(root, `${date}_${PERIOD_LABELS[period]}`)
      })
    );
    header.appendChild(actions);
    root.appendChild(header);

    const cardBody = el("div", { class: "day-body" });
    root.appendChild(cardBody);
    renderExerciseBlocks(entry, cardBody, isLocked, activeBlocks);

    if (!isLocked) {
      cardBody.querySelectorAll(".exercise-block").forEach((blockWrap, i) => {
        const id = entry.exerciseIds[i];
        const persist = debounce(() => {
          const fresh = getEntry(date, period);
          const match = activeBlocks.find((b) => b.id === id);
          if (match) fresh.data[id] = match.getData();
          upsertEntry(fresh);
        }, 300);
        blockWrap.addEventListener("input", persist);
      });
    }
  }

  render();
  return { element: root, refresh: render };
}
