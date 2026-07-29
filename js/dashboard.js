// לוח בקרה - מד התקדמות בסגנון מדחום, לפי סך השורות שנצברו בתרגיל "פעולות ערך עצמי" (1 שורה = נקודה אחת),
// בתוספת בונוסי נקודות על רצף ימים שבהם מולא התרגיל (עם חסד של עד יומיים בלי לשבור את הרצף)

const SELF_WORTH_EXERCISE_ID = "self-worth-actions";
const SELF_WORTH_GAUGE_MAX = 2000;
const SELF_WORTH_GRACE_DAYS = 2;
const SELF_WORTH_STREAK_TIERS = [
  { days: 6, bonus: 5 },
  { days: 12, bonus: 10 },
  { days: 18, bonus: 15 },
  { days: 24, bonus: 20 }
];

function daysBetweenISO(aISO, bISO) {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

// השהיית ספירת ימים - לבקשת המשתמשת, בזמן שהאתר חסום אצלה חיצונית (בדיקת נט פרי) ואין לה גישה
// בפועל כדי למלא "פעולות ערך עצמי". כל עוד ההשהיה פתוחה (from קיים, to עדיין ריק) - שום פער בין
// שני תאריכים לא נספר נגד הרצף, ותזכורת "לא מילאת X ימים" לא מוצגת בכלל.
// לסיים את ההשהיה (כשהגישה חוזרת, לפי בקשה מפורשת של המשתמשת): saveSelfWorthPause({ from: pause.from, to: todayISO() })
// בכוונה לא למחוק את ה-pause לגמרי (null) - כדי שההזנקה האוטומטית למטה לא תפעיל אותה שוב בטעות
function loadSelfWorthPause() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.selfWorthPause));
  } catch (e) {
    return null;
  }
}

function saveSelfWorthPause(pause) {
  safeSetItem(STORE_KEYS.selfWorthPause, pause ? JSON.stringify(pause) : "");
}

function isSelfWorthPauseOpenEnded() {
  const pause = loadSelfWorthPause();
  return !!(pause && pause.from && !pause.to);
}

// מפעילה את ההשהיה אוטומטית בפעם הראשונה שהאתר נטען (מכל מכשיר) אחרי הבקשה - כדי שההשהיה
// תכסה נכון את כל חלון החסימה, לא משנה כמה זמן ייקח לנט פרי לאשר. פועלת פעם אחת בלבד: אם כבר
// קיימת רשומת השהיה כלשהי (גם אם כבר סומנה כפתורה עם "to") - לא נוגעים בה שוב
const SELF_WORTH_PAUSE_AUTO_FROM = "2026-07-29";
function maybeAutoArmSelfWorthPause() {
  if (loadSelfWorthPause()) return;
  saveSelfWorthPause({ from: SELF_WORTH_PAUSE_AUTO_FROM });
}

// כמה ימים בטווח [startISO, endISO] (כולל) חופפים לחלון ההשהיה, ולכן "נמחלים" ולא נספרים כפער אמיתי
function excusedDaysInRange(startISO, endISO, pause) {
  if (!pause || !pause.from || startISO > endISO) return 0;
  const rangeStart = pause.from > startISO ? pause.from : startISO;
  const effectiveTo = pause.to || endISO;
  const rangeEnd = effectiveTo < endISO ? effectiveTo : endISO;
  if (rangeStart > rangeEnd) return 0;
  return daysBetweenISO(rangeStart, rangeEnd) + 1;
}

function loadSelfWorthBonusState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.selfWorthBonusState)) || { bonusEarned: 0, lastTier: 0, streakDays: 0 };
  } catch (e) {
    return { bonusEarned: 0, lastTier: 0, streakDays: 0 };
  }
}

function saveSelfWorthBonusState(state) {
  safeSetItem(STORE_KEYS.selfWorthBonusState, JSON.stringify(state));
}

function totalSelfWorthLines() {
  return Object.values(loadEntries()).reduce((sum, e) => {
    const items = e.data && e.data[SELF_WORTH_EXERCISE_ID] && e.data[SELF_WORTH_EXERCISE_ID].items;
    return sum + (items ? items.length : 0);
  }, 0);
}

// רצף ימים (לא משנה בוקר/ערב) שבהם מולא לפחות פריט אחד בתרגיל, עם חסד של עד יומיים חסרים בלי לשבור את הרצף,
// ובונוסים שנצברים בכל דרגה (5/10/15/20) ונשארים מוקנים לצמיתות גם אם הרצף הנוכחי מתאפס אחר כך
function computeSelfWorthStreakBonus() {
  const pause = loadSelfWorthPause();
  const activeDatesSet = new Set();
  Object.values(loadEntries()).forEach((e) => {
    const items = e.data && e.data[SELF_WORTH_EXERCISE_ID] && e.data[SELF_WORTH_EXERCISE_ID].items;
    if (items && items.length) activeDatesSet.add(e.date);
  });
  const activeDates = Array.from(activeDatesSet).sort();

  let streakDays = 0;
  let bonusEarned = 0;
  let lastTier = 0;
  let prevDate = null;

  activeDates.forEach((dateStr) => {
    if (prevDate) {
      let gap = daysBetweenISO(prevDate, dateStr) - 1;
      // ימים שנופלים בתוך חלון ההשהיה לא נספרים כפער אמיתי נגד הרצף
      gap = Math.max(0, gap - excusedDaysInRange(addDaysISO(prevDate, 1), addDaysISO(dateStr, -1), pause));
      if (gap > SELF_WORTH_GRACE_DAYS) {
        streakDays = 0;
        lastTier = 0;
      }
    }
    streakDays++;
    prevDate = dateStr;

    SELF_WORTH_STREAK_TIERS.forEach((tier) => {
      if (streakDays >= tier.days && lastTier < tier.days) {
        bonusEarned += tier.bonus;
        lastTier = tier.days;
      }
    });
  });

  return { streakDays, bonusEarned, lastTier };
}

function showBonusNotification(days, gained) {
  const toast = el("div", { class: "bonus-toast" }, [
    el("span", { class: "bonus-toast-icon", text: "🔥" }),
    el("span", { text: `${days} ימים ברצף! קיבלת ${gained}+ נקודות` })
  ]);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

const SELF_WORTH_REMINDER_MIN_DAYS = 2; // "48 שעות" - נספר ביחידות של ימים מלאים, כמו שאר מנגנון חסד הרצף
const SELF_WORTH_REMINDER_GAP_MS = 5 * 60 * 60 * 1000; // הפרש של כמה שעות בין שתי ההתראות
const SELF_WORTH_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // חלון של 24 שעות שבו עוד מציגים תזכורות (סה"כ עד פעמיים)

function loadSelfWorthReminderState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.selfWorthReminderState));
  } catch (e) {
    return null;
  }
}

function saveSelfWorthReminderState(state) {
  safeSetItem(STORE_KEYS.selfWorthReminderState, JSON.stringify(state));
}

// התאריך האחרון (אם יש) שבו מולאה לפחות שורה אחת בתרגיל "פעולות ערך עצמי"
function lastSelfWorthActiveDate() {
  const dates = Object.values(loadEntries())
    .filter((e) => e.data && e.data[SELF_WORTH_EXERCISE_ID] && e.data[SELF_WORTH_EXERCISE_ID].items && e.data[SELF_WORTH_EXERCISE_ID].items.length)
    .map((e) => e.date);
  return dates.length ? dates.sort().pop() : null;
}

function showSelfWorthReminderToast(daysSince) {
  const toast = el("div", { class: "bonus-toast is-warning" }, [
    el("span", { class: "bonus-toast-icon", text: "⚠️" }),
    el("span", { text: `כבר ${daysSince} ימים שלא מילאת "פעולות ערך עצמי" - אל תאבדי את הרצף והבונוסים שצברת!` })
  ]);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 400);
  }, 6000);
}

// נבדקת בכל כניסה למסך היומן - אם עברו 48+ שעות (יומיים מלאים בלוח השנה) מאז המילוי האחרון של
// "פעולות ערך עצמי", מציגה תזכורת עד פעמיים בהפרש של כמה שעות, ורק בתוך 24 השעות הראשונות מרגע
// שהחריגה זוהתה לראשונה - כדי לא להטריד שוב ושוב בלי סוף אחרי שהחלון הרלוונטי חלף
function checkSelfWorthReminder() {
  // בהשהיה פתוחה (עדיין בלי "to") לא מציגים בכלל את תזכורת "לא מילאת X ימים"
  if (isSelfWorthPauseOpenEnded()) return;

  const lastDate = lastSelfWorthActiveDate();
  const today = todayISO();
  const daysSince = lastDate ? daysBetweenISO(lastDate, today) : Infinity;
  const violationKey = lastDate || "never";

  if (daysSince < SELF_WORTH_REMINDER_MIN_DAYS) {
    saveSelfWorthReminderState(null);
    return;
  }

  let state = loadSelfWorthReminderState();
  if (!state || state.violationKey !== violationKey) {
    state = { violationKey, firstDetectedAt: Date.now(), remindersShown: 0, lastReminderAt: 0 };
  }

  const now = Date.now();
  const windowOpen = now - state.firstDetectedAt <= SELF_WORTH_REMINDER_WINDOW_MS;
  const gapOk = state.remindersShown === 0 || now - state.lastReminderAt >= SELF_WORTH_REMINDER_GAP_MS;

  if (windowOpen && state.remindersShown < 2 && gapOk) {
    showSelfWorthReminderToast(daysSince);
    state.remindersShown += 1;
    state.lastReminderAt = now;
  }

  saveSelfWorthReminderState(state);
}

// בודקת אם נחצתה דרגת בונוס חדשה מאז הבדיקה הקודמת, ואם כן מציגה הודעה קופצת; מחזירה את המצב המעודכן
function checkSelfWorthBonusNotification() {
  const prev = loadSelfWorthBonusState();
  const current = computeSelfWorthStreakBonus();
  if (current.bonusEarned > prev.bonusEarned) {
    showBonusNotification(current.lastTier, current.bonusEarned - prev.bonusEarned);
  }
  saveSelfWorthBonusState(current);
  return current;
}

function computeSelfWorthProgress() {
  const totalLines = totalSelfWorthLines();
  const bonusState = checkSelfWorthBonusNotification();
  const totalPoints = totalLines + bonusState.bonusEarned;
  return {
    totalLines,
    bonusEarned: bonusState.bonusEarned,
    streakDays: bonusState.streakDays,
    totalPoints,
    percent: Math.min(100, (totalPoints / SELF_WORTH_GAUGE_MAX) * 100)
  };
}

function renderDashboard(container) {
  container.innerHTML = "";
  const progress = computeSelfWorthProgress();

  const wrap = el("div", { class: "dashboard-wrap" });
  const titleRow = el("div", { class: "dashboard-title-row" }, [
    el("h2", { class: "panel-title", text: "לוח הבקרה שלך" }),
    el("button", {
      type: "button",
      class: "btn btn-secondary btn-small",
      text: "🧘 תיעוד מנטרות",
      onclick: () => showSection("mantras")
    })
  ]);
  wrap.appendChild(titleRow);

  const gaugeSection = el("div", { class: "gauge-section" });

  const gaugeWrap = el("div", { class: "gauge-wrap" });
  const gaugeTrack = el("div", { class: "gauge-track" });
  const gaugeMask = el("div", { class: "gauge-mask" });
  gaugeMask.style.height = `${100 - progress.percent}%`;
  gaugeTrack.appendChild(gaugeMask);
  gaugeWrap.appendChild(gaugeTrack);

  [30, 50, 80].forEach((mark) => {
    const label = el("span", { class: "gauge-mark", text: `${mark}%` });
    label.style.bottom = `${mark}%`;
    gaugeWrap.appendChild(label);
  });

  gaugeSection.appendChild(gaugeWrap);

  const statsBox = el("div", { class: "gauge-stats" }, [
    el("div", { class: "gauge-percent", text: `${Math.round(progress.percent)}%` }),
    el("div", { class: "gauge-points", text: `${progress.totalPoints} נקודות` }),
    el("div", { class: "gauge-sub", text: `${progress.totalLines} שורות מתוך ${SELF_WORTH_GAUGE_MAX}` }),
    el("div", { class: "gauge-sub", text: `בונוס רצף שנצבר: ${progress.bonusEarned} נקודות` }),
    progress.streakDays > 0 ? el("div", { class: "gauge-streak", text: `🔥 ${progress.streakDays} ימים ברצף כרגע` }) : null
  ]);
  gaugeSection.appendChild(statsBox);

  wrap.appendChild(gaugeSection);
  container.appendChild(wrap);
}

// כל שמירה של יום עשויה לחצות דרגת בונוס חדשה - בודקים בכל שמירה, לא רק כשפותחים את לוח הבקרה
document.addEventListener("entries-changed", () => checkSelfWorthBonusNotification());
