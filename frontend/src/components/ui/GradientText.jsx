/**
 * GradientText — reactbits.dev
 * Text with a moving animated gradient fill using background-clip.
 */
export default function GradientText({ children, className = '', animate = true }) {
  return (
    <span className={`${animate ? 'gradient-text-anim' : 'gradient-text-static'} ${className}`}>
      {children}
    </span>
  );
}
