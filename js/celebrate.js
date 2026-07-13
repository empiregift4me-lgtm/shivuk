// חגיגת שמירה - כל פעם שילוב אחר של אפקט חזותי וצליל, לגיוון, בלי קבצים חיצוניים

function playNotes(notes, { gap = 0.09, dur = 0.5, gain = 0.15 } = {}) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    notes.forEach(([freq, offset], i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + (offset !== undefined ? offset : i * gap);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
    setTimeout(() => ctx.close(), (notes.length * gap + dur + 0.3) * 1000);
  } catch (e) {
    /* אין תמיכה ב-Web Audio - מדלגים על הצליל */
  }
}

const CHIMES = [
  () => playNotes([[523.25], [659.25], [783.99]], { gap: 0.09, dur: 0.5 }), // אקורד עולה
  () => playNotes([[392.0], [392.0, 0.12], [659.25, 0.26]], { dur: 0.45 }), // טה-דה
  () => playNotes([[987.77], [880.0], [783.99], [659.25]], { gap: 0.07, dur: 0.35 }) // נצנוץ יורד
];

function burstConfettiExplosion() {
  const colors = ["#ddd0e6", "#e0b1cb", "#9f86c0", "#f6f1fb"];
  const container = el("div", { class: "confetti-layer" });
  document.body.appendChild(container);
  for (let i = 0; i < 36; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 42;
    const piece = el("div", { class: "confetti-piece confetti-explode" });
    piece.style.left = "50vw";
    piece.style.top = "38vh";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--dx", Math.cos(angle) * dist + "vmin");
    piece.style.setProperty("--dy", Math.sin(angle) * dist + "vmin");
    piece.style.animationDuration = 0.7 + Math.random() * 0.5 + "s";
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 1400);
}

function lightSweep() {
  const sweep = el("div", { class: "light-sweep" });
  document.body.appendChild(sweep);
  setTimeout(() => sweep.remove(), 950);
}

const VISUAL_EFFECTS = [burstConfettiExplosion, lightSweep];

function celebrateSave() {
  VISUAL_EFFECTS[Math.floor(Math.random() * VISUAL_EFFECTS.length)]();
  CHIMES[Math.floor(Math.random() * CHIMES.length)]();
}
