/* ===================================================================
   AgentView - תצוגת הנציגה (מוקד). מסך שאלות מציג רצף blocks
   (תסריט מוטמע / פופאפ חד-פעמי / שאילתה) בדיוק כפי שהורכב בתצוגת
   המנהל. קורא את מבנה הזרימה מ-Store בכל רינדור, כך שעריכה בתצוגת
   המנהל משפיעה מיד גם כאן.
=================================================================== */

const AgentView = (function () {
  let session = null;
  let currentScreenIndex = 0;
  let menuFilterState = { search: '', tag: null, maxPrice: '', justAutoSet: false };
  let expandedCustomItemId = null;
  let mountedRoot = null;

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
      _shownScripts: {},
      customItemSelection: {}
    };
    currentScreenIndex = 0;
    menuFilterState = { search: '', tag: null, maxPrice: '', justAutoSet: false };
    expandedCustomItemId = null;
    renderInternal();
  }

  /* ---------------- שירותי בלוקים (תסריט/פופאפ חד-פעמי) ---------------- */

  function firePopupBlocksOnce(screen, blocks) {
    (blocks || []).filter(b => b.kind === 'popup').forEach(b => {
      const flagKey = screen.id + ':' + b.id;
      if (!session._shownScripts[flagKey]) {
        session._shownScripts[flagKey] = true;
        Popups.reminder({ title: 'תזכורת לנציגה', message: b.text, buttons: [{ label: 'הבנתי, ממשיך', onClick: function () {} }] });
      }
    });
  }

  function scriptBlockHTML(b) {
    return `<div class="script-block"><span class="script-block-icon">🗣️</span><p>${b.text}</p></div>`;
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

    if (screen.type === 'menu') {
      const nextScreen = flow[currentScreenIndex + 1];
      if (nextScreen && nextScreen.type === 'payment' && !session._minOrderDismissed) {
        const check = Engine.checkMinOrder(session, cartTotal());
        if (check) {
          const msg = check.rule.message.replace('{{gap}}', check.gap).replace('{{min}}', check.min);
          Popups.suggestion({
            title: check.rule.name,
            message: msg,
            buttons: [
              { label: check.rule.buttons[0].label, onClick: () => { applyPriceFilterToGap(check.gap); logNote(msg + ' ← הנציגה אישרה, הסינון עודכן אוטומטית.'); renderInternal(); } },
              { label: check.rule.buttons[1].label, onClick: () => { session._minOrderDismissed = true; advance(); } }
            ]
          });
          return;
        }
      }
    }
    advance();

    function advance() {
      if (currentScreenIndex < flow.length - 1) { currentScreenIndex++; renderInternal(); }
    }
  }

  function canProceed(screen) {
    if (screen.type === 'question') {
      const blocks = (screen.blocks || []).filter(b => b.kind === 'question');
      return blocks.every(b => {
        if (b.required === false) return true;
        if (b.responseType === 'multiselect') {
          const arr = session.answers[b.key];
          return Array.isArray(arr) && arr.length > 0;
        }
        if (b.responseType === 'dynamic-fulfillment') return !!session.answers.addressOrPickup;
        const val = session.answers[b.key];
        return !!(val && String(val).trim());
      });
    }
    if (screen.type === 'payment') return !!session.payment.method;
    return true;
  }

  /* ---------------- question screens ---------------- */

  function resolveQuestionLabel(b, branch) {
    if (b.dynamic === 'fulfillment-followup') {
      if (session.answers.fulfillment === 'משלוח') return "לאן לשלוח לך?";
      if (session.answers.fulfillment === 'איסוף') return `אז אתה מגיע לקחת מסניף ${branch.shortName}?`;
      return "פרטי משלוח / איסוף";
    }
    return b.label;
  }

  function autofillSlotHTML(phone) {
    const known = Store.knownCustomerByPhone(phone || '');
    return known ? `<div class="autofill-strip"><span>✓ זוהה לקוח מוכר: ${known.fullName} - השם יוצע אוטומטית בהמשך</span></div>` : '';
  }

  function choiceButtonsHTML(b, currentVal) {
    return `<div class="wizard-choice-row">${b.options.map(o => `<button type="button" class="choice-btn ${currentVal === o ? 'is-selected' : ''}" data-value="${escapeAttr(o)}" data-key="${b.key}">${o}</button>`).join('')}</div>`;
  }

  function questionBlockHTML(b, branch) {
    const label = resolveQuestionLabel(b, branch);
    const currentVal = session.answers[b.key];
    let controlHTML = '';

    if (b.responseType === 'short-text') {
      controlHTML = `<input class="wizard-input" id="q-input-${b.id}" type="${b.inputMode === 'tel' ? 'tel' : 'text'}" value="${escapeAttr(currentVal)}" placeholder="${b.inputMode === 'tel' ? '05X-XXXXXXX' : 'הקלד/י כאן...'}" autocomplete="off">`;
      if (b.key === 'phone') controlHTML += `<div id="autofill-slot-${b.id}">${autofillSlotHTML(currentVal)}</div>`;
      if (b.key === 'fullName' && b.autofill) {
        const known = Store.knownCustomerByPhone(session.answers.phone || '');
        if (known && !currentVal) {
          controlHTML += `<div class="autofill-strip" data-autofill-name-slot data-block="${b.id}"><span>🔎 לקוח מוכר: ${known.fullName}</span><button type="button" class="autofill-strip-btn" data-autofill-name-btn="${b.id}">מילוי אוטומטי</button></div>`;
        } else {
          controlHTML += `<div data-autofill-name-slot data-block="${b.id}"></div>`;
        }
      }
    } else if (b.responseType === 'buttons') {
      controlHTML = choiceButtonsHTML(b, currentVal);
    } else if (b.responseType === 'timing-slots') {
      controlHTML = choiceButtonsHTML(b, currentVal);
      if (currentVal === 'ליותר מאוחר') {
        const slots = ['17:30', '18:00', '18:30', '19:00'];
        controlHTML += `<div class="slot-row">${slots.map(s => `<button type="button" class="slot-btn ${session.answers.timeSlot === s ? 'is-selected' : ''} ${s === branch.busySlot ? 'is-busy' : ''}" data-slot="${s}">🕓 ${s}</button>`).join('')}</div>`;
      }
    } else if (b.responseType === 'dropdown') {
      controlHTML = `<select class="wizard-input" id="q-input-${b.id}" data-key="${b.key}">
        <option value="" ${!currentVal ? 'selected' : ''}>בחר/י...</option>
        ${b.options.map(o => `<option value="${escapeAttr(o)}" ${currentVal === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>`;
    } else if (b.responseType === 'multiselect') {
      const arr = Array.isArray(currentVal) ? currentVal : [];
      controlHTML = `<div class="multiselect-row">${b.options.map(o => `
        <label class="multiselect-chip ${arr.indexOf(o) > -1 ? 'is-selected' : ''}">
          <input type="checkbox" data-key="${b.key}" data-multi-option="${escapeAttr(o)}" ${arr.indexOf(o) > -1 ? 'checked' : ''}> ${o}
        </label>`).join('')}</div>`;
    } else if (b.responseType === 'dynamic-fulfillment') {
      if (session.answers.fulfillment === 'משלוח') {
        controlHTML = `<input class="wizard-input" id="q-input-${b.id}" type="text" value="${escapeAttr(currentVal)}" placeholder="לדוגמה: רחוב הרצל 10, כניסה ב׳, קומה 2" autocomplete="off">`;
      } else if (session.answers.fulfillment === 'איסוף') {
        controlHTML = `<button type="button" class="choice-btn ${currentVal ? 'is-selected' : ''}" data-value="${escapeAttr(branch.shortName)}" data-key="${b.key}" style="width:100%;">כן, מגיע/ה לקחת מסניף ${branch.shortName}</button>`;
      } else {
        controlHTML = `<p style="color:var(--text-muted);font-size:13.5px;">יש לענות קודם על שאלת המשלוח/איסוף.</p>`;
      }
    }

    return `<div class="question-block">
      <div class="wizard-question-label">${label}${b.required === false ? ' <span class="optional-tag">(לא חובה)</span>' : ''}</div>
      ${controlHTML}
    </div>`;
  }

  function renderQuestionScreen(container, branch, screen) {
    const blocks = screen.blocks || [];
    firePopupBlocksOnce(screen, blocks);
    const questionBlocks = blocks.filter(b => b.kind === 'question');

    const bodyHTML = blocks.map(b => {
      if (b.kind === 'script') return scriptBlockHTML(b);
      if (b.kind === 'question') return questionBlockHTML(b, branch);
      return '';
    }).join('');

    container.innerHTML = `
      <div class="wizard">
        ${progressHTML(branch)}
        <div class="wizard-card">
          <span class="wizard-branch-tag">${branch.name}</span>
          ${bodyHTML}
          <div class="wizard-nav">
            <button class="btn btn-secondary" id="btn-prev" type="button" ${currentScreenIndex === 0 ? 'disabled' : ''}>→ הקודם</button>
            <button class="btn btn-primary" id="btn-next" type="button" ${canProceed(screen) ? '' : 'disabled'}>המשך →</button>
          </div>
        </div>
      </div>
    `;

    attachQuestionBlockListeners(container, branch, screen, questionBlocks);
    attachNavListeners(container, branch);
  }

  function refreshNextButton(container, screen) {
    const nextBtn = container.querySelector('#btn-next');
    if (nextBtn) nextBtn.disabled = !canProceed(screen);
  }

  function refreshNameAutofillStrips(container, questionBlocks) {
    questionBlocks.filter(b => b.key === 'fullName' && b.autofill).forEach(b => {
      const slot = container.querySelector('[data-autofill-name-slot][data-block="' + b.id + '"]');
      if (!slot) return;
      const known = Store.knownCustomerByPhone(session.answers.phone || '');
      if (known && !session.answers.fullName) {
        slot.classList.add('autofill-strip');
        slot.innerHTML = `<span>🔎 לקוח מוכר: ${known.fullName}</span><button type="button" class="autofill-strip-btn" data-autofill-name-btn="${b.id}">מילוי אוטומטי</button>`;
        const btn = slot.querySelector('[data-autofill-name-btn]');
        if (btn) btn.addEventListener('click', () => { session.answers.fullName = known.fullName; renderInternal(); });
      } else {
        slot.classList.remove('autofill-strip');
        slot.innerHTML = '';
      }
    });
  }

  function attachQuestionBlockListeners(container, branch, screen, questionBlocks) {
    function handleKeyAnswered(key) {
      if (['timing', 'fulfillment', 'timeSlot'].indexOf(key) > -1) {
        const check = Engine.checkAfterAnswer(session);
        if (check) { showRuleFromCheck(check); return; }
      }
      renderInternal();
    }

    questionBlocks.forEach(b => {
      const isTextInput = b.responseType === 'short-text' || (b.responseType === 'dynamic-fulfillment' && session.answers.fulfillment === 'משלוח');
      if (isTextInput) {
        const input = container.querySelector('#q-input-' + b.id);
        if (input) {
          input.addEventListener('input', (e) => {
            session.answers[b.key] = e.target.value;
            refreshNextButton(container, screen);
            if (b.key === 'phone') {
              const slot = container.querySelector('#autofill-slot-' + b.id);
              if (slot) slot.innerHTML = autofillSlotHTML(e.target.value);
              refreshNameAutofillStrips(container, questionBlocks);
            }
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && canProceed(screen)) goNext(branch);
          });
        }
      }

      if (b.responseType === 'dropdown') {
        const sel = container.querySelector('#q-input-' + b.id);
        if (sel) sel.addEventListener('change', (e) => { session.answers[b.key] = e.target.value; handleKeyAnswered(b.key); });
      }

      if (b.responseType === 'multiselect') {
        container.querySelectorAll('input[data-key="' + b.key + '"][data-multi-option]').forEach(chk => {
          chk.addEventListener('change', () => {
            const arr = Array.isArray(session.answers[b.key]) ? session.answers[b.key].slice() : [];
            const opt = chk.dataset.multiOption;
            const idx = arr.indexOf(opt);
            if (chk.checked && idx === -1) arr.push(opt);
            if (!chk.checked && idx > -1) arr.splice(idx, 1);
            session.answers[b.key] = arr;
            renderInternal();
          });
        });
      }
    });

    container.querySelectorAll('[data-autofill-name-btn]').forEach(btn => btn.addEventListener('click', () => {
      const known = Store.knownCustomerByPhone(session.answers.phone || '');
      const block = questionBlocks.find(qb => qb.id === btn.dataset.autofillNameBtn);
      if (known && block) { session.answers[block.key] = known.fullName; renderInternal(); }
    }));

    container.querySelectorAll('.choice-btn[data-value][data-key]').forEach(btn => {
      btn.addEventListener('click', () => { session.answers[btn.dataset.key] = btn.dataset.value; handleKeyAnswered(btn.dataset.key); });
    });

    container.querySelectorAll('.slot-btn[data-slot]').forEach(btn => {
      btn.addEventListener('click', () => { session.answers.timeSlot = btn.dataset.slot; handleKeyAnswered('timeSlot'); });
    });
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
    const maxPrice = menuFilterState.maxPrice !== '' ? parseFloat(menuFilterState.maxPrice) : null;
    return items.filter(it => {
      if (menuFilterState.search && menuFilterState.search.trim()) {
        const q = menuFilterState.search.trim();
        if (!(it.name.indexOf(q) > -1 || it.tags.some(t => t.indexOf(q) > -1))) return false;
      }
      if (menuFilterState.tag && it.tags.indexOf(menuFilterState.tag) === -1) return false;
      if (maxPrice !== null && !isNaN(maxPrice) && it.price > maxPrice) return false;
      return true;
    });
  }

  function customizePanelHTML(it) {
    const ingredients = (it.ingredientIds || []).map(id => Store.getIngredient(session.restaurantId, id)).filter(Boolean);
    const selected = session.customItemSelection[it.id] || [];
    return `
      <div class="customize-panel">
        <div class="field-label">בחר/י מילוי</div>
        <div class="ingredient-chip-row">
          ${ingredients.map(ing => `
            <label class="ingredient-chip ${!ing.available ? 'is-unavailable' : ''} ${selected.indexOf(ing.id) > -1 ? 'is-selected' : ''}">
              <input type="checkbox" data-ingredient="${ing.id}" data-item="${it.id}" ${selected.indexOf(ing.id) > -1 ? 'checked' : ''} ${!ing.available ? 'disabled' : ''}>
              ${ing.name}${!ing.available ? ' ✕' : ''}
            </label>`).join('')}
        </div>
        <button type="button" class="btn btn-primary btn-small" data-action="confirm-custom" data-item="${it.id}">הוספה לעגלה</button>
      </div>`;
  }

  function itemCardHTML(it) {
    const line = session.cart.find(l => l.itemId === it.id);
    const qty = line ? line.qty : 0;
    const emoji = it.categoryId === 'drinks' ? '🥤' : it.categoryId === 'sides' ? '🥗' : it.categoryId === 'party' ? '🎉' : '🍣';

    if (it.customizable) {
      const isExpanded = expandedCustomItemId === it.id;
      return `
        <div class="item-card">
          <div class="item-image-placeholder">${emoji}<span class="item-image-placeholder-label">תמונה תתווסף</span></div>
          <div class="item-body">
            <div class="item-name">${it.name}</div>
            ${it.tags.length ? `<div class="item-tags">${it.tags.map(t => `<span class="item-tag">${t}</span>`).join('')}</div>` : ''}
            ${line && line.note ? `<span class="item-note-tag">${line.note}</span>` : ''}
            <div class="item-foot">
              <span class="item-price">${it.price} ₪</span>
              <button type="button" class="add-btn" data-action="customize" data-item="${it.id}">בחירת מילוי ${isExpanded ? '−' : '+'}</button>
            </div>
          </div>
          ${isExpanded ? customizePanelHTML(it) : ''}
        </div>`;
    }

    return `
      <div class="item-card">
        <div class="item-image-placeholder">${emoji}<span class="item-image-placeholder-label">תמונה תתווסף</span></div>
        <div class="item-body">
          <div class="item-name">${it.name}</div>
          ${it.tags.length ? `<div class="item-tags">${it.tags.map(t => `<span class="item-tag">${t}</span>`).join('')}</div>` : ''}
          ${line && line.note ? `<span class="item-note-tag">${line.note}</span>` : ''}
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
    firePopupBlocksOnce(screen, screen.leadingBlocks);
    const leadingScriptsHTML = (screen.leadingBlocks || []).filter(b => b.kind === 'script').map(scriptBlockHTML).join('');

    const items = Store.getMenuItemsByCategory(screen.categoryFilter);
    const allTags = Array.from(new Set(items.reduce((acc, it) => acc.concat(it.tags), [])));
    const total = cartTotal();
    const count = session.cart.reduce((s, l) => s + l.qty, 0);

    container.innerHTML = `
      ${progressHTML(branch)}
      <span class="wizard-branch-tag">${branch.name}</span>
      ${leadingScriptsHTML}
      <h2 class="menu-screen-title">${screen.title}</h2>
      <div class="menu-toolbar">
        <input class="search-input" id="menu-search" type="text" placeholder="חיפוש מהיר לפי שם או תגית..." value="${escapeAttr(menuFilterState.search)}">
        <input class="price-filter-input ${menuFilterState.justAutoSet ? 'is-flash' : ''}" id="price-filter" type="number" min="0" step="1" placeholder="סינון: עד כמה ₪?" value="${escapeAttr(menuFilterState.maxPrice)}">
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
    container.querySelector('#price-filter').addEventListener('input', (e) => {
      menuFilterState.maxPrice = e.target.value;
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

    const grid = container.querySelector('#menu-grid');
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const item = Store.getMenuItem(btn.dataset.item);
      if (!item) return;
      if (btn.dataset.action === 'add') handleAddToCart(item, branch);
      else if (btn.dataset.action === 'inc') { changeQty(item.id, 1); afterCartChange(branch); }
      else if (btn.dataset.action === 'dec') { changeQty(item.id, -1); afterCartChange(branch); }
      else if (btn.dataset.action === 'customize') {
        expandedCustomItemId = expandedCustomItemId === item.id ? null : item.id;
        if (!session.customItemSelection[item.id]) session.customItemSelection[item.id] = [];
        refreshMenuGrid(container, screen);
      } else if (btn.dataset.action === 'confirm-custom') {
        const names = (session.customItemSelection[item.id] || []).map(id => {
          const ing = Store.getIngredient(session.restaurantId, id);
          return ing ? ing.name : id;
        });
        addItemToCart(item.id, names.length ? names.join(', ') : null);
        expandedCustomItemId = null;
        afterCartChange(branch);
      }
    });
    grid.addEventListener('change', (e) => {
      const chk = e.target.closest('input[data-ingredient]');
      if (!chk) return;
      const itemId = chk.dataset.item;
      if (!session.customItemSelection[itemId]) session.customItemSelection[itemId] = [];
      const arr = session.customItemSelection[itemId];
      const idx = arr.indexOf(chk.dataset.ingredient);
      if (chk.checked && idx === -1) arr.push(chk.dataset.ingredient);
      if (!chk.checked && idx > -1) arr.splice(idx, 1);
      const chip = chk.closest('.ingredient-chip');
      if (chip) chip.classList.toggle('is-selected', chk.checked);
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
              const rawNote = b.action.split(':')[1];
              addItemToCart(item.id, 'דגים ' + rawNote);
              logNote(`${item.name}: נבחרו דגים ${rawNote}.`);
              if (rawNote === 'נאים') {
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
    const existing = session.cart.find(l => l.itemId === itemId && l.note === note);
    if (existing) { existing.qty += 1; }
    else session.cart.push({ itemId, qty: 1, note: note || null });
  }

  function changeQty(itemId, delta) {
    const line = session.cart.find(l => l.itemId === itemId);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) session.cart = session.cart.filter(l => l !== line);
  }

  function cartTotal() {
    return session.cart.reduce((sum, line) => {
      const item = Store.getMenuItem(line.itemId);
      return sum + (item ? item.price * line.qty : 0);
    }, 0);
  }

  function applyPriceFilterToGap(gap) {
    menuFilterState.maxPrice = String(gap);
    menuFilterState.justAutoSet = true;
  }

  function afterCartChange(branch) {
    renderInternal();
  }

  /* ---------------- payment ---------------- */

  function renderPaymentScreen(container, branch, screen) {
    firePopupBlocksOnce(screen, screen.leadingBlocks);
    const leadingScriptsHTML = (screen.leadingBlocks || []).filter(b => b.kind === 'script').map(scriptBlockHTML).join('');
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
      ${leadingScriptsHTML}
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
    firePopupBlocksOnce(screen, screen.leadingBlocks);
    const leadingScriptsHTML = (screen.leadingBlocks || []).filter(b => b.kind === 'script').map(scriptBlockHTML).join('');
    const text = Summary.buildText({ branch: branch, answers: session.answers, cart: session.cart, payment: session.payment, notesLog: session.notesLog });
    container.innerHTML = `
      ${progressHTML(branch)}
      <span class="wizard-branch-tag">${branch.name}</span>
      ${leadingScriptsHTML}
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
