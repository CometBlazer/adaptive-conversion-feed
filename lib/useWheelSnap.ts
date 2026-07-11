"use client";

import { useEffect, RefObject } from "react";

// Turns a scroll container into a one-section-per-gesture feed, Shorts-style.
// A single wheel flick or trackpad swipe advances exactly one full-height
// section with a slow, eased animation. Locks during the animation so fast
// scroll wheels can't skip multiple cards.
export function useWheelSnap(
  containerRef: RefObject<HTMLElement>,
  opts: { durationMs?: number; cooldownMs?: number } = {}
) {
  const duration = opts.durationMs ?? 650;
  const cooldown = opts.cooldownMs ?? 120;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let locked = false;
    let index = 0;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateTo = (targetIndex: number) => {
      const sections = el.children.length;
      const clamped = Math.max(0, Math.min(sections - 1, targetIndex));
      const startTop = el.scrollTop;
      const endTop = clamped * el.clientHeight;
      if (Math.abs(endTop - startTop) < 2) {
        locked = false;
        return;
      }
      index = clamped;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        el.scrollTop = startTop + (endTop - startTop) * easeInOutCubic(t);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          // brief cooldown so momentum from the same flick doesn't re-trigger
          setTimeout(() => {
            locked = false;
          }, cooldown);
        }
      };
      requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // take over native scroll entirely
      if (locked) return;
      // ignore tiny residual deltas (trackpad momentum tail)
      if (Math.abs(e.deltaY) < 4) return;
      locked = true;
      animateTo(index + (e.deltaY > 0 ? 1 : -1));
    };

    // keep index in sync if the user uses keyboard / programmatic scroll
    const onScrollEnd = () => {
      index = Math.round(el.scrollTop / el.clientHeight);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scrollend", onScrollEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scrollend", onScrollEnd);
    };
  }, [containerRef, duration, cooldown]);
}