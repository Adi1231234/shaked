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
    const fill = h('div', 'caq-bar__fill'); bar.appendChild(fill);
    const prompt = h('div', 'caq-prompt', 'מהו האיבר המסומן על המודל?');
    const answer = h('div', 'caq-answer');
    const hint = h('div', 'caq-hint', '');
    // Re-marks the current structure as SELECTED on the model (useful after the
    // learner has clicked HIDE / Isolate / Fade on the now-visible info card).
    const reselectBtn = h('button', 'caq-btn caq-btn--ghost caq-reselect', '🎯 סמן שוב את האיבר');
    const foot = h('div', 'caq-quiz__foot');
    // After revealing, the learner can optionally mark whether they remembered it.
    const wrongBtn = h('button', 'caq-btn caq-btn--wrong', '✗ לא זכרתי');
    const skipBtn = h('button', 'caq-btn caq-btn--ghost caq-btn--skip', 'דלג');
    const rightBtn = h('button', 'caq-btn caq-btn--right', '✓ זכרתי');
    const nextBtn = h('button', 'caq-btn', 'המשך');
    [wrongBtn, skipBtn, rightBtn, nextBtn].forEach((b) => foot.appendChild(b));
    [top, bar, prompt, answer, hint, reselectBtn, foot].forEach((e) => panel.appendChild(e));
    document.body.appendChild(panel);

    let revealed = false;
    let nKnown = 0, nUnknown = 0; // "remembered" / "didn't remember" marks this session

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
      const answered = nKnown + nUnknown;
      const skipped = quiz.total - answered;
      const pct = answered ? Math.round((nKnown / answered) * 100) : 0;
      const emoji = !answered ? '📋' : pct >= 80 ? '🎉' : pct >= 50 ? '👏' : '💪';
      const done = h('div', 'caq-done');
      done.appendChild(h('div', 'caq-done__emoji', emoji));
      done.appendChild(h('div', 'caq-done__title', 'סיימת את המבחן!'));
      if (answered) {
        const s = h('div', 'caq-done__sub');
        s.innerHTML = `זכרת <b style="color:var(--caq-green)">${nKnown}</b> מתוך <b>${answered}</b> שסימנת (${pct}%)`;
        done.appendChild(s);
        if (skipped) done.appendChild(h('div', 'caq-done__sub', `${skipped} מתוך ${quiz.total} האיברים לא סומנו`));
      } else {
        done.appendChild(h('div', 'caq-done__sub', `עברת על כל ${quiz.total} האיברים (לא סימנת זכרתי / לא זכרתי).`));
      }
      panel.appendChild(done);
      const f = h('div', 'caq-quiz__foot');
      const again = h('button', 'caq-btn', 'סגירה');
      again.addEventListener('click', finish);
      f.appendChild(again); panel.appendChild(f);
    }

    function reveal() {
      // Reveal only a genuinely-shown (blurred) answer - not the spinner or a failed "—".
      if (revealed || !answer.classList.contains('caq-answer--blurred')) return;
      revealed = true;
      answer.classList.remove('caq-answer--blurred');
      answer.classList.add('caq-answer--revealed');
      CAQ.revealAllSpoilers(); // answer is out → reveal the name, subtitle & breadcrumbs too
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
      reselectBtn.style.display = 'none'; // only offered once a structure is marked
      footMode('blurred');
      // .catch → false so one erroring structure can't hang the quiz on the spinner.
      const ok = await CAQ.api.selectByCid(item.cid, item.model).catch(() => false);
      prompt.style.visibility = '';
      if (ok) {
        answer.className = 'caq-answer caq-answer--blurred';
        answer.textContent = item.term;
        answer.style.cursor = 'pointer';
        hint.textContent = 'לחצי על המלבן המטושטש כדי לחשוף את האיבר';
        reselectBtn.style.display = '';
      } else {
        answer.className = 'caq-answer';
        answer.textContent = '—';
        hint.textContent = 'לא הצלחתי לסמן את האיבר - אפשר להמשיך';
        footMode('skip');
      }
    }

    // Re-run the selection for the current structure so it is SELECTED again on
    // the model, without touching the quiz progress or the reveal state.
    let reselecting = false;
    async function reselect() {
      const item = quiz.current;
      if (reselecting || !item) return;
      reselecting = true;
      reselectBtn.disabled = true;
      const prevHint = hint.textContent;
      hint.textContent = 'מסמן מחדש את האיבר…';
      const ok = await CAQ.api.selectByCid(item.cid, item.model).catch(() => false);
      hint.textContent = ok ? prevHint : 'לא הצלחתי לסמן מחדש את האיבר';
      reselectBtn.disabled = false;
      reselecting = false;
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
      if (status === 'known') nKnown++; else if (status === 'unknown') nUnknown++;
      advance();
    }
    answer.addEventListener('click', reveal);
    reselectBtn.addEventListener('click', reselect);
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
