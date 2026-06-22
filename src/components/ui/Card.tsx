import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glass?: boolean;
  animate?: boolean;
}

export function Card({ children, className = '', onClick, glass = false, animate = true }: CardProps) {
  const baseClasses = `
    rounded-2xl border overflow-hidden
    ${glass
      ? 'bg-white/5 backdrop-blur-md border-white/10'
      : 'bg-dark-800 border-white/5'
    }
    ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
    ${className}
  `;

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses} onClick={onClick}>{children}</div>;
}

export function StatCard({
  label,
  value,
  icon,
  color = 'green',
  sub,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: 'green' | 'blue' | 'orange' | 'red';
  sub?: string;
}) {
  const colorMap = {
    green:  'text-green-400 bg-green-500/10',
    blue:   'text-blue-400 bg-blue-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    red:    'text-red-400 bg-red-500/10',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-xs font-body text-dark-400">{label}</p>
        {sub && <p className="text-xs font-body text-dark-500">{sub}</p>}
      </div>
    </Card>
  );
}
