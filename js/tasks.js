// ניהול משימות היום - רשימת משימות עם חישוב אוטומטי של טווחי שעות, החל משעת התחלה שנקבעת מראש.
// כל משימה/הפסקה תופסת זמן אמיתי בלוח (מחושב בשרשור), וסדר המשימות ניתן לשינוי (חיצים או גרירה) עם עדכון מיידי של השעות.

function loadTaskState() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORE_KEYS.taskManagement)) || { startTime: "09:00", tasks: [] };
  } catch (e) {
    state = { startTime: "09:00", tasks: [] };
  }
  // מיגרציה חד-פעמית ממשך זמן בשעות עשרוניות (פורמט ישן) לשעות+דקות נפרדות
  state.tasks.forEach((t) => {
    if (t.minutes === undefined) {
      const totalH = Number(t.hours) || 0;
      t.hours = Math.floor(totalH);
      t.minutes = Math.round((totalH - Math.floor(totalH)) * 60);
    }
  });
  return state;
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

function taskDurationMinutes(t) {
  return (Number(t.hours) || 0) * 60 + (Number(t.minutes) || 0);
}

// מחשבת טווח שעות לכל משימה, בשרשור החל משעת ההתחלה - הפסקות תופסות זמן בדיוק כמו משימה רגילה
function computeTaskSchedule(state) {
  let cursor = parseTimeToMinutes(state.startTime);
  return state.tasks.map((t) => {
    const durMin = taskDurationMinutes(t);
    const startMin = cursor;
    const endMin = cursor + durMin;
    cursor = endMin;
    return Object.assign({}, t, { rangeLabel: `${formatMinutesToTime(startMin)}-${formatMinutesToTime(endMin)}` });
  });
}

// צלצול ארוך יותר מהצ'ימר הרגיל - כמה צפצופים חוזרים, לתשומת לב ברורה שהטיימר הסתיים
function playLongAlarm() {
  if (typeof playNotes !== "function") return;
  const notes = [];
  for (let i = 0; i < 7; i++) notes.push([880, i * 0.5]);
  playNotes(notes, { dur: 0.35, gain: 0.2 });
}

function renderTasksView(container) {
  container.innerHTML = "";
  const state = loadTaskState();

  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "ניהול משימות היום" }));
  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "כתבי משימה, הגדירי כמה זמן היא תיקח, והמערכת תחשב לך את טווח השעות אוטומטית." })
  );

  const summaryLine = el("p", { class: "task-summary" });
  wrap.appendChild(summaryLine);

  const startRow = el("div", { class: "task-start-row" });

  const startGroup = el("div", { class: "task-start-group" });
  startGroup.appendChild(el("label", { class: "task-start-label", text: "שעת התחלה:" }));
  const startInput = el("input", { type: "time", class: "field-input task-start-input" });
  startInput.value = state.startTime || "09:00";
  startGroup.appendChild(startInput);

  const timerGroup = el("div", { class: "task-timer-group" });
  const timerInputs = el("div", { class: "task-timer-inputs" });
  const timerHoursInput = el("input", {
    type: "text",
    inputmode: "numeric",
    class: "field-input task-timer-hours",
    placeholder: "שע",
    autocomplete: "off"
  });
  const timerMinutesInput = el("input", {
    type: "text",
    inputmode: "numeric",
    class: "field-input task-timer-minutes",
    placeholder: "דק",
    autocomplete: "off"
  });
  timerInputs.appendChild(timerHoursInput);
  timerInputs.appendChild(el("span", { class: "task-timer-colon", text: ":" }));
  timerInputs.appendChild(timerMinutesInput);
  const timerDisplay = el("span", { class: "task-timer-display", text: "" });
  const timerToggleBtn = el("button", { type: "button", class: "util-btn task-timer-btn", text: "▶", title: "התחלה/השהיה" });
  const timerResetBtn = el("button", { type: "button", class: "util-btn task-timer-btn", text: "↺", title: "איפוס" });
  timerGroup.appendChild(timerInputs);
  timerGroup.appendChild(timerDisplay);
  timerGroup.appendChild(timerToggleBtn);
  timerGroup.appendChild(timerResetBtn);

  startRow.appendChild(timerGroup);
  startRow.appendChild(startGroup);
  wrap.appendChild(startRow);

  let timerRemaining = 0;
  let timerRunning = false;
  let timerIntervalId = null;

  function timerFormat(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function renderTimer() {
    timerDisplay.textContent = timerRemaining > 0 || timerRunning ? timerFormat(timerRemaining) : "";
    timerToggleBtn.textContent = timerRunning ? "⏸" : "▶";
    timerInputs.style.display = timerRemaining > 0 || timerRunning ? "none" : "flex";
  }

  function stopTimer() {
    timerRunning = false;
    clearInterval(timerIntervalId);
    renderTimer();
  }

  function timerTick() {
    timerRemaining -= 1;
    if (timerRemaining <= 0) {
      timerRemaining = 0;
      stopTimer();
      playLongAlarm();
      alert("⏰ הטיימר הסתיים!");
      return;
    }
    renderTimer();
  }

  function startTimer() {
    if (timerRunning) return;
    if (timerRemaining <= 0) {
      const h = Number(timerHoursInput.value) || 0;
      const m = Number(timerMinutesInput.value) || 0;
      timerRemaining = h * 3600 + m * 60;
      if (timerRemaining <= 0) return;
    }
    timerRunning = true;
    timerIntervalId = setInterval(timerTick, 1000);
    renderTimer();
  }

  function resetTimer() {
    stopTimer();
    timerRemaining = 0;
    timerHoursInput.value = "";
    timerMinutesInput.value = "";
    renderTimer();
  }

  timerToggleBtn.addEventListener("click", () => (timerRunning ? stopTimer() : startTimer()));
  timerResetBtn.addEventListener("click", resetTimer);
  renderTimer();

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
    const totalMinutes = state.tasks.reduce((sum, t) => sum + taskDurationMinutes(t), 0);
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
      text: isBreak ? "הפסקה" : "",
      hours: "",
      minutes: "",
      done: false,
      isBreak: !!isBreak
    });
    persist();
    renderList();
    requestAnimationFrame(() => {
      const focusSelector = isBreak ? ".task-hours-input" : ".task-text-input";
      const inputs = list.querySelectorAll(focusSelector);
      const last = inputs[inputs.length - 1];
      if (last) last.focus();
    });
  }

  function moveTask(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= state.tasks.length || toIdx >= state.tasks.length) return;
    const [moved] = state.tasks.splice(fromIdx, 1);
    state.tasks.splice(toIdx, 0, moved);
    persist();
    renderList();
  }

  function renderList() {
    list.innerHTML = "";
    const schedule = computeTaskSchedule(state);

    if (state.tasks.length === 0) {
      list.appendChild(el("div", { class: "empty-state", text: "עדיין לא נוספו משימות. לחצי על + משימה כדי להתחיל." }));
    }

    schedule.forEach((task, idx) => {
      const row = el("div", { class: "task-row" + (task.isBreak ? " is-break" : "") + (task.done ? " is-done" : "") });

      const dragHandle = el("span", { class: "task-drag-handle", text: "⠿", title: "גרירה לשינוי מיקום" });
      dragHandle.draggable = true;
      dragHandle.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(idx));
        row.classList.add("is-dragging");
      });
      dragHandle.addEventListener("dragend", () => row.classList.remove("is-dragging"));
      row.appendChild(dragHandle);
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const fromIdx = Number(e.dataTransfer.getData("text/plain"));
        moveTask(fromIdx, idx);
      });

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
        placeholder: task.isBreak ? "הפסקה" : "משימה...",
        autocomplete: "off"
      });
      textInput.value = task.text || "";
      textInput.disabled = !!task.isBreak;
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

      const durationGroup = el("div", { class: "task-duration-group" });
      const minutesInput = el("input", {
        type: "text",
        inputmode: "numeric",
        class: "field-input task-minutes-input",
        placeholder: "דק",
        autocomplete: "off"
      });
      minutesInput.value = task.minutes === 0 || task.minutes === "" ? "" : task.minutes;
      minutesInput.addEventListener("input", () => {
        const digits = minutesInput.value.replace(/\D/g, "").slice(0, 2);
        minutesInput.value = digits;
        state.tasks[idx].minutes = digits === "" ? "" : Math.min(59, Number(digits));
        persist();
        renderList();
      });
      const hoursInput = el("input", {
        type: "text",
        inputmode: "numeric",
        class: "field-input task-hours-input",
        placeholder: "שע",
        autocomplete: "off"
      });
      hoursInput.value = task.hours === 0 || task.hours === "" ? "" : task.hours;
      hoursInput.addEventListener("input", () => {
        const digits = hoursInput.value.replace(/\D/g, "").slice(0, 2);
        hoursInput.value = digits;
        state.tasks[idx].hours = digits === "" ? "" : Number(digits);
        persist();
        renderList();
      });
      durationGroup.appendChild(minutesInput);
      durationGroup.appendChild(hoursInput);
      row.appendChild(durationGroup);

      const controls = el("div", { class: "task-row-controls" });
      const upBtn = el("button", { type: "button", class: "task-move-btn", text: "▲", title: "הזזה למעלה" });
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => moveTask(idx, idx - 1));
      const downBtn = el("button", { type: "button", class: "task-move-btn", text: "▼", title: "הזזה למטה" });
      downBtn.disabled = idx === state.tasks.length - 1;
      downBtn.addEventListener("click", () => moveTask(idx, idx + 1));
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
