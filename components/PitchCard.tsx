// components/PitchCard.tsx
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { BlurTextEffect } from "@/components/ui/blur-text-effect";
import { BgradientAnim } from "@/components/ui/soft-gradient-background-animation";
import { ANGLE_HUE, ANGLE_LABEL } from "@/lib/product";
import type { Angle, Card } from "@/types";

function angleLabel(angle: string): string {
  return ANGLE_LABEL[angle as Angle] ?? angle.replace(/_/g, " ");
}
function angleHue(angle: string): string {
  return ANGLE_HUE[angle as Angle] ?? "#6B6358";
}

// The two ambient hues drift per angle so each section feels distinct.
const ANGLE_GRADIENT: Record<string, [number, number]> = {
  social_proof: [120, 150],
  convenience: [220, 250],
  curiosity: [275, 305],
  identity: [35, 70],
  aspiration: [190, 220],
  cost_savings: [110, 140],
  fomo: [20, 45],
  objection_handling: [40, 70],
  evidence: [215, 245],
  testimonial: [40, 75],
};

export function PitchCard({
  card,
  index,
  onCta,
  onScroll,
  onVisible,
  onHidden,
}: {
  card: Card;
  index: number;
  onCta: (index: number) => void;
  onScroll: (index: number, depth: number) => void;
  onVisible: (index: number) => void;
  onHidden: (index: number, direction: "up" | "down") => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const lastY = useRef(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const handler = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrolled = Math.min(1, Math.max(0, (vh - rect.top) / Math.max(rect.height, 1)));
      onScroll(index, scrolled);
    };
    handler();
    const parent = el.parentElement;
    parent?.addEventListener("scroll", handler, { passive: true });
    return () => parent?.removeEventListener("scroll", handler);
  }, [index, onScroll]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const y = entry.boundingClientRect.top;
        const goingDown = y < lastY.current;
        lastY.current = y;
        if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
          onVisible(index);
        } else if (!entry.isIntersecting) {
          onHidden(index, goingDown ? "down" : "up");
        }
      },
      { threshold: [0, 0.55, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, onVisible, onHidden]);

  const hue = angleHue(card.angle);
  const [hueA, hueB] = ANGLE_GRADIENT[String(card.angle)] ?? [40, 95];

  return (
    <section
      ref={sectionRef}
      data-card-index={index}
      className="relative flex h-[100svh] shrink-0 snap-start items-center justify-center overflow-hidden"
    >
      {/* animated oklch wash, per-angle hue */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <BgradientAnim hueA={hueA} hueB={hueB} animationDuration={16} />
      </div>

      {/* soft angle-colored bloom on top of the wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] blur-3xl"
        style={{ background: `radial-gradient(circle, ${hue} 0%, transparent 65%)` }}
      />

      {/* top scroll bar (lets the user know they can go up) */}
      <div className="absolute top-7 left-1/2 -translate-x-1/2">
        <div className="mx-auto h-8 w-px animate-pulse bg-slatey/40" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-8 text-center">
        <span
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em]"
          style={{ color: hue }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hue }} />
          {angleLabel(card.angle)}
        </span>

        {/* key forces a re-mount per card so the blur-in replays on each new card */}
        <h2
          key={`h-${index}`}
          className="mt-8 font-display text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl"
        >
          <BlurTextEffect stagger={0.012}>{card.headline}</BlurTextEffect>
        </h2>

        <p
          key={`s-${index}`}
          className="mt-7 max-w-2xl font-display text-2xl italic leading-snug text-slatey sm:text-3xl"
        >
          <BlurTextEffect stagger={0.008} delay={0.15}>
            {card.subheadline}
          </BlurTextEffect>
        </p>

        <p
          key={`b-${index}`}
          className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75 sm:text-xl animate-fade-up"
          style={{ animationDelay: "0.35s", animationFillMode: "both" }}
        >
          {card.body}
        </p>

        <div
          className="mt-12 animate-fade-up"
          style={{ animationDelay: "0.5s", animationFillMode: "both" }}
        >
          <Button
            size="lg"
            onClick={() => onCta(index)}
            className="h-14 px-9 text-base shadow-[0_18px_40px_-18px_rgba(58,91,224,0.7)]"
          >
            Sign up for FocusFlow
          </Button>
        </div>
      </div>

      {/* bottom scroll bar + the one-time "scroll" hint on the first card only */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center">
        {index === 0 && (
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slatey">
            scroll
          </div>
        )}
        <div className="mx-auto h-8 w-px animate-pulse bg-slatey/40" />
      </div>
    </section>
  );
}