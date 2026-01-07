# 🏦 Sakhi-Score

**AI-Powered Credit Scoring Dashboard for Self-Help Groups (SHGs) in Rural India**

![Sakhi-Score](https://img.shields.io/badge/FinTech-Hackathon-blue)
![Python](https://img.shields.io/badge/Python-3.9+-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Project Overview

Sakhi-Score is a credit scoring platform designed for Self-Help Groups (SHGs) in rural India. It uses Machine Learning to predict creditworthiness based on group behavior and provides **Explainable AI (SHAP)** visualizations to show the "why" behind each score.

### Features
- 📊 **Credit Score (0-100)** based on group financial metrics
- 🤖 **Random Forest ML Model** trained on synthetic SHG data
- 🔍 **SHAP Waterfall Plots** for explainable predictions
- 💾 **MongoDB Logging** for audit trails
- 🎨 **Modern Dashboard UI** with React + Tailwind CSS

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React (Vite) + Tailwind CSS + Axios |
| **Backend** | Python FastAPI + Uvicorn |
| **Database** | MongoDB (PyMongo) |
| **AI/ML** | Scikit-Learn (Random Forest) + SHAP |

---

## 📁 Project Structure

```
SakhiScore/
├── backend/
│   ├── main.py              # FastAPI app with prediction endpoint
│   ├── model_trainer.py     # Script to generate data & train model
│   ├── requirements.txt     # Python dependencies
│   ├── shg_model.pkl        # Trained model (generated)
│   └── shg_data.csv         # Sample data (generated)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main dashboard component
│   │   ├── main.jsx         # React entry point
│   │   ├── index.css        # Tailwind styles
│   │   └── components/
│   │       ├── ScoreCard.jsx   # Score display component
│   │       └── FormInput.jsx   # Slider input component
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB (optional - app works without it)

### Step 1: Setup Backend

```bash
# Navigate to backend
cd SakhiScore/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train the ML model (IMPORTANT - run this first!)
python model_trainer.py

# Start the API server
python main.py
# OR
uvicorn main:app --reload --port 8000
```

The backend will be available at: **http://localhost:8000**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Step 2: Setup Frontend

```bash
# Open new terminal, navigate to frontend
cd SakhiScore/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: **http://localhost:3000**

---

## 📊 API Endpoints

### POST `/predict`
Predict credit score for an SHG.

**Request:**
```json
{
  "savings": 2500,
  "attendance": 85,
  "repayment": 75
}
```

**Response:**
```json
{
  "score": 78,
  "risk": "Low Risk ✅",
  "risk_color": "#22c55e",
  "explanation_image": "data:image/png;base64,...",
  "features": {
    "savings_per_member": 2500,
    "attendance_rate": 85,
    "loan_repayment_rate": 75,
    "low_risk_probability": 0.92
  },
  "timestamp": "2026-01-07T10:30:00.000Z"
}
```

### GET `/health`
Check API and model status.

### GET `/logs`
Retrieve recent prediction logs (requires MongoDB).

---

## 🧠 ML Model Details

### Features
| Feature | Range | Weight |
|---------|-------|--------|
| Savings per Member | ₹100 - ₹5,000 | 30% |
| Attendance Rate | 0% - 100% | 30% |
| Loan Repayment Rate | 0% - 100% | 40% |

### Credit Score Formula
```
Score = 0.30 × Normalized_Savings + 0.30 × Attendance + 0.40 × Repayment
```

### Risk Classification
- **Low Risk (✅)**: Score ≥ 60
- **High Risk (⚠️)**: Score < 60

---

## 🔍 Explainable AI

Sakhi-Score uses **SHAP (SHapley Additive exPlanations)** to explain predictions:

- Each prediction includes a **Waterfall Plot**
- Shows how each feature pushed the prediction up or down
- Makes AI decisions transparent and trustworthy

---

## 🎨 UI Screenshots

The dashboard features:
- Clean blue/white banking theme
- Interactive sliders for input
- Animated score gauge
- Real-time SHAP explanations

---

## 🌐 MongoDB Setup (Optional)

The app works without MongoDB, but to enable logging:

1. Install MongoDB locally or use MongoDB Atlas
2. Set environment variable:
   ```bash
   set MONGO_URI=mongodb://localhost:27017
   ```
3. Restart the backend

---

## 👥 Team

Built for **FinTech Hackathon 2026**

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 🙏 Acknowledgments

- Self-Help Group movement in India
- SHAP library for Explainable AI
- FastAPI & React communities
