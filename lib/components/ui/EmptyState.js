"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const framer_motion_1 = require("framer-motion");
const Button_1 = require("./Button");
function EmptyState({ icon, title, description, action }) {
    return (<framer_motion_1.motion.div className="flex flex-col items-center justify-center py-16 px-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
      <div className="w-20 h-20 rounded-3xl bg-dark-800 border border-white/5 flex items-center justify-center mb-5 text-green-400">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm font-body text-dark-400 max-w-xs leading-relaxed mb-6">{description}</p>
      {action && (<Button_1.Button onClick={action.onClick} size="md">
          {action.label}
        </Button_1.Button>)}
    </framer_motion_1.motion.div>);
}
//# sourceMappingURL=EmptyState.js.map