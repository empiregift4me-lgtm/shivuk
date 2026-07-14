// טיימר 40 דקות - נשאר פעיל גם כשעוברים בין לשוניות, כי הוא חי בכותרת ולא בתוך תוכן הלשונית

const TIMER_DURATION_SEC = 40 * 60;

function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timerFinished() {
  if (typeof playNotes === "function") {
    playNotes(
      [
        [880, 0],
        [698.46, 0.18],
        [880, 0.36],
        [1046.5, 0.54]
      ],
      { dur: 0.45, gain: 0.18 }
    );
  }
  if (window.Notification) {
    if (Notification.permission === "granted") {
      new Notification("הזמן תם ⏰", { body: "40 דקות חלפו - זמן לחזור לעבודה." });
    }
  }
  alert("⏰ הזמן תם! 40 דקות חלפו - זמן לחזור לעבודה.");
}

function initTimer() {
  const display = document.getElementById("timer-display");
  const toggleBtn = document.getElementById("timer-toggle");
  const resetBtn = document.getElementById("timer-reset");
  if (!display || !toggleBtn || !resetBtn) return;

  let remaining = TIMER_DURATION_SEC;
  let isRunning = false;
  let intervalId = null;

  function render() {
    display.textContent = formatTimer(remaining);
    toggleBtn.textContent = isRunning ? "⏸" : "▶";
  }

  function tick() {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      stop();
      render();
      timerFinished();
      return;
    }
    render();
  }

  function start() {
    if (isRunning) return;
    if (remaining <= 0) remaining = TIMER_DURATION_SEC;
    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission();
    }
    isRunning = true;
    intervalId = setInterval(tick, 1000);
    render();
  }

  function stop() {
    isRunning = false;
    clearInterval(intervalId);
    render();
  }

  function reset() {
    stop();
    remaining = TIMER_DURATION_SEC;
    render();
  }

  toggleBtn.addEventListener("click", () => (isRunning ? stop() : start()));
  resetBtn.addEventListener("click", reset);

  render();
  start();
}
