// גיבוי ושחזור - הורדת/העלאת כל הנתונים כקובץ JSON אחד, כדי שלא ילכו לאיבוד

function exportBackup() {
  const payload = {
    version: 4,
    exportedAt: new Date().toISOString(),
    entries: loadEntries(),
    habits: loadHabits(),
    prefs: loadPrefs(),
    summaries: loadSummaries(),
    decisions: loadChatList(STORE_KEYS.decisions),
    emotional: loadChatList(STORE_KEYS.emotional)
  };
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

function importBackupFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!payload || typeof payload !== "object") throw new Error("invalid backup file");
      if (payload.entries) saveEntries(payload.entries);
      if (payload.habits) saveHabits(payload.habits);
      if (payload.prefs) savePrefs(payload.prefs);
      if (payload.summaries) saveSummaries(payload.summaries);
      if (payload.decisions) saveChatList(STORE_KEYS.decisions, payload.decisions);
      if (payload.emotional) saveChatList(STORE_KEYS.emotional, payload.emotional);
      alert("השחזור הושלם בהצלחה! העמוד ייטען מחדש.");
      location.reload();
    } catch (e) {
      alert("לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ גיבוי תקין שיוצא מהאתר הזה.");
    }
  };
  reader.readAsText(file);
}
