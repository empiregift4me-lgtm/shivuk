// ניהול משימות היום - רשימת משימות עם חישוב אוטומטי של טווחי שעות, החל משעת התחלה שנקבעת מראש.
// כל משימה/הפסקה תופסת זמן אמיתי בלוח (מחושב בשרשור), וסדר המשימות ניתן לשינוי עם עדכון מיידי של השעות.

function loadTaskState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.taskManagement)) || { startTime: "09:00", tasks: [] };
  } catch (e) {
    return { startTime: "09:00", tasks: [] };
  }
}

function saveTaskState(state) {
  localStorage.setItem(STORE_KEYS.taskManagement, JSON.stringify(state));
}

function parseTimeToMinutes(hhmm) {
  const [h, m] = (hhmm || "09:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTime(totalMin) {
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// מחשבת טווח שעות לכל משימה, בשרשור החל משעת ההתחלה - הפסקות תופסות זמן בדיוק כמו משימה רגילה
function computeTaskSchedule(state) {
  let cursor = parseTimeToMinutes(state.startTime);
  return state.tasks.map((t) => {
    const durMin = Math.round((Number(t.hours) || 0) * 60);
    const startMin = cursor;
    const endMin = cursor + durMin;
    cursor = endMin;
    return Object.assign({}, t, { rangeLabel: `${formatMinutesToTime(startMin)}-${formatMinutesToTime(endMin)}` });
  });
}

function renderTasksView(container) {
  container.innerHTML = "";
  const state = loadTaskState();

  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "ניהול משימות היום" }));
  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "כתבי משימה, הגדירי כמה זמן היא תיקח (בשעות), והמערכת תחשב לך את טווח השעות אוטומטית." })
  );

  const startRow = el("div", { class: "task-start-row" });
  startRow.appendChild(el("label", { class: "task-start-label", text: "שעת התחלה:" }));
  const startInput = el("input", { type: "time", class: "field-input task-start-input" });
  startInput.value = state.startTime || "09:00";
  startRow.appendChild(startInput);
  wrap.appendChild(startRow);

  const summaryLine = el("p", { class: "task-summary" });
  wrap.appendChild(summaryLine);

  const addRow = el("div", { class: "task-add-row" });
  const addTaskBtn = el("button", { class: "btn btn-primary btn-small", type: "button", text: "+ משימה" });
  const addBreakBtn = el("button", { class: "btn btn-secondary btn-small", type: "button", text: "☕ הפסקה" });
  addRow.appendChild(addTaskBtn);
  addRow.appendChild(addBreakBtn);
  wrap.appendChild(addRow);

  const list = el("div", { class: "task-list" });
  wrap.appendChild(list);

  function persist() {
    saveTaskState(state);
  }

  function updateSummary() {
    const schedule = computeTaskSchedule(state);
    const realTasks = state.tasks.filter((t) => !t.isBreak);
    const totalMinutes = state.tasks.reduce((sum, t) => sum + Math.round((Number(t.hours) || 0) * 60), 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (state.tasks.length === 0) {
      summaryLine.textContent = "";
      return;
    }
    const finish = schedule[schedule.length - 1].rangeLabel.split("-")[1];
    summaryLine.textContent = `${realTasks.length} משימות, ${h} שעות ו-${m} דקות בסך הכול | סיום משוער: ${finish}`;
  }

  function addTask(isBreak) {
    state.tasks.push({
      id: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      text: "",
      hours: "",
      done: false,
      isBreak: !!isBreak
    });
    persist();
    renderList();
    requestAnimationFrame(() => {
      const inputs = list.querySelectorAll(".task-text-input");
      const last = inputs[inputs.length - 1];
      if (last) last.focus();
    });
  }

  function renderList() {
    list.innerHTML = "";
    const schedule = computeTaskSchedule(state);

    if (state.tasks.length === 0) {
      list.appendChild(el("div", { class: "empty-state", text: "עדיין לא נוספו משימות. לחצי על + משימה כדי להתחיל." }));
    }

    schedule.forEach((task, idx) => {
      const row = el("div", { class: "task-row" + (task.isBreak ? " is-break" : "") + (task.done ? " is-done" : "") });

      const checkbox = el("input", { type: "checkbox", class: "task-checkbox", title: "בוצע" });
      checkbox.checked = !!task.done;
      checkbox.addEventListener("change", () => {
        state.tasks[idx].done = checkbox.checked;
        persist();
        renderList();
      });
      row.appendChild(checkbox);

      row.appendChild(el("span", { class: "task-range", text: task.rangeLabel }));

      const textInput = el("input", {
        type: "text",
        class: "field-input task-text-input",
        placeholder: task.isBreak ? "הפסקה..." : "משימה...",
        autocomplete: "off"
      });
      textInput.value = task.text || "";
      textInput.addEventListener("input", () => {
        state.tasks[idx].text = textInput.value;
        persist();
        updateSummary();
      });
      textInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (idx === state.tasks.length - 1) {
          addTask(false);
        } else {
          const nextInput = list.children[idx + 1] && list.children[idx + 1].querySelector(".task-text-input");
          if (nextInput) nextInput.focus();
        }
      });
      row.appendChild(textInput);

      const hoursInput = el("input", {
        type: "number",
        class: "field-input task-hours-input",
        step: "0.25",
        min: "0.25",
        placeholder: "1.5",
        autocomplete: "off"
      });
      hoursInput.value = task.hours === 0 ? "" : task.hours || "";
      hoursInput.addEventListener("input", () => {
        state.tasks[idx].hours = hoursInput.value === "" ? "" : Number(hoursInput.value);
        persist();
        renderList();
      });
      row.appendChild(hoursInput);
      row.appendChild(el("span", { class: "task-hours-suffix", text: "שעות" }));

      const controls = el("div", { class: "task-row-controls" });
      const upBtn = el("button", { type: "button", class: "task-move-btn", text: "▲", title: "הזזה למעלה" });
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => {
        [state.tasks[idx - 1], state.tasks[idx]] = [state.tasks[idx], state.tasks[idx - 1]];
        persist();
        renderList();
      });
      const downBtn = el("button", { type: "button", class: "task-move-btn", text: "▼", title: "הזזה למטה" });
      downBtn.disabled = idx === state.tasks.length - 1;
      downBtn.addEventListener("click", () => {
        [state.tasks[idx + 1], state.tasks[idx]] = [state.tasks[idx], state.tasks[idx + 1]];
        persist();
        renderList();
      });
      const delBtn = el("button", { type: "button", class: "task-delete-btn", text: "🗑", title: "מחיקה" });
      delBtn.addEventListener("click", () => {
        state.tasks.splice(idx, 1);
        persist();
        renderList();
      });
      controls.appendChild(upBtn);
      controls.appendChild(downBtn);
      controls.appendChild(delBtn);
      row.appendChild(controls);

      list.appendChild(row);
    });

    updateSummary();
  }

  addTaskBtn.addEventListener("click", () => addTask(false));
  addBreakBtn.addEventListener("click", () => addTask(true));
  startInput.addEventListener("change", () => {
    state.startTime = startInput.value || "09:00";
    persist();
    renderList();
  });

  renderList();
  container.appendChild(wrap);
}
