/**
 * RotatingText — reactbits.dev
 * Cycles through an array of strings with a slide-up/fade animation.
 */
import { useEffect, useState } from 'react';

export default function RotatingText({ texts, interval = 2800, className = '' }) {
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIdx((p) => (p + 1) % texts.length);
        setAnimating(false);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <span
      className={`rotating-text-wrap ${animating ? 'rotating-out' : 'rotating-in'} ${className}`}
    >
      {texts[idx]}
    </span>
  );
}
