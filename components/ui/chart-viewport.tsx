"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Charts live in paired desktop/mobile trees, and CSS hides one of them with
 * `display: none`. Recharts then measures a 0×0 container and warns on every
 * mount (the warning is not dev-gated in recharts' build), and the hidden chart
 * does pointless layout work. Mount the chart only after its box has width.
 */
export function ChartViewport({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [measurable, setMeasurable] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // Measure synchronously first: a ResizeObserver only reports the initial
    // size on the next rendering opportunity, which is not guaranteed for a
    // panel that mounts inside an animation (or a non-composited webview).
    const measure = () => setMeasurable(element.getBoundingClientRect().width > 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="h-full w-full">{measurable ? children : null}</div>;
}
