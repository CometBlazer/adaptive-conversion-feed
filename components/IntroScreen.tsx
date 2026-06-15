"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function IntroScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">
          Research prototype
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">
          This page changes its mind about you.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-slatey">
          You&apos;re about to see a feed of sales pitches for a fictional product. After each one,
          you can ask for another. The system watches how you engage and tries a different angle each
          time, looking for what works on you.
        </p>
        <p className="mt-3 text-base leading-relaxed text-slatey">
          Nothing you do here is sold, shared, or tied to your identity. It stays in your browser, and
          you can export or discard it. This notice exists so the experiment is honest about what it is.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Button size="lg" onClick={onBegin}>
            I understand — begin
          </Button>
          <span className="font-mono text-xs text-slatey">No account. No tracking pixels.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
