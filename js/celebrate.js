// חגיגת שמירה - קונפטי או הבזק אור (לסירוגין) + צליל עידוד קצר, בלי קבצים חיצוניים

function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99]; // דו-מי-סול, אקורד עולה קצר
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    setTimeout(() => ctx.close(), 900);
  } catch (e) {
    /* אין תמיכה ב-Web Audio - פשוט מדלגים על הצליל */
  }
}

function burstConfetti() {
  const colors = ["#be95c4", "#e0b1cb", "#9f86c0", "#f6f1fb"];
  const container = el("div", { class: "confetti-layer" });
  document.body.appendChild(container);
  for (let i = 0; i < 40; i++) {
    const piece = el("div", { class: "confetti-piece" });
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 1.1 + Math.random() * 0.9 + "s";
    piece.style.animationDelay = Math.random() * 0.3 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 2200);
}

function flashLight() {
  const flash = el("div", { class: "light-flash" });
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 700);
}

function celebrateSave() {
  playChime();
  if (Math.random() < 0.5) burstConfetti();
  else flashLight();
}
