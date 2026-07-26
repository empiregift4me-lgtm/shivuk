// שכבת שמירה - הכל ב-localStorage, שום דבר לא יוצא מהדפדפן
// כל רשומה מזוהה לפי תאריך + פרק זמן (בוקר/ערב) - כלומר עד 2 יומנים ליום

const STORE_KEYS = {
  entries: "journal_entries_v2",
  habits: "journal_habits_v1",
  prefs: "journal_prefs_v1",
  summaries: "summaries_v1",
  summaryDraft: "summary_draft_v1",
  decisions: "decisions_v1",
  decisionDraft: "decision_draft_v1",
  emotional: "emotional_docs_v1",
  emotionalDraft: "emotional_draft_v1",
  paymentLedger: "summary_payment_ledger_v1",
  affirmationState: "daily_affirmation_state_v1",
  selfWorthBonusState: "self_worth_bonus_state_v1",
  taskManagement: "daily_tasks_v1",
  bigGoals: "big_goals_v1",
  energyLog: "energy_log_v1",
  mantraLog: "mantra_log_v1",
  selfWorthReminderState: "self_worth_reminder_state_v1",
  trustLedger: "trustLedger"
};

const PERIODS = ["morning", "evening"];
const PERIOD_LABELS = { morning: "בוקר", evening: "ערב" };

// עוטפת כל localStorage.setItem באפליקציה - אם האחסון מלא (QuotaExceededError), מציגה התראה ברורה
// במקום לתת לשמירה להיכשל בשקט ולאבד תוכן
function showStorageFullWarning() {
  alert(
    "האחסון של הדפדפן מלא ולא ניתן לשמור את התוכן החדש 😔\n\nכדאי למחוק תמונות ישנות מהודעות/סיכומים, לייצא גיבוי ולפנות מקום, ואז לנסות שוב."
  );
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014)) {
      showStorageFullWarning();
      return false;
    }
    throw e;
  }
}

// הערכת נפח האחסון הכולל שהאפליקציה תופסת (כל המפתחות ב-localStorage), לפי מכסה שמרנית של 5MB -
// המכסה המובטחת הנמוכה ביותר בין הדפדפנים הנפוצים
const STORAGE_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;

function computeStorageUsageBytes() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key) || "";
    total += (key.length + value.length) * 2; // הערכת בתים לפי קידוד UTF-16
  }
  return total;
}

// סופרת כמה תמונות שמורות בכל נתוני האפליקציה (הודעות מוגנות/רגילות, פירוט סיכומים וכו')
function countStoredImages() {
  let count = 0;
  Object.values(STORE_KEYS).forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const matches = raw.match(/data:image\//g);
    if (matches) count += matches.length;
  });
  return count;
}

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function entryKey(date, period) {
  return `${date}|${period}`;
}

function addDaysISO(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.entries)) || {};
  } catch (e) {
    return {};
  }
}

function saveEntries(entries) {
  safeSetItem(STORE_KEYS.entries, JSON.stringify(entries));
}

function getEntry(date, period) {
  const entries = loadEntries();
  return entries[entryKey(date, period)] || null;
}

function upsertEntry(entry) {
  const entries = loadEntries();
  entries[entryKey(entry.date, entry.period)] = entry;
  saveEntries(entries);
}

function deleteEntry(date, period) {
  const entries = loadEntries();
  delete entries[entryKey(date, period)];
  saveEntries(entries);
}

// שני הפרקים של תאריך נתון: { morning: entry|null, evening: entry|null }
function dayStatus(date) {
  return { morning: getEntry(date, "morning"), evening: getEntry(date, "evening") };
}

function allEntriesSorted(order = "desc") {
  const entries = Object.values(loadEntries());
  entries.sort((a, b) => {
    const cmp = order === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.period === "morning" ? -1 : 1;
  });
  return entries;
}

function loadHabits() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.habits)) || [];
  } catch (e) {
    return [];
  }
}

function saveHabits(habits) {
  safeSetItem(STORE_KEYS.habits, JSON.stringify(habits));
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.prefs)) || {};
  } catch (e) {
    return {};
  }
}

function savePrefs(prefs) {
  safeSetItem(STORE_KEYS.prefs, JSON.stringify(prefs));
}

function loadSummaries() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE_KEYS.summaries)) || [];
    // תאימות לאחור: סיכומים ישנים ששמרו "עם מי" בשדה withName - עוברים לשדה topic החדש
    list.forEach((item) => {
      if (item.topic === undefined && item.withName !== undefined) item.topic = item.withName;
    });
    return list;
  } catch (e) {
    return [];
  }
}

function saveSummaries(list) {
  safeSetItem(STORE_KEYS.summaries, JSON.stringify(list));
}

function loadSummaryDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.summaryDraft)) || { html: "", sessionDate: todayISO() };
  } catch (e) {
    return { html: "", sessionDate: todayISO() };
  }
}

function saveSummaryDraft(draft) {
  safeSetItem(STORE_KEYS.summaryDraft, JSON.stringify(draft));
}

function loadEnergyLog() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.energyLog)) || [];
  } catch (e) {
    return [];
  }
}

function saveEnergyLog(list) {
  safeSetItem(STORE_KEYS.energyLog, JSON.stringify(list));
}

function loadMantraLog() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.mantraLog)) || [];
  } catch (e) {
    return [];
  }
}

function saveMantraLog(list) {
  safeSetItem(STORE_KEYS.mantraLog, JSON.stringify(list));
}

// אחסון גנרי לפי מפתח - משמש גם ל"החלטות עסקיות חשובות" וגם ל"תיעוד רגשי" (אותו מנגנון, שני יומני-צ'אט נפרדים)
function loadChatList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function saveChatList(key, list) {
  safeSetItem(key, JSON.stringify(list));
}

function loadChatDraft(key) {
  return localStorage.getItem(key) || "";
}

function saveChatDraft(key, html) {
  safeSetItem(key, html);
}

function formatTimestamp(ms) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(ms));
}

function formatDateHe(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

const JOURNAL_STREAK_GRACE_DAYS = 2; // עד יומיים חסרים בלי לשבור את הרצף - אותו היגיון כמו רצף "פעולות ערך עצמי" בלוח הבקרה

function daysDiffISO(fromISO, toISO) {
  return Math.round((new Date(toISO + "T00:00:00") - new Date(fromISO + "T00:00:00")) / 86400000);
}

// כמה ימים רצופים יש בהם לפחות רשומה שמורה אחת (בוקר או ערב), עם חסד של עד יומיים חסרים בלי
// לשבור את הרצף - כדי שיום אחד שנשכח לא יאפס לגמרי רצף כתיבה ארוך
function computeJournalStreak() {
  const entries = Object.values(loadEntries()).filter((e) => e.saved);
  const datesWithEntry = Array.from(new Set(entries.map((e) => e.date))).sort();
  if (datesWithEntry.length === 0) return 0;

  const today = todayISO();
  const lastActive = datesWithEntry[datesWithEntry.length - 1];
  // אם עברו יותר מ-2 ימים בלי אף רשומה מאז הרשומה האחרונה - אין רצף פעיל כרגע
  if (daysDiffISO(lastActive, today) > JOURNAL_STREAK_GRACE_DAYS) return 0;

  let streak = 0;
  let prevDate = null;
  datesWithEntry.forEach((dateStr) => {
    if (prevDate) {
      const gap = daysDiffISO(prevDate, dateStr) - 1;
      if (gap > JOURNAL_STREAK_GRACE_DAYS) streak = 0;
    }
    streak++;
    prevDate = dateStr;
  });
  return streak;
}
