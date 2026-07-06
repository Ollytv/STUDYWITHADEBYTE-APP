"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
exports.Select = Select;
exports.TextArea = TextArea;
function Input({ label, value, onChange, placeholder, type = 'text', required, className = '', icon, hint, }) {
    return (
    // min-w-0: prevents flex children from ignoring parent width constraints.
    // Without this, a w-full input inside a flex container can push past its
    // parent boundary — the single most common cause of inputs wider than screen.
    <div className={`space-y-1.5 min-w-0 w-full ${className}`}>
      {label && (<label className="block text-xs font-body font-medium text-dark-300 uppercase tracking-wider">
          {label}{required && <span className="text-green-500 ml-1">*</span>}
        </label>)}
      <div className="relative min-w-0 w-full">
        {icon && (<div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
            {icon}
          </div>)}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className={`
            w-full max-w-full bg-dark-700 border border-white/8 rounded-xl text-white font-body
            placeholder-dark-500 text-sm
            focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
            transition-all duration-200
            ${icon ? 'pl-10 pr-4 py-3' : 'px-4 py-3'}
          `} style={{ boxSizing: 'border-box' }}/>
      </div>
      {hint && <p className="text-xs text-dark-500 font-body">{hint}</p>}
    </div>);
}
function Select({ label, value, onChange, options, required, className = '' }) {
    return (
    // min-w-0 + w-full: same flexbox fix as Input above.
    // select elements on iOS Safari have a native intrinsic min-width that
    // can override w-full — max-w-full on the select itself overrides that.
    <div className={`space-y-1.5 min-w-0 w-full ${className}`}>
      {label && (<label className="block text-xs font-body font-medium text-dark-300 uppercase tracking-wider">
          {label}{required && <span className="text-green-500 ml-1">*</span>}
        </label>)}
      <select value={value} onChange={e => onChange(e.target.value)} required={required} className="
          w-full max-w-full bg-dark-700 border border-white/8 rounded-xl text-white font-body
          text-sm px-4 py-3
          focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
          transition-all duration-200 appearance-none cursor-pointer
        " style={{ boxSizing: 'border-box' }}>
        {options.map(opt => (<option key={opt.value} value={opt.value} className="bg-dark-800">
            {opt.label}
          </option>))}
      </select>
    </div>);
}
function TextArea({ label, value, onChange, placeholder, rows = 3, className = '' }) {
    return (
    // min-w-0: textarea is particularly prone to this — by default a textarea
    // has an intrinsic width based on its `cols` attribute (default 20ch on
    // some browsers) which overrides w-full inside flex containers
    <div className={`space-y-1.5 min-w-0 w-full ${className}`}>
      {label && (<label className="block text-xs font-body font-medium text-dark-300 uppercase tracking-wider">
          {label}
        </label>)}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="
          w-full max-w-full bg-dark-700 border border-white/8 rounded-xl text-white font-body
          placeholder-dark-500 text-sm px-4 py-3 resize-none
          focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/50
          transition-all duration-200
        " style={{ boxSizing: 'border-box' }}/>
    </div>);
}
//# sourceMappingURL=Input.js.map