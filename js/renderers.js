// בונה את ה-DOM עבור כל סוג תרגיל, וקורא בחזרה את הערכים שהוזנו

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => c && node.appendChild(c));
  return node;
}

function pickRandom(bank, count) {
  const idx = bank.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count);
}

// היחס המקסימלי מגובה המסך שבו מרשים לשורת ההקלדה האחרונה להגיע - כדי שהיא לא תידבק ממש
// לקצה התחתון של המסך (שזו התנהגות ברירת המחדל של הדפדפן כשתיבת טקסט גדלה תוך כדי הקלדה)
const AUTO_TEXTAREA_MAX_BOTTOM_RATIO = 0.72;

function makeAutoTextarea(value, placeholder, rows, readOnly) {
  const ta = el("textarea", { class: "field-textarea", rows: String(rows), placeholder: placeholder || "" });
  ta.value = value || "";
  ta.disabled = !!readOnly;
  ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
    // גוברים על גלילת ברירת המחדל של הדפדפן (שדוחפת את שורת הסמן ממש לקצה התחתון) - במקום זה
    // משאירים תמיד מרווח נשימה מתחת לשורה הנוכחית
    const bottomLimit = window.innerHeight * AUTO_TEXTAREA_MAX_BOTTOM_RATIO;
    const rect = ta.getBoundingClientRect();
    if (rect.bottom > bottomLimit) {
      window.scrollBy(0, rect.bottom - bottomLimit);
    }
  });
  return ta;
}

const RENDERERS = {
  freetext(instance, data, readOnly) {
    const cfg = instance.config;
    const value = (data && data.text) || "";
    const wrap = el("div", { class: "exercise-body" });
    if (cfg.note) wrap.appendChild(el("p", { class: "exercise-note", text: cfg.note }));
    const ta = makeAutoTextarea(value, cfg.placeholder, cfg.rows, readOnly);
    wrap.appendChild(ta);
    return { el: wrap, getData: () => ({ text: ta.value }) };
  },

  "dynamic-list"(instance, data, readOnly) {
    const cfg = instance.config;
    const emptyRow = cfg.splitReason ? { action: "", reason: "" } : "";
    const items = (data && data.items && data.items.length ? data.items : [emptyRow]).slice();
    const wrap = el("div", { class: "exercise-body" });
    if (cfg.topLabel) wrap.appendChild(el("p", { class: "exercise-note", text: cfg.topLabel }));
    const list = el("div", { class: "dynamic-list" });
    wrap.appendChild(list);

    const countLabel = cfg.showCount ? el("p", { class: "dynamic-list-count" }) : null;
    if (countLabel) wrap.appendChild(countLabel);

    // סופרים שורות עם תוכן (לא הזנות בודדות) - כדי שבמתכונת "פעולה + כי + סיבה" שורה אחת לא תיספר פעמיים
    function filledCount() {
      return Array.from(list.children).filter((row) => Array.from(row.querySelectorAll("input")).some((i) => i.value.trim().length)).length;
    }

    function updateCount() {
      if (countLabel) countLabel.textContent = `${filledCount()} הזנות התקבלו`;
    }

    function addRow(val) {
      if (list.children.length >= (cfg.maxLines || 50)) return null;
      const row = el("div", { class: "dynamic-row" + (cfg.splitReason ? " has-reason" : "") });
      if (cfg.rowIcon) row.appendChild(el("span", { class: "row-icon", text: cfg.rowIcon }));
      if (cfg.rowPrefixText) row.appendChild(el("span", { class: "sentence-prefix", text: cfg.rowPrefixText }));

      // תאימות לאחור: רשומות ישנות שנשמרו כמחרוזת פשוטה (לפני הוספת "כי") ממשיכות להיות מוצגות
      // במלואן בשדה הפעולה, בלי לאבד תוכן, גם אם התרגיל עכשיו מוגדר עם splitReason
      const isLegacyString = typeof val === "string";
      const actionVal = cfg.splitReason ? (isLegacyString ? val : val && val.action) : val;

      const actionInput = el("input", { type: "text", class: "field-input", placeholder: cfg.placeholder || "" });
      actionInput.value = actionVal || "";
      actionInput.disabled = !!readOnly;
      actionInput.addEventListener("input", updateCount);
      row.appendChild(actionInput);

      let reasonInput = null;
      if (cfg.splitReason) {
        row.appendChild(el("span", { class: "reason-label", text: "כי" }));
        reasonInput = el("input", { type: "text", class: "field-input", placeholder: cfg.reasonPlaceholder || "" });
        reasonInput.value = (isLegacyString ? "" : val && val.reason) || "";
        reasonInput.disabled = !!readOnly;
        reasonInput.addEventListener("input", updateCount);
        row.appendChild(reasonInput);
      }

      function focusNextOrNewRow() {
        const isLast = row === list.lastElementChild;
        if (isLast) {
          const newRow = addRow(emptyRow);
          if (newRow) newRow.querySelector("input").focus();
        } else {
          const next = row.nextElementSibling;
          if (next) next.querySelector("input").focus();
        }
      }

      actionInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (reasonInput) reasonInput.focus();
        else focusNextOrNewRow();
      });
      if (reasonInput) {
        reasonInput.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          focusNextOrNewRow();
        });
      }

      if (!readOnly) {
        row.appendChild(
          el("button", {
            class: "row-remove",
            type: "button",
            text: "×",
            title: "מחיקת שורה",
            onclick: () => {
              if (list.children.length > 1) row.remove();
              else {
                actionInput.value = "";
                if (reasonInput) reasonInput.value = "";
              }
              updateCount();
            }
          })
        );
      }
      list.appendChild(row);
      return row;
    }

    items.forEach((v) => addRow(v));
    updateCount();

    const trailingInputs = [];
    if (cfg.trailingFields && cfg.trailingFields.length) {
      const trailingData = (data && data.trailing) || {};
      const trailingWrap = el("div", { class: "dynamic-list-trailing" });
      cfg.trailingFields.forEach((field) => {
        const input = el("input", { type: "text", class: "field-input", placeholder: field.placeholder || "" });
        input.value = trailingData[field.key] || "";
        input.disabled = !!readOnly;
        // תווית + שדה על אותה שורה (כמו המשך טבעי של שורה, לא כותרת שאלה מודגשת) - עוטפים גם אם
        // התווית ארוכה ולא נכנסת, כדי שיישאר קריא במסכים צרים
        trailingWrap.appendChild(el("div", { class: "trailing-field-row" }, [el("span", { class: "trailing-field-label", text: field.label }), input]));
        trailingInputs.push({ key: field.key, input });
      });
      wrap.appendChild(trailingWrap);
    }

    return {
      el: wrap,
      getData: () => {
        const result = {
          items: Array.from(list.children)
            .map((row) => {
              if (cfg.splitReason) {
                const inputs = row.querySelectorAll("input");
                return { action: inputs[0].value.trim(), reason: inputs[1].value.trim() };
              }
              return row.querySelector("input").value.trim();
            })
            .filter((item) => (cfg.splitReason ? item.action || item.reason : item.length))
        };
        if (trailingInputs.length) {
          result.trailing = {};
          trailingInputs.forEach(({ key, input }) => {
            result.trailing[key] = input.value;
          });
        }
        return result;
      }
    };
  },

  "quotes-random"(instance, data, readOnly) {
    const cfg = instance.config;
    const bank = cfg.bankId ? getEnabledQuoteBank(cfg.bankId) : cfg.bank;
    const wrap = el("div", { class: "exercise-body quotes-grid" + (cfg.variant ? ` quotes-grid--${cfg.variant}` : "") });
    if (cfg.bankId && !bank.length) {
      wrap.appendChild(el("p", { class: "exercise-note", text: "כל המשפטים בבנק הזה כבויים כרגע - אפשר להפעיל אותם מחדש ב\"הגדרות\"." }));
      return { el: wrap, getData: () => ({ selected: [] }) };
    }
    let selected = data && data.selected;
    if (!selected || !selected.length) {
      selected = cfg.bankId ? pickIndicesFromBank(cfg.bankId, cfg.count) : pickRandom(bank, cfg.count);
    }
    selected = selected.filter((i) => i < bank.length);
    selected.forEach((i) => {
      wrap.appendChild(el("div", { class: "quote-card" + (cfg.variant ? ` quote-card--${cfg.variant}` : ""), text: bank[i] }));
    });
    return { el: wrap, getData: () => ({ selected }) };
  },

  "table-2col"(instance, data, readOnly) {
    const cfg = instance.config;
    const rows = (data && data.rows && data.rows.length ? data.rows : [{ r: "", l: "" }]).slice();
    const wrap = el("div", { class: "exercise-body" });
    const table = el("table", { class: "goal-table" });
    const thead = el("tr", {}, [
      cfg.numbered ? el("th", { class: "num-col", text: "#" }) : null,
      el("th", { text: cfg.rightHeader }),
      el("th", { text: cfg.leftHeader })
    ]);
    table.appendChild(el("thead", {}, thead));
    const tbody = el("tbody");
    table.appendChild(tbody);
    wrap.appendChild(table);

    function addRow(r, l) {
      if (tbody.children.length >= (cfg.maxRows || 15)) return;
      const tr = el("tr");
      if (cfg.numbered) tr.appendChild(el("td", { class: "num-col", text: String(tbody.children.length + 1) }));
      const rInput = makeAutoTextarea(r, "", 1, readOnly);
      rInput.classList.add("table-cell-textarea");
      const lInput = makeAutoTextarea(l, "", 1, readOnly);
      lInput.classList.add("table-cell-textarea");
      tr.appendChild(el("td", {}, rInput));
      tr.appendChild(el("td", {}, lInput));
      tbody.appendChild(tr);
    }
    rows.forEach((row) => addRow(row.r, row.l));

    if (!readOnly) {
      const addBtn = el("button", {
        class: "btn btn-ghost btn-small",
        type: "button",
        text: "+ הוספת שורה",
        onclick: () => addRow("", "")
      });
      wrap.appendChild(addBtn);
    }

    return {
      el: wrap,
      getData: () => ({
        rows: Array.from(tbody.querySelectorAll("tr")).map((tr) => {
          const textareas = tr.querySelectorAll("textarea");
          return { r: textareas[0].value, l: textareas[1].value };
        })
      })
    };
  },

  "fixed-lines"(instance, data, readOnly) {
    const cfg = instance.config;
    const values = (data && data.values) || [];
    const wrap = el("div", { class: "exercise-body" });
    if (cfg.note) wrap.appendChild(el("p", { class: "exercise-note", text: cfg.note }));
    const inputs = [];
    for (let i = 0; i < cfg.count; i++) {
      const input = el("input", { type: "text", class: "field-input line-input", placeholder: cfg.placeholder || "" });
      input.value = values[i] || "";
      input.disabled = !!readOnly;
      wrap.appendChild(input);
      inputs.push(input);
    }
    return { el: wrap, getData: () => ({ values: inputs.map((i) => i.value) }) };
  },

  "sentence-challenge"(instance, data, readOnly) {
    const cfg = instance.config;
    const bank = cfg.bankId ? getEnabledQuoteBank(cfg.bankId) : cfg.bank;
    const wrap = el("div", { class: "exercise-body" });
    if (cfg.bankId && !bank.length) {
      wrap.appendChild(el("p", { class: "exercise-note", text: "כל המשפטים בבנק הזה כבויים כרגע - אפשר להפעיל אותם מחדש ב\"הגדרות\"." }));
      return { el: wrap, getData: () => ({ sentenceIdx: null, completions: [] }) };
    }
    function pickOne() {
      return cfg.bankId ? pickIndicesFromBank(cfg.bankId, 1)[0] : pickRandom(bank, 1)[0];
    }
    let sentenceIdx = data && typeof data.sentenceIdx === "number" && data.sentenceIdx < bank.length ? data.sentenceIdx : pickOne();
    let completions = (data && data.completions) || [];

    const rowsWrap = el("div", { class: "sentence-rows" });
    const inputs = [];

    function build() {
      rowsWrap.innerHTML = "";
      inputs.length = 0;
      for (let i = 0; i < cfg.repeats; i++) {
        const row = el("div", { class: "sentence-row" });
        row.appendChild(el("span", { class: "sentence-prefix", text: bank[sentenceIdx] }));
        const input = el("input", { type: "text", class: "field-input", placeholder: "" });
        input.value = completions[i] || "";
        input.disabled = !!readOnly;
        row.appendChild(input);
        rowsWrap.appendChild(row);
        inputs.push(input);
      }
    }
    build();
    wrap.appendChild(rowsWrap);

    if (!readOnly) {
      const rerollBtn = el("button", {
        class: "btn btn-ghost btn-small",
        type: "button",
        text: "משפט חדש",
        onclick: () => {
          sentenceIdx = pickOne();
          completions = [];
          build();
        }
      });
      wrap.appendChild(rerollBtn);
    }

    return {
      el: wrap,
      getData: () => ({ sentenceIdx, completions: inputs.map((i) => i.value) })
    };
  },

  "identity-prefix"(instance, data, readOnly) {
    const cfg = instance.config;
    const wrap = el("div", { class: "exercise-body" });
    const row = el("div", { class: "identity-row" });
    row.appendChild(el("span", { class: "sentence-prefix", text: cfg.prefix }));
    const ta = makeAutoTextarea((data && data.text) || "", "", 2, readOnly);
    row.appendChild(ta);
    wrap.appendChild(row);
    return { el: wrap, getData: () => ({ text: ta.value }) };
  },

  "evidence-list"(instance, data, readOnly) {
    const cfg = instance.config;
    const blocks = (data && data.blocks) || [];
    const wrap = el("div", { class: "exercise-body" });
    const list = el("div", { class: "evidence-list" });
    wrap.appendChild(list);
    const actionsRow = el("div", { class: "evidence-actions-row" });

    function addBlock(html) {
      const block = el("div", { class: "evidence-block" });
      const editable = el("div", { class: "evidence-editable", contenteditable: readOnly ? "false" : "true" });
      editable.innerHTML = html || "";
      if (!readOnly) {
        const fileInput = el("input", { type: "file", accept: "image/*", hidden: "hidden" });
        fileInput.addEventListener("change", () => {
          const file = fileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const img = document.createElement("img");
            img.src = reader.result;
            img.className = "evidence-image";
            editable.appendChild(img);
            fileInput.value = "";
          };
          reader.readAsDataURL(file);
        });
        const toolbar = el("div", { class: "evidence-toolbar" }, [
          el("button", { type: "button", class: "tb-btn", text: "📷 הוספת תמונה", title: "העלאת צילום מסך או תמונה", onclick: () => fileInput.click() }),
          fileInput
        ]);
        block.appendChild(toolbar);
      }
      block.appendChild(editable);
      if (!readOnly) {
        const removeBtn = el("button", { class: "btn btn-ghost btn-small", type: "button", text: "הסרת ראיה" });
        removeBtn.addEventListener("click", () => {
          block.remove();
          removeBtn.remove();
        });
        actionsRow.appendChild(removeBtn);
      }
      list.appendChild(block);
    }
    blocks.forEach((b) => addBlock(b));
    if (blocks.length === 0 && !readOnly) addBlock("");

    if (!readOnly) {
      actionsRow.appendChild(
        el("button", { class: "btn btn-secondary btn-small", type: "button", text: "+ הוסף ראיה", onclick: () => addBlock("") })
      );
      wrap.appendChild(actionsRow);
    }

    return {
      el: wrap,
      getData: () => ({ blocks: Array.from(list.querySelectorAll(".evidence-editable")).map((b) => b.innerHTML) })
    };
  },

  "fixed-questions"(instance, data, readOnly) {
    const cfg = instance.config;
    const answers = (data && data.answers) || [];
    const wrap = el("div", { class: "exercise-body" });
    const tas = [];
    cfg.questions.forEach((q, i) => {
      wrap.appendChild(el("p", { class: "exercise-question", text: q }));
      const ta = makeAutoTextarea(answers[i] || "", "", 3, readOnly);
      wrap.appendChild(ta);
      tas.push(ta);
    });
    return { el: wrap, getData: () => ({ answers: tas.map((t) => t.value) }) };
  },

  "story-split"(instance, data, readOnly) {
    const cfg = instance.config;
    const wrap = el("div", { class: "exercise-body" });
    if (cfg.note) wrap.appendChild(el("p", { class: "exercise-note", text: cfg.note }));

    const table = el("table", { class: "story-table" });
    const tbody = el("tbody");
    table.appendChild(tbody);

    const storyRowHead = el("tr", {}, el("th", { colspan: "2", text: "הסיפור:" }));
    const storyTa = makeAutoTextarea((data && data.story) || "", "", 3, readOnly);
    storyTa.classList.add("table-cell-textarea");
    const storyRowBody = el("tr", {}, el("td", { colspan: "2" }, storyTa));
    tbody.appendChild(storyRowHead);
    tbody.appendChild(storyRowBody);

    const splitHead = el("tr", {}, [
      el("th", { text: "העובדות:" }),
      el("th", { text: "הסיפור שסיפרתי לעצמי:" })
    ]);
    const factsTa = makeAutoTextarea((data && data.facts) || "", "", 3, readOnly);
    factsTa.classList.add("table-cell-textarea");
    const selfStoryTa = makeAutoTextarea((data && data.selfStory) || "", "", 3, readOnly);
    selfStoryTa.classList.add("table-cell-textarea");
    const splitBody = el("tr", {}, [el("td", {}, factsTa), el("td", {}, selfStoryTa)]);
    tbody.appendChild(splitHead);
    tbody.appendChild(splitBody);

    const truthRowHead = el("tr", {}, el("th", { colspan: "2", text: "והאמת היא ש..." }));
    const truthTa = makeAutoTextarea((data && data.truth) || "", "", 3, readOnly);
    truthTa.classList.add("table-cell-textarea");
    const truthRowBody = el("tr", {}, el("td", { colspan: "2" }, truthTa));
    tbody.appendChild(truthRowHead);
    tbody.appendChild(truthRowBody);

    wrap.appendChild(table);

    return {
      el: wrap,
      getData: () => ({ story: storyTa.value, facts: factsTa.value, selfStory: selfStoryTa.value, truth: truthTa.value })
    };
  }
};

function renderExercise(instance, data, readOnly) {
  const renderer = RENDERERS[instance.type];
  return renderer(instance, data || {}, readOnly);
}
