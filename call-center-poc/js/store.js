/* ===================================================================
   Store - "מצב המנהל" החי. עותק נטען מ-localStorage (או משוכפל מ-
   DEFAULT_DATA בפעם הראשונה), כדי שעריכות בתצוגת מנהל (סדר מסכים,
   הפעלה/כיבוי חוקים, עריכת טקסטים) ישפיעו מיד על תצוגת הנציגה,
   וישרדו רענון דף. כפתור "איפוס דמו" מחזיר הכול למצב ההתחלתי.
=================================================================== */

const Store = (function () {
  const STORAGE_KEY = 'ccpoc_data_v1';

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage לא זמין - נמשיך עם ברירת המחדל */ }
    return deepClone(DEFAULT_DATA);
  }

  let data = load();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* מתעלמים - הדמו ימשיך לעבוד בזיכרון */ }
  }

  function reset() {
    data = deepClone(DEFAULT_DATA);
    save();
  }

  function getRestaurant(id) { return data.restaurants.find(r => r.id === id) || null; }

  function findBranchById(branchId) {
    for (const r of data.restaurants) {
      const b = (r.branches || []).find(x => x.id === branchId);
      if (b) return { restaurant: r, branch: b };
    }
    return null;
  }

  function getActiveFlow(branch) {
    return branch.flow.filter(s => s.enabled !== false);
  }

  function getMenuItem(id) { return data.menuItems.find(m => m.id === id) || null; }

  function getMenuItemsByCategory(categoryIds) {
    return data.menuItems.filter(m => categoryIds.indexOf(m.categoryId) > -1);
  }

  function getRule(id) { return data.rules.find(r => r.id === id) || null; }

  function getRulesForScope(restaurantId, branchId) {
    return data.rules.filter(r => {
      if (r.scope.branchId) return r.scope.branchId === branchId;
      if (r.scope.restaurantId) return r.scope.restaurantId === restaurantId;
      return false;
    });
  }

  function setRuleEnabled(id, enabled) {
    const r = getRule(id);
    if (r) { r.enabled = enabled; save(); }
  }

  function updateRuleMessage(id, message) {
    const r = getRule(id);
    if (r) { r.message = message; save(); }
  }

  function updateScreenLabel(branchId, screenId, label) {
    const found = findBranchById(branchId);
    if (!found) return;
    const s = found.branch.flow.find(sc => sc.id === screenId);
    if (s) { s.label = label; save(); }
  }

  function setScreenEnabled(branchId, screenId, enabled) {
    const found = findBranchById(branchId);
    if (!found) return;
    const s = found.branch.flow.find(sc => sc.id === screenId);
    if (s) { s.enabled = enabled; save(); }
  }

  function moveScreen(branchId, screenId, direction) {
    const found = findBranchById(branchId);
    if (!found) return;
    const flow = found.branch.flow;
    const idx = flow.findIndex(s => s.id === screenId);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= flow.length) return;
    const tmp = flow[idx];
    flow[idx] = flow[newIdx];
    flow[newIdx] = tmp;
    save();
  }

  function knownCustomerByPhone(phone) {
    return data.knownCustomers.find(c => c.phone === phone) || null;
  }

  return {
    get data() { return data; },
    save, reset,
    getRestaurant, findBranchById, getActiveFlow,
    getMenuItem, getMenuItemsByCategory,
    getRule, getRulesForScope, setRuleEnabled, updateRuleMessage,
    updateScreenLabel, setScreenEnabled, moveScreen,
    knownCustomerByPhone
  };
})();
