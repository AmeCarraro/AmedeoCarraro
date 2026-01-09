# RAG Chatbot Backend

Backend Flask con LLM locale (Phi-2) per il chatbot del portfolio.

## Features

- 🤖 LLM locale (Phi-2 quantizzato 4-bit)
- 📚 Sistema RAG con keyword search
- ⚡ Fallback automatico se LLM non disponibile
- 🆓 Hosting gratuito su Render.com
- 🌍 CORS abilitato per frontend

## Deploy su Render

1. Vai su [render.com](https://render.com)
2. Clicca "New +" → "Web Service"
3. Connetti repository GitHub
4. Render rileverà automaticamente `render.yaml`
5. Clicca "Deploy"

Il deploy scaricherà automaticamente il modello Phi-2 (1.6GB).

## Local Development

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server su http://localhost:5000

## Endpoints

- `GET /health` - Health check
- `POST /chat` - Chat endpoint
  ```json
  {
    "message": "Chi sei?"
  }
  ```

## Environment Variables

- `PORT` - Porta server (default: 5000)
- `MODEL_PATH` - Path al modello GGUF (default: ./models/phi-2.Q4_K_M.gguf)
