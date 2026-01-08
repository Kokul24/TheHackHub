"""
Sakhi-Score: FastAPI Backend
Credit Scoring API with SHAP Explainability for Self-Help Groups
Role-Based Access Control: Admin, Manager, User
"""

import os
import pickle
import base64
import hashlib
import secrets
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional, Literal

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import shap
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from langdetect import detect as lang_detect
from word2number import w2n
from fastapi import FastAPI, HTTPException, Depends, Header
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
from bson.objectid import ObjectId

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

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://kokulkrishnan07_db_user:GjivqglXwk2XWWZP@streesquad.6v6zwht.mongodb.net/?appName=Streesquad")
DB_NAME = "sakhiscore"
COLLECTION_NAME = "shg_logs"
REQUESTS_COLLECTION = "loan_requests"
USERS_COLLECTION = "users"
TOKENS_COLLECTION = "auth_tokens"
SCORE_LOGS_COLLECTION = "score_logs"  # New: Historical score tracking

mongo_client: Optional[MongoClient] = None
db = None
collection = None
requests_collection = None
users_collection = None
tokens_collection = None
score_logs_collection = None  # New: Historical score logs

def connect_to_mongodb():
    """Initialize MongoDB connection."""
    global mongo_client, db, collection, requests_collection, users_collection, tokens_collection, score_logs_collection
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        mongo_client.admin.command('ping')
        db = mongo_client[DB_NAME]
        collection = db[COLLECTION_NAME]
        requests_collection = db[REQUESTS_COLLECTION]
        users_collection = db[USERS_COLLECTION]
        tokens_collection = db[TOKENS_COLLECTION]
        score_logs_collection = db[SCORE_LOGS_COLLECTION]  # New: Score logs
        print("✅ Connected to MongoDB successfully!")
        
        # Create default admin if not exists
        create_default_admin()
        
        return True
    except ConnectionFailure as e:
        print(f"⚠️ MongoDB connection failed: {e}")
        print("📝 Running without database logging...")
        return False

def create_default_admin():
    """Create default users for testing."""
    global users_collection
    if users_collection is None:
        return
    
    try:
        # Create SHG Representative (Admin) - logs in with SHG credentials to update group data
        existing_admin = users_collection.find_one({"username": "shakti_shg"})
        if not existing_admin:
            hashed_password = hashlib.sha256("shakti123".encode()).hexdigest()
            users_collection.insert_one({
                "username": "shakti_shg",
                "password": hashed_password,
                "role": "admin",
                "branch_id": "BR001",
                "kyc_verified": True,
                "full_name": "Shakti SHG Representative",
                "shg_name": "Shakti Mahila SHG",
                "contact": "9876543210",
                "created_at": datetime.utcnow().isoformat(),
                "created_by": "system"
            })
            print("✅ SHG Representative created (username: shakti_shg, password: shakti123) - SHG: Shakti Mahila SHG")
        
        # Create default manager if not exists
        existing_manager = users_collection.find_one({"username": "manager"})
        if not existing_manager:
            hashed_password = hashlib.sha256("manager123".encode()).hexdigest()
            users_collection.insert_one({
                "username": "manager",
                "password": hashed_password,
                "role": "manager",
                "branch_id": "BR001",
                "kyc_verified": True,
                "full_name": "Branch Manager",
                "contact": "manager@sakhiscore.in",
                "created_at": datetime.utcnow().isoformat(),
                "created_by": "system"
            })
            print("✅ Default manager created (username: manager, password: manager123)")
        
        # Create SHG Member (User) - can request loans
        existing_user = users_collection.find_one({"username": "lakshmi"})
        if not existing_user:
            hashed_password = hashlib.sha256("lakshmi123".encode()).hexdigest()
            users_collection.insert_one({
                "username": "lakshmi",
                "password": hashed_password,
                "role": "user",
                "branch_id": "BR001",
                "kyc_verified": True,
                "full_name": "Lakshmi Devi",
                "shg_name": "Shakti Mahila SHG",
                "contact": "9876543210",
                "created_at": datetime.utcnow().isoformat(),
                "created_by": "system"
            })
            print("✅ SHG Member created (username: lakshmi, password: lakshmi123) - SHG: Shakti Mahila SHG")
        
        # Create second member in same SHG (to show grouping)
        existing_user2 = users_collection.find_one({"username": "radha"})
        if not existing_user2:
            hashed_password = hashlib.sha256("radha123".encode()).hexdigest()
            users_collection.insert_one({
                "username": "radha",
                "password": hashed_password,
                "role": "user",
                "branch_id": "BR001",
                "kyc_verified": True,
                "full_name": "Radha Kumari",
                "shg_name": "Shakti Mahila SHG",  # Same SHG
                "contact": "9876543211",
                "created_at": datetime.utcnow().isoformat(),
                "created_by": "system"
            })
            print("✅ SHG Member created (username: radha, password: radha123) - SHG: Shakti Mahila SHG")
            
    except Exception as e:
        print(f"⚠️ Failed to create default users: {e}")

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

class UserCreate(BaseModel):
    """Admin creates a new user schema."""
    username: str = Field(..., min_length=3, description="Username")
    password: str = Field(..., min_length=4, description="Password")
    role: Literal['admin', 'manager', 'user'] = Field(..., description="Role: admin, manager, or user")
    branch_id: str = Field(..., description="Branch ID")
    full_name: str = Field(..., description="Full name")
    shg_name: Optional[str] = Field(None, description="SHG Group name - users with same SHG belong to one group")
    contact: Optional[str] = Field(None, description="Contact number or email")
    kyc_verified: bool = Field(default=False, description="KYC verification status")

class UserLogin(BaseModel):
    """User login schema."""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

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

class LoanApply(BaseModel):
    """Loan application submission schema (User Only)."""
    group_id: str = Field(..., description="SHG Group ID or Name")
    shg_name: str = Field(..., description="Name of the Self-Help Group")
    member_name: Optional[str] = Field(None, description="Name of the member applying")
    contact: Optional[str] = Field("", description="Contact number or email")
    loan_amount: Optional[float] = Field(10000, description="Requested loan amount")
    loan_purpose: Optional[str] = Field(None, description="Purpose of the loan")
    savings: float = Field(..., ge=100, le=5000, description="Savings per member (INR)")
    attendance: float = Field(..., ge=0, le=100, description="Attendance rate (%)")
    repayment: float = Field(..., ge=0, le=100, description="Loan repayment rate (%)")
    score: int = Field(..., description="Calculated credit score")
    risk: str = Field(..., description="Risk classification")
    explanation_image: Optional[str] = Field(None, description="SHAP visualization")

class UpdateStatusRequest(BaseModel):
    """Update loan request status schema."""
    request_id: str = Field(..., description="MongoDB document ID")
    status: Literal['Approved', 'Rejected'] = Field(..., description="New status: Approved or Rejected")
    manager_notes: Optional[str] = Field(None, description="Manager's notes")

# Legacy models for backwards compatibility
class UserRegister(BaseModel):
    """User registration schema (Deprecated - use admin/create_user)."""
    username: str = Field(..., min_length=3, description="Username")
    password: str = Field(..., min_length=4, description="Password")
    role: str = Field(..., description="Role: shg_user or manager")
    full_name: str = Field(..., description="Full name")
    contact: Optional[str] = Field(None, description="Contact number or email")

class LoanRequest(BaseModel):
    """Loan request submission schema."""
    shg_name: str = Field(..., description="Name of the Self-Help Group")
    contact: str = Field(..., description="Contact number or email")
    savings: float = Field(..., ge=100, le=5000, description="Savings per member (INR)")
    attendance: float = Field(..., ge=0, le=100, description="Attendance rate (%)")
    repayment: float = Field(..., ge=0, le=100, description="Loan repayment rate (%)")
    score: int = Field(..., description="Calculated credit score")
    risk: str = Field(..., description="Risk classification")
    explanation_image: str = Field(..., description="SHAP visualization")
    user_id: Optional[str] = Field(None, description="User ID who submitted")

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
    
    # Debug: Print shape to understand structure
    print(f"🔍 SHAP values type: {type(shap_values)}")
    if isinstance(shap_values, list):
        print(f"🔍 SHAP values list length: {len(shap_values)}")
        for i, sv in enumerate(shap_values):
            print(f"🔍 SHAP values[{i}] shape: {sv.shape if hasattr(sv, 'shape') else type(sv)}")
    else:
        print(f"🔍 SHAP values shape: {shap_values.shape}")
    
    # For binary classification, use the positive class (Low Risk)
    if isinstance(shap_values, list) and len(shap_values) > 1:
        # Binary classification: list of [class0_shap, class1_shap]
        shap_vals = shap_values[1][0]  # Class 1 (Low Risk) values for first sample
        expected_val = explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value
    elif isinstance(shap_values, list):
        # Single output
        shap_vals = shap_values[0][0]
        expected_val = explainer.expected_value[0] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value
    else:
        # Direct array output
        shap_vals = shap_values[0]
        expected_val = explainer.expected_value
    
    # Create SHAP Explanation object for waterfall plot
    explanation = shap.Explanation(
        values=shap_vals,
        base_values=expected_val,
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
# Token Authentication Helpers
# ============================================================

def generate_token(user_id: str) -> str:
    """Generate a secure authentication token."""
    token = secrets.token_urlsafe(32)
    if tokens_collection is not None:
        tokens_collection.insert_one({
            "token": token,
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        })
    return token

def verify_token(token: str) -> Optional[dict]:
    """Verify token and return user data."""
    if tokens_collection is None or users_collection is None:
        return None
    
    try:
        token_doc = tokens_collection.find_one({
            "token": token,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not token_doc:
            return None
        
        user = users_collection.find_one({"_id": ObjectId(token_doc["user_id"])})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception:
        return None

def get_current_user(authorization: str = Header(None)) -> dict:
    """Dependency to get current authenticated user from token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user

def require_role(allowed_roles: list):
    """Dependency factory to require specific roles."""
    def role_checker(authorization: str = Header(None)) -> dict:
        user = get_current_user(authorization)
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return user
    return role_checker

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
    import pandas as pd
    input_df = pd.DataFrame(
        [[input_data.savings, input_data.attendance, input_data.repayment]],
        columns=feature_names
    )
    
    # Get model prediction (risk classification)
    risk_prediction = model.predict(input_df)[0]
    risk_proba = model.predict_proba(input_df)[0]
    
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
        explanation_image = generate_shap_waterfall(input_df.values, feature_names)
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
            'savings': ['savings', 'monthly savings', 'monthly saving', 'save', 'monthly contribution', 'per member'],
            'attendance': ['attendance', 'meeting attendance', 'presence', 'attendance rate', 'meeting turnout'],
            'repayment': ['repayment', 'repay', 'repayment rate', 'loan repayment', 'on-time repayment', 'emi']
        },
        'hi': {
            'savings': ['बचत', 'बचत प्रति सदस्य', 'मासिक बचत', 'मासिक योगदान', 'प्रति सदस्य'],
            'attendance': ['उपस्थिति', 'हाजिरी', 'हाजिरी दर', 'बैठक उपस्थिति', 'उपस्थित प्रतिशत'],
            'repayment': ['भुगतान', 'वापसी', 'ऋण भुगतान', 'समय पर भुगतान', 'कर्ज चुकौती']
        },
        'bn': {
            'savings': ['সঞ্চয়', 'মাসিক সঞ্চয়', 'প্রতি সদস্য'],
            'attendance': ['উপস্থিতি', 'মিটিং উপস্থিতি', 'উপস্থিতির হার'],
            'repayment': ['প্রত্যর্পণ', 'প্রতিদান', 'ঋণ পরিশোধ']
        },
        'ta': {
            'savings': ['சேமிப்பு', 'மாத சேமிப்பு', 'ஒரு உறுப்பினருக்கு'],
            'attendance': ['வருகை', 'ஒட்டுமொத்த வருகை', 'கூட்டத்தில் வருகை'],
            'repayment': ['திருப்பி', 'கட்டணம்', 'கடன்செலுத்தல்']
        },
        'te': {
            'savings': ['సేవింగ్స్', 'మాసిక సేవింగ్స్', 'ప్రతి సభ్యుడు'],
            'attendance': ['హాజరు', 'సభ హాజరు', 'హాజరీ రేటు'],
            'repayment': ['చెల్లింపు', 'తిరిగి చెల్లింపు', 'ఋణ చెల్లింపు']
        },
        'kn': {
            'savings': ['ಉಳವೊ', 'ಸಂಚಯ', 'ಮಾಸಿಕ ಉಳವೆ', 'ಪ್ರತಿ ಸದಸ್ಯ'],
            'attendance': ['ಹಾಜರಿ', 'ಸಭೆ ಹಾಜರಿ', 'ಹಾಜರಿ ದರ', 'ೂಪಸ್ಥಿತಿ'],
            'repayment': ['ಮರುಪಾವತಿ', 'ಬಡ್ಡಿ ಪಾವತಿ', 'ಕಡ್ಡಿ']
        },
        'ml': {
            'savings': ['ശേഖരം', 'മാസ്റ്റ്രി ശേഖരം', 'പ്രതി അംഗം'],
            'attendance': ['ഹാജര', 'യോഗ ഹാജര', 'ഹാജര നിരക്ക്'],
            'repayment': ['തിരിച്ചു അടുപ്പ്', 'കിട്ട്പാട്', 'പണമടയ്‌ക്കല്']
        },
        'mr': {
            'savings': ['बचत', 'मासिक बचत', 'प्रति सदस्य'],
            'attendance': ['हजेरी', 'बैठकीची हजेरी', 'हजेरी दर'],
            'repayment': ['परतफेड', 'कर्ज परतफेड', 'वेळेवर परतफेड']
        },
        'gu': {
            'savings': ['બચત', 'માસિક બચત', 'પ્રતિ સભ્ય'],
            'attendance': ['હાજરી', 'બેઠક હાજરી', 'હાજરી દર'],
            'repayment': ['ચુકવણી', 'રીપેમેન્ટ', 'સમીય પર ચૂકવણી']
        },
        'pa': {
            'savings': ['ਬਚਤ', 'ਮਹੀਨਾਵਾਰ ਬਚਤ', 'ਹਰ ਮੈਂਬਰ'],
            'attendance': ['ਹਾਜ਼ਰੀ', 'ਮੀਟਿੰਗ ਹਾਜ਼ਰੀ', 'ਹਾਜ਼ਰੀ ਦਰ'],
            'repayment': ['ਵਾਪਸੀ', 'ਕਰਜ਼ ਵਾਪਸੀ', 'ਸਮੇਂ ']
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
@app.post("/submit_request")
async def submit_loan_request(request: LoanRequest):
    """
    Submit a loan request from SHG user.
    Saves the request with status 'Pending' to MongoDB.
    LEGACY: Use /loan/apply with authentication instead.
    """
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        request_data = {
            "request_id": str(ObjectId()),
            "group_id": request.shg_name,
            "shg_name": request.shg_name,
            "contact": request.contact,
            "savings": request.savings,
            "attendance": request.attendance,
            "repayment": request.repayment,
            "score": request.score,
            "risk": request.risk,
            "explanation_image": request.explanation_image,
            "status": "Pending",
            "user_id": request.user_id or "",
            "submitted_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "manager_notes": ""
        }
        
        result = requests_collection.insert_one(request_data)
        
        return {
            "success": True,
            "message": "Loan request submitted successfully",
            "request_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit request: {str(e)}")

@app.get("/get_requests")
async def get_loan_requests(status: Optional[str] = None):
    """
    Get loan requests for Bank Manager.
    Optionally filter by status (Pending, Approved, Rejected).
    LEGACY: Use /loan/all with authentication instead.
    """
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        query = {}
        if status:
            query["status"] = status
        
        requests = list(requests_collection.find(query).sort("submitted_at", -1))
        
        # Convert ObjectId to string for JSON serialization
        for req in requests:
            req["_id"] = str(req["_id"])
        
        return {
            "requests": requests,
            "count": len(requests)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")

@app.post("/update_status")
async def update_request_status(update: UpdateStatusRequest):
    """
    Update the status of a loan request (Approve/Reject).
    Used by Bank Manager.
    LEGACY: Use /loan/update_status with authentication instead.
    """
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        update_data = {
            "status": update.status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if update.manager_notes:
            update_data["manager_notes"] = update.manager_notes
        
        result = requests_collection.update_one(
            {"_id": ObjectId(update.request_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {
            "success": True,
            "message": f"Request {update.status.lower()} successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

# ============================================================
# Authentication Endpoints
# ============================================================

@app.post("/login")
async def login_user(credentials: UserLogin):
    """
    Login endpoint - Returns token, role, and username.
    Checks credentials against MongoDB users collection.
    """
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Hash the provided password
        hashed_password = hashlib.sha256(credentials.password.encode()).hexdigest()
        
        # Find user with matching username and password
        user = users_collection.find_one({
            "username": credentials.username,
            "password": hashed_password
        })
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Generate token
        token = generate_token(str(user["_id"]))
        
        return {
            "success": True,
            "message": "Login successful",
            "token": token,
            "role": user["role"],
            "username": user["username"],
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "full_name": user.get("full_name", user["username"]),
                "role": user["role"],
                "branch_id": user.get("branch_id", ""),
                "kyc_verified": user.get("kyc_verified", False),
                "contact": user.get("contact", ""),
                "shg_name": user.get("shg_name", "")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

class PublicRegister(BaseModel):
    """Public registration schema for Admin (SHG Rep) and User (SHG Member)."""
    username: str = Field(..., min_length=3, description="Username")
    password: str = Field(..., min_length=4, description="Password")
    full_name: str = Field(..., description="Full name")
    shg_name: str = Field(..., description="SHG Group name")
    role: Literal['admin', 'user'] = Field(..., description="Role: admin (SHG Rep) or user (SHG Member)")
    contact: Optional[str] = Field(None, description="Contact number or email")

@app.post("/register")
async def register_user(data: PublicRegister):
    """
    Public registration endpoint.
    - Admin (SHG Representative): Can calculate credit score for their SHG group
    - User (SHG Member): Can apply for loans using group's credit score
    """
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Check if username already exists
        existing_user = users_collection.find_one({"username": data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password
        hashed_password = hashlib.sha256(data.password.encode()).hexdigest()
        
        # Create user document
        new_user = {
            "username": data.username,
            "password": hashed_password,
            "full_name": data.full_name,
            "shg_name": data.shg_name,
            "role": data.role,
            "contact": data.contact or "",
            "branch_id": "BR001",  # Default branch
            "kyc_verified": False,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": "self_registration"
        }
        
        result = users_collection.insert_one(new_user)
        
        role_description = "SHG Representative (can calculate group credit score)" if data.role == "admin" else "SHG Member (can apply for loans)"
        
        return {
            "success": True,
            "message": f"Registration successful! You are registered as: {role_description}",
            "username": data.username,
            "role": data.role,
            "shg_name": data.shg_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/admin/create_user")
async def admin_create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Admin Only: Create a new user with specific role.
    Only admins can create new users (no public signup).
    """
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Check if username already exists
        existing_user = users_collection.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password
        hashed_password = hashlib.sha256(user_data.password.encode()).hexdigest()
        
        new_user = {
            "username": user_data.username,
            "password": hashed_password,
            "role": user_data.role,
            "branch_id": user_data.branch_id,
            "kyc_verified": user_data.kyc_verified,
            "full_name": user_data.full_name,
            "shg_name": user_data.shg_name,  # SHG name - users with same SHG = one group
            "contact": user_data.contact,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": current_user["username"]
        }
        
        result = users_collection.insert_one(new_user)
        
        return {
            "success": True,
            "message": f"User '{user_data.username}' created successfully with role '{user_data.role}'",
            "user_id": str(result.inserted_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@app.get("/admin/users")
async def get_all_users(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin Only: Get all users in the system."""
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        users = list(users_collection.find({}, {"password": 0}))
        for user in users:
            user["_id"] = str(user["_id"])
        
        return {"users": users, "count": len(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

@app.delete("/admin/delete_user/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin Only: Delete a user."""
    if users_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Prevent deleting self
        if user_id == current_user["_id"]:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

# ============================================================
# Loan Application Endpoints
# ============================================================

@app.post("/loan/apply")
async def apply_for_loan(
    loan_data: LoanApply,
    current_user: dict = Depends(require_role(["user"]))
):
    """
    User Only: Submit a loan application.
    Saves the request to loan_requests collection with status 'Pending'.
    """
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Check if user already has a pending application
        existing_request = requests_collection.find_one({
            "user_id": current_user["_id"],
            "status": "Pending"
        })
        
        if existing_request:
            raise HTTPException(
                status_code=400, 
                detail="You already have a pending loan application. Please wait for it to be processed."
            )
        
        request_data = {
            "request_id": str(ObjectId()),
            "group_id": loan_data.group_id,
            "shg_name": loan_data.shg_name,
            "member_name": loan_data.member_name or current_user.get("full_name", ""),
            "contact": loan_data.contact or current_user.get("contact", ""),
            "loan_amount": loan_data.loan_amount or 10000,
            "loan_purpose": loan_data.loan_purpose or "",
            "savings": loan_data.savings,
            "attendance": loan_data.attendance,
            "repayment": loan_data.repayment,
            "score": loan_data.score,
            "risk": loan_data.risk,
            "explanation_image": loan_data.explanation_image or "",
            "status": "Pending",
            "user_id": current_user["_id"],
            "username": current_user["username"],
            "branch_id": current_user.get("branch_id", ""),
            "submitted_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "manager_notes": ""
        }
        
        result = requests_collection.insert_one(request_data)
        
        return {
            "success": True,
            "message": "Loan application submitted successfully",
            "request_id": str(result.inserted_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit application: {str(e)}")

@app.get("/loan/my_requests")
async def get_my_loan_requests(
    current_user: dict = Depends(require_role(["user"]))
):
    """User Only: Get own loan request history."""
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        requests = list(requests_collection.find(
            {"user_id": current_user["_id"]}
        ).sort("submitted_at", -1))
        
        for req in requests:
            req["_id"] = str(req["_id"])
        
        return {"requests": requests, "count": len(requests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")

@app.get("/loan/all")
async def get_all_pending_loans(
    current_user: dict = Depends(require_role(["manager"]))
):
    """
    Manager Only: Get all loan requests with status='Pending'.
    Returns requests for the manager's branch or all if no branch filter.
    """
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        query = {"status": "Pending"}
        
        # Optionally filter by branch
        # if current_user.get("branch_id"):
        #     query["branch_id"] = current_user["branch_id"]
        
        requests = list(requests_collection.find(query).sort("submitted_at", -1))
        
        for req in requests:
            req["_id"] = str(req["_id"])
        
        return {"requests": requests, "count": len(requests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")

@app.get("/loan/history")
async def get_loan_history(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role(["manager", "admin"]))
):
    """Manager/Admin: Get loan request history with optional status filter."""
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        query = {}
        if status:
            query["status"] = status
        
        requests = list(requests_collection.find(query).sort("submitted_at", -1))
        
        for req in requests:
            req["_id"] = str(req["_id"])
        
        return {"requests": requests, "count": len(requests)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")

@app.post("/loan/update_status")
async def update_loan_status(
    update: UpdateStatusRequest,
    current_user: dict = Depends(require_role(["manager"]))
):
    """
    Manager Only: Update loan request status to Approved or Rejected.
    """
    if requests_collection is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        update_data = {
            "status": update.status,
            "updated_at": datetime.utcnow().isoformat(),
            "reviewed_by": current_user["username"],
            "reviewed_at": datetime.utcnow().isoformat()
        }
        
        if update.manager_notes:
            update_data["manager_notes"] = update.manager_notes
        
        result = requests_collection.update_one(
            {"_id": ObjectId(update.request_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Loan request not found")
        
        return {
            "success": True,
            "message": f"Loan request {update.status.lower()} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@app.post("/logout")
async def logout_user(authorization: str = Header(None)):
    """Logout and invalidate token."""
    if not authorization or tokens_collection is None:
        return {"success": True, "message": "Logged out"}
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    tokens_collection.delete_one({"token": token})
    
    return {"success": True, "message": "Logged out successfully"}

# ============================================================
# SHG Group Data Endpoints (New Flow)
# ============================================================

SHG_GROUPS_COLLECTION = "shg_groups"
SCORE_LOGS_COLLECTION_NAME = "score_logs"

def get_shg_groups_collection():
    """Get or create SHG groups collection."""
    if db is None:
        return None
    return db[SHG_GROUPS_COLLECTION]

def get_score_logs_collection():
    """Get or create score logs collection for historical tracking."""
    if db is None:
        return None
    return db[SCORE_LOGS_COLLECTION_NAME]

def get_month_label(dt: datetime) -> str:
    """Convert datetime to month label like 'January 2026'."""
    return dt.strftime("%B %Y")

@app.post("/score/log")
async def log_score_history(
    data: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Admin (SHG Rep): Log a new score calculation to history.
    Appends to history instead of overwriting.
    """
    score_logs = get_score_logs_collection()
    if score_logs is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        shg_name = current_user.get("shg_name")
        if not shg_name:
            raise HTTPException(status_code=400, detail="User does not have an SHG name assigned")
        
        now = datetime.utcnow()
        
        score_log = {
            "group_id": shg_name,
            "shg_name": shg_name,
            "timestamp": now.isoformat(),
            "month_label": get_month_label(now),
            "inputs": {
                "savings": data.get("savings", 0),
                "attendance": data.get("attendance", 0),
                "repayment": data.get("repayment", 0)
            },
            "calculated_score": data.get("score", 0),
            "risk_status": data.get("risk", "Unknown"),
            "logged_by": current_user["username"]
        }
        
        score_logs.insert_one(score_log)
        
        return {
            "success": True,
            "message": "Score logged to history successfully",
            "month_label": get_month_label(now)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log score: {str(e)}")

@app.get("/score/history/{shg_name}")
async def get_score_history(
    shg_name: str,
    limit: int = 6,
    current_user: dict = Depends(require_role(["admin", "manager"]))
):
    """
    Get historical score data for an SHG group.
    Returns last N entries (default 6 for 6-month view).
    """
    score_logs = get_score_logs_collection()
    if score_logs is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        print(f"DEBUG: Fetching score history for SHG: {shg_name}, limit: {limit}")
        
        # Get last N score logs for this group, sorted by timestamp descending
        logs = list(score_logs.find(
            {"shg_name": shg_name}
        ).sort("timestamp", -1).limit(limit))
        
        print(f"DEBUG: Found {len(logs)} score log entries")
        
        # Convert ObjectId to string and format for response
        history = []
        for log in logs:
            entry = {
                "month_label": log.get("month_label", "Unknown"),
                "timestamp": log.get("timestamp", ""),
                "savings": log.get("inputs", {}).get("savings", 0),
                "attendance": log.get("inputs", {}).get("attendance", 0),
                "repayment": log.get("inputs", {}).get("repayment", 0),
                "score": log.get("calculated_score", 0),
                "risk": log.get("risk_status", "Unknown")
            }
            print(f"DEBUG: Entry - {entry}")
            history.append(entry)
        
        # Reverse to show oldest first (chronological order)
        history.reverse()
        
        return {
            "shg_name": shg_name,
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/shg/group_data")
async def get_group_data(
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Admin (SHG Representative): Get their SHG group's financial data.
    """
    shg_groups = get_shg_groups_collection()
    if shg_groups is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        shg_name = current_user.get("shg_name")
        if not shg_name:
            return {"group_data": None, "members": [], "loan_requests": []}
        
        # Get group data
        group_data = shg_groups.find_one({"shg_name": shg_name})
        if group_data:
            group_data["_id"] = str(group_data["_id"])
        
        # Get members of this SHG
        members = []
        if users_collection:
            member_list = list(users_collection.find(
                {"shg_name": shg_name, "role": "user"}, 
                {"password": 0}
            ))
            for m in member_list:
                m["_id"] = str(m["_id"])
            members = member_list
        
        # Get loan requests from this SHG
        loan_requests = []
        if requests_collection:
            req_list = list(requests_collection.find({"shg_name": shg_name}).sort("submitted_at", -1).limit(10))
            for r in req_list:
                r["_id"] = str(r["_id"])
            loan_requests = req_list
        
        return {
            "group_data": group_data,
            "members": members,
            "loan_requests": loan_requests
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch group data: {str(e)}")

@app.post("/shg/update_group_data")
async def update_group_data(
    data: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Admin (SHG Representative): Update their SHG group's financial data and score.
    """
    shg_groups = get_shg_groups_collection()
    if shg_groups is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        shg_name = current_user.get("shg_name")
        print(f"DEBUG: Current user data: {current_user}")
        print(f"DEBUG: SHG Name from user: {shg_name}")
        if not shg_name:
            # Try to fix by updating the user in database
            if users_collection and current_user.get("username") == "shakti_shg":
                users_collection.update_one(
                    {"username": "shakti_shg"},
                    {"$set": {"shg_name": "Shakti Mahila SHG"}}
                )
                shg_name = "Shakti Mahila SHG"
                print("✅ Fixed shakti_shg user - added SHG name")
            else:
                raise HTTPException(status_code=400, detail="User does not have an SHG name assigned")
        
        group_data = {
            "shg_name": shg_name,
            "savings": data.get("savings", 2500),
            "attendance": data.get("attendance", 85),
            "repayment": data.get("repayment", 75),
            "score": data.get("score"),
            "risk": data.get("risk"),
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user["username"]
        }
        
        # Upsert - update if exists, insert if not
        shg_groups.update_one(
            {"shg_name": shg_name},
            {"$set": group_data},
            upsert=True
        )
        
        return {
            "success": True,
            "message": f"Group data for '{shg_name}' updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update group data: {str(e)}")

@app.get("/shg/my_group_data")
async def get_my_group_data(
    current_user: dict = Depends(require_role(["user"]))
):
    """
    User (SHG Member): Get their SHG group's credit score data.
    """
    shg_groups = get_shg_groups_collection()
    if shg_groups is None:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        shg_name = current_user.get("shg_name")
        if not shg_name:
            return {"score": None, "message": "You are not assigned to any SHG group"}
        
        group_data = shg_groups.find_one({"shg_name": shg_name})
        
        if not group_data:
            return {
                "score": None,
                "shg_name": shg_name,
                "message": "Your SHG group has not calculated their credit score yet"
            }
        
        return {
            "shg_name": shg_name,
            "savings": group_data.get("savings"),
            "attendance": group_data.get("attendance"),
            "repayment": group_data.get("repayment"),
            "score": group_data.get("score"),
            "risk": group_data.get("risk"),
            "updated_at": group_data.get("updated_at")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch group data: {str(e)}")

# ============================================================
# Legacy Endpoints (Backwards Compatibility)
# ============================================================

@app.post("/register")
async def register_user(user: UserRegister):
    """
    DEPRECATED: Public registration is disabled.
    All users must be created by an admin.
    """
    raise HTTPException(
        status_code=403, 
        detail="Public registration is disabled. Please contact your administrator to create an account."
    )

# ============================================================
# Run with Uvicorn
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
