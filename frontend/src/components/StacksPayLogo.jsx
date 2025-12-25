import React from 'react';

const StacksPayLogo = ({ className = "h-10" }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stack icon - layered rectangles */}
      <g>
        {/* Bottom layer - purple */}
        <rect x="5" y="30" width="30" height="8" rx="2" fill="#8B5CF6" opacity="0.6"/>
        {/* Middle layer - indigo */}
        <rect x="5" y="20" width="30" height="8" rx="2" fill="#6366F1" opacity="0.8"/>
        {/* Top layer - blue */}
        <rect x="5" y="10" width="30" height="8" rx="2" fill="#3B82F6"/>
      </g>

      {/* Payment symbol - arrow with coin */}
      <g>
        {/* Coin circle */}
        <circle cx="165" cy="25" r="15" fill="#10B981" opacity="0.2"/>
        <circle cx="165" cy="25" r="12" fill="#10B981"/>
        {/* Dollar sign */}
        <path
          d="M165 18 L165 32 M161 21 Q165 19 169 21 Q165 23 161 25 Q165 27 169 29"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Text "Stacks-Pay" */}
      <text
        x="45"
        y="32"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="#1F2937"
      >
        Stacks
      </text>
      <text
        x="115"
        y="32"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="#3B82F6"
      >
        -Pay
      </text>

      {/* Decorative dots */}
      <circle cx="42" cy="42" r="1.5" fill="#8B5CF6"/>
      <circle cx="112" cy="42" r="1.5" fill="#3B82F6"/>
      <circle cx="152" cy="42" r="1.5" fill="#10B981"/>
    </svg>
  );
};

export default StacksPayLogo;
