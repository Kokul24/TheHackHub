import { useState } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  PieChart,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Calendar,
  IndianRupee,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity,
  CreditCard,
  AlertCircle,
  Loader2,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import FormInput from './components/FormInput';
import ScoreCard from './components/ScoreCard';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [formData, setFormData] = useState({
    savings: 2500,
    attendance: 85,
    repayment: 75
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      setResult(response.data);
    } catch (err) {
      console.error('Prediction error:', err);
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend is running on port 8000.');
      } else if (err.response?.status === 503) {
        setError('Model not loaded. Please run model_trainer.py first.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to get prediction. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      savings: 2500,
      attendance: 85,
      repayment: 75
    });
    setResult(null);
    setError(null);
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Activity, label: 'Sakhi AI', active: false },
    { icon: Wallet, label: 'Accounts', active: false },
    { icon: TrendingUp, label: 'Transactions', active: false },
    { icon: FileText, label: 'Reports', active: false },
    { icon: PieChart, label: 'Investments', active: false },
    { icon: CreditCard, label: 'Loans', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Sakhi-Score
                </h1>
                <p className="text-blue-100 text-sm mt-0.5">
                  AI-Powered Credit Scoring for Self-Help Groups
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-200" />
                <span className="text-blue-100">SHG Dashboard</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span>Explainable AI</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900">How Sakhi-Score Works</h3>
            <p className="text-sm text-blue-700 mt-1">
              Enter your Self-Help Group's financial metrics below. Our AI model analyzes 
              savings, attendance, and loan repayment patterns to generate a credit score 
              from 0-100, with a visual explanation of what factors influenced the result.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Input Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                SHG Financial Metrics
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Adjust the sliders to input your group's data
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Savings Input */}
              <FormInput
                label="Monthly Savings per Member"
                icon={<IndianRupee className="h-5 w-5" />}
                value={formData.savings}
                onChange={(value) => handleInputChange('savings', value)}
                min={100}
                max={5000}
                step={100}
                unit="₹"
                description="Average monthly savings contribution per member"
                color="emerald"
              />

              {/* Attendance Input */}
              <FormInput
                label="Meeting Attendance Rate"
                icon={<Calendar className="h-5 w-5" />}
                value={formData.attendance}
                onChange={(value) => handleInputChange('attendance', value)}
                min={0}
                max={100}
                step={1}
                unit="%"
                description="Percentage of members attending regular meetings"
                color="blue"
              />

              {/* Repayment Input */}
              <FormInput
                label="Internal Loan Repayment Rate"
                icon={<Wallet className="h-5 w-5" />}
                value={formData.repayment}
                onChange={(value) => handleInputChange('repayment', value)}
                min={0}
                max={100}
                step={1}
                unit="%"
                description="On-time repayment rate for internal loans"
                color="purple"
              />

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Calculate Score
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {/* Score Card */}
            <ScoreCard result={result} loading={loading} />

            {/* SHAP Explanation */}
            {result?.explanation_image && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fadeIn">
                <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    AI Explanation (SHAP Analysis)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    See how each factor contributed to your score
                  </p>
                </div>
                <div className="p-4">
                  <img 
                    src={result.explanation_image} 
                    alt="SHAP Waterfall Explanation" 
                    className="w-full rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        {result && (
          <div className="mt-8 grid md:grid-cols-3 gap-4 animate-fadeIn">
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Savings/Member</p>
                  <p className="text-xl font-bold text-gray-800">
                    ₹{result.features?.savings_per_member?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                  <p className="text-xl font-bold text-gray-800">
                    {result.features?.attendance_rate}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Repayment Rate</p>
                  <p className="text-xl font-bold text-gray-800">
                    {result.features?.loan_repayment_rate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 mt-12 pt-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-500">
          Built with ❤️ for Rural India | Sakhi-Score © 2026 | FinTech Hackathon Project
        </p>
      </footer>
    </div>
  );
}

export default App;
