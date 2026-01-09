# SakhiCircle

**AI-Powered Credit Scoring Dashboard for Self-Help Groups (SHGs) in Rural India**

![SakhiCircle](https://img.shields.io/badge/FinTech-Hackathon-blue)
![Python](https://img.shields.io/badge/Python-3.9+-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Project Overview

SakhiCircle is a credit scoring platform designed for Self-Help Groups (SHGs) in rural India. It uses Machine Learning to predict creditworthiness based on group behavior and provides **Explainable AI (SHAP)** visualizations to show the "why" behind each score.

### Key Features
- **Credit Score (0-100)** based on group financial metrics
- **Random Forest ML Model** trained on synthetic SHG data
- **SHAP Waterfall Plots** for explainable predictions
- **MongoDB Database** for data persistence
- **Modern Dashboard UI** with React + Tailwind CSS
- **Role-Based Access Control** (Admin/SHG Representative, Manager, User)
- **Voice Input Support** for loan purpose entry
- **Score History & Trends** with RadarChart and BarChart visualizations
- **PDF Report Generation** for loan applications

---

## Novelty of the Proposed System

The key novelty of this system lies in its **role-based financial intelligence framework**, purpose-built for **Self-Help Groups (SHGs)**. Unlike conventional SHG credit assessment mechanisms that rely heavily on external documentation, periodic audits, and manual verification, this platform embeds **financial discipline, transparency, and accountability directly into daily SHG operations**.

The system introduces **three distinct user roles**, each addressing a critical limitation in existing SHG–bank interaction models.

---

### Member Role – Transparency and Financial Awareness

SHG members are provided with a **personalized dashboard** that displays:

* Meeting attendance records
* Monthly savings contributions
* Budget consistency indicators
* Overall group financial performance

By making these metrics visible to every member, the system promotes **individual accountability and financial awareness**. Members can clearly understand how their participation influences the group’s overall credit health, encouraging **responsible and consistent financial behavior** within the SHG.

---

### Admin Role – Structured Data Capture and Internal Governance

The **Admin role** is assigned to a selected SHG member responsible for maintaining accurate group records. This role enables:

* Logging of meeting details and attendance
* Recording savings collections and cash flow
* Maintaining transaction and repayment data

Since this information forms the foundation for **credit score computation**, the Admin role ensures that financial data is **structured, timely, and internally governed**. This reduces dependence on paper-based records and minimizes inconsistencies that often result in loan delays or rejections.

---

### Manager Role – Collective Loan Decision Interface

The **Manager role** serves as the formal interface between SHGs and lending institutions. Rather than individual loan applications, the SHG submits **collective loan requests** through this role.

An **AI/ML-based evaluation engine** analyzes:

* Attendance trends
* Savings discipline
* Repayment behavior
* Group stability indicators

Based on these factors, the system generates an **explainable credit score and loan eligibility recommendation**, supporting informed decision-making while **preserving human oversight**.

---

### Why This Approach Is Necessary

Existing SHG lending systems suffer from:

* Fragmented and inconsistent records
* Limited transparency for members
* Subjective and manual credit evaluations

By integrating **role-based data management**, **continuous financial monitoring**, and **explainable AI-driven credit assessment**, this platform bridges the gap between informal SHG operations and formal financial institutions.

The system does **not automate loan approvals**. Instead, it functions as a **decision-support framework** that enhances trust, improves data quality, and strengthens financial readiness—making SHG lending **fairer, more transparent, and scalable**, while empowering SHGs to actively improve their own creditworthiness.

---




## Loan Approval Workflow

The loan approval process follows a **two-step verification** system:

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────┐      ┌──────────┐
│  SHG Member │ ──▶  │ SHG Representative │ ──▶  │   Manager   │ ──▶  │ Approved │
│   (User)    │      │     (Admin)       │      │             │      │   /Rejected
└─────────────┘      └─────────────────┘      └─────────────┘      └──────────┘
    Applies              Reviews &              Final
    for Loan             Forwards               Decision
```

### Loan Status Flow:
1. **Pending Admin Review** - Member submitted, awaiting SHG Rep review
2. **Pending Manager Review** - Forwarded by SHG Rep, awaiting Manager decision
3. **Approved** - Loan approved by Manager
4. **Rejected** - Rejected by Manager
5. **Rejected by Admin** - Rejected by SHG Representative

---

### Default Manager Credentials
- **Username:** `manager`
- **Password:** `manager123`

> **Important:** Create users through registration page. Managers are pre-seeded in the database.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 (Vite) + Tailwind CSS + Axios |
| **Backend** | Python FastAPI + Uvicorn |
| **Database** | MongoDB Atlas (Cloud) |
| **AI/ML** | Scikit-Learn (Random Forest) + SHAP |
| **Charts** | Recharts (RadarChart, BarChart) |
| **Auth** | JWT Token-based authentication |

---

## Project Structure

```
SakhiCircle/
├── backend/
│   ├── main.py              # FastAPI app with all endpoints
│   ├── model_trainer.py     # Script to generate data & train model
│   ├── requirements.txt     # Python dependencies
│   ├── shg_model.pkl        # Trained model (generated)
│   ├── shg_data.csv         # Sample data
│   └── .env                 # Environment variables (MongoDB URI)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with all dashboards
│   │   ├── main.jsx         # React entry point
│   │   ├── index.css        # Tailwind styles
│   │   └── components/
│   │       ├── ScoreCard.jsx   # Score display with gauge
│   │       ├── FormInput.jsx   # Slider input component
│   │       └── VoiceInput.jsx  # Voice-to-text input
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Step 1: Setup Backend

```bash
# Navigate to backend
cd SakhiCircle/backend

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
cd SakhiCircle/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: **http://localhost:3000**

---

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/login` | POST | Public | Login and get auth token |
| `/register` | POST | Public | Register new user (Admin/User) |
| `/logout` | POST | Any | Invalidate auth token |

### Loan Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/loan/apply` | POST | User | Submit loan application (status: Pending Admin Review) |
| `/loan/my_requests` | GET | User | View own applications |
| `/loan/pending_admin_review` | GET | Admin | Get requests pending admin review |
| `/loan/forward_to_manager` | POST | Admin | Forward request to manager |
| `/loan/reject_by_admin` | POST | Admin | Reject request without forwarding |
| `/loan/all` | GET | Manager | Get all requests pending manager review |
| `/loan/update_status` | POST | Manager | Approve/Reject request |
| `/loan/history` | GET | Manager/Admin | View all loan history |

### SHG Group Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/shg/group_data` | GET | Admin | Get group financial data |
| `/shg/update_group_data` | POST | Admin | Update group metrics |
| `/shg/my_group_data` | GET | User | Get group data for members |
| `/score/log` | POST | Admin | Log score to history |
| `/score/history/{shg_name}` | GET | Manager | Get score history for trend analysis |

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

## ML Model Details

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
- **Low Risk**: Score ≥ 60
- **High Risk**: Score < 60

---

## Explainable AI

SakhiCircle uses **SHAP (SHapley Additive exPlanations)** to explain predictions:

- Each prediction includes a **Waterfall Plot**
- Shows how each feature pushed the prediction up or down
- Makes AI decisions transparent and trustworthy

---

## UI Features

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

## MongoDB Setup

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

## Video Link
https://vimeo.com/1152687391?fl=ip&fe=ec

---

## License

MIT License - Feel free to use and modify!

---

## Acknowledgments

- Self-Help Group movement in India
- SHAP library for Explainable AI
- FastAPI & React communities
