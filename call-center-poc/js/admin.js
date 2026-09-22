/* ===================================================================
   AdminView - תצוגת מנהל. בונה מסכים בגרירה-ושחרור: פלטת רכיבים
   מובנים (שאילתות/תסריטים/פופאפים) מימין, קנבס WYSIWYG משמאל. גם
   לחיצה (לא רק גרירה) מוסיפה רכיב - כדי שהבנייה תמיד תהיה אמינה.
   פרטי סניף (כתובת/שעות/כשרות), אזורי משלוח, אוטומציות ומרכיבים
   (זמינות ברמת סניף) משלימים את התמונה.
=================================================================== */

const AdminView = (function () {
  let mountedRoot = null;
  let selectedRestaurantId = 'japan';
  let selectedBranchId = 'japan-goh';
  let activeSubtab = 'flow'; // 'flow' | 'automations' | 'ingredients' | 'zones'
  let expandedScreenId = null;

  const SCREEN_ICON = { question: '❓', menu: '🍽️', payment: '💳', summary: '🧾' };
  const SCREEN_TYPE_LABEL = { question: 'שאלה', menu: 'תפריט', payment: 'תשלום', summary: 'סיכום' };
  const RULE_KIND_LABEL = { blocking: 'חוסם', reminder: 'תזכורת', 'guided-choice': 'תסריט מונחה', suggestion: 'הצעה אוטומטית' };
  const BLOCK_KIND_ICON = { script: '🗣️', popup: '💬', question: '❓' };

  function escapeAttr(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function blockLibrary() {
    return Store.data.blockLibrary || { questions: [], scripts: [], popups: [] };
  }

  function mount(root) {
    mountedRoot = root;
    render();
  }

  function render() {
    if (!mountedRoot) return;
    mountedRoot.innerHTML = `
      <div class="admin-toolbar">
        <h2>ניהול מסעדות ותסריטים</h2>
      </div>
      <div class="admin-layout">
        <div class="admin-sidebar" id="admin-sidebar"></div>
        <div class="admin-main" id="admin-main"></div>
      </div>
    `;
    renderSidebar();
    renderMain();
  }

  function renderSidebar() {
    const sidebar = mountedRoot.querySelector('#admin-sidebar');
    const restaurants = Store.data.restaurants;
    sidebar.innerHTML = `<div class="admin-sidebar-title">מסעדות (${restaurants.length} מוצגות מתוך יעד של עד 50)</div>` +
      restaurants.map(r => `
        <div class="restaurant-list-item ${r.id === selectedRestaurantId ? 'is-active' : ''} ${!r.active ? 'is-disabled' : ''}" data-restaurant="${r.id}">
          <div class="restaurant-list-item-name">${r.name}</div>
          <div class="restaurant-list-item-badges">${r.kinds.map(k => `<span class="type-badge kind-${k}">${k}</span>`).join('')}${!r.active ? '<span class="type-badge">לדוגמה בלבד</span>' : ''}</div>
        </div>
      `).join('');
    sidebar.querySelectorAll('[data-restaurant]').forEach(el => {
      el.addEventListener('click', () => {
        const r = Store.getRestaurant(el.dataset.restaurant);
        if (!r) return;
        selectedRestaurantId = r.id;
        if (r.active) { selectedBranchId = r.branches[0].id; activeSubtab = 'flow'; }
        render();
      });
    });
  }

  function renderMain() {
    const main = mountedRoot.querySelector('#admin-main');
    const restaurant = Store.getRestaurant(selectedRestaurantId);
    if (!restaurant || !restaurant.active) {
      main.innerHTML = `<div class="admin-empty-note">${(restaurant && restaurant.note) || 'בחרי מסעדה פעילה מהרשימה כדי לצפות בתצורה שלה.'}</div>`;
      return;
    }
    const branch = restaurant.branches.find(b => b.id === selectedBranchId) || restaurant.branches[0];

    main.innerHTML = `
      <div class="branch-tabs" id="branch-tabs">
        ${restaurant.branches.map(b => `<button type="button" class="branch-tab ${b.id === branch.id ? 'is-active' : ''}" data-branch="${b.id}">${b.shortName}</button>`).join('')}
      </div>
      <div class="branch-settings" id="branch-settings"></div>
      <div class="subtabs" id="subtabs">
        <button type="button" class="subtab ${activeSubtab === 'flow' ? 'is-active' : ''}" data-subtab="flow">🧭 זרימת מסכים</button>
        <button type="button" class="subtab ${activeSubtab === 'automations' ? 'is-active' : ''}" data-subtab="automations">⚡ אוטומציות</button>
        <button type="button" class="subtab ${activeSubtab === 'ingredients' ? 'is-active' : ''}" data-subtab="ingredients">🥗 מרכיבים</button>
        <button type="button" class="subtab ${activeSubtab === 'zones' ? 'is-active' : ''}" data-subtab="zones">🚚 אזורי משלוח</button>
      </div>
      <div id="subtab-content"></div>
    `;

    main.querySelectorAll('[data-branch]').forEach(btn => btn.addEventListener('click', () => { selectedBranchId = btn.dataset.branch; expandedScreenId = null; render(); }));
    main.querySelectorAll('[data-subtab]').forEach(btn => btn.addEventListener('click', () => { activeSubtab = btn.dataset.subtab; render(); }));

    renderBranchSettings(main.querySelector('#branch-settings'), branch);

    const contentEl = main.querySelector('#subtab-content');
    if (activeSubtab === 'flow') renderFlowTab(contentEl, restaurant, branch.id);
    else if (activeSubtab === 'automations') renderAutomationsTab(contentEl, restaurant, branch);
    else if (activeSubtab === 'ingredients') renderIngredientsTab(contentEl, restaurant, branch);
    else renderZonesTab(contentEl, branch);
  }

  /* ================= פרטי סניף (כתובת/שעות/כשרות) ================= */

  function renderBranchSettings(container, branch) {
    container.innerHTML = `
      <details class="branch-settings-details">
        <summary>⚙️ פרטי הסניף (כתובת, שעות פתיחה, כשרות) - מוצגים לנציגה ברצועה העליונה בכל מסך</summary>
        <div class="branch-settings-grid">
          <label>כתובת<input type="text" class="text-input" id="bs-address" value="${escapeAttr(branch.address)}"></label>
          <label>שעות פתיחה<input type="text" class="text-input" id="bs-hours" value="${escapeAttr(branch.openingHours || '')}"></label>
          <label>כשרות<input type="text" class="text-input" id="bs-kashrut" value="${escapeAttr(branch.kashrut || '')}"></label>
        </div>
      </details>`;
    const idsAndFields = [['bs-address', 'address'], ['bs-hours', 'openingHours'], ['bs-kashrut', 'kashrut']];
    idsAndFields.forEach(([id, field]) => {
      const el = container.querySelector('#' + id);
      el.addEventListener('change', () => {
        Store.updateBranchInfo(branch.id, { [field]: el.value });
        showToast('הפרטים נשמרו', 'success');
      });
    });
  }

  /* ================= לשונית זרימת מסכים ================= */

  function renderFlowTab(container, restaurant, branchId) {
    container.innerHTML = `
      <p class="section-sub">סדר המסכים כפי שהנציגה תראה אותם בשיחה. לחצי על מסך כדי לפתוח את בנאי הרכיבים שלו - גוררים (או לוחצים) שאילתות/תסריטים/פופאפים מהפלטה אל הקנבס, ורואים בדיוק איך זה ייראה. בשיחה עצמה כל רכיב נחשף רק אחרי שהקודם לו הושלם.</p>
      <div class="flow-list" id="flow-list"></div>
    `;
    renderFlowList(container.querySelector('#flow-list'), restaurant, branchId);
  }

  function renderFlowList(listEl, restaurant, branchId) {
    const branch = Store.findBranchById(branchId).branch;
    listEl.innerHTML = branch.flow.map((s, i) => flowCardHTML(s, i, branch)).join('');

    listEl.querySelectorAll('.flow-card-head').forEach(head => {
      head.addEventListener('click', (e) => {
        if (e.target.closest('[data-noexpand]')) return;
        const id = head.closest('.flow-card').dataset.screen;
        expandedScreenId = expandedScreenId === id ? null : id;
        renderFlowList(listEl, restaurant, branchId);
      });
    });
    listEl.querySelectorAll('[data-move-screen]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.moveScreen(branchId, btn.dataset.screen, btn.dataset.moveScreen === 'up' ? -1 : 1);
        renderFlowList(listEl, restaurant, branchId);
        showToast('סדר המסכים עודכן', 'success');
      });
    });
    listEl.querySelectorAll('.screen-enable-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => e.stopPropagation());
      toggle.addEventListener('change', (e) => {
        Store.setScreenEnabled(branchId, toggle.dataset.screen, toggle.checked);
        showToast(toggle.checked ? 'המסך הופעל' : 'המסך כובה', 'success');
        renderFlowList(listEl, restaurant, branchId);
      });
    });
    listEl.querySelectorAll('.screen-title-input').forEach(input => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('change', () => {
        Store.updateScreenTitle(branchId, input.dataset.screen, input.value);
        showToast('הכותרת נשמרה', 'success');
      });
    });

    const expandedScreen = branch.flow.find(s => s.id === expandedScreenId);
    if (expandedScreen) {
      wireBlockBuilder(listEl, restaurant, branchId, expandedScreen);
      if (expandedScreen.type === 'menu') wireCategoryManager(listEl, restaurant, branchId);
    }
  }

  function flowCardHTML(s, i, branch) {
    const icon = SCREEN_ICON[s.type] || '📄';
    const isExpanded = expandedScreenId === s.id;
    const blockCount = (s.blocks || []).length + (s.leadingBlocks || []).length;
    const meta = `${blockCount} רכיבים`;
    return `
      <div class="flow-card ${s.enabled === false ? 'is-disabled' : ''}" data-screen="${s.id}">
        <div class="flow-card-head">
          <span class="flow-card-icon">${icon}</span>
          <div style="flex:1;">
            <div class="flow-card-title">${i + 1}. ${s.title || SCREEN_TYPE_LABEL[s.type]}</div>
            <div class="flow-card-meta">${SCREEN_TYPE_LABEL[s.type]} · ${meta}</div>
          </div>
          <div class="flow-card-actions" data-noexpand>
            <button type="button" class="icon-btn" data-move-screen="up" data-screen="${s.id}" ${i === 0 ? 'disabled' : ''} title="הזזה למעלה">▲</button>
            <button type="button" class="icon-btn" data-move-screen="down" data-screen="${s.id}" ${i === branch.flow.length - 1 ? 'disabled' : ''} title="הזזה למטה">▼</button>
            <label class="toggle-switch" title="הפעלה/כיבוי המסך">
              <input type="checkbox" class="screen-enable-toggle" data-screen="${s.id}" ${s.enabled !== false ? 'checked' : ''}>
              <span class="toggle-switch-slider"></span>
            </label>
          </div>
        </div>
        ${isExpanded ? `<div class="flow-card-body">${flowCardBodyHTML(s, branch)}</div>` : ''}
      </div>`;
  }

  function flowCardBodyHTML(s, branch) {
    const titleRow = `
      <div class="question-edit-row">
        <span class="field-label">כותרת המסך (לתצוגת מנהל בלבד)</span>
        <input type="text" class="text-input screen-title-input" data-screen="${s.id}" value="${escapeAttr(s.title || '')}">
      </div>`;

    if (s.type === 'question') {
      return titleRow + blockBuilderHTML(s, 'blocks', true, branch);
    }
    if (s.type === 'menu') {
      return titleRow + `<div class="question-edit-row" id="category-manager"></div>` + blockBuilderHTML(s, 'leadingBlocks', false, branch);
    }
    if (s.type === 'payment') {
      return titleRow + `<p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">מסך תשלום סטנדרטי - כולל אפשרות פיצול בין שני אמצעי תשלום.</p>` + blockBuilderHTML(s, 'leadingBlocks', false, branch);
    }
    return titleRow + `<p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">מסך סיכום - מפיק טקסט חופשי מובנה עם כפתור העתקה, כולל כל התזכורות שהוצגו לנציגה.</p>` + blockBuilderHTML(s, 'leadingBlocks', false, branch);
  }

  /* ---------------- ניהול לשוניות קטגוריה (ברמת מסעדה, מוצג בתוך מסך התפריט) ---------------- */

  function wireCategoryManager(listEl, restaurant, branchId) {
    const holder = listEl.querySelector('#category-manager');
    if (!holder) return;
    renderCategoryManager(holder, restaurant, branchId);
  }

  function renderCategoryManager(holder, restaurant, branchId) {
    const active = Store.getRestaurantCategories(restaurant.id);
    const activeIds = active.map(c => c.id);
    const available = Store.data.menuCategories.filter(c => activeIds.indexOf(c.id) === -1);
    holder.innerHTML = `
      <span class="field-label">לשוניות התפריט של ${restaurant.name} (משותפות לכל הסניפים)</span>
      <div class="category-manager-list">
        ${active.map((c, i) => `
          <div class="category-manager-item">
            <span>${c.name}</span>
            <button type="button" class="icon-btn" data-cat-move="up" data-cat="${c.id}" ${i === 0 ? 'disabled' : ''} title="הזזה">▲</button>
            <button type="button" class="icon-btn" data-cat-move="down" data-cat="${c.id}" ${i === active.length - 1 ? 'disabled' : ''} title="הזזה">▼</button>
            <button type="button" class="icon-btn" data-cat-remove="${c.id}" title="הסרה">🗑</button>
          </div>`).join('') || '<p class="admin-empty-note">לא הוגדרו עדיין לשוניות.</p>'}
      </div>
      <div class="category-manager-add">
        ${available.length ? `<select id="cat-existing-select"><option value="">הוספת לשונית קיימת...</option>${available.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>` : ''}
        <input type="text" class="text-input" id="cat-new-input" placeholder="שם לשונית חדשה...">
        <button type="button" class="btn btn-secondary btn-small" id="cat-add-btn">+ הוספה</button>
      </div>`;

    holder.querySelectorAll('[data-cat-move]').forEach(btn => btn.addEventListener('click', () => {
      Store.moveCategoryInRestaurant(restaurant.id, btn.dataset.cat, btn.dataset.catMove === 'up' ? -1 : 1);
      renderCategoryManager(holder, restaurant, branchId);
    }));
    holder.querySelectorAll('[data-cat-remove]').forEach(btn => btn.addEventListener('click', () => {
      Store.removeCategoryFromRestaurant(restaurant.id, btn.dataset.catRemove);
      renderCategoryManager(holder, restaurant, branchId);
    }));
    const existingSelect = holder.querySelector('#cat-existing-select');
    if (existingSelect) existingSelect.addEventListener('change', () => {
      if (existingSelect.value) { Store.addCategoryToRestaurant(restaurant.id, existingSelect.value); renderCategoryManager(holder, restaurant, branchId); }
    });
    holder.querySelector('#cat-add-btn').addEventListener('click', () => {
      const input = holder.querySelector('#cat-new-input');
      const name = input.value.trim();
      if (!name) return;
      Store.createAndAddCategory(restaurant.id, name);
      renderCategoryManager(holder, restaurant, branchId);
      showToast('הלשונית נוספה', 'success');
    });
  }

  /* ---------------- בנאי הגרירה-ושחרור ---------------- */

  function blockBuilderHTML(screen, listKey, includeQuestions, branch) {
    const blocks = screen[listKey] || [];
    const lib = blockLibrary();
    return `
      <div class="block-builder">
        <div class="block-palette">
          ${includeQuestions ? paletteSectionHTML('שאילתות מובנות', 'question', lib.questions || []) : ''}
          ${paletteSectionHTML('תסריטים מובנים', 'script', lib.scripts || [])}
          ${paletteSectionHTML('פופאפים מובנים', 'popup', lib.popups || [])}
        </div>
        <div class="block-canvas" id="canvas-${screen.id}-${listKey}" data-screen="${screen.id}" data-listkey="${listKey}">
          ${blocks.length ? blocks.map((b, i) => canvasBlockHTML(b, i, blocks.length, branch)).join('') : '<div class="canvas-empty-note">גררי לכאן שאילתה, תסריט או פופאפ מהפלטה - או לחצי על פריט בפלטה כדי להוסיף.</div>'}
        </div>
      </div>`;
  }

  /* ---------------- תצוגה מותנית: "הצג רק אם שאלה קודמת נענתה ב-X" ---------------- */

  function allQuestionKeysInBranch(branch) {
    const seen = {};
    const list = [];
    (branch.flow || []).forEach(screen => {
      ['blocks', 'leadingBlocks'].forEach(listKey => {
        (screen[listKey] || []).forEach(b => {
          if (b.kind !== 'question') return;
          if (b.responseType === 'dynamic-fulfillment' || b.responseType === 'multiselect') return;
          if (seen[b.key]) return;
          seen[b.key] = true;
          list.push({ key: b.key, label: b.label || b.key, options: b.options || null, blockId: b.id });
        });
      });
    });
    return list;
  }

  function conditionEditorHTML(b, branch) {
    if (!branch) return '';
    const candidates = allQuestionKeysInBranch(branch).filter(c => c.blockId !== b.id);
    if (!candidates.length && !b.condition) return '';
    const current = b.condition || null;
    const selectedSource = current ? candidates.find(c => c.key === current.key) : null;
    const valueControlHTML = !current ? '' : (
      selectedSource && selectedSource.options && selectedSource.options.length
        ? `<select class="block-condition-value" data-block="${b.id}">
            ${selectedSource.options.map(o => `<option value="${escapeAttr(o)}" ${current.equals === o ? 'selected' : ''}>${o}</option>`).join('')}
          </select>`
        : `<input type="text" class="block-condition-value" data-block="${b.id}" placeholder="ערך התשובה..." value="${escapeAttr(current.equals || '')}">`
    );
    return `
      <div class="block-condition-row" data-noexpand>
        <span class="field-label">הצג רק אם</span>
        <select class="block-condition-key" data-block="${b.id}">
          <option value="">תמיד מוצג</option>
          ${candidates.map(c => `<option value="${escapeAttr(c.key)}" ${current && current.key === c.key ? 'selected' : ''}>${escapeAttr(c.label)}</option>`).join('')}
        </select>
        ${valueControlHTML}
      </div>`;
  }

  function paletteSectionHTML(title, kind, items) {
    return `
      <div class="palette-section">
        <div class="palette-section-title">${title}</div>
        <div class="palette-items">
          ${items.map((tpl, i) => `<div class="palette-item" draggable="true" data-kind="${kind}" data-tpl-index="${i}" title="גררי לקנבס, או לחצי להוספה בסוף">${BLOCK_KIND_ICON[kind]} ${tpl.label}</div>`).join('')}
        </div>
        <button type="button" class="palette-add-new" data-kind="${kind}">+ צור ${kind === 'question' ? 'שאילתה' : kind === 'script' ? 'תסריט' : 'פופאפ'} חדש</button>
      </div>`;
  }

  function miniPreviewHTML(b) {
    if (b.responseType === 'buttons' || b.responseType === 'timing-slots') {
      return `<div class="wizard-choice-row is-mini">${(b.options || []).map(o => `<span class="choice-btn is-mini">${o}</span>`).join('')}</div>`;
    }
    if (b.responseType === 'dropdown') {
      return `<div class="wizard-input is-mini is-fake-select">${(b.options && b.options[0]) || 'בחר/י...'} ▾</div>`;
    }
    if (b.responseType === 'multiselect') {
      return `<div class="multiselect-row is-mini">${(b.options || []).map(o => `<span class="multiselect-chip is-mini">${o}</span>`).join('')}</div>`;
    }
    if (b.responseType === 'dynamic-fulfillment') {
      return `<div class="wizard-input is-mini is-fake-select">מנוסח אוטומטית לפי משלוח/איסוף</div>`;
    }
    return `<div class="wizard-input is-mini is-fake-select">${b.inputMode === 'tel' ? '05X-XXXXXXX' : 'תשובה קצרה...'}</div>`;
  }

  function canvasBlockHTML(b, index, total, branch) {
    const moveButtons = `
      <button type="button" class="icon-btn" data-move-block="up" data-block="${b.id}" ${index === 0 ? 'disabled' : ''} title="הזזה למעלה">▲</button>
      <button type="button" class="icon-btn" data-move-block="down" data-block="${b.id}" ${index === total - 1 ? 'disabled' : ''} title="הזזה למטה">▼</button>
      <button type="button" class="icon-btn" data-remove-block="${b.id}" title="הסרה">🗑</button>`;
    const conditionBadge = b.condition ? ' <span class="condition-badge" title="מוצג בתנאי">🔀 מותנה</span>' : '';

    if (b.kind === 'script' || b.kind === 'popup') {
      return `<div class="canvas-block canvas-block-${b.kind}" draggable="true" data-block="${b.id}">
        <div class="canvas-block-head">
          <span class="canvas-block-type">${BLOCK_KIND_ICON[b.kind]} ${b.kind === 'script' ? 'תסריט (טקסט מוטמע במסך + כפתור "הבא")' : 'פופאפ (חד-פעמי בכניסה למסך)'}${conditionBadge}</span>
          <div class="canvas-block-actions" data-noexpand>${moveButtons}</div>
        </div>
        <textarea class="block-text-edit" data-block="${b.id}" data-field="text">${b.text}</textarea>
        ${conditionEditorHTML(b, branch)}
      </div>`;
    }

    const isDynamic = !!b.dynamic;
    const hasOptions = ['buttons', 'dropdown', 'multiselect'].indexOf(b.responseType) > -1;
    return `<div class="canvas-block canvas-block-question" draggable="true" data-block="${b.id}">
      <div class="canvas-block-head">
        <span class="canvas-block-type">❓ שאילתה${b.required === false ? ' (לא חובה)' : ''}${conditionBadge}</span>
        <div class="canvas-block-actions" data-noexpand>${moveButtons}</div>
      </div>
      ${isDynamic
        ? `<p style="font-size:12px;color:var(--text-muted);">נוסח אוטומטית לפי התשובה למשלוח/איסוף (״לאן לשלוח לך?״ / ״אז אתה מגיע לקחת מסניף X?״), כולל בחירת אזור משלוח מתוך לשונית "אזורי משלוח".</p>`
        : `<input type="text" class="block-text-edit" data-block="${b.id}" data-field="label" value="${escapeAttr(b.label)}">`}
      ${!isDynamic ? `
      <div class="block-subrow">
        <select class="block-response-type" data-block="${b.id}">
          <option value="short-text" ${b.responseType === 'short-text' ? 'selected' : ''}>תשובה קצרה</option>
          <option value="buttons" ${b.responseType === 'buttons' ? 'selected' : ''}>כפתורי בחירה</option>
          <option value="dropdown" ${b.responseType === 'dropdown' ? 'selected' : ''}>תפריט נפתח</option>
          <option value="multiselect" ${b.responseType === 'multiselect' ? 'selected' : ''}>בחירה מרובה</option>
        </select>
        <label class="toggle-switch" title="שדה חובה"><input type="checkbox" class="block-required" data-block="${b.id}" ${b.required !== false ? 'checked' : ''}><span class="toggle-switch-slider"></span></label>
        <span class="field-label">חובה למענה</span>
      </div>
      ${hasOptions ? `<textarea class="block-options-edit" data-block="${b.id}" placeholder="אפשרות אחת בכל שורה">${(b.options || []).join('\n')}</textarea>` : ''}
      ` : ''}
      <div class="canvas-block-preview">${miniPreviewHTML(b)}</div>
      ${conditionEditorHTML(b, branch)}
    </div>`;
  }

  function computeInsertionIndex(canvas, clientY) {
    const blocks = Array.from(canvas.querySelectorAll('.canvas-block'));
    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return blocks.length;
  }

  function showInsertionIndicator(canvas, index) {
    clearInsertionIndicator(canvas);
    const blocks = Array.from(canvas.querySelectorAll('.canvas-block'));
    const indicator = document.createElement('div');
    indicator.className = 'canvas-drop-indicator';
    if (index >= blocks.length) canvas.appendChild(indicator);
    else canvas.insertBefore(indicator, blocks[index]);
  }

  function clearInsertionIndicator(canvas) {
    const el = canvas.querySelector('.canvas-drop-indicator');
    if (el) el.remove();
  }

  function wireBlockBuilder(listEl, restaurant, branchId, screen) {
    ['blocks', 'leadingBlocks'].forEach(listKey => {
      const canvas = listEl.querySelector('#canvas-' + screen.id + '-' + listKey);
      if (!canvas) return;
      const builderRoot = canvas.closest('.block-builder');

      function refresh() { renderFlowList(listEl, restaurant, branchId); }

      canvas.querySelectorAll('.canvas-block').forEach(el => {
        el.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'canvas', blockId: el.dataset.block }));
        });
      });

      canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        showInsertionIndicator(canvas, computeInsertionIndex(canvas, e.clientY));
      });
      canvas.addEventListener('dragleave', (e) => { if (e.target === canvas) clearInsertionIndicator(canvas); });
      canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const insertIndex = computeInsertionIndex(canvas, e.clientY);
        clearInsertionIndicator(canvas);
        let payload;
        try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
        if (payload.source === 'canvas') {
          Store.reorderBlockTo(branchId, screen.id, listKey, payload.blockId, insertIndex);
        } else if (payload.source === 'palette') {
          addPaletteBlockToScreen(branchId, screen.id, listKey, payload, insertIndex);
        }
        refresh();
      });

      canvas.querySelectorAll('[data-move-block]').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.moveBlock(branchId, screen.id, listKey, btn.dataset.block, btn.dataset.moveBlock === 'up' ? -1 : 1);
        refresh();
      }));
      canvas.querySelectorAll('[data-remove-block]').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.removeBlock(branchId, screen.id, listKey, btn.dataset.removeBlock);
        refresh();
      }));
      canvas.querySelectorAll('.block-text-edit').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('change', () => {
          Store.updateBlock(branchId, screen.id, listKey, el.dataset.block, { [el.dataset.field]: el.value });
          showToast('נשמר', 'success');
          refresh();
        });
      });
      canvas.querySelectorAll('.block-response-type').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('change', () => {
          const patch = { responseType: el.value };
          const block = (screen[listKey] || []).find(b => b.id === el.dataset.block);
          if (['buttons', 'dropdown', 'multiselect'].indexOf(el.value) > -1 && (!block || !block.options || !block.options.length)) {
            patch.options = ['אפשרות 1', 'אפשרות 2'];
          }
          Store.updateBlock(branchId, screen.id, listKey, el.dataset.block, patch);
          showToast('סוג המענה עודכן', 'success');
          refresh();
        });
      });
      canvas.querySelectorAll('.block-required').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('change', () => Store.updateBlock(branchId, screen.id, listKey, el.dataset.block, { required: el.checked }));
      });
      canvas.querySelectorAll('.block-options-edit').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('change', () => {
          const options = el.value.split('\n').map(s => s.trim()).filter(Boolean);
          Store.updateBlock(branchId, screen.id, listKey, el.dataset.block, { options });
          refresh();
        });
      });
      canvas.querySelectorAll('.block-condition-key').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('change', () => {
          const key = el.value;
          Store.updateBlock(branchId, screen.id, listKey, el.dataset.block, { condition: key ? { key, equals: '' } : null });
          showToast(key ? 'הותנה בשאלה קודמת' : 'התנאי הוסר - הרכיב יוצג תמיד', 'success');
          refresh();
        });
      });
      canvas.querySelectorAll('.block-condition-value').forEach(el => {
        el.addEventListener('click', (e) => e.stopPropagation());
        el.addEventListener('change', () => {
          const block = (screen[listKey] || []).find(bl => bl.id === el.dataset.block);
          if (!block || !block.condition) return;
          Store.updateBlock(branchId, screen.id, listKey, el.dataset.block, { condition: { key: block.condition.key, equals: el.value } });
          showToast('התנאי נשמר', 'success');
          refresh();
        });
      });

      if (builderRoot) {
        builderRoot.querySelectorAll('.palette-item[draggable="true"]').forEach(el => {
          el.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'palette', kind: el.dataset.kind, tplIndex: parseInt(el.dataset.tplIndex, 10) }));
          });
          el.addEventListener('click', () => {
            addPaletteBlockToScreen(branchId, screen.id, listKey, { kind: el.dataset.kind, tplIndex: parseInt(el.dataset.tplIndex, 10) }, undefined);
            showToast('הרכיב נוסף לקנבס', 'success');
            refresh();
          });
        });
        builderRoot.querySelectorAll('.palette-add-new').forEach(btn => {
          btn.addEventListener('click', () => {
            addBlankBlock(branchId, screen.id, listKey, btn.dataset.kind);
            refresh();
          });
        });
      }
    });
  }

  function addPaletteBlockToScreen(branchId, screenId, listKey, payload, insertIndex) {
    const lib = blockLibrary()[payload.kind + 's'];
    const tpl = lib && lib[payload.tplIndex];
    if (!tpl) return;
    const block = Object.assign({ kind: payload.kind }, JSON.parse(JSON.stringify(tpl.template)));
    Store.addBlock(branchId, screenId, listKey, block, insertIndex);
  }

  function addBlankBlock(branchId, screenId, listKey, kind) {
    let block;
    if (kind === 'question') block = { kind: 'question', key: 'custom_' + Math.random().toString(36).slice(2, 7), label: 'שאלה חדשה...', responseType: 'short-text', required: true };
    else if (kind === 'script') block = { kind: 'script', text: 'טקסט תסריט חדש...' };
    else block = { kind: 'popup', text: 'טקסט פופאפ חדש...' };
    Store.addBlock(branchId, screenId, listKey, block, undefined);
  }

  /* ================= לשונית אוטומציות ================= */

  function renderAutomationsTab(container, restaurant, branch) {
    const rules = Store.getRulesForScope(restaurant.id, branch.id);
    container.innerHTML = `
      <p class="section-sub">חוקים חוצי-מסכים ואוטומציות. אפשר לכבות חוק זמנית או לערוך את נוסח ההודעה לנציגה - השינוי משפיע מיד על תצוגת הנציגה.</p>
      ${rules.length ? rules.map(ruleCardHTML).join('') : '<div class="admin-empty-note">אין אוטומציות המוגדרות עבור סניף זה.</div>'}
    `;

    container.querySelectorAll('.rule-enable-toggle').forEach(t => {
      t.addEventListener('change', () => {
        Store.setRuleEnabled(t.dataset.rule, t.checked);
        showToast(t.checked ? 'האוטומציה הופעלה' : 'האוטומציה כובתה', 'success');
        renderAutomationsTab(container, restaurant, branch);
      });
    });
    container.querySelectorAll('.rule-message-edit').forEach(ta => {
      ta.addEventListener('change', () => {
        Store.updateRuleMessage(ta.dataset.rule, ta.value);
        showToast('נוסח ההודעה נשמר', 'success');
      });
    });
  }

  function ruleCardHTML(rule) {
    const scopeLabel = rule.scope.branchId ? 'סניף זה בלבד' : 'כל סניפי השרשרת';
    const hasVars = rule.message.indexOf('{{') > -1;
    return `
      <div class="rule-card ${rule.enabled === false ? 'is-disabled' : ''}">
        <div class="rule-card-head">
          <span class="rule-kind-badge kind-${rule.kind}">${RULE_KIND_LABEL[rule.kind] || rule.kind}</span>
          <span class="rule-name">${rule.name}</span>
          <span class="rule-scope-badge">${scopeLabel}</span>
          <label class="toggle-switch" title="הפעלה/כיבוי">
            <input type="checkbox" class="rule-enable-toggle" data-rule="${rule.id}" ${rule.enabled !== false ? 'checked' : ''}>
            <span class="toggle-switch-slider"></span>
          </label>
        </div>
        <p style="font-size:11.5px;color:var(--text-faint);margin-bottom:8px;">${rule.triggerNote}</p>
        <span class="field-label">נוסח ההודעה לנציגה</span>
        <textarea class="rule-message-edit" data-rule="${rule.id}">${rule.message}</textarea>
        ${hasVars ? '<p style="font-size:10.5px;color:var(--text-faint);margin-top:4px;">משתנים דינמיים כמו {{gap}} ו-{{min}} יוחלפו אוטומטית בזמן אמת לפי מצב ההזמנה.</p>' : ''}
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
          ${rule.buttons.map(b => `<span class="type-badge">${b.label}</span>`).join('')}
        </div>
      </div>`;
  }

  /* ================= לשונית מרכיבים (קטלוג ברמת מסעדה, זמינות ברמת סניף) ================= */

  function renderIngredientsTab(container, restaurant, branch) {
    container.innerHTML = `
      <p class="section-sub">קטלוג המרכיבים משותף לכל סניפי ${restaurant.name}, אבל הזמינות (מה שנגמר היום) מוגדרת בנפרד לכל סניף - כרגע עבור <strong>${branch.shortName}</strong>. מרכיב "לא זמין היום" עדיין יופיע לנציגה במסך התפריט, אך מסומן ב-✕ ולא ניתן לבחירה - כדי שאפשר יהיה להסביר ללקוח שהוא חסר, בלי להסתיר אותו.</p>
      <div class="ingredient-list" id="ingredient-list"></div>
      <div class="add-ingredient-row">
        <input type="text" class="text-input" id="new-ingredient-input" placeholder="שם מרכיב חדש (יתווסף לקטלוג של כל הסניפים)...">
        <button type="button" class="btn btn-secondary" id="add-ingredient-btn">+ הוספת מרכיב</button>
      </div>
    `;
    renderIngredientList(container.querySelector('#ingredient-list'), restaurant.id, branch.id);

    container.querySelector('#add-ingredient-btn').addEventListener('click', () => {
      const input = container.querySelector('#new-ingredient-input');
      const name = input.value.trim();
      if (!name) return;
      Store.addIngredient(restaurant.id, name);
      input.value = '';
      renderIngredientList(container.querySelector('#ingredient-list'), restaurant.id, branch.id);
      showToast('המרכיב נוסף לקטלוג', 'success');
    });
    container.querySelector('#new-ingredient-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') container.querySelector('#add-ingredient-btn').click();
    });
  }

  function renderIngredientList(listEl, restaurantId, branchId) {
    const ingredients = Store.getIngredientCatalog(restaurantId);
    listEl.innerHTML = ingredients.length ? ingredients.map(ing => {
      const available = Store.isIngredientAvailableAtBranch(branchId, ing.id);
      return `
      <div class="ingredient-row ${!available ? 'is-unavailable' : ''}">
        <span class="ingredient-row-name">${ing.name}${!available ? ' ✕' : ''}</span>
        <span class="ingredient-row-status">${available ? 'זמין' : 'לא זמין היום'}</span>
        <label class="toggle-switch" title="זמין היום בסניף זה">
          <input type="checkbox" class="ingredient-available-toggle" data-ing="${ing.id}" ${available ? 'checked' : ''}>
          <span class="toggle-switch-slider"></span>
        </label>
        <button type="button" class="icon-btn" data-remove-ing="${ing.id}" title="הסרה קבועה מהקטלוג">🗑</button>
      </div>`;
    }).join('') : '<div class="admin-empty-note">אין עדיין מרכיבים מוגדרים למסעדה זו.</div>';

    listEl.querySelectorAll('.ingredient-available-toggle').forEach(t => t.addEventListener('change', () => {
      Store.setIngredientAvailableAtBranch(branchId, t.dataset.ing, t.checked);
      renderIngredientList(listEl, restaurantId, branchId);
      showToast(t.checked ? 'המרכיב סומן כזמין בסניף זה' : 'המרכיב סומן כלא זמין היום בסניף זה', 'success');
    }));
    listEl.querySelectorAll('[data-remove-ing]').forEach(btn => btn.addEventListener('click', () => {
      Store.removeIngredient(restaurantId, btn.dataset.removeIng);
      renderIngredientList(listEl, restaurantId, branchId);
    }));
  }

  /* ================= לשונית אזורי משלוח ================= */

  function renderZonesTab(container, branch) {
    container.innerHTML = `
      <p class="section-sub">לכל אזור משלוח - מינימום הזמנה, דמי משלוח וטווח זמן המתנה משלו. הנציגה תבחר את האזור הרלוונטי כשהלקוח בוחר משלוח.</p>
      <div class="zone-list" id="zone-list"></div>
      <button type="button" class="btn btn-secondary btn-small" id="add-zone-btn">+ הוספת אזור משלוח</button>
    `;
    renderZoneList(container.querySelector('#zone-list'), branch.id);
    container.querySelector('#add-zone-btn').addEventListener('click', () => {
      Store.addDeliveryZone(branch.id, { name: 'אזור חדש' });
      renderZoneList(container.querySelector('#zone-list'), branch.id);
      showToast('אזור המשלוח נוסף', 'success');
    });
  }

  function renderZoneList(listEl, branchId) {
    const zones = Store.getDeliveryZones(branchId);
    listEl.innerHTML = zones.length ? zones.map(z => `
      <div class="zone-card" data-zone="${z.id}">
        <div class="zone-card-row">
          <label>שם האזור<input type="text" class="text-input zone-field" data-zone="${z.id}" data-field="name" value="${escapeAttr(z.name)}"></label>
          <button type="button" class="icon-btn" data-remove-zone="${z.id}" title="הסרת אזור">🗑</button>
        </div>
        <div class="zone-card-row">
          <label>מינימום הזמנה (₪, 0 = אין מינימום)<input type="number" min="0" class="text-input zone-field" data-zone="${z.id}" data-field="minOrder" value="${z.minOrder}"></label>
          <label>דמי משלוח (₪)<input type="number" min="0" class="text-input zone-field" data-zone="${z.id}" data-field="deliveryFee" value="${z.deliveryFee}"></label>
        </div>
        <div class="zone-card-row">
          <label>זמן המתנה מ- (דק')<input type="number" min="0" class="text-input zone-field" data-zone="${z.id}" data-field="waitMin" value="${z.waitMin}"></label>
          <label>זמן המתנה עד (דק')<input type="number" min="0" class="text-input zone-field" data-zone="${z.id}" data-field="waitMax" value="${z.waitMax}"></label>
        </div>
      </div>`).join('') : '<div class="admin-empty-note">לא הוגדרו אזורי משלוח לסניף זה.</div>';

    listEl.querySelectorAll('.zone-field').forEach(el => {
      el.addEventListener('change', () => {
        const field = el.dataset.field;
        const value = (field === 'minOrder' || field === 'deliveryFee' || field === 'waitMin' || field === 'waitMax') ? (parseFloat(el.value) || 0) : el.value;
        Store.updateDeliveryZone(branchId, el.dataset.zone, { [field]: value });
        showToast('אזור המשלוח עודכן', 'success');
      });
    });
    listEl.querySelectorAll('[data-remove-zone]').forEach(btn => btn.addEventListener('click', () => {
      Store.removeDeliveryZone(branchId, btn.dataset.removeZone);
      renderZoneList(listEl, branchId);
      showToast('אזור המשלוח הוסר', 'success');
    }));
  }

  return { mount };
})();
