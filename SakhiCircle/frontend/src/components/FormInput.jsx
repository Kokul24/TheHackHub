function FormInput({ 
  label, 
  icon, 
  value, 
  onChange, 
  min, 
  max, 
  step, 
  unit, 
  description,
  color = 'blue' 
}) {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-500/50',
      text: 'text-blue-400'
    },
    emerald: {
      gradient: 'from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-500/50',
      text: 'text-emerald-400'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      glow: 'shadow-purple-500/50',
      text: 'text-purple-400'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} ${colors.glow} shadow-lg`}>
            {icon}
          </div>
          <div>
            <label className="font-semibold text-white text-sm">{label}</label>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>
        <div className="glass-light px-4 py-2 rounded-xl">
          <span className={`font-bold ${colors.text} text-lg`}>
            {unit === '₹' ? `${unit}${value.toLocaleString()}` : `${value}${unit}`}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-slate-700/50 rounded-full -translate-y-1/2 pointer-events-none overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${colors.gradient}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{unit === '₹' ? `₹${min}` : `${min}${unit}`}</span>
        <span>{unit === '₹' ? `₹${max.toLocaleString()}` : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

export default FormInput;
