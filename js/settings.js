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
// לכל ערכה: 3 רמות עומק בלבד (bg < surface < surface-2), כל רמה בהירה מהקודמת ב-6-8% בלבד
// (אותו גוון, לא גוון חדש) - panel ו-field משתפים תמיד את אותה רמת "surface-2" העליונה.
// --c-accent/--c-highlight הם אקצנט הפעולה הכללי, בגוון-על עשיר מאותה משפחת הצבע של הערכה
// (לא זהב) - --c-accent-positive הוא הזהב, זהה בכל הערכות בכוונה (סימן חיוביות אוניברסלי,
// לא קוסמטי לפי ערכה) ושמור בלעדית לרצף/הבטחה שקוימה/מועדף/הישג
const COLOR_THEMES = {
  classic: {
    label: "סגול דמדומים",
    vars: {
      "--c-page": "#241F38",
      "--c-card": "#322C4C",
      "--c-panel": "#3E3760",
      "--c-field": "#3E3760",
      "--c-border": "rgba(255, 255, 255, 0.08)",
      "--c-accent": "#6C59C0",
      "--c-accent-hover": "#4D39A2",
      "--c-highlight": "#6C59C0",
      "--c-accent-positive": "#B8894A",
      "--c-muted-btn": "#3E3760",
      "--text-light": "#F5F2FA",
      "--text-submuted": "#AFA8C4"
    }
  },
  midnight: {
    label: "כחול לילה",
    vars: {
      "--c-page": "#16213E",
      "--c-card": "#21315C",
      "--c-panel": "#2B417A",
      "--c-field": "#2B417A",
      "--c-border": "rgba(255, 255, 255, 0.08)",
      "--c-accent": "#4362B1",
      "--c-accent-hover": "#304888",
      "--c-highlight": "#4362B1",
      "--c-accent-positive": "#B8894A",
      "--c-muted-btn": "#2B417A",
      "--text-light": "#eef3fb",
      "--text-submuted": "#b9c9e3"
    }
  },
  forest: {
    label: "ירוק אדמה",
    vars: {
      "--c-page": "#1B2E22",
      "--c-card": "#2A4835",
      "--c-panel": "#396148",
      "--c-field": "#396148",
      "--c-border": "rgba(255, 255, 255, 0.08)",
      "--c-accent": "#2D7648",
      "--c-accent-hover": "#1B4B2D",
      "--c-highlight": "#2D7648",
      "--c-accent-positive": "#B8894A",
      "--c-muted-btn": "#396148",
      "--text-light": "#f1f7ee",
      "--text-submuted": "#c3d9c3"
    }
  },
  terracotta: {
    label: "חום חמים",
    vars: {
      "--c-page": "#2E1E1A",
      "--c-card": "#482F29",
      "--c-panel": "#624037",
      "--c-field": "#624037",
      "--c-border": "rgba(255, 255, 255, 0.08)",
      "--c-accent": "#9B4E3B",
      "--c-accent-hover": "#713628",
      "--c-highlight": "#9B4E3B",
      "--c-accent-positive": "#B8894A",
      "--c-muted-btn": "#624037",
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

  // כפתור אימוג'י בודד שמחליף בין מצב "לפי סדר קבוע" (בלי לחזור על משפט פעמיים באותו סבב) לבין
  // מצב "רנדומלי" (הגרלה בלתי-תלויה בכל פעם, יכולה לחזור על אותו משפט באותו סבב)
  const pickModeBtn = el("button", { type: "button", class: "util-btn" });
  // כפתור אימוג'י בודד שמדליק/מכבה מצב עריכה - כשהוא פעיל, לחיצה על כל משפט ברשימה הופכת אותו
  // לשדה עריכה; לחיצה חוזרת על העיפרון סוגרת את מצב העריכה (חוזרים לתצוגה רגילה, לא ניתנת לעריכה)
  const editModeBtn = el("button", { type: "button", class: "util-btn", text: "✏️", title: "עריכת המשפטים בבנק" });
  let bankEditMode = false;

  const bankHeaderRow = el("div", { class: "energy-header-row" }, [
    el("h3", { class: "settings-section-title", text: "ניהול משפטים בתרגילים" }),
    pickModeBtn,
    editModeBtn
  ]);
  bankSection.appendChild(bankHeaderRow);

  const bankSelect = el("select", { class: "field-input settings-bank-select" });
  Object.entries(QUOTE_BANKS).forEach(([id, meta]) => {
    bankSelect.appendChild(el("option", { value: id, text: meta.label }));
  });
  bankSection.appendChild(bankSelect);

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
    pickModeBtn.textContent = mode === "sequential" ? "🔢" : "🔀";
    pickModeBtn.title =
      mode === "sequential"
        ? "סדר הצגה: לפי הסדר הקבוע (בלי לחזור על משפט פעמיים באותו סבב) - לחיצה תחליף לרנדומלי"
        : "סדר הצגה: רנדומלי (יכול לחזור על אותו משפט) - לחיצה תחליף לפי סדר קבוע";
  }

  pickModeBtn.addEventListener("click", () => {
    const bankId = bankSelect.value;
    const nextMode = getBankPickMode(bankId) === "sequential" ? "random" : "sequential";
    setBankPickMode(bankId, nextMode);
    renderPickModeBtn();
  });

  editModeBtn.addEventListener("click", () => {
    bankEditMode = !bankEditMode;
    editModeBtn.classList.toggle("is-active", bankEditMode);
    renderBankList();
  });

  function commitSentenceEdit(bankId, bank, idx, oldText, newText) {
    const trimmed = newText.trim();
    if (!trimmed || trimmed === oldText) {
      renderBankList();
      return;
    }
    const updated = bank.slice();
    updated[idx] = trimmed;
    setQuoteBank(bankId, updated);
    if (isSentenceDisabled(bankId, oldText)) {
      setSentenceDisabled(bankId, oldText, false);
      setSentenceDisabled(bankId, trimmed, true);
    }
    renderBankList();
  }

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

      if (bankEditMode) {
        const editInput = el("input", { type: "text", class: "field-input qbank-edit-input" });
        editInput.value = sentence;
        editInput.addEventListener("blur", () => commitSentenceEdit(bankId, bank, idx, sentence, editInput.value));
        editInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editInput.blur();
          }
        });
        row.appendChild(editInput);
      } else {
        row.appendChild(el("span", { class: "qbank-text", text: sentence }));
      }

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

  // --- ניהול נתונים - גיבוי/שחזור/מיזוג/יצוא/גודל גופן - הועברו הנה מראש מסך היומן כדי
  // שהמסך היומיומי יישאר פנוי לפעולות שמשתמשת נוגעת בהן כל יום בלבד ---
  const dataSection = el("div", { class: "settings-section" });
  dataSection.appendChild(el("h3", { class: "settings-section-title", text: "ניהול נתונים" }));

  const fontRow = el("div", { class: "settings-row" });
  fontRow.appendChild(el("span", { class: "settings-hint", text: "גודל טקסט" }));
  fontRow.appendChild(
    el("button", {
      id: "font-dec",
      type: "button",
      class: "util-btn",
      title: "הקטנת טקסט",
      text: "א−",
      onclick: () => setFontScale(getFontScale() - FONT_SCALE_STEP)
    })
  );
  fontRow.appendChild(
    el("button", {
      id: "font-inc",
      type: "button",
      class: "util-btn",
      title: "הגדלת טקסט",
      text: "א+",
      onclick: () => setFontScale(getFontScale() + FONT_SCALE_STEP)
    })
  );
  dataSection.appendChild(fontRow);

  const fileRow = el("div", { class: "settings-row" });
  fileRow.appendChild(
    el("button", { id: "backup-btn", type: "button", class: "util-btn", title: "גיבוי כל הנתונים לקובץ", text: "⭱ גיבוי", onclick: () => exportBackup() })
  );
  const restoreFileInput = el("input", { id: "restore-file", type: "file", accept: "application/json", hidden: "" });
  restoreFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && confirm("שחזור יחליף את כל הנתונים הקיימים באתר בנתונים מתוך הקובץ. להמשיך?")) {
      importBackupFile(file);
    }
    e.target.value = "";
  });
  fileRow.appendChild(
    el("button", {
      id: "restore-btn",
      type: "button",
      class: "util-btn",
      title: "שחזור נתונים מקובץ גיבוי - מחליף את כל הנתונים הקיימים",
      text: "⭳ שחזור",
      onclick: () => restoreFileInput.click()
    })
  );
  fileRow.appendChild(restoreFileInput);

  const mergeFileInput = el("input", { id: "merge-file", type: "file", accept: "application/json", hidden: "" });
  mergeFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && confirm("מיזוג יוסיף לנתונים הקיימים כאן כל מה שחדש בקובץ, בלי למחוק כלום. להמשיך?")) {
      importBackupFileMerge(file);
    }
    e.target.value = "";
  });
  fileRow.appendChild(
    el("button", {
      id: "merge-btn",
      type: "button",
      class: "util-btn",
      title: "מיזוג נתונים מקובץ גיבוי - מוסיף מה שחסר בלי למחוק כלום",
      text: "🔀 מיזוג",
      onclick: () => mergeFileInput.click()
    })
  );
  fileRow.appendChild(mergeFileInput);
  fileRow.appendChild(
    el("button", {
      id: "export-all-btn",
      type: "button",
      class: "util-btn",
      title: "ייצוא כל הסיכומים והיומן למסמך PDF אחד",
      text: "🖨 ייצוא הכול",
      onclick: () => exportAllToPDF()
    })
  );
  dataSection.appendChild(fileRow);

  const driveRow = el("div", { class: "settings-row" });
  driveRow.appendChild(
    el("button", { id: "drive-save-btn", type: "button", class: "util-btn", title: "שמירת קובץ גיבוי בגוגל דרייב שלך", text: "☁️ שמירה לדרייב", onclick: () => driveSaveBackup() })
  );
  driveRow.appendChild(
    el("button", {
      id: "drive-restore-btn",
      type: "button",
      class: "util-btn",
      title: "שחזור נתונים מקובץ הגיבוי שבגוגל דרייב שלך - מחליף את כל הנתונים הקיימים",
      text: "☁️ שחזור מדרייב",
      onclick: () => driveRestoreBackup()
    })
  );
  driveRow.appendChild(
    el("button", {
      id: "drive-merge-btn",
      type: "button",
      class: "util-btn",
      title: "מיזוג נתונים מקובץ הגיבוי שבגוגל דרייב שלך - מוסיף מה שחסר בלי למחוק כלום",
      text: "☁️🔀 מיזוג מדרייב",
      onclick: () => {
        if (confirm("מיזוג מהדרייב יוסיף לנתונים הקיימים כאן כל מה שחדש בקובץ, בלי למחוק כלום. להמשיך?")) {
          driveMergeBackup();
        }
      }
    })
  );
  dataSection.appendChild(driveRow);

  wrap.appendChild(dataSection);

  container.appendChild(wrap);
}
