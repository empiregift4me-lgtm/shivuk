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
  energyLog: "energy_log_v1"
};

const PERIODS = ["morning", "evening"];
const PERIOD_LABELS = { morning: "בוקר", evening: "ערב" };

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
  localStorage.setItem(STORE_KEYS.entries, JSON.stringify(entries));
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
  localStorage.setItem(STORE_KEYS.habits, JSON.stringify(habits));
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.prefs)) || {};
  } catch (e) {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem(STORE_KEYS.prefs, JSON.stringify(prefs));
}

function loadSummaries() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.summaries)) || [];
  } catch (e) {
    return [];
  }
}

function saveSummaries(list) {
  localStorage.setItem(STORE_KEYS.summaries, JSON.stringify(list));
}

function loadSummaryDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.summaryDraft)) || { html: "", sessionDate: todayISO() };
  } catch (e) {
    return { html: "", sessionDate: todayISO() };
  }
}

function saveSummaryDraft(draft) {
  localStorage.setItem(STORE_KEYS.summaryDraft, JSON.stringify(draft));
}

function loadEnergyLog() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.energyLog)) || [];
  } catch (e) {
    return [];
  }
}

function saveEnergyLog(list) {
  localStorage.setItem(STORE_KEYS.energyLog, JSON.stringify(list));
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
  localStorage.setItem(key, JSON.stringify(list));
}

function loadChatDraft(key) {
  return localStorage.getItem(key) || "";
}

function saveChatDraft(key, html) {
  localStorage.setItem(key, html);
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

// כמה ימים רצופים (עד היום/אתמול) יש בהם לפחות רשומה שמורה אחת
function computeJournalStreak() {
  const entries = Object.values(loadEntries()).filter((e) => e.saved);
  const datesWithEntry = new Set(entries.map((e) => e.date));
  const today = todayISO();
  let cursor = datesWithEntry.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (datesWithEntry.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}
