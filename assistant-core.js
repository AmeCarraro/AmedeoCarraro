/**
 * Matching logic of the assistant, without any interface code, so that the widget
 * (chatbot.js) and the test page (tests/assistant-test.html) share exactly the same rules.
 *
 * AssistantCore.parse(text)            -> entries of chatbot-data.txt
 * AssistantCore.match(entries, text)   -> { kind: 'match' | 'greeting' | 'fallback', answer, entry }
 */
(function (root) {
  'use strict';

  var CONTACT = 'amedeo.carraro01@gmail.com';

  // Words that carry no meaning for the match, in English and Italian. The name is
  // here too: it appears in almost every question and would match everything.
  var STOPWORDS = ('a about an and any are at be been by can could did do does for from get has have he her him his how i in is it ' +
    'know like me my of on or s she some tell that the their them there they this to use used uses was what when where which ' +
    'who why will with you your amedeo carraro ' +
    'al alla che chi come con cosa da dei del della delle di dove e ed gli ha ho i il la le lo lui ma mi nel nella per piu ' +
    'quale quali quando se si sono su sua sue suo suoi ti tra un una uno').split(' ');

  // Lower case, no accents, punctuation turned into spaces.
  function normalise(text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9+#]+/g, ' ').trim();
  }

  // A crude stem, enough for "models" = "model", "studying" = "study", "locally" = "local".
  function stem(word) {
    var w = word;
    if (w.length > 4 && /ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (w.length > 4 && /ied$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (/sses$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
    else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 4 && /ly$/.test(w)) w = w.slice(0, -2);
    return w;
  }

  function tokens(text) {
    return normalise(text).split(' ').filter(function (w) {
      return w.length > 1 && STOPWORDS.indexOf(w) === -1;
    }).map(stem);
  }

  function containsPhrase(text, phrase) {
    return (' ' + text + ' ').indexOf(' ' + phrase + ' ') !== -1;
  }

  // File format: a "Q:" line with variants separated by "|", then an "A:" line.
  function parse(text) {
    var entries = [];
    var questions = null;
    String(text).split('\n').forEach(function (raw) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      if (line.indexOf('Q:') === 0) {
        questions = line.slice(2).split('|').map(function (q) { return q.trim(); }).filter(Boolean);
      } else if (line.indexOf('A:') === 0 && questions) {
        entries.push({
          questions: questions,
          phrases: questions.map(normalise).filter(function (q) { return q.length > 1; }),
          questionTokens: tokens(questions.join(' ')),
          answerTokens: tokens(line.slice(2)),
          answer: line.slice(2).trim()
        });
        questions = null;
      }
    });
    return entries;
  }

  function match(entries, message) {
    var query = normalise(message);
    var words = tokens(message);

    if (/^(hi|hello|hey|ciao|salve|buongiorno|buonasera)( |$)/.test(query) && query.split(' ').length <= 2) {
      return { kind: 'greeting', entry: null, answer: "Hi! Ask me about Amedeo's work, projects, skills or education." };
    }

    var best = null;
    var bestScore = 0;
    entries.forEach(function (entry) {
      var score = 0;
      var inQuestion = 0;
      var inAnswer = 0;
      entry.phrases.forEach(function (phrase) {
        if (phrase === query) score += 100;
        else if (containsPhrase(query, phrase)) score += 40;
        else if (query.length > 3 && containsPhrase(phrase, query)) score += 40;
      });
      words.forEach(function (w) {
        if (entry.questionTokens.indexOf(w) !== -1) { score += 10; inQuestion += 1; }
        else if (entry.answerTokens.indexOf(w) !== -1) { score += 3; inAnswer += 1; }
      });
      // One shared word is not enough for a longer question: it has to share a whole
      // phrase, two words, or a word plus something from the answer.
      var enough = score >= 40 || inQuestion >= 2 || (inQuestion >= 1 && (inAnswer >= 1 || words.length === 1));
      if (enough && score > bestScore) { bestScore = score; best = entry; }
    });

    if (best) return { kind: 'match', entry: best, answer: best.answer };
    return {
      kind: 'fallback',
      entry: null,
      answer: "I don't have an answer to that one. Try asking about Amedeo's work, projects, skills or education, or write to him at " + CONTACT + '.'
    };
  }

  root.AssistantCore = { parse: parse, match: match, normalise: normalise, tokens: tokens };
})(window);
