/* ===================================================================
   AdminView - תצוגת מנהל. בונה מסכים בגרירה-ושחרור: פלטת רכיבים
   מובנים (שאילתות/תסריטים/פופאפים) מימין, קנבס WYSIWYG משמאל. גם
   לחיצה (לא רק גרירה) מוסיפה רכיב - כדי שהבנייה תמיד תהיה אמינה.
   לשונית אוטומציות ולשונית מרכיבים (ברמת מסעדה) משלימות את התמונה.
=================================================================== */

const AdminView = (function () {
  let mountedRoot = null;
  let selectedRestaurantId = 'japan';
  let selectedBranchId = 'japan-goh';
  let activeSubtab = 'flow'; // 'flow' | 'automations' | 'ingredients'
  let expandedScreenId = null;

  const SCREEN_ICON = { question: '❓', menu: '🍽️', payment: '💳', summary: '🧾' };
  const SCREEN_TYPE_LABEL = { question: 'שאלה', menu: 'תפריט', payment: 'תשלום', summary: 'סיכום' };
  const RULE_KIND_LABEL = { blocking: 'חוסם', reminder: 'תזכורת', 'guided-choice': 'תסריט מונחה', suggestion: 'הצעה אוטומטית' };
  const RESPONSE_TYPE_LABEL = { 'short-text': 'תשובה קצרה', buttons: 'כפתורי בחירה', dropdown: 'תפריט נפתח', multiselect: 'בחירה מרובה', 'dynamic-fulfillment': 'מנוסח אוטומטית', 'timing-slots': 'כפתורים + בורר שעה' };
  const BLOCK_KIND_ICON = { script: '🗣️', popup: '💬', question: '❓' };

  function escapeAttr(str) {
    return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      <div class="subtabs" id="subtabs">
        <button type="button" class="subtab ${activeSubtab === 'flow' ? 'is-active' : ''}" data-subtab="flow">🧭 זרימת מסכים</button>
        <button type="button" class="subtab ${activeSubtab === 'automations' ? 'is-active' : ''}" data-subtab="automations">⚡ אוטומציות</button>
        <button type="button" class="subtab ${activeSubtab === 'ingredients' ? 'is-active' : ''}" data-subtab="ingredients">🥗 מרכיבים</button>
      </div>
      <div id="subtab-content"></div>
    `;

    main.querySelectorAll('[data-branch]').forEach(btn => btn.addEventListener('click', () => { selectedBranchId = btn.dataset.branch; expandedScreenId = null; render(); }));
    main.querySelectorAll('[data-subtab]').forEach(btn => btn.addEventListener('click', () => { activeSubtab = btn.dataset.subtab; render(); }));

    const contentEl = main.querySelector('#subtab-content');
    if (activeSubtab === 'flow') renderFlowTab(contentEl, branch.id);
    else if (activeSubtab === 'automations') renderAutomationsTab(contentEl, restaurant, branch);
    else renderIngredientsTab(contentEl, restaurant);
  }

  /* ================= לשונית זרימת מסכים ================= */

  function renderFlowTab(container, branchId) {
    container.innerHTML = `
      <p class="section-sub">סדר המסכים כפי שהנציגה תראה אותם בשיחה. לחצי על מסך כדי לפתוח את בנאי הרכיבים שלו - גוררים (או לוחצים) שאילתות/תסריטים/פופאפים מהפלטה אל הקנבס, ורואים בדיוק איך זה ייראה.</p>
      <div class="flow-list" id="flow-list"></div>
    `;
    renderFlowList(container.querySelector('#flow-list'), branchId);
  }

  function renderFlowList(listEl, branchId) {
    const branch = Store.findBranchById(branchId).branch;
    listEl.innerHTML = branch.flow.map((s, i) => flowCardHTML(s, i, branch)).join('');

    listEl.querySelectorAll('.flow-card-head').forEach(head => {
      head.addEventListener('click', (e) => {
        if (e.target.closest('[data-noexpand]')) return;
        const id = head.closest('.flow-card').dataset.screen;
        expandedScreenId = expandedScreenId === id ? null : id;
        renderFlowList(listEl, branchId);
      });
    });
    listEl.querySelectorAll('[data-move-screen]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.moveScreen(branchId, btn.dataset.screen, btn.dataset.moveScreen === 'up' ? -1 : 1);
        renderFlowList(listEl, branchId);
        showToast('סדר המסכים עודכן', 'success');
      });
    });
    listEl.querySelectorAll('.screen-enable-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => e.stopPropagation());
      toggle.addEventListener('change', (e) => {
        Store.setScreenEnabled(branchId, toggle.dataset.screen, toggle.checked);
        showToast(toggle.checked ? 'המסך הופעל' : 'המסך כובה', 'success');
        renderFlowList(listEl, branchId);
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
    if (expandedScreen) wireBlockBuilder(listEl, branchId, expandedScreen);
  }

  function flowCardHTML(s, i, branch) {
    const icon = SCREEN_ICON[s.type] || '📄';
    const isExpanded = expandedScreenId === s.id;
    const blockCount = (s.blocks || []).length + (s.leadingBlocks || []).length;
    const meta = s.type === 'menu' ? `קטגוריות: ${s.categoryFilter.length} · רכיבי פתיחה: ${(s.leadingBlocks || []).length}` : `${blockCount} רכיבים`;
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
        ${isExpanded ? `<div class="flow-card-body">${flowCardBodyHTML(s)}</div>` : ''}
      </div>`;
  }

  function flowCardBodyHTML(s) {
    const titleRow = `
      <div class="question-edit-row">
        <span class="field-label">כותרת המסך (לתצוגת מנהל בלבד)</span>
        <input type="text" class="text-input screen-title-input" data-screen="${s.id}" value="${escapeAttr(s.title || '')}">
      </div>`;

    if (s.type === 'question') {
      return titleRow + blockBuilderHTML(s, 'blocks', true);
    }
    if (s.type === 'menu') {
      const catNames = s.categoryFilter.map(c => {
        const cat = Store.data.menuCategories.find(mc => mc.id === c);
        return cat ? cat.name : c;
      });
      return titleRow + `<div class="question-edit-row">
        <span class="field-label">קטגוריות מוצגות במסך זה</span>
        <div>${catNames.map(n => `<span class="type-badge">${n}</span>`).join(' ')}</div>
      </div>` + blockBuilderHTML(s, 'leadingBlocks', false);
    }
    if (s.type === 'payment') {
      return titleRow + `<p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">מסך תשלום סטנדרטי - כולל אפשרות פיצול בין שני אמצעי תשלום.</p>` + blockBuilderHTML(s, 'leadingBlocks', false);
    }
    return titleRow + `<p style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">מסך סיכום - מפיק טקסט חופשי מובנה עם כפתור העתקה, כולל כל התזכורות שהוצגו לנציגה.</p>` + blockBuilderHTML(s, 'leadingBlocks', false);
  }

  /* ---------------- בנאי הגרירה-ושחרור ---------------- */

  function blockBuilderHTML(screen, listKey, includeQuestions) {
    const blocks = screen[listKey] || [];
    const lib = Store.data.blockLibrary;
    return `
      <div class="block-builder">
        <div class="block-canvas" id="canvas-${screen.id}-${listKey}" data-screen="${screen.id}" data-listkey="${listKey}">
          ${blocks.length ? blocks.map((b, i) => canvasBlockHTML(b, i, blocks.length)).join('') : '<div class="canvas-empty-note">גררי לכאן שאילתה, תסריט או פופאפ מהפלטה - או לחצי על פריט בפלטה כדי להוסיף.</div>'}
        </div>
        <div class="block-palette">
          ${includeQuestions ? paletteSectionHTML('שאילתות מובנות', 'question', lib.questions) : ''}
          ${paletteSectionHTML('תסריטים מובנים', 'script', lib.scripts)}
          ${paletteSectionHTML('פופאפים מובנים', 'popup', lib.popups)}
        </div>
      </div>`;
  }

  function paletteSectionHTML(title, kind, items) {
    return `
      <div class="palette-section">
        <div class="palette-section-title">${title}</div>
        <div class="palette-items">
          ${items.map((tpl, i) => `<div class="palette-item" draggable="true" data-kind="${kind}" data-tpl-index="${i}">${BLOCK_KIND_ICON[kind]} ${tpl.label}</div>`).join('')}
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

  function canvasBlockHTML(b, index, total) {
    const moveButtons = `
      <button type="button" class="icon-btn" data-move-block="up" data-block="${b.id}" ${index === 0 ? 'disabled' : ''} title="הזזה למעלה">▲</button>
      <button type="button" class="icon-btn" data-move-block="down" data-block="${b.id}" ${index === total - 1 ? 'disabled' : ''} title="הזזה למטה">▼</button>
      <button type="button" class="icon-btn" data-remove-block="${b.id}" title="הסרה">🗑</button>`;

    if (b.kind === 'script' || b.kind === 'popup') {
      return `<div class="canvas-block canvas-block-${b.kind}" draggable="true" data-block="${b.id}">
        <div class="canvas-block-head">
          <span class="canvas-block-type">${BLOCK_KIND_ICON[b.kind]} ${b.kind === 'script' ? 'תסריט (טקסט מוטמע במסך)' : 'פופאפ (חד-פעמי בכניסה למסך)'}</span>
          <div class="canvas-block-actions" data-noexpand>${moveButtons}</div>
        </div>
        <textarea class="block-text-edit" data-block="${b.id}" data-field="text">${b.text}</textarea>
      </div>`;
    }

    const isDynamic = !!b.dynamic;
    const hasOptions = ['buttons', 'dropdown', 'multiselect'].indexOf(b.responseType) > -1;
    return `<div class="canvas-block canvas-block-question" draggable="true" data-block="${b.id}">
      <div class="canvas-block-head">
        <span class="canvas-block-type">❓ שאילתה${b.required === false ? ' (לא חובה)' : ''}</span>
        <div class="canvas-block-actions" data-noexpand>${moveButtons}</div>
      </div>
      ${isDynamic
        ? `<p style="font-size:12px;color:var(--text-muted);">נוסח אוטומטית לפי התשובה למשלוח/איסוף (״לאן לשלוח לך?״ / ״אז אתה מגיע לקחת מסניף X?״).</p>`
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

  function wireBlockBuilder(listEl, branchId, screen) {
    ['blocks', 'leadingBlocks'].forEach(listKey => {
      const canvas = listEl.querySelector('#canvas-' + screen.id + '-' + listKey);
      if (!canvas) return;
      const builderRoot = canvas.closest('.block-builder');

      function refresh() { renderFlowList(listEl, branchId); }

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

      if (builderRoot) {
        builderRoot.querySelectorAll('.palette-item[draggable="true"]').forEach(el => {
          el.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'palette', kind: el.dataset.kind, tplIndex: parseInt(el.dataset.tplIndex, 10) }));
          });
          el.addEventListener('click', () => {
            addPaletteBlockToScreen(branchId, screen.id, listKey, { kind: el.dataset.kind, tplIndex: parseInt(el.dataset.tplIndex, 10) }, undefined);
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
    const lib = Store.data.blockLibrary[payload.kind + 's'];
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

  /* ================= לשונית מרכיבים ================= */

  function renderIngredientsTab(container, restaurant) {
    container.innerHTML = `
      <p class="section-sub">רשימת המרכיבים הבסיסיים של ${restaurant.name}. מרכיב שמסומן "לא זמין היום" עדיין יופיע לנציגה במסך התפריט, אך מסומן ב-✕ ולא ניתן לבחירה - כדי שאפשר יהיה להסביר ללקוח שהוא חסר היום, בלי להסתיר אותו.</p>
      <div class="ingredient-list" id="ingredient-list"></div>
      <div class="add-ingredient-row">
        <input type="text" class="text-input" id="new-ingredient-input" placeholder="שם מרכיב חדש...">
        <button type="button" class="btn btn-secondary" id="add-ingredient-btn">+ הוספת מרכיב</button>
      </div>
    `;
    renderIngredientList(container.querySelector('#ingredient-list'), restaurant.id);

    container.querySelector('#add-ingredient-btn').addEventListener('click', () => {
      const input = container.querySelector('#new-ingredient-input');
      const name = input.value.trim();
      if (!name) return;
      Store.addIngredient(restaurant.id, name);
      input.value = '';
      renderIngredientList(container.querySelector('#ingredient-list'), restaurant.id);
      showToast('המרכיב נוסף', 'success');
    });
    container.querySelector('#new-ingredient-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') container.querySelector('#add-ingredient-btn').click();
    });
  }

  function renderIngredientList(listEl, restaurantId) {
    const ingredients = Store.getIngredients(restaurantId);
    listEl.innerHTML = ingredients.length ? ingredients.map(ing => `
      <div class="ingredient-row ${!ing.available ? 'is-unavailable' : ''}">
        <span class="ingredient-row-name">${ing.name}${!ing.available ? ' ✕' : ''}</span>
        <span class="ingredient-row-status">${ing.available ? 'זמין' : 'לא זמין היום'}</span>
        <label class="toggle-switch" title="זמין היום">
          <input type="checkbox" class="ingredient-available-toggle" data-ing="${ing.id}" ${ing.available ? 'checked' : ''}>
          <span class="toggle-switch-slider"></span>
        </label>
        <button type="button" class="icon-btn" data-remove-ing="${ing.id}" title="הסרה קבועה מהרשימה">🗑</button>
      </div>
    `).join('') : '<div class="admin-empty-note">אין עדיין מרכיבים מוגדרים למסעדה זו.</div>';

    listEl.querySelectorAll('.ingredient-available-toggle').forEach(t => t.addEventListener('change', () => {
      Store.setIngredientAvailable(restaurantId, t.dataset.ing, t.checked);
      renderIngredientList(listEl, restaurantId);
      showToast(t.checked ? 'המרכיב סומן כזמין' : 'המרכיב סומן כלא זמין היום', 'success');
    }));
    listEl.querySelectorAll('[data-remove-ing]').forEach(btn => btn.addEventListener('click', () => {
      Store.removeIngredient(restaurantId, btn.dataset.removeIng);
      renderIngredientList(listEl, restaurantId);
    }));
  }

  return { mount };
})();
