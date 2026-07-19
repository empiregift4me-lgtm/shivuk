// סרגל כלים לעריכת טקסט עשיר (משותף בין סיכומים והחלטות עסקיות) - מבוסס execCommand, בלי ספריות חיצוניות

const RICHTEXT_FONT_SIZES = [1, 2, 3, 4, 5, 6, 7];
const RICHTEXT_LINE_HEIGHTS = [1.4, 1.8, 2.2];

function richTextButton(label, title, onClick) {
  const btn = el("button", { type: "button", class: "rt-btn", text: label, title });
  // preventDefault ב-mousedown שומר על הבחירה (selection) בתוך אזור העריכה בעת הלחיצה על הכפתור
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", onClick);
  return btn;
}

// אם השורה הראשונה יושבת ישירות בתוך אזור העריכה בלי עטיפת בלוק (לפני Enter ראשון) - עוטפים רק אותה,
// בלי לבלוע בלוקים קיימים של שורות הבאות
function ensureBlockWrapped(editableEl) {
  const isBlock = (n) => n.nodeType === 1 && ["DIV", "P", "LI"].includes(n.tagName);
  const first = editableEl.firstChild;
  if (!first || isBlock(first)) return;
  const wrapper = document.createElement("div");
  editableEl.insertBefore(wrapper, first);
  let node = first;
  while (node && !isBlock(node)) {
    const next = node.nextSibling;
    wrapper.appendChild(node);
    node = next;
  }
}

function findBlockAncestor(editableEl, node) {
  while (node && node !== editableEl) {
    if (node.nodeType === 1 && ["DIV", "P", "LI"].includes(node.tagName)) return node;
    node = node.parentNode;
  }
  return null;
}

function getSelectedBlocks(editableEl, range) {
  let startBlock = findBlockAncestor(editableEl, range.startContainer) || editableEl.firstElementChild;
  let endBlock = findBlockAncestor(editableEl, range.endContainer) || editableEl.lastElementChild;
  if (!startBlock || !endBlock) return [];

  const blocks = [];
  let node = startBlock;
  let guard = 0;
  while (node && guard < 1000) {
    blocks.push(node);
    if (node === endBlock) break;
    node = node.nextSibling;
    guard++;
  }
  return blocks.filter((b) => b && b.nodeType === 1);
}

// הופכים את השורה/השורות הנבחרות לרשימת משימות (וי) בלי לגעת בטקסט הקיים - בסגנון וורד
function toggleChecklistOnSelection(editableEl) {
  editableEl.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  ensureBlockWrapped(editableEl);
  const range = sel.getRangeAt(0);
  const blocks = getSelectedBlocks(editableEl, range);

  blocks.forEach((block) => {
    const already = block.firstChild && block.firstChild.nodeType === 1 && block.firstChild.classList && block.firstChild.classList.contains("checklist-mark");
    if (already) return;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checklist-mark";
    if (block.firstChild) block.insertBefore(checkbox, block.firstChild);
    else block.appendChild(checkbox);
    block.insertBefore(document.createTextNode(" "), checkbox.nextSibling);
    block.classList.add("checklist-line");
  });
}

// מנקה עיצוב גופן שהודבק מבחוץ ומחזירה הכל לרוביק
function forceRubikFont(editableEl) {
  editableEl.style.fontFamily = "";
  editableEl.querySelectorAll("[style]").forEach((node) => {
    node.style.fontFamily = "";
  });
  editableEl.querySelectorAll("font[face]").forEach((node) => {
    node.removeAttribute("face");
  });
}

// הדבקה תמיד כטקסט פשוט בלבד, כדי שהתוכן המודבק יאמץ את העיצוב הקיים של המסמך ולא יביא איתו
// גופן/גודל זרים מהמקור
function attachPlainTextPaste(editableEl) {
  editableEl.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });
}

// צבע הדגשה עמוק מספיק שהטקסט הבהיר של האפליקציה נשאר קריא מעליו (בניגוד לוורוד הבהיר שדומה מדי לצבע הטקסט)
const MINI_TOOLBAR_HIGHLIGHT_COLOR = "#5e548e";

function colorsMatch(a, b) {
  if (!a || !b) return false;
  const norm = (s) => s.replace(/\s+/g, "").toLowerCase();
  return norm(a) === norm(b);
}

function hexToRgbString(hex) {
  const v = hex.replace("#", "");
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// queryCommandValue("hiliteColor") לא אמין (מחזיר מחרוזת ריקה בדפדפנים רבים), אז בודקים ישירות
// את ה-DOM: אם תחילת הבחירה כבר יושבת בתוך אלמנט עם רקע בצבע שלנו, זה סימן שהיא מודגשת
function isSelectionHighlighted(editableEl) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return false;
  let node = sel.getRangeAt(0).startContainer;
  if (node.nodeType === 3) node = node.parentElement;
  if (!node || !editableEl.contains(node)) return false;
  return colorsMatch(getComputedStyle(node).backgroundColor, hexToRgbString(MINI_TOOLBAR_HIGHLIGHT_COLOR));
}

// טוגל אמיתי להדגשה - אם הבחירה כבר מודגשת בצבע שלנו מסירים אותה, אחרת מוסיפים
function toggleHighlight(editableEl) {
  const isHighlighted = isSelectionHighlighted(editableEl);
  editableEl.focus();
  document.execCommand("hiliteColor", false, isHighlighted ? "transparent" : MINI_TOOLBAR_HIGHLIGHT_COLOR);
}

// סרגל כלים מצומצם לתיבות כתיבה חופשית קטנות (רק מודגש/קו תחתון/צביעה) - למשל בתוך "עניינים" בסיכומים
function createMiniRichToolbar(editableEl) {
  attachPlainTextPaste(editableEl);
  function exec(cmd, value) {
    editableEl.focus();
    document.execCommand(cmd, false, value);
  }
  return el("div", { class: "rt-toolbar rt-toolbar-mini" }, [
    richTextButton("B", "מודגש", () => exec("bold")),
    richTextButton("U", "קו תחתון", () => exec("underline")),
    richTextButton("🖍", "צביעת טקסט (לחיצה נוספת על טקסט מודגש מסירה את ההדגשה)", () => toggleHighlight(editableEl))
  ]);
}

function createRichToolbar(editableEl) {
  attachPlainTextPaste(editableEl);
  let fontSizeIdx = 3; // "4" - גודל בינוני בסולם הישן של execCommand
  let lineHeightIdx = -1;

  function exec(cmd, value) {
    editableEl.focus();
    document.execCommand(cmd, false, value);
  }

  // Ctrl+D כקיצור מקלדת לצביעת טקסט - אותה פעולה כמו כפתור 🖍
  editableEl.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      exec("hiliteColor", "#e0b1cb");
    }
  });

  const toolbar = el("div", { class: "rt-toolbar" }, [
    richTextButton("B", "מודגש", () => exec("bold")),
    richTextButton("I", "נטוי", () => exec("italic")),
    richTextButton("U", "קו תחתון", () => exec("underline")),
    richTextButton("🖍 (Ctrl+D)", "צביעת טקסט", () => exec("hiliteColor", "#e0b1cb")),
    richTextButton("• רשימה", "רשימת בולטים", () => exec("insertUnorderedList")),
    richTextButton("1. רשימה", "רשימה ממוספרת", () => exec("insertOrderedList")),
    richTextButton("☑ רשימה", "הוספת וי לתחילת השורה/השורות הנבחרות", () => toggleChecklistOnSelection(editableEl)),
    richTextButton("↕ מרווח שורות", "שינוי מרווח בין שורות", () => {
      lineHeightIdx = (lineHeightIdx + 1) % RICHTEXT_LINE_HEIGHTS.length;
      editableEl.style.lineHeight = String(RICHTEXT_LINE_HEIGHTS[lineHeightIdx]);
    }),
    richTextButton("א רוביק", "החזרת כל הטקסט לגופן רוביק", () => forceRubikFont(editableEl)),
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
