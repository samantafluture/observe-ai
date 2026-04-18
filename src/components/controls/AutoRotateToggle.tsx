import { useGlobeStore } from '../../store/globeStore';

export function AutoRotateToggle() {
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const setAutoRotate = useGlobeStore((s) => s.setAutoRotate);

  return (
    <button
      type="button"
      onClick={() => setAutoRotate(!autoRotate)}
      className={
        'pointer-events-auto flex items-center gap-2 rounded border px-3 py-1.5 text-xs backdrop-blur-sm ' +
        (autoRotate
          ? 'border-phosphor-600/70 bg-phosphor-900/40 text-phosphor-200'
          : 'border-phosphor-800/70 bg-black/70 text-phosphor-700 hover:text-phosphor-400')
      }
      aria-pressed={autoRotate}
    >
      <span
        className={
          'inline-block h-2 w-2 rounded-full ' +
          (autoRotate ? 'bg-phosphor-400 animate-pulse' : 'bg-phosphor-800')
        }
      />
      <span className="tracking-[0.15em] uppercase">
        {autoRotate ? 'Rotating' : 'Paused'}
      </span>
    </button>
  );
}
