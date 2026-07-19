// ייצוא ל-PDF - בונה עץ DOM סטטי (לא מצלם שדות קלט חיים) כדי להימנע מבעיות הידועות
// של html2canvas עם textarea/input, ומפצל כל שורה לאלמנט משלה (לא גוש טקסט אחד) כדי לא
// לקלקל כיווניות (bidi) כשמעורבים בתוך המשפט העברי מספרים (כמו המספור בתרגיל 4).

function formatDateHe(d) {
  return d.toLocaleDateString("he-IL");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function appendPdfSection(root, title, rows, numbered) {
  root.appendChild(el("h2", { class: "pdf-section-title", text: title }));
  rows.forEach((r) => {
    const row = el("div", { class: "pdf-row" });
    if (numbered) row.appendChild(el("span", { class: "pdf-num", text: r.num }));
    const sentence = el("span", { class: "pdf-sentence" });
    sentence.appendChild(el("b", { class: "pdf-lead", text: r.lead + " " }));
    sentence.appendChild(document.createTextNode(r.answer));
    row.appendChild(sentence);
    root.appendChild(row);
  });
}

function buildPdfRoot() {
  const root = el("div", { class: "pdf-root" });
  root.appendChild(el("div", { class: "pdf-title", text: "שאלון הכנה לשיחה" }));
  root.appendChild(el("div", { class: "pdf-date", text: `תאריך: ${formatDateHe(new Date())}` }));

  appendPdfSection(
    root,
    "תרגיל 1",
    answers.ex1.map((a) => ({ lead: CONTENT.ex1.leadText, answer: a }))
  );
  appendPdfSection(root, "תרגיל 2", answers.ex2);
  appendPdfSection(
    root,
    "תרגיל 3",
    answers.ex3.map((a) => ({ lead: `${a.question} ${a.prefix}`, answer: a.answer }))
  );
  appendPdfSection(root, "תרגיל 4", answers.ex4, true);

  return root;
}

function exportQuestionnairePDF() {
  const btn = document.getElementById("export-pdf-btn");
  if (btn) btn.disabled = true;

  const mount = document.getElementById("pdf-export-mount");
  const root = buildPdfRoot();
  root.style.width = "700px";
  mount.appendChild(root);
  void root.offsetHeight;

  const opt = {
    margin: 10,
    filename: `שאלון-הכנה-${todayISO()}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  function cleanup() {
    mount.removeChild(root);
    if (btn) btn.disabled = false;
  }

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    html2pdf()
      .set(opt)
      .from(root)
      .save()
      .then(cleanup)
      .catch((err) => {
        console.error("PDF export failed", err);
        cleanup();
      });
  });
}
