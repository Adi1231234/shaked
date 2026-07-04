// ui-quiz.js - the running quiz panel: highlight structure, blur its name, reveal, next.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});
  const h = (tag, cls, txt) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (txt != null) el.textContent = txt;
    return el;
  };

  function run(quiz, onExit) {
    const panel = h('div', 'caq-root caq-quiz');
    const top = h('div', 'caq-quiz__top');
    const progress = h('div', 'caq-progress');
    const exit = h('button', 'caq-btn caq-btn--ghost', 'סיום');
    exit.style.padding = '6px 12px';
    top.appendChild(progress); top.appendChild(exit);
    const bar = h('div', 'caq-bar');
    const fill = h('div', 'caq-bar__fill');
    bar.appendChild(fill);
    const prompt = h('div', 'caq-prompt', 'מהו האיבר המסומן על המודל?');
    const answer = h('div', 'caq-answer');
    const hint = h('div', 'caq-hint', '');
    const loading = h('div', 'caq-loading', '');
    const foot = h('div', 'caq-quiz__foot');
    // After revealing, the learner can optionally mark whether they remembered it.
    const wrongBtn = h('button', 'caq-btn caq-btn--wrong', '✗ לא זכרתי');
    const skipBtn = h('button', 'caq-btn caq-btn--ghost caq-btn--skip', 'דלג');
    const rightBtn = h('button', 'caq-btn caq-btn--right', '✓ זכרתי');
    const nextBtn = h('button', 'caq-btn', 'המשך');
    [wrongBtn, skipBtn, rightBtn, nextBtn].forEach((b) => foot.appendChild(b));
    [top, bar, prompt, answer, hint, loading, foot].forEach((e) => panel.appendChild(e));
    document.body.appendChild(panel);

    let revealed = false;

    // Foot layouts: 'blurred' (waiting to reveal), 'answered' (mark buttons), 'skip'.
    function footMode(mode) {
      const marks = mode === 'answered';
      wrongBtn.style.display = marks ? '' : 'none';
      skipBtn.style.display = marks ? '' : 'none';
      rightBtn.style.display = marks ? '' : 'none';
      nextBtn.style.display = marks ? 'none' : '';
      nextBtn.disabled = mode === 'blurred';
    }

    function renderDone() {
      panel.innerHTML = '';
      const done = h('div', 'caq-done');
      done.appendChild(h('div', 'caq-done__emoji', '🎉'));
      done.appendChild(h('div', 'caq-done__title', 'סיימת את המבחן!'));
      done.appendChild(h('div', 'caq-done__sub', `עברת על כל ${quiz.total} האיברים. כל הכבוד!`));
      panel.appendChild(done);
      const f = h('div', 'caq-quiz__foot');
      const again = h('button', 'caq-btn', 'סגירה');
      again.addEventListener('click', finish);
      f.appendChild(again);
      panel.appendChild(f);
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      answer.classList.remove('caq-answer--blurred');
      answer.classList.add('caq-answer--revealed');
      hint.textContent = 'סמני אם זכרת (לא חובה)';
      footMode('answered');
    }

    async function load() {
      const item = quiz.current;
      revealed = false;
      progress.innerHTML = `<b>${quiz.position}</b> / ${quiz.total}`;
      fill.style.width = `${(quiz.position / quiz.total) * 100}%`;
      // Clear loading state inside the answer box so it is obvious we are working.
      answer.className = 'caq-answer caq-answer--loading';
      answer.style.cursor = 'default';
      answer.innerHTML =
        '<span class="caq-spinner"></span><span class="caq-loading-txt">מסמן את האיבר על המודל…</span>';
      prompt.style.visibility = 'hidden';
      hint.textContent = '';
      footMode('blurred');
      const ok = await CAQ.api.selectByCid(item.cid, item.model);
      prompt.style.visibility = '';
      if (ok) {
        answer.className = 'caq-answer caq-answer--blurred';
        answer.textContent = item.term;
        answer.style.cursor = 'pointer';
        hint.textContent = 'לחצי על המלבן המטושטש כדי לחשוף את האיבר';
      } else {
        answer.className = 'caq-answer';
        answer.textContent = '—';
        hint.textContent = 'לא הצלחתי לסמן את האיבר - אפשר להמשיך';
        footMode('skip');
      }
    }

    function advance() {
      if (quiz.isDone) { renderDone(); return; }
      quiz.next();
      load();
    }

    function finish() {
      CAQ.stopSpoilerWatch();
      CAQ.api.closeSearchPanel();
      CAQ.showSpoilers();
      CAQ.api.resetModel();
      panel.remove();
      const launch = document.querySelector('.caq-launch');
      if (launch) launch.style.display = '';
      if (onExit) onExit();
    }

    function mark(status) {
      const cur = quiz.current;
      if (cur && CAQ.store) CAQ.store.set(cur.cid, status);
      advance();
    }
    answer.addEventListener('click', reveal);
    rightBtn.addEventListener('click', () => mark('known'));
    wrongBtn.addEventListener('click', () => mark('unknown'));
    skipBtn.addEventListener('click', advance);
    nextBtn.addEventListener('click', advance);
    exit.addEventListener('click', finish);

    const launch = document.querySelector('.caq-launch');
    if (launch) launch.style.display = 'none';
    CAQ.startSpoilerWatch();
    CAQ.hideSpoilers(); // activate quiz mode up-front so spoilers never flash
    quiz.next();
    load();
    return panel;
  }

  CAQ.quizUI = { run };
})();
