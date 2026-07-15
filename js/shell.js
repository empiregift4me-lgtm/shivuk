// מעטפת האתר - ניווט בין דשבורד/יומן/סיכומים/החלטות דרך תפריט צד

const SECTIONS = ["dashboard", "journal", "summaries", "decisions", "emotional", "tasks"];
const LAZY_SECTION_INIT = {
  summaries: initSummariesView,
  decisions: initDecisionsView,
  emotional: initEmotionalView
};
let sectionsInitialized = {};

function showSection(name) {
  SECTIONS.forEach((s) => {
    document.getElementById(`${s}-view`).classList.toggle("is-hidden", s !== name);
  });
  if (name === "dashboard") {
    // מתעדכן בכל כניסה, לא רק פעם אחת - כדי שהמד תמיד ישקף נתונים טריים
    renderDashboard(document.getElementById("dashboard-view"));
  } else if (name === "tasks") {
    // מתעדכן בכל כניסה, כדי שהתאריך המוצג תמיד יתחיל מ"היום" האמיתי
    renderTasksView(document.getElementById("tasks-view"));
  } else if (LAZY_SECTION_INIT[name] && !sectionsInitialized[name]) {
    LAZY_SECTION_INIT[name](document.getElementById(`${name}-view`));
    sectionsInitialized[name] = true;
  }
  closeSidebar();
}

function openSidebar() {
  document.getElementById("sidebar-panel").classList.remove("is-hidden");
  document.getElementById("sidebar-overlay").classList.remove("is-hidden");
}

function closeSidebar() {
  document.getElementById("sidebar-panel").classList.add("is-hidden");
  document.getElementById("sidebar-overlay").classList.add("is-hidden");
}

function initShell() {
  document.getElementById("sidebar-toggle").addEventListener("click", () => {
    const panel = document.getElementById("sidebar-panel");
    if (panel.classList.contains("is-hidden")) openSidebar();
    else closeSidebar();
  });
  document.getElementById("sidebar-overlay").addEventListener("click", closeSidebar);
  document.getElementById("site-title").addEventListener("click", () => showSection("dashboard"));
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.addEventListener("click", () => showSection(btn.dataset.section));
  });

  showSection("dashboard");
}
