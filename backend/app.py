"""
RAG Chatbot with Local LLM (Phi-2)
Backend for Render.com hosting
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Simple RAG system (same as before)
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
                            'text': f"{questions[0]} {answer}"
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
            context_parts.append(f"[Info {i}] {chunk['answer']}")

        return "\n\n".join(context_parts)


# Initialize RAG
rag = None

def init_rag():
    global rag
    if rag is None:
        knowledge_file = os.path.join(os.path.dirname(__file__), '..', 'chatbot-data.txt')
        rag = SimpleRAG(knowledge_file)
        print(f"RAG initialized with {len(rag.chunks)} chunks")

# LLM integration using llama-cpp-python
llm = None

def init_llm():
    global llm
    if llm is None:
        try:
            from llama_cpp import Llama

            model_path = os.environ.get('MODEL_PATH', './models/phi-2.Q4_K_M.gguf')

            print(f"Loading LLM from {model_path}...")
            llm = Llama(
                model_path=model_path,
                n_ctx=2048,
                n_threads=4,
                n_gpu_layers=0  # CPU only for free tier
            )
            print("LLM loaded successfully!")
        except Exception as e:
            print(f"Error loading LLM: {e}")
            print("Falling back to RAG-only mode")


def generate_response(query, context):
    """Generate response using LLM or fallback to RAG"""
    if llm is not None:
        try:
            prompt = f"""You are Amedeo Carraro's AI assistant. Answer questions professionally and concisely.

Context:
{context}

Question: {query}

Answer (2-3 sentences max):"""

            response = llm(
                prompt,
                max_tokens=200,
                temperature=0.7,
                stop=["Question:", "\n\n"],
                echo=False
            )

            return response['choices'][0]['text'].strip()
        except Exception as e:
            print(f"LLM generation error: {e}")

    # Fallback: use best matching answer from RAG
    chunks = rag.retrieve(query, top_k=1)
    if chunks:
        return chunks[0]['answer']

    return "Non ho trovato informazioni specifiche su questo. Per maggiori dettagli puoi contattare Amedeo su amedeo.carraro01@gmail.com"


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "llm_loaded": llm is not None})


@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat():
    """Chat endpoint"""
    if request.method == 'OPTIONS':
        return '', 200

    try:
        data = request.get_json()
        query = data.get('message', '').strip()

        if not query:
            return jsonify({"error": "Message is required"}), 400

        # Get context from RAG
        context = rag.get_context(query)

        # Generate response
        response = generate_response(query, context)

        # Add contact info if asking for contact
        query_lower = query.lower()
        if any(word in query_lower for word in ['contatt', 'email', 'scrivere', 'parlare']):
            if 'amedeo.carraro01@gmail.com' not in response:
                response += "\n\nPuoi contattarmi su amedeo.carraro01@gmail.com"

        return jsonify({"response": response})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    init_rag()
    init_llm()

    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
