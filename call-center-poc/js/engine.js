/* ===================================================================
   Engine - מנוע האוטומציות. מחליט מתי לדלוק חוק, בהתאם למצב השיחה
   (session) ולדגלי enabled/scope החיים ב-Store (כדי שכיבוי חוק
   בתצוגת המנהל אכן יעצור אותו כאן, בזמן אמת).
   כל בדיקה ממוקדת בתרחיש קונקרטי אחד מהדוגמאות של ג'אפן - זהו מנוע
   פרגמטי ל-POC, לא פותר-תנאים גנרי.
=================================================================== */

const Engine = (function () {

  function scopeMatches(rule, restaurantId, branchId) {
    if (rule.scope.branchId) return rule.scope.branchId === branchId;
    if (rule.scope.restaurantId) return rule.scope.restaurantId === restaurantId;
    return false;
  }

  function activeRule(id, restaurantId, branchId) {
    const rule = Store.getRule(id);
    if (!rule || rule.enabled === false) return null;
    if (!scopeMatches(rule, restaurantId, branchId)) return null;
    return rule;
  }

  /* נקרא אחרי מענה על שאלות תזמון/משלוח-איסוף/שעת-משלוח */
  function checkAfterAnswer(session) {
    const { restaurantId, branchId, answers } = session;

    const futureRule = activeRule('rule-pt-future-delivery', restaurantId, branchId);
    if (futureRule && answers.timing === 'עתידי' && answers.fulfillment === 'משלוח') {
      return { rule: futureRule };
    }

    const busyRule = activeRule('rule-goh-busy-slot', restaurantId, branchId);
    if (busyRule && answers.timeSlot === branchLookupBusySlot(branchId)) {
      return { rule: busyRule };
    }

    return null;
  }

  function branchLookupBusySlot(branchId) {
    const found = Store.findBranchById(branchId);
    return found ? found.branch.busySlot : null;
  }

  /* נקרא כשמנסים להוסיף פריט לעגלה */
  function checkOnAddToCart(session, item) {
    if (item.special !== 'party-tray') return null;
    const { restaurantId, branchId, answers } = session;

    const memberRule = activeRule('rule-japan-party-tray-member-card', restaurantId, branchId);
    if (memberRule && answers.memberCard === 'כן') {
      return { type: 'block-member-card', rule: memberRule };
    }

    const fishRule = activeRule('rule-japan-party-tray-fish', restaurantId, branchId);
    if (fishRule) {
      return { type: 'guided-fish', rule: fishRule };
    }

    return null;
  }

  function tunaReminderRule(session) {
    return activeRule('rule-japan-party-tray-tuna', session.restaurantId, session.branchId);
  }

  /* נקרא אחרי כל שינוי בעגלה */
  function checkMinOrder(session, total) {
    if (session._minOrderDismissed) return null;
    if (session.answers.fulfillment !== 'משלוח') return null;

    const found = Store.findBranchById(session.branchId);
    if (!found || !found.branch.minOrderDelivery) return null;

    const rule = activeRule('rule-pt-min-order', session.restaurantId, session.branchId);
    if (!rule) return null;

    const gap = found.branch.minOrderDelivery - total;
    if (gap > 0 && gap <= 40) {
      return { rule, gap, min: found.branch.minOrderDelivery };
    }
    return null;
  }

  return { checkAfterAnswer, checkOnAddToCart, tunaReminderRule, checkMinOrder, activeRule };
})();
