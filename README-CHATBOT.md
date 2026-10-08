# Assistant widget

The small assistant in the corner of the site answers questions about me from `chatbot-data.txt`.

## How it works

1. `chatbot.js` loads `chatbot-data.txt` and matches the visitor's question against it in the browser. This works without any server and replies at once.
2. On page load the widget also asks `/api/chat` (the function in `api/chat.py`, which runs on Vercel with the site) whether a language model is configured. If it is, every question except a greeting is sent there with the titles of the closest entries, and the model writes the answer from those entries. When the match finds nothing close, often because the question is not in English, the model is given the whole file instead.
3. If the endpoint is slow, fails, or the free quota of the provider is used up, the answer matched in the browser is shown instead.

## Files

| File | Purpose |
|---|---|
| `chatbot-data.txt` | Knowledge base: a `Q:` line with variants separated by `\|` (English or Italian), then an `A:` line |
| `assistant-core.js` | Matching rules, shared by the widget and the test page |
| `chatbot.js` | Widget and call to the endpoint |
| `api/chat.py` | Endpoint on Vercel: gives the model the chosen entries and returns its answer |
| `tests/assistant-test.html` | Runs the questions in `tests/assistant-questions.json` and checks which entry answers each one |
| `tests/dev_server.py` | Local preview of the site with the endpoint |
| `chatbot.css` | Widget styles, using the colour variables of `styles.css` |

## Language model setup (optional)

The endpoint works with any provider that has an OpenAI-compatible API. It is configured with environment variables, set in the Vercel project (Settings → Environment Variables) and applied from the next deployment:

| Variable | Value |
|---|---|
| `LLM_API_KEY` | Key of the provider. Without it the widget answers with the browser match only |
| `LLM_BASE_URL` | Optional. Default `https://api.groq.com/openai/v1`; for Gemini `https://generativelanguage.googleapis.com/v1beta/openai` |
| `LLM_MODEL` | Optional. Default `openai/gpt-oss-120b`; for Gemini for example `gemini-2.5-flash-lite` |

A question answered from the closest entries takes about 500 tokens, one answered from the whole file about 3,000. Use a key from a free plan with no payment method: when the quota is used up the provider refuses the request and the widget falls back to the browser match, so nothing can be charged.

Local run, with the same variables in a `.env` file:

```bash
python tests/dev_server.py
```

Then open `http://localhost:8766`.

## Updating the answers

Edit `chatbot-data.txt`, then open `tests/assistant-test.html` through a local server (`python -m http.server 8000`) and check that every question is still answered by the expected entry. Add a line to `tests/assistant-questions.json` for each new kind of question. Keep the answers in line with the CV and the pages of the site.
