import { useEffect, useRef, useState } from 'react';

/** Tracks a container width so SVG charts can render in pixel space. */
export function useElementWidth<T extends HTMLElement>(
  fallback = 640,
): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    setWidth(Math.round(element.getBoundingClientRect().width) || fallback);
    return () => observer.disconnect();
  }, [fallback]);

  return [ref, width];
}
