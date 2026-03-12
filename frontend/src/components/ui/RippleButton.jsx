/**
 * RippleButton — reactbits.dev
 * Material-design ripple that expands from the click point.
 */
import { useRef } from 'react';

export default function RippleButton({
  children,
  onClick,
  className = '',
  rippleColor = 'rgba(255,255,255,0.22)',
  ...props
}) {
  const btnRef = useRef(null);

  const handleClick = (e) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute;
      border-radius:50%;
      transform:scale(0);
      animation:rb-ripple 0.55s linear;
      background:${rippleColor};
      width:${size}px;height:${size}px;
      left:${x}px;top:${y}px;
      pointer-events:none;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    if (onClick) onClick(e);
  };

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
