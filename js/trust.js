// "הסכם האמינות" - הבטחות קטנות לעצמה עם מעקב קיום. מאגר עצמאי לגמרי ממבנה היומן (לא תלוי
// בתאריך/תקופה הנצפים), כי הבטחה שנרשמה אתמול בערב חייבת להישאר ניתנת להכרעה גם אחרי שהיומן
// של אתמול כבר ננעל ועבר לארכיון. המונה סופר רק "קיימתי" ויכול אך ורק לעלות - אין מכנה, אין
// אחוז, אין רצף - כדי שלא יהפוך למבחן נוסף אצל משתמשת פרפקציוניסטית.

const TRUST_OPEN_WARNING_THRESHOLD = 3;
const TRUST_WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function loadLedger() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE_KEYS.trustLedger));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveLedger(list) {
  safeSetItem(STORE_KEYS.trustLedger, JSON.stringify(list));
}

function openPromises() {
  return loadLedger().filter((p) => p.status === "open");
}

function keptCount() {
  return loadLedger().filter((p) => p.status === "kept").length;
}

function keptCountInMonth(y, m) {
  return loadLedger().filter((p) => {
    if (p.status !== "kept" || !p.closedAt) return false;
    const d = new Date(p.closedAt);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

// היחס נשמר לצורך כיול פנימי בלבד - לעולם לא מוצג כמספר, רק כטקסט מתאים (ראו showCalibrationModal)
function calibrationRatio() {
  const list = loadLedger();
  const kept = list.filter((p) => p.status === "kept").length;
  const missed = list.filter((p) => p.status === "missed").length;
  return { kept, decided: kept + missed };
}

function dueFrom(scope) {
  const d = new Date();
  if (scope === "half") d.setMinutes(d.getMinutes() + 30);
  if (scope === "today") {
    d.setHours(21, 0, 0, 0);
    // מקרה קצה: אם 21:00 כבר עבר היום, היעד עוד שעתיים מעכשיו במקום לשעה שכבר חלפה
    if (d.getTime() <= Date.now()) return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }
  if (scope === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(21, 0, 0, 0);
  }
  return d.toISOString();
}

function addTrustPromise(text, scope) {
  const list = loadLedger();
  list.push({
    id: "p" + Date.now(),
    text: text.trim(),
    scope,
    createdAt: new Date().toISOString(),
    dueAt: dueFrom(scope),
    status: "open"
  });
  saveLedger(list);
}

function closeTrustPromise(id, status) {
  const list = loadLedger();
  const item = list.find((p) => p.id === id);
  if (!item) return;
  item.status = status;
  item.closedAt = new Date().toISOString();
  saveLedger(list);
}

function removeTrustPromise(id) {
  saveLedger(loadLedger().filter((p) => p.id !== id));
}

function trustStartOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// עברית, יחסי: היום/אתמול/מחר/יום בשבוע (עד 6 ימים אחורה)/DD-MM - כדי שקל יהיה לבדוק שלא
// התבלבלו בימים ולראות כמה זמן חלף בין רישום לביצוע
function formatTrustTimestamp(iso) {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dayDiff = Math.round((trustStartOfDay(d) - trustStartOfDay(now)) / 86400000);
  if (dayDiff === 0) return `היום ${time}`;
  if (dayDiff === -1) return `אתמול ${time}`;
  if (dayDiff === 1) return `מחר ${time}`;
  if (dayDiff <= -2 && dayDiff >= -6) return `${TRUST_WEEKDAYS_HE[d.getDay()]} ${time}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} ${time}`;
}

function showCalibrationModal() {
  const { kept, decided } = calibrationRatio();
  let message;
  if (decided < 5) {
    message = "עוד מעט נתונים ואפשר יהיה לכייל.";
  } else {
    const ratio = kept / decided;
    if (ratio >= 0.9) message = "ההבטחות שלך בגודל הנכון. תמשיכי כך.";
    else if (ratio >= 0.7) message = "ההבטחות קצת גדולות מדי. הקטיני את הבאה.";
    else message = "ההבטחות גדולות מדי. הקטיני משמעותית - לרמה של 30 שניות.";
  }

  const overlay = el("div", { class: "modal-overlay" });
  const modal = el("div", { class: "modal-box" });
  modal.appendChild(el("h3", { class: "modal-title", text: "🔧 בדיקת כיול" }));
  modal.appendChild(el("p", { class: "modal-line", text: message }));
  modal.appendChild(el("p", { class: "modal-line trust-calibration-footnote", text: "הבדיקה הזו אינה מדד עלייך. היא מודדת אם ההבטחות בגודל הנכון." }));
  modal.appendChild(el("button", { class: "btn btn-primary", type: "button", text: "סגירה", onclick: () => overlay.remove() }));
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function buildTrustRow(promise) {
  const row = el("div", { class: "trust-row" });
  row.appendChild(el("p", { class: "trust-text", text: promise.text }));

  const meta = el("div", { class: "trust-meta" }, [
    el("span", { text: `✍️ נרשם: ${formatTrustTimestamp(promise.createdAt)}` }),
    el("span", { text: `⏰ עד: ${formatTrustTimestamp(promise.dueAt)}` })
  ]);
  row.appendChild(meta);

  if (new Date(promise.dueAt).getTime() < Date.now()) {
    row.appendChild(el("p", { class: "trust-late", text: `⚠️ עבר הזמן - היעד היה ${formatTrustTimestamp(promise.dueAt)}` }));
  }

  const acts = el("div", { class: "trust-acts" }, [
    el("button", {
      type: "button",
      class: "btn btn-ghost btn-small",
      text: "קיימתי",
      onclick: () => {
        closeTrustPromise(promise.id, "kept");
        refreshTrustStrip();
      }
    }),
    el("button", {
      type: "button",
      class: "btn btn-ghost btn-small",
      text: "לא קיימתי",
      onclick: () => {
        closeTrustPromise(promise.id, "missed");
        refreshTrustStrip();
      }
    }),
    el("button", {
      type: "button",
      class: "btn btn-ghost btn-small",
      text: "לא רלוונטי",
      onclick: () => {
        removeTrustPromise(promise.id);
        refreshTrustStrip();
      }
    })
  ]);
  row.appendChild(acts);

  return row;
}

function buildTrustStripElement() {
  const container = el("div", { class: "trust-strip" });

  const balanceRow = el("div", { class: "trust-balance" }, [
    el("span", { text: `🏁 קיימתי לעצמי: ${keptCount()} הבטחות` }),
    el("button", { type: "button", class: "btn btn-ghost btn-small", text: "🔧 כיול", onclick: showCalibrationModal })
  ]);
  container.appendChild(balanceRow);
  container.appendChild(el("div", { class: "trust-divider" }));

  const open = openPromises().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (open.length === 0) {
    container.appendChild(el("p", { class: "trust-empty", text: "אין הבטחה פתוחה." }));
    container.appendChild(el("p", { class: "trust-empty-hint", text: "לרישום - לחצי על 🏁 שלצד הרצועה" }));
  } else {
    open.forEach((promise) => container.appendChild(buildTrustRow(promise)));
  }

  return container;
}

// אלמנט הרצועה הפעיל כרגע ב-DOM - נשמר כדי שפעולות ההכרעה יוכלו להחליף רק אותו במקום,
// בלי לרנדר מחדש את כל לשונית "יומן" (ולאבד מצב עריכה בטופס פתוח)
let trustStripEl = null;

function renderTrustStrip() {
  trustStripEl = buildTrustStripElement();
  return trustStripEl;
}

function refreshTrustStrip() {
  if (!trustStripEl || !trustStripEl.parentNode) return;
  const fresh = buildTrustStripElement();
  trustStripEl.replaceWith(fresh);
  trustStripEl = fresh;
}

// טופס רישום ההבטחה - עצמאי לגמרי מהיומן (לא תלוי תאריך/תקופה), כדי שיוכל להופיע קבוע
// לצד רצועת ההבטחות במקום כתרגיל נבחר בתוך רשימת התרגילים היומית. במצב סגור זה רק כפתור
// טריגר קטן; לחיצה עליו פותחת את הטופס המלא וגורמת לרצועה לצמצם ולחלוק את השורה איתו.
// אחרי רישום מוצלח הטופס נסגר שוב מעצמו והרצועה חוזרת לתפוס את כל רוחב השורה
let trustComposeOpen = false;

function loadTrustDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.trustDraft)) || {};
  } catch (e) {
    return {};
  }
}

function saveTrustDraft(draft) {
  safeSetItem(STORE_KEYS.trustDraft, JSON.stringify(draft));
}

function buildTrustWidgetElement() {
  const box = el("div", { class: "trust-widget" + (trustComposeOpen ? " is-open" : "") });

  if (!trustComposeOpen) {
    box.appendChild(
      el("button", {
        type: "button",
        class: "trust-widget-trigger",
        title: "רישום הבטחה חדשה",
        text: "🏁",
        onclick: () => {
          trustComposeOpen = true;
          refreshTrustWidget();
        }
      })
    );
    return box;
  }

  const headerRow = el("div", { class: "trust-widget-header" }, [
    el("p", { class: "exercise-note", text: "הבטחה אחת - קטנה עד שאי אפשר לא לקיים אותה." }),
    el("button", {
      type: "button",
      class: "trust-widget-close",
      title: "סגירה",
      text: "✕",
      onclick: () => {
        trustComposeOpen = false;
        refreshTrustWidget();
      }
    })
  ]);
  box.appendChild(headerRow);

  const draft = loadTrustDraft();
  const textInput = el("input", { type: "text", class: "field-input", placeholder: "אפתח את הקובץ ואסתכל 60 שניות" });
  textInput.value = draft.text || "";
  box.appendChild(textInput);

  box.appendChild(el("p", { class: "exercise-note trust-scope-label", text: "עד מתי:" }));
  const pillsRow = el("div", { class: "period-pills trust-scope-row" });
  let scope = draft.scope || "half";
  const scopeOptions = [
    { id: "half", label: "חצי שעה" },
    { id: "today", label: "היום" },
    { id: "tomorrow", label: "מחר" }
  ];

  const registerBtn = el("button", { type: "button", class: "trust-register-flag-btn", title: "רישום ההבטחה", text: "🏁" });
  const warningNote = el("p", { class: "exercise-note trust-open-warning is-hidden", text: "יש כבר 3 הבטחות פתוחות. שווה להכריע בהן קודם." });

  function persistDraft() {
    saveTrustDraft({ text: textInput.value, scope });
  }

  function renderScopePills() {
    pillsRow.innerHTML = "";
    scopeOptions.forEach((opt) => {
      pillsRow.appendChild(
        el("button", {
          type: "button",
          class: "period-pill" + (scope === opt.id ? " is-active" : ""),
          text: opt.label,
          onclick: () => {
            scope = opt.id;
            renderScopePills();
            persistDraft();
          }
        })
      );
    });
    pillsRow.appendChild(registerBtn);
  }
  renderScopePills();
  box.appendChild(pillsRow);

  function checkOpenWarning() {
    warningNote.classList.toggle("is-hidden", openPromises().length < TRUST_OPEN_WARNING_THRESHOLD);
  }
  checkOpenWarning();
  box.appendChild(warningNote);

  registerBtn.disabled = !textInput.value.trim();
  textInput.addEventListener("input", () => {
    registerBtn.disabled = !textInput.value.trim();
    persistDraft();
  });

  registerBtn.addEventListener("click", () => {
    if (!textInput.value.trim()) return;
    addTrustPromise(textInput.value, scope);
    saveTrustDraft({});
    trustComposeOpen = false;
    refreshTrustWidget();
    refreshTrustStrip();
  });

  return box;
}

let trustWidgetEl = null;

function renderTrustWidget() {
  trustWidgetEl = buildTrustWidgetElement();
  return trustWidgetEl;
}

function refreshTrustWidget() {
  if (!trustWidgetEl || !trustWidgetEl.parentNode) return;
  const fresh = buildTrustWidgetElement();
  trustWidgetEl.replaceWith(fresh);
  trustWidgetEl = fresh;
}

// קטע קריאה-בלבד בלשונית "ארכיונים" - מציג הבטחות שהוכרעו (kept/missed), משויך ליום ההכרעה
// ולא ליום הרישום, כי יום הרישום כבר נשמר וננעל. "לא רלוונטי" נמחק ולעולם לא מגיע לכאן
function buildTrustArchiveSection() {
  const closed = loadLedger()
    .filter((p) => p.status === "kept" || p.status === "missed")
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));
  if (closed.length === 0) return null;

  const section = el("div", { class: "panel trust-archive-section" });
  section.appendChild(el("h3", { class: "panel-title trust-archive-title", text: "הסכם האמינות" }));

  closed.forEach((p) => {
    const late = new Date(p.closedAt).getTime() > new Date(p.dueAt).getTime();
    const metaText =
      `✍️ נרשם: ${formatTrustTimestamp(p.createdAt)}  ·  ⏰ יעד: ${formatTrustTimestamp(p.dueAt)}  ·  ` +
      `✓ הוכרע: ${formatTrustTimestamp(p.closedAt)}${late ? " (באיחור)" : ""}`;

    const textCol = el("div", { class: "trust-archive-text-col" }, [
      el("p", { class: "trust-text", text: p.text }),
      el("p", { class: "trust-meta", text: metaText })
    ]);

    const row = el("div", { class: "trust-archive-row" }, [
      el("span", { class: "trust-archive-mark " + (p.status === "kept" ? "is-kept" : "is-missed"), text: p.status === "kept" ? "✓" : "—" }),
      textCol
    ]);
    section.appendChild(row);
  });

  return section;
}
