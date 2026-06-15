// components/PitchCard.tsx
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ANGLE_HUE, ANGLE_LABEL } from "@/lib/product";
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
  const tint = index % 2 === 0;

  return (
    <section
      ref={sectionRef}
      data-card-index={index}
      className="relative flex h-[100svh] shrink-0 snap-start items-center justify-center overflow-hidden"
      style={{
        background: tint
          ? "linear-gradient(180deg, #FBF9F3 0%, #F3EFE6 100%)"
          : "linear-gradient(180deg, #F6F3EC 0%, #ECE7DA 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-3xl"
        style={{ background: `radial-gradient(circle, ${hue} 0%, transparent 65%)` }}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-8 text-center">
        <span
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em]"
          style={{ color: hue }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hue }} />
          {angleLabel(card.angle)}
        </span>

        <h2 className="mt-8 font-display text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
          {card.headline}
        </h2>

        <p className="mt-7 max-w-2xl font-display text-2xl italic leading-snug text-slatey sm:text-3xl">
          {card.subheadline}
        </p>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75 sm:text-xl">{card.body}</p>

        <div className="mt-12">
          <Button
            size="lg"
            onClick={() => onCta(index)}
            className="h-14 px-9 text-base shadow-[0_18px_40px_-18px_rgba(58,91,224,0.7)]"
          >
            Sign up for FocusFlow
          </Button>
        </div>
      </div>

      {index === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.2em] text-slatey">
          scroll
          <div className="mx-auto mt-2 h-8 w-px animate-pulse bg-slatey/50" />
        </div>
      )}
    </section>
  );
}