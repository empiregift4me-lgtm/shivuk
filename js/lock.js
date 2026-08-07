// נעילת מסך בסיסמה - נועלת עם טעינת הדף, ונועלת מחדש כל 15 דקות

const LOCK_INTERVAL_MS = 15 * 60 * 1000;

// "לבד בבית" - השהיה של הנעילה ושל ההחשכה למספר שעות לבחירה, נשמרת ב-localStorage כדי שגם
// רענון מכוון של הדף לא יבטל אותה. הדרך היחידה לבטל לפני הזמן היא לחיצה על החיווי הסגול הפעיל
// (מתחת לכפתור ההחשכה בתוך המערכת), שגם נועלת ומחשיכה מחדש באותה הלחיצה
let lockTimer = null;
let quietIndicatorTimer = null;

function loadQuietModeUntil() {
  const raw = localStorage.getItem(STORE_KEYS.quietModeUntil);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function saveQuietModeUntil(ts) {
  safeSetItem(STORE_KEYS.quietModeUntil, String(ts));
}

function clearQuietMode() {
  saveQuietModeUntil(0);
}

function setBlackoutActive(active) {
  const overlay = document.getElementById("blackout-overlay");
  const toggle = document.getElementById("blackout-toggle");
  if (!overlay || !toggle) return;
  overlay.classList.toggle("is-hidden", !active);
  toggle.classList.toggle("is-active", active);
}

// מסנכרנת את העיגול הסגול שמופיע מתחת לכפתור ההחשכה (בכל מסך באתר) עם מצב "מצב רגוע" בפועל,
// וקובעת טיימר שיסתיר אותו אוטומטית בדיוק ברגע שהשעה חולפת, בלי להמתין לפעולה נוספת מהמשתמשת
function syncQuietIndicator() {
  const indicator = document.getElementById("blackout-indicator");
  if (!indicator) return;
  const until = loadQuietModeUntil();
  const active = Date.now() < until;
  indicator.classList.toggle("is-hidden", !active);
  clearTimeout(quietIndicatorTimer);
  if (active) quietIndicatorTimer = setTimeout(syncQuietIndicator, until - Date.now());
}

// שילוב מקשים סמוי: Ctrl+Alt+Shift+L (קיצור של LOCK), כשמסך הנעילה מוצג - מאפשר כניסה עם אנטר בלבד בלי הסיסמה
let bypassArmed = false;
document.addEventListener("keydown", (e) => {
  const overlay = document.getElementById("lock-overlay");
  if (!overlay || overlay.classList.contains("is-hidden")) return;
  if (e.ctrlKey && e.altKey && e.shiftKey && e.code === "KeyL") {
    e.preventDefault();
    bypassArmed = true;
  }
});

function showLock() {
  const overlay = document.getElementById("lock-overlay");
  overlay.classList.remove("is-hidden");
  document.getElementById("lock-password").value = "";
  document.getElementById("lock-error").textContent = "";
  document.getElementById("lock-quiet-form").classList.add("is-hidden");
  document.getElementById("lock-quiet-hours").value = "";
  setTimeout(() => document.getElementById("lock-password").focus(), 50);
}

function hideLock() {
  document.getElementById("lock-overlay").classList.add("is-hidden");
}

function scheduleRelock() {
  clearTimeout(lockTimer);
  const until = loadQuietModeUntil();
  const now = Date.now();
  if (now < until) {
    // בתום "מצב רגוע" - חוזרים אוטומטית למצב המוגן המלא: נעילה + החשכה
    lockTimer = setTimeout(() => {
      clearQuietMode();
      setBlackoutActive(true);
      syncQuietIndicator();
      showLock();
    }, until - now);
  } else {
    lockTimer = setTimeout(showLock, LOCK_INTERVAL_MS);
  }
}

function afterUnlock() {
  hideLock();
  scheduleRelock();
  initDailyAffirmation();
  maybeShowWeeklyInsights();
  maybeRunAutoBackup();
}

function initLock() {
  // אם "מצב רגוע" עדיין בתוקף (למשל אחרי רענון דף) - נכנסים ישר בלי סיסמה ובלי החשכה
  if (Date.now() < loadQuietModeUntil()) {
    setBlackoutActive(false);
    afterUnlock();
  }

  const form = document.getElementById("lock-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("lock-password").value;
    if (val === getLockPassword() || bypassArmed) {
      bypassArmed = false;
      afterUnlock();
    } else {
      document.getElementById("lock-error").textContent = "סיסמה שגויה, נסי שוב.";
      document.getElementById("lock-password").value = "";
      document.getElementById("lock-password").focus();
    }
  });
  document.getElementById("lock-password").focus();

  const quietForm = document.getElementById("lock-quiet-form");
  const quietHoursInput = document.getElementById("lock-quiet-hours");

  document.getElementById("lock-quiet-btn").addEventListener("click", () => {
    quietForm.classList.toggle("is-hidden");
    if (!quietForm.classList.contains("is-hidden")) {
      quietHoursInput.value = "";
      quietHoursInput.focus();
    }
  });

  function armQuietMode() {
    const hours = parseFloat(quietHoursInput.value);
    if (!hours || hours <= 0) return;
    saveQuietModeUntil(Date.now() + hours * 60 * 60 * 1000);
    setBlackoutActive(false);
    syncQuietIndicator();
    afterUnlock();
  }

  document.getElementById("lock-quiet-confirm").addEventListener("click", armQuietMode);
  quietHoursInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      armQuietMode();
    }
  });

  // לחיצה על החיווי הסגול הפעיל (מצב רגוע) בתוך המערכת מבטלת מיד את מצב הרגוע וחוזרת למסך
  // שחור + סיסמה, כאילו נכנסים לגמרי מחדש
  document.getElementById("blackout-indicator").addEventListener("click", () => {
    clearTimeout(lockTimer);
    clearQuietMode();
    syncQuietIndicator();
    setBlackoutActive(true);
    showLock();
  });

  syncQuietIndicator();
}
