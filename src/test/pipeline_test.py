import requests
import sqlite3
import json
import re

# --- Helper para extraer JSON de la respuesta del LLM ---
def extract_json(text):
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in LLM response")
    return json.loads(match.group())

# --- Configuración ---
OLLAMA_URL = "http://localhost:11434"

# --- 1. LLM: abstracción ---
def run_llm(prompt):
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json()["response"]

# --- 2. Embedding ---
def get_embedding(text):
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={
            "model": "nomic-embed-text",
            "prompt": text
        }
    )
    return response.json()["embedding"]

# --- 3. DB setup ---
conn = sqlite3.connect("test.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    embedding BLOB
)
""")

# --- 4. Ejemplo de entrada ---
journal_entry = {
    "field_name": "insight",
    "tipo_practica": "mindfulness",
    "estado_previo": "anxious",
    "estado_post": "calm",
    "raw_text": "My body feels tense, I can't stop thinking and I'm anxious"
}

# --- 5. Prompt (simple versión inicial) ---
# 
prompt = f"""
You are a strict state classifier.

Your task is to convert subjective text into a minimal, observable state representation.

RULES:

- Output ONLY valid JSON
- Do NOT explain or interpret
- Do NOT infer causes, meanings, or symbolic interpretations
- Only describe what is explicitly stated or strongly implied
- Use consistent labels for similar inputs

DIMENSIONS:

Somatic:
[fatigue, low_energy, neutral, alert, high_energy, tension, relaxed, restless]

Emotional:
[anxiety, stress, calm, neutral, irritability, contentment]

Attention:
[distracted, scattered, unstable_attention, sustained_attention, focused, hyperfocused]

Cognition:
[rumination, analytical, mental_fog, clear]

If multiple labels could apply, always choose the most conservative (least inferred) option.
---

INPUT:
{journal_entry['raw_text']}

---

OUTPUT:

{{
  "somatic": "...",
  "emotional": "...",
  "attention": "...",
  "cognition": "..."
}}
---

Output EXACTLY this format:

{{
  "somatic": "...",
  "emotional": "...",
  "attention": "...",
  "cognition": "..."
}}
"""

def safe_parse(text):
    try:
        return extract_json(text)
    except:
        return {
            "somatic": "neutral",
            "emotional": "neutral",
            "attention": "neutral",
            "cognition": "neutral"
        }
# --- 6. Ejecutar LLM ---
semantic_text = run_llm(prompt)

print("\n--- RAW LLM OUTPUT ---")
print(semantic_text)
print("--- END OUTPUT ---\n")

# 🔹 Parsear JSON
parsed = extract_json(semantic_text)

print("Parsed:", parsed)

# 🔹 Crear input para embedding (controlado)
embedding_input = (
    f"{parsed['somatic']} | "
    f"{parsed['emotional']} | "
    f"{parsed['attention']} | "
    f"{parsed['cognition']}"
)


# --- 7. Generar embedding ---
embedding = get_embedding(embedding_input)

# --- 8. Guardar ---
cursor.execute(
    "INSERT INTO embeddings (text, embedding) VALUES (?, ?)",
    (semantic_text, json.dumps(embedding))
)

conn.commit()
conn.close()

print("✅ Pipeline funcionando")