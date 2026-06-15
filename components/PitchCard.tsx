"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";
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
  loading,
  onCta,
  onAnother,
  onScroll,
}: {
  card: Card;
  index: number;
  loading: boolean;
  onCta: () => void;
  onAnother: () => void;
  onScroll: (depth: number) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Track max scroll depth within the card body.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const handler = () => {
      const max = el.scrollHeight - el.clientHeight;
      const depth = max > 0 ? Math.min(1, el.scrollTop / max) : 1;
      onScroll(depth);
    };
    handler();
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [card, onScroll]);

  const hue = angleHue(card.angle);

  return (
    <motion.article
      key={index}
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.99 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl rounded-3xl border border-mist bg-white/80 p-8 shadow-[0_1px_0_rgba(20,17,15,0.04),0_24px_48px_-24px_rgba(20,17,15,0.25)] backdrop-blur sm:p-10"
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]"
          style={{ color: hue, backgroundColor: `${hue}14` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hue }} />
          {angleLabel(card.angle)}
        </span>
        <span className="font-mono text-[11px] text-slatey">#{index + 1}</span>
      </div>

      <div ref={bodyRef} className="mt-6 max-h-[44vh] overflow-y-auto pr-1">
        <h2 className="font-display text-3xl leading-snug text-ink sm:text-4xl">{card.headline}</h2>
        <p className="mt-3 text-lg text-slatey">{card.subheadline}</p>
        <p className="mt-5 text-base leading-relaxed text-ink/85">{card.body}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" onClick={onCta} disabled={loading} className="sm:flex-1">
          Start FocusFlow
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={onAnother} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Thinking…" : "Show me another reason"}
        </Button>
      </div>
    </motion.article>
  );
}
