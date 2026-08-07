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
