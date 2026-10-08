"""
Local preview of the site with the assistant endpoint: the pages are served as
static files and /api/chat runs api/chat.py, as on Vercel.

    python tests/dev_server.py [port]

Variables in a .env file next to the pages (LLM_API_KEY and so on) are loaded first.
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(SITE, 'api'))
import chat  # noqa: E402


def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as f:
        for line in f:
            name, separator, value = line.strip().partition('=')
            if separator and not name.startswith('#'):
                os.environ.setdefault(name.strip(), value.strip())


class Handler(chat.handler, SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE, **kwargs)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/chat':
            return chat.handler.do_GET(self)
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path.split('?')[0] == '/api/chat':
            return chat.handler.do_POST(self)
        self.send_error(404)


if __name__ == '__main__':
    load_env(os.path.join(SITE, '.env'))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f'http://localhost:{port}  (language model: {"on" if os.environ.get("LLM_API_KEY") else "off"})')
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
