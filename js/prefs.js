// גודל טקסט מותאם אישית - נשמר ומוחל בכל טעינה

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.5;
const FONT_SCALE_STEP = 0.1;

function getFontScale() {
  const prefs = loadPrefs();
  return prefs.fontScale || 1;
}

function setFontScale(scale) {
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(scale * 100) / 100));
  const prefs = loadPrefs();
  prefs.fontScale = clamped;
  savePrefs(prefs);
  applyFontScale();
}

function applyFontScale() {
  document.documentElement.style.fontSize = 12 * getFontScale() + "px";
}
