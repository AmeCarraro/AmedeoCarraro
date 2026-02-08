/**
 * Simple Text-Based Chatbot Widget
 * No server, no API costs - pure client-side search
 */

class SimpleChatbot {
  constructor() {
    this.faqData = [];
    this.isOpen = false;
    this.messageHistory = [];
    this.init();
  }

  async init() {
    await this.loadFAQData();
    this.createWidget();
    this.attachEventListeners();
    this.addWelcomeMessage();
  }

  async loadFAQData() {
    try {
      const response = await fetch('chatbot-data.txt');
      const text = await response.text();
      this.parseFAQData(text);
    } catch (error) {
      console.error('Error loading FAQ data:', error);
      this.faqData = [{
        questions: ['error'],
        answer: 'Sorry, I couldn\'t load the data. Please try again later.'
      }];
    }
  }

  parseFAQData(text) {
    const lines = text.split('\n').filter(line =>
      line.trim() && !line.startsWith('#')
    );

    lines.forEach(line => {
      if (line.startsWith('Q:') && line.includes('|') && line.includes('A:')) {
        const [qPart, aPart] = line.split('A:');
        const questions = qPart.replace('Q:', '').split('|').map(q => q.trim().toLowerCase());
        const answer = aPart.trim();

        if (questions.length > 0 && answer) {
          this.faqData.push({ questions, answer });
        }
      }
    });
  }

  createWidget() {
    const html = `
      <div id="chatbot-container">
        <!-- Bubble button -->
        <button id="chatbot-bubble" aria-label="Open chat" title="Got questions? Ask me!">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

        <!-- Chat window -->
        <div id="chatbot-window" class="chatbot-hidden">
          <div id="chatbot-header">
            <div class="chatbot-header-content">
              <div class="chatbot-avatar">AC</div>
              <div>
                <div class="chatbot-title">AI Assistant</div>
                <div class="chatbot-subtitle">WIP - answers might not be perfect</div>
              </div>
            </div>
            <button id="chatbot-close" aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div id="chatbot-messages"></div>

          <div id="chatbot-input-area">
            <input
              type="text"
              id="chatbot-input"
              placeholder="Type your question..."
              aria-label="Chat message input"
            />
            <button id="chatbot-send" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          <div id="chatbot-suggestions"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  attachEventListeners() {
    const bubble = document.getElementById('chatbot-bubble');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');

    bubble.addEventListener('click', () => this.toggleChat());
    closeBtn.addEventListener('click', () => this.toggleChat());
    sendBtn.addEventListener('click', () => this.handleSend());

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });

    input.addEventListener('input', () => this.updateSuggestions());
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatbot-window');
    const bubble = document.getElementById('chatbot-bubble');

    if (this.isOpen) {
      window.classList.remove('chatbot-hidden');
      bubble.style.display = 'none';
      document.getElementById('chatbot-input').focus();
    } else {
      window.classList.add('chatbot-hidden');
      bubble.style.display = 'flex';
    }
  }

  addWelcomeMessage() {
    this.addBotMessage(
      'Hi! 👋 I\'m Amedeo\'s virtual assistant. Ask me about skills, projects, contacts or more! (First response may take 30s due to server startup)<br>Who am I talking to?'
    );
    this.showQuickReplies();
  }

  showQuickReplies() {
    const quickReplies = [
      'Who are you?',
      'Who is Amedeo?',
      'Show me projects',
      'How to contact?'
    ];

    const suggestionsDiv = document.getElementById('chatbot-suggestions');
    suggestionsDiv.innerHTML = quickReplies.map(reply =>
      `<button class="chatbot-quick-reply" data-reply="${reply}">${reply}</button>`
    ).join('');

    suggestionsDiv.querySelectorAll('.chatbot-quick-reply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reply = e.target.getAttribute('data-reply');
        document.getElementById('chatbot-input').value = reply;
        this.handleSend();
      });
    });
  }

  updateSuggestions() {
    const input = document.getElementById('chatbot-input').value.toLowerCase().trim();
    const suggestionsDiv = document.getElementById('chatbot-suggestions');

    if (!input) {
      this.showQuickReplies();
      return;
    }

    const matches = this.faqData
      .filter(faq => faq.questions.some(q => q.includes(input)))
      .slice(0, 3);

    if (matches.length > 0) {
      suggestionsDiv.innerHTML = matches.map(faq =>
        `<button class="chatbot-quick-reply" data-reply="${faq.questions[0]}">${this.capitalize(faq.questions[0])}</button>`
      ).join('');

      suggestionsDiv.querySelectorAll('.chatbot-quick-reply').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const reply = e.target.getAttribute('data-reply');
          document.getElementById('chatbot-input').value = reply;
          this.handleSend();
        });
      });
    } else {
      suggestionsDiv.innerHTML = '';
    }
  }

  async handleSend() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message) return;

    this.addUserMessage(message);
    input.value = '';
    document.getElementById('chatbot-suggestions').innerHTML = '';

    // Show typing indicator
    this.addTypingIndicator();

    try {
      const response = await this.getAIResponse(message);
      this.removeTypingIndicator();
      this.addBotMessage(response);
      this.showQuickReplies();
    } catch (error) {
      this.removeTypingIndicator();
      this.addBotMessage('Mi dispiace, si è verificato un errore. Riprova tra poco.');
      console.error('Chat error:', error);
    }
  }

  async getAIResponse(message) {
    // Use Render backend
    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/chat'
      : 'https://amedeocarraro.onrender.com/chat';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  addTypingIndicator() {
    const messagesDiv = document.getElementById('chatbot-messages');
    const indicator = document.createElement('div');
    indicator.className = 'chatbot-message chatbot-message-bot';
    indicator.id = 'chatbot-typing';

    const bubble = document.createElement('div');
    bubble.className = 'chatbot-message-bubble chatbot-typing-indicator';
    bubble.innerHTML = '<span></span><span></span><span></span>';

    indicator.appendChild(bubble);
    messagesDiv.appendChild(indicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('chatbot-typing');
    if (indicator) {
      indicator.remove();
    }
  }

  findAnswer(userMessage) {
    const query = userMessage.toLowerCase().trim();
    const words = query.split(/\s+/);

    let bestMatch = null;
    let bestScore = 0;

    this.faqData.forEach(faq => {
      let score = 0;

      faq.questions.forEach(question => {
        // Exact match
        if (question === query) {
          score += 100;
        }
        // Contains full query
        else if (question.includes(query)) {
          score += 50;
        }
        // Word matching
        else {
          const questionWords = question.split(/\s+/);
          words.forEach(word => {
            if (word.length > 2 && questionWords.some(qw => qw.includes(word) || word.includes(qw))) {
              score += 10;
            }
          });
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    });

    if (bestScore > 8) {
      return bestMatch.answer;
    } else {
      return `Mi dispiace, non ho trovato una risposta specifica. Prova a riformulare la domanda o contatta direttamente Amedeo su <a href="mailto:amedeo.carraro01@gmail.com">amedeo.carraro01@gmail.com</a>`;
    }
  }

  addUserMessage(text) {
    this.addMessage(text, 'user');
  }

  addBotMessage(text) {
    this.addMessage(text, 'bot');
  }

  addMessage(text, sender) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message chatbot-message-${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'chatbot-message-bubble';
    bubble.innerHTML = text;

    messageDiv.appendChild(bubble);
    messagesDiv.appendChild(messageDiv);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SimpleChatbot());
} else {
  new SimpleChatbot();
}
