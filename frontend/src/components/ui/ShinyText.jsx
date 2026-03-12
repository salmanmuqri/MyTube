/**
 * ShinyText — reactbits.dev
 * A shine / glint animation sweeps across the text at intervals.
 */
export default function ShinyText({ text, className = '' }) {
  return (
    <span className={`shiny-text-wrap ${className}`}>
      {text}
      <span className="shiny-gleam" aria-hidden="true" />
    </span>
  );
}
