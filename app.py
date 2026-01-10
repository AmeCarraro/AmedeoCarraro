"""
RAG Chatbot with Local LLM (Phi-2)
Backend for Render.com hosting
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import sys
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging to stdout
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

            # Parse FAQ format (multi-line: Q: on one line, A: on next)
            lines = content.split('\n')
            current_question = None

            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                if line.startswith('Q:'):
                    current_question = line.replace('Q:', '').strip()
                elif line.startswith('A:') and current_question:
                    answer = line.replace('A:', '').strip()
                    if answer:
                        # Store multiple question variants
                        questions = [q.strip() for q in current_question.split('|')]
                        self.chunks.append({
                            'questions': questions,
                            'answer': answer,
                            'text': f"{questions[0]} {answer}"
                        })
                    current_question = None

        except Exception as e:
            logger.error(f"Error loading knowledge: {e}")

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
        knowledge_file = os.path.join(os.path.dirname(__file__), 'chatbot-data.txt')
        rag = SimpleRAG(knowledge_file)
        logger.info(f"RAG initialized with {len(rag.chunks)} chunks")

# LLM integration using Google Gemini API
gemini_model = None

def init_llm():
    global gemini_model
    if gemini_model is None:
        try:
            import google.generativeai as genai

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                logger.warning("GEMINI_API_KEY not found, falling back to RAG-only mode")
                return

            genai.configure(api_key=api_key)
            gemini_model = genai.GenerativeModel('gemini-2.5-flash')
            logger.info("Gemini API initialized successfully!")
        except Exception as e:
            logger.error(f"Error initializing Gemini: {e}")
            logger.warning("Falling back to RAG-only mode")


def generate_response(query, context):
    """Generate response using Gemini API or fallback to RAG"""

    # Try Gemini first if available
    if gemini_model is not None:
        try:
            # Simple prompt for concise answers
            prompt = f"""Answer in English briefly and naturally.

Context: {context if context else 'No information available'}

Question: {query}

Answer:"""

            response = gemini_model.generate_content(
                prompt,
                generation_config={
                    'max_output_tokens': 2000,
                    'temperature': 0.3,
                }
            )

            text = response.text.strip()
            logger.info(f"Gemini response: {text}")
            return text

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            # Continue to fallback

    # Fallback: use RAG answer directly (no truncation)
    chunks = rag.retrieve(query, top_k=1)
    if chunks:
        return chunks[0]['answer']

    return "I don't have info on this. Contact: amedeo.carraro01@gmail.com"


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "llm_loaded": gemini_model is not None})


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

        # Handle greetings directly (no LLM needed)
        query_lower = query.lower()
        greetings = ['ciao', 'salve', 'buongiorno', 'buonasera', 'hey', 'hello', 'hi']
        if any(greeting in query_lower for greeting in greetings):
            response = "Hi! I'm Amedeo's assistant. How can I help you?"
            return jsonify({"response": response})

        # Get context from RAG
        context = rag.get_context(query)
        logger.info(f"Query: {query}")
        logger.info(f"Context found: {context[:100] if context else 'None'}...")
        logger.info(f"Gemini available: {gemini_model is not None}")

        # Generate response
        response = generate_response(query, context)
        logger.info(f"Final response: {response}")

        # Add contact info if asking for contact
        if any(word in query_lower for word in ['contact', 'email', 'reach', 'write', 'contatt']):
            if '@' not in response:
                response += " Email: amedeo.carraro01@gmail.com"

        return jsonify({"response": response})

    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    init_rag()
    init_llm()

    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
