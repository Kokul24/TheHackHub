"""
Sakhi-Score: FastAPI Backend
Credit Scoring API with SHAP Explainability for Self-Help Groups
"""

import os
import pickle
import base64
from io import BytesIO
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import shap
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from langdetect import detect as lang_detect
from word2number import w2n
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from gtts import gTTS
import tempfile
import time
import unicodedata
from pathlib import Path

# Prefer faster-whisper if available for lower latency
try:
    from faster_whisper import WhisperModel as FasterWhisperModel
    _HAS_FASTER_WHISPER = True
except Exception:
    FasterWhisperModel = None
    _HAS_FASTER_WHISPER = False

try:
    import whisper
    _HAS_OPENAI_WHISPER = True
except Exception:
    whisper = None
    _HAS_OPENAI_WHISPER = False

# ============================================================
# FastAPI App Initialization
# ============================================================

app = FastAPI(
    title="Sakhi-Score API",
    description="Credit Scoring Engine for Self-Help Groups (SHGs) with Explainable AI",
    version="1.0.0"
)

# CORS Configuration - Allow all origins for hackathon demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MongoDB Connection
# ============================================================

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "sakhiscore"
COLLECTION_NAME = "shg_logs"

mongo_client: Optional[MongoClient] = None
db = None
collection = None

def connect_to_mongodb():
    """Initialize MongoDB connection."""
    global mongo_client, db, collection
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        mongo_client.admin.command('ping')
        db = mongo_client[DB_NAME]
        collection = db[COLLECTION_NAME]
        print("✅ Connected to MongoDB successfully!")
        return True
    except ConnectionFailure as e:
        print(f"⚠️ MongoDB connection failed: {e}")
        print("📝 Running without database logging...")
        return False

# ============================================================
# Load ML Model
# ============================================================

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'shg_model.pkl')
model = None
explainer = None
whisper_model = None
whisper_backend = None  # 'faster' or 'openai'

def load_model():
    """Load the trained RandomForest model and initialize SHAP explainer."""
    global model, explainer
    
    if not os.path.exists(MODEL_PATH):
        print(f"⚠️ Model not found at {MODEL_PATH}")
        print("🔧 Please run 'python model_trainer.py' first!")
        return False
    
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        
        # Initialize SHAP TreeExplainer for RandomForest
        explainer = shap.TreeExplainer(model)
        print("✅ Model and SHAP explainer loaded successfully!")
        return True
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False


def load_whisper_model():
    """Load Whisper model for offline speech-to-text with configurable options.

    Prefers `faster-whisper` when available and will attempt to use an
    int8 compute type for lower CPU latency. Configure with env vars:
    - WHISPER_MODEL (default: 'small')
    - WHISPER_DEVICE (default: 'cpu')
    - WHISPER_COMPUTE (optional: e.g. 'int8_float32')
    """
    global whisper_model, whisper_backend
    model_name = os.getenv('WHISPER_MODEL', 'small')
    device = os.getenv('WHISPER_DEVICE', 'cpu')
    compute = os.getenv('WHISPER_COMPUTE', 'int8_float32')

    # Try faster-whisper first (preferred for CPU speedups)
    if _HAS_FASTER_WHISPER:
        try:
            print(f"➡️ Attempting faster-whisper load: model={model_name}, device={device}, compute={compute}")
            # Some compute types may not be available; try with compute then fallback
            try:
                whisper_model = FasterWhisperModel(model_name, device=device, compute_type=compute)
            except TypeError:
                # Older faster-whisper variations may not accept compute_type
                whisper_model = FasterWhisperModel(model_name, device=device)

            whisper_backend = 'faster'
            print(f"✅ faster-whisper model loaded successfully ({model_name})")
            return True
        except Exception as e:
            print(f"⚠️ faster-whisper load failed: {e}")

    # Fallback to OpenAI whisper
    if _HAS_OPENAI_WHISPER:
        try:
            print(f"➡️ Attempting OpenAI Whisper load: model={model_name}")
            whisper_model = whisper.load_model(model_name)
            whisper_backend = 'openai'
            print(f"✅ OpenAI Whisper model loaded successfully ({model_name})")
            return True
        except Exception as e:
            print(f"⚠️ OpenAI Whisper load failed: {e}")

    whisper_model = None
    whisper_backend = None
    return False

# ============================================================
# Pydantic Models
# ============================================================

class PredictionInput(BaseModel):
    """Input schema for credit score prediction."""
    savings: float = Field(..., ge=100, le=5000, description="Savings per member (INR)")
    attendance: float = Field(..., ge=0, le=100, description="Attendance rate (%)")
    repayment: float = Field(..., ge=0, le=100, description="Loan repayment rate (%)")


class TTSRequest(BaseModel):
    """Request model for text-to-speech."""
    text: str
    lang: str = "en"

class PredictionResponse(BaseModel):
    """Response schema for credit score prediction."""
    score: int
    risk: str
    risk_color: str
    explanation_image: str
    features: dict
    timestamp: str

# ============================================================
# Helper Functions
# ============================================================

def calculate_credit_score(savings: float, attendance: float, repayment: float) -> int:
    """
    Calculate credit score based on weighted formula.
    Mirrors the training data generation logic.
    """
    normalized_savings = (savings - 100) / (5000 - 100) * 100
    
    score = (
        0.30 * normalized_savings +
        0.30 * attendance +
        0.40 * repayment
    )
    
    return int(np.clip(score, 0, 100))

def generate_shap_waterfall(input_data: np.ndarray, feature_names: list) -> str:
    """
    Generate SHAP waterfall plot and return as Base64 encoded PNG.
    """
    if explainer is None:
        raise HTTPException(status_code=500, detail="SHAP explainer not initialized")
    
    # Calculate SHAP values
    shap_values = explainer.shap_values(input_data)
    
    # For binary classification, use the positive class (Low Risk)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]  # Class 1 (Low Risk) values
    else:
        shap_vals = shap_values[0]
    
    # Create SHAP Explanation object for waterfall plot
    expected_value = explainer.expected_value
    if isinstance(expected_value, np.ndarray):
        expected_value = expected_value[1]  # Use positive class
    
    explanation = shap.Explanation(
        values=shap_vals,
        base_values=expected_value,
        data=input_data[0],
        feature_names=feature_names
    )
    
    # Create figure with custom styling
    fig, ax = plt.subplots(figsize=(10, 6))
    plt.style.use('default')
    
    # Generate waterfall plot
    shap.plots.waterfall(explanation, max_display=10, show=False)
    
    # Customize the plot
    plt.title("🔍 AI Explanation: What Influenced Your Score?", fontsize=14, fontweight='bold', pad=20)
    plt.xlabel("Impact on Model Output (Low Risk Probability)", fontsize=10)
    plt.tight_layout()
    
    # Save to BytesIO buffer
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', 
                facecolor='white', edgecolor='none')
    plt.close(fig)
    
    # Encode to Base64
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    return f"data:image/png;base64,{img_base64}"

def log_to_database(input_data: dict, score: int, risk: str) -> bool:
    """Log prediction request to MongoDB."""
    if collection is None:
        return False
    
    try:
        log_entry = {
            "timestamp": datetime.utcnow(),
            "input": input_data,
            "score": score,
            "risk": risk
        }
        collection.insert_one(log_entry)
        return True
    except Exception as e:
        print(f"⚠️ Database logging failed: {e}")
        return False

# ============================================================
# API Endpoints
# ============================================================

@app.on_event("startup")
async def startup_event():
    """Initialize connections on app startup."""
    print("\n" + "=" * 50)
    print("🚀 SAKHI-SCORE API STARTING...")
    print("=" * 50)
    
    connect_to_mongodb()
    load_model()
    load_whisper_model()
    
    print("=" * 50)
    print("✅ API Ready at http://localhost:8000")
    print("📚 Docs at http://localhost:8000/docs")
    print("=" * 50 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on app shutdown."""
    if mongo_client:
        mongo_client.close()
        print("👋 MongoDB connection closed")

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "app": "Sakhi-Score API",
        "version": "1.0.0",
        "message": "Credit Scoring Engine for Self-Help Groups"
    }

@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "shap_ready": explainer is not None,
        "database_connected": collection is not None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_credit_score(input_data: PredictionInput):
    """
    Predict credit score for a Self-Help Group.
    
    Returns:
    - score: Credit score (0-100)
    - risk: Risk classification (High Risk / Low Risk)
    - explanation_image: SHAP waterfall plot as Base64 PNG
    """
    if model is None:
        raise HTTPException(
            status_code=503, 
            detail="Model not loaded. Please run model_trainer.py first."
        )
    
    # Prepare input for model
    feature_names = ['Savings_Per_Member', 'Attendance_Rate', 'Internal_Loan_Repayment']
    input_array = np.array([[input_data.savings, input_data.attendance, input_data.repayment]])
    
    # Get model prediction (risk classification)
    risk_prediction = model.predict(input_array)[0]
    risk_proba = model.predict_proba(input_array)[0]
    
    # Calculate credit score
    credit_score = calculate_credit_score(
        input_data.savings, 
        input_data.attendance, 
        input_data.repayment
    )
    
    # Determine risk status
    risk_status = "Low Risk ✅" if credit_score >= 60 else "High Risk ⚠️"
    risk_color = "#22c55e" if credit_score >= 60 else "#ef4444"
    
    # Generate SHAP explanation image
    try:
        explanation_image = generate_shap_waterfall(input_array, feature_names)
    except Exception as e:
        print(f"⚠️ SHAP visualization error: {e}")
        explanation_image = ""
    
    # Log to database
    log_to_database(
        input_data=input_data.dict(),
        score=credit_score,
        risk=risk_status
    )
    
    return PredictionResponse(
        score=credit_score,
        risk=risk_status,
        risk_color=risk_color,
        explanation_image=explanation_image,
        features={
            "savings_per_member": input_data.savings,
            "attendance_rate": input_data.attendance,
            "loan_repayment_rate": input_data.repayment,
            "low_risk_probability": float(risk_proba[1]) if len(risk_proba) > 1 else float(risk_proba[0])
        },
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/logs")
async def get_prediction_logs(limit: int = 10):
    """Retrieve recent prediction logs from database."""
    if collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        logs = list(collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/stt')
async def stt_endpoint(file: UploadFile = File(...), lang: str = Form('auto')):
    """Accept an audio upload (multipart/form-data) and return transcription using Whisper.

    - If `lang` is `'auto'` (default), allow the model to auto-detect language.
    - Return `detected_lang` alongside the transcript for frontend UX.
    """
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Speech model not loaded")

    start = time.time()
    try:
        suffix = Path(file.filename).suffix if file.filename else '.wav'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        print(f"🔊 Received audio file {file.filename} -> {tmp_path} (lang={lang}, size={len(content)})")

        # Decide whether to pass a language hint or let the model auto-detect
        lang_hint = None if (not lang or lang == 'auto') else lang

        # Basic Voice Activity Detection (VAD) filter: drop too-silent uploads
        try:
            import audioop
            rms = audioop.rms(content, 2) if len(content) > 0 else 0
            print(f"🔍 Audio RMS: {rms}")
            if rms < 300:  # threshold tuned for 16-bit audio; may need adjustments
                print("⚠️ Audio too silent — skipping STT")
                return {'text': '', 'detected_lang': None, 'duration_ms': int((time.time()-start)*1000), 'note': 'audio too silent'}
        except Exception:
            pass

        text = ''
        detected_lang = None

        # Prefer faster backend when available
        if whisper_backend == 'faster' and whisper_model is not None:
            try:
                segments, info = whisper_model.transcribe(tmp_path, language=lang_hint)
                text = ' '.join([s.text for s in segments]).strip()
                detected_lang = getattr(info, 'language', None)
                print(f"📝 faster-whisper transcription: '{text}' (detected_lang={detected_lang})")
            except Exception as e:
                print(f"⚠️ faster-whisper transcription error: {e}. Trying fallback...")
                # fallback attempt with no language hint
                try:
                    segments, info = whisper_model.transcribe(tmp_path, language=None)
                    text = ' '.join([s.text for s in segments]).strip()
                    detected_lang = getattr(info, 'language', None)
                    print(f"📝 faster-whisper fallback transcription: '{text}' (detected_lang={detected_lang})")
                except Exception as e2:
                    print(f"❌ faster-whisper fallback failed: {e2}")
                    raise

        elif whisper_backend == 'openai' and whisper_model is not None:
            try:
                result = whisper_model.transcribe(tmp_path, language=lang_hint)
                text = result.get('text', '').strip()
                detected_lang = result.get('language', None)
                print(f"📝 OpenAI Whisper transcription: '{text}' (detected_lang={detected_lang})")
            except Exception as e:
                print(f"⚠️ OpenAI Whisper transcription error: {e}")
                raise
        else:
            raise RuntimeError('No speech model available')

        # Basic normalization and cleanup for multilingual robustness
        try:
            text = unicodedata.normalize('NFKC', text).strip()
            text = ' '.join(text.split())
        except Exception:
            pass

        # If text looks empty but we had a lang hint 'auto', try statistical detection
        if (not text or len(text) < 2) and lang in (None, '', 'auto'):
            try:
                # Attempt to guess language from raw audio filename or other heuristics
                guessed = None
                # fallback: try language detect on any existing textual metadata
                guessed = None
                if guessed:
                    detected_lang = guessed
                else:
                    # Try to see if model returned a language attribute earlier
                    detected_lang = detected_lang or None
            except Exception:
                pass

        # Parse spoken numbers into numeric values when set_field intents are used
        # This is left to the `/converse` parsing which can call w2n when needed.

        duration_ms = int((time.time() - start) * 1000)
        return { 'text': text, 'detected_lang': detected_lang, 'duration_ms': duration_ms }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {e}")


@app.post('/converse')
async def converse_endpoint(text: str = Form(...), lang: str = Form('en'),
                            savings: float = Form(None), attendance: float = Form(None), repayment: float = Form(None)):
    """Simple conversational handler: recognizes 'calculate' intent and returns localized reply."""
    t = (text or '').lower()

    # Minimal keywords per language for 'calculate'
    calculate_keywords = {
        'en': ['calculate', 'score', 'compute'],
        'hi': ['स्कोर', 'गणना', 'स्कोर निकाल'],
        'bn': ['স্কোর', 'হিসাব', 'গণনা'],
        'ta': ['மதிப்பீடு', 'கணக்கிட', 'ஸ்கோர்'],
        'kn': ['ಸ್ಕೋರ್', 'ಗಣನೆ', 'ಲೆಕ್ಕ'],
        'te': ['స్కోర్', 'గణన', 'లెక్క'],
        'ml': ['സ്കോർ', 'ਲెక్క', 'ഗണിക്ക'],
        'mr': ['स्कोर', 'गणना', 'हिशेब'],
        'gu': ['સ્કોર', 'ગણતરી', 'હિસાબ'],
        'pa': ['ਸਕੋਰ', 'ਗਣਨਾ', 'ਹਿਸਾਬ']
    }

    # Localized reply templates
    TEMPLATES = {
        'en': "Your credit score is {score}. Risk: {risk}.",
        'hi': "आपका क्रेडिट स्कोर {score} है। जोखिम: {risk}।",
        'bn': "আপনার ক্রেডিট স্কোর {score}। ঝুঁকি: {risk}",
        'ta': "உங்கள் கடன் மதிப்பெண் {score}. அபாயம்: {risk}",
        'kn': "ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ {score}. ಅಪಾಯ: {risk}",
        'te': "మీ క్రెడిట్ స్కోరు {score}. ప్రమాదం: {risk}",
        'ml': "നിങ്ങളുടെ ക്രെഡിറ്റ് സ്കോർ {score}. റിസ്‌ക്: {risk}",
        'mr': "आपला क्रेडिट स्कोअर {score}. जोखम: {risk}",
        'gu': "તમારો ક્રેડિટ સ્કોર {score}. જોખમ: {risk}",
        'pa': "ਤੁਹਾਡਾ ਕ੍ਰੈਡਿਟ ਸਕੋਰ {score}. ਜੋਖਮ: {risk}"
    }

    # If caller asked for 'auto' or sent unknown lang, try to detect from text
    if not lang or lang == 'auto' or lang not in calculate_keywords:
        try:
            detected = lang_detect(text or '')
            detected_short = detected[:2]
            if detected_short in calculate_keywords:
                lang = detected_short
                print(f"🔤 converse: auto-detected language -> {lang}")
        except Exception:
            lang = 'en'

    # detect calculate intent
    intent_calculate = any(k in t for k in calculate_keywords.get(lang, []))

    if intent_calculate:
        # Use provided metrics if any, else defaults
        s = float(savings) if savings is not None else 2500.0
        a = float(attendance) if attendance is not None else 85.0
        r = float(repayment) if repayment is not None else 75.0

        score = calculate_credit_score(s, a, r)
        risk_status = "Low Risk" if score >= 60 else "High Risk"

        # Localize risk label
        risk_local = {
            'en': 'Low Risk' if score >= 60 else 'High Risk',
            'hi': 'कम जोखिम' if score >= 60 else 'उच्च जोखिम',
            'bn': 'কম ঝুঁকি' if score >= 60 else 'উচ্চ ঝুঁকি',
            'ta': 'குறைந்த அபாயம்' if score >= 60 else 'உயர்ந்த அபாயம்',
            'kn': 'ಕಡಿಮೆ ಅಪಾಯ' if score >= 60 else 'ಅಧಿಕ ಅಪಾಯ',
            'te': 'తక్కువ ప్రమాదం' if score >= 60 else 'అధిక ప్రమాదం',
            'ml': 'കുറഞ്ഞ ঝൂթի' if score >= 60 else 'ഉയർന്ന റിസ്‌ക്',
            'mr': 'कमी जोखीम' if score >= 60 else 'जास्त जोखीम',
            'gu': 'ઓછો જોખમ' if score >= 60 else 'ઉચ્ચ જોખમ',
            'pa': 'ਘੱਟ ਜੋਖਮ' if score >= 60 else 'ਉੱਚ ਜੋਖਮ'
        }.get(lang, 'Low Risk' if score >= 60 else 'High Risk')

        template = TEMPLATES.get(lang, TEMPLATES['en'])
        reply = template.format(score=score, risk=risk_local)

        return { 'action': 'predict', 'score': score, 'reply': reply }

    # Fallback: echo
    # Try to detect "set <field> to <value>" commands
    # Field keywords per language
    field_keywords = {
        'en': {
            'savings': ['savings', 'monthly savings', 'monthly saving', 'save'],
            'attendance': ['attendance', 'meeting attendance', 'presence'],
            'repayment': ['repayment', 'repay', 'repayment rate', 'loan repayment']
        },
        'hi': {
            'savings': ['बचत', 'बचत प्रति सदस्य', 'मासिक बचत'],
            'attendance': ['उपस्थिति', 'हाजिरी', 'हाजिरी दर'],
            'repayment': ['भुगतान', 'वापसी', 'ऋण भुगतान']
        },
        'bn': {
            'savings': ['সঞ্চয়', 'মাসিক সঞ্চয়'],
            'attendance': ['উপস্থিতি'],
            'repayment': ['প্রত্যর্পণ', 'প্রতিদান']
        },
        'ta': {
            'savings': ['சேமிப்பு', 'மாத சேமிப்பு'],
            'attendance': ['தற்போதைய', 'வருகை', 'உபையில்'],
            'repayment': ['திருப்பு', 'கட்டணம்']
        },
        'te': {
            'savings': ['సేవింగ్స్', 'మాసిక సేవింగ్స్'],
            'attendance': ['హాజరు', 'హాజరీ'],
            'repayment': ['చెల్లింపు', 'తిరిగి చెల్లింపు']
        },
        'kn': {
            'savings': ['ಸಂಪಾದನೆ', 'ಮಾಸಿಕ ಉಳವು'],
            'attendance': ['ಹಾಜರಿ', 'ಹಾಜರಿ ದರ'],
            'repayment': ['திருப்பி']
        },
        'ml': {
            'savings': ['സേമിപ്പ്', 'മാസിക്സേമിപ്പ്'],
            'attendance': ['ഹാജര', 'ഉപസ്ഥിതി'],
            'repayment': ['പരിശോധന']
        },
        'mr': {
            'savings': ['बचत', 'मासिक बचत'],
            'attendance': ['हजेरी', 'उपस्थिती'],
            'repayment': ['परतफेड', 'हप्ते']
        },
        'gu': {
            'savings': ['બચત', 'માસિક બચત'],
            'attendance': ['હાજરી', 'હાજરી દર'],
            'repayment': ['ચુકવણી', 'વાપસી']
        },
        'pa': {
            'savings': ['ਬਚਤ', 'ਮਹੀਨਾਵਾਰ ਬਚਤ'],
            'attendance': ['ਹਾਜ਼ਰੀ', 'ਹਾਜ਼ਰੀ ਦਰ'],
            'repayment': ['ਵਾਪਸੀ', 'ਚੁਕਾਂ']
        }
    }

    # Ensure language mapping exists (fallback to en)
    fk = field_keywords.get(lang, field_keywords['en'])

    # Find a number in the text: prefer explicit digits
    import re
    num_match = re.search(r"(\d{1,7}(?:[\.,]\d+)?)", text)
    value = None
    if num_match:
        value_raw = num_match.group(1)
        try:
            value = float(value_raw.replace(',', '')) if ('.' in value_raw or ',' in value_raw) else int(value_raw.replace(',', ''))
        except Exception:
            value = value_raw

    lowered = t
    # If no digits found and language is English, try parsing number words
    if value is None and (lang.startswith('en') or lang == 'en'):
        try:
            # Attempt to extract phrase after known field keyword
            for field, kwlist in fk.items():
                for kw in kwlist:
                    if kw in lowered:
                        cand = lowered.split(kw)[-1]
                        # Keep only words and spaces
                        cand_words = re.sub(r"[^a-zA-Z\s-]", ' ', cand).strip()
                        if cand_words:
                            try:
                                parsed = w2n.word_to_num(cand_words)
                                value = parsed
                                break
                            except Exception:
                                continue
                if value is not None:
                    break
        except Exception:
            value = None

    if value is not None:
        # look for which field
        for field, kwlist in fk.items():
            if any(kw in lowered for kw in kwlist):
                # Compose a localized reply
                replies = {
                    'en': f'Set {field} to {value}.',
                    'hi': f'{field} को {value} पर सेट कर दिया गया है।',
                    'bn': f'{field} {value} এ সেট করা হয়েছে।'
                }
                reply = replies.get(lang, replies['en'])
                return { 'action': 'set_field', 'field': field, 'value': value, 'reply': reply }

    # Navigation intents per language
    nav_keywords = {
        'en': {
            'dashboard': ['dashboard', 'home'],
            'accounts': ['account', 'accounts'],
            'transactions': ['transaction', 'transactions'],
            'reports': ['report', 'reports'],
            'investments': ['investment', 'investments'],
            'loans': ['loan', 'loans'],
            'settings': ['setting', 'settings'],
            'sakhi_ai': ['sakhi ai', 'sakhi']
        },
        'hi': {
            'dashboard': ['डैशबोर्ड', 'होम'],
            'accounts': ['खाते'],
            'transactions': ['लेन', 'लेन-देन'],
            'reports': ['रिपोर्ट'],
            'investments': ['निवेश'],
            'loans': ['ऋण'],
            'settings': ['सेटिंग'],
            'sakhi_ai': ['सखी']
        }
    }

    # show logs intent keywords
    logs_keywords = {
        'en': ['logs', 'show logs', 'prediction logs', 'history'],
        'hi': ['लॉग', 'लॉग दिखाएँ', 'इतिहास']
    }

    # detect navigation
    nk = nav_keywords.get(lang, nav_keywords['en'])
    for target, words in nk.items():
        if any(w in t for w in words):
            replies_nav = {
                'en': f'Navigating to {target}.',
                'hi': f'{target} पर जा रहे हैं।'
            }
            return { 'action': 'navigate', 'target': target, 'reply': replies_nav.get(lang, replies_nav['en']) }

    # detect logs request
    lk = logs_keywords.get(lang, logs_keywords['en'])
    if any(w in t for w in lk):
        replies_logs = {
            'en': 'Fetching recent logs for you.',
            'hi': 'नवीनतम लॉग निकाल रहा हूँ।'
        }
        return { 'action': 'show_logs', 'reply': replies_logs.get(lang, replies_logs['en']) }

    return { 'action': 'echo', 'reply': f"I heard: {text}" }


@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    """Generate speech audio (MP3) for provided text using gTTS."""
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required for TTS")

    try:
        buffer = BytesIO()
        tts = gTTS(text=text, lang=request.lang)
        tts.write_to_fp(buffer)
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")

# ============================================================
# Run with Uvicorn
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
