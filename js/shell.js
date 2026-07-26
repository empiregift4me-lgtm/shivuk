// מעטפת האתר - ניווט בין דשבורד/יומן/סיכומים/החלטות דרך תפריט צד

const SECTIONS = ["dashboard", "journal", "summaries", "decisions", "emotional", "tasks", "energy", "mantras"];
const LAZY_SECTION_INIT = {
  summaries: initSummariesView
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
  } else if (name === "energy") {
    // מתעדכן בכל כניסה, כדי לשקף תיעודי אנרגיה חדשים שנוספו מאז
    renderEnergyView(document.getElementById("energy-view"));
  } else if (name === "decisions") {
    // מתעדכן בכל כניסה - נדרש כדי לשקף קישורים חדשים שנוספו מסיכומים בזמן שהיינו במסך אחר
    initDecisionsView(document.getElementById("decisions-view"));
  } else if (name === "emotional") {
    initEmotionalView(document.getElementById("emotional-view"));
  } else if (name === "mantras") {
    // מתעדכן בכל כניסה, כדי לשקף מנטרות חדשות שנשמרו מהחלונית שאחרי הסיסמה
    renderMantrasView(document.getElementById("mantras-view"));
  } else if (LAZY_SECTION_INIT[name] && !sectionsInitialized[name]) {
    LAZY_SECTION_INIT[name](document.getElementById(`${name}-view`));
    sectionsInitialized[name] = true;
  }
  closeSidebar();
}

// מציגה בתפריט הצד כמה מקום נוצל מתוך מכסת אחסון שמרנית, כדי שיהיה ברור מראש כמה עוד אפשר להעלות
function renderStorageMeter() {
  const fill = document.getElementById("storage-meter-fill");
  const text = document.getElementById("storage-meter-text");
  if (!fill || !text) return;
  const used = computeStorageUsageBytes();
  const pct = Math.min(100, Math.round((used / STORAGE_SOFT_LIMIT_BYTES) * 100));
  fill.style.width = pct + "%";
  fill.classList.toggle("is-warning", pct >= 75 && pct < 92);
  fill.classList.toggle("is-danger", pct >= 92);
  const usedMB = (used / (1024 * 1024)).toFixed(1);
  const imgCount = countStoredImages();
  text.textContent = `${usedMB}MB מתוך כ-5MB בשימוש (${pct}%)${imgCount ? ` · ${imgCount} תמונות שמורות` : ""}`;
}

function openSidebar() {
  document.getElementById("sidebar-panel").classList.remove("is-hidden");
  document.getElementById("sidebar-overlay").classList.remove("is-hidden");
  renderStorageMeter();
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

  // כפתור החשכת מסך - נשמר הפוקוס בתיבת ההקלדה הפעילה (למשל אם היא באמצע כתיבה), כדי שאפשר יהיה
  // להמשיך להקליד "בעיניים עצומות" בלי שהלחיצה על הכפתור תעביר את הפוקוס אליו
  const blackoutToggle = document.getElementById("blackout-toggle");
  const blackoutOverlay = document.getElementById("blackout-overlay");
  blackoutToggle.addEventListener("mousedown", (e) => e.preventDefault());
  blackoutToggle.addEventListener("click", () => {
    blackoutOverlay.classList.toggle("is-hidden");
    blackoutToggle.classList.toggle("is-active", !blackoutOverlay.classList.contains("is-hidden"));
  });
  document.querySelectorAll(".sidebar-item").forEach((btn) => {
    btn.addEventListener("click", () => showSection(btn.dataset.section));
  });

  showSection("dashboard");
}
