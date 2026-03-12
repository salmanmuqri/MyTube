/**
 * BlurText — reactbits.dev
 * Each word fades in from a blur on mount / scroll-into-view.
 */
import { useEffect, useRef, useState } from 'react';

export default function BlurText({
  text,
  className = '',
  wordDelay = 0.06,   // seconds between each word
  once = true,
}) {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  return (
    <span ref={wrapRef} className={className}>
      {text.split(' ').map((word, i) => (
        <span
          key={i}
          className="blur-word"
          style={{
            animationDelay: `${i * wordDelay}s`,
            animationPlayState: visible ? 'running' : 'paused',
          }}
        >
          {word}
          {i < text.split(' ').length - 1 ? '\u00a0' : ''}
        </span>
      ))}
    </span>
  );
}
