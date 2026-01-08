# 🚀 Sakhi-Score Role-Based Dashboard - Setup Instructions

## 📋 What's New?

The Sakhi-Score app has been upgraded with a **Role-Based Dashboard** featuring:

### ✨ New Features:
1. **Landing Page** - Choose between SHG User or Bank Manager login
2. **SHG User View** - Calculate credit scores and submit loan requests
3. **Bank Manager View** - Review, approve, or reject loan applications
4. **PDF Download** - Generate professional loan request reports
5. **MongoDB Integration** - Persistent storage for loan requests

---

## 🛠️ Complete Setup Guide

### Step 1: Pull Latest Code from GitHub

```bash
cd SakhiCircle
git pull origin main
```

### Step 2: Update Backend Dependencies

Navigate to backend and ensure MongoDB is ready:

```bash
cd SakhiCircle/backend

# Activate your virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Backend dependencies should already be installed
# If not, run:
pip install -r requirements.txt
```

**Important:** The backend now requires **MongoDB** to store loan requests. You have two options:

#### Option A: Install MongoDB Locally (Recommended)
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. MongoDB will run on default: `mongodb://localhost:27017`

#### Option B: Use MongoDB Atlas (Cloud)
1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster and get connection string
3. Set environment variable:
   ```bash
   # Windows PowerShell
   $env:MONGO_URI="your-connection-string"
   
   # Linux/Mac
   export MONGO_URI="your-connection-string"
   ```

### Step 3: Update Frontend Dependencies

Navigate to frontend and install new packages (jsPDF):

```bash
cd ../frontend  # or: cd SakhiCircle/frontend

npm install
```

This will install the new `jspdf` package needed for PDF generation.

### Step 4: Start the Backend

```bash
cd SakhiCircle/backend
.venv\Scripts\activate  # Activate virtual environment
python main.py
```

**Backend will be running at:** `http://localhost:8000`

Check the console output - you should see:
```
✅ Connected to MongoDB successfully!
✅ Model and SHAP explainer loaded successfully!
✅ API Ready at http://localhost:8000
```

> **Note:** If you see "MongoDB connection failed", the app will still work but loan requests won't be saved.

### Step 5: Start the Frontend

Open a **NEW terminal** window:

```bash
cd SakhiCircle/frontend
npm run dev
```

**Frontend will be running at:** `http://localhost:5173` (or another port if 5173 is busy)

---

## 🎯 How to Use the Application

### 1️⃣ Landing Page
- Open `http://localhost:5173` in your browser
- You'll see two login options:
  - **SHG User Login** - For Self-Help Groups to apply for loans
  - **Bank Manager Login** - For managers to review applications

### 2️⃣ SHG User Workflow

1. Click "SHG User Login"
2. Fill in your SHG details:
   - SHG Name (required)
   - Contact (phone/email) (required)
3. Adjust financial metrics:
   - Monthly Savings per Member (₹100 - ₹5,000)
   - Meeting Attendance Rate (0% - 100%)
   - Loan Repayment Rate (0% - 100%)
4. Click **"Calculate Credit Score"**
5. View your score and SHAP explanation
6. Click **"Submit Loan Request"** to send to bank for review

### 3️⃣ Bank Manager Workflow

1. Click "Bank Manager Login"
2. View the table of **Pending Loan Requests**
3. Click **"Review"** on any request to see details:
   - SHG information
   - Financial metrics
   - Credit score analysis
   - SHAP waterfall chart explanation
4. Make a decision:
   - Click **"Approve"** to approve the loan
   - Click **"Reject"** to reject the loan
5. Click **"Download PDF"** to generate a professional report

---

## 🔌 API Endpoints Reference

### New Endpoints Added:

#### `POST /submit_request`
Submit a loan request from SHG user.

**Request Body:**
```json
{
  "shg_name": "Women's Empowerment Group",
  "contact": "9876543210",
  "savings": 2500,
  "attendance": 85,
  "repayment": 75,
  "score": 78,
  "risk": "Low Risk ✅",
  "explanation_image": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loan request submitted successfully",
  "request_id": "507f1f77bcf86cd799439011"
}
```

#### `GET /get_requests?status=Pending`
Get loan requests for Bank Manager (optional status filter).

**Response:**
```json
{
  "requests": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "shg_name": "Women's Empowerment Group",
      "contact": "9876543210",
      "score": 78,
      "risk": "Low Risk ✅",
      "status": "Pending",
      "submitted_at": "2026-01-08T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

#### `POST /update_status`
Update loan request status (Approve/Reject).

**Request Body:**
```json
{
  "request_id": "507f1f77bcf86cd799439011",
  "status": "Approved",
  "manager_notes": "Excellent credit profile"
}
```

---

## 🗄️ Database Collections

The app uses two MongoDB collections:

1. **`shg_logs`** - Prediction history (existing)
2. **`loan_requests`** - Loan applications (new)

### Loan Request Document Structure:
```javascript
{
  _id: ObjectId("..."),
  shg_name: "Women's Empowerment Group",
  contact: "9876543210",
  savings: 2500,
  attendance: 85,
  repayment: 75,
  score: 78,
  risk: "Low Risk ✅",
  explanation_image: "data:image/png;base64,...",
  status: "Pending",  // Pending | Approved | Rejected
  submitted_at: "2026-01-08T10:30:00.000Z",
  updated_at: "2026-01-08T10:30:00.000Z",
  manager_notes: ""
}
```

---

## 🐛 Troubleshooting

### "Database not connected" Error
- **Check MongoDB is running:** Open MongoDB Compass or run `mongosh` in terminal
- **Check connection string:** Verify MONGO_URI environment variable
- **Temporary workaround:** The app works without MongoDB, but loan requests won't be saved

### "Failed to fetch requests" in Manager View
- Ensure MongoDB is connected and running
- Check backend console for MongoDB connection status
- Try refreshing the page

### PDF Download Not Working
- Ensure `jspdf` is installed: `npm list jspdf`
- If missing, run: `npm install jspdf`
- Check browser console for errors

### Port Already in Use
- **Backend:** Change port in `main.py` or use different port:
  ```bash
  uvicorn main:app --port 8001
  ```
- **Frontend:** Vite will auto-assign different port if 5173 is busy

---

## 📦 Dependencies Summary

### Backend (Python):
```
fastapi
uvicorn
pydantic
pymongo  ← Used for MongoDB
scikit-learn
shap
numpy
pandas
matplotlib
```

### Frontend (Node.js):
```
react
react-dom
axios
lucide-react
jspdf  ← NEW: For PDF generation
vite
tailwindcss
```

---

## 🔄 Git Workflow for Team

### Pushing Your Changes:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

### Pulling Latest Changes:
```bash
git pull origin main

# Then update dependencies:
cd SakhiCircle/backend
pip install -r requirements.txt

cd ../frontend
npm install
```

---

## 📸 Features Walkthrough

### 1. Landing Page
- Two role options with animated cards
- Gradient background with glass morphism design

### 2. SHG User Dashboard
- Form to enter SHG name and contact
- Interactive sliders for financial metrics
- Real-time credit score calculation
- SHAP explanation visualization
- One-click loan request submission

### 3. Bank Manager Dashboard
- Table view of all pending requests
- Filter by status (Pending/Approved/Rejected)
- Detailed request review page
- SHAP chart for AI transparency
- Approve/Reject with one click
- PDF report generation

---

## 🎓 Testing the Full Flow

1. **Start both servers** (backend + frontend)
2. **As SHG User:**
   - Enter: "Women Cooperative" + "9876543210"
   - Set: Savings=3000, Attendance=90, Repayment=80
   - Calculate Score
   - Submit Loan Request
3. **Switch to Manager View:**
   - Logout and choose "Bank Manager Login"
   - See your request in the table
   - Click "Review"
   - Download PDF report
   - Approve or Reject

---

## ✅ Success Checklist

- [ ] MongoDB is running and connected
- [ ] Backend started successfully on port 8000
- [ ] Frontend running on port 5173
- [ ] Can access landing page
- [ ] Can submit loan request as SHG user
- [ ] Can view requests as manager
- [ ] Can approve/reject requests
- [ ] PDF download works

---

## 📞 Support

If you encounter issues:
1. Check the console output of backend and frontend
2. Verify MongoDB connection
3. Ensure all dependencies are installed
4. Try restarting both servers

---

## 🎉 Congratulations!

You now have a fully functional role-based loan management system with:
- ✅ User authentication (role-based)
- ✅ Credit scoring with AI
- ✅ Loan request workflow
- ✅ Manager approval system
- ✅ PDF report generation
- ✅ MongoDB persistence

Happy coding! 🚀
