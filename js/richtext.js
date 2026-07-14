// סרגל כלים לעריכת טקסט עשיר (משותף בין סיכומים והחלטות עסקיות) - מבוסס execCommand, בלי ספריות חיצוניות

const RICHTEXT_FONT_SIZES = [1, 2, 3, 4, 5, 6, 7];

function richTextButton(label, title, onClick) {
  const btn = el("button", { type: "button", class: "rt-btn", text: label, title });
  // preventDefault ב-mousedown שומר על הבחירה (selection) בתוך אזור העריכה בעת הלחיצה על הכפתור
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", onClick);
  return btn;
}

function createRichToolbar(editableEl) {
  let fontSizeIdx = 3; // "4" - גודל בינוני בסולם הישן של execCommand

  function exec(cmd, value) {
    editableEl.focus();
    document.execCommand(cmd, false, value);
  }

  function insertChecklistLine() {
    editableEl.focus();
    document.execCommand(
      "insertHTML",
      false,
      '<div class="checklist-line"><label><input type="checkbox"> <span>סעיף חדש</span></label></div><div><br></div>'
    );
  }

  const toolbar = el("div", { class: "rt-toolbar" }, [
    richTextButton("B", "מודגש", () => exec("bold")),
    richTextButton("I", "נטוי", () => exec("italic")),
    richTextButton("U", "קו תחתון", () => exec("underline")),
    richTextButton("🖍", "צביעת טקסט", () => exec("hiliteColor", "#e0b1cb")),
    richTextButton("• רשימה", "רשימת בולטים", () => exec("insertUnorderedList")),
    richTextButton("1. רשימה", "רשימה ממוספרת", () => exec("insertOrderedList")),
    richTextButton("☑ רשימה", "רשימת משימות עם וי", insertChecklistLine),
    richTextButton("א−", "הקטנת גופן", () => {
      fontSizeIdx = Math.max(0, fontSizeIdx - 1);
      exec("fontSize", String(RICHTEXT_FONT_SIZES[fontSizeIdx]));
    }),
    richTextButton("א+", "הגדלת גופן", () => {
      fontSizeIdx = Math.min(RICHTEXT_FONT_SIZES.length - 1, fontSizeIdx + 1);
      exec("fontSize", String(RICHTEXT_FONT_SIZES[fontSizeIdx]));
    })
  ]);

  return toolbar;
}
