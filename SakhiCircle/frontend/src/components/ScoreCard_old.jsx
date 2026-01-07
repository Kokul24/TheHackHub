/**
 * ScoreCard Component
 * Displays the credit score with visual gauge and risk status
 */

import { CheckCircle2, AlertTriangle, Shield, TrendingUp } from 'lucide-react';

function ScoreCard({ result, loading }) {
  // Calculate the stroke-dashoffset for the circular progress
  const getStrokeDashoffset = (score) => {
    const circumference = 2 * Math.PI * 45; // radius = 45
    return circumference - (score / 100) * circumference;
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return { stroke: '#22c55e', bg: 'bg-green-50', text: 'text-green-600' };
    if (score >= 60) return { stroke: '#84cc16', bg: 'bg-lime-50', text: 'text-lime-600' };
    if (score >= 40) return { stroke: '#eab308', bg: 'bg-yellow-50', text: 'text-yellow-600' };
    return { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-600' };
  };

  // If no result yet, show placeholder
  if (!result && !loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Credit Score Result
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-12 w-12 text-gray-300" />
          </div>
          <p className="text-gray-500">
            Enter your SHG metrics and click <span className="font-semibold text-blue-600">"Calculate Score"</span> to see results
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Credit Score Result
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="w-32 h-32 mx-auto mb-4 loading-shimmer rounded-full" />
          <div className="h-6 w-48 mx-auto loading-shimmer rounded-lg mb-2" />
          <div className="h-4 w-32 mx-auto loading-shimmer rounded-lg" />
        </div>
      </div>
    );
  }

  const colors = getScoreColor(result.score);
  const circumference = 2 * Math.PI * 45;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scaleIn">
      <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Credit Score Result
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Calculated at {new Date(result.timestamp).toLocaleTimeString()}
        </p>
      </div>

      <div className="p-8">
        {/* Score Circle */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <svg width="140" height="140" className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="70"
                cy="70"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              {/* Progress Circle */}
              <circle
                cx="70"
                cy="70"
                r="45"
                fill="none"
                stroke={colors.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={getStrokeDashoffset(result.score)}
                className="score-circle transition-all duration-1000"
              />
            </svg>
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${colors.text}`}>
                {result.score}
              </span>
              <span className="text-xs text-gray-400 font-medium">/ 100</span>
            </div>
          </div>
        </div>

        {/* Risk Status Badge */}
        <div className="text-center mb-6">
          {result.score >= 60 ? (
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-5 py-2.5 rounded-full font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              {result.risk}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-5 py-2.5 rounded-full font-semibold">
              <AlertTriangle className="h-5 w-5" />
              {result.risk}
            </div>
          )}
        </div>

        {/* Score Interpretation */}
        <div className={`${colors.bg} rounded-xl p-4`}>
          <h4 className={`font-semibold ${colors.text} mb-2`}>Score Interpretation</h4>
          <p className="text-sm text-gray-700">
            {result.score >= 80 && "Excellent! This SHG demonstrates outstanding financial discipline and is highly creditworthy."}
            {result.score >= 60 && result.score < 80 && "Good performance. This SHG shows reliable financial behavior and qualifies for credit facilities."}
            {result.score >= 40 && result.score < 60 && "Moderate risk. Some improvement needed in savings, attendance, or loan repayment."}
            {result.score < 40 && "High risk profile. This SHG needs significant improvement before qualifying for credit."}
          </p>
        </div>

        {/* Low Risk Probability */}
        {result.features?.low_risk_probability && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Model Confidence: <span className="font-semibold text-gray-700">{(result.features.low_risk_probability * 100).toFixed(1)}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoreCard;
