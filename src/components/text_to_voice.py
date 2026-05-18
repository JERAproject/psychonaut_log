# api/transcribe.py

import os
import uuid
import sqlite3
from datetime import datetime

from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

# =========================================================
# CONFIG
# =========================================================

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Whisper model:
# tiny | base | small | medium
WHISPER_MODEL = "base"

# CPU mode (safe for most systems)
model = WhisperModel(
    WHISPER_MODEL,
    device="cpu",
    compute_type="int8"
)

# =========================================================
# APP
# =========================================================

app = Flask(__name__)

# =========================================================
# DATABASE
# =========================================================

DB_PATH = "test.db"

def save_transcription(
    filename,
    transcript,
    language,
    duration
):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS voice_transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT,
        transcript TEXT,
        language TEXT,
        duration REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    INSERT INTO voice_transcriptions
    (
        filename,
        transcript,
        language,
        duration
    )
    VALUES (?, ?, ?, ?)
    """, (
        filename,
        transcript,
        language,
        duration
    ))

    conn.commit()
    conn.close()

# =========================================================
# TRANSCRIBE ENDPOINT
# =========================================================

@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():

    # -----------------------------------------------------
    # 1. Validate file
    # -----------------------------------------------------

    if "audio" not in request.files:
        return jsonify({
            "error": "No audio file provided"
        }), 400

    audio_file = request.files["audio"]

    if audio_file.filename == "":
        return jsonify({
            "error": "Empty filename"
        }), 400

    # -----------------------------------------------------
    # 2. Save file
    # -----------------------------------------------------

    unique_name = f"{uuid.uuid4()}.wav"

    file_path = os.path.join(
        UPLOAD_FOLDER,
        unique_name
    )

    audio_file.save(file_path)

    # -----------------------------------------------------
    # 3. Transcribe
    # -----------------------------------------------------

    try:

        segments, info = model.transcribe(
            file_path,
            beam_size=5
        )

        transcript_parts = []

        for segment in segments:
            transcript_parts.append(segment.text)

        transcript = " ".join(transcript_parts).strip()

        # -------------------------------------------------
        # 4. Save in DB
        # -------------------------------------------------

        save_transcription(
            filename=unique_name,
            transcript=transcript,
            language=info.language,
            duration=info.duration
        )

        # -------------------------------------------------
        # 5. Response
        # -------------------------------------------------

        return jsonify({
            "success": True,
            "transcript": transcript,
            "language": info.language,
            "duration": info.duration
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )