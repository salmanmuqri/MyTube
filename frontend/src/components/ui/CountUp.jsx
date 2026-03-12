/**
 * CountUp — reactbits.dev
 * Animates a number from 0 → end with easing, triggers on scroll-in.
 */
import { useEffect, useRef, useState } from 'react';

export default function CountUp({
  end,
  duration = 1800,
  className = '',
  suffix = '',
  format = (n) => Math.floor(n).toLocaleString(),
}) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTs = performance.now();
          const tick = (now) => {
            const t = Math.min((now - startTs) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setValue(end * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}{suffix}
    </span>
  );
}
