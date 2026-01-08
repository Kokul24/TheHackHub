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
- 🔐 **Role-Based Access Control** (Admin, Manager, User)

---

## 👥 Role-Based Access Control

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Admin** | Head Office | Create/manage users, view system stats |
| **Manager** | Branch | Review loan requests, approve/reject, download PDF reports |
| **User** | SHG Member | Calculate credit score, apply for loans, view application status |

### Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ **Important:** Change the default admin password after first login!

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React (Vite) + Tailwind CSS + Axios |
| **Backend** | Python FastAPI + Uvicorn |
| **Database** | MongoDB (PyMongo) |
| **AI/ML** | Scikit-Learn (Random Forest) + SHAP |
| **Auth** | Token-based authentication |

---

## 📁 Project Structure

```
SakhiScore/
├── backend/
│   ├── main.py              # FastAPI app with RBAC endpoints
│   ├── model_trainer.py     # Script to generate data & train model
│   ├── requirements.txt     # Python dependencies
│   ├── shg_model.pkl        # Trained model (generated)
│   └── shg_data.csv         # Sample data (generated)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with Login, AdminPanel, ManagerInbox, SHGDashboard
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
- MongoDB (required for user management)

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

> On first startup, a default admin user is created automatically.

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

### Authentication Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/login` | POST | Public | Login and get auth token |
| `/logout` | POST | Any | Invalidate auth token |
| `/admin/create_user` | POST | Admin | Create new user |
| `/admin/users` | GET | Admin | List all users |
| `/admin/delete_user/{id}` | DELETE | Admin | Delete a user |

### Loan Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/loan/apply` | POST | User | Submit loan application |
| `/loan/my_requests` | GET | User | View own applications |
| `/loan/all` | GET | Manager | Get all pending requests |
| `/loan/update_status` | POST | Manager | Approve/Reject request |
| `/loan/history` | GET | Manager/Admin | View all loan history |

### Prediction Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | Calculate credit score with SHAP explanation |
| `/health` | GET | Check API and model status |

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

### POST `/login`
Authenticate user.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "your-auth-token",
  "role": "admin",
  "username": "admin",
  "user": {
    "id": "...",
    "full_name": "System Administrator",
    "role": "admin",
    "branch_id": "HQ"
  }
}
```

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

## 🎨 UI Features

### Login Page
- Single entry point for all users
- No public signup (admin creates users)
- Auto-redirect based on role

### Admin Panel
- Create/delete users
- Assign roles (admin, manager, user)
- Set branch IDs and KYC status

### Manager Inbox
- View pending loan requests
- Download PDF reports with SHAP charts
- Approve or reject applications

### SHG Dashboard
- Calculate credit score
- View SHAP explanation
- Apply for loans (one pending at a time)
- Track application status

---

## 🌐 MongoDB Setup

MongoDB is **required** for this application:

1. Install MongoDB locally or use MongoDB Atlas
2. The default connection uses MongoDB Atlas (configured in code)
3. To use a custom MongoDB:
   ```bash
   set MONGO_URI=mongodb://localhost:27017
   ```
4. Restart the backend

### Collections Used
- `users` - User accounts with roles
- `loan_requests` - Loan applications
- `auth_tokens` - Authentication tokens
- `shg_logs` - Prediction audit logs

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
