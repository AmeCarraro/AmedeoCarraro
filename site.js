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
