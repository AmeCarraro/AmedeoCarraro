// Theme toggle. The stored choice is applied by a tiny inline script in <head>
// so the page never flashes the wrong theme.
(function () {
  var root = document.documentElement;
  var button = document.querySelector('.theme-toggle');
  if (!button) return;

  function current() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();

// Movement: sections come up while scrolling, the drawings draw themselves, the
// numbers of the hero count up, cards are lit where the pointer is and a thin bar
// shows how far down the page is. The page reads the same without any of it, and
// all of it is skipped for visitors who ask for reduced motion.
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) return;

  function each(selector, fn) { Array.prototype.forEach.call(document.querySelectorAll(selector), fn); }

  // Only what is still below the window is hidden, so nothing on screen flickers.
  var revealer = new IntersectionObserver(function (entries) {
    var shown = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var node = entry.target;
      var delay = shown++ * 70;
      revealer.unobserve(node);
      node.style.transitionDelay = delay + 'ms';
      node.classList.add('in');
      // Afterwards the classes go away, so the card's own hover transition is back.
      setTimeout(function () { node.classList.remove('reveal', 'in'); node.style.transitionDelay = ''; }, delay + 700);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  each('.entry, .system, .project, .rows > div, section.block > h2, section.block > p, .note', function (node) {
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    node.classList.add('reveal');
    revealer.observe(node);
  });

  // pathLength="1" lets one CSS rule draw every line, whatever its real length.
  var drawer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      drawer.unobserve(entry.target);
      entry.target.classList.add('in');
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  each('.fig', function (figure) {
    Array.prototype.forEach.call(figure.querySelectorAll('.s'), function (line) { line.setAttribute('pathLength', '1'); });
    figure.classList.add('draw');
    drawer.observe(figure);
  });

  each('.stats b[data-count]', function (node) {
    var value = node.getAttribute('data-count');
    var target = parseFloat(value);
    var decimals = (value.split('.')[1] || '').length;
    var suffix = node.getAttribute('data-suffix') || '';
    var started = null;
    // The count starts with the first frame that is really painted: in a tab that
    // is not on screen the final number written in the page stays as it is.
    function frame(now) {
      if (started === null) started = now + 350;
      var t = Math.min(1, Math.max(0, (now - started) / 1200));
      node.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  document.addEventListener('pointermove', function (event) {
    var card = event.target.closest && event.target.closest('.system, .project');
    if (!card) return;
    var box = card.getBoundingClientRect();
    card.style.setProperty('--mx', (event.clientX - box.left) + 'px');
    card.style.setProperty('--my', (event.clientY - box.top) + 'px');
  });

  var bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var waiting = false;
  function progress() {
    waiting = false;
    var room = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (room > 0 ? Math.min(1, window.scrollY / room) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!waiting) { waiting = true; requestAnimationFrame(progress); }
  }, { passive: true });
  progress();
})();
