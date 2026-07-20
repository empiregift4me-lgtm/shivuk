// אתחול כללי - מחבר בין שער הכניסה, טיימר המילוי, התרגילים וסיום השאלון.

function onQuestionnaireUnlocked() {
  document.getElementById("app-shell").classList.remove("is-hidden");
  startFillTimer();
  startExercises();
}

function showDoneScreen() {
  stopFillTimer();
  document.getElementById("app-shell").classList.add("is-hidden");
  document.getElementById("done-screen").classList.remove("is-hidden");
}

window.addEventListener("beforeunload", (e) => {
  if (!fillInProgress) return;
  e.preventDefault();
  e.returnValue = "";
});

document.addEventListener("DOMContentLoaded", () => {
  initGate();
  document.getElementById("export-pdf-btn").addEventListener("click", exportQuestionnairePDF);
});
