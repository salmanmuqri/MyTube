/**
 * Aurora — reactbits.dev
 * Soft animated aurora-borealis blobs in the background.
 * Place as absolute/fixed behind content.
 */
export default function Aurora({ className = '' }) {
  return (
    <div className={`aurora-root ${className}`} aria-hidden="true">
      <div className="aurora-blob a1" />
      <div className="aurora-blob a2" />
      <div className="aurora-blob a3" />
      <div className="aurora-blob a4" />
    </div>
  );
}
