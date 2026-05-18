import { useState, useRef, useEffect } from "react";

const DIMENSION_LABELS = {
  somatic: "Somatic (Body)",
  emotional: "Emotional (Affective)",
  attention: "Attention (Focus)",
  cognition: "Cognition (Thinking)",
};

const VALUE_COLORS = {
  fatigue: "#6b7280",
  low_energy: "#9ca3af",
  neutral: "#d1d5db",
  alert: "#22c55e",
  high_energy: "#10b981",
  tension: "#ef4444",
  relaxed: "#3b82f6",
  restless: "#f59e0b",
  anxiety: "#f59e0b",
  stress: "#ef4444",
  calm: "#3b82f6",
  irritability: "#ef4444",
  contentment: "#10b981",
  distracted: "#f59e0b",
  scattered: "#f97316",
  unstable_attention: "#ef4444",
  sustained_attention: "#22c55e",
  focused: "#3b82f6",
  hyperfocused: "#8b5cf6",
  rumination: "#f59e0b",
  overthinking: "#f97316",
  analytical: "#3b82f6",
  mental_fog: "#6b7280",
  clear: "#10b981",
  insight_oriented: "#8b5cf6",
};

export default function CognitiveClassifier() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  }

  async function classify() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("psy_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/classify", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setHistory((prev) => [{ text: input, result: data, time: new Date() }, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err.message || "Classification failed");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!input.trim()) return;
    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    
    const ANALYSIS_PROMPT = `Eres un guía de introspección empático y profundo. Analiza lo que el usuario expresa y dialoga con él de manera cálida y reflexiva.

El usuario escribe: "${input.slice(0, 500)}"

Responde de manera breve (2-3 oraciones máximo) como un amigo sabio que:
1. Reconoce lo que siente/pensa
2. Ofrece una perspectiva gentil
3. Invita a reflexionar más

Sé directo, no uses listas ni bullet points. Habla en español.`;

    try {
      const token = localStorage.getItem("psy_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: ANALYSIS_PROMPT,
          model: "llama3"
        }),
      });

      if (!response.ok) throw new Error("Análisis no disponible");
      
      const data = await response.json();
      setAnalysisResult(data.response || "No obtuve respuesta.");
    } catch (err) {
      setError("Análisis no disponible: " + (err.message || "Error de conexión"));
    } finally {
      setAnalyzing(false);
    }
  }

  function speakAnalysis() {
    if (!analysisResult || speaking) return;
    
    const utterance = new SpeechSynthesisUtterance(analysisResult);
    utterance.lang = "es-ES";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) classify();
  }

  async function toggleRecording() {
    if (recording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
    } else {
      // Start recording
      audioChunksRef.current = [];
      setRecordingTime(0);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          
          if (audioChunksRef.current.length === 0) return;

          setTranscribing(true);
          try {
            const token = localStorage.getItem("psy_token");
            const formData = new FormData();
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            formData.append("audio", blob, "recording.webm");

            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/transcribe", {
              method: "POST",
              headers,
              body: formData,
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();

            if (data.transcript) {
              setInput((prev) => prev + (prev ? " " : "") + data.transcript);
            }
          } catch (err) {
            setError("Transcripción fallida: " + (err.message || "Error"));
          } finally {
            setTranscribing(false);
          }
        };

        mediaRecorder.start();
        setRecording(true);
      } catch (err) {
        setError("No se pudo acceder al micrófono: " + err.message);
      }
    }
  }

  return (
    <div className="classifier">
      <div className="classifier-card">
        <div className="input-section">
          <label className="input-label">Describe tu estado mental actual</label>
          <textarea
            className="classifier-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Me siento agotado, con la mente dispersa, pensando demasiado en los problemas del trabajo..."
            rows={4}
          />
          <div className="input-actions">
            <button
              className="mic-btn"
              onClick={toggleRecording}
              disabled={transcribing}
              title="Grabar voz"
            >
              {transcribing ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Transcribiendo...</span>
                </>
              ) : recording ? (
                <>
                  <span className="rec-icon">⏹️</span>
                  <span>Parar ({formatTime(recordingTime)})</span>
                </>
              ) : (
                <>
                  <span className="mic-icon">🎤</span>
                  <span>Voz</span>
                </>
              )}
            </button>
            <button
              className="classify-btn"
              onClick={classify}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Clasificando...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">🧠</span>
                  <span>Clasificar Estado</span>
                </>
              )}
            </button>
            <button
              className="analyze-btn"
              onClick={analyze}
              disabled={analyzing || !input.trim()}
            >
              {analyzing ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <span className="analyze-icon">💬</span>
                  <span>Analizar</span>
                </>
              )}
            </button>
            <span className="input-hint">Ctrl + Enter para ejecutar</span>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </div>

        {analysisResult && (
          <div className="analysis-section">
            <div className="analysis-header">
              <h3 className="analysis-title">Análisis</h3>
              <button
                className="speak-btn"
                onClick={speaking ? stopSpeaking : speakAnalysis}
                title={speaking ? "Detener" : "Escuchar"}
              >
                {speaking ? "⏹️" : "🔊"}
              </button>
            </div>
            <p className="analysis-text">{analysisResult}</p>
          </div>
        )}

        {result && (
          <div className="result-section">
            <h3 className="result-title">Resultados</h3>
            <div className="dimensions-grid">
              {Object.entries(result).map(([dim, value]) => (
                <div key={dim} className="dimension-card">
                  <div className="dimension-label">{DIMENSION_LABELS[dim]}</div>
                  <div
                    className="dimension-value"
                    style={{ backgroundColor: VALUE_COLORS[value] || "#6b7280" }}
                  >
                    {value.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="history-section">
          <h3 className="history-title">Historial</h3>
          <div className="history-list">
            {history.map((item, idx) => (
              <div key={idx} className="history-item">
                <div className="history-text">{item.text.substring(0, 80)}...</div>
                <div className="history-results">
                  {Object.entries(item.result).map(([dim, val]) => (
                    <span
                      key={dim}
                      className="history-tag"
                      style={{ backgroundColor: VALUE_COLORS[val] || "#6b7280" }}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .classifier {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }

        .classifier-card {
          background: linear-gradient(145deg, #1a1a2e, #16162a);
          border-radius: 20px;
          border: 1px solid #2a2a35;
          padding: 1.5rem;
        }

        .input-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .input-label {
          font-size: 0.95rem;
          color: #9ca3af;
          font-weight: 500;
        }

        .classifier-input {
          width: 100%;
          padding: 1rem;
          border-radius: 14px;
          border: 1px solid #2a2a35;
          background: #0d0d1a;
          color: #fff;
          font-size: 0.95rem;
          resize: vertical;
          min-height: 100px;
          transition: border-color 0.2s;
          font-family: inherit;
        }

        .classifier-input:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .classifier-input::placeholder {
          color: #4b5563;
        }

        .input-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .classify-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0.5rem;
        }

        .classify-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }

        .classify-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0.5rem;
        }

        .mic-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .mic-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .mic-icon {
          font-size: 1.1rem;
        }

        .rec-icon {
          font-size: 1rem;
        }

        .analyze-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0.5rem;
        }

        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .analyze-icon {
          font-size: 1.1rem;
        }

        .analysis-section {
          margin-top: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border-radius: 16px;
          border: 1px solid #334155;
        }

        .analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .analysis-title {
          font-size: 1rem;
          font-weight: 600;
          color: #10b981;
          margin: 0;
        }

        .speak-btn {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid #10b981;
          color: #10b981;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .speak-btn:hover {
          background: rgba(16, 185, 129, 0.3);
        }

        .analysis-text {
          color: #e2e8f0;
          font-size: 1rem;
          line-height: 1.6;
          margin: 0;
          font-style: italic;
        }

        .btn-icon {
          font-size: 1.1rem;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .input-hint {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .error-msg {
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 10px;
          color: #ef4444;
          font-size: 0.9rem;
        }

        .result-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #2a2a35;
        }

        .result-title {
          font-size: 1rem;
          font-weight: 600;
          color: #e5e7eb;
          margin: 0 0 1rem;
        }

        .dimensions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .dimension-card {
          background: #0d0d1a;
          border-radius: 12px;
          padding: 0.75rem;
          text-align: center;
        }

        .dimension-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dimension-value {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: capitalize;
        }

        .history-section {
          margin-top: 1.5rem;
          background: linear-gradient(145deg, #1a1a2e, #16162a);
          border-radius: 16px;
          border: 1px solid #2a2a35;
          padding: 1.25rem;
        }

        .history-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #9ca3af;
          margin: 0 0 1rem;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .history-item {
          background: #0d0d1a;
          border-radius: 10px;
          padding: 0.75rem;
        }

        .history-text {
          font-size: 0.85rem;
          color: #d1d5db;
          margin-bottom: 0.5rem;
        }

        .history-results {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .history-tag {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.7rem;
          color: white;
          text-transform: capitalize;
        }

        @media (max-width: 500px) {
          .dimensions-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .input-actions {
            flex-direction: column;
            align-items: stretch;
          }
          
          .input-hint {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}