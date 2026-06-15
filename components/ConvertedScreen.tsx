"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConvertedScreen({
  cardsBefore,
  angle,
  onRestart,
}: {
  cardsBefore: number;
  angle: string | null;
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md rounded-3xl border border-mist bg-white/80 p-10 text-center shadow-[0_24px_48px_-24px_rgba(20,17,15,0.25)] backdrop-blur"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss/15">
        <Check className="h-6 w-6 text-moss" />
      </div>
      <h2 className="mt-5 font-display text-3xl text-ink">Converted.</h2>
      <p className="mt-3 text-slatey">
        It took {cardsBefore} {cardsBefore === 1 ? "card" : "cards"}
        {angle ? ` — the one that landed used the ${angle.replace(/_/g, " ")} angle.` : "."}
      </p>
      <p className="mt-2 font-mono text-xs text-slatey">
        (FocusFlow is fictional. Nothing was purchased.)
      </p>
      <Button variant="outline" size="lg" className="mt-7" onClick={onRestart}>
        Run another session
      </Button>
    </motion.div>
  );
}
