/* ===================================================================
   Store - "מצב המנהל" החי. עותק נטען מ-localStorage (או משוכפל מ-
   DEFAULT_DATA בפעם הראשונה), כדי שעריכות בתצוגת מנהל (סדר מסכים,
   בניית בלוקים, הפעלה/כיבוי חוקים, זמינות מרכיבים) ישפיעו מיד על
   תצוגת הנציגה, וישרדו רענון דף. כפתור "איפוס דמו" מחזיר הכול למצב
   ההתחלתי.
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

  function newId(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }

  function getRestaurant(id) { return data.restaurants.find(r => r.id === id) || null; }

  function findBranchById(branchId) {
    for (const r of data.restaurants) {
      const b = (r.branches || []).find(x => x.id === branchId);
      if (b) return { restaurant: r, branch: b };
    }
    return null;
  }

  function getScreen(branchId, screenId) {
    const found = findBranchById(branchId);
    if (!found) return null;
    return found.branch.flow.find(s => s.id === screenId) || null;
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

  function updateScreenTitle(branchId, screenId, title) {
    const s = getScreen(branchId, screenId);
    if (s) { s.title = title; save(); }
  }

  function setScreenEnabled(branchId, screenId, enabled) {
    const s = getScreen(branchId, screenId);
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

  /* ---------------- בלוקים בתוך מסך (blocks לשאלות, leadingBlocks לתפריט/תשלום/סיכום) ---------------- */

  function blockList(screen, listKey) {
    if (!screen[listKey]) screen[listKey] = [];
    return screen[listKey];
  }

  function addBlock(branchId, screenId, listKey, block, atIndex) {
    const s = getScreen(branchId, screenId);
    if (!s) return null;
    const list = blockList(s, listKey);
    const full = Object.assign({ id: newId('blk') }, block);
    if (atIndex === undefined || atIndex < 0 || atIndex > list.length) list.push(full);
    else list.splice(atIndex, 0, full);
    save();
    return full.id;
  }

  function removeBlock(branchId, screenId, listKey, blockId) {
    const s = getScreen(branchId, screenId);
    if (!s) return;
    const list = blockList(s, listKey);
    const idx = list.findIndex(b => b.id === blockId);
    if (idx > -1) { list.splice(idx, 1); save(); }
  }

  function updateBlock(branchId, screenId, listKey, blockId, patch) {
    const s = getScreen(branchId, screenId);
    if (!s) return;
    const list = blockList(s, listKey);
    const b = list.find(x => x.id === blockId);
    if (b) { Object.assign(b, patch); save(); }
  }

  function moveBlock(branchId, screenId, listKey, blockId, direction) {
    const s = getScreen(branchId, screenId);
    if (!s) return;
    const list = blockList(s, listKey);
    const idx = list.findIndex(b => b.id === blockId);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[newIdx];
    list[newIdx] = tmp;
    save();
  }

  function reorderBlockTo(branchId, screenId, listKey, blockId, newIndex) {
    const s = getScreen(branchId, screenId);
    if (!s) return;
    const list = blockList(s, listKey);
    const idx = list.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    const [item] = list.splice(idx, 1);
    const clampedIndex = Math.max(0, Math.min(newIndex, list.length));
    list.splice(clampedIndex, 0, item);
    save();
  }

  /* ---------------- מרכיבים (ברמת מסעדה) ---------------- */

  function getIngredients(restaurantId) {
    const r = getRestaurant(restaurantId);
    return (r && r.ingredients) || [];
  }

  function getIngredient(restaurantId, ingredientId) {
    return getIngredients(restaurantId).find(i => i.id === ingredientId) || null;
  }

  function addIngredient(restaurantId, name) {
    const r = getRestaurant(restaurantId);
    if (!r) return;
    if (!r.ingredients) r.ingredients = [];
    r.ingredients.push({ id: newId('ing'), name: name, available: true });
    save();
  }

  function removeIngredient(restaurantId, ingredientId) {
    const r = getRestaurant(restaurantId);
    if (!r || !r.ingredients) return;
    r.ingredients = r.ingredients.filter(i => i.id !== ingredientId);
    save();
  }

  function setIngredientAvailable(restaurantId, ingredientId, available) {
    const ing = getIngredient(restaurantId, ingredientId);
    if (ing) { ing.available = available; save(); }
  }

  function knownCustomerByPhone(phone) {
    return data.knownCustomers.find(c => c.phone === phone) || null;
  }

  return {
    get data() { return data; },
    save, reset,
    getRestaurant, findBranchById, getScreen, getActiveFlow,
    getMenuItem, getMenuItemsByCategory,
    getRule, getRulesForScope, setRuleEnabled, updateRuleMessage,
    updateScreenTitle, setScreenEnabled, moveScreen,
    addBlock, removeBlock, updateBlock, moveBlock, reorderBlockTo,
    getIngredients, getIngredient, addIngredient, removeIngredient, setIngredientAvailable,
    knownCustomerByPhone
  };
})();
