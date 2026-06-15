// components/ui/soft-gradient-background-animation.tsx
"use client";
import React, { useEffect } from "react";

interface BgradientAnimProps {
  className?: string;
  animationDuration?: number;
  /** Two base hues (deg) the wash drifts between. Tuned warm to suit the paper palette. */
  hueA?: number;
  hueB?: number;
}

// A slow, low-saturation oklch wash. Hues are kept in the warm band so the
// animation reads as a gentle shift in the paper rather than a rainbow.
// Falls back to a static gradient where @property isn't supported.
const BgradientAnim: React.FC<BgradientAnimProps> = ({
  className = "",
  animationDuration = 14,
  hueA = 40,
  hueB = 95,
}) => {
  useEffect(() => {
    const id = "oklch-soft-wash-styles";
    if (document.getElementById(id)) return;
    const styleEl = document.createElement("style");
    styleEl.id = id;
    styleEl.textContent = `
      @property --h1 { syntax: "<angle>"; inherits: false; initial-value: ${hueA}deg; }
      @property --h2 { syntax: "<angle>"; inherits: false; initial-value: ${hueB}deg; }

      .oklch-soft-wash {
        /* Static fallback: a soft warm paper gradient. */
        background-image: linear-gradient(180deg, #FBF9F3 0%, #EFE9DC 100%);
      }

      @supports (background: linear-gradient(in oklch, red, blue)) {
        .oklch-soft-wash {
          background-image:
            linear-gradient(
              160deg in oklch,
              oklch(0.96 0.035 var(--h1)) 0%,
              oklch(0.93 0.045 var(--h2)) 100%
            );
          animation: oklch-wash ${animationDuration}s linear infinite alternate;
        }
      }

      @keyframes oklch-wash {
        0%   { --h1: ${hueA}deg;        --h2: ${hueB}deg; }
        100% { --h1: ${hueA + 50}deg;   --h2: ${hueB + 50}deg; }
      }

      @media (prefers-reduced-motion: reduce) {
        .oklch-soft-wash { animation: none; }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [animationDuration, hueA, hueB]);

  return <div className={`oklch-soft-wash h-full w-full ${className}`} />;
};

export { BgradientAnim };