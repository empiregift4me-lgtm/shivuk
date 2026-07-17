// גיבוי ושחזור - הורדת/העלאת כל הנתונים כקובץ JSON אחד, כדי שלא ילכו לאיבוד
// עובר גנרית על כל STORE_KEYS (ולא רשימה קבועה בקוד), כדי שלא יישכח מפתח חדש שנוסף בעתיד

function buildBackupPayload() {
  const payload = { version: 5, exportedAt: new Date().toISOString(), data: {} };
  Object.entries(STORE_KEYS).forEach(([name, storageKey]) => {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) payload.data[name] = raw;
  });
  return payload;
}

function applyBackupPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("invalid backup file");
  if (payload.data) {
    Object.entries(payload.data).forEach(([name, raw]) => {
      const storageKey = STORE_KEYS[name];
      if (storageKey) localStorage.setItem(storageKey, raw);
    });
  } else {
    // תאימות לאחור לקבצי גיבוי ישנים (גרסה 4 ומטה) עם מבנה קבוע שכיסה רק חלק מהנתונים
    if (payload.entries) saveEntries(payload.entries);
    if (payload.habits) saveHabits(payload.habits);
    if (payload.prefs) savePrefs(payload.prefs);
    if (payload.summaries) saveSummaries(payload.summaries);
    if (payload.decisions) saveChatList(STORE_KEYS.decisions, payload.decisions);
    if (payload.emotional) saveChatList(STORE_KEYS.emotional, payload.emotional);
    if (payload.paymentLedger) savePaymentLedger(payload.paymentLedger);
    if (payload.taskManagement) saveTaskState(payload.taskManagement);
  }
}

function exportBackup() {
  const payload = buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `יומן-גיבוי-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// גיבוי אוטומטי תקופתי - פעם ביום, בכניסה הראשונה לאתר באותו יום, מוריד לבד קובץ גיבוי
// כדי שגם אם המטמון/הדפדפן יימחקו, יהיה גיבוי עדכני יחסית שכבר יושב בתיקיית ההורדות
const AUTO_BACKUP_LAST_DATE_KEY = "auto_backup_last_date_v1";

function hasAnyStoredData() {
  return Object.values(STORE_KEYS).some((key) => localStorage.getItem(key) !== null);
}

function maybeRunAutoBackup() {
  if (!hasAnyStoredData()) return;
  const today = todayISO();
  if (localStorage.getItem(AUTO_BACKUP_LAST_DATE_KEY) === today) return;
  exportBackup();
  localStorage.setItem(AUTO_BACKUP_LAST_DATE_KEY, today);
}

function importBackupFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      applyBackupPayload(payload);
      alert("השחזור הושלם בהצלחה! העמוד ייטען מחדש.");
      location.reload();
    } catch (e) {
      alert("לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ גיבוי תקין שיוצא מהאתר הזה.");
    }
  };
  reader.readAsText(file);
}
