// ייצוא PDF - צילום ישיר של הכרטיס הגלוי על המסך (ללא שיבוט מנותק, כדי למנוע בעיות מדידה של html2canvas)

function exportDayToPDF(dayCardRoot, date) {
  const actionsEl = dayCardRoot.querySelector(".day-actions");
  const prevDisplay = actionsEl ? actionsEl.style.display : null;
  if (actionsEl) actionsEl.style.display = "none";

  const opt = {
    margin: 10,
    filename: `יומן-${date}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    // letterRendering מונע מ-html2canvas "לבלוע" רווחים בין מילים בטקסט מודגש/עברי
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  function restore() {
    if (actionsEl) actionsEl.style.display = prevDisplay || "";
  }

  // ממתינים לטעינה מלאה של הגופן (Rubik) לפני הצילום - טעינה חלקית היא גורם נפוץ
  // לכך ש-html2canvas מודד רוחב תווים לא נכון ומצמיד מילים זו לזו
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  ready
    .then(() => html2pdf().set(opt).from(dayCardRoot).save())
    .then(restore)
    .catch((err) => {
      console.error("PDF export failed", err);
      restore();
    });
}
