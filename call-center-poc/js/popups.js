/* ===================================================================
   Popups - חלונית מודאלית לחוקים/תזכורות/הצעות.
   blocking / guided-choice: לא ניתן לסגור אלא דרך אחד הכפתורים (זה
   בדיוק מה שאמור "לעצור" את הנציגה עד שהיא בוחרת).
   reminder / suggestion: ניתן לסגור גם דרך רקע/ESC.
=================================================================== */

const Popups = (function () {
  const root = document.getElementById('popup-root');

  const KIND_META = {
    blocking: { icon: '⛔', kicker: 'חסימה - חובה לבחור' },
    reminder: { icon: '💡', kicker: 'תזכורת לנציגה' },
    'guided-choice': { icon: '🎬', kicker: 'תסריט מונחה' },
    suggestion: { icon: '✨', kicker: 'הצעה אוטומטית' }
  };

  function close() {
    root.innerHTML = '';
  }

  function show(opts) {
    const kind = opts.kind || 'reminder';
    const meta = KIND_META[kind] || KIND_META.reminder;
    const canDismiss = opts.dismissible !== undefined ? opts.dismissible : (kind === 'reminder' || kind === 'suggestion');

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    if (canDismiss) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    const card = document.createElement('div');
    card.className = 'popup-card is-' + kind;

    const kicker = document.createElement('div');
    kicker.className = 'popup-kicker is-' + kind;
    kicker.innerHTML = `<span>${meta.icon}</span><span>${opts.title || meta.kicker}</span>`;

    const msg = document.createElement('p');
    msg.className = 'popup-message';
    msg.textContent = opts.message;

    const btnWrap = document.createElement('div');
    btnWrap.className = 'popup-buttons';
    (opts.buttons || []).forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'popup-btn' + (i === 0 ? ' is-primary' : '');
      btn.textContent = b.label;
      btn.addEventListener('click', () => {
        close();
        if (b.onClick) b.onClick();
      });
      btnWrap.appendChild(btn);
    });

    card.appendChild(kicker);
    card.appendChild(msg);
    card.appendChild(btnWrap);
    overlay.appendChild(card);
    root.innerHTML = '';
    root.appendChild(overlay);

    if (canDismiss) {
      const escHandler = (e) => {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
      };
      document.addEventListener('keydown', escHandler);
    }
  }

  function blocking(opts) { show(Object.assign({}, opts, { kind: 'blocking', dismissible: false })); }
  function reminder(opts) { show(Object.assign({}, opts, { kind: 'reminder', dismissible: true })); }
  function guided(opts) { show(Object.assign({}, opts, { kind: 'guided-choice', dismissible: false })); }
  function suggestion(opts) { show(Object.assign({}, opts, { kind: 'suggestion', dismissible: true })); }

  return { show, close, blocking, reminder, guided, suggestion };
})();

function showToast(message, type) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' is-' + type : '');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.remove(); }, 2600);
}
