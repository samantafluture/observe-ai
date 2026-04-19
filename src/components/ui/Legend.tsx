import { REGIME_COLOR, REGIME_LABEL } from '../../utils/colors';

const REGIME_ORDER: (keyof typeof REGIME_COLOR)[] = [
  'strict',
  'executive-order',
  'state-directed',
  'emerging',
  'minimal',
];

export function Legend() {
  return (
    <div className="pointer-events-auto hidden rounded border border-phosphor-800/70 bg-black/70 px-3 py-2 text-[10px] text-phosphor-700 backdrop-blur-sm md:block">
      <div className="uppercase tracking-[0.22em]">Phase 02</div>
      <div className="mt-1 max-w-[220px] leading-relaxed text-phosphor-500">
        Compute + labs + fabs + regulation + supply chain. Click anything for details.
      </div>
      <div className="mt-2 border-t border-phosphor-900 pt-2">
        <div className="mb-1 uppercase tracking-[0.22em] text-phosphor-800">Regulatory regime</div>
        <ul className="flex flex-col gap-0.5">
          {REGIME_ORDER.map((r) => {
            const rgb = REGIME_COLOR[r];
            return (
              <li key={r} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{
                    backgroundColor: `rgba(${rgb.join(',')},0.55)`,
                    boxShadow: `inset 0 0 0 1px rgba(${rgb.join(',')},0.9)`,
                  }}
                />
                <span className="text-phosphor-500">{REGIME_LABEL[r]}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
