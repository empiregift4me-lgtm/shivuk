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
      if (storageKey) safeSetItem(storageKey, raw);
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
  safeSetItem(AUTO_BACKUP_LAST_DATE_KEY, today);
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

// ===== מיזוג גיבוי - מוסיף את מה שחסר מהקובץ בלי למחוק כלום שכבר קיים בדפדפן הזה =====
// שימושי כששתי מכשירים ממולאים במקביל (למשל מחשב נייד + מחשב קבוע) ורוצים לאחד את שניהם
// לתמונה אחת, בלי שאחד "ינצח" ויימחק השני כמו ב"שחזור" הרגיל

function safeParseJSON(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

// איחוד מערך רשומות לפי מזהה ייחודי - רשומה שקיימת רק בצד אחד נשמרת כמות שהיא; אם אותו מזהה
// קיים משני הצדדים (עריכה מאוחרת יותר לאותה רשומה במכשיר אחר) שומרים את זו שנגעו בה מאוחר יותר
function mergeListById(existingList, incomingList) {
  const list = Array.isArray(existingList) ? existingList.slice() : [];
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  const byId = new Map(list.map((item) => [item.id, item]));
  function recency(item) {
    return item.updatedAt || item.closedAt || item.createdAt || item.timestamp || 0;
  }
  incoming.forEach((item) => {
    if (!item || item.id === undefined) return;
    const cur = byId.get(item.id);
    if (!cur || recency(item) > recency(cur)) byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

function mergeBackupPayload(payload) {
  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("invalid backup file");
  }
  const data = payload.data;

  // יומן הערכה - מילון "תאריך|תקופה". רשומה שקיימת רק בצד אחד נכנסת כמות שהיא; אם קיימת משני
  // הצדדים - עדיפות לרשומה השמורה (saved), ובין שתי רשומות שמורות עדיפות למאוחרת יותר
  if (data.entries !== undefined) {
    const existing = safeParseJSON(localStorage.getItem(STORE_KEYS.entries), {});
    const incoming = safeParseJSON(data.entries, {});
    Object.keys(incoming).forEach((key) => {
      const inc = incoming[key];
      const cur = existing[key];
      if (!cur) {
        existing[key] = inc;
      } else if (inc.saved && (!cur.saved || (inc.savedAt || 0) > (cur.savedAt || 0))) {
        existing[key] = inc;
      }
    });
    saveEntries(existing);
  }

  // ניהול משימות - מילון לפי תאריך, עם מערך tasks בכל דלי; מאחדים את המשימות לפי מזהה
  if (data.taskManagement !== undefined) {
    const existing = safeParseJSON(localStorage.getItem(STORE_KEYS.taskManagement), {});
    const incoming = safeParseJSON(data.taskManagement, {});
    Object.keys(incoming).forEach((dateKey) => {
      const inc = incoming[dateKey];
      const cur = existing[dateKey];
      if (!cur) {
        existing[dateKey] = inc;
      } else {
        existing[dateKey] = { ...cur, tasks: mergeListById(cur.tasks, inc.tasks) };
      }
    });
    saveTaskState(existing);
  }

  // מטרות גדולות / תיעוד אנרגיה / הסכם האמינות / החלטות / תיעוד רגשי / תשלומים (הלוג) - כולם
  // מערכים עם מזהה ייחודי לכל רשומה, ולכן מתאימים לאיחוד הגנרי לפי id
  if (data.bigGoals !== undefined) {
    saveBigGoals(mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.bigGoals), []), safeParseJSON(data.bigGoals, [])));
  }
  if (data.energyLog !== undefined) {
    saveEnergyLog(mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.energyLog), []), safeParseJSON(data.energyLog, [])));
  }
  if (data.trustLedger !== undefined) {
    const merged = mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.trustLedger), []), safeParseJSON(data.trustLedger, []));
    safeSetItem(STORE_KEYS.trustLedger, JSON.stringify(merged));
  }
  if (data.decisions !== undefined) {
    saveChatList(STORE_KEYS.decisions, mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.decisions), []), safeParseJSON(data.decisions, [])));
  }
  if (data.emotional !== undefined) {
    saveChatList(STORE_KEYS.emotional, mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.emotional), []), safeParseJSON(data.emotional, [])));
  }
  if (data.summaries !== undefined) {
    saveSummaries(mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.summaries), []), safeParseJSON(data.summaries, [])));
  }

  // הרגלים - איחוד לפי שם ולא רק לפי מזהה, כדי שלא ייווצרו שתי שורות כפולות לאותו הרגל אם הוא
  // נוצר בנפרד בשני המכשירים; כשיש התאמה בשם, מאחדים את התאריכים שסומנו כבוצעו
  if (data.habits !== undefined) {
    const existing = safeParseJSON(localStorage.getItem(STORE_KEYS.habits), []);
    const incoming = safeParseJSON(data.habits, []);
    const byName = new Map(existing.map((h) => [h.name, h]));
    incoming.forEach((h) => {
      const match = byName.get(h.name);
      if (!match) {
        byName.set(h.name, h);
      } else {
        match.completedDates = Array.from(new Set([...(match.completedDates || []), ...(h.completedDates || [])]));
      }
    });
    saveHabits(Array.from(byName.values()));
  }

  // תיעוד מנטרות - יש לכל היותר רשומה אחת ליום; אם שני המכשירים תיעדו את אותו יום בנפרד,
  // שומרים את זו שסומנה כמועדפת, או עם יותר הקלדות תרגול
  if (data.mantraLog !== undefined) {
    const merged = mergeListById(safeParseJSON(localStorage.getItem(STORE_KEYS.mantraLog), []), safeParseJSON(data.mantraLog, []));
    const byDate = new Map();
    merged.forEach((m) => {
      const other = byDate.get(m.date);
      if (!other) {
        byDate.set(m.date, m);
        return;
      }
      const mWins = (m.favorite && !other.favorite) || (!!m.favorite === !!other.favorite && (m.typedCount || 0) > (other.typedCount || 0));
      byDate.set(m.date, mWins ? m : other);
    });
    saveMantraLog(Array.from(byDate.values()));
  }

  // יתרת התשלומים (pool) היא מספר מצטבר שמושפע מהיסטוריית סילוקים - איחוד אוטומטי שלו עלול
  // לייצר מספר שגוי, ולכן משאירים אותו כפי שהוא במכשיר הזה ומאחדים רק את רשימת התשלומים הבודדים
  // (שאף אחד מהם לא נמחק, רק לא נוגעים ביתרה עצמה - כדאי לבדוק ידנית שהיתרה נראית נכונה אחרי המיזוג)
  if (data.paymentLedger !== undefined) {
    const existing = safeParseJSON(localStorage.getItem(STORE_KEYS.paymentLedger), { pool: 0, log: [] });
    const incoming = safeParseJSON(data.paymentLedger, { pool: 0, log: [] });
    const mergedLog = mergeListById(existing.log, incoming.log);
    savePaymentLedger({ pool: existing.pool || 0, log: mergedLog });
  }

  // טיוטות פתוחות (סיכום/החלטה/תיעוד רגשי/הבטחה) והגדרות מכשיר (העדפות, מצב רגוע וכו') לא
  // מתמזגות בכוונה - אלה מצב זמני/מקומי של המכשיר הזה, לא "תוכן" שיש לשמר מהקובץ המיובא
}

function importBackupFileMerge(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      mergeBackupPayload(payload);
      alert("המיזוג הושלם בהצלחה! העמוד ייטען מחדש.");
      location.reload();
    } catch (e) {
      alert("לא הצלחתי לקרוא את הקובץ. ודאי שזה קובץ גיבוי תקין שיוצא מהאתר הזה.");
    }
  };
  reader.readAsText(file);
}
