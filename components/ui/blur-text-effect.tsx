"use client";
import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

interface BlurTextEffectProps {
  children: string;
  className?: string;
  stagger?: number;
  delay?: number;
}

// Splits on words (not characters) so a long word never wraps mid-word.
// Each word is an inline-block that animates as a unit; spaces are real
// spaces between words, so normal line-wrapping happens at spaces only.
export const BlurTextEffect: React.FC<BlurTextEffectProps> = ({
  children,
  className = "",
  stagger = 0.04,
  delay = 0,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const words = containerRef.current.querySelectorAll("span.word");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(words, { opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }
    gsap.set(words, { opacity: 0, y: 10, filter: "blur(8px)" });
    gsap.to(words, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.4,
      ease: "power2.out",
      stagger,
      delay,
      clearProps: "filter",
    });
  }, [children, stagger, delay]);

  const words = children.split(" ");

  return (
    <span className={`${className}`} ref={containerRef}>
      {words.map((word, i) => (
        <React.Fragment key={`${word}-${i}`}>
          <span className="word inline-block whitespace-nowrap align-baseline">{word}</span>
          {i < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </span>
  );
};