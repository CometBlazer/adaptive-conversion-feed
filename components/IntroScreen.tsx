// components/IntroScreen.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PRODUCT } from "@/lib/product";

export function IntroScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-paper/95 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">
          Research prototype
        </p>

        <h1 className="mt-4 font-display text-3xl leading-tight text-ink sm:text-5xl">
          This experiment is adaptive.
        </h1>

        <p className="mt-5 text-base leading-relaxed text-slatey">
          You&apos;re about to see a feed of sales pitches for a fictional product. After each one,
          either scroll down, scroll up, click the Call to Action button, or exit the experiment
          using the x button in the top right corner.
        </p>

        <div className="mt-5 rounded-2xl border border-emerald-900/10 bg-emerald-50/60 p-5 shadow-sm">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-emerald-700">
            The fictional product being pitched is:
          </p>

          <h2 className="mt-2 font-display text-2xl leading-tight text-ink">
            {PRODUCT.name}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slatey">
            {PRODUCT.tagline}
          </p>

          <p className="mt-4 inline-flex rounded-full border border-emerald-700/20 bg-emerald-100/70 px-3 py-1 font-mono text-xs tracking-[0.14em] text-emerald-700">
            Call to Action: {PRODUCT.cta}
          </p>
        </div>

        <p className="mt-5 text-base leading-relaxed text-slatey">
          The system watches how you engage and tries a different angle each time, looking for what
          works on you. Nothing you do here is sold, shared, or tied to your identity. It stays in
          your browser, and you can export or discard it.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Button size="lg" onClick={onBegin} className="w-full sm:w-auto">
            I understand, continue.
          </Button>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
}