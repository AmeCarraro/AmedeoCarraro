/**
 * Portfolio assistant widget.
 *
 * Answers come from chatbot-data.txt, a small set of questions and answers about
 * Amedeo. The widget matches the visitor's question against that file in the
 * browser (rules in assistant-core.js), so it replies at once and works without
 * any server.
 *
 * If the optional backend (app.py) reports that a language model is configured,
 * questions are sent there instead and the local match is used as a fallback.
 */
(function () {
  'use strict';

  var BACKEND = 'https://amedeocarraro.onrender.com';
  var DATA_FILE = 'chatbot-data.txt';
  var QUICK_REPLIES = ['Who is Amedeo?', 'What does he build at work?', 'Show me projects', 'How to contact?'];

  var faq = [];
  var useBackend = false;
  var isOpen = false;
  var els = {};

  // ---------- data ----------

  // The matching rules live in assistant-core.js, shared with the test page.
  function localAnswer(message) {
    return window.AssistantCore.match(faq, message).answer;
  }

  function timeout(ms) {
    return new Promise(function (resolve, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); });
  }

  function backendAnswer(message) {
    var request = fetch(BACKEND + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || !data.response) throw new Error('empty response');
      return String(data.response);
    });
    return Promise.race([request, timeout(12000)]);
  }

  function answer(message) {
    if (!useBackend) return Promise.resolve(localAnswer(message));
    return backendAnswer(message).catch(function () { return localAnswer(message); });
  }

  // The backend sleeps when idle. Checking it on load wakes it up; until it says
  // a language model is available, answers are matched locally.
  function checkBackend() {
    fetch(BACKEND + '/health').then(function (res) { return res.json(); }).then(function (data) {
      useBackend = !!(data && data.llm_loaded);
    }).catch(function () { useBackend = false; });
  }

  // ---------- interface ----------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function icon(paths) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  // Text only, with email addresses and URLs turned into links. Never innerHTML.
  function fillWithLinks(node, text) {
    var pattern = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|((?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|dev|io|org|net)(?:\/[^\s,;)]*)?)/gi;
    var last = 0;
    var match;
    while ((match = pattern.exec(text))) {
      var found = match[0].replace(/[.]+$/, '');
      node.appendChild(document.createTextNode(text.slice(last, match.index)));
      var href = match[1] ? 'mailto:' + found : (/^https?:\/\//i.test(found) ? found : 'https://' + found);
      var link = el('a', { href: href, text: found });
      if (!match[1]) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer'); }
      node.appendChild(link);
      last = match.index + found.length;
      pattern.lastIndex = last;
    }
    node.appendChild(document.createTextNode(text.slice(last)));
  }

  function addMessage(text, sender) {
    var bubble = el('div', { 'class': 'chatbot-message-bubble' });
    if (sender === 'bot') fillWithLinks(bubble, text); else bubble.textContent = text;
    els.messages.appendChild(el('div', { 'class': 'chatbot-message chatbot-message-' + sender }, [bubble]));
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function showTyping() {
    var dots = el('div', { 'class': 'chatbot-message-bubble chatbot-typing-indicator' }, [el('span'), el('span'), el('span')]);
    els.messages.appendChild(el('div', { 'class': 'chatbot-message chatbot-message-bot', id: 'chatbot-typing' }, [dots]));
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById('chatbot-typing');
    if (typing) typing.remove();
  }

  function showSuggestions(list) {
    els.suggestions.textContent = '';
    list.forEach(function (text) {
      var button = el('button', { 'class': 'chatbot-quick-reply', type: 'button', text: text });
      button.addEventListener('click', function () { send(text); });
      els.suggestions.appendChild(button);
    });
  }

  function updateSuggestions() {
    var typed = window.AssistantCore.normalise(els.input.value);
    if (!typed) { showSuggestions(QUICK_REPLIES); return; }
    var matches = faq.filter(function (item) {
      return item.phrases.some(function (q) { return q.indexOf(typed) !== -1; });
    }).slice(0, 3).map(function (item) { return item.questions[0]; });
    showSuggestions(matches);
  }

  function send(text) {
    var message = (text || els.input.value).trim();
    if (!message) return;
    addMessage(message, 'user');
    els.input.value = '';
    els.suggestions.textContent = '';
    showTyping();
    var started = Date.now();
    answer(message).then(function (reply) {
      // A short pause so the reply does not appear before the question has settled.
      var wait = Math.max(0, 350 - (Date.now() - started));
      setTimeout(function () {
        hideTyping();
        addMessage(reply, 'bot');
        showSuggestions(QUICK_REPLIES);
      }, wait);
    });
  }

  function toggle() {
    isOpen = !isOpen;
    els.window.classList.toggle('chatbot-hidden', !isOpen);
    els.bubble.hidden = isOpen;
    els.bubble.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) els.input.focus(); else els.bubble.focus();
  }

  function build() {
    els.bubble = el('button', { id: 'chatbot-bubble', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'chatbot-window' },
      [icon(['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z']), el('span', { text: 'Ask about me' })]);

    els.close = el('button', { id: 'chatbot-close', type: 'button', 'aria-label': 'Close the assistant' }, [icon(['M18 6 6 18', 'M6 6l12 12'])]);
    var header = el('div', { id: 'chatbot-header' }, [
      el('div', { 'class': 'chatbot-header-content' }, [
        el('div', { 'class': 'chatbot-avatar', text: 'AC', 'aria-hidden': 'true' }),
        el('div', {}, [
          el('div', { 'class': 'chatbot-title', text: 'Assistant' }),
          el('div', { 'class': 'chatbot-subtitle', text: 'Answers questions about Amedeo' })
        ])
      ]),
      els.close
    ]);

    els.messages = el('div', { id: 'chatbot-messages', 'aria-live': 'polite' });
    els.suggestions = el('div', { id: 'chatbot-suggestions' });
    els.input = el('input', { id: 'chatbot-input', type: 'text', placeholder: 'Type your question…', 'aria-label': 'Your question', autocomplete: 'off', maxlength: '300' });
    els.send = el('button', { id: 'chatbot-send', type: 'button', 'aria-label': 'Send' }, [icon(['M22 2 11 13', 'M22 2l-7 20-4-9-9-4z'])]);

    els.window = el('div', { id: 'chatbot-window', 'class': 'chatbot-hidden', role: 'dialog', 'aria-label': 'Assistant' }, [
      header, els.messages, els.suggestions, el('div', { id: 'chatbot-input-area' }, [els.input, els.send])
    ]);

    document.body.appendChild(el('div', { id: 'chatbot-container' }, [els.bubble, els.window]));

    els.bubble.addEventListener('click', toggle);
    els.close.addEventListener('click', toggle);
    els.send.addEventListener('click', function () { send(); });
    els.input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') send();
      if (event.key === 'Escape') toggle();
    });
    els.input.addEventListener('input', updateSuggestions);

    addMessage("Hi! I can answer questions about Amedeo's work, projects, skills and education. What would you like to know?", 'bot');
    showSuggestions(QUICK_REPLIES);
  }

  function init() {
    build();
    fetch(DATA_FILE).then(function (res) { return res.text(); }).then(function (text) { faq = window.AssistantCore.parse(text); }).catch(function () { faq = []; });
    checkBackend();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
