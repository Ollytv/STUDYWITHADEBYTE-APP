"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const framer_motion_1 = require("framer-motion");
function Button({ children, onClick, variant = 'primary', size = 'md', fullWidth = false, disabled = false, type = 'button', className = '', icon, }) {
    const variants = {
        primary: 'bg-green-500 text-dark-950 font-semibold hover:bg-green-400 shadow-green-glow',
        secondary: 'bg-dark-700 text-white border border-white/10 hover:bg-dark-600',
        ghost: 'text-dark-300 hover:text-white hover:bg-white/5',
        danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
    };
    const sizes = {
        sm: 'text-sm px-3 py-2 rounded-xl gap-1.5',
        md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
        lg: 'text-base px-6 py-3.5 rounded-2xl gap-2.5',
    };
    return (<framer_motion_1.motion.button type={type} onClick={onClick} disabled={disabled} className={`
        inline-flex items-center justify-center font-body font-medium
        transition-all duration-150
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
      `} whileTap={disabled ? undefined : { scale: 0.97 }}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </framer_motion_1.motion.button>);
}
//# sourceMappingURL=Button.js.map