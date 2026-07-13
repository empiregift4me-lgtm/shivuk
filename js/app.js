document.addEventListener("DOMContentLoaded", () => {
  applyFontScale();
  initTabs();
  maybeShowMonthlyInsights();

  document.getElementById("font-dec").addEventListener("click", () => setFontScale(getFontScale() - FONT_SCALE_STEP));
  document.getElementById("font-inc").addEventListener("click", () => setFontScale(getFontScale() + FONT_SCALE_STEP));

  document.getElementById("backup-btn").addEventListener("click", exportBackup);
  document.getElementById("restore-btn").addEventListener("click", () => document.getElementById("restore-file").click());
  document.getElementById("restore-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && confirm("שחזור יחליף את כל הנתונים הקיימים באתר בנתונים מתוך הקובץ. להמשיך?")) {
      importBackupFile(file);
    }
    e.target.value = "";
  });
});
