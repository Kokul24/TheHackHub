import { Shield, TrendingUp, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

function ScoreCard({ result, loading, formData }) {
  const getStrokeDashoffset = (score) => {
    const circumference = 2 * Math.PI * 70;
    return circumference - (score / 100) * circumference;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { 
      gradient: 'from-emerald-500 to-green-500', 
      glow: 'shadow-emerald-500/50',
      text: 'text-emerald-400',
      ring: 'ring-emerald-500/30'
    };
    if (score >= 60) return { 
      gradient: 'from-blue-500 to-cyan-500', 
      glow: 'shadow-blue-500/50',
      text: 'text-blue-400',
      ring: 'ring-blue-500/30'
    };
    if (score >= 40) return { 
      gradient: 'from-yellow-500 to-orange-500', 
      glow: 'shadow-yellow-500/50',
      text: 'text-yellow-400',
      ring: 'ring-yellow-500/30'
    };
    return { 
      gradient: 'from-red-500 to-pink-500', 
      glow: 'shadow-red-500/50',
      text: 'text-red-400',
      ring: 'ring-red-500/30'
    };
  };

  if (!result && !loading) {
    return (
      <div className="glass rounded-2xl p-8 hover-lift">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Credit Score Result</h3>
        </div>
        <div className="text-center py-12">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full glass-light flex items-center justify-center animate-float">
            <TrendingUp className="h-16 w-16 text-slate-600" />
          </div>
          <p className="text-slate-400">
            Adjust your SHG metrics and click{' '}
            <span className="font-semibold gradient-text">"Calculate Score"</span>
            {' '}to see results
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Credit Score Result</h3>
        </div>
        <div className="text-center py-12">
          <div className="w-32 h-32 mx-auto mb-6 loading-shimmer rounded-full" />
          <div className="h-6 w-48 mx-auto loading-shimmer rounded-lg mb-2" />
          <div className="h-4 w-32 mx-auto loading-shimmer rounded-lg" />
          <p className="text-slate-400 mt-4 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing with AI...
          </p>
        </div>
      </div>
    );
  }

  const colors = getScoreColor(result.score);
  const circumference = 2 * Math.PI * 70;

  return (
    <div className="glass rounded-2xl p-8 animate-scaleIn hover-lift">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-400" />
          <div>
            <h3 className="text-lg font-bold text-white">Credit Score Result</h3>
            <p className="text-xs text-slate-400">
              Calculated at {new Date(result.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
      </div>

      {/* Score Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <svg width="180" height="180" className="transform -rotate-90">
            <circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke="#334155"
              strokeWidth="12"
            />
            <circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={getStrokeDashoffset(result.score)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className={colors.gradient.split(' ')[0].replace('from-', '')} stopColor="#10b981" />
                <stop offset="100%" className={colors.gradient.split(' ')[1].replace('to-', '')} stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold text-white mb-1">{result.score}</p>
            <p className="text-sm text-slate-400">out of 100</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`flex items-center justify-center gap-2 mb-6 glass-light px-6 py-3 rounded-xl ring-2 ${colors.ring}`}>
        {result.score >= 70 ? (
          <CheckCircle2 className={`h-5 w-5 ${colors.text}`} />
        ) : (
          <AlertTriangle className={`h-5 w-5 ${colors.text}`} />
        )}
        <span className={`font-bold ${colors.text}`}>
          {result.score >= 80 ? 'Excellent Credit' :
           result.score >= 60 ? 'Good Credit' :
           result.score >= 40 ? 'Fair Credit' : 'Needs Improvement'}
        </span>
      </div>

      {/* Feature Importance */}
      {result.feature_importance && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Feature Impact Analysis
          </h4>
          
          {Object.entries(result.feature_importance)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
            .map(([feature, importance], idx) => {
              const absImportance = Math.abs(importance);
              const isPositive = importance > 0;
              
              return (
                <div key={feature} className="space-y-2" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 capitalize">
                      {feature.replace('_', ' ')}
                    </span>
                    <span className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
                      {isPositive ? '+' : ''}{importance.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isPositive 
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                          : 'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ 
                        width: `${absImportance}%`,
                        boxShadow: isPositive 
                          ? '0 0 10px rgba(16, 185, 129, 0.5)' 
                          : '0 0 10px rgba(239, 68, 68, 0.5)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="glass-light p-3 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Savings</p>
            <p className="text-lg font-bold text-white">₹{formData.savings}</p>
          </div>
          <div className="glass-light p-3 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Attendance</p>
            <p className="text-lg font-bold text-white">{formData.attendance}%</p>
          </div>
          <div className="glass-light p-3 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Repayment</p>
            <p className="text-lg font-bold text-white">{formData.repayment}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreCard;
