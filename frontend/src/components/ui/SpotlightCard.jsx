/**
 * SpotlightCard — reactbits.dev
 * A card component where a radial gradient "spotlight" follows the cursor,
 * creating a dynamic glowing highlight effect.
 */
import { useRef } from 'react';

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(34,197,94,0.10)',
}) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--sx', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--sy', `${e.clientY - rect.top}px`);
    cardRef.current.style.setProperty('--spotlight-color', spotlightColor);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--sx', '-999px');
    cardRef.current.style.setProperty('--sy', '-999px');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`spotlight-card ${className}`}
    >
      {children}
    </div>
  );
}
