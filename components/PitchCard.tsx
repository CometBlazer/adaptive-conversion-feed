"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ANGLE_HUE, ANGLE_LABEL, PRODUCT } from "@/lib/product";
import type { Angle, Card } from "@/types";

function angleLabel(angle: string): string {
  return ANGLE_LABEL[angle as Angle] ?? angle.replace(/_/g, " ");
}
function angleHue(angle: string): string {
  return ANGLE_HUE[angle as Angle] ?? "#6B6358";
}

export function PitchCard({
  card,
  index,
  onCta,
  onScroll,
  onActive,
}: {
  card: Card;
  index: number;
  onCta: (index: number) => void;
  onScroll: (index: number, depth: number) => void;
  onActive: (index: number) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);

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

  // When this card is mostly on screen, declare it the active card.
  // The hook ignores repeats, so firing whenever we cross the threshold is fine.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          onActive(index);
        }
      },
      { threshold: [0.6] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index, onActive]);

  const hue = angleHue(card.angle);
  const isFirst = index === 0;
  const tint = index % 2 === 0;

  return (
    <section
      ref={sectionRef}
      data-card-index={index}
      className="relative flex h-[100svh] shrink-0 snap-start items-center justify-center overflow-hidden"
      style={{ backgroundColor: tint ? "#F6F3EC" : "#EFE9DC" }}
    >
      <div className="absolute top-7 left-1/2 -translate-x-1/2">
        <svg width="16" height="22" viewBox="0 0 16 22" fill="none" className="text-slatey/40">
          <path d="M3 6l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 1v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="relative mx-auto flex max-h-[100svh] w-full max-w-3xl flex-col items-center overflow-y-auto px-6 py-20 text-center sm:px-8">
        <span
          className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.22em] sm:text-xs"
          style={{ color: hue }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hue }} />
          {angleLabel(card.angle)}
        </span>

        <h2 className="mt-6 max-w-3xl font-display text-[1.75rem] font-medium leading-[1.08] tracking-tight text-ink sm:mt-8 sm:text-4xl md:text-6xl">
          {card.headline}
        </h2>

        <p className="mt-5 max-w-2xl font-display text-xl leading-snug text-slatey sm:mt-7 sm:text-3xl">
          {card.subheadline}
        </p>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/75 sm:mt-8 sm:text-lg">
          {card.body}
        </p>

        <div className="mt-9 sm:mt-12">
          <Button
            size="lg"
            onClick={() => onCta(index)}
            className="h-14 px-9 text-base shadow-[0_18px_40px_-18px_rgba(58,91,224,0.7)]"
          >
            {PRODUCT.cta}
          </Button>
        </div>
      </div>

      {/* bottom scroll indicator — arrow pointing down + one-time hint */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {isFirst && (
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slatey">
            scroll
          </div>
        )}
        <svg width="16" height="22" viewBox="0 0 16 22" fill="none" className="text-slatey/40">
          <path d="M8 1v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3 16l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}