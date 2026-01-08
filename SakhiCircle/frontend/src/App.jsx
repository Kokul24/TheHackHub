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
  ArrowLeft,
  Lock,
  Mail,
  User,
  KeyRound,
  Shield,
  UserPlus,
  Trash2,
  RefreshCw,
  CheckSquare,
  XSquare,
  Settings
} from 'lucide-react';
import FormInput from './components/FormInput';
import ScoreCard from './components/ScoreCard';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:8000';

// ==================== AUTH HELPER ====================
const getAuthHeaders = () => {
  const token = localStorage.getItem('sakhiToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==================== LOGIN PAGE ====================
function LoginPage({ onLoginSuccess, onShowRegister }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        username: formData.username,
        password: formData.password
      });

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('sakhiToken', response.data.token);
        localStorage.setItem('sakhiUser', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user, response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8 wave-1">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">SakhiScore</h1>
          <p className="text-slate-400">AI-Powered Credit Scoring for Self-Help Groups</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8 wave-2">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Login</h2>
            <p className="text-slate-400 text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Username
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <button 
                onClick={onShowRegister}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Register here
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center wave-3">
          <p className="text-xs text-slate-500">
            Powered by AI & Explainable Machine Learning (SHAP)
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== REGISTRATION PAGE ====================
function RegisterPage({ onRegisterSuccess, onShowLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    shg_name: '',
    role: 'user',
    contact: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register`, {
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        shg_name: formData.shg_name,
        role: formData.role,
        contact: formData.contact
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setTimeout(() => {
          onShowLogin();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Join SakhiScore</h1>
          <p className="text-slate-400 text-sm">Register as SHG Representative or Member</p>
        </div>

        {/* Register Card */}
        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                I am registering as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    formData.role === 'admin'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Settings className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-sm font-semibold">SHG Representative</p>
                  <p className="text-xs opacity-70">Calculate scores</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    formData.role === 'user'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <UserCircle className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-sm font-semibold">SHG Member</p>
                  <p className="text-xs opacity-70">Apply for loans</p>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* SHG Group Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">SHG Group Name</label>
              <input
                type="text"
                name="shg_name"
                value={formData.shg_name}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g., Shakti Mahila SHG"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.role === 'admin' 
                  ? 'You will manage this group\'s credit score'
                  : 'You will use this group\'s credit score to apply for loans'
                }
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Choose a username"
                required
                minLength={3}
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Password"
                  required
                  minLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Confirm</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Confirm"
                  required
                />
              </div>
            </div>

            {/* Contact (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Contact (Optional)</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Phone or email"
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  <span>Register</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <button 
                onClick={onShowLogin}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SHG GROUP DASHBOARD (Admin = SHG Representative) ====================
function AdminPanel({ user, onLogout }) {
  // Admin represents an SHG group - they update group financial details
  const [groupData, setGroupData] = useState({
    savings: 2500,
    attendance: 85,
    repayment: 75
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    try {
      // Fetch group's saved financial data
      const response = await axios.get(`${API_URL}/shg/group_data`, {
        headers: getAuthHeaders()
      });
      if (response.data.group_data) {
        setGroupData({
          savings: response.data.group_data.savings || 2500,
          attendance: response.data.group_data.attendance || 85,
          repayment: response.data.group_data.repayment || 75
        });
        if (response.data.group_data.score) {
          setResult({
            score: response.data.group_data.score,
            risk: response.data.group_data.risk
          });
        }
      }
      if (response.data.members) {
        setGroupMembers(response.data.members);
      }
      if (response.data.loan_requests) {
        setLoanRequests(response.data.loan_requests);
      }
    } catch (err) {
      console.error('Failed to fetch group data:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setGroupData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculateScore = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate score');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroupData = async () => {
    if (!result) {
      setError('Please calculate your credit score first');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Save current group data
      await axios.post(`${API_URL}/shg/update_group_data`, {
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment,
        score: result.score,
        risk: result.risk
      }, {
        headers: getAuthHeaders()
      });

      // Log to score history (append, don't replace)
      await axios.post(`${API_URL}/score/log`, {
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment,
        score: result.score,
        risk: result.risk
      }, {
        headers: getAuthHeaders()
      });

      setSuccess('Score saved and logged to history! Members can now apply for loans. Managers will see your financial trend.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save group data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{user?.shg_name || 'SHG Group'}</h1>
              <p className="text-xs text-slate-400">Group Dashboard • Update Financial Details</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Welcome, {user?.full_name}</span>
            <button
              onClick={onLogout}
              className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Alerts */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-emerald-400">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Info Banner */}
          <div className="glass rounded-2xl p-6 mb-6 border border-blue-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Settings className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">SHG Group Representative</h2>
                <p className="text-slate-400 text-sm">
                  As the group representative, you can update your SHG's financial metrics. 
                  Once you save, all group members can apply for loans using this credit score.
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Financial Metrics Input */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 hover-lift">
                <h2 className="text-lg font-bold text-white mb-6">Update Group Financial Metrics</h2>
                <form onSubmit={handleCalculateScore} className="space-y-6">
                  <FormInput
                    label="Monthly Savings per Member"
                    icon={<IndianRupee className="h-5 w-5" />}
                    value={groupData.savings}
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
                    value={groupData.attendance}
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
                    value={groupData.repayment}
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

              {/* Loan Requests from Members */}
              {loanRequests.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Member Loan Requests</h3>
                  <div className="space-y-3">
                    {loanRequests.map((req, idx) => (
                      <div key={idx} className="glass-light rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{req.member_name}</p>
                          <p className="text-slate-400 text-sm">Score: {req.score}/100</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          req.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Score Display */}
            <div className="space-y-6">
              {result ? (
                <>
                  <ScoreCard result={result} formData={groupData} />
                  
                  {/* Save Button */}
                  <div className="glass rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Save Group Score</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Save this score so your group members can apply for loans. 
                      The manager will review their applications with this credit score.
                    </p>
                    <button
                      onClick={handleSaveGroupData}
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Save & Enable Loan Applications</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* SHAP Explanation */}
                  {result.explanation_image && (
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">AI Explanation</h3>
                      <div className="bg-slate-800/50 rounded-xl p-4">
                        <img 
                          src={result.explanation_image} 
                          alt="SHAP Explanation" 
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass rounded-2xl p-12 text-center">
                  <Activity className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Calculate Your Score</h3>
                  <p className="text-slate-400">
                    Enter your group's financial metrics and calculate the credit score.
                    Then save it so members can apply for loans.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MANAGER INBOX ====================
function ManagerInbox({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState([]);  // New: Historical scores
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Fetch score history when a request is selected
  useEffect(() => {
    if (selectedRequest?.shg_name) {
      fetchScoreHistory(selectedRequest.shg_name);
    }
  }, [selectedRequest]);

  const fetchScoreHistory = async (shgName) => {
    setLoadingHistory(true);
    try {
      console.log('Fetching score history for:', shgName);
      const response = await axios.get(`${API_URL}/score/history/${encodeURIComponent(shgName)}?limit=6`, {
        headers: getAuthHeaders()
      });
      console.log('Score history response:', response.data);
      const history = response.data.history || [];
      console.log('Score history entries:', history.length, history);
      setScoreHistory(history);
    } catch (err) {
      console.error('Failed to fetch score history:', err);
      setScoreHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/loan/all`, {
        headers: getAuthHeaders()
      });
      setRequests(response.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      // Fallback to legacy endpoint
      try {
        const fallback = await axios.get(`${API_URL}/get_requests?status=Pending`);
        setRequests(fallback.data.requests);
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    setUpdating(true);
    try {
      await axios.post(`${API_URL}/loan/update_status`, {
        request_id: requestId,
        status: status,
        manager_notes: `${status} by ${user?.full_name || 'manager'}`
      }, {
        headers: getAuthHeaders()
      });
      
      setRequests(prev => prev.filter(r => r._id !== requestId));
      setSelectedRequest(null);
    } catch (err) {
      // Fallback to legacy endpoint
      try {
        await axios.post(`${API_URL}/update_status`, {
          request_id: requestId,
          status: status,
          manager_notes: `${status} by ${user?.full_name || 'manager'}`
        });
        setRequests(prev => prev.filter(r => r._id !== requestId));
        setSelectedRequest(null);
      } catch (e) {
        alert('Failed to update status: ' + (e.response?.data?.detail || e.message));
      }
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
    doc.text('Current Credit Score Analysis', 20, 65);
    doc.setFontSize(10);
    doc.text(`Score: ${req.score}/100`, 20, 72);
    doc.text(`Risk Level: ${req.risk}`, 20, 78);

    // Metrics
    doc.text('Current Financial Metrics', 20, 90);
    doc.text(`Savings per Member: Rs.${req.savings}`, 20, 97);
    doc.text(`Attendance Rate: ${req.attendance}%`, 20, 103);
    doc.text(`Repayment Rate: ${req.repayment}%`, 20, 109);

    // 6-Month Performance History Table
    let yPos = 125;
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('6-Month Performance History', 20, yPos);
    yPos += 8;

    if (scoreHistory.length > 0) {
      // Table Header
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Month', 20, yPos);
      doc.text('Savings', 55, yPos);
      doc.text('Attendance', 85, yPos);
      doc.text('Repayment', 120, yPos);
      doc.text('Score', 155, yPos);
      doc.text('Risk', 175, yPos);
      
      yPos += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 5;

      // Table Data
      doc.setTextColor(0, 0, 0);
      scoreHistory.forEach((entry) => {
        doc.text(entry.month_label || 'N/A', 20, yPos);
        doc.text(`Rs.${entry.savings}`, 55, yPos);
        doc.text(`${entry.attendance}%`, 85, yPos);
        doc.text(`${entry.repayment}%`, 120, yPos);
        doc.text(`${entry.score}`, 155, yPos);
        doc.text(entry.risk?.includes('Low') ? 'Low' : 'High', 175, yPos);
        yPos += 6;
      });
      
      yPos += 5;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No historical data available', 20, yPos);
      yPos += 10;
    }

    // Reviewed by
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Reviewed by: ${user?.full_name || 'Bank Manager'}`, 20, yPos);
    yPos += 15;

    // SHAP Image (on new page if needed)
    if (req.explanation_image) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text('AI Explanation (SHAP Waterfall)', 20, yPos);
      yPos += 5;
      try {
        doc.addImage(req.explanation_image, 'PNG', 20, yPos, 170, 100);
      } catch (e) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('(Chart image unavailable)', 20, yPos + 10);
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

              {/* 6-Month Score History */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    6-Month Performance History
                  </h3>
                  {loadingHistory && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                </div>
                
                {scoreHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-400 font-semibold">Month</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Savings</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Attendance</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Repayment</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Score</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoreHistory.map((entry, idx) => (
                          <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-3 text-white font-medium">{entry.month_label}</td>
                            <td className="py-3 px-3 text-center text-emerald-400">₹{entry.savings}</td>
                            <td className="py-3 px-3 text-center text-blue-400">{entry.attendance}%</td>
                            <td className="py-3 px-3 text-center text-purple-400">{entry.repayment}%</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`font-bold ${entry.score >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {entry.score}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.score >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {entry.risk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No historical data available yet</p>
                    <p className="text-slate-500 text-xs">History builds as SHG Rep saves scores</p>
                  </div>
                )}
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
              <h1 className="text-lg font-bold text-white">Manager Inbox</h1>
              <p className="text-xs text-slate-400">Review & Approve Loan Requests</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Welcome, {user?.full_name}</span>
            <button onClick={onLogout} className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Pending Loan Requests</h2>
              <button
                onClick={fetchRequests}
                className="glass-light px-4 py-2 rounded-xl text-sm text-slate-300 hover-lift flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
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

// ==================== SHG MEMBER DASHBOARD (User) ====================
function SHGDashboard({ user, onLogout }) {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loanAmount, setLoanAmount] = useState(10000);
  const [loanPurpose, setLoanPurpose] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-dismiss success message after 5 seconds
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch group data (score calculated by admin/SHG representative)
      const groupResponse = await axios.get(`${API_URL}/shg/my_group_data`, {
        headers: getAuthHeaders()
      });
      setGroupData(groupResponse.data);

      // Fetch my loan requests
      const requestsResponse = await axios.get(`${API_URL}/loan/my_requests`, {
        headers: getAuthHeaders()
      });
      setMyRequests(requestsResponse.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyForLoan = async () => {
    if (!groupData?.score) {
      setError('Your SHG group has not calculated their credit score yet. Please contact your SHG representative.');
      return;
    }

    if (!loanPurpose.trim()) {
      setError('Please enter the purpose of your loan');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/loan/apply`, {
        group_id: user?.shg_name || 'Unknown',
        shg_name: user?.shg_name || 'Unknown',
        member_name: user?.full_name,
        contact: user?.contact || '',
        loan_amount: loanAmount,
        loan_purpose: loanPurpose,
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment,
        score: groupData.score,
        risk: groupData.risk,
        explanation_image: groupData.explanation_image
      }, {
        headers: getAuthHeaders()
      });

      setSuccess('Loan application submitted successfully! The manager will review your request.');
      setLoanPurpose('');
      setLoanAmount(10000);
      
      // Refresh data after a short delay to ensure backend has processed
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'Rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  // No longer blocking multiple applications
  // const hasPendingRequest = myRequests.some(r => r.status === 'Pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{user?.full_name}</h1>
              <p className="text-xs text-slate-400">{user?.shg_name} • SHG Member</p>
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
        <div className="max-w-5xl mx-auto">
          {/* Alerts */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-emerald-400">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
              <p className="text-slate-400 mt-4">Loading...</p>
            </div>
          ) : (
            <>
              {/* Group Credit Score Section */}
              <div className="glass rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4">Your SHG Group Credit Score</h2>
                
                {groupData?.score ? (
                  <div className="flex items-center gap-8">
                    <div className="flex-shrink-0">
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                        groupData.score >= 60 
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                          : 'bg-gradient-to-br from-red-500 to-orange-600'
                      }`}>
                        <span className="text-4xl font-bold text-white">{groupData.score}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-white mb-2">{groupData.risk}</p>
                      <p className="text-slate-400 mb-4">
                        This score was calculated by your SHG representative based on your group's financial performance.
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="glass-light rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">Savings</p>
                          <p className="text-lg font-bold text-emerald-400">₹{groupData.savings}</p>
                        </div>
                        <div className="glass-light rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">Attendance</p>
                          <p className="text-lg font-bold text-blue-400">{groupData.attendance}%</p>
                        </div>
                        <div className="glass-light rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">Repayment</p>
                          <p className="text-lg font-bold text-purple-400">{groupData.repayment}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">No Credit Score Available</p>
                    <p className="text-slate-400 text-sm">
                      Your SHG representative has not calculated the group's credit score yet.
                      Please contact them to update the group's financial details.
                    </p>
                  </div>
                )}
              </div>

              {/* My Loan Applications - Always visible with scrollable list */}
              <div className="glass rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">My Loan Applications ({myRequests.length})</h2>
                  <button
                    onClick={fetchData}
                    className="glass-light px-3 py-2 rounded-lg text-sm text-slate-300 hover-lift flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
                
                {myRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No loan applications yet. Submit your first application below!</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Purpose</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Score</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.map((req) => (
                          <tr key={req._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-4 px-4 text-white font-bold">₹{req.loan_amount?.toLocaleString() || 'N/A'}</td>
                            <td className="py-4 px-4 text-slate-300">{req.loan_purpose || req.shg_name}</td>
                            <td className="py-4 px-4 text-white">{req.score}/100</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(req.status)}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-400 text-sm">
                              {new Date(req.submitted_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Apply for Loan Section - Always visible if group has score */}
              {groupData?.score && (
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4">Apply for a Loan</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Based on your SHG group's credit score, you can apply for a loan. 
                    The bank manager will review your application.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Loan Amount (₹)</label>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        min={1000}
                        max={100000}
                        step={1000}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Purpose of Loan *</label>
                      <input
                        type="text"
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Business expansion, Education, Medical"
                        required
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleApplyForLoan}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        <span>Submit Loan Application</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // Check for saved user session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('sakhiToken');
    const savedUser = localStorage.getItem('sakhiUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`, {}, {
        headers: getAuthHeaders()
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('sakhiToken');
    localStorage.removeItem('sakhiUser');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Not logged in - show login or register page
  if (!user || !token) {
    if (showRegister) {
      return (
        <RegisterPage 
          onRegisterSuccess={() => setShowRegister(false)}
          onShowLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  // Redirect based on role
  switch (user.role) {
    case 'admin':
      return <AdminPanel user={user} onLogout={handleLogout} />;
    case 'manager':
      return <ManagerInbox user={user} onLogout={handleLogout} />;
    case 'user':
      return <SHGDashboard user={user} onLogout={handleLogout} />;
    default:
      // Unknown role - logout
      handleLogout();
      return (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
          onShowRegister={() => setShowRegister(true)}
        />
      );
  }
}

export default App;
