// נעילת מסך בסיסמה - נועלת עם טעינת הדף, ונועלת מחדש כל שעה

const LOCK_PASSWORD = "31059111";
const LOCK_INTERVAL_MS = 15 * 60 * 1000;
// "לבד בבית" - השהיה זמנית של קצב הנעילה המהיר לשעה אחת, נשמרת רק בזיכרון (לא ב-localStorage) כדי
// שרענון מכוון של הדף תמיד יבטל אותה ויחזיר את ברירת המחדל (נעילה כל 15 דקות + מסך שחור)
const QUIET_MODE_MS = 60 * 60 * 1000;
let quietModeUntil = 0;
let lockTimer = null;
let quietIndicatorTimer = null;

// מסנכרנת את העיגול הסגול שמופיע מתחת לכפתור ההחשכה (בכל מסך באתר) עם מצב "מצב רגוע" בפועל,
// וקובעת טיימר שיסתיר אותו אוטומטית בדיוק ברגע שהשעה חולפת, בלי להמתין לפעולה נוספת מהמשתמשת
function syncQuietIndicator() {
  const indicator = document.getElementById("blackout-indicator");
  if (!indicator) return;
  const active = Date.now() < quietModeUntil;
  indicator.classList.toggle("is-hidden", !active);
  clearTimeout(quietIndicatorTimer);
  if (active) quietIndicatorTimer = setTimeout(syncQuietIndicator, quietModeUntil - Date.now());
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
  const quietBtn = document.getElementById("lock-quiet-btn");
  quietBtn.disabled = false;
  quietBtn.title = "לבד בבית - השהיית נעילה לשעה";
  setTimeout(() => document.getElementById("lock-password").focus(), 50);
}

function hideLock() {
  document.getElementById("lock-overlay").classList.add("is-hidden");
}

function scheduleRelock() {
  clearTimeout(lockTimer);
  const interval = Date.now() < quietModeUntil ? QUIET_MODE_MS : LOCK_INTERVAL_MS;
  lockTimer = setTimeout(showLock, interval);
}

function initLock() {
  const form = document.getElementById("lock-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("lock-password").value;
    if (val === LOCK_PASSWORD || bypassArmed) {
      bypassArmed = false;
      hideLock();
      scheduleRelock();
      initDailyAffirmation();
      maybeShowWeeklyInsights();
      maybeRunAutoBackup();
    } else {
      document.getElementById("lock-error").textContent = "סיסמה שגויה, נסי שוב.";
      document.getElementById("lock-password").value = "";
      document.getElementById("lock-password").focus();
    }
  });
  document.getElementById("lock-password").focus();

  document.getElementById("lock-quiet-btn").addEventListener("click", () => {
    quietModeUntil = Date.now() + QUIET_MODE_MS;
    const btn = document.getElementById("lock-quiet-btn");
    btn.disabled = true;
    btn.title = "מצב רגוע פעיל לשעה הקרובה";
    syncQuietIndicator();
  });

  syncQuietIndicator();
}
