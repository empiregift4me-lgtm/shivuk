// "תובנות החודש" - סיכום מקומי (לא AI, בלי שרת) שמופיע פעם בחודש, ב-1 לחודש

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function maybeShowMonthlyInsights() {
  const today = todayISO();
  const dayOfMonth = new Date(today + "T00:00:00").getDate();
  if (dayOfMonth !== 1) return;

  const prefs = loadPrefs();
  const thisMonth = monthKey(today);
  if (prefs.insightsShownMonth === thisMonth) return;

  const prevMonthDate = addDaysISO(today, -1);
  const prevMonthKey = monthKey(prevMonthDate);
  const entries = Object.values(loadEntries()).filter((e) => e.saved && monthKey(e.date) === prevMonthKey);

  prefs.insightsShownMonth = thisMonth;
  savePrefs(prefs);

  if (entries.length === 0) return;
  showInsightsModal(prevMonthDate, entries);
}

function pickRandomSample(arr, n) {
  const pool = arr.slice();
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

function showInsightsModal(monthSampleDate, entries) {
  const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(monthSampleDate + "T00:00:00"));

  const counts = {};
  entries.forEach((e) => e.exerciseIds.forEach((id) => (counts[id] = (counts[id] || 0) + 1)));
  const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const topExerciseName = topEntry ? getExerciseById(topEntry[0])?.name : null;

  const gratitudeLines = [];
  entries.forEach((e) => {
    const g = e.data["gratitude"];
    if (g && g.items) gratitudeLines.push(...g.items);
  });
  const sampleGratitude = pickRandomSample(gratitudeLines, 3);

  const overlay = el("div", { class: "modal-overlay" });
  const modal = el("div", { class: "modal-box" });
  modal.appendChild(el("h3", { class: "modal-title", text: `תובנות מהחודש שחלף — ${monthLabel}` }));
  modal.appendChild(el("p", { class: "modal-line", text: `כתבת ${entries.length} יומנים בחודש הזה.` }));
  if (topExerciseName) modal.appendChild(el("p", { class: "modal-line", text: `התרגיל שבחרת הכי הרבה: ${topExerciseName}.` }));
  modal.appendChild(el("p", { class: "modal-line", text: `רצף הכתיבה הנוכחי שלך: ${formatStreakLabel(computeJournalStreak())}.` }));

  if (sampleGratitude.length) {
    modal.appendChild(el("p", { class: "modal-line modal-line-strong", text: "כמה דברים שהיית אסירת תודה עליהם:" }));
    sampleGratitude.forEach((line) => modal.appendChild(el("p", { class: "modal-quote", text: `"${line}"` })));
  }

  modal.appendChild(
    el("button", { class: "btn btn-primary", type: "button", text: "סגירה", onclick: () => overlay.remove() })
  );
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
