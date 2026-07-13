// src/components/ui/PullToRefresh.tsx
//
// Native-feeling pull-to-refresh wrapper. Wrap your scrollable feed view:
//
//   <PullToRefresh onRefresh={async () => { await refetchMaterials(); }}>
//     <YourFeedContent />
//   </PullToRefresh>
//
// `onRefresh` must return a Promise — the spinner slides back up once it
// resolves (or rejects; the finally-block in the hook always resets).

import { ReactNode } from 'react';
import { usePullToRefresh, PullPhase } from '../../hooks/usePullToRefresh';
import './PullToRefresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

function Spinner({ phase }: { phase: PullPhase }) {
  return (
    <svg
      className={`ptr-spinner ${phase === 'refreshing' ? 'ptr-spinner--spin' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="ptr-spinner__track"
        cx="12" cy="12" r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.2"
      />
      <path
        className="ptr-spinner__arc"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 70,
  className = '',
}: PullToRefreshProps) {
  const { containerRef, pullDistance, phase, threshold: t } = usePullToRefresh<HTMLDivElement>({
    onRefresh,
    threshold,
    disabled,
  });

  // Rotate the arc proportionally while pulling (0deg at 0px → 360deg at threshold),
  // then hand off to the CSS spin animation once phase === 'refreshing'.
  const pullProgress = Math.min(pullDistance / t, 1);
  const arcRotation = phase === 'refreshing' ? undefined : `${pullProgress * 360}deg`;

  return (
    <div ref={containerRef} className={`ptr-container ${className}`}>
      <div
        className={`ptr-indicator ptr-indicator--${phase}`}
        style={{
          height: pullDistance,
          opacity: pullDistance > 4 ? 1 : 0,
        }}
      >
        <div
          className="ptr-indicator__inner"
          style={arcRotation ? { transform: `rotate(${arcRotation})` } : undefined}
        >
          <Spinner phase={phase} />
        </div>
      </div>

      <div
        className="ptr-content"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}