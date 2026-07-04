// quiz.js - quiz state: an ordered, non-repeating run over a chosen set of items.
(function () {
  const CAQ = (window.CAQ = window.CAQ || {});

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  class Quiz {
    // items: [{term, cid, model}]
    constructor(items) {
      // De-duplicate by cid so the same highlight is never asked twice.
      const seen = new Set();
      const unique = items.filter((it) => {
        if (seen.has(it.cid)) return false;
        seen.add(it.cid);
        return true;
      });
      this.order = shuffle(unique);
      this.index = -1;
    }
    get total() { return this.order.length; }
    get position() { return this.index + 1; }
    get current() { return this.order[this.index] || null; }
    get hasNext() { return this.index < this.order.length - 1; }
    get isDone() { return this.index >= this.order.length - 1; }
    next() {
      if (this.index < this.order.length - 1) this.index++;
      return this.current;
    }
  }

  CAQ.Quiz = Quiz;
})();
