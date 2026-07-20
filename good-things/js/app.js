const MAX_ROWS = 50;

const rowsWrap = document.getElementById("rows-wrap");
const countLabel = document.getElementById("count-label");
const continueBtn = document.getElementById("continue-btn");

function makeRow() {
  const row = document.createElement("div");
  row.className = "entry-row";

  const icon = document.createElement("span");
  icon.className = "entry-icon";
  icon.textContent = "✨";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "entry-input";
  input.autocomplete = "off";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "entry-remove";
  removeBtn.textContent = "×";
  removeBtn.setAttribute("aria-label", "מחיקת שורה");

  row.appendChild(icon);
  row.appendChild(input);
  row.appendChild(removeBtn);

  input.addEventListener("input", updateCount);

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const rows = Array.from(rowsWrap.children);
    const idx = rows.indexOf(row);
    if (idx === rows.length - 1) {
      if (rows.length >= MAX_ROWS) return;
      addRow();
    } else {
      const nextInput = rows[idx + 1].querySelector(".entry-input");
      if (nextInput) nextInput.focus();
    }
  });

  removeBtn.addEventListener("click", () => {
    const rows = Array.from(rowsWrap.children);
    if (rows.length === 1) {
      input.value = "";
      updateCount();
      input.focus();
    } else {
      row.remove();
      updateCount();
    }
  });

  return { row, input };
}

function addRow() {
  const { row, input } = makeRow();
  rowsWrap.appendChild(row);
  input.focus();
}

function updateCount() {
  const inputs = Array.from(rowsWrap.querySelectorAll(".entry-input"));
  const count = inputs.filter((i) => i.value.trim()).length;
  countLabel.textContent = `${count} הזנות התקבלו`;
  continueBtn.disabled = count === 0;
  return count;
}

// ===== מסך סיום - קונפטי + צליל =====

function launchConfetti() {
  const layer = document.getElementById("confetti-layer");
  layer.innerHTML = "";
  const colors = ["#a31621", "#c5963a", "#fdf5e6", "#ffffff"];
  const pieceCount = 60;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece confetti-burst";
    const size = 6 + Math.random() * 8;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.6}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];

    const angle = Math.random() * Math.PI * 2;
    const distance = 110 + Math.random() * 260;
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    piece.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;

    layer.appendChild(piece);
  }

  setTimeout(() => (layer.innerHTML = ""), 1400);
}

function playCelebrationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // דו-מי-סול-דו עולה
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch (e) {
    // אין תמיכה ב-Web Audio - פשוט בלי צליל
  }
}

function showDoneScreen(count) {
  document.getElementById("screen-fill").classList.add("is-hidden");
  const done = document.getElementById("screen-done");
  done.classList.remove("is-hidden");
  document.getElementById("done-count").textContent = String(count);
  launchConfetti();
  playCelebrationSound();
}

continueBtn.addEventListener("click", () => {
  const count = updateCount();
  if (count === 0) return;
  showDoneScreen(count);
});

addRow();
updateCount();
