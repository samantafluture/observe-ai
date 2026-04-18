export function Legend() {
  return (
    <div className="pointer-events-auto hidden rounded border border-phosphor-800/70 bg-black/70 px-3 py-2 text-[10px] text-phosphor-700 backdrop-blur-sm md:block">
      <div className="uppercase tracking-[0.22em]">Phase 01</div>
      <div className="mt-1 max-w-[220px] leading-relaxed text-phosphor-500">
        ~130 compute sites + ~25 AI labs. Click a point for details. Drag to spin.
      </div>
    </div>
  );
}
