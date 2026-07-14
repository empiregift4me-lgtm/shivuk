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

function makeAutoTextarea(value, placeholder, rows, readOnly) {
  const ta = el("textarea", { class: "field-textarea", rows: String(rows), placeholder: placeholder || "" });
  ta.value = value || "";
  ta.disabled = !!readOnly;
  ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
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
    const items = (data && data.items && data.items.length ? data.items : [""]).slice();
    const wrap = el("div", { class: "exercise-body" });
    if (cfg.topLabel) wrap.appendChild(el("p", { class: "exercise-note", text: cfg.topLabel }));
    const list = el("div", { class: "dynamic-list" });
    wrap.appendChild(list);

    const countLabel = cfg.showCount ? el("p", { class: "dynamic-list-count" }) : null;
    if (countLabel) wrap.appendChild(countLabel);

    function filledCount() {
      return Array.from(list.querySelectorAll("input")).filter((i) => i.value.trim().length).length;
    }

    function updateCount() {
      if (countLabel) countLabel.textContent = `${filledCount()} הזנות התקבלו`;
    }

    function addRow(val) {
      if (list.children.length >= (cfg.maxLines || 50)) return null;
      const row = el("div", { class: "dynamic-row" });
      if (cfg.rowIcon) row.appendChild(el("span", { class: "row-icon", text: cfg.rowIcon }));
      const input = el("input", { type: "text", class: "field-input", placeholder: cfg.placeholder || "" });
      input.value = val || "";
      input.disabled = !!readOnly;
      input.addEventListener("input", updateCount);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const isLast = row === list.lastElementChild;
          if (isLast) {
            const newRow = addRow("");
            if (newRow) newRow.querySelector("input").focus();
          } else {
            const next = row.nextElementSibling;
            if (next) next.querySelector("input").focus();
          }
        }
      });
      row.appendChild(input);
      if (!readOnly) {
        row.appendChild(
          el("button", {
            class: "row-remove",
            type: "button",
            text: "×",
            title: "מחיקת שורה",
            onclick: () => {
              if (list.children.length > 1) row.remove();
              else input.value = "";
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

    return {
      el: wrap,
      getData: () => ({
        items: Array.from(list.querySelectorAll("input")).map((i) => i.value.trim()).filter((v) => v.length)
      })
    };
  },

  "quotes-random"(instance, data, readOnly) {
    const cfg = instance.config;
    let selected = data && data.selected;
    if (!selected || !selected.length) selected = pickRandom(cfg.bank, cfg.count);
    const wrap = el("div", { class: "exercise-body quotes-grid" });
    selected.forEach((i) => {
      wrap.appendChild(el("div", { class: "quote-card", text: cfg.bank[i] }));
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
    let sentenceIdx = data && typeof data.sentenceIdx === "number" ? data.sentenceIdx : pickRandom(cfg.bank, 1)[0];
    let completions = (data && data.completions) || [];

    const wrap = el("div", { class: "exercise-body" });
    const rowsWrap = el("div", { class: "sentence-rows" });
    const inputs = [];

    function build() {
      rowsWrap.innerHTML = "";
      inputs.length = 0;
      for (let i = 0; i < cfg.repeats; i++) {
        const row = el("div", { class: "sentence-row" });
        row.appendChild(el("span", { class: "sentence-prefix", text: cfg.bank[sentenceIdx] }));
        const input = el("input", { type: "text", class: "field-input", placeholder: "השלמה..." });
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
          sentenceIdx = pickRandom(cfg.bank, 1)[0];
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
    const ta = makeAutoTextarea((data && data.text) || "", "המשך המשפט...", 2, readOnly);
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
          el("button", { type: "button", class: "tb-btn", text: "B", title: "הדגשה מודגשת", onclick: () => document.execCommand("bold") }),
          el("button", { type: "button", class: "tb-btn highlight-btn", text: "צביעה", title: "סימון טקסט", onclick: () => document.execCommand("hiliteColor", false, "#E99F8B") }),
          el("button", { type: "button", class: "tb-btn", text: "📷 הוספת תמונה", title: "העלאת צילום מסך או תמונה", onclick: () => fileInput.click() }),
          fileInput
        ]);
        block.appendChild(toolbar);
      }
      block.appendChild(editable);
      if (!readOnly) {
        block.appendChild(
          el("button", { class: "btn btn-ghost btn-small", type: "button", text: "הסרת ראיה", onclick: () => block.remove() })
        );
      }
      list.appendChild(block);
    }
    blocks.forEach((b) => addBlock(b));
    if (blocks.length === 0 && !readOnly) addBlock("");

    if (!readOnly) {
      wrap.appendChild(
        el("button", { class: "btn btn-secondary btn-small", type: "button", text: "+ הוסף ראיה", onclick: () => addBlock("") })
      );
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
      const ta = makeAutoTextarea(answers[i] || "", "כתיבה חופשית...", 3, readOnly);
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
    const storyTa = makeAutoTextarea((data && data.story) || "", "חלונית להשלמה בכתיבה חופשית...", 3, readOnly);
    const storyRowBody = el("tr", {}, el("td", { colspan: "2" }, storyTa));
    tbody.appendChild(storyRowHead);
    tbody.appendChild(storyRowBody);

    const splitHead = el("tr", {}, [
      el("th", { text: "העובדות:" }),
      el("th", { text: "הסיפור שסיפרתי לעצמי:" })
    ]);
    const factsTa = makeAutoTextarea((data && data.facts) || "", "חלונית להשלמה בכתיבה חופשית...", 3, readOnly);
    const selfStoryTa = makeAutoTextarea((data && data.selfStory) || "", "חלונית להשלמה בכתיבה חופשית...", 3, readOnly);
    const splitBody = el("tr", {}, [el("td", {}, factsTa), el("td", {}, selfStoryTa)]);
    tbody.appendChild(splitHead);
    tbody.appendChild(splitBody);

    wrap.appendChild(table);

    return {
      el: wrap,
      getData: () => ({ story: storyTa.value, facts: factsTa.value, selfStory: selfStoryTa.value })
    };
  }
};

function renderExercise(instance, data, readOnly) {
  const renderer = RENDERERS[instance.type];
  return renderer(instance, data || {}, readOnly);
}
