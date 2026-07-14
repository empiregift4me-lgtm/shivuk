// נעילת מסך בסיסמה - נועלת עם טעינת הדף, ונועלת מחדש כל שעה

const LOCK_PASSWORD = "3105911";
const LOCK_INTERVAL_MS = 60 * 60 * 1000;
let lockTimer = null;

function showLock() {
  const overlay = document.getElementById("lock-overlay");
  overlay.classList.remove("is-hidden");
  document.getElementById("lock-password").value = "";
  document.getElementById("lock-error").textContent = "";
  setTimeout(() => document.getElementById("lock-password").focus(), 50);
}

function hideLock() {
  document.getElementById("lock-overlay").classList.add("is-hidden");
}

function scheduleRelock() {
  clearTimeout(lockTimer);
  lockTimer = setTimeout(showLock, LOCK_INTERVAL_MS);
}

function initLock() {
  const form = document.getElementById("lock-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("lock-password").value;
    if (val === LOCK_PASSWORD) {
      hideLock();
      scheduleRelock();
      initDailyAffirmation();
    } else {
      document.getElementById("lock-error").textContent = "סיסמה שגויה, נסי שוב.";
      document.getElementById("lock-password").value = "";
      document.getElementById("lock-password").focus();
    }
  });
  document.getElementById("lock-password").focus();
}
