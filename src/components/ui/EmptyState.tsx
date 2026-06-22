import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="w-20 h-20 rounded-3xl bg-dark-800 border border-white/5 flex items-center justify-center mb-5 text-green-400">
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm font-body text-dark-400 max-w-xs leading-relaxed mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="md">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
