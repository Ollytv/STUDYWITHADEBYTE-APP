import { ReactNode } from 'react';

interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
  icon?: ReactNode;
  hint?: string;
}

export function Input({
  label, value, onChange, placeholder, type = 'text',
  required, className = '', icon, hint,
}: InputProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-body font-medium text-dark-300 uppercase tracking-wider">
          {label}{required && <span className="text-green-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`
            w-full bg-dark-700 border border-white/8 rounded-xl text-white font-body
            placeholder-dark-500 text-sm
            focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
            transition-all duration-200
            ${icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3'}
          `}
        />
      </div>
      {hint && <p className="text-xs text-dark-500 font-body">{hint}</p>}
    </div>
  );
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export function Select({ label, value, onChange, options, required, className = '' }: SelectProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-body font-medium text-dark-300 uppercase tracking-wider">
          {label}{required && <span className="text-green-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="
          w-full bg-dark-700 border border-white/8 rounded-xl text-white font-body
          text-sm px-4 py-3
          focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
          transition-all duration-200 appearance-none cursor-pointer
        "
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-dark-800">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, className = '' }: TextAreaProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-body font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="
          w-full bg-dark-700 border border-white/8 rounded-xl text-white font-body
          placeholder-dark-500 text-sm px-4 py-3 resize-none
          focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
          transition-all duration-200
        "
      />
    </div>
  );
}
