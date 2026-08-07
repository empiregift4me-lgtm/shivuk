// רישום בנקי המשפטים הניתנים לעריכה מ"הגדרות" (משפטי כח, הצהרות חיוביות, אתגר משפטי הערכה עצמית).
// כל בנק נשמר ב-localStorage רק אם נערך בפועל - כל עוד לא נגעו בו, משתמשים ברשימה המקורית
// שבקוד (data.js) כברירת מחדל, כדי שלמי שלא ניגשת ל"הגדרות" שום דבר לא משתנה

const QUOTE_BANKS = {
  abundance: { label: "משפטי כח", defaultBank: QUOTE_BANK_ABUNDANCE },
  "positive-affirmations": { label: "הצהרות חיוביות", defaultBank: QUOTE_BANK_POSITIVE_AFFIRMATIONS },
  "self-esteem": { label: "אתגר משפטי הערכה עצמית", defaultBank: SENTENCE_BANK_SELF_ESTEEM }
};

function loadCustomBanks() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.customQuoteBanks)) || {};
  } catch (e) {
    return {};
  }
}

function saveCustomBanks(all) {
  safeSetItem(STORE_KEYS.customQuoteBanks, JSON.stringify(all));
}

function getQuoteBank(bankId) {
  const custom = loadCustomBanks();
  if (custom[bankId]) return custom[bankId];
  return (QUOTE_BANKS[bankId] && QUOTE_BANKS[bankId].defaultBank) || [];
}

function setQuoteBank(bankId, list) {
  const custom = loadCustomBanks();
  custom[bankId] = list;
  saveCustomBanks(custom);
}

function resetQuoteBank(bankId) {
  const custom = loadCustomBanks();
  delete custom[bankId];
  saveCustomBanks(custom);
}

function isQuoteBankCustomized(bankId) {
  return !!loadCustomBanks()[bankId];
}

// --- כיבוי משפט בודד (לא מוצג בתרגילים) בלי למחוק אותו מהבנק - נשמר לפי טקסט המשפט, נפרד
// מהבנק עצמו, כדי שהמחיקה בפועל תישאר פעולה נפרדת ומכוונת ---
function loadDisabledSentences() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.disabledQuoteSentences)) || {};
  } catch (e) {
    return {};
  }
}

function saveDisabledSentences(all) {
  safeSetItem(STORE_KEYS.disabledQuoteSentences, JSON.stringify(all));
}

function isSentenceDisabled(bankId, sentence) {
  const all = loadDisabledSentences();
  return !!(all[bankId] && all[bankId].includes(sentence));
}

function setSentenceDisabled(bankId, sentence, disabled) {
  const all = loadDisabledSentences();
  const list = all[bankId] || [];
  const idx = list.indexOf(sentence);
  if (disabled && idx === -1) list.push(sentence);
  else if (!disabled && idx !== -1) list.splice(idx, 1);
  all[bankId] = list;
  saveDisabledSentences(all);
}

// הבנק בפועל לצורך הגרלה/בחירה בתרגילים - כל הבנק בניכוי משפטים שכובו (הרשימה לניהול בהגדרות
// ממשיכה להשתמש ב-getQuoteBank הרגיל, כדי שאפשר יהיה להמשיך לראות ולהפעיל מחדש משפטים כבויים)
function getEnabledQuoteBank(bankId) {
  const full = getQuoteBank(bankId);
  const disabled = loadDisabledSentences()[bankId] || [];
  if (!disabled.length) return full;
  return full.filter((s) => !disabled.includes(s));
}

// --- מצב תצוגה בתרגילים: לפי סדר קבוע (בלי לחזור על משפט פעמיים באותו סבב), או רנדומלי
// (הגרלה בלתי-תלויה בכל פעם, יכולה לחזור על אותו משפט באותו סבב) ---
function loadBankPickModes() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.bankPickModes)) || {};
  } catch (e) {
    return {};
  }
}

function saveBankPickModes(all) {
  safeSetItem(STORE_KEYS.bankPickModes, JSON.stringify(all));
}

function getBankPickMode(bankId) {
  const all = loadBankPickModes();
  return all[bankId] === "sequential" ? "sequential" : "random";
}

function setBankPickMode(bankId, mode) {
  const all = loadBankPickModes();
  all[bankId] = mode;
  saveBankPickModes(all);
}

function loadBankCursors() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.bankCursors)) || {};
  } catch (e) {
    return {};
  }
}

function saveBankCursors(all) {
  safeSetItem(STORE_KEYS.bankCursors, JSON.stringify(all));
}

// בוחרת count אינדקסים מתוך הבנק הפעיל (getEnabledQuoteBank), לפי מצב התצוגה שנבחר לבנק הזה.
// מחזירה אינדקסים (לא טקסטים) - כדי לשמור על אותו פורמט אחסון בדיוק כמו קודם (data.selected /
// data.sentenceIdx ביומן ממשיכים להיות אינדקסים לתוך הבנק, בלי לשנות איך תיעודי עבר נקראים)
function pickIndicesFromBank(bankId, count) {
  const bank = getEnabledQuoteBank(bankId);
  if (!bank.length) return [];
  const n = Math.min(count, bank.length);
  if (getBankPickMode(bankId) === "sequential") {
    const cursors = loadBankCursors();
    const start = cursors[bankId] || 0;
    const picked = [];
    for (let i = 0; i < n; i++) picked.push((start + i) % bank.length);
    cursors[bankId] = (start + n) % bank.length;
    saveBankCursors(cursors);
    return picked;
  }
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(Math.floor(Math.random() * bank.length));
  return picked;
}
