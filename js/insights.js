// "תובנות" - סיכום מקומי (לא AI, בלי שרת): אוטומטי ב-1 לחודש, וגם כפתור ידני בכל רגע

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
  const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(prevMonthDate + "T00:00:00"));
  showInsightsModal(`תובנות מהחודש שחלף — ${monthLabel}`, entries);
}

function showManualInsights() {
  const today = todayISO();
  const from = addDaysISO(today, -29);
  const entries = Object.values(loadEntries()).filter((e) => e.saved && e.date >= from && e.date <= today);
  if (entries.length === 0) {
    alert("עדיין אין מספיק רשומות שמורות ב-30 הימים האחרונים כדי להציג תובנות.");
    return;
  }
  showInsightsModal("תובנות מ-30 הימים האחרונים", entries);
}

function pickRandomSample(arr, n) {
  const pool = arr.slice();
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

function showInsightsModal(title, entries, extraLine) {
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
  modal.appendChild(el("h3", { class: "modal-title", text: title }));
  modal.appendChild(el("p", { class: "modal-line", text: `כתבת ${entries.length} יומנים בטווח הזה.` }));
  if (topExerciseName) modal.appendChild(el("p", { class: "modal-line", text: `התרגיל שבחרת הכי הרבה: ${topExerciseName}.` }));
  modal.appendChild(el("p", { class: "modal-line", text: `רצף הכתיבה הנוכחי שלך: ${formatStreakLabel(computeJournalStreak())}.` }));

  if (sampleGratitude.length) {
    modal.appendChild(el("p", { class: "modal-line modal-line-strong", text: "כמה דברים שהיית אסירת תודה עליהם:" }));
    sampleGratitude.forEach((line) => modal.appendChild(el("p", { class: "modal-quote", text: `"${line}"` })));
  }

  if (extraLine) modal.appendChild(el("p", { class: "modal-line modal-line-strong", text: extraLine }));

  modal.appendChild(
    el("button", { class: "btn btn-primary", type: "button", text: "סגירה", onclick: () => overlay.remove() })
  );
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

// משפטי עידוד קצרים לסיכום השבועי - נפרדים ממאגר המשפטים היומיים הארוכים יותר
const WEEKLY_ENCOURAGEMENT_LINES = [
  "כל שבוע שאת ממשיכה בו הוא עוד צעד קדימה, גם אם לא הרגיש ככה בזמן אמת.",
  "העקביות שלך גדולה יותר ממה שנדמה לך כשאת בתוך השבוע עצמו.",
  "שבוע נוסף של להראות לעצמך - זו לא פעולה קטנה.",
  "גם השבועות הפחות מושלמים נספרים בדרך שלך קדימה.",
  "את בונה כאן הרגל אמיתי, לא רק רצף של ימים.",
  "תמשיכי כמה שהוא, בקצב שלך - זה מספיק."
];

// סיכום שבועי אוטומטי - מוצג פעם בשבוע, בימי ראשון בלבד, מיד אחרי המשפט הקבוע שמופיע לאחר הזנת הסיסמה
function maybeShowWeeklyInsights() {
  const today = todayISO();
  const dayOfWeek = new Date(today + "T00:00:00").getDay(); // 0 = יום ראשון
  if (dayOfWeek !== 0) return;

  const prefs = loadPrefs();
  if (prefs.weeklyInsightsShownDate === today) return;

  const from = addDaysISO(today, -6);
  const entries = Object.values(loadEntries()).filter((e) => e.saved && e.date >= from && e.date <= today);

  prefs.weeklyInsightsShownDate = today;
  savePrefs(prefs);

  if (entries.length === 0) return;
  const encouragement = WEEKLY_ENCOURAGEMENT_LINES[Math.floor(Math.random() * WEEKLY_ENCOURAGEMENT_LINES.length)];
  showInsightsModal("סיכום השבוע שעבר", entries, encouragement);
}
