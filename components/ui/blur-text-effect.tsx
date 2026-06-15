// components/ui/blur-text-effect.tsx
"use client";
import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

interface BlurTextEffectProps {
  children: string;
  className?: string;
  /** Stagger between characters (s). Lower = faster reveal. */
  stagger?: number;
  /** Delay before the animation starts (s). */
  delay?: number;
}

export const BlurTextEffect: React.FC<BlurTextEffectProps> = ({
  children,
  className = "",
  stagger = 0.015,
  delay = 0,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll("span.char");
    // Respect reduced-motion: show instantly.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(chars, { opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }
    gsap.set(chars, { opacity: 0, y: 10, filter: "blur(8px)" });
    gsap.to(chars, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.3,
      ease: "power2.out",
      stagger,
      delay,
      clearProps: "filter",
    });
  }, [children, stagger, delay]);

  return (
    <span className={`inline-block ${className}`} ref={containerRef}>
      {children.split("").map((char, i) => (
        <span key={`${char}-${i}`} className="char inline-block" style={{ whiteSpace: "pre" }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
};