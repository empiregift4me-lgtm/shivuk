/* ===================================================================
   AdminView - תצוגת מנהל (בסיסית). עריכה חיה של זרימת המסכים
   והאוטומציות, נשמרת ב-Store (localStorage) ומשפיעה מיד על
   תצוגת הנציגה. אין כאן drag-and-drop מלא - סדר משתנה בחיצי מעלה/
   מטה, מה שמספיק כדי להמחיש את הרעיון של "הכול בשליטת המנהל".
=================================================================== */

const AdminView = (function () {
  let mountedRoot = null;
  let selectedRestaurantId = 'japan';
  let selectedBranchId = 'japan-goh';
  let activeSubtab = 'flow'; // 'flow' | 'automations'
  let expandedScreenId = null;

  const SCREEN_ICON = { question: '❓', menu: '🍽️', payment: '💳', summary: '🧾' };
  const SCREEN_TYPE_LABEL = { question: 'שאלה', menu: 'תפריט', payment: 'תשלום', summary: 'סיכום' };
  const RULE_KIND_LABEL = { blocking: 'חוסם', reminder: 'תזכורת', 'guided-choice': 'תסריט מונחה', suggestion: 'הצעה אוטומטית' };

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
      </div>
      <div id="subtab-content"></div>
    `;

    main.querySelectorAll('[data-branch]').forEach(btn => btn.addEventListener('click', () => { selectedBranchId = btn.dataset.branch; expandedScreenId = null; render(); }));
    main.querySelectorAll('[data-subtab]').forEach(btn => btn.addEventListener('click', () => { activeSubtab = btn.dataset.subtab; render(); }));

    const contentEl = main.querySelector('#subtab-content');
    if (activeSubtab === 'flow') renderFlowTab(contentEl, branch);
    else renderAutomationsTab(contentEl, restaurant, branch);
  }

  /* ---------------- flow tab ---------------- */

  function renderFlowTab(container, branch) {
    container.innerHTML = `
      <p class="section-sub">סדר המסכים כפי שהנציגה תראה אותם בשיחה. אפשר לשנות סדר, לכבות מסך זמנית, או ללחוץ על מסך כדי לערוך את תוכנו.</p>
      <div class="flow-list" id="flow-list"></div>
    `;
    renderFlowList(container.querySelector('#flow-list'), branch.id);
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
    listEl.querySelectorAll('[data-move]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.moveScreen(branchId, btn.dataset.screen, btn.dataset.move === 'up' ? -1 : 1);
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
    listEl.querySelectorAll('.question-label-input').forEach(input => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('change', () => {
        Store.updateScreenLabel(branchId, input.dataset.screen, input.value);
        showToast('הטקסט נשמר', 'success');
      });
    });
  }

  function flowCardHTML(s, i, branch) {
    const icon = SCREEN_ICON[s.type] || '📄';
    const isExpanded = expandedScreenId === s.id;
    const title = s.type === 'question' ? (s.dynamic ? 'שאלה דינמית (לפי משלוח/איסוף)' : s.label) : s.title;
    const meta = s.type === 'menu' ? `קטגוריות: ${s.categoryFilter.length}` : (s.type === 'question' ? `מפתח נתון: ${s.key}` : '');
    return `
      <div class="flow-card ${s.enabled === false ? 'is-disabled' : ''}" data-screen="${s.id}">
        <div class="flow-card-head">
          <span class="flow-card-icon">${icon}</span>
          <div style="flex:1;">
            <div class="flow-card-title">${i + 1}. ${title}</div>
            <div class="flow-card-meta">${SCREEN_TYPE_LABEL[s.type]}${meta ? ' · ' + meta : ''}</div>
          </div>
          <div class="flow-card-actions" data-noexpand>
            <button type="button" class="icon-btn" data-move="up" data-screen="${s.id}" ${i === 0 ? 'disabled' : ''} title="הזזה למעלה">▲</button>
            <button type="button" class="icon-btn" data-move="down" data-screen="${s.id}" ${i === branch.flow.length - 1 ? 'disabled' : ''} title="הזזה למטה">▼</button>
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
    if (s.type === 'question') {
      if (s.dynamic) {
        return `<p style="font-size:12.5px;color:var(--text-muted);">שאלה זו מנוסחת אוטומטית לפי התשובה למשלוח/איסוף (״לאן לשלוח לך?״ מול ״אז אתה מגיע לקחת מסניף X?״) - אין טקסט קבוע לעריכה.</p>`;
      }
      return `
        <div class="question-edit-row">
          <span class="field-label">נוסח השאלה</span>
          <input type="text" class="text-input question-label-input" data-screen="${s.id}" value="${(s.label || '').replace(/"/g, '&quot;')}">
          ${s.options ? `<span class="field-label">אפשרויות תשובה</span><div>${s.options.map(o => `<span class="type-badge">${o}</span>`).join(' ')}</div>` : ''}
          ${s.autofill ? `<span class="field-label">✓ תומך בפס השלמה אוטומטית ללקוח מוכר</span>` : ''}
        </div>`;
    }
    if (s.type === 'menu') {
      const catNames = s.categoryFilter.map(c => {
        const cat = Store.data.menuCategories.find(mc => mc.id === c);
        return cat ? cat.name : c;
      });
      return `<div class="question-edit-row">
        <span class="field-label">קטגוריות מוצגות במסך זה</span>
        <div>${catNames.map(n => `<span class="type-badge">${n}</span>`).join(' ')}</div>
        ${s.entryScript ? `<span class="field-label">תסריט פתיחה לנציגה (פופאפ תזכורת חד-פעמי)</span><p style="font-size:13px;">${s.entryScript}</p>` : ''}
      </div>`;
    }
    if (s.type === 'payment') {
      return `<p style="font-size:12.5px;color:var(--text-muted);">מסך תשלום סטנדרטי - כולל אפשרות פיצול בין שני אמצעי תשלום.</p>`;
    }
    return `<p style="font-size:12.5px;color:var(--text-muted);">מסך סיכום - מפיק טקסט חופשי מובנה עם כפתור העתקה, כולל כל התזכורות שהוצגו לנציגה.</p>`;
  }

  /* ---------------- automations tab ---------------- */

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

  return { mount };
})();
