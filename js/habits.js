// לשונית מעקב הרגלים - סופרת ימי התמדה רצופים לכל הרגל

function formatStreakLabel(n) {
  if (n === 0) return "0 ימים";
  if (n === 1) return "יום אחד";
  if (n === 2) return "יומיים";
  return `${n} ימים`;
}

function computeStreak(habit) {
  const set = new Set(habit.completedDates);
  const today = todayISO();
  let cursor = set.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

function renderHabitsTab(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "מעקב הרגלים" }));
  wrap.appendChild(
    el("p", { class: "panel-subtitle", text: "הוסיפי הרגל שאת רוצה לעקוב אחריו, וסמני כל יום שבו התמדת בו." })
  );

  const addRow = el("div", { class: "habit-add-row" });
  const nameInput = el("input", { type: "text", class: "field-input", placeholder: "שם ההרגל החדש..." });
  const addBtn = el("button", {
    class: "btn btn-primary btn-small",
    type: "button",
    text: "+ הרגל חדש",
    onclick: () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const habits = loadHabits();
      habits.push({ id: "h_" + Date.now(), name, createdDate: todayISO(), completedDates: [] });
      saveHabits(habits);
      nameInput.value = "";
      renderList();
    }
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addBtn.click();
  });
  addRow.appendChild(nameInput);
  addRow.appendChild(addBtn);
  wrap.appendChild(addRow);

  const list = el("div", { class: "habit-list" });
  wrap.appendChild(list);
  container.appendChild(wrap);

  function renderList() {
    list.innerHTML = "";
    const habits = loadHabits();
    if (habits.length === 0) {
      list.appendChild(el("div", { class: "empty-state", text: "עדיין לא הוספת הרגלים למעקב." }));
      return;
    }
    habits.forEach((habit) => {
      const today = todayISO();
      const doneToday = habit.completedDates.includes(today);
      const streak = computeStreak(habit);

      const row = el("div", { class: "habit-row" });
      row.appendChild(el("span", { class: "habit-name", text: habit.name }));

      const right = el("div", { class: "habit-controls" });
      right.appendChild(
        el("button", {
          class: "habit-remove",
          type: "button",
          text: "×",
          title: "מחיקת הרגל",
          onclick: () => {
            saveHabits(loadHabits().filter((h) => h.id !== habit.id));
            renderList();
          }
        })
      );
      right.appendChild(
        el("button", {
          class: doneToday ? "btn btn-primary btn-small" : "btn btn-ghost btn-small",
          type: "button",
          text: doneToday ? "✓ בוצע היום" : "סימון ביצוע היום",
          onclick: () => {
            const all = loadHabits();
            const h = all.find((x) => x.id === habit.id);
            if (h.completedDates.includes(today)) {
              h.completedDates = h.completedDates.filter((d) => d !== today);
            } else {
              h.completedDates.push(today);
            }
            saveHabits(all);
            renderList();
          }
        })
      );
      right.appendChild(el("span", { class: "habit-streak", text: formatStreakLabel(streak) }));

      row.appendChild(right);
      list.appendChild(row);
    });
  }

  renderList();
}
