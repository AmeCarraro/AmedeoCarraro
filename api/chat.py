"""
RAG Chatbot API - Pure keyword search
Serverless function for Vercel (no external API dependencies)
"""

import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs
import re

# Simple in-memory vector search using cosine similarity
class SimpleRAG:
    def __init__(self, knowledge_file):
        self.chunks = []
        self.load_knowledge(knowledge_file)

    def load_knowledge(self, filepath):
        """Load and chunk the knowledge base"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Parse FAQ format
            lines = content.split('\n')
            current_qa = None

            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                if line.startswith('Q:') and 'A:' in line:
                    parts = line.split('A:')
                    question = parts[0].replace('Q:', '').strip()
                    answer = parts[1].strip() if len(parts) > 1 else ""

                    if answer:
                        # Store multiple question variants
                        questions = [q.strip() for q in question.split('|')]
                        self.chunks.append({
                            'questions': questions,
                            'answer': answer,
                            'text': f"{questions[0]} {answer}"  # For matching
                        })
        except Exception as e:
            print(f"Error loading knowledge: {e}")

    def retrieve(self, query, top_k=3):
        """Simple keyword-based retrieval"""
        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))

        # Score each chunk
        scored_chunks = []
        for chunk in self.chunks:
            score = 0
            chunk_text = chunk['text'].lower()

            # Exact match in questions
            for q in chunk['questions']:
                if query_lower in q.lower() or q.lower() in query_lower:
                    score += 100

            # Word overlap
            chunk_words = set(re.findall(r'\w+', chunk_text))
            overlap = len(query_words & chunk_words)
            score += overlap * 10

            if score > 0:
                scored_chunks.append((score, chunk))

        # Sort by score and return top_k
        scored_chunks.sort(reverse=True, key=lambda x: x[0])
        return [chunk for score, chunk in scored_chunks[:top_k]]

    def get_context(self, query):
        """Get relevant context for the query"""
        chunks = self.retrieve(query, top_k=3)
        if not chunks:
            return ""

        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"[Informazione {i}]\n{chunk['answer']}")

        return "\n\n".join(context_parts)


# Initialize RAG system
rag = None

def init_rag():
    global rag
    if rag is None:
        # Get the knowledge file path
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        knowledge_file = os.path.join(base_dir, 'chatbot-data.txt')
        rag = SimpleRAG(knowledge_file)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle chat requests"""
        try:
            # Initialize RAG if needed
            init_rag()

            # Get request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)

            query = data.get('message', '').strip()
            if not query:
                self.send_error_response("Message is required", 400)
                return

            # Retrieve relevant context from FAQ
            chunks = rag.retrieve(query, top_k=3)

            if not chunks:
                response = "Non ho trovato informazioni specifiche su questo. Per maggiori dettagli puoi contattare Amedeo su amedeo.carraro01@gmail.com"
                self.send_json_response({"response": response})
                return

            # Use the best matching answer directly
            best_chunk = chunks[0]
            response = best_chunk['answer']

            # If asking for contact info, ensure email is included
            query_lower = query.lower()
            if any(word in query_lower for word in ['contatt', 'email', 'scrivere', 'parlare']):
                if 'amedeo.carraro01@gmail.com' not in response:
                    response += "\n\nPuoi contattarmi su amedeo.carraro01@gmail.com"

            self.send_json_response({"response": response})

        except Exception as e:
            print(f"Error: {e}")
            self.send_error_response(str(e), 500)

    def send_json_response(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, message, status=500):
        """Send error response"""
        self.send_json_response({"error": message}, status)
