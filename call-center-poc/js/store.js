/* ===================================================================
   Store - "מצב המנהל" החי. עותק נטען מ-localStorage (או משוכפל מ-
   DEFAULT_DATA בפעם הראשונה), כדי שעריכות בתצוגת מנהל (סדר מסכים,
   בניית בלוקים, הפעלה/כיבוי חוקים, זמינות מרכיבים) ישפיעו מיד על
   תצוגת הנציגה, וישרדו רענון דף. כפתור "איפוס דמו" מחזיר הכול למצב
   ההתחלתי.

   גרסת סכימה: אם ב-localStorage נמצא עותק שנשמר מגרסה קודמת של
   מבנה הנתונים (לדוגמה סבב-בדיקה קודם, לפני שנוספו blocks/blockLibrary
   או מרכיבים ברמת סניף) - הוא מתעלם ממנו וטוען מחדש את ברירת המחדל,
   כדי שדפדפן עם נתונים ישנים לא "יקרוס בשקט" על שדות שעדיין לא קיימים.
=================================================================== */

const Store = (function () {
  const STORAGE_KEY = 'ccpoc_data_v1';

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed._schemaVersion === SCHEMA_VERSION) return parsed;
      }
    } catch (e) { /* localStorage לא זמין/פגום - נמשיך עם ברירת המחדל */ }
    const fresh = deepClone(DEFAULT_DATA);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch (e) { /* מתעלמים */ }
    return fresh;
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
    if (atIndex === undefined || atIndex === null || atIndex < 0 || atIndex > list.length) list.push(full);
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

  /* ---------------- מרכיבים: קטלוג ברמת מסעדה, זמינות ברמת סניף ---------------- */

  function getIngredientCatalog(restaurantId) {
    const r = getRestaurant(restaurantId);
    return (r && r.ingredients) || [];
  }

  function getIngredient(restaurantId, ingredientId) {
    return getIngredientCatalog(restaurantId).find(i => i.id === ingredientId) || null;
  }

  function addIngredient(restaurantId, name) {
    const r = getRestaurant(restaurantId);
    if (!r) return;
    if (!r.ingredients) r.ingredients = [];
    r.ingredients.push({ id: newId('ing'), name: name });
    save();
  }

  function removeIngredient(restaurantId, ingredientId) {
    const r = getRestaurant(restaurantId);
    if (!r || !r.ingredients) return;
    r.ingredients = r.ingredients.filter(i => i.id !== ingredientId);
    (r.branches || []).forEach(b => {
      if (b.unavailableIngredientIds) b.unavailableIngredientIds = b.unavailableIngredientIds.filter(id => id !== ingredientId);
    });
    save();
  }

  function isIngredientAvailableAtBranch(branchId, ingredientId) {
    const found = findBranchById(branchId);
    if (!found) return true;
    const list = found.branch.unavailableIngredientIds || [];
    return list.indexOf(ingredientId) === -1;
  }

  function setIngredientAvailableAtBranch(branchId, ingredientId, available) {
    const found = findBranchById(branchId);
    if (!found) return;
    if (!found.branch.unavailableIngredientIds) found.branch.unavailableIngredientIds = [];
    const list = found.branch.unavailableIngredientIds;
    const idx = list.indexOf(ingredientId);
    if (available && idx > -1) list.splice(idx, 1);
    if (!available && idx === -1) list.push(ingredientId);
    save();
  }

  /* ---------------- אזורי משלוח (ברמת סניף) ---------------- */

  function getDeliveryZones(branchId) {
    const found = findBranchById(branchId);
    return (found && found.branch.deliveryZones) || [];
  }

  function getDeliveryZone(branchId, zoneId) {
    return getDeliveryZones(branchId).find(z => z.id === zoneId) || null;
  }

  function addDeliveryZone(branchId, zone) {
    const found = findBranchById(branchId);
    if (!found) return null;
    if (!found.branch.deliveryZones) found.branch.deliveryZones = [];
    const full = Object.assign({ id: newId('zone'), name: 'אזור חדש', minOrder: 0, deliveryFee: 0, waitMin: 45, waitMax: 60 }, zone);
    found.branch.deliveryZones.push(full);
    save();
    return full.id;
  }

  function updateDeliveryZone(branchId, zoneId, patch) {
    const zone = getDeliveryZone(branchId, zoneId);
    if (zone) { Object.assign(zone, patch); save(); }
  }

  function removeDeliveryZone(branchId, zoneId) {
    const found = findBranchById(branchId);
    if (!found || !found.branch.deliveryZones) return;
    found.branch.deliveryZones = found.branch.deliveryZones.filter(z => z.id !== zoneId);
    save();
  }

  /* ---------------- פרטי סניף (כתובת/שעות/כשרות) ---------------- */

  function updateBranchInfo(branchId, patch) {
    const found = findBranchById(branchId);
    if (!found) return;
    Object.assign(found.branch, patch);
    save();
  }

  /* ---------------- קטגוריות תפריט (לשוניות) ברמת מסעדה ---------------- */

  function getRestaurantCategories(restaurantId) {
    const r = getRestaurant(restaurantId);
    if (!r) return [];
    const ids = r.menuCategoryIds || [];
    return ids.map(id => data.menuCategories.find(c => c.id === id)).filter(Boolean);
  }

  function addCategoryToRestaurant(restaurantId, categoryId) {
    const r = getRestaurant(restaurantId);
    if (!r) return;
    if (!r.menuCategoryIds) r.menuCategoryIds = [];
    if (r.menuCategoryIds.indexOf(categoryId) === -1) r.menuCategoryIds.push(categoryId);
    save();
  }

  function createAndAddCategory(restaurantId, name) {
    const id = newId('cat');
    data.menuCategories.push({ id, name });
    addCategoryToRestaurant(restaurantId, id);
    return id;
  }

  function removeCategoryFromRestaurant(restaurantId, categoryId) {
    const r = getRestaurant(restaurantId);
    if (!r || !r.menuCategoryIds) return;
    r.menuCategoryIds = r.menuCategoryIds.filter(id => id !== categoryId);
    save();
  }

  function moveCategoryInRestaurant(restaurantId, categoryId, direction) {
    const r = getRestaurant(restaurantId);
    if (!r || !r.menuCategoryIds) return;
    const idx = r.menuCategoryIds.indexOf(categoryId);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= r.menuCategoryIds.length) return;
    const tmp = r.menuCategoryIds[idx];
    r.menuCategoryIds[idx] = r.menuCategoryIds[newIdx];
    r.menuCategoryIds[newIdx] = tmp;
    save();
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
    getIngredientCatalog, getIngredient, addIngredient, removeIngredient,
    isIngredientAvailableAtBranch, setIngredientAvailableAtBranch,
    getDeliveryZones, getDeliveryZone, addDeliveryZone, updateDeliveryZone, removeDeliveryZone,
    updateBranchInfo,
    getRestaurantCategories, addCategoryToRestaurant, createAndAddCategory, removeCategoryFromRestaurant, moveCategoryInRestaurant,
    knownCustomerByPhone
  };
})();
