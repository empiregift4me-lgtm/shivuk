// כרטיס "יום" - הרכיב המרכזי שמציג/עורך/נועל תרגילים עבור תאריך נתון

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function getOrCreateDraft(date) {
  return getEntry(date) || { date, exerciseIds: [], data: {}, saved: false };
}

function addExerciseToDay(date, exerciseId) {
  const entry = getOrCreateDraft(date);
  if (!entry.exerciseIds.includes(exerciseId)) {
    entry.exerciseIds.push(exerciseId);
    upsertEntry(entry);
    document.dispatchEvent(new CustomEvent("entries-changed", { detail: { date } }));
  }
  return entry;
}

function removeExerciseFromDay(date, exerciseId) {
  const entry = getOrCreateDraft(date);
  entry.exerciseIds = entry.exerciseIds.filter((id) => id !== exerciseId);
  delete entry.data[exerciseId];
  upsertEntry(entry);
  document.dispatchEvent(new CustomEvent("entries-changed", { detail: { date } }));
  return entry;
}

function buildDayCard(date) {
  const root = el("div", { class: "day-card" });
  let editingOverride = false;
  let activeBlocks = [];

  function captureAll() {
    const entry = getOrCreateDraft(date);
    activeBlocks.forEach(({ id, getData }) => {
      entry.data[id] = getData();
    });
    return entry;
  }

  function render() {
    activeBlocks = [];
    root.innerHTML = "";
    const entry = getOrCreateDraft(date);
    const isLocked = entry.saved && !editingOverride;

    const header = el("div", { class: "day-header" });
    header.appendChild(el("div", { class: "day-date", text: formatDateHe(date) }));
    const actions = el("div", { class: "day-actions" });
    if (entry.saved) {
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
          onclick: () => exportDayToPDF(root, date)
        })
      );
      header.appendChild(actions);
    }
    root.appendChild(header);

    const cardBody = el("div", { class: "day-body" });
    root.appendChild(cardBody);

    if (entry.exerciseIds.length === 0) {
      cardBody.appendChild(
        el("div", { class: "empty-state", text: 'עדיין לא נוספו תרגילים ליום הזה. עברי ללשונית "תרגילים" ובחרי מה למלא היום.' })
      );
    } else {
      entry.exerciseIds.forEach((id) => {
        const instance = getExerciseById(id);
        if (!instance) return;
        const blockWrap = el("div", { class: "exercise-block" });
        const blockHeader = el("div", { class: "exercise-block-header" });
        blockHeader.appendChild(el("h3", { class: "exercise-title", text: instance.name }));
        if (!isLocked) {
          blockHeader.appendChild(
            el("button", {
              class: "block-remove",
              type: "button",
              text: "הסרה",
              onclick: () => {
                removeExerciseFromDay(date, id);
                render();
              }
            })
          );
        }
        blockWrap.appendChild(blockHeader);
        const rendered = renderExercise(instance, entry.data[id], isLocked);
        blockWrap.appendChild(rendered.el);
        cardBody.appendChild(blockWrap);
        activeBlocks.push({ id, getData: rendered.getData });

        if (!isLocked) {
          const persist = debounce(() => {
            const fresh = getOrCreateDraft(date);
            fresh.data[id] = rendered.getData();
            upsertEntry(fresh);
          }, 300);
          blockWrap.addEventListener("input", persist);
        }
      });
    }

    if (!isLocked && entry.exerciseIds.length > 0) {
      root.appendChild(
        el("button", {
          class: "btn btn-primary btn-save",
          type: "button",
          text: "שמירת היום",
          onclick: () => {
            const fresh = captureAll();
            fresh.saved = true;
            fresh.savedAt = Date.now();
            upsertEntry(fresh);
            editingOverride = false;
            document.dispatchEvent(new CustomEvent("entries-changed", { detail: { date } }));
            render();
          }
        })
      );
    }
  }

  const listener = (e) => {
    if (e.detail && e.detail.date === date) render();
  };
  document.addEventListener("entries-changed", listener);

  render();
  return { element: root, refresh: render, destroy: () => document.removeEventListener("entries-changed", listener) };
}
