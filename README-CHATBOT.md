# RAG Chatbot Setup Guide

Il chatbot usa un sistema RAG (Retrieval-Augmented Generation) completamente **GRATUITO** con Vercel + Groq.

## 🚀 Deploy su Vercel (GRATIS)

### 1. Ottieni la Groq API Key (GRATUITA)

1. Vai su [https://console.groq.com/](https://console.groq.com/)
2. Crea un account gratuito
3. Vai su "API Keys" e crea una nuova chiave
4. **Limiti gratuiti**: 70 richieste/minuto, 14,400 richieste/giorno

### 2. Deploy su Vercel

#### Opzione A: Via GitHub (Consigliato)

1. Push del codice su GitHub (già fatto ✓)
2. Vai su [https://vercel.com/](https://vercel.com/)
3. Clicca "Import Project"
4. Seleziona il repository `AmedeoCarraro`
5. Aggiungi la variabile d'ambiente:
   - Nome: `GROQ_API_KEY`
   - Valore: la tua chiave Groq
6. Clicca "Deploy"

#### Opzione B: Via CLI

```bash
# Installa Vercel CLI
npm install -g vercel

# Deploy
cd AmedeoCarraro
vercel

# Aggiungi la API key
vercel env add GROQ_API_KEY
# Incolla la tua chiave Groq quando richiesto
```

### 3. Configura il Custom Domain (Opzionale)

1. In Vercel Dashboard → Settings → Domains
2. Aggiungi `tuodominio.com`
3. Configura i DNS come indicato

## 📁 Struttura del Progetto

```
AmedeoCarraro/
├── api/
│   └── chat.py          # Backend serverless con RAG
├── chatbot.js           # Frontend widget
├── chatbot.css          # Stili
├── chatbot-data.txt     # Knowledge base (FAQ)
├── vercel.json          # Configurazione Vercel
├── requirements.txt     # Dipendenze Python (nessuna!)
└── .env.example         # Template variabili d'ambiente
```

## 🎯 Come Funziona

1. **Utente** fa una domanda nel widget
2. **Frontend** (chatbot.js) invia richiesta a `/api/chat`
3. **Backend** (api/chat.py):
   - Cerca nel file `chatbot-data.txt` (RAG retrieval)
   - Trova i 3 chunks più relevanti
   - Invia a Groq LLM con il contesto
4. **Groq** genera risposta usando il contesto
5. **Frontend** mostra la risposta

## 💰 Costi

- **Vercel**: GRATIS (100GB bandwidth, invocazioni illimitate per hobby)
- **Groq**: GRATIS (70 req/min, 14,400 req/giorno)
- **Totale**: €0/mese 🎉

## 📝 Aggiungere Nuove FAQ

Modifica `chatbot-data.txt`:

```txt
Q: domanda principale | variante 1 | variante 2
A: la risposta qui
```

Push su GitHub → Vercel fa re-deploy automaticamente.

## 🔧 Test Locale (Opzionale)

```bash
# Installa Vercel CLI
npm install -g vercel

# Crea file .env
cp .env.example .env
# Aggiungi la tua GROQ_API_KEY nel file .env

# Avvia server locale
vercel dev

# Apri http://localhost:3000
```

## 🚨 Troubleshooting

### Errore: "API key not configured"
- Verifica di aver aggiunto `GROQ_API_KEY` nelle environment variables di Vercel
- Re-deploy dopo aver aggiunto la variabile

### Errore: "Failed to generate response"
- Verifica che la chiave Groq sia valida
- Controlla i limiti rate (70 req/min)
- Guarda i logs in Vercel Dashboard

### Il widget non appare
- Verifica che `chatbot.css` e `chatbot.js` siano inclusi in `index.html` e `about.html`
- Controlla la console browser per errori

## 📊 Monitoring

- Logs: Vercel Dashboard → Project → Functions
- Usage Groq: [https://console.groq.com/](https://console.groq.com/) → Usage

## 🎨 Personalizzazione

- **Colori**: Modifica `chatbot.css`
- **Prompt**: Modifica `system_prompt` in `api/chat.py`
- **FAQ**: Modifica `chatbot-data.txt`
- **Modello LLM**: Cambia `model` in `api/chat.py` (es: `llama-3.1-8b-instant` per velocità)
