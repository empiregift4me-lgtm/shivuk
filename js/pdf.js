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

// גרסה גנרית של ייצוא PDF - משמשת גם ליומן ההערכה וגם לסיכומים
function exportElementToPDF(root, filename, hideSelector, onDone) {
  const hideEl = hideSelector ? root.querySelector(hideSelector) : null;
  const prevDisplay = hideEl ? hideEl.style.display : null;
  if (hideEl) hideEl.style.display = "none";

  const opt = {
    margin: 10,
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true },
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
    const restoreSpaces = swapSpacesForCapture(root);
    html2pdf()
      .set(opt)
      .from(root)
      .save()
      .then(() => {
        restoreSpaces();
        restoreUI();
      })
      .catch((err) => {
        console.error("PDF export failed", err);
        restoreSpaces();
        restoreUI();
      });
  });
}

function exportDayToPDF(dayCardRoot, date) {
  exportElementToPDF(dayCardRoot, `יומן-${date}`, ".day-actions");
}
