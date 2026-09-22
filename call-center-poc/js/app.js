/* ===================================================================
   app.js - החלפת תצוגות (נציגה/מנהל) וכפתור איפוס הדמו.
=================================================================== */

(function () {
  let currentView = 'agent';

  function renderView() {
    const root = document.getElementById('app-root');
    AgentView.unmount();
    root.innerHTML = '';
    if (currentView === 'agent') AgentView.mount(root);
    else AdminView.mount(root);
  }

  function setActiveButtons() {
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === currentView);
    });
  }

  document.querySelectorAll('.view-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      setActiveButtons();
      renderView();
    });
  });

  document.getElementById('reset-demo-btn').addEventListener('click', () => {
    if (confirm('לאפס את כל נתוני ההדמו (סדר מסכים, אוטומציות, טקסטים שנערכו) למצב ההתחלתי?')) {
      Store.reset();
      renderView();
      showToast('נתוני הדמו אופסו למצב ההתחלתי', 'success');
    }
  });

  setActiveButtons();
  renderView();
})();
