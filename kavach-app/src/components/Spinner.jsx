import React from 'react';

const SIZES = {
  small:  24,
  medium: 40,
  large:  60,
};

export default function Spinner({ size = 'medium' }) {
  const px = SIZES[size] ?? SIZES.medium;
  const stroke = px * 0.1;

  return (
    <>
      <style>{`
        @keyframes spinner-rotate {
          to { transform: rotate(360deg); }
        }
        @keyframes spinner-dash {
          0%   { stroke-dashoffset: 150; }
          50%  { stroke-dashoffset: 40; stroke-dasharray: 120 200; }
          100% { stroke-dashoffset: 150; stroke-dasharray: 10 200; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kavach-spinner { animation: none !important; }
          .kavach-spinner-circle { animation: none !important; stroke-dashoffset: 60; }
        }
        .kavach-spinner {
          animation: spinner-rotate 1.4s linear infinite;
          transform-origin: center;
          display: block;
          flex-shrink: 0;
        }
        .kavach-spinner-circle {
          fill: none;
          stroke: var(--primary, #3B82F6);
          stroke-linecap: round;
          stroke-dasharray: 10 200;
          stroke-dashoffset: 150;
          animation: spinner-dash 1.4s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>

      <svg
        className="kavach-spinner"
        width={px}
        height={px}
        viewBox="0 0 50 50"
        aria-label="Loading"
        role="status"
        style={{ width: px, height: px }}
      >
        {/* Track */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={stroke}
        />
        {/* Animated arc */}
        <circle
          className="kavach-spinner-circle"
          cx="25"
          cy="25"
          r="20"
          strokeWidth={stroke}
        />
      </svg>
    </>
  );
}
