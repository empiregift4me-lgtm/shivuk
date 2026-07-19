// טיימר מילוי - 30 דקות רצופות מרגע פתיחת השאלון (אחרי מעבר שער הכניסה).
// אין שום כפתור עצירה/השהיה/איפוס - רק ספירה לאחור גלויה, רציפה, עד לנעילה מלאה.

let fillDeadline = null;
let fillTimerInterval = null;
let fillInProgress = false;

function startFillTimer() {
  fillDeadline = Date.now() + FILL_WINDOW_MS;
  fillInProgress = true;
  tickFillTimer();
  fillTimerInterval = setInterval(tickFillTimer, 1000);
}

function stopFillTimer() {
  clearInterval(fillTimerInterval);
  fillInProgress = false;
}

function tickFillTimer() {
  const remainingMs = fillDeadline - Date.now();
  const display = document.getElementById("fill-timer-display");
  const widget = document.getElementById("fill-timer-widget");
  if (remainingMs <= 0) {
    display.textContent = "00:00";
    stopFillTimer();
    onFillTimeUp();
    return;
  }
  display.textContent = formatMMSS(Math.ceil(remainingMs / 1000));
  if (widget) widget.classList.toggle("is-urgent", remainingMs <= 5 * 60 * 1000);
}

function onFillTimeUp() {
  document.querySelectorAll(".flow-input").forEach((input) => (input.disabled = true));
  document.querySelectorAll(".next-btn").forEach((btn) => (btn.disabled = true));
  document.getElementById("locked-out-screen").classList.remove("is-hidden");
}
