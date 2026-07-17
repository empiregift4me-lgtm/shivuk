// ניהול משימות היום - רשימת משימות עם חישוב אוטומטי של טווחי שעות, החל משעת התחלה שנקבעת מראש.
// כל יום מקבל רשימה משלו (ניתן לנווט קדימה/אחורה ולתכנן מראש), וכל משימה/הפסקה תופסת זמן אמיתי בלוח.

function loadTaskState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.taskManagement)) || {};
  } catch (e) {
    return {};
  }
}

function saveTaskState(all) {
  localStorage.setItem(STORE_KEYS.taskManagement, JSON.stringify(all));
}

// שולפת את המצב של תאריך ספציפי, כולל מיגרציה חד-פעמית מהפורמט הישן (רשומה שטוחה אחת בלי תאריכים,
// ומשך זמן בשעות עשרוניות) לפורמט החדש
function getDayTaskState(all, dateISO) {
  let bucket = all[dateISO];
  if (!bucket && all.tasks && !all[todayISO()]) {
    // פורמט ישן: אובייקט שטוח יחיד - מיגרציה לתאריך של היום
    bucket = { startTime: all.startTime || "09:00", tasks: all.tasks };
    all[todayISO()] = bucket;
    delete all.tasks;
    delete all.startTime;
    saveTaskState(all);
    if (dateISO !== todayISO()) bucket = null;
  }
  if (!bucket) bucket = { startTime: "09:00", tasks: [] };
  bucket.tasks.forEach((t) => {
    if (t.minutes === undefined) {
      const totalH = Number(t.hours) || 0;
      t.hours = Math.floor(totalH);
      t.minutes = Math.round((totalH - Math.floor(totalH)) * 60);
    }
  });
  return bucket;
}

function setDayTaskState(all, dateISO, dayState) {
  all[dateISO] = dayState;
  saveTaskState(all);
}

function loadBigGoals() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.bigGoals)) || [];
  } catch (e) {
    return [];
  }
}

function saveBigGoals(goals) {
  localStorage.setItem(STORE_KEYS.bigGoals, JSON.stringify(goals));
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
  let currentDate = todayISO();
  // מפתח (taskId|type) של תיבת הכתיבה של אנרגיה שפתוחה כרגע - נשמר בזיכרון בלבד, כדי לשרוד רינדור מחדש של הרשימה
  let openEnergyBoxKey = null;
  const debouncedEnergySave = debounce((log) => saveEnergyLog(log), 400);

  const breakout = el("div", { class: "task-layout-breakout" });
  const layout = el("div", { class: "task-layout" });

  const wrap = el("div", { class: "panel task-main-panel" });
  const titleRow = el("div", { class: "task-title-row" });
  titleRow.appendChild(el("h2", { class: "panel-title", text: "ניהול משימות היום" }));
  titleRow.appendChild(
    el("button", {
      type: "button",
      class: "btn btn-secondary btn-small",
      text: "⚡ ניהול אנרגיה",
      onclick: () => showSection("energy")
    })
  );
  wrap.appendChild(titleRow);
  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "כתבי משימה, הגדירי כמה זמן היא תיקח, והמערכת תחשב לך את טווח השעות אוטומטית." })
  );

  // ---- ניווט בין ימים ----
  const dateNavRow = el("div", { class: "task-date-nav" });
  const prevDayBtn = el("button", { type: "button", class: "util-btn", text: "◀", title: "יום הבא" });
  const dateLabel = el("span", { class: "task-date-label" });
  const nextDayBtn = el("button", { type: "button", class: "util-btn", text: "▶", title: "יום קודם" });
  const todayBtn = el("button", { type: "button", class: "btn btn-ghost btn-small", text: "היום" });
  const addBreakBtn = el("button", { class: "btn btn-secondary btn-small", type: "button", text: "☕ הפסקה" });
  dateNavRow.appendChild(nextDayBtn);
  dateNavRow.appendChild(dateLabel);
  dateNavRow.appendChild(prevDayBtn);
  dateNavRow.appendChild(todayBtn);
  dateNavRow.appendChild(addBreakBtn);
  wrap.appendChild(dateNavRow);

  const summaryLine = el("p", { class: "task-summary" });
  wrap.appendChild(summaryLine);
  const progressTrack = el("div", { class: "task-progress-track" });
  const progressFill = el("div", { class: "task-progress-fill" });
  progressTrack.appendChild(progressFill);
  wrap.appendChild(progressTrack);

  const startRow = el("div", { class: "task-start-row" });

  const timerGroup = el("div", { class: "task-timer-group" });
  const timerInputs = el("div", { class: "task-timer-inputs" });
  const timerHoursInput = el("input", {
    type: "text",
    inputmode: "numeric",
    class: "field-input task-timer-hours",
    placeholder: "00",
    autocomplete: "off"
  });
  const timerMinutesInput = el("input", {
    type: "text",
    inputmode: "numeric",
    class: "field-input task-timer-minutes",
    placeholder: "00",
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

  const startGroup = el("div", { class: "task-start-group" });
  startGroup.appendChild(el("label", { class: "task-start-label", text: "שעת התחלה:" }));
  const startInput = el("input", { type: "time", class: "field-input task-start-input" });
  startGroup.appendChild(startInput);

  startRow.appendChild(startGroup);
  startRow.appendChild(timerGroup);
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

  const list = el("div", { class: "task-list" });
  wrap.appendChild(list);

  layout.appendChild(wrap);
  breakout.appendChild(layout);
  container.appendChild(breakout);
  renderBigGoalsPanel(layout);

  // ---- מצב היום המוצג כרגע ----
  let all = loadTaskState();
  let state = getDayTaskState(all, currentDate);

  function persist() {
    setDayTaskState(all, currentDate, state);
  }

  function updateDateLabel() {
    const isToday = currentDate === todayISO();
    dateLabel.textContent = isToday ? `היום, ${formatDateHe(currentDate)}` : formatDateHe(currentDate);
    todayBtn.style.display = isToday ? "none" : "inline-block";
  }

  function updateSummary() {
    const schedule = computeTaskSchedule(state);
    const realTasks = state.tasks.filter((t) => !t.isBreak);
    const totalMinutes = state.tasks.reduce((sum, t) => sum + taskDurationMinutes(t), 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (state.tasks.length === 0) {
      summaryLine.textContent = "";
      progressFill.style.width = "0%";
      return;
    }
    const finish = schedule[schedule.length - 1].rangeLabel.split("-")[1];
    summaryLine.textContent = `${realTasks.length} משימות, ${h} שעות ו-${m} דקות בסך הכול | סיום משוער: ${finish}`;
    const doneCount = realTasks.filter((t) => t.done).length;
    const percent = realTasks.length ? Math.round((doneCount / realTasks.length) * 100) : 0;
    progressFill.style.width = `${percent}%`;
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
    const focusIdx = state.tasks.length - 1;
    if (isBreak) {
      // אין יותר כפתור "+ משימה", אז אחרי הפסקה תמיד נוספת שורת משימה ריקה מתחתיה
      state.tasks.push({
        id: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        text: "",
        hours: "",
        minutes: "",
        done: false,
        isBreak: false
      });
    }
    persist();
    renderList();
    requestAnimationFrame(() => {
      const rows = list.querySelectorAll(".task-row");
      const targetRow = rows[focusIdx];
      const focusEl = targetRow && targetRow.querySelector(isBreak ? ".task-hours-input" : ".task-text-input");
      if (focusEl) focusEl.focus();
    });
  }

  function moveTask(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= state.tasks.length || toIdx >= state.tasks.length) return;
    const [moved] = state.tasks.splice(fromIdx, 1);
    state.tasks.splice(toIdx, 0, moved);
    persist();
    renderList();
  }

  // renderList בונה מחדש את כל השורות (כדי לעדכן טווחי שעות תלויי-משך), אז אחרי הקלדת ספרה
  // צריך להחזיר את הפוקוס והסמן לאותו שדה בדיוק, אחרת אפשר להקליד רק ספרה אחת ברצף
  function refocusDurationInput(idx, field) {
    requestAnimationFrame(() => {
      const rows = list.querySelectorAll(".task-row");
      const targetInput = rows[idx] && rows[idx].querySelector(field === "hours" ? ".task-hours-input" : ".task-minutes-input");
      if (!targetInput) return;
      targetInput.focus();
      const pos = targetInput.value.length;
      targetInput.setSelectionRange(pos, pos);
    });
  }

  function renderList() {
    if (state.tasks.length === 0) {
      addTask(false);
      return;
    }
    list.innerHTML = "";
    const schedule = computeTaskSchedule(state);

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

      if (task.isBreak) {
        row.appendChild(buildEnergyMarkers(task, idx));
      } else {
        const textInput = el("input", {
          type: "text",
          class: "field-input task-text-input",
          placeholder: "משימה...",
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
            const nextItem = list.children[idx + 1] && list.children[idx + 1].querySelector(".task-text-input");
            if (nextItem) nextItem.focus();
          }
        });
        row.appendChild(textInput);
      }

      const durationGroup = el("div", { class: "task-duration-group" });
      const minutesInput = el("input", {
        type: "text",
        inputmode: "numeric",
        class: "field-input task-minutes-input",
        placeholder: "00",
        autocomplete: "off"
      });
      minutesInput.value = task.minutes === 0 || task.minutes === "" ? "" : task.minutes;
      minutesInput.addEventListener("input", () => {
        const digits = minutesInput.value.replace(/\D/g, "").slice(0, 2);
        minutesInput.value = digits;
        state.tasks[idx].minutes = digits === "" ? "" : Math.min(59, Number(digits));
        persist();
        renderList();
        refocusDurationInput(idx, "minutes");
      });
      const hoursInput = el("input", {
        type: "text",
        inputmode: "numeric",
        class: "field-input task-hours-input",
        placeholder: "00",
        autocomplete: "off"
      });
      hoursInput.value = task.hours === 0 || task.hours === "" ? "" : task.hours;
      hoursInput.addEventListener("input", () => {
        const digits = hoursInput.value.replace(/\D/g, "").slice(0, 2);
        hoursInput.value = digits;
        state.tasks[idx].hours = digits === "" ? "" : Number(digits);
        persist();
        renderList();
        refocusDurationInput(idx, "hours");
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

      const itemWrap = el("div", { class: "task-item-wrap" });
      itemWrap.appendChild(row);
      if (task.isBreak) {
        const inlineBox = buildEnergyInlineBox(task);
        if (inlineBox) itemWrap.appendChild(inlineBox);
      }
      list.appendChild(itemWrap);
    });

    updateSummary();
  }

  function buildEnergyMarkers(task, idx) {
    const wrap = el("div", { class: "task-energy-markers" });

    ENERGY_TYPES.forEach((typeDef) => {
      const key = task.id + "|" + typeDef.key;
      const isActive = task.energyMarks && task.energyMarks[typeDef.key];
      const btn = el("button", {
        type: "button",
        class: "task-energy-mark-btn" + (isActive ? " is-active" : "") + (openEnergyBoxKey === key ? " is-open" : ""),
        text: typeDef.emoji,
        title: typeDef.label
      });
      btn.addEventListener("click", () => {
        let entryId = state.tasks[idx].energyMarks && state.tasks[idx].energyMarks[typeDef.key];
        if (!entryId) {
          const log = loadEnergyLog();
          const [startTime, endTime] = (task.rangeLabel || "").split("-");
          const entry = {
            id: "energy_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            type: typeDef.key,
            date: currentDate,
            startTime: startTime || "",
            endTime: endTime || "",
            durationMinutes: taskDurationMinutes(task),
            text: "",
            createdAt: Date.now()
          };
          log.push(entry);
          saveEnergyLog(log);
          entryId = entry.id;
          if (!state.tasks[idx].energyMarks) state.tasks[idx].energyMarks = {};
          state.tasks[idx].energyMarks[typeDef.key] = entryId;
          persist();
        }
        openEnergyBoxKey = openEnergyBoxKey === key ? null : key;
        renderList();
      });
      wrap.appendChild(btn);
    });

    return wrap;
  }

  // תיבת הכתיבה החופשית של סימון האנרגיה שפתוח כרגע לשורת ההפסקה הזו (אם יש) - עם פיינהולד שמזכיר את שאלות ההנחיה
  function buildEnergyInlineBox(task) {
    const openType = ENERGY_TYPES.find((t) => openEnergyBoxKey === task.id + "|" + t.key);
    if (!openType || !task.energyMarks) return null;
    const entryId = task.energyMarks[openType.key];
    const log = loadEnergyLog();
    const entry = log.find((e) => e.id === entryId);
    if (!entry) return null;

    const box = el("div", { class: "task-energy-box" });
    const inner = el("div", { class: "task-energy-box-inner" });
    const textarea = el("textarea", {
      class: "field-textarea task-energy-textarea",
      placeholder: openType.placeholder,
      rows: "3",
      autocomplete: "off"
    });
    textarea.value = entry.text || "";
    textarea.addEventListener("input", () => {
      entry.text = textarea.value;
      debouncedEnergySave(log);
    });
    inner.appendChild(textarea);

    // כפתור אישור שסוגר את התיבה מהעין (השמירה כבר קורית תוך כדי הקלדה) - כדי שההפסקה
    // האחרונה של היום לא תישאר פתוחה לצמיתות
    const confirmBtn = el("button", {
      type: "button",
      class: "task-energy-confirm-btn",
      text: "✓",
      title: "שמירה וסגירה - התיעוד עבר ל\"ניהול אנרגיה\""
    });
    confirmBtn.addEventListener("click", () => {
      entry.text = textarea.value;
      saveEnergyLog(log);
      openEnergyBoxKey = null;
      renderList();
    });
    inner.appendChild(confirmBtn);

    box.appendChild(inner);
    return box;
  }

  function activateDate(dateISO) {
    currentDate = dateISO;
    state = getDayTaskState(all, currentDate);
    startInput.value = state.startTime || "09:00";
    updateDateLabel();
    renderList();
  }

  addBreakBtn.addEventListener("click", () => addTask(true));
  startInput.addEventListener("change", () => {
    state.startTime = startInput.value || "09:00";
    persist();
    renderList();
  });
  // הכפתורים נשארים באותו מיקום/צורה כמו קודם - רק הפעולה שמתחת לכל אחד מהם התחלפה,
  // כך ש"יום הבא" מתבצע דרך הכפתור שבצד שמאל (◀) ו"יום קודם" דרך הכפתור שבצד ימין (▶)
  prevDayBtn.addEventListener("click", () => activateDate(addDaysISO(currentDate, 1)));
  nextDayBtn.addEventListener("click", () => activateDate(addDaysISO(currentDate, -1)));
  todayBtn.addEventListener("click", () => activateDate(todayISO()));

  startInput.value = state.startTime || "09:00";
  updateDateLabel();
  renderList();
}

// ---- יעדים גדולים - רשימה קבועה (לא תלוית תאריך), פאנל פעילים בצד ימין ופאנל שהושלמו בצד שמאל ----
function renderBigGoalsPanel(layout) {
  const activePanel = el("div", { class: "panel task-goals-panel" });
  activePanel.appendChild(el("h2", { class: "panel-title", text: "יעדים גדולים - פעילים" }));

  const addRow = el("div", { class: "task-goal-add-row" });
  const input = el("input", { type: "text", class: "field-input", placeholder: "יעד חדש...", autocomplete: "off" });
  const addBtn = el("button", { type: "button", class: "btn btn-primary btn-small", text: "+" });
  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  activePanel.appendChild(addRow);

  const activeBox = el("div", { class: "task-goal-box" });
  const activeList = el("div", { class: "task-goal-list" });
  activeBox.appendChild(activeList);
  activePanel.appendChild(activeBox);

  const donePanel = el("div", { class: "panel task-goals-panel" });
  donePanel.appendChild(el("h2", { class: "panel-title", text: "יעדים גדולים - הושלמו" }));
  const doneBox = el("div", { class: "task-goal-box" });
  const doneList = el("div", { class: "task-goal-list" });
  doneBox.appendChild(doneList);
  donePanel.appendChild(doneBox);

  // ריבוע הפעילים נכנס ראשון ב-DOM => מוצג בצד ימין (RTL); ריבוע ההושלמו נכנס אחרון => מוצג בצד שמאל
  layout.insertBefore(activePanel, layout.firstChild);
  layout.appendChild(donePanel);

  function persist(goals) {
    saveBigGoals(goals);
  }

  function render() {
    const goals = loadBigGoals();
    activeList.innerHTML = "";
    doneList.innerHTML = "";

    const active = goals.filter((g) => !g.done);
    const done = goals.filter((g) => g.done);

    if (active.length === 0) activeList.appendChild(el("div", { class: "empty-state", text: "אין עדיין יעדים פעילים." }));
    if (done.length === 0) doneList.appendChild(el("div", { class: "empty-state", text: "עדיין לא הושלם יעד." }));

    active.forEach((goal) => {
      const row = buildGoalRow(goal, goals);
      activeList.appendChild(row);
    });
    done.forEach((goal) => {
      const row = buildGoalRow(goal, goals);
      doneList.appendChild(row);
    });
  }

  function buildGoalRow(goal, goals) {
    const row = el("div", { class: "task-goal-row" + (goal.done ? " is-done" : "") });
    const checkbox = el("input", { type: "checkbox", class: "task-checkbox" });
    checkbox.checked = !!goal.done;
    checkbox.addEventListener("change", () => {
      const fresh = loadBigGoals();
      const match = fresh.find((g) => g.id === goal.id);
      if (match) match.done = checkbox.checked;
      persist(fresh);
      render();
    });
    row.appendChild(checkbox);
    row.appendChild(el("span", { class: "task-goal-text", text: goal.text }));
    const delBtn = el("button", { type: "button", class: "task-delete-btn", text: "🗑", title: "מחיקה" });
    delBtn.addEventListener("click", () => {
      persist(loadBigGoals().filter((g) => g.id !== goal.id));
      render();
    });
    row.appendChild(delBtn);
    return row;
  }

  function addGoal() {
    const text = input.value.trim();
    if (!text) return;
    const goals = loadBigGoals();
    goals.push({ id: "goal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), text, done: false });
    persist(goals);
    input.value = "";
    render();
  }

  addBtn.addEventListener("click", addGoal);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addGoal();
    }
  });

  render();
}
