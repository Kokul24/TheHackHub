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
  Menu,
  X
} from 'lucide-react';
import FormInput from './components/FormInput';
import ScoreCard from './components/ScoreCard';

const API_URL = 'http://localhost:8000';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen glass border-r border-slate-700/50 transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700/50 wave-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold gradient-text">SakhiScore</h1>
                <p className="text-xs text-slate-400">AI Credit System</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Section */}
        {sidebarOpen && (
          <div className="p-6 border-b border-slate-700/50 wave-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Welcome back,</p>
                <p className="text-2xl font-bold text-white">Sakhi!</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">MONDAY, JANUARY 8</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-2 wave-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                item.active 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Upgrade Card */}
        {sidebarOpen && (
          <div className="mx-4 mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 wave-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-white" />
              <p className="text-sm font-semibold text-white">Activate Pro</p>
            </div>
            <p className="text-xs text-blue-100 mb-3">
              Elevate finances with AI
            </p>
            <button className="w-full bg-white text-blue-600 text-sm font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors">
              Upgrade Now
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="glass border-b border-slate-700/50 px-8 py-4 wave-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Month Selector */}
              <button className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-white">This Month</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 glass-light px-4 py-2 rounded-xl">
                <Search className="h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 w-48"
                />
              </div>

              {/* Notifications */}
              <button className="relative glass-light p-3 rounded-xl hover-lift">
                <Bell className="h-5 w-5 text-slate-400" />
                <span className="notification-badge"></span>
              </button>

              {/* Add Widget Button */}
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-xl flex items-center gap-2 hover-lift">
                <span className="text-sm font-semibold text-white">+ Add new Widget</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* AI Insights Card */}
            <div className="glass rounded-2xl p-6 hover-lift wave-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400">AI Insights</h3>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Score Volume</p>
                    <p className="text-lg font-bold text-white">
                      {result ? `+${result.score}%` : '+12%'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Your credit score has increased by {result ? result.score : '12'}% since last month
                </p>
              </div>
            </div>

            {/* Balance Overview */}
            <div className="glass rounded-2xl p-6 hover-lift wave-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">Balance Overview</h3>
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mb-1">
                <p className="text-3xl font-bold text-white">₹{formData.savings.toLocaleString()}</p>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    12%
                  </span>
                  <span className="text-slate-400">From last month</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
                <Activity className="h-3 w-3" />
                <span>{formData.attendance} transactions</span>
                <span>•</span>
                <span>12 categories</span>
              </div>
            </div>

            {/* Earnings */}
            <div className="glass rounded-2xl p-6 hover-lift wave-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">Earnings</h3>
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white">₹{(formData.savings * 1.2).toLocaleString()}</p>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  7%
                </span>
                <span className="text-slate-400">From last month</span>
              </div>
              
              {/* Mini Circular Progress */}
              <div className="mt-4 flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90" width="64" height="64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle 
                      cx="32" cy="32" r="28" fill="none" 
                      stroke="url(#gradient)" 
                      strokeWidth="6"
                      strokeDasharray={`${(formData.repayment / 100) * 176} 176`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{formData.repayment}%</span>
                  </div>
                </div>
                <div className="text-xs">
                  <p className="text-slate-400">Percentage</p>
                  <p className="text-white font-semibold">Current vs Month goal</p>
                </div>
              </div>
            </div>

            {/* Spending */}
            <div className="glass rounded-2xl p-6 hover-lift wave-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">Spending</h3>
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white">₹{(formData.savings * 0.4).toLocaleString()}</p>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="text-red-400 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" />
                  2%
                </span>
                <span className="text-slate-400">From last month</span>
              </div>

              {/* Category Pills */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Clothing', value: 34, icon: '👔' },
                  { label: 'Groceries', value: 16, icon: '🛒' },
                  { label: 'Pets', value: 8, icon: '🐾' },
                  { label: 'Bills', value: 6, icon: '💡' }
                ].map((cat, idx) => (
                  <div key={idx} className="glass-light rounded-lg px-2 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{cat.icon}</span>
                      <span className="text-xs text-slate-300">{cat.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Transactions/Form */}
            <div className="space-y-6">
              {/* SHG Metrics Card */}
              <div className="glass rounded-2xl p-6 hover-lift wave-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">SHG Financial Metrics</h2>
                    <p className="text-sm text-slate-400 mt-1">Adjust metrics to calculate credit score</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-blue-400" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormInput
                    label="Monthly Savings per Member"
                    icon={<IndianRupee className="h-5 w-5" />}
                    value={formData.savings}
                    onChange={(value) => handleInputChange('savings', value)}
                    min={100}
                    max={5000}
                    step={100}
                    unit="₹"
                    description="Average monthly savings contribution"
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
                    description="Member attendance percentage"
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
                    description="On-time repayment rate"
                    color="purple"
                  />

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-300">Error</p>
                        <p className="text-sm text-red-400 mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          <span>Calculate Score</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleReset}
                      className="glass-light text-slate-300 font-semibold py-3 px-6 rounded-xl hover-lift"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column - Score Results */}
            <div className="wave-7">
              <ScoreCard result={result} loading={loading} formData={formData} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
