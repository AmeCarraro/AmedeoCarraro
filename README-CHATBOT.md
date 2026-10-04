# Assistant widget

The small assistant in the corner of the site answers questions about me from `chatbot-data.txt`.

## How it works

1. `chatbot.js` loads `chatbot-data.txt` and matches the visitor's question against it in the browser. This works without any server and replies at once.
2. On page load the widget also calls `/health` on the optional backend (`app.py`). If the backend reports that a language model is configured (`llm_loaded: true`), questions are sent to `/chat`: the backend retrieves the closest entries from the same file and asks the model to write the answer from them. If the backend is asleep, slow or fails, the browser match is used instead.

## Files

| File | Purpose |
|---|---|
| `chatbot-data.txt` | Knowledge base: a `Q:` line with variants separated by `\|` (English or Italian), then an `A:` line |
| `assistant-core.js` | Matching rules, shared by the widget and the test page |
| `chatbot.js` | Widget and optional backend call |
| `tests/assistant-test.html` | Runs the questions in `tests/assistant-questions.json` and checks which entry answers each one |
| `chatbot.css` | Widget styles, using the colour variables of `styles.css` |
| `app.py` | Optional Flask backend (retrieval + Gemini), deployed on Render |
| `render.yaml`, `requirements.txt` | Backend deployment |
| `api/chat.py` | Older serverless variant, not used by the site |

## Backend setup (optional)

The backend needs one environment variable, `GEMINI_API_KEY`, set in the Render dashboard. Without it the service still runs and answers with the closest entry.

Local run:

```bash
pip install -r requirements.txt
GEMINI_API_KEY=... python app.py
```

Then open the site from a local server on `localhost`; set `BACKEND` in `chatbot.js` to `http://localhost:5000` while testing.

## Updating the answers

Edit `chatbot-data.txt`, then open `tests/assistant-test.html` through a local server (`python -m http.server 8000`) and check that every question is still answered by the expected entry. Add a line to `tests/assistant-questions.json` for each new kind of question. Keep the answers in line with the CV and the pages of the site.
