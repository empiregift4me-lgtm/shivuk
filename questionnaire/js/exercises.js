// ניווט "מסך מלא" בין התרגילים - כל מעבר "הבא" מוחק את התרגיל הקודם ולא מאפשר חזרה אחורה.

const EXERCISES = [renderEx1, renderEx2, renderEx3, renderEx4];
let currentExerciseIndex = 0;

const answers = { ex1: [], ex2: [], ex3: [], ex4: [] };

function startExercises() {
  currentExerciseIndex = 0;
  renderCurrentExercise();
}

function renderCurrentExercise() {
  const root = document.getElementById("exercise-root");
  root.innerHTML = "";
  window.scrollTo(0, 0);
  EXERCISES[currentExerciseIndex](root);
}

function goToNextExercise() {
  currentExerciseIndex++;
  if (currentExerciseIndex >= EXERCISES.length) {
    showDoneScreen();
  } else {
    renderCurrentExercise();
  }
}

// ===== רכיבי מסך משותפים =====

function screenHeader(instructionText, anchorText) {
  const wrap = el("div", { class: "screen-header" });
  wrap.appendChild(el("p", { class: "instr-text", text: instructionText }));
  if (anchorText) wrap.appendChild(el("h2", { class: "anchor-title", text: anchorText }));
  return wrap;
}

function progressNumbered(total) {
  return el("div", { class: "progress-numbered", text: `1/${total}` });
}

function progressBarEl() {
  const track = el("div", { class: "progress-track" });
  const fill = el("div", { class: "progress-fill" });
  track.appendChild(fill);
  return track;
}

function setProgressBar(track, current, total) {
  track.querySelector(".progress-fill").style.width = Math.round((current / total) * 100) + "%";
}

function nextButtonBar(onClick) {
  const bar = el("div", { class: "next-bar" });
  const btn = el("button", { class: "btn btn-primary next-btn", type: "button", text: "הבא", onclick: onClick });
  bar.appendChild(btn);
  return bar;
}

function makeFlowRow(leadText) {
  const row = el("div", { class: "flow-row" });
  row.appendChild(el("span", { class: "q-lead", text: leadText + " " }));
  const input = el("input", { type: "text", class: "flow-input", autocomplete: "off" });
  row.appendChild(input);
  return { row, input };
}

// ===== תרגיל 1 - השלמת אותו משפט 6 פעמים ברצף, שורה נוספת בכל אנטר =====

function renderEx1(root) {
  const data = CONTENT.ex1;
  root.appendChild(screenHeader(data.instruction, data.anchorDisplay));
  const progressEl = progressNumbered(data.repeats);
  root.appendChild(progressEl);
  const rowsWrap = el("div", { class: "rows-wrap" });
  root.appendChild(rowsWrap);

  let rowCount = 0;
  let nextShown = false;

  function finalizeAndAdvance() {
    if (nextShown) return;
    nextShown = true;
    root.appendChild(
      nextButtonBar(() => {
        const vals = Array.from(rowsWrap.querySelectorAll(".flow-input")).map((i) => i.value.trim());
        answers.ex1 = vals;
        goToNextExercise();
      })
    );
  }

  function addRow() {
    rowCount++;
    progressEl.textContent = `${rowCount}/${data.repeats}`;
    const { row, input } = makeFlowRow(data.leadText);
    rowsWrap.appendChild(row);
    input.focus();

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (!input.value.trim()) return;
      input.disabled = true;
      if (rowCount < data.repeats) {
        addRow();
      } else {
        finalizeAndAdvance();
      }
    });

    input.addEventListener("input", () => {
      if (rowCount === data.repeats && input.value.trim()) finalizeAndAdvance();
    });
  }

  addRow();
}

// ===== תרגיל 2 - שלוש שאלות נפרדות על אותו מסך =====

function renderEx2(root) {
  const data = CONTENT.ex2;
  root.appendChild(screenHeader(data.instruction));
  const rowsWrap = el("div", { class: "rows-wrap" });
  root.appendChild(rowsWrap);

  const inputs = [];
  let nextShown = false;

  function checkComplete() {
    if (nextShown) return;
    const allFilled = inputs.every((i) => i.value.trim());
    if (!allFilled) return;
    nextShown = true;
    root.appendChild(
      nextButtonBar(() => {
        answers.ex2 = data.questions.map((q, i) => ({ lead: q.lead, answer: inputs[i].value.trim() }));
        goToNextExercise();
      })
    );
  }

  data.questions.forEach((q, idx) => {
    const { row, input } = makeFlowRow(q.lead);
    rowsWrap.appendChild(row);
    inputs.push(input);
    input.addEventListener("input", checkComplete);
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (inputs[idx + 1]) inputs[idx + 1].focus();
    });
  });

  inputs[0].focus();
}

// ===== תרגיל 3 - משפט מרכזי + 4 תת-שאלות ברצף (סליידר, כל אנטר מחליף שאלה) =====

function renderEx3(root) {
  const data = CONTENT.ex3;
  root.appendChild(screenHeader(data.instruction, data.anchor));
  const progressEl = progressNumbered(data.subquestions.length);
  root.appendChild(progressEl);
  const stage = el("div", { class: "stage-wrap" });
  root.appendChild(stage);

  const collected = [];
  let qIndex = 0;

  function showQuestion() {
    stage.innerHTML = "";
    progressEl.textContent = `${qIndex + 1}/${data.subquestions.length}`;
    const q = data.subquestions[qIndex];
    stage.appendChild(el("p", { class: "sub-question", text: q.question }));
    const { row, input } = makeFlowRow(q.prefix);
    stage.appendChild(row);
    input.focus();

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      collected.push({ question: q.question, prefix: q.prefix, answer: val });
      qIndex++;
      if (qIndex < data.subquestions.length) {
        showQuestion();
      } else {
        root.appendChild(
          nextButtonBar(() => {
            answers.ex3 = collected;
            goToNextExercise();
          })
        );
      }
    });
  }

  showQuestion();
}

// ===== תרגיל 4 - רצף ארוך של השלמות, שאלה אחת בכל פעם, פס התקדמות ללא מספרים =====

function renderEx4(root) {
  const data = CONTENT.ex4;
  root.appendChild(screenHeader(data.instruction));
  const track = progressBarEl();
  root.appendChild(track);
  const stage = el("div", { class: "stage-wrap" });
  root.appendChild(stage);

  const collected = [];
  let qIndex = 0;

  function showQuestion() {
    stage.innerHTML = "";
    setProgressBar(track, qIndex, data.items.length);
    const item = data.items[qIndex];
    const { row, input } = makeFlowRow(item.lead);
    stage.appendChild(row);
    input.focus();

    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      collected.push({ lead: item.lead, num: item.num, answer: val });
      qIndex++;
      if (qIndex < data.items.length) {
        showQuestion();
      } else {
        setProgressBar(track, qIndex, data.items.length);
        root.appendChild(
          nextButtonBar(() => {
            answers.ex4 = collected;
            goToNextExercise();
          })
        );
      }
    });
  }

  showQuestion();
}
