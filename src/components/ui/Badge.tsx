import { ColorLabel } from '../../types';
import { getColorClasses } from '../../utils/colors';

interface BadgeProps {
  label: string;
  colorLabel?: ColorLabel;
  size?: 'sm' | 'md';
}

export function Badge({ label, colorLabel = 'green', size = 'sm' }: BadgeProps) {
  const colors = getColorClasses(colorLabel);
  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-body font-medium
      ${colors.bg} ${colors.text} ${colors.border} border
      ${size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
}

export function AttendanceBadge({ percentage }: { percentage: number }) {
  const color = percentage >= 75 ? 'text-green-400 bg-green-500/15 border-green-500/30'
    : percentage >= 50 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
    : 'text-red-400 bg-red-500/15 border-red-500/30';

  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border ${color}`}>
      {percentage}%
    </span>
  );
}
