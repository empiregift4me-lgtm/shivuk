/* ===================================================================
   Summary - הפקת טקסט חופשי מובנה מהזמנה שהושלמה, להעתקה מהירה.
=================================================================== */

const Summary = (function () {

  function paymentLabel(method) {
    const map = { cash: 'מזומן', credit: 'אשראי', bit: 'ביט', member: 'כרטיס חבר', sibus: 'תלוש/סיבוס' };
    return map[method] || method || '-';
  }

  function buildText(ctx) {
    const branch = ctx.branch;
    const answers = ctx.answers;
    const cart = ctx.cart;
    const payment = ctx.payment;
    const lines = [];

    lines.push(`=== סיכום הזמנה - ${branch.name} ===`);
    lines.push(`טלפון: ${answers.phone || '-'}`);
    lines.push(`שם מלא: ${answers.fullName || '-'}`);

    const isFuture = answers.timing === 'עתידי' || answers.timing === 'ליותר מאוחר';
    lines.push(`מועד: ${isFuture ? ('עתידית' + (answers.timeSlot ? ' לשעה ' + answers.timeSlot : '')) : 'עכשיו'}`);

    if (answers.fulfillment === 'משלוח') {
      lines.push(`אופן קבלה: משלוח לכתובת - ${answers.address || answers.addressOrPickup || '-'}`);
    } else if (answers.fulfillment === 'איסוף') {
      lines.push(`אופן קבלה: איסוף עצמי מסניף ${branch.shortName}`);
    }

    if (answers.memberCard) lines.push(`תשלום בכרטיס חבר: ${answers.memberCard}`);

    lines.push('');
    lines.push('--- פריטים ---');
    let total = 0;
    if (!cart.length) {
      lines.push('(לא נבחרו פריטים)');
    }
    cart.forEach(line => {
      const item = Store.getMenuItem(line.itemId);
      if (!item) return;
      const sub = item.price * line.qty;
      total += sub;
      const note = line.note ? ` [דגים ${line.note}]` : '';
      lines.push(`${line.qty} x ${item.name}${note} - ${sub} ₪`);
    });

    lines.push('');
    lines.push(`סה"כ לתשלום: ${total} ₪`);
    lines.push('');

    let paymentLine = `אמצעי תשלום: ${paymentLabel(payment.method)}`;
    if (payment.split && payment.splitMethod) {
      paymentLine += ` + ${paymentLabel(payment.splitMethod)}${payment.splitAmount ? ' (' + payment.splitAmount + ' ₪)' : ''}`;
    }
    lines.push(paymentLine);

    if (ctx.notesLog && ctx.notesLog.length) {
      lines.push('');
      lines.push('--- הערות/תזכורות שהוצגו לנציגה במהלך השיחה ---');
      ctx.notesLog.forEach(n => lines.push('• ' + n));
    }

    lines.push('==========================');
    return lines.join('\n');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  return { buildText, copyToClipboard, paymentLabel };
})();
