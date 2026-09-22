/* ===================================================================
   AgentView - תצוגת הנציגה (מוקד). זרימת מסך-אחר-מסך לפי flow
   הענף הנבחר, עם הפעלת Engine אחרי כל תשובה/הוספה לעגלה.
   קורא את מבנה הזרימה מ-Store בכל רינדור, כך שעריכה בתצוגת המנהל
   (סדר מסכים, הפעלה/כיבוי, טקסטים) משפיעה מיד גם כאן.
=================================================================== */

const AgentView = (function () {
  let session = null;
  let currentScreenIndex = 0;
  let menuFilterState = { search: '', tag: null, priceBracket: 'all', justAutoSet: false };
  let mountedRoot = null;

  const PRICE_BRACKETS = [
    { id: 'all', label: 'כל המחירים', min: 0, max: Infinity },
    { id: 'b1', label: 'עד 20 ₪', min: 0, max: 20 },
    { id: 'b2', label: '20-40 ₪', min: 20, max: 40 },
    { id: 'b3', label: '40-100 ₪', min: 40, max: 100 },
    { id: 'b4', label: '100 ₪ ומעלה', min: 100, max: Infinity }
  ];

  function escapeAttr(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function mount(root) {
    mountedRoot = root;
    renderInternal();
  }

  function renderInternal() {
    if (!mountedRoot) return;
    if (!session) { renderPicker(mountedRoot); return; }
    const found = Store.findBranchById(session.branchId);
    if (!found) { session = null; renderPicker(mountedRoot); return; }
    const branch = found.branch;
    const flow = Store.getActiveFlow(branch);
    if (!flow.length) { mountedRoot.innerHTML = '<p class="admin-empty-note">לא הוגדרו מסכים פעילים לסניף זה.</p>'; return; }
    if (currentScreenIndex >= flow.length) currentScreenIndex = flow.length - 1;
    const screen = flow[currentScreenIndex];

    if (screen.type === 'question') renderQuestionScreen(mountedRoot, branch, screen);
    else if (screen.type === 'menu') renderMenuScreen(mountedRoot, branch, screen);
    else if (screen.type === 'payment') renderPaymentScreen(mountedRoot, branch, screen);
    else if (screen.type === 'summary') renderSummaryScreen(mountedRoot, branch, screen);
  }

  /* ---------------- picker ---------------- */

  function renderPicker(root) {
    const restaurants = Store.data.restaurants;
    root.innerHTML = `
      <h2 class="section-heading">בחירת מסעדה וסניף</h2>
      <p class="section-sub">לקוח מתקשר · לוחצים על הסניף המתאים כדי להתחיל את תסריט ההזמנה שהוגדר עבורו.</p>
      <div class="picker-grid" id="picker-grid"></div>
    `;
    const grid = root.querySelector('#picker-grid');
    restaurants.forEach(r => {
      if (r.active) {
        r.branches.forEach(b => {
          const card = document.createElement('div');
          card.className = 'picker-card';
          card.innerHTML = `
            <div class="picker-card-badges">${r.kinds.map(k => `<span class="type-badge kind-${k}">${k}</span>`).join('')}</div>
            <div class="picker-card-title">${b.name}</div>
            <div class="picker-card-sub">${b.address}</div>
          `;
          card.addEventListener('click', () => startCall(r.id, b.id));
          grid.appendChild(card);
        });
      } else {
        const card = document.createElement('div');
        card.className = 'picker-card is-disabled';
        card.innerHTML = `
          <div class="picker-card-badges">${r.kinds.map(k => `<span class="type-badge kind-${k}">${k}</span>`).join('')}</div>
          <div class="picker-card-title">${r.name}</div>
          <div class="picker-card-note">${r.note || 'לא פעיל בהדגמה זו'}</div>
        `;
        grid.appendChild(card);
      }
    });
  }

  function startCall(restaurantId, branchId) {
    session = {
      restaurantId, branchId,
      answers: {},
      cart: [],
      payment: { method: null, split: false, splitMethod: null, splitAmount: null },
      notesLog: [],
      _minOrderDismissed: false,
      _shownScripts: {}
    };
    currentScreenIndex = 0;
    menuFilterState = { search: '', tag: null, priceBracket: 'all', justAutoSet: false };
    renderInternal();
  }

  /* ---------------- shared header / nav ---------------- */

  function progressHTML(branch) {
    const flow = Store.getActiveFlow(branch);
    const pct = Math.round(((currentScreenIndex + 1) / flow.length) * 100);
    return `
      <div class="wizard-progress">
        <div class="wizard-progress-label">
          <span>מסך ${currentScreenIndex + 1} מתוך ${flow.length}</span>
          <button type="button" id="btn-abort-call" style="border:none;background:transparent;cursor:pointer;color:var(--text-faint);text-decoration:underline;font-size:12px;">✕ החלפת שיחה</button>
        </div>
        <div class="wizard-progress-bar"><div class="wizard-progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  function attachNavListeners(container, branch) {
    const prevBtn = container.querySelector('#btn-prev');
    const nextBtn = container.querySelector('#btn-next');
    const abortBtn = container.querySelector('#btn-abort-call');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentScreenIndex > 0) { currentScreenIndex--; renderInternal(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => goNext(branch));
    if (abortBtn) abortBtn.addEventListener('click', () => {
      if (confirm('להחליף שיחה? הפרטים שהוזנו בשיחה הנוכחית יאבדו.')) { session = null; renderInternal(); }
    });
  }

  function goNext(branch) {
    const flow = Store.getActiveFlow(branch);
    const screen = flow[currentScreenIndex];
    if (!canProceed(screen)) return;
    if (currentScreenIndex < flow.length - 1) { currentScreenIndex++; renderInternal(); }
  }

  function canProceed(screen) {
    if (screen.type === 'question') {
      if (!screen.required) return true;
      if (screen.inputType === 'dynamic-fulfillment') return !!session.answers.addressOrPickup;
      const val = session.answers[screen.key];
      return !!(val && String(val).trim());
    }
    if (screen.type === 'payment') return !!session.payment.method;
    return true;
  }

  /* ---------------- question screens ---------------- */

  function resolveQuestionLabel(screen, branch) {
    if (screen.dynamic === 'fulfillment-followup') {
      if (session.answers.fulfillment === 'משלוח') return "לאן לשלוח לך?";
      if (session.answers.fulfillment === 'איסוף') return `אז אתה מגיע לקחת מסניף ${branch.shortName}?`;
      return "פרטי משלוח / איסוף";
    }
    return screen.label;
  }

  function autofillSlotHTML(phone) {
    const known = Store.knownCustomerByPhone(phone || '');
    return known ? `<div class="autofill-strip"><span>✓ זוהה לקוח מוכר: ${known.fullName} - השם יוצע אוטומטית במסך הבא</span></div>` : '';
  }

  function renderQuestionScreen(container, branch, screen) {
    const label = resolveQuestionLabel(screen, branch);
    const currentVal = session.answers[screen.key];
    let bodyHTML = '';

    if (screen.inputType === 'tel' || screen.inputType === 'text') {
      bodyHTML = `<input class="wizard-input" id="q-input" type="${screen.inputType === 'tel' ? 'tel' : 'text'}" value="${escapeAttr(currentVal)}" placeholder="${screen.inputType === 'tel' ? '05X-XXXXXXX' : 'הקלד/י כאן...'}" autocomplete="off">`;
      if (screen.key === 'phone') bodyHTML += `<div id="autofill-slot">${autofillSlotHTML(currentVal)}</div>`;
      if (screen.key === 'fullName' && screen.autofill) {
        const known = Store.knownCustomerByPhone(session.answers.phone || '');
        if (known && !currentVal) {
          bodyHTML += `<div class="autofill-strip"><span>🔎 לקוח מוכר: ${known.fullName}</span><button type="button" class="autofill-strip-btn" id="autofill-name-btn">מילוי אוטומטי</button></div>`;
        }
      }
    } else if (screen.inputType === 'choice') {
      bodyHTML = `<div class="wizard-choice-row">${screen.options.map(o => `<button type="button" class="choice-btn ${currentVal === o ? 'is-selected' : ''}" data-value="${o}">${o}</button>`).join('')}</div>`;
    } else if (screen.inputType === 'timing' || screen.inputType === 'timing-gate') {
      bodyHTML = `<div class="wizard-choice-row">${screen.options.map(o => `<button type="button" class="choice-btn ${currentVal === o ? 'is-selected' : ''}" data-value="${o}">${o}</button>`).join('')}</div>`;
      if (screen.inputType === 'timing' && currentVal === 'ליותר מאוחר') {
        const slots = ['17:30', '18:00', '18:30', '19:00'];
        bodyHTML += `<div class="slot-row">${slots.map(s => `<button type="button" class="slot-btn ${session.answers.timeSlot === s ? 'is-selected' : ''} ${s === branch.busySlot ? 'is-busy' : ''}" data-slot="${s}">🕓 ${s}</button>`).join('')}</div>`;
      }
    } else if (screen.inputType === 'dynamic-fulfillment') {
      if (session.answers.fulfillment === 'משלוח') {
        bodyHTML = `<input class="wizard-input" id="q-input" type="text" value="${escapeAttr(currentVal)}" placeholder="לדוגמה: רחוב הרצל 10, כניסה ב׳, קומה 2" autocomplete="off">`;
      } else if (session.answers.fulfillment === 'איסוף') {
        bodyHTML = `<button type="button" class="choice-btn ${currentVal ? 'is-selected' : ''}" data-value="${escapeAttr(branch.shortName)}" style="width:100%;">כן, מגיע/ה לקחת מסניף ${branch.shortName}</button>`;
      } else {
        bodyHTML = `<p style="color:var(--text-muted);font-size:13.5px;">יש לענות קודם על שאלת המשלוח/איסוף.</p>`;
      }
    }

    container.innerHTML = `
      <div class="wizard">
        ${progressHTML(branch)}
        <div class="wizard-card">
          <span class="wizard-branch-tag">${branch.name}</span>
          <div class="wizard-question-label">${label}</div>
          ${bodyHTML}
          <div class="wizard-nav">
            <button class="btn btn-secondary" id="btn-prev" type="button" ${currentScreenIndex === 0 ? 'disabled' : ''}>→ הקודם</button>
            <button class="btn btn-primary" id="btn-next" type="button" ${canProceed(screen) ? '' : 'disabled'}>המשך →</button>
          </div>
        </div>
      </div>
    `;

    const qInput = container.querySelector('#q-input');
    if (qInput) {
      qInput.addEventListener('input', (e) => {
        session.answers[screen.key] = e.target.value;
        const nextBtn = container.querySelector('#btn-next');
        if (nextBtn) nextBtn.disabled = !canProceed(screen);
        if (screen.key === 'phone') {
          const slot = container.querySelector('#autofill-slot');
          if (slot) slot.innerHTML = autofillSlotHTML(e.target.value);
        }
      });
      qInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && canProceed(screen)) goNext(branch);
      });
    }

    const autofillNameBtn = container.querySelector('#autofill-name-btn');
    if (autofillNameBtn) autofillNameBtn.addEventListener('click', () => {
      const known = Store.knownCustomerByPhone(session.answers.phone || '');
      if (known) { session.answers.fullName = known.fullName; renderInternal(); }
    });

    container.querySelectorAll('.choice-btn[data-value]').forEach(btn => {
      btn.addEventListener('click', () => {
        session.answers[screen.key] = btn.dataset.value;
        if (['timing', 'fulfillment', 'timeSlot'].indexOf(screen.key) > -1) {
          const check = Engine.checkAfterAnswer(session);
          if (check) { showRuleFromCheck(check); return; }
        }
        renderInternal();
      });
    });

    container.querySelectorAll('.slot-btn[data-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        session.answers.timeSlot = btn.dataset.slot;
        const check = Engine.checkAfterAnswer(session);
        if (check) { showRuleFromCheck(check); return; }
        renderInternal();
      });
    });

    attachNavListeners(container, branch);
  }

  function showRuleFromCheck(check) {
    const rule = check.rule;
    const fn = rule.kind === 'blocking' ? Popups.blocking : Popups.reminder;
    fn({
      title: rule.name,
      message: rule.message,
      buttons: rule.buttons.map(b => ({
        label: b.label,
        onClick: () => {
          logNote(`${rule.message} ← נבחר: "${b.label}"`);
          performRuleAction(b.action);
          renderInternal();
        }
      }))
    });
  }

  function performRuleAction(action) {
    if (!action || action === 'dismiss' || action === 'removeFromCart') return;
    if (action === 'cancelOrder') { showToast('ההזמנה בוטלה', 'danger'); session = null; return; }
    if (action.indexOf('set:') === 0) {
      const parts = action.slice(4).split('=');
      session.answers[parts[0]] = parts[1];
    }
  }

  function logNote(text) { if (session) session.notesLog.push(text); }

  /* ---------------- menu screen ---------------- */

  function computeFilteredItems(screen) {
    const items = Store.getMenuItemsByCategory(screen.categoryFilter);
    const bracket = PRICE_BRACKETS.find(b => b.id === menuFilterState.priceBracket) || PRICE_BRACKETS[0];
    return items.filter(it => {
      if (menuFilterState.search && menuFilterState.search.trim()) {
        const q = menuFilterState.search.trim();
        if (!(it.name.indexOf(q) > -1 || it.tags.some(t => t.indexOf(q) > -1))) return false;
      }
      if (menuFilterState.tag && it.tags.indexOf(menuFilterState.tag) === -1) return false;
      if (it.price < bracket.min || it.price >= bracket.max) return false;
      return true;
    });
  }

  function itemCardHTML(it) {
    const line = session.cart.find(l => l.itemId === it.id);
    const qty = line ? line.qty : 0;
    const emoji = it.categoryId === 'drinks' ? '🥤' : it.categoryId === 'sides' ? '🥗' : it.categoryId === 'party' ? '🎉' : '🍣';
    return `
      <div class="item-card">
        <div class="item-image-placeholder">${emoji}<span class="item-image-placeholder-label">תמונה תתווסף</span></div>
        <div class="item-body">
          <div class="item-name">${it.name}</div>
          ${it.tags.length ? `<div class="item-tags">${it.tags.map(t => `<span class="item-tag">${t}</span>`).join('')}</div>` : ''}
          ${line && line.note ? `<span class="item-note-tag">דגים ${line.note}</span>` : ''}
          <div class="item-foot">
            <span class="item-price">${it.price} ₪</span>
            ${qty > 0
              ? `<div class="qty-stepper"><button type="button" class="qty-btn" data-action="dec" data-item="${it.id}">−</button><span class="qty-value">${qty}</span><button type="button" class="qty-btn" data-action="inc" data-item="${it.id}">+</button></div>`
              : `<button type="button" class="add-btn" data-action="add" data-item="${it.id}">הוספה +</button>`}
          </div>
        </div>
      </div>`;
  }

  function tagChipsHTML(allTags) {
    return allTags.map(t => `<button type="button" class="tag-chip ${menuFilterState.tag === t ? 'is-active' : ''}" data-tag="${t}">${t}</button>`).join('');
  }

  function refreshMenuGrid(container, screen) {
    const grid = container.querySelector('#menu-grid');
    if (!grid) return;
    const filtered = computeFilteredItems(screen);
    grid.innerHTML = filtered.map(itemCardHTML).join('') || '<p style="color:var(--text-muted);font-size:13px;grid-column:1/-1;">לא נמצאו פריטים תואמים.</p>';
  }

  function renderMenuScreen(container, branch, screen) {
    if (screen.entryScript && !session._shownScripts[screen.id]) {
      session._shownScripts[screen.id] = true;
      Popups.reminder({ title: 'תסריט לנציגה', message: screen.entryScript, buttons: [{ label: 'הבנתי, ממשיך', onClick: function () {} }] });
    }

    const items = Store.getMenuItemsByCategory(screen.categoryFilter);
    const allTags = Array.from(new Set(items.reduce((acc, it) => acc.concat(it.tags), [])));
    const total = cartTotal();
    const count = session.cart.reduce((s, l) => s + l.qty, 0);

    container.innerHTML = `
      ${progressHTML(branch)}
      <span class="wizard-branch-tag">${branch.name}</span>
      <h2 class="menu-screen-title">${screen.title}</h2>
      <div class="menu-toolbar">
        <input class="search-input" id="menu-search" type="text" placeholder="חיפוש מהיר לפי שם או תגית..." value="${escapeAttr(menuFilterState.search)}">
        <select class="price-filter-select ${menuFilterState.justAutoSet ? 'is-flash' : ''}" id="price-filter">
          ${PRICE_BRACKETS.map(b => `<option value="${b.id}" ${b.id === menuFilterState.priceBracket ? 'selected' : ''}>${b.label}</option>`).join('')}
        </select>
      </div>
      ${allTags.length ? `<div class="tag-chip-row" id="tag-chip-row">${tagChipsHTML(allTags)}</div>` : ''}
      <div class="menu-grid" id="menu-grid"></div>
      <div class="cart-bar">
        <div class="cart-bar-info">
          <span class="cart-bar-count">${count} פריטים בעגלה</span>
          <span class="cart-bar-total">סה״כ: ${total} ₪</span>
          ${branch.minOrderDelivery ? `<span class="cart-bar-min-note">מינימום למשלוח: ${branch.minOrderDelivery} ₪</span>` : ''}
        </div>
        <div class="wizard-nav-inline">
          <button class="btn btn-secondary" id="btn-prev" type="button">→ הקודם</button>
          <button class="btn btn-primary" id="btn-next" type="button">המשך →</button>
        </div>
      </div>
    `;
    menuFilterState.justAutoSet = false;
    refreshMenuGrid(container, screen);

    container.querySelector('#menu-search').addEventListener('input', (e) => {
      menuFilterState.search = e.target.value;
      refreshMenuGrid(container, screen);
    });
    container.querySelector('#price-filter').addEventListener('change', (e) => {
      menuFilterState.priceBracket = e.target.value;
      refreshMenuGrid(container, screen);
    });
    const chipRow = container.querySelector('#tag-chip-row');
    if (chipRow) chipRow.addEventListener('click', (e) => {
      const chip = e.target.closest('.tag-chip');
      if (!chip) return;
      const tag = chip.dataset.tag;
      menuFilterState.tag = menuFilterState.tag === tag ? null : tag;
      chipRow.innerHTML = tagChipsHTML(allTags);
      refreshMenuGrid(container, screen);
    });
    container.querySelector('#menu-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const item = Store.getMenuItem(btn.dataset.item);
      if (!item) return;
      if (btn.dataset.action === 'add') handleAddToCart(item, branch);
      else if (btn.dataset.action === 'inc') { changeQty(item.id, 1); afterCartChange(branch); }
      else if (btn.dataset.action === 'dec') { changeQty(item.id, -1); afterCartChange(branch); }
    });

    attachNavListeners(container, branch);
  }

  function handleAddToCart(item, branch) {
    if (item.special === 'party-tray') {
      const result = Engine.checkOnAddToCart(session, item);
      if (result && result.type === 'block-member-card') {
        Popups.blocking({
          title: result.rule.name,
          message: result.rule.message,
          buttons: result.rule.buttons.map(b => ({ label: b.label, onClick: () => { logNote(result.rule.message); renderInternal(); } }))
        });
        return;
      }
      if (result && result.type === 'guided-fish') {
        Popups.guided({
          title: result.rule.name,
          message: result.rule.message,
          buttons: result.rule.buttons.map(b => ({
            label: b.label,
            onClick: () => {
              const note = b.action.split(':')[1];
              addItemToCart(item.id, note);
              logNote(`${item.name}: נבחרו דגים ${note}.`);
              if (note === 'נאים') {
                const tunaRule = Engine.tunaReminderRule(session);
                if (tunaRule) {
                  Popups.reminder({
                    title: tunaRule.name,
                    message: tunaRule.message,
                    buttons: tunaRule.buttons.map(bb => ({ label: bb.label, onClick: () => { logNote(tunaRule.message); afterCartChange(branch); } }))
                  });
                  return;
                }
              }
              afterCartChange(branch);
            }
          }))
        });
        return;
      }
    }
    addItemToCart(item.id, null);
    afterCartChange(branch);
  }

  function addItemToCart(itemId, note) {
    const existing = session.cart.find(l => l.itemId === itemId);
    if (existing) { existing.qty += 1; if (note) existing.note = note; }
    else session.cart.push({ itemId, qty: 1, note: note || null });
  }

  function changeQty(itemId, delta) {
    const line = session.cart.find(l => l.itemId === itemId);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) session.cart = session.cart.filter(l => l.itemId !== itemId);
  }

  function cartTotal() {
    return session.cart.reduce((sum, line) => {
      const item = Store.getMenuItem(line.itemId);
      return sum + (item ? item.price * line.qty : 0);
    }, 0);
  }

  function applyPriceFilterToGap(gap) {
    const specific = PRICE_BRACKETS.slice(1); // מדלגים על "כל המחירים" - הטווח שלו תמיד "מכיל" כל פער
    const bracket = specific.find(b => gap >= b.min && gap < b.max) || specific[specific.length - 1];
    menuFilterState.priceBracket = bracket.id;
    menuFilterState.justAutoSet = true;
  }

  function afterCartChange(branch) {
    const total = cartTotal();
    const check = Engine.checkMinOrder(session, total);
    renderInternal(); // מרעננים תמיד קודם, כדי שסרגל העגלה מתחת לפופאפ יהיה מעודכן
    if (check) {
      const msg = check.rule.message.replace('{{gap}}', check.gap).replace('{{min}}', check.min);
      Popups.suggestion({
        title: check.rule.name,
        message: msg,
        buttons: [
          { label: check.rule.buttons[0].label, onClick: () => { applyPriceFilterToGap(check.gap); logNote(msg + ' ← הנציגה אישרה, הסינון עודכן אוטומטית.'); renderInternal(); } },
          { label: check.rule.buttons[1].label, onClick: () => { session._minOrderDismissed = true; renderInternal(); } }
        ]
      });
    }
  }

  /* ---------------- payment ---------------- */

  function renderPaymentScreen(container, branch, screen) {
    const total = cartTotal();
    const methods = [
      { id: 'cash', label: 'מזומן', icon: '💵' },
      { id: 'credit', label: 'אשראי', icon: '💳' },
      { id: 'bit', label: 'ביט', icon: '📱' },
      { id: 'member', label: 'כרטיס חבר', icon: '🎫' },
      { id: 'sibus', label: 'תלוש/סיבוס', icon: '🧾' }
    ];
    const p = session.payment;
    container.innerHTML = `
      ${progressHTML(branch)}
      <span class="wizard-branch-tag">${branch.name}</span>
      <h2 class="menu-screen-title">${screen.title} · סה״כ ${total} ₪</h2>
      <div class="payment-methods" id="payment-methods">
        ${methods.map(m => `<div class="payment-method-card ${p.method === m.id ? 'is-selected' : ''}" data-method="${m.id}"><span class="payment-method-icon">${m.icon}</span>${m.label}</div>`).join('')}
      </div>
      <label class="split-toggle-row"><input type="checkbox" id="split-toggle" ${p.split ? 'checked' : ''}> פיצול תשלום בין 2 אמצעים</label>
      ${p.split ? `
      <div class="split-block">
        <div class="split-row">
          <label style="min-width:100px;font-size:12.5px;color:var(--text-muted);">אמצעי שני</label>
          <select id="split-method">
            <option value="">בחר/י...</option>
            ${methods.filter(m => m.id !== p.method).map(m => `<option value="${m.id}" ${p.splitMethod === m.id ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </div>
        <div class="split-row">
          <label style="min-width:100px;font-size:12.5px;color:var(--text-muted);">סכום לאמצעי השני (₪)</label>
          <input type="number" id="split-amount" min="0" max="${total}" value="${p.splitAmount || ''}" placeholder="לדוגמה 50">
        </div>
      </div>` : ''}
      <div class="wizard-nav">
        <button class="btn btn-secondary" id="btn-prev" type="button">→ הקודם</button>
        <button class="btn btn-primary" id="btn-next" type="button" ${p.method ? '' : 'disabled'}>המשך →</button>
      </div>
    `;

    container.querySelectorAll('.payment-method-card').forEach(el => {
      el.addEventListener('click', () => {
        session.payment.method = el.dataset.method;
        if (session.payment.splitMethod === session.payment.method) session.payment.splitMethod = null;
        renderInternal();
      });
    });
    const splitToggle = container.querySelector('#split-toggle');
    if (splitToggle) splitToggle.addEventListener('change', (e) => { session.payment.split = e.target.checked; renderInternal(); });
    const splitMethod = container.querySelector('#split-method');
    if (splitMethod) splitMethod.addEventListener('change', (e) => { session.payment.splitMethod = e.target.value || null; });
    const splitAmount = container.querySelector('#split-amount');
    if (splitAmount) splitAmount.addEventListener('input', (e) => { session.payment.splitAmount = e.target.value; });

    attachNavListeners(container, branch);
  }

  /* ---------------- summary ---------------- */

  function renderSummaryScreen(container, branch, screen) {
    const text = Summary.buildText({ branch: branch, answers: session.answers, cart: session.cart, payment: session.payment, notesLog: session.notesLog });
    container.innerHTML = `
      ${progressHTML(branch)}
      <span class="wizard-branch-tag">${branch.name}</span>
      <h2 class="menu-screen-title">${screen.title}</h2>
      <textarea class="summary-textarea" id="summary-text" readonly></textarea>
      <div class="summary-actions">
        <button class="btn btn-primary" id="btn-copy" type="button">📋 העתקת סיכום ההזמנה</button>
        <button class="btn btn-secondary" id="btn-prev" type="button">→ חזרה לתשלום</button>
        <button class="btn btn-ghost" id="btn-new-call" type="button">☎️ שיחה חדשה</button>
      </div>
    `;
    container.querySelector('#summary-text').value = text;
    container.querySelector('#btn-copy').addEventListener('click', () => {
      Summary.copyToClipboard(text)
        .then(() => showToast('הסיכום הועתק ללוח! ✅', 'success'))
        .catch(() => showToast('העתקה נכשלה - ניתן לסמן ולהעתיק ידנית', 'danger'));
    });
    container.querySelector('#btn-prev').addEventListener('click', () => { currentScreenIndex--; renderInternal(); });
    container.querySelector('#btn-new-call').addEventListener('click', () => { session = null; renderInternal(); });
  }

  return { mount };
})();
