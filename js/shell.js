// מעטפת האתר - ניווט בין דשבורד/יומן/סיכומים/החלטות דרך תפריט צד

const SECTIONS = ["dashboard", "journal", "summaries", "decisions"];
let sectionsInitialized = { summaries: false, decisions: false };

function showSection(name) {
  SECTIONS.forEach((s) => {
    document.getElementById(`${s}-view`).classList.toggle("is-hidden", s !== name);
  });
  if (name === "summaries" && !sectionsInitialized.summaries) {
    initSummariesView(document.getElementById("summaries-view"));
    sectionsInitialized.summaries = true;
  }
  if (name === "decisions" && !sectionsInitialized.decisions) {
    initDecisionsView(document.getElementById("decisions-view"));
    sectionsInitialized.decisions = true;
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
