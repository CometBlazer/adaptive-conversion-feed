// components/LoadingCard.tsx
"use client";

import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

// A full-height section shown at the tail of the feed while the next card is
// being generated. If the user scrolls onto it, it counts as the active "card"
// so dwell on the real card behind it is closed out cleanly.
export function LoadingCard({
  index,
  onActive,
}: {
  index: number;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
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

  const tint = index % 2 === 0;

  return (
    <section
      ref={ref}
      data-loading-index={index}
      className="relative flex h-[100svh] shrink-0 snap-start flex-col items-center justify-center"
      style={{ backgroundColor: tint ? "#F6F3EC" : "#EFE9DC" }}
    >
      <Spinner className="h-8 w-8 text-ink/70" />
      <p className="mt-5 font-mono text-xs uppercase tracking-[0.2em] text-slatey">
        loading
      </p>
    </section>
  );
}