document.addEventListener("DOMContentLoaded", () => {
  maybeAutoArmSelfWorthPause();
  maybeAutoResolveSelfWorthPause();
  initLock();
  applyFontScale();
  applySiteDisplayName();
  applyColorTheme();
  initShell();
  initTabs();
  initTimer();
  initMusicToggle();
  maybeShowMonthlyInsights();

  document.getElementById("insights-btn").addEventListener("click", showManualInsights);
});
