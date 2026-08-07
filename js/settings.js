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

  container.appendChild(wrap);
}
