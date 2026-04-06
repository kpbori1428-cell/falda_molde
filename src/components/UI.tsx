import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function CollapsibleSection({ title, icon, defaultOpen = true, children, accentColor = 'text-neutral-500', action }: { title: string, icon?: React.ReactNode, defaultOpen?: boolean, children: React.ReactNode, accentColor?: string, action?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 group"
      >
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${accentColor}`}>
          {icon}
          {title}
        </div>
        <div className="flex items-center gap-1">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronDown className={`w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
        </div>
      </button>
      {isOpen && <div className="flex flex-col gap-3 pb-2">{children}</div>}
    </div>
  );
}

export function ControlInput({ label, value, setValue, min, max, step = 1, unit = "", accentColor = "accent-white" }: any) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setValue(val);
    } else if (e.target.value === '') {
      setValue('');
    }
  };

  const handleBlur = () => {
    if (value === '' || isNaN(value)) {
      setValue(min);
    } else if (value < min) {
      setValue(min);
    } else if (value > max) {
      setValue(max);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-neutral-400">{label}</label>
        <div className="flex items-center gap-1">
          <input 
            type="number" 
            min={min} max={max} step={step}
            value={value} 
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-16 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 text-right"
          />
          {unit && <span className="text-xs text-neutral-500 w-4">{unit}</span>}
        </div>
      </div>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={value === '' ? min : value} 
        onChange={handleChange} 
        className={`w-full ${accentColor} h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer`} 
      />
    </div>
  );
}
