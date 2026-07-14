// מודול "סיכומים" - עמוד כתיבה חופשית בסגנון Google Docs + ארכיון
// מותאם גם לשימוש עם מטפלת: תאריך פגישה נפרד מזמן השמירה, סימון תשלום, והעברת סעיפים שלא סומנו לסיכום הבא

function initSummariesView(container) {
  container.innerHTML = "";
  const wrap = el("div", { class: "module-wrap" });

  const nav = el("div", { class: "sub-tab-nav" });
  const content = el("div", { class: "sub-tab-content" });
  wrap.appendChild(nav);
  wrap.appendChild(content);
  container.appendChild(wrap);

  const SUB_TABS = [
    { id: "write", label: "כתיבה חופשית", render: renderSummaryWriteTab },
    { id: "archive", label: "ארכיונים", render: renderSummaryArchiveTab },
    { id: "payments", label: "תשלומים", render: renderPaymentsTab }
  ];

  function activate(id) {
    nav.querySelectorAll(".sub-tab-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === id));
    const tab = SUB_TABS.find((t) => t.id === id);
    tab.render(content, () => activate("write"));
  }

  nav.innerHTML = "";
  SUB_TABS.forEach((t) => {
    nav.appendChild(
      el("button", {
        type: "button",
        class: "sub-tab-btn",
        "data-tab": t.id,
        text: t.label,
        onclick: () => activate(t.id)
      })
    );
  });

  activate("write");
}

function renderSummaryWriteTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "כתיבה חופשית" }));
  wrap.appendChild(el("p", { class: "panel-subtitle", text: "כתבי כאן חופשי - עם שמירה זה יעבור לארכיון, והדף יתפנה לסיכום הבא." }));

  const draft = loadSummaryDraft();

  const dateRow = el("div", { class: "session-date-row" });
  dateRow.appendChild(el("label", { class: "session-date-label", text: "תאריך הפגישה:" }));
  const dateInput = el("input", { type: "date", class: "field-input session-date-input" });
  dateInput.value = draft.sessionDate || todayISO();
  dateRow.appendChild(dateInput);
  wrap.appendChild(dateRow);

  const editable = el("div", { class: "a4-editor", contenteditable: "true" });
  editable.innerHTML = draft.html || "";

  const toolbar = createRichToolbar(editable);
  wrap.appendChild(toolbar);
  wrap.appendChild(editable);

  const draftStatus = el("p", { class: "draft-status" });
  wrap.appendChild(draftStatus);

  function persistDraft() {
    saveSummaryDraft({ html: editable.innerHTML, sessionDate: dateInput.value || todayISO() });
    draftStatus.textContent = "✓ טיוטה נשמרה אוטומטית";
  }
  const debouncedPersist = debounce(persistDraft, 400);
  editable.addEventListener("input", debouncedPersist);
  dateInput.addEventListener("change", persistDraft);

  wrap.appendChild(
    el("button", {
      class: "btn btn-primary btn-save",
      type: "button",
      text: "שמירה",
      onclick: () => {
        const html = editable.innerHTML.trim();
        if (!html || html === "<br>") {
          alert("אין כאן עדיין תוכן לשמירה.");
          return;
        }
        syncCheckboxAttributes(editable);
        const list = loadSummaries();
        list.push({
          id: "sum_" + Date.now(),
          html: editable.innerHTML,
          sessionDate: dateInput.value || todayISO(),
          paid: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        saveSummaries(list);
        editable.innerHTML = "";
        saveSummaryDraft({ html: "", sessionDate: todayISO() });
        celebrateSave();
        renderSummaryWriteTab(content);
      }
    })
  );

  content.appendChild(wrap);
}

let summaryArchiveOrder = "desc";

function renderSummaryArchiveTab(content, goToWriteTab) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "ארכיונים" }));

  const orderBtn = el("button", {
    class: "btn btn-ghost btn-small archive-order-btn",
    type: "button",
    text: summaryArchiveOrder === "desc" ? "מהחדש לישן ⇅" : "מהישן לחדש ⇅",
    onclick: () => {
      summaryArchiveOrder = summaryArchiveOrder === "desc" ? "asc" : "desc";
      renderSummaryArchiveTab(content, goToWriteTab);
    }
  });
  wrap.appendChild(orderBtn);

  const list = loadSummaries()
    .slice()
    .sort((a, b) => {
      const cmp = (a.sessionDate || "").localeCompare(b.sessionDate || "") || a.createdAt - b.createdAt;
      return summaryArchiveOrder === "desc" ? -cmp : cmp;
    });
  if (list.length === 0) {
    wrap.appendChild(el("div", { class: "empty-state", text: "עדיין אין סיכומים שמורים." }));
    content.appendChild(wrap);
    return;
  }

  list.forEach((item) => {
    const toggleBtn = el("button", { class: "archive-item-toggle", type: "button" }, [
      el("span", { class: "archive-date", text: item.sessionDate ? formatDateHe(item.sessionDate) : formatTimestamp(item.createdAt) }),
      el("span", { class: "paid-badge" + (item.paid ? " is-paid" : ""), text: item.paid ? "💰 שולם" : "לא שולם" }),
      el("span", { class: "archive-chevron", text: "︿" })
    ]);
    toggleBtn.querySelector(".paid-badge").addEventListener("click", (e) => {
      e.stopPropagation();
      const becamePaid = !item.paid;
      item.paid = becamePaid;
      const all = loadSummaries();
      const idx = all.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        all[idx] = item;
        saveSummaries(all);
      }
      if (becamePaid) onSessionMarkedPaidManually();
      renderSummaryArchiveTab(content, goToWriteTab);
    });

    const deleteBtn = el("button", {
      class: "archive-delete",
      type: "button",
      text: "🗑",
      title: "מחיקה לצמיתות",
      onclick: (e) => {
        e.stopPropagation();
        if (confirm("למחוק את הסיכום הזה לצמיתות?")) {
          saveSummaries(loadSummaries().filter((s) => s.id !== item.id));
          renderSummaryArchiveTab(content, goToWriteTab);
        }
      }
    });
    const head = el("div", { class: "archive-item-head" }, [toggleBtn, deleteBtn]);
    const body = el("div", { class: "archive-item-body is-collapsed" });
    let built = false;
    let editing = false;

    function persistItem() {
      const all = loadSummaries();
      const idx = all.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        all[idx] = item;
        saveSummaries(all);
      }
    }

    function buildEditToggle(label) {
      return el("button", {
        class: "btn btn-secondary btn-small",
        type: "button",
        text: label,
        onclick: () => {
          if (editing && bodyEditableRef) {
            syncCheckboxAttributes(bodyEditableRef);
            item.html = bodyEditableRef.innerHTML;
            item.updatedAt = Date.now();
            persistItem();
          }
          editing = !editing;
          buildBody();
        }
      });
    }

    let bodyEditableRef = null;

    function buildBody() {
      body.innerHTML = "";
      const hasUnchecked = hasUncheckedChecklistItems(item.html);

      if (editing) {
        body.appendChild(buildEditToggle("סיום עריכה ✓"));
        bodyEditableRef = el("div", { class: "a4-editor", contenteditable: "true" });
        bodyEditableRef.innerHTML = item.html;
        bodyEditableRef.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.disabled = false));
        body.appendChild(createRichToolbar(bodyEditableRef));
        body.appendChild(bodyEditableRef);
        body.appendChild(buildEditToggle("שמירת שינויים"));
      } else {
        const topRow = el("div", { class: "archive-body-actions" }, [
          buildEditToggle("עריכה ושינוי"),
          el("button", {
            class: "btn btn-secondary btn-small",
            type: "button",
            text: "ייצוא ל-PDF",
            onclick: () => exportSummaryToPDF(item)
          })
        ]);
        body.appendChild(topRow);
        const view = el("div", { class: "a4-editor a4-editor-readonly" });
        view.innerHTML = item.html;
        view.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.disabled = true));
        body.appendChild(view);
        if (hasUnchecked) {
          body.appendChild(
            el("button", {
              class: "btn btn-ghost btn-small",
              type: "button",
              text: "➡ העברת סעיפים שלא סומנו לסיכום הבא",
              onclick: () => {
                if (!confirm("הסעיפים שלא סומנו יוסרו מהסיכום הזה ויעברו לטיוטת הכתיבה החופשית. להמשיך?")) return;
                moveUncheckedToDraft(item, persistItem, () => {
                  renderSummaryArchiveTab(content, goToWriteTab);
                  goToWriteTab();
                });
              }
            })
          );
        }
        body.appendChild(buildEditToggle("עריכה ושינוי"));
      }
    }

    toggleBtn.addEventListener("click", () => {
      const collapsed = body.classList.toggle("is-collapsed");
      head.querySelector(".archive-chevron").textContent = collapsed ? "﹀" : "︿";
      if (!collapsed && !built) {
        buildBody();
        built = true;
      }
    });

    const card = el("div", { class: "archive-item" }, [head, body]);
    wrap.appendChild(card);
  });

  content.appendChild(wrap);
}

function renderPaymentsTab(content) {
  content.innerHTML = "";
  const wrap = el("div", { class: "panel" });
  wrap.appendChild(el("h2", { class: "panel-title", text: "תשלומים" }));
  wrap.appendChild(
    el("p", {
      class: "panel-subtitle",
      text: `מעקב חוב מול פגישות שלא סומנו כשולמו, לפי תעריף קבוע של ${SESSION_RATE} ₪ לפגישה.`
    })
  );

  const summary = computeDebtSummary();
  const debtBox = el("div", { class: "debt-summary" }, [
    el("div", { class: "debt-amount", text: `${summary.debt} ₪ לתשלום` }),
    el("p", {
      class: "debt-sub",
      text: `${summary.unpaidCount} פגישות לא משולמות × ${SESSION_RATE} ₪ = ${summary.totalOwed} ₪ | יתרת זכות שטרם שויכה: ${summary.pool} ₪`
    })
  ]);
  wrap.appendChild(debtBox);

  const entryRow = el("div", { class: "payment-entry-row" });
  const amountInput = el("input", { type: "number", min: "1", class: "field-input payment-amount-input", placeholder: "סכום ששולם (₪)" });
  entryRow.appendChild(amountInput);
  entryRow.appendChild(
    el("button", {
      class: "btn btn-primary",
      type: "button",
      text: "רישום תשלום",
      onclick: () => {
        const amount = Number(amountInput.value);
        if (!amount || amount <= 0) {
          alert("יש להזין סכום תקין.");
          return;
        }
        logPayment(amount);
        renderPaymentsTab(content);
      }
    })
  );
  wrap.appendChild(entryRow);

  wrap.appendChild(el("h3", { class: "panel-title", text: "היסטוריית תשלומים" }));
  const ledger = loadPaymentLedger();
  const history = el("div", { class: "payment-history" });
  const log = ledger.log.slice().sort((a, b) => b.timestamp - a.timestamp);
  if (log.length === 0) {
    history.appendChild(el("div", { class: "empty-state", text: "עדיין לא נרשמו תשלומים." }));
  } else {
    log.forEach((entry) => {
      const row = el("div", { class: "payment-history-row" }, [
        el("span", { class: "payment-history-date", text: formatTimestamp(entry.timestamp) }),
        el("span", { text: `${entry.amount} ₪` }),
        el("button", {
          class: "archive-delete",
          type: "button",
          text: "🗑",
          title: "מחיקת רשומת תשלום",
          onclick: () => {
            if (confirm("למחוק את רשומת התשלום הזו?")) {
              deletePaymentLogEntry(entry.id);
              renderPaymentsTab(content);
            }
          }
        })
      ]);
      history.appendChild(row);
    });
  }
  wrap.appendChild(history);

  content.appendChild(wrap);
}

function exportSummaryToPDF(item) {
  const printRoot = el("div", { class: "day-card summary-print-root" });
  const header = el("div", { class: "day-header" });
  header.appendChild(el("div", { class: "day-date", text: item.sessionDate ? formatDateHe(item.sessionDate) : formatTimestamp(item.createdAt) }));
  printRoot.appendChild(header);
  const body = el("div", { class: "a4-editor a4-editor-readonly" });
  body.innerHTML = item.html;
  body.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.disabled = true));
  printRoot.appendChild(body);
  printRoot.style.position = "fixed";
  printRoot.style.left = "-9999px";
  printRoot.style.top = "0";
  printRoot.style.width = "700px";
  document.body.appendChild(printRoot);
  exportElementToPDF(printRoot, `סיכום-${item.sessionDate || todayISO()}`, null, () => printRoot.remove());
}

function hasUncheckedChecklistItems(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return Array.from(temp.querySelectorAll(".checklist-line")).some((block) => {
    const checkbox = block.querySelector('input[type="checkbox"]');
    return checkbox && !checkbox.hasAttribute("checked");
  });
}

// מעבירה (לא מעתיקה) סעיפי V שלא סומנו מסיכום שמור לטיוטת הכתיבה החופשית, באותו עיצוב
function moveUncheckedToDraft(item, persistItem, onDone) {
  const temp = document.createElement("div");
  temp.innerHTML = item.html;

  const leftovers = [];
  temp.querySelectorAll(".checklist-line").forEach((block) => {
    const checkbox = block.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.hasAttribute("checked")) {
      leftovers.push(block);
      block.remove();
    }
  });

  if (leftovers.length === 0) return;

  item.html = temp.innerHTML;
  item.updatedAt = Date.now();
  persistItem();

  const draft = loadSummaryDraft();
  const draftContainer = document.createElement("div");
  draftContainer.innerHTML = draft.html || "";
  leftovers.forEach((block) => draftContainer.appendChild(block));
  saveSummaryDraft({ html: draftContainer.innerHTML, sessionDate: draft.sessionDate || todayISO() });

  onDone();
}
