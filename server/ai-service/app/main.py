import os
import sys
import tempfile
import logging
import importlib.util
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Dynamically import NLP engine: check bundled app/nlp first, fallback to root repo
analyze_journal_text = None
try:
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    BUNDLED_NLP_DIR = os.path.join(CURRENT_DIR, "nlp")
    ROOT_NLP_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../..", "ai-journal-nlp-engine", "app"))

    NLP_APP_DIR = BUNDLED_NLP_DIR if os.path.isdir(BUNDLED_NLP_DIR) else ROOT_NLP_DIR

    if os.path.isdir(NLP_APP_DIR):
        # Register taxonomy module
        spec_tax = importlib.util.spec_from_file_location(
            "taxonomy", os.path.join(NLP_APP_DIR, "taxonomy.py")
        )
        tax_mod = importlib.util.module_from_spec(spec_tax)
        spec_tax.loader.exec_module(tax_mod)
        sys.modules["taxonomy"] = tax_mod
        sys.modules["app.taxonomy"] = tax_mod

        # Register and load nlp_engine module
        spec_nlp = importlib.util.spec_from_file_location(
            "nlp_engine", os.path.join(NLP_APP_DIR, "nlp_engine.py")
        )
        nlp_mod = importlib.util.module_from_spec(spec_nlp)
        spec_nlp.loader.exec_module(nlp_mod)
        sys.modules["nlp_engine"] = nlp_mod
        analyze_journal_text = getattr(nlp_mod, "analyze_journal_text", None)
except Exception as e:
    logging.error(f"Failed to load NLP engine: {e}")
    analyze_journal_text = None

# Import STT helper
from .audio_stt import transcribe_audio_file

app = FastAPI(title="NeuroPortal Audio & NLP AI Service")

# Parse origins from CLIENT_URL environment variable if set
custom_client_origins = [
    url.strip().rstrip("/")
    for url in os.getenv("CLIENT_URL", "").split(",")
    if url.strip()
]

# Enable CORS for frontend requests (explicit local origins + regex for local & cloud dev ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        *custom_client_origins,
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.netlify\.app|.*\.onrender\.com|.*\.railway\.app|.*\.pages\.dev|.*\.github\.io)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "nlp_engine_loaded": analyze_journal_text is not None,
    }


@app.post("/api/v1/analyze-audio")
async def analyze_audio(
    audio_file: UploadFile = File(...),
    mood_rating: int = Form(3),
    sensory_overload_level: int = Form(1),
    executive_function_level: int = Form(3),
    masking_fatigue_level: int = Form(1),
):
    suffix = os.path.splitext(audio_file.filename or "")[1] or ".webm"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = temp_file.name
    try:
        content = await audio_file.read()
        temp_file.write(content)
        temp_file.close()

        transcript = transcribe_audio_file(temp_path)
        if not transcript or not transcript.strip():
            raise HTTPException(
                status_code=400,
                detail="No clear speech detected in recording. Please speak clearly into the microphone.",
            )

        if analyze_journal_text is None:
            raise HTTPException(status_code=500, detail="NLP engine not available.")

        ratings = {
            "mood": mood_rating,
            "sensory_overload": sensory_overload_level,
            "executive_function": executive_function_level,
            "masking_fatigue": masking_fatigue_level,
        }
        nlp_results = analyze_journal_text(transcript, ratings)

        return JSONResponse(
            content={
                "status": "success",
                "data": {
                    "transcript": transcript,
                    "ai_insights": nlp_results,
                },
            }
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError as e:
                logging.warning(f"Failed to remove temporary file {temp_path}: {e}")
