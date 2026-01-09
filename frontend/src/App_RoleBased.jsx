import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard,
  TrendingUp, 
  Wallet,
  FileText,
  IndianRupee,
  Users,
  Sparkles,
  Activity,
  CreditCard,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  FileDown,
  LogOut,
  UserCircle,
  Building2,
  Clock,
  Eye,
  ArrowLeft
} from 'lucide-react';
import FormInput from './components/FormInput';
import ScoreCard from './components/ScoreCard';
import jsPDF from 'jspdf';

// Use Vite environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL;

function LandingPage({ onRoleSelect }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 wave-1">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold gradient-text mb-4">SakhiScore</h1>
          <p className="text-xl text-slate-400">AI-Powered Credit Scoring for Self-Help Groups</p>
          <p className="text-sm text-slate-500 mt-2">Choose your login type to continue</p>
        </div>

        {/* Login Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* SHG User Login */}
          <button
            onClick={() => onRoleSelect('shg_user')}
            className="glass rounded-2xl p-8 hover-lift wave-2 text-left group"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">SHG User Login</h2>
            <p className="text-slate-400 mb-4">
              Apply for credit scoring and submit loan requests for your Self-Help Group
            </p>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-sm font-semibold">Access Dashboard</span>
              <TrendingUp className="h-4 w-4" />
            </div>
          </button>

          {/* Bank Manager Login */}
          <button
            onClick={() => onRoleSelect('manager')}
            className="glass rounded-2xl p-8 hover-lift wave-3 text-left group"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Bank Manager Login</h2>
            <p className="text-slate-400 mb-4">
              Review loan requests, analyze credit scores, and approve or reject applications
            </p>
            <div className="flex items-center gap-2 text-purple-400">
              <span className="text-sm font-semibold">Manage Requests</span>
              <FileText className="h-4 w-4" />
            </div>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center wave-4">
          <p className="text-xs text-slate-500">
            Powered by AI & Explainable Machine Learning (SHAP)
          </p>
        </div>
      </div>
    </div>
  );
}

function SHGUserView({ onLogout }) {
  const [formData, setFormData] = useState({
    shgName: '',
    contact: '',
    savings: 2500,
    attendance: 85,
    repayment: 75
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculateScore = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        savings: formData.savings,
        attendance: formData.attendance,
        repayment: formData.repayment
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate score');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLoanRequest = async () => {
    if (!formData.shgName || !formData.contact) {
      setError('Please fill in SHG name and contact details');
      return;
    }

    if (!result) {
      setError('Please calculate your credit score first');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/submit_request`, {
        shg_name: formData.shgName,
        contact: formData.contact,
        savings: formData.savings,
        attendance: formData.attendance,
        repayment: formData.repayment,
        score: result.score,
        risk: result.risk,
        explanation_image: result.explanation_image
      });

      setSuccess('Loan request submitted successfully! Bank will review soon.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 px-8 py-4 wave-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">SHG User Dashboard</h1>
              <p className="text-xs text-slate-400">Apply for credit scoring</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
          {/* Left: Input Form */}
          <div className="space-y-6">
            {/* SHG Details */}
            <div className="glass rounded-2xl p-6 hover-lift wave-2">
              <h2 className="text-lg font-bold text-white mb-4">SHG Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    SHG Name *
                  </label>
                  <input
                    type="text"
                    value={formData.shgName}
                    onChange={(e) => handleInputChange('shgName', e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter your SHG name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Contact (Phone/Email) *
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => handleInputChange('contact', e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Phone or email"
                  />
                </div>
              </div>
            </div>

            {/* Metrics Input */}
            <div className="glass rounded-2xl p-6 hover-lift wave-3">
              <h2 className="text-lg font-bold text-white mb-6">Financial Metrics</h2>
              <form onSubmit={handleCalculateScore} className="space-y-6">
                <FormInput
                  label="Monthly Savings per Member"
                  icon={<IndianRupee className="h-5 w-5" />}
                  value={formData.savings}
                  onChange={(value) => handleInputChange('savings', value)}
                  min={100}
                  max={5000}
                  step={100}
                  unit="₹"
                  color="emerald"
                />

                <FormInput
                  label="Meeting Attendance Rate"
                  icon={<Calendar className="h-5 w-5" />}
                  value={formData.attendance}
                  onChange={(value) => handleInputChange('attendance', value)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  color="blue"
                />

                <FormInput
                  label="Loan Repayment Rate"
                  icon={<Wallet className="h-5 w-5" />}
                  value={formData.repayment}
                  onChange={(value) => handleInputChange('repayment', value)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  color="purple"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Calculate Credit Score</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            <div className="wave-4">
              <ScoreCard result={result} loading={loading} formData={formData} />
            </div>

            {/* Submit Loan Request */}
            {result && (
              <div className="glass rounded-2xl p-6 hover-lift wave-5">
                <h3 className="text-lg font-bold text-white mb-4">Submit Loan Request</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Ready to apply? Submit your request to the bank for review.
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 mb-4">
                    <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-emerald-400">{success}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmitLoanRequest}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      <span>Submit Loan Request</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MANAGER VIEW ====================
function ManagerView({ onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/get_requests?status=Pending`);
      setRequests(response.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    setUpdating(true);
    try {
      await axios.post(`${API_URL}/update_status`, {
        request_id: requestId,
        status: status,
        manager_notes: `${status} by manager`
      });
      
      // Remove from list or refresh
      setRequests(prev => prev.filter(r => r._id !== requestId));
      setSelectedRequest(null);
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUpdating(false);
    }
  };

  const downloadPDF = () => {
    if (!selectedRequest) return;

    const doc = new jsPDF();
    const req = selectedRequest;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('SakhiScore - Loan Request Report', 20, 20);

    // Line separator
    doc.setDrawColor(203, 213, 225);
    doc.line(20, 25, 190, 25);

    // SHG Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('SHG Information', 20, 35);
    doc.setFontSize(10);
    doc.text(`Name: ${req.shg_name}`, 20, 42);
    doc.text(`Contact: ${req.contact}`, 20, 48);
    doc.text(`Submitted: ${new Date(req.submitted_at).toLocaleString()}`, 20, 54);

    // Credit Score
    doc.setFontSize(12);
    doc.text('Credit Score Analysis', 20, 65);
    doc.setFontSize(10);
    doc.text(`Score: ${req.score}/100`, 20, 72);
    doc.text(`Risk Level: ${req.risk}`, 20, 78);

    // Metrics
    doc.text('Financial Metrics', 20, 90);
    doc.text(`Savings per Member: ₹${req.savings}`, 20, 97);
    doc.text(`Attendance Rate: ${req.attendance}%`, 20, 103);
    doc.text(`Repayment Rate: ${req.repayment}%`, 20, 109);

    // SHAP Image
    if (req.explanation_image) {
      doc.text('SHAP Explanation Chart', 20, 120);
      try {
        doc.addImage(req.explanation_image, 'PNG', 20, 125, 170, 100);
      } catch (e) {
        doc.text('(Chart image unavailable)', 20, 130);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by SakhiScore AI System', 20, 280);
    doc.text(`Report Date: ${new Date().toLocaleString()}`, 20, 285);

    doc.save(`loan-request-${req.shg_name.replace(/\s+/g, '-')}.pdf`);
  };

  if (selectedRequest) {
    // Detail View
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="glass border-b border-slate-700/50 px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedRequest(null)}
              className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to List</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadPDF}
                className="bg-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-white"
              >
                <FileDown className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
              <button onClick={onLogout} className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Request Details */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">{selectedRequest.shg_name}</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-300">
                    <UserCircle className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Contact</p>
                      <p className="font-medium">{selectedRequest.contact}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-300">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Submitted</p>
                      <p className="font-medium">{new Date(selectedRequest.submitted_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 my-4"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Savings/Member</p>
                      <p className="text-lg font-bold text-emerald-400">₹{selectedRequest.savings}</p>
                    </div>
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Attendance</p>
                      <p className="text-lg font-bold text-blue-400">{selectedRequest.attendance}%</p>
                    </div>
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Repayment</p>
                      <p className="text-lg font-bold text-purple-400">{selectedRequest.repayment}%</p>
                    </div>
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Credit Score</p>
                      <p className="text-lg font-bold text-white">{selectedRequest.score}/100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Decision</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest._id, 'Approved')}
                    disabled={updating}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest._id, 'Rejected')}
                    disabled={updating}
                    className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Score & SHAP */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Credit Score & AI Explanation</h3>
              
              {/* Score Display */}
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                  <span className="text-4xl font-bold text-white">{selectedRequest.score}</span>
                </div>
                <p className="text-xl font-bold text-white">{selectedRequest.risk}</p>
              </div>

              {/* SHAP Image */}
              {selectedRequest.explanation_image && (
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-3">SHAP Waterfall Explanation</p>
                  <img 
                    src={selectedRequest.explanation_image} 
                    alt="SHAP Explanation" 
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="glass border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Bank Manager Dashboard</h1>
              <p className="text-xs text-slate-400">Review pending loan requests</p>
            </div>
          </div>
          <button onClick={onLogout} className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Pending Loan Requests</h2>
              <button
                onClick={fetchRequests}
                className="glass-light px-4 py-2 rounded-xl text-sm text-slate-300 hover-lift"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
                <p className="text-slate-400 mt-4">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No pending requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">SHG Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Score</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Risk</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Submitted</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-4 px-4 text-white font-medium">{req.shg_name}</td>
                        <td className="py-4 px-4 text-slate-300">{req.contact}</td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-white">{req.score}</span>
                          <span className="text-slate-400">/100</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            req.score >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {req.risk}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400 text-sm">
                          {new Date(req.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="glass-light px-4 py-2 rounded-lg flex items-center gap-2 hover-lift text-blue-400"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleRoleSelect = (role) => {
    setCurrentUser(role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LandingPage onRoleSelect={handleRoleSelect} />;
  }

  if (currentUser === 'shg_user') {
    return <SHGUserView onLogout={handleLogout} />;
  }

  if (currentUser === 'manager') {
    return <ManagerView onLogout={handleLogout} />;
  }

  return null;
}

export default App;
