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
      const gap = daysBetweenISO(prevDate, dateStr) - 1;
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
