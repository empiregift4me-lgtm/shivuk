// הגדרות אישיות - שם תצוגה, קישור מוזיקת רקע, והחלפת סיסמה. נשמר בהעדפות (prefs) ולא בקוד,
// כדי שאפשר יהיה למסור עותק של המערכת למישהי אחרת בלי לגעת בקוד בשבילה. לכל הגדרה יש ברירת
// מחדל שזהה בדיוק למה שהיה קבוע בקוד עד עכשיו - כך שלמי שכבר משתמשת במערכת שום דבר לא משתנה
// עד שהיא בעצמה שומרת ערך חדש כאן

const DEFAULT_SITE_DISPLAY_NAME = "יומן אישי של עדיה";
const DEFAULT_LOCK_PASSWORD = "31059111";

function getSiteDisplayName() {
  const prefs = loadPrefs();
  return prefs.siteDisplayName || DEFAULT_SITE_DISPLAY_NAME;
}

function setSiteDisplayName(name) {
  const prefs = loadPrefs();
  prefs.siteDisplayName = name.trim();
  savePrefs(prefs);
  applySiteDisplayName();
}

function applySiteDisplayName() {
  const name = getSiteDisplayName();
  const titleEl = document.getElementById("site-title");
  if (titleEl) titleEl.textContent = name;
  document.title = name;
}

function getMusicLink() {
  const prefs = loadPrefs();
  return prefs.musicLink || "";
}

function setMusicLink(url) {
  const prefs = loadPrefs();
  prefs.musicLink = url.trim();
  savePrefs(prefs);
}

// שולפת מזהה סרטון יוטיוב מכל צורת קישור נפוצה (youtube.com/watch?v=, youtu.be/, embed/), או
// מקבלת מזהה גולמי (11 תווים) שהודבק בלי קישור סביבו
function extractYoutubeId(url) {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

// --- ערכת צבעים ---
// כל ערכה מגדירה מחדש את אותם משתני CSS בדיוק (--c-page, --c-card וכו') כדי לשמור על אותו
// מבנה ניגודיות בדיוק כמו הפלטה המקורית, רק בגוון אחר
const COLOR_THEMES = {
  classic: {
    label: "סגול קלאסי",
    vars: {
      "--c-page": "#231942",
      "--c-card": "#4a4270",
      "--c-panel": "#3a3260",
      "--c-field": "#574f82",
      "--c-border": "#9f86c0",
      "--c-accent": "#ddd0e6",
      "--c-accent-hover": "#c9b6d6",
      "--c-highlight": "#e0b1cb",
      "--c-muted-btn": "#5e548e",
      "--text-light": "#f6f1fb",
      "--text-submuted": "#cdb9e6"
    }
  },
  midnight: {
    label: "כחול לילה",
    vars: {
      "--c-page": "#16213e",
      "--c-card": "#2f4470",
      "--c-panel": "#26355c",
      "--c-field": "#3d5590",
      "--c-border": "#7fa8d9",
      "--c-accent": "#cfe0f5",
      "--c-accent-hover": "#b3cde8",
      "--c-highlight": "#a8c8ec",
      "--c-muted-btn": "#3a4f85",
      "--text-light": "#eef3fb",
      "--text-submuted": "#b9c9e3"
    }
  },
  forest: {
    label: "ירוק אדמה",
    vars: {
      "--c-page": "#1b2e22",
      "--c-card": "#35513f",
      "--c-panel": "#2a4232",
      "--c-field": "#436350",
      "--c-border": "#8fb89a",
      "--c-accent": "#d9ead9",
      "--c-accent-hover": "#c3ddc3",
      "--c-highlight": "#b7d9a8",
      "--c-muted-btn": "#3f5a46",
      "--text-light": "#f1f7ee",
      "--text-submuted": "#c3d9c3"
    }
  },
  terracotta: {
    label: "חום חמים",
    vars: {
      "--c-page": "#2e1e1a",
      "--c-card": "#5a3d34",
      "--c-panel": "#472f28",
      "--c-field": "#6b4a3f",
      "--c-border": "#c99a82",
      "--c-accent": "#f0d9c8",
      "--c-accent-hover": "#e3c3ab",
      "--c-highlight": "#e8b6a0",
      "--c-muted-btn": "#6d4a3d",
      "--text-light": "#fbf1ea",
      "--text-submuted": "#dcbba8"
    }
  }
};

function getColorTheme() {
  const prefs = loadPrefs();
  return COLOR_THEMES[prefs.colorTheme] ? prefs.colorTheme : "classic";
}

function setColorTheme(id) {
  const prefs = loadPrefs();
  prefs.colorTheme = id;
  savePrefs(prefs);
  applyColorTheme();
}

function applyColorTheme() {
  const theme = COLOR_THEMES[getColorTheme()] || COLOR_THEMES.classic;
  Object.entries(theme.vars).forEach(([key, val]) => document.documentElement.style.setProperty(key, val));
}

// --- הפעלה/כיבוי מודולים בתפריט הצד - "יומן הערכה" ו"הגדרות" תמיד פעילים, לא ניתנים לכיבוי ---
const TOGGLEABLE_MODULES = [
  { id: "summaries", label: "סיכומים" },
  { id: "decisions", label: "החלטות עסקיות חשובות" },
  { id: "emotional", label: "תיעוד רגשי" },
  { id: "tasks", label: "ניהול משימות היום" }
];

function getEnabledModules() {
  const prefs = loadPrefs();
  const stored = prefs.enabledModules || {};
  const enabled = {};
  TOGGLEABLE_MODULES.forEach((m) => {
    enabled[m.id] = stored[m.id] === undefined ? true : !!stored[m.id];
  });
  return enabled;
}

function setModuleEnabled(id, isEnabled) {
  const prefs = loadPrefs();
  prefs.enabledModules = getEnabledModules();
  prefs.enabledModules[id] = isEnabled;
  savePrefs(prefs);
  applyModuleVisibility();
}

function applyModuleVisibility() {
  const enabled = getEnabledModules();
  TOGGLEABLE_MODULES.forEach((m) => {
    const btn = document.querySelector(`.sidebar-item[data-section="${m.id}"]`);
    if (btn) btn.classList.toggle("is-hidden", !enabled[m.id]);
  });
}

function getLockPassword() {
  const prefs = loadPrefs();
  return prefs.lockPassword || DEFAULT_LOCK_PASSWORD;
}

function setLockPassword(newPassword) {
  const prefs = loadPrefs();
  prefs.lockPassword = newPassword;
  savePrefs(prefs);
}

function flashSaved(btn, text) {
  const original = btn.textContent;
  btn.textContent = text || "נשמר ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1800);
}

function renderSettingsView(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "panel settings-page" });

  const headerRow = el("div", { class: "energy-header-row" });
  headerRow.appendChild(
    el("button", { type: "button", class: "util-btn", text: "→", title: "חזרה ללוח הבקרה", onclick: () => showSection("dashboard") })
  );
  headerRow.appendChild(el("h2", { class: "panel-title", text: "⚙️ הגדרות" }));
  wrap.appendChild(headerRow);

  // --- שם היומן ---
  const nameSection = el("div", { class: "settings-section" });
  nameSection.appendChild(el("h3", { class: "settings-section-title", text: "שם היומן" }));
  const nameInput = el("input", { type: "text", class: "field-input", placeholder: "לדוגמה: היומן שלי" });
  nameInput.value = getSiteDisplayName();
  const nameSaveBtn = el("button", { type: "button", class: "btn btn-secondary btn-small", text: "שמירה" });
  nameSaveBtn.addEventListener("click", () => {
    if (!nameInput.value.trim()) return;
    setSiteDisplayName(nameInput.value);
    flashSaved(nameSaveBtn);
  });
  nameSection.appendChild(el("div", { class: "settings-row" }, [nameInput, nameSaveBtn]));
  wrap.appendChild(nameSection);

  // --- ערכת צבעים ---
  const themeSection = el("div", { class: "settings-section" });
  themeSection.appendChild(el("h3", { class: "settings-section-title", text: "ערכת צבעים" }));
  const swatchRow = el("div", { class: "theme-swatch-row" });
  function renderSwatches() {
    swatchRow.innerHTML = "";
    const current = getColorTheme();
    Object.entries(COLOR_THEMES).forEach(([id, theme]) => {
      const swatch = el("button", {
        type: "button",
        class: "theme-swatch" + (id === current ? " is-active" : ""),
        title: theme.label
      });
      swatch.style.background = `linear-gradient(135deg, ${theme.vars["--c-highlight"]}, ${theme.vars["--c-page"]})`;
      swatch.addEventListener("click", () => {
        setColorTheme(id);
        renderSwatches();
      });
      const item = el("div", { class: "theme-swatch-item" }, [swatch, el("span", { class: "theme-swatch-label", text: theme.label })]);
      swatchRow.appendChild(item);
    });
  }
  renderSwatches();
  themeSection.appendChild(swatchRow);
  wrap.appendChild(themeSection);

  // --- מוזיקת רקע ---
  const musicSection = el("div", { class: "settings-section" });
  musicSection.appendChild(el("h3", { class: "settings-section-title", text: "מוזיקת רקע" }));
  musicSection.appendChild(
    el("p", { class: "settings-hint", text: "הדביקי קישור לסרטון יוטיוב שתרצי שינגן ברקע (כפתור ה-▶ ליד כפתור ההחשכה)." })
  );
  const musicInput = el("input", { type: "text", class: "field-input", placeholder: "https://www.youtube.com/watch?v=..." });
  musicInput.value = getMusicLink();
  const musicError = el("span", { class: "settings-error" });
  const musicSaveBtn = el("button", { type: "button", class: "btn btn-secondary btn-small", text: "שמירה" });
  musicSaveBtn.addEventListener("click", () => {
    const val = musicInput.value.trim();
    if (val && !extractYoutubeId(val)) {
      musicError.textContent = "לא זיהיתי קישור יוטיוב תקין.";
      return;
    }
    musicError.textContent = "";
    setMusicLink(val);
    if (typeof resetMusicPlayer === "function") resetMusicPlayer();
    flashSaved(musicSaveBtn);
  });
  musicSection.appendChild(el("div", { class: "settings-row" }, [musicInput, musicSaveBtn]));
  musicSection.appendChild(musicError);
  wrap.appendChild(musicSection);

  // --- החלפת סיסמה ---
  const pwSection = el("div", { class: "settings-section" });
  pwSection.appendChild(el("h3", { class: "settings-section-title", text: "החלפת סיסמה" }));
  const currentPwInput = el("input", { type: "password", class: "field-input", placeholder: "סיסמה נוכחית", autocomplete: "off" });
  const newPwInput = el("input", { type: "password", class: "field-input", placeholder: "סיסמה חדשה", autocomplete: "off" });
  const confirmPwInput = el("input", { type: "password", class: "field-input", placeholder: "אימות סיסמה חדשה", autocomplete: "off" });
  const pwError = el("span", { class: "settings-error" });
  const pwSaveBtn = el("button", { type: "button", class: "btn btn-secondary btn-small", text: "עדכון סיסמה" });
  pwSaveBtn.addEventListener("click", () => {
    pwError.textContent = "";
    if (currentPwInput.value !== getLockPassword()) {
      pwError.textContent = "הסיסמה הנוכחית שגויה.";
      return;
    }
    if (!newPwInput.value || newPwInput.value.length < 4) {
      pwError.textContent = "הסיסמה החדשה חייבת להיות באורך 4 תווים לפחות.";
      return;
    }
    if (newPwInput.value !== confirmPwInput.value) {
      pwError.textContent = "האימות לא תואם לסיסמה החדשה.";
      return;
    }
    setLockPassword(newPwInput.value);
    currentPwInput.value = "";
    newPwInput.value = "";
    confirmPwInput.value = "";
    flashSaved(pwSaveBtn, "הסיסמה עודכנה ✓");
  });
  pwSection.appendChild(el("div", { class: "settings-row settings-row--stack" }, [currentPwInput, newPwInput, confirmPwInput, pwSaveBtn]));
  pwSection.appendChild(pwError);
  wrap.appendChild(pwSection);

  // --- הפעלה/כיבוי מודולים בתפריט הצד ---
  const modulesSection = el("div", { class: "settings-section" });
  modulesSection.appendChild(el("h3", { class: "settings-section-title", text: "לשוניות פעילות בתפריט הצד" }));
  modulesSection.appendChild(el("p", { class: "settings-hint", text: "כיבוי לשונית מסתיר אותה מהתפריט - הנתונים שכבר נשמרו בה לא נמחקים." }));
  const modulesList = el("div", { class: "settings-modules-list" });
  const enabledModules = getEnabledModules();
  TOGGLEABLE_MODULES.forEach((m) => {
    const checkboxId = `module-toggle-${m.id}`;
    const checkbox = el("input", { type: "checkbox", id: checkboxId });
    checkbox.checked = enabledModules[m.id];
    checkbox.addEventListener("change", () => setModuleEnabled(m.id, checkbox.checked));
    const row = el("label", { class: "settings-module-row", for: checkboxId }, [checkbox, el("span", { text: m.label })]);
    modulesList.appendChild(row);
  });
  modulesSection.appendChild(modulesList);
  wrap.appendChild(modulesSection);

  // --- ניהול משפטים בתרגילים ---
  const bankSection = el("div", { class: "settings-section" });
  bankSection.appendChild(el("h3", { class: "settings-section-title", text: "ניהול משפטים בתרגילים" }));
  const bankSelect = el("select", { class: "field-input settings-bank-select" });
  Object.entries(QUOTE_BANKS).forEach(([id, meta]) => {
    bankSelect.appendChild(el("option", { value: id, text: meta.label }));
  });
  bankSection.appendChild(bankSelect);

  // כפתור בודד שמחליף בין מצב "לפי סדר קבוע" (בלי לחזור על משפט פעמיים באותו סבב) לבין מצב
  // "רנדומלי" (הגרלה בלתי-תלויה בכל פעם, יכולה לחזור על אותו משפט באותו סבב) - הטקסט על הכפתור
  // תמיד משקף את המצב הפעיל כרגע
  const pickModeBtn = el("button", { type: "button", class: "btn btn-ghost btn-small" });
  bankSection.appendChild(pickModeBtn);

  const bankCountLabel = el("p", { class: "settings-hint" });
  bankSection.appendChild(bankCountLabel);
  const bankList = el("div", { class: "qbank-list" });
  bankSection.appendChild(bankList);

  const bankAddInput = el("input", { type: "text", class: "field-input", placeholder: "משפט חדש..." });
  const bankAddBtn = el("button", { type: "button", class: "btn btn-secondary btn-small", text: "+ הוספה" });
  bankSection.appendChild(el("div", { class: "settings-row" }, [bankAddInput, bankAddBtn]));

  const bankResetBtn = el("button", { type: "button", class: "btn btn-ghost btn-small", text: "↺ איפוס לרשימה המקורית" });
  bankSection.appendChild(bankResetBtn);

  function renderPickModeBtn() {
    const bankId = bankSelect.value;
    const mode = getBankPickMode(bankId);
    pickModeBtn.textContent = mode === "sequential" ? "🔢 סדר הצגה: לפי הסדר (בלי לחזור באותו סבב)" : "🔀 סדר הצגה: רנדומלי (כולל אפשרות לחזור)";
  }

  pickModeBtn.addEventListener("click", () => {
    const bankId = bankSelect.value;
    const nextMode = getBankPickMode(bankId) === "sequential" ? "random" : "sequential";
    setBankPickMode(bankId, nextMode);
    renderPickModeBtn();
  });

  function renderBankList() {
    const bankId = bankSelect.value;
    const bank = getQuoteBank(bankId);
    const disabledCount = bank.filter((s) => isSentenceDisabled(bankId, s)).length;
    bankCountLabel.textContent = `${bank.length} משפטים בבנק` + (disabledCount ? ` (${disabledCount} מהם כבויים)` : "");
    bankResetBtn.disabled = !isQuoteBankCustomized(bankId);
    renderPickModeBtn();
    bankList.innerHTML = "";
    bank.forEach((sentence, idx) => {
      const disabled = isSentenceDisabled(bankId, sentence);
      const row = el("div", { class: "qbank-row" + (disabled ? " qbank-row--disabled" : "") });
      row.appendChild(el("span", { class: "qbank-text", text: sentence }));
      const actions = el("div", { class: "qbank-row-actions" });
      actions.appendChild(
        el("button", {
          type: "button",
          class: "row-remove",
          text: disabled ? "🙈" : "👁",
          title: disabled ? "הפעלת המשפט מחדש" : "כיבוי תצוגת המשפט הזה (בלי למחוק)",
          onclick: () => {
            setSentenceDisabled(bankId, sentence, !disabled);
            renderBankList();
          }
        })
      );
      actions.appendChild(
        el("button", {
          type: "button",
          class: "row-remove",
          text: "×",
          title: "מחיקת המשפט",
          onclick: () => {
            if (!confirm("האם את בטוחה שברצונך למחוק את המשפט הזה?")) return;
            const updated = bank.slice();
            updated.splice(idx, 1);
            setQuoteBank(bankId, updated);
            setSentenceDisabled(bankId, sentence, false);
            renderBankList();
          }
        })
      );
      row.appendChild(actions);
      bankList.appendChild(row);
    });
  }

  bankSelect.addEventListener("change", renderBankList);
  bankAddBtn.addEventListener("click", () => {
    const val = bankAddInput.value.trim();
    if (!val) return;
    const bankId = bankSelect.value;
    const updated = getQuoteBank(bankId).slice();
    updated.push(val);
    setQuoteBank(bankId, updated);
    bankAddInput.value = "";
    renderBankList();
  });
  bankAddInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      bankAddBtn.click();
    }
  });
  bankResetBtn.addEventListener("click", () => {
    if (!confirm("לאפס את הבנק הזה לרשימת ברירת המחדל המקורית? כל השינויים שביצעת בו יימחקו.")) return;
    resetQuoteBank(bankSelect.value);
    renderBankList();
  });

  renderBankList();
  wrap.appendChild(bankSection);

  container.appendChild(wrap);
}
