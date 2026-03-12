/**
 * TiltCard — reactbits.dev
 * Applies a 3-D perspective tilt toward the cursor on hover.
 */
import { useRef } from 'react';

export default function TiltCard({ children, className = '', intensity = 6 }) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0–1
    const y = (e.clientY - rect.top) / rect.height;    // 0–1
    const rotX = (y - 0.5) * -intensity;
    const rotY = (x - 0.5) * intensity;
    ref.current.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-card ${className}`}
    >
      {children}
    </div>
  );
}
