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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

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

# ============================================================
# Pydantic Models
# ============================================================

class PredictionInput(BaseModel):
    """Input schema for credit score prediction."""
    savings: float = Field(..., ge=100, le=5000, description="Savings per member (INR)")
    attendance: float = Field(..., ge=0, le=100, description="Attendance rate (%)")
    repayment: float = Field(..., ge=0, le=100, description="Loan repayment rate (%)")

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

# ============================================================
# Run with Uvicorn
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
