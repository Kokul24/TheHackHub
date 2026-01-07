/**
 * FormInput Component
 * Slider input with label, value display, and description
 */

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
  // Color variants
  const colorClasses = {
    blue: {
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      valueBg: 'bg-blue-50',
      valueText: 'text-blue-700',
      sliderAccent: 'accent-blue-600'
    },
    emerald: {
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
      valueBg: 'bg-emerald-50',
      valueText: 'text-emerald-700',
      sliderAccent: 'accent-emerald-600'
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      valueBg: 'bg-purple-50',
      valueText: 'text-purple-700',
      sliderAccent: 'accent-purple-600'
    },
    amber: {
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      valueBg: 'bg-amber-50',
      valueText: 'text-amber-700',
      sliderAccent: 'accent-amber-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  // Calculate percentage for visual feedback
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`p-2 rounded-lg ${colors.iconBg} ${colors.iconText}`}>
            {icon}
          </span>
          <label className="font-medium text-gray-700">{label}</label>
        </div>
        <div className={`px-3 py-1.5 rounded-lg ${colors.valueBg}`}>
          <span className={`font-bold ${colors.valueText}`}>
            {unit === '₹' ? `${unit}${value.toLocaleString()}` : `${value}${unit}`}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-200 rounded-full -translate-y-1/2 pointer-events-none">
          <div 
            className={`h-full rounded-full transition-all duration-150`}
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color === 'emerald' ? '#10b981' : 
                             color === 'purple' ? '#8b5cf6' : 
                             color === 'amber' ? '#f59e0b' : '#3b82f6'
            }}
          />
        </div>
        
        {/* Range Input */}
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
          style={{ 
            '--slider-thumb-bg': color === 'emerald' ? '#10b981' : 
                                color === 'purple' ? '#8b5cf6' : 
                                color === 'amber' ? '#f59e0b' : '#3b82f6'
          }}
        />
      </div>

      {/* Range Labels */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{unit === '₹' ? `${unit}${min.toLocaleString()}` : `${min}${unit}`}</span>
        <span>{unit === '₹' ? `${unit}${max.toLocaleString()}` : `${max}${unit}`}</span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-500 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export default FormInput;
