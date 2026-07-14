// מודול תשלומים - מעקב חוב מול סיכומי פגישות שלא סומנו כ"שולם"
// תעריף קבוע לפגישה, יתרת זכות (pool) שנצברת מתשלומים שנרשמים ידנית ומסלקת אוטומטית את הפגישות הישנות ביותר

const SESSION_RATE = 400;

function loadPaymentLedger() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEYS.paymentLedger)) || { pool: 0, log: [] };
  } catch (e) {
    return { pool: 0, log: [] };
  }
}

function savePaymentLedger(ledger) {
  localStorage.setItem(STORE_KEYS.paymentLedger, JSON.stringify(ledger));
}

// פגישות שלא שולמו, מהישנה לחדשה - כדי לסלק קודם את החוב הוותיק ביותר
function getUnpaidSummariesSorted() {
  return loadSummaries()
    .filter((s) => !s.paid)
    .sort((a, b) => (a.sessionDate || "").localeCompare(b.sessionDate || "") || a.createdAt - b.createdAt);
}

function computeDebtSummary() {
  const unpaid = getUnpaidSummariesSorted();
  const ledger = loadPaymentLedger();
  const totalOwed = unpaid.length * SESSION_RATE;
  const debt = Math.max(0, totalOwed - ledger.pool);
  return { unpaidCount: unpaid.length, rate: SESSION_RATE, totalOwed, pool: ledger.pool, debt };
}

// כל עוד יש ביתרה מספיק כדי לכסות פגישה שלמה, מסמנים את הפגישה הלא-משולמת הוותיקה ביותר כשולמה
function reconcileAutoSettle() {
  const ledger = loadPaymentLedger();
  const summaries = loadSummaries();
  let changed = false;

  while (ledger.pool >= SESSION_RATE) {
    const unpaid = summaries
      .filter((s) => !s.paid)
      .sort((a, b) => (a.sessionDate || "").localeCompare(b.sessionDate || "") || a.createdAt - b.createdAt);
    if (unpaid.length === 0) break;
    const oldest = unpaid[0];
    oldest.paid = true;
    oldest.updatedAt = Date.now();
    ledger.pool -= SESSION_RATE;
    changed = true;
  }

  if (changed) saveSummaries(summaries);
  savePaymentLedger(ledger);
}

// רישום תשלום ידני - מצטרף ליתרת הזכות, ומיד מנסה לסלק פגישות ישנות באופן אוטומטי
function logPayment(amount) {
  const ledger = loadPaymentLedger();
  ledger.pool += amount;
  ledger.log.push({ id: "pay_" + Date.now(), amount, timestamp: Date.now() });
  savePaymentLedger(ledger);
  reconcileAutoSettle();
}

function deletePaymentLogEntry(id) {
  const ledger = loadPaymentLedger();
  const idx = ledger.log.findIndex((e) => e.id === id);
  if (idx === -1) return;
  ledger.pool = Math.max(0, ledger.pool - ledger.log[idx].amount);
  ledger.log.splice(idx, 1);
  savePaymentLedger(ledger);
}

// סימון ידני של פגישה כ"שולם" (לא דרך הסילוק האוטומטי) - סופג עד תעריף שיעור אחד מתוך יתרת הזכות הקיימת
function onSessionMarkedPaidManually() {
  const ledger = loadPaymentLedger();
  const consumed = Math.min(ledger.pool, SESSION_RATE);
  ledger.pool -= consumed;
  savePaymentLedger(ledger);
}
