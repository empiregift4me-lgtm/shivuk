// שער כניסה - סיסמה זמנית שתקפה 30 דקות ממועד יצירת הקישור (GATE_OPENED_AT).
// זהו מנגנון נפרד לחלוטין מטיימר המילוי (ב-filltimer.js) - זה רק מסך נעילה בכניסה.

let gateCountdownInterval = null;

function gateDeadline() {
  return GATE_OPENED_AT + GATE_WINDOW_MS;
}

function isGateExpired() {
  return Date.now() >= gateDeadline();
}

function showExpiredScreen() {
  clearInterval(gateCountdownInterval);
  document.getElementById("gate-overlay").classList.add("is-hidden");
  document.getElementById("expired-overlay").classList.remove("is-hidden");
}

function updateGateCountdown() {
  const remaining = gateDeadline() - Date.now();
  if (remaining <= 0) {
    showExpiredScreen();
    return;
  }
  const mins = Math.ceil(remaining / 60000);
  document.getElementById("gate-countdown").textContent = `הסיסמה בתוקף עוד כ-${mins} דק׳`;
}

function initGate() {
  if (isGateExpired()) {
    showExpiredScreen();
    return;
  }

  updateGateCountdown();
  gateCountdownInterval = setInterval(updateGateCountdown, 1000);

  const form = document.getElementById("gate-form");
  const passwordInput = document.getElementById("gate-password");
  const errorEl = document.getElementById("gate-error");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isGateExpired()) {
      showExpiredScreen();
      return;
    }
    if (passwordInput.value === GATE_PASSWORD) {
      clearInterval(gateCountdownInterval);
      document.getElementById("gate-overlay").classList.add("is-hidden");
      onQuestionnaireUnlocked();
    } else {
      errorEl.textContent = "סיסמה שגויה, נסי שוב.";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  passwordInput.focus();
}
