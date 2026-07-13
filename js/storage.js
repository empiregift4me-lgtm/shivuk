// שכבת שמירה - הכל ב-localStorage, שום דבר לא יוצא מהדפדפן

const STORE_KEYS = {
  entries: "journal_entries_v1",
  habits: "journal_habits_v1"
};

function todayISO() {
  const d = new Date();
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

function getEntry(date) {
  const entries = loadEntries();
  return entries[date] || null;
}

function upsertEntry(entry) {
  const entries = loadEntries();
  entries[entry.date] = entry;
  saveEntries(entries);
}

function deleteEntry(date) {
  const entries = loadEntries();
  delete entries[date];
  saveEntries(entries);
}

function allEntriesSorted(order = "desc") {
  const entries = Object.values(loadEntries());
  entries.sort((a, b) => (order === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
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

function formatDateHe(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}
