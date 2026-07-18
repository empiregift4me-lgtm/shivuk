// ייצוא PDF - צילום ישיר של הכרטיס הגלוי על המסך (ללא שיבוט מנותק, כדי למנוע בעיות מדידה של html2canvas)

// html2canvas עם טקסט עברי (במיוחד מודגש) נוטה "לבלוע" רווחים בין מילים.
// הפתרון האמין ביותר שנמצא לבעיה הזו: להחליף רווחים רגילים ברווחים בלתי-שבירים
// ממש לפני הצילום (הם לא מתכווצים באותה צורה), ולהחזיר אותם מיד אחרי.
function swapSpacesForCapture(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const originals = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.indexOf(" ") !== -1) {
      originals.push({ node, value: node.nodeValue });
      node.nodeValue = node.nodeValue.replace(/ /g, " ");
    }
  }
  return () => originals.forEach(({ node, value }) => (node.nodeValue = value));
}

// html2canvas לא יודע לצלם נכון תוכן של <textarea> (במיוחד עם ירידות שורה) - זה מה שגרם לטקסט
// חופשי רב-שורתי לצאת כשורה אחת דחוסה ולא קריאה ב-PDF. הפתרון: לפני הצילום, מחליפים כל textarea
// שנמצא בתוך root ב-div שמכיל בתוכו div נפרד לכל שורה (פיצול לפי ירידת שורה בפועל), ומחזירים
// את ה-textarea המקורי בחזרה מיד אחרי הצילום.
// חשוב: לא להשתמש כאן ב-white-space: pre-wrap על גוש טקסט אחד - זה גורם ל-html2canvas לעבור
// למצב רינדור "גולמי" שלא מיישם נכון כיווניות (bidi) כשיש בתוך המשפט העברי מספרים/אותיות
// לועזיות (למשל שעות כמו "00:10"). לכן כל שורה היא div נפרד עם white-space רגיל (default),
// שגם גולש כרגיל בתוך רוחב התיבה אם השורה ארוכה מדי (בדיוק כמו textarea אמיתי).
function swapTextareasForCapture(root) {
  const textareas = Array.from(root.querySelectorAll("textarea"));
  const replacements = textareas.map((ta) => {
    const rect = ta.getBoundingClientRect();
    const container = el("div", { class: "field-textarea pdf-textarea-substitute" });
    container.style.width = rect.width + "px";
    container.style.minHeight = rect.height + "px";
    ta.value.split("\n").forEach((line) => {
      container.appendChild(el("div", { class: "pdf-textarea-line", text: line || " " }));
    });
    ta.replaceWith(container);
    return { ta, div: container };
  });
  return () => replacements.forEach(({ ta, div }) => div.replaceWith(ta));
}

// מכניסה אלמנט "בלתי נראה" לעמוד לצורך צילום PDF, בלי להזיז אותו למיקום שלילי רחוק (שגורם ל-html2canvas
// לפעמים לצלם עמוד ריק) - עוטפים אותו בתיבה 0x0 עם overflow:hidden במקום, כך שהאלמנט עצמו יושב במיקום
// "רגיל" (0,0) בזרימת המסמך וניתן למדידה תקינה, אבל לא נראה למשתמשת ולא תופס מקום
function mountOffscreenForExport(printRoot) {
  const clip = document.createElement("div");
  clip.style.position = "fixed";
  clip.style.top = "0";
  clip.style.left = "0";
  clip.style.width = "0";
  clip.style.height = "0";
  clip.style.overflow = "hidden";
  printRoot.style.position = "static";
  clip.appendChild(printRoot);
  document.body.appendChild(clip);
  // כפיית reflow סינכרוני, כדי שהמידות של printRoot יהיו מחושבות במלואן לפני שה-html2canvas מתחיל למדוד אותו
  void printRoot.offsetHeight;
  return () => clip.remove();
}

// גרסה גנרית של ייצוא PDF - משמשת גם ליומן ההערכה וגם לסיכומים
function exportElementToPDF(root, filename, hideSelector, onDone) {
  const hideEl = hideSelector ? root.querySelector(hideSelector) : null;
  const prevDisplay = hideEl ? hideEl.style.display : null;
  if (hideEl) hideEl.style.display = "none";

  const opt = {
    margin: 10,
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  function restoreUI() {
    if (hideEl) hideEl.style.display = prevDisplay || "";
    if (onDone) onDone();
  }

  // ממתינים לטעינה מלאה של הגופן (Rubik) לפני הצילום - טעינה חלקית היא גורם נפוץ
  // לכך ש-html2canvas מודד רוחב תווים לא נכון
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  ready.then(() => {
    const restoreTextareas = swapTextareasForCapture(root);
    const restoreSpaces = swapSpacesForCapture(root);
    html2pdf()
      .set(opt)
      .from(root)
      .save()
      .then(() => {
        restoreSpaces();
        restoreTextareas();
        restoreUI();
      })
      .catch((err) => {
        console.error("PDF export failed", err);
        restoreSpaces();
        restoreTextareas();
        restoreUI();
      });
  });
}

// כמו exportElementToPDF, אבל מחזירה את קובץ ה-PDF כ-Blob (Promise) במקום להוריד אותו לדפדפן -
// משמשת להעלאת PDF ישירות לגוגל דרייב בלי לעבור דרך הורדה מקומית
function exportElementToPDFBlob(root, hideSelector) {
  const hideEl = hideSelector ? root.querySelector(hideSelector) : null;
  const prevDisplay = hideEl ? hideEl.style.display : null;
  if (hideEl) hideEl.style.display = "none";

  const opt = {
    margin: 10,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  function restoreUI() {
    if (hideEl) hideEl.style.display = prevDisplay || "";
  }

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  return ready.then(() => {
    const restoreTextareas = swapTextareasForCapture(root);
    const restoreSpaces = swapSpacesForCapture(root);
    return html2pdf()
      .set(opt)
      .from(root)
      .outputPdf("blob")
      .then((blob) => {
        restoreSpaces();
        restoreTextareas();
        restoreUI();
        return blob;
      })
      .catch((err) => {
        restoreSpaces();
        restoreTextareas();
        restoreUI();
        throw err;
      });
  });
}

function exportDayToPDF(dayCardRoot, date) {
  exportElementToPDF(dayCardRoot, `יומן-${date}`, ".day-actions");
}

// ייצוא מרוכז - כל הסיכומים השמורים וכל רשומות היומן השמורות, למסמך PDF אחד עם חלוקה פנימית בין שני הארכיונים
function exportAllToPDF() {
  const printRoot = el("div", { class: "day-card summary-print-root" });
  printRoot.appendChild(el("div", { class: "day-header" }, [el("div", { class: "day-date", text: `ייצוא מלא - ${formatDateHe(todayISO())}` })]));

  printRoot.appendChild(el("h2", { class: "export-section-title", text: "📝 סיכומים" }));
  const summaries = loadSummaries()
    .slice()
    .sort((a, b) => (a.sessionDate || "").localeCompare(b.sessionDate || ""));
  if (summaries.length === 0) {
    printRoot.appendChild(el("p", { text: "אין סיכומים שמורים." }));
  } else {
    summaries.forEach((item) => {
      printRoot.appendChild(
        el("h3", { class: "export-entry-title", text: item.sessionDate ? formatDateHe(item.sessionDate) : formatTimestamp(item.createdAt) })
      );
      const body = el("div", { class: "summary-topics-wrap" });
      buildTopicsEditor(body, normalizeSummaryTopics(item.topics), () => {}, { readOnly: true });
      printRoot.appendChild(body);
    });
  }

  printRoot.appendChild(el("h2", { class: "export-section-title", text: "📔 יומן הערכה" }));
  const entries = allEntriesSorted("asc").filter((e) => e.saved);
  if (entries.length === 0) {
    printRoot.appendChild(el("p", { text: "אין רשומות יומן שמורות." }));
  } else {
    entries.forEach((entry) => {
      printRoot.appendChild(el("h3", { class: "export-entry-title", text: `${formatDateHe(entry.date)} · ${PERIOD_LABELS[entry.period]}` }));
      const body = el("div", { class: "day-body" });
      renderExerciseBlocks(entry, body, true, []);
      printRoot.appendChild(body);
    });
  }

  printRoot.style.width = "700px";
  const cleanup = mountOffscreenForExport(printRoot);
  exportElementToPDF(printRoot, `יצוא-מלא-${todayISO()}`, null, cleanup);
}
